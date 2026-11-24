import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AlertCircle, AlertTriangle, ArrowLeftRight, History, Info, Link2, Pencil, Plus, Unlink } from 'lucide-react'
import PanelLateral from '../PanelLateral/PanelLateral.jsx'
import SelectorBuscable from '../SelectorBuscable/SelectorBuscable.jsx'
import { CLAVES, errorSinDatos, useHistorialGps } from '../../hooks/consultas.js'
import { estadoDe } from '../../pages/Flota/estados.js'
import { mensajeDeError } from '../../services/errores.js'
import {
  asignarGps,
  desvincularGps,
  editarGps,
  GPS_CAMBIO,
  gpsDeMaquina,
  normalizarImei,
  registrarGps,
} from '../../services/gpsService.js'
import { MOTIVOS_DESVINCULAR, MOTIVOS_MOVER, MOTIVOS_VINCULAR } from './motivosGps.js'
import styles from './GpsAccion.module.css'

const MODELO_HABITUAL = 'Jimi LL301'

const formatoFechaHora = new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const fechaHora = (fecha) => formatoFechaHora.format(new Date(fecha))

const opcional = (valor) => valor.trim() || null

/** Máquinas en que estuvo el GPS (solo lectura). */
function HistorialAsignaciones({ idGps }) {
  const historial = useHistorialGps(idGps)
  const error = errorSinDatos(historial)
  if (error) {
    return (
      <p className={styles.error} role="alert">
        <AlertCircle size={16} /> {error}
      </p>
    )
  }
  if (historial.isPending) return <p className={styles.ayuda}>Cargando historial…</p>
  if (historial.data.length === 0) return <p className={styles.ayuda}>Todavía no ha estado en ninguna máquina.</p>
  return (
    <ol className={styles.historial}>
      {historial.data.map((a) => (
        <li key={a.idAsignacion} className={`${styles.tramo} ${a.hasta ? '' : styles.tramoVigente}`}>
          <strong className={styles.tramoMaquina}>{a.maquina.nombre}</strong>
          <span className={styles.ayuda}>
            {fechaHora(a.desde)} → {a.hasta ? fechaHora(a.hasta) : 'hoy'}
          </span>
        </li>
      ))}
    </ol>
  )
}

/**
 * Panel de una acción sobre un GPS: registrar, editar, asignar (vincular o mover a otra máquina), desvincular o ver su
 * historial. accion: { tipo, idGps?, idMaquina? (destino sugerido) }. onGuardado(mensaje).
 */
