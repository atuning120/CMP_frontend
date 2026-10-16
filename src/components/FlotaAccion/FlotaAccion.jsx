import { useMemo, useState } from 'react'
import { Activity, AlertCircle, ClipboardList, Info, Truck } from 'lucide-react'
import PanelLateral from '../PanelLateral/PanelLateral.jsx'
import SelectorEstado from '../SelectorEstado/SelectorEstado.jsx'
import {
  cambiarEstadoMaquina,
  crearMaquina,
  editarMaquina,
  reemplazarMaquina,
} from '../../services/flotaService.js'
import { MOTIVOS_EDICION, MOTIVOS_INCORPORACION, MOTIVOS_POR_ESTADO, MOTIVOS_REEMPLAZO } from '../../pages/Flota/motivos.js'
import { ESTADOS_MAQUINA, estadoDe } from '../../pages/Flota/estados.js'
import styles from './FlotaAccion.module.css'

const FICHA_VACIA = {
  nombre: '',
  tipoMaquina: '',
  marca: '',
  modelo: '',
  anio: '',
  patente: '',
  numeroChasis: '',
  horometroInicial: '',
  esContratista: false,
}

const fichaDe = (m) => ({
  nombre: m.nombre ?? '',
  tipoMaquina: m.tipoMaquina ?? '',
  marca: m.marca ?? '',
  modelo: m.modelo ?? '',
  anio: m.anio ?? '',
  patente: m.patente ?? '',
  numeroChasis: m.numeroChasis ?? '',
  horometroInicial: '',
  esContratista: Boolean(m.esContratista),
})

// Texto vacío -> null, como espera el Backend
const opcional = (v) => (typeof v === 'string' ? v.trim() || null : v)

const datosFicha = (f, conHorometro) => ({
  nombre: f.nombre.trim(),
  tipoMaquina: opcional(f.tipoMaquina),
  marca: opcional(f.marca),
  modelo: opcional(f.modelo),
  anio: f.anio === '' ? null : Number(f.anio),
  patente: opcional(f.patente),
  numeroChasis: opcional(f.numeroChasis),
  esContratista: f.esContratista,
  ...(conHorometro ? { horometroInicial: f.horometroInicial === '' ? null : Number(f.horometroInicial) } : {}),
})

// Lo que se compara al editar para saber si hay cambios (sin espacios extra ni mayúsculas en código y patente)
const huella = (f, operador, estado) =>
  JSON.stringify([
    f.nombre.trim().toUpperCase(),
    f.patente.trim().toUpperCase(),
    f.tipoMaquina.trim(),
    f.marca.trim(),
    f.modelo.trim(),
    String(f.anio),
    f.numeroChasis.trim(),
    f.esContratista,
    operador,
    estado,
  ])

const formatoHoras = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 })

const etiquetaOperador = (op, idMaquina) =>
  `${op.nombre} · ${op.rut}${op.maquinaAsignada && op.maquinaAsignada.idMaquina !== idMaquina ? ` (hoy en ${op.maquinaAsignada.nombre})` : ''}`

/**
 * Campos de la ficha de una máquina (incorporar, editar o máquina nueva de un reemplazo).
 * obligatorios: patente, tipo, marca y modelo con * (editar, como en la app).
 * horometroActual: al editar se muestra de solo lectura (se actualiza con los turnos).
 */
function CamposFicha({ ficha, onCambio, catalogos, conHorometro, conPlantilla, obligatorios = false, horometroActual }) {
  const req = obligatorios ? ' *' : ''
  const set = (campo) => (e) =>
    onCambio({ ...ficha, [campo]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  // "Datos previos": un modelo del catálogo pre-carga tipo, marca y modelo
  const aplicarPlantilla = (e) => {
    const modelo = catalogos.modelos.find((m) => String(m.idModelo) === e.target.value)
    if (modelo) onCambio({ ...ficha, tipoMaquina: modelo.tipoMaquina, marca: modelo.marca, modelo: modelo.modelo })
  }

  return (
    <div className={styles.grupo}>
      {conPlantilla && catalogos.modelos.length > 0 && (
        <label className={styles.campo}>
          <span className={styles.label}>Datos previos (opcional)</span>
          <select className={styles.input} defaultValue="" onChange={aplicarPlantilla}>
            <option value="">Elegir un modelo registrado…</option>
            {catalogos.modelos.map((m) => (
              <option key={m.idModelo} value={m.idModelo}>
                {m.nombre}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className={styles.dosColumnas}>
        <label className={styles.campo}>
          <span className={styles.label}>Código interno *</span>
          <input className={`${styles.input} ${styles.mayusculas}`} value={ficha.nombre} onChange={set('nombre')} maxLength={100} required placeholder="CF-07" />
        </label>
        <label className={styles.campo}>
          <span className={styles.label}>Patente{req}</span>
          <input className={`${styles.input} ${styles.mayusculas}`} value={ficha.patente} onChange={set('patente')} maxLength={15} />
        </label>
      </div>
      <label className={styles.campo}>
        <span className={styles.label}>Tipo de máquina{req}</span>
        <input className={styles.input} value={ficha.tipoMaquina} onChange={set('tipoMaquina')} maxLength={50} list="flota-tipos" placeholder="Cargador Frontal" />
      </label>
      <div className={styles.dosColumnas}>
        <label className={styles.campo}>
          <span className={styles.label}>Marca{req}</span>
          <input className={styles.input} value={ficha.marca} onChange={set('marca')} maxLength={50} list="flota-marcas" />
        </label>
        <label className={styles.campo}>
          <span className={styles.label}>Modelo{req}</span>
          <input className={styles.input} value={ficha.modelo} onChange={set('modelo')} maxLength={50} />
        </label>
      </div>
      <div className={styles.dosColumnas}>
        <label className={styles.campo}>
          <span className={styles.label}>Año</span>
          <input className={styles.input} type="number" inputMode="numeric" min={1950} max={new Date().getFullYear() + 1} value={ficha.anio} onChange={set('anio')} />
        </label>
        <label className={styles.campo}>
          <span className={styles.label}>N° de chasis</span>
          <input className={styles.input} value={ficha.numeroChasis} onChange={set('numeroChasis')} maxLength={50} />
        </label>
      </div>
      {horometroActual !== undefined && (
        <label className={styles.campo}>
          <span className={styles.label}>Horómetro actual</span>
          <input
            className={`${styles.input} ${styles.soloLectura}`}
            value={horometroActual === null ? 'Sin registro' : `${formatoHoras.format(horometroActual)} h`}
            readOnly
          />
          <span className={styles.ayuda}>Se actualiza con los turnos de los operadores.</span>
        </label>
      )}
      {conHorometro && (
        <label className={styles.campo}>
          <span className={styles.label}>Horómetro inicial (h) *</span>
          <input className={styles.input} type="number" inputMode="decimal" min={0} step="0.1" value={ficha.horometroInicial} onChange={set('horometroInicial')} required />
        </label>
      )}
      <label className={styles.check}>
        <input type="checkbox" checked={ficha.esContratista} onChange={set('esContratista')} />
        Equipo de contratista
      </label>
      <datalist id="flota-tipos">
        {catalogos.tipos.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
      <datalist id="flota-marcas">
        {catalogos.marcas.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>
    </div>
  )
}

/** Operador asignado. En un reemplazo, 'mantener' = el de la saliente pasa a la entrante. */
function CampoOperador({ valor, onCambio, operadores, maquina, conMantener }) {
  return (
    <label className={styles.campo}>
      <span className={styles.label}>Operador asignado</span>
      <select className={styles.input} value={valor} onChange={(e) => onCambio(e.target.value)}>
        {conMantener && (
          <option value="mantener">
            Mantener el de {maquina.nombre} ({maquina.operadorAsignado?.nombre ?? 'sin operador'})
          </option>
        )}
        <option value="">Sin operador</option>
        {operadores.map((op) => (
          <option key={op.idOperador} value={op.idOperador}>
            {etiquetaOperador(op, maquina?.idMaquina)}
          </option>
        ))}
      </select>
      <span className={styles.ayuda}>Si el operador estaba a cargo de otra máquina, pasa a esta.</span>
    </label>
  )
}

/**
 * Formularios de gestión de la flota en un panel lateral. accion: { tipo, maquina? } con tipo
 * 'incorporar' | 'editar' | 'estado' | 'reemplazar'. Al guardar llama onGuardado(mensaje).
 */
function FlotaAccion({ accion, catalogos, flota, onCerrar, onGuardado }) {
  const { tipo, maquina } = accion
  const estadoActual = maquina ? estadoDe(maquina) : null
  // Estado elegido en el panel de cambio de estado
  const [nuevoEstado, setNuevoEstado] = useState('')
  const deshabilitar = tipo === 'estado' && nuevoEstado === 'BAJA'
  const destino = ESTADOS_MAQUINA.find((e) => e.valor === nuevoEstado)
  // Editar: el estado operacional se cambia junto con la ficha, como en la app
  const [estadoEditado, setEstadoEditado] = useState(() => maquina?.estado ?? 'ACTIVA')
  const cambiaEstado = tipo === 'editar' && estadoEditado !== estadoActual.valor
  const [ficha, setFicha] = useState(() => (tipo === 'editar' ? fichaDe(maquina) : FICHA_VACIA))
  // '' = sin operador; en un reemplazo, 'mantener' = el de la saliente pasa a la entrante
  const [operador, setOperador] = useState(() =>
    tipo === 'reemplazar' ? 'mantener' : String(maquina?.operadorAsignado?.idOperador ?? ''),
  )
  const [entrante, setEntrante] = useState({ origen: 'flota', idMaquina: '' })
  const [motivo, setMotivo] = useState('')
  const [observacion, setObservacion] = useState('')
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)

  const motivos = {
    incorporar: MOTIVOS_INCORPORACION,
    // Si cambia el estado, el motivo explica el cambio de estado (queda en la ficha mientras dure)
    editar: cambiaEstado ? (MOTIVOS_POR_ESTADO[estadoEditado] ?? []) : MOTIVOS_EDICION,
    estado: MOTIVOS_POR_ESTADO[nuevoEstado] ?? [],
    reemplazar: MOTIVOS_REEMPLAZO,
  }[tipo]

  const titulo = {
    incorporar: 'Incorporar máquina',
    editar: `Editar ${maquina?.nombre}`,
    estado: `Cambiar estado de ${maquina?.nombre}`,
    reemplazar: `Reemplazar ${maquina?.nombre}`,
  }[tipo]

  // Candidatas a entrar en un reemplazo: operativas, distintas de la saliente
  const candidatas = useMemo(
    () => flota.filter((m) => m.estado !== 'BAJA' && m.idMaquina !== maquina?.idMaquina),
    [flota, maquina],
  )

  const guardar = async (event) => {
    event.preventDefault()
    setError(null)
    if (tipo === 'estado' && !nuevoEstado) return setError('Elige el nuevo estado de la máquina.')
    if (tipo === 'editar') {
      const faltante = [
        ['nombre', 'el código interno'],
        ['patente', 'la patente'],
        ['tipoMaquina', 'el tipo de máquina'],
        ['marca', 'la marca'],
        ['modelo', 'el modelo'],
      ].find(([campo]) => !String(ficha[campo]).trim())
      if (faltante) return setError(`Falta ${faltante[1]}.`)
      if (ficha.anio !== '' && String(ficha.anio).length !== 4) return setError('El año de fabricación debe tener 4 dígitos.')
      const original = huella(fichaDe(maquina), String(maquina.operadorAsignado?.idOperador ?? ''), estadoActual.valor)
      if (huella(ficha, operador, estadoEditado) === original) return setError('No hay cambios que guardar.')
    }
    if (!motivo) return setError('Elige el motivo: queda registrado en la bitácora.')
    const justificacion = { motivo, observacion: observacion.trim() || null }
    const idOperador = operador === '' ? null : Number(operador)

    setGuardando(true)
    try {
      if (tipo === 'incorporar') {
        const nueva = await crearMaquina({ ...datosFicha(ficha, true), idOperador, ...justificacion })
        await onGuardado(`${nueva.nombre} se incorporó a la flota.`)
      } else if (tipo === 'editar') {
        await editarMaquina(maquina.idMaquina, {
          ...datosFicha(ficha, false),
          idOperador,
          ...(cambiaEstado ? { estado: estadoEditado } : {}),
          ...justificacion,
        })
        const nombre = ficha.nombre.trim().toUpperCase()
        await onGuardado(
          cambiaEstado
            ? `Se guardaron los cambios de ${nombre}, que quedó ${ESTADOS_MAQUINA.find((e) => e.valor === estadoEditado).etiqueta.toLowerCase()}.`
            : `Se guardaron los cambios de ${nombre}.`,
        )
      } else if (tipo === 'estado') {
        await cambiarEstadoMaquina(maquina.idMaquina, nuevoEstado, justificacion.motivo, justificacion.observacion)
        await onGuardado(`${maquina.nombre} quedó ${destino.etiqueta.toLowerCase()}.`)
      } else {
        if (entrante.origen === 'flota' && !entrante.idMaquina) {
          setGuardando(false)
          return setError('Elige la máquina que entra en su lugar.')
        }
        const datos = {
          ...(entrante.origen === 'flota'
            ? { idMaquinaEntrante: Number(entrante.idMaquina) }
            : { maquinaNueva: datosFicha(ficha, true) }),
          // Sin idOperador, el operador de la saliente pasa a la entrante
          ...(operador === 'mantener' ? {} : { idOperador }),
          ...justificacion,
        }
        const { entrante: nueva } = await reemplazarMaquina(maquina.idMaquina, datos)
        await onGuardado(`${nueva.nombre} tomó el lugar de ${maquina.nombre}.`)
      }
    } catch (e) {
      setError(e.message)
      setGuardando(false)
    }
  }

  const textoConfirmar = {
    incorporar: 'Incorporar',
    editar: 'Guardar cambios',
    estado: 'Cambiar estado',
    reemplazar: 'Reemplazar',
  }[tipo]

  return (
    <PanelLateral
      titulo={titulo}
      subtitulo={maquina ? [maquina.tipoMaquina, maquina.modelo].filter(Boolean).join(' · ') : 'Nueva máquina de la planta'}
      onCerrar={onCerrar}
      confirmar={{
        texto: guardando ? 'Guardando…' : textoConfirmar,
        form: 'flota-accion',
        // Sacar una máquina de servicio va en ámbar, como en la app
        variante: deshabilitar || tipo === 'reemplazar' || (cambiaEstado && estadoEditado === 'BAJA') ? 'ambar' : 'primario',
        ocupado: guardando,
      }}
    >
      <form id="flota-accion" className={styles.flotaAccion} onSubmit={guardar} noValidate>
        {tipo === 'estado' && (
          <>
            <div className={styles.campo}>
              <span className={styles.label}>Nuevo estado *</span>
              <SelectorEstado
                etiqueta="Nuevo estado"
                valor={nuevoEstado}
                opciones={ESTADOS_MAQUINA.filter((e) => e.valor !== estadoActual.valor)}
                onCambio={(estado) => {
                  setNuevoEstado(estado)
                  setMotivo('') // los motivos dependen del estado
                }}
              />
              <span className={styles.ayuda}>Estado actual: {estadoActual.etiqueta}</span>
            </div>
            {nuevoEstado && (
              <p className={styles.aviso}>
                <Info size={16} className={styles.avisoIcono} />
                {deshabilitar
                  ? 'La máquina dejará de estar disponible para iniciar turnos y podrá reemplazarse. No se puede si tiene un turno en curso.'
                  : 'La máquina queda disponible para iniciar turnos.'}
              </p>
            )}
          </>
        )}

        {tipo === 'reemplazar' && (
          <>
            <p className={styles.aviso}>
              <Info size={16} className={styles.avisoIcono} />
              {maquina.nombre} está fuera de servicio: otra máquina tomará su lugar y su operador.
            </p>
            <fieldset className={styles.fieldset}>
              <legend className={styles.label}>Máquina que entra</legend>
              <div className={styles.segmentado}>
                {[
                  ['flota', 'Una de la flota'],
                  ['nueva', 'Una máquina nueva'],
                ].map(([valor, texto]) => (
                  <label key={valor} className={`${styles.segmento} ${entrante.origen === valor ? styles.segmentoActivo : ''}`}>
                    <input
                      type="radio"
                      name="origen"
                      className={styles.radio}
                      checked={entrante.origen === valor}
                      onChange={() => setEntrante((e) => ({ ...e, origen: valor }))}
                    />
                    {texto}
                  </label>
                ))}
              </div>
              {entrante.origen === 'flota' && (
                <select
                  className={styles.input}
                  value={entrante.idMaquina}
                  onChange={(e) => setEntrante((s) => ({ ...s, idMaquina: e.target.value }))}
                  aria-label="Máquina que entra"
                >
                  <option value="">Elegir máquina…</option>
                  {candidatas.map((m) => (
                    <option key={m.idMaquina} value={m.idMaquina}>
                      {m.nombre} · {[m.tipoMaquina, m.modelo].filter(Boolean).join(' ')}
                    </option>
                  ))}
                </select>
              )}
            </fieldset>
          </>
        )}

        {tipo === 'editar' && (
          <>
            <section className={styles.seccion}>
              <h3 className={styles.seccionTitulo}>
                <Activity size={16} className={styles.seccionIcono} /> 1. Estado operacional
              </h3>
              <div className={styles.campo}>
                <span className={styles.label}>Estado *</span>
                <SelectorEstado
                  etiqueta="Estado"
                  valor={estadoEditado}
                  opciones={ESTADOS_MAQUINA}
                  onCambio={(estado) => {
                    setEstadoEditado(estado)
                    // Un motivo de la otra lista ya no corresponde
                    const lista = estado === estadoActual.valor ? MOTIVOS_EDICION : (MOTIVOS_POR_ESTADO[estado] ?? [])
                    if (!lista.includes(motivo)) setMotivo('')
                  }}
                />
                <span className={styles.ayuda}>Estado actual: {estadoActual.etiqueta}</span>
              </div>
              {cambiaEstado && (
                <p className={styles.aviso}>
                  <Info size={16} className={styles.avisoIcono} />
                  {estadoEditado === 'BAJA'
                    ? 'La máquina dejará de estar disponible para iniciar turnos y podrá reemplazarse. No se puede si tiene un turno en curso.'
                    : 'La máquina queda disponible para iniciar turnos.'}
                </p>
              )}
            </section>

            <section className={styles.seccion}>
              <h3 className={styles.seccionTitulo}>
                <Truck size={16} className={styles.seccionIcono} /> 2. Datos de la máquina
              </h3>
              <CamposFicha
                ficha={ficha}
                onCambio={setFicha}
                catalogos={catalogos}
                conHorometro={false}
                conPlantilla={false}
                obligatorios
                horometroActual={maquina.horometroActual ?? null}
              />
              <CampoOperador
                valor={operador}
                onCambio={setOperador}
                operadores={catalogos.operadores}
                maquina={maquina}
                conMantener={false}
              />
            </section>
          </>
        )}

        {(tipo === 'incorporar' || (tipo === 'reemplazar' && entrante.origen === 'nueva')) && (
          <CamposFicha
            ficha={ficha}
            onCambio={setFicha}
            catalogos={catalogos}
            conHorometro={tipo !== 'editar'}
            conPlantilla={tipo !== 'editar'}
          />
        )}

        {(tipo === 'incorporar' || tipo === 'reemplazar') && (
          <CampoOperador
            valor={operador}
            onCambio={setOperador}
            operadores={catalogos.operadores}
            maquina={maquina}
            conMantener={tipo === 'reemplazar'}
          />
        )}

        <div className={tipo === 'editar' ? styles.seccion : styles.grupo}>
          {tipo === 'editar' && (
            <h3 className={styles.seccionTitulo}>
              <ClipboardList size={16} className={styles.seccionIconoAmbar} /> 3. Justificación del jefe de turno
            </h3>
          )}
          <label className={styles.campo}>
            <span className={styles.label}>Motivo *</span>
            <select className={styles.input} value={motivo} onChange={(e) => setMotivo(e.target.value)} required>
              <option value="">Elegir motivo…</option>
              {motivos.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.campo}>
            <span className={styles.label}>Observación (opcional)</span>
            <textarea className={styles.input} rows={3} maxLength={500} value={observacion} onChange={(e) => setObservacion(e.target.value)} />
          </label>
        </div>

        {error && (
          <p className={styles.error} role="alert">
            <AlertCircle size={16} /> {error}
          </p>
        )}
      </form>
    </PanelLateral>
  )
}

export default FlotaAccion