function GpsAccion({ accion, dispositivos, flota, onCerrar, onGuardado }) {
  const { tipo, idGps } = accion
  const queryClient = useQueryClient()
  // De la lista y no de una copia: si otra persona lo cambia con el panel abierto, se ve cómo quedó
  const gps = dispositivos.find((d) => d.idGps === idGps) ?? null
  const actual = gps?.maquina ?? null
  const mueve = tipo === 'asignar' && actual !== null

  const [imei, setImei] = useState('')
  const [modelo, setModelo] = useState(gps ? (gps.modelo ?? '') : MODELO_HABITUAL)
  const [numeroSim, setNumeroSim] = useState(gps?.numeroSim ?? '')
  // Destino sugerido: el que viene en la acción o la máquina que está reemplazando a la actual
  const [destino, setDestino] = useState(
    () => accion.idMaquina ?? flota.find((m) => m.idMaquina === actual?.idMaquina)?.respaldo?.idMaquina ?? null,
  )
  const [motivo, setMotivo] = useState(mueve && destino !== null ? MOTIVOS_MOVER[0] : '')
  const [observacion, setObservacion] = useState('')
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)

  const maquinas = flota.filter((m) => m.idMaquina !== actual?.idMaquina)
  const maquinaDestino = maquinas.find((m) => m.idMaquina === destino) ?? null
  const gpsDestino = maquinaDestino ? gpsDeMaquina(dispositivos, maquinaDestino.idMaquina) : null
  const pideMotivo = tipo === 'asignar' || tipo === 'desvincular'
  const motivos = tipo === 'desvincular' ? MOTIVOS_DESVINCULAR : mueve ? MOTIVOS_MOVER : MOTIVOS_VINCULAR

  const descripcionMaquina = (m) =>
    [m.tipoMaquina, estadoDe(m).etiqueta, m.cubreA && `Respaldo de ${m.cubreA.nombre}`, gpsDeMaquina(dispositivos, m.idMaquina) && 'Ya tiene GPS']
      .filter(Boolean)
      .join(' · ')

  const ejecutar = async () => {
    const justificacion = { motivo, observacion: opcional(observacion) }
    if (tipo === 'registrar') {
      const nuevo = await registrarGps({ imei: normalizarImei(imei), modelo: opcional(modelo), numeroSim: opcional(numeroSim) })
      return `Se registró el GPS ${nuevo.imei}. Ahora puedes vincularlo a una máquina.`
    }
    if (tipo === 'editar') {
      await editarGps(idGps, { modelo: opcional(modelo), numeroSim: opcional(numeroSim) })
      return `Se guardaron los datos del GPS ${gps.imei}.`
    }
    if (tipo === 'desvincular') {
      await desvincularGps(gps, justificacion)
      return `El GPS ${gps.imei} quedó sin máquina.`
    }
    await asignarGps(gps, maquinaDestino.idMaquina, gpsDestino, justificacion)
    return mueve
      ? `El GPS ${gps.imei} pasó de ${actual.nombre} a ${maquinaDestino.nombre}.`
      : `El GPS ${gps.imei} quedó vinculado a ${maquinaDestino.nombre}.`
  }

  const guardar = async (event) => {
    event.preventDefault()
    setError(null)
    if (tipo === 'registrar' && !normalizarImei(imei)) return setError('El IMEI no es válido: revisa los 15 dígitos de la etiqueta del equipo.')
    if (tipo === 'asignar' && !maquinaDestino) return setError('Elige la máquina.')
    if (pideMotivo && !motivo) return setError('Elige el motivo: queda registrado en la bitácora.')
    setGuardando(true)
    try {
      await onGuardado(await ejecutar())
    } catch (e) {
      // Cambió mientras tanto: se recarga para mostrar cómo quedó antes de reintentar
      if (GPS_CAMBIO.includes(e?.code)) await queryClient.refetchQueries({ queryKey: CLAVES.dispositivosGps })
      setError(mensajeDeError(e, 'No se pudo completar la acción.'))
      setGuardando(false)
    }
  }

  const presentacion = {
    registrar: { titulo: 'Registrar GPS', icono: <Plus size={20} />, confirmar: 'Registrar' },
    editar: { titulo: 'Editar GPS', icono: <Pencil size={20} />, confirmar: 'Guardar cambios' },
    asignar: mueve
      ? { titulo: 'Cambiar de máquina', icono: <ArrowLeftRight size={20} />, confirmar: 'Cambiar de máquina' }
      : { titulo: 'Vincular a una máquina', icono: <Link2 size={20} />, confirmar: 'Vincular' },
    desvincular: { titulo: 'Desvincular GPS', icono: <Unlink size={20} />, confirmar: 'Desvincular' },
    historial: { titulo: 'Historial del GPS', icono: <History size={20} />, confirmar: null },
  }[tipo]

  return (
    <PanelLateral
      titulo={presentacion.titulo}
      subtitulo={gps ? `IMEI ${gps.imei}` : 'Un GPS nuevo, por el IMEI de su etiqueta'}
      icono={presentacion.icono}
      etiqueta="GPS"
      onCerrar={onCerrar}
      confirmar={
        presentacion.confirmar && {
          texto: guardando ? 'Guardando…' : presentacion.confirmar,
          form: 'gps-accion',
          variante: tipo === 'desvincular' || gpsDestino ? 'ambar' : 'primario',
          ocupado: guardando,
        }
      }
    >
      <form id="gps-accion" className={styles.gpsAccion} onSubmit={guardar} noValidate>
        {tipo === 'historial' && <HistorialAsignaciones idGps={idGps} />}

        {tipo === 'registrar' && (
          <label className={styles.campo}>
            <span className={styles.label}>IMEI *</span>
            <input
              className={`${styles.input} ${styles.imei}`}
              inputMode="numeric"
              autoComplete="off"
              maxLength={20}
              value={imei}
              onChange={(e) => setImei(e.target.value)}
              placeholder="15 dígitos"
            />
            <span className={styles.ayuda}>Está en la etiqueta del equipo; también lo responde por SMS con PARAM#.</span>
          </label>
        )}

        {(tipo === 'registrar' || tipo === 'editar') && (
          <>
            <label className={styles.campo}>
              <span className={styles.label}>Modelo</span>
              <input className={styles.input} maxLength={50} value={modelo} onChange={(e) => setModelo(e.target.value)} />
            </label>
            <label className={styles.campo}>
              <span className={styles.label}>N° de SIM (opcional)</span>
              <input className={styles.input} inputMode="tel" maxLength={30} value={numeroSim} onChange={(e) => setNumeroSim(e.target.value)} />
            </label>
          </>
        )}

        {tipo === 'asignar' && (
          <>
            {mueve && (
              <p className={styles.aviso}>
                <Info size={16} className={styles.avisoIcono} />
                <span>
                  Hoy está en <strong>{actual.nombre}</strong>. Su recorrido hasta ahora queda en esa máquina; desde el
                  cambio, las posiciones son de la nueva.
                </span>
              </p>
            )}
            <SelectorBuscable
              etiqueta={mueve ? 'Nueva máquina *' : 'Máquina *'}
              placeholder="Buscar máquina…"
              opciones={maquinas}
              valor={destino}
              onCambio={setDestino}
              claveDe={(m) => m.idMaquina}
              etiquetaDe={(m) => m.nombre}
              descripcionDe={descripcionMaquina}
              vacio="No hay máquinas disponibles"
            />
            {gpsDestino && (
              <p className={styles.alerta} role="status">
                <AlertTriangle size={16} className={styles.alertaIcono} />
                <span>
                  {maquinaDestino.nombre} ya tiene el GPS {gpsDestino.imei}. Si continúas, ese GPS queda sin máquina.
                </span>
              </p>
            )}
            <p className={styles.ayuda}>Mientras la máquina tenga este GPS, el mapa no usa la ubicación del teléfono del operador.</p>
          </>
        )}

        {tipo === 'desvincular' && actual && (
          <p className={styles.aviso}>
            <Info size={16} className={styles.avisoIcono} />
            <span>
              {actual.nombre} queda sin GPS: el mapa vuelve a usar la ubicación del teléfono del operador durante sus
              turnos. Si vas a instalarlo en otra máquina, usa &quot;Cambiar&quot;.
            </span>
          </p>
        )}

        {pideMotivo && (
          <>
            <SelectorBuscable
              etiqueta="Motivo *"
              placeholder="Buscar o seleccionar motivo…"
              opciones={motivos}
              valor={motivo}
              onCambio={(m) => setMotivo(m ?? '')}
            />
            <label className={styles.campo}>
              <span className={styles.label}>Observación (opcional)</span>
              <textarea
                className={styles.input}
                rows={3}
                maxLength={500}
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                placeholder="Detalle que quedará en la bitácora junto al motivo"
              />
            </label>
          </>
        )}

        {error && (
          <p className={styles.error} role="alert">
            <AlertCircle size={16} /> {error}
          </p>
        )}
      </form>
    </PanelLateral>
  )
}

export default GpsAccion
