import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Activity, AlertCircle, AlertTriangle, ArrowRight, Check, ClipboardList, Info, PlusCircle, Truck, UserRound } from 'lucide-react'
import PanelLateral from '../PanelLateral/PanelLateral.jsx'
import SelectorEstado from '../SelectorEstado/SelectorEstado.jsx'
import {
  cambiarEstadoMaquina,
  cerrarTurnoDeMaquina,
  crearMaquina,
  devolverMaquina,
  editarMaquina,
  MAQUINA_MODIFICADA,
  reemplazarMaquina,
} from '../../services/flotaService.js'
import {
  MOTIVOS_DEVOLUCION,
  MOTIVOS_EDICION,
  MOTIVOS_INCORPORACION,
  MOTIVOS_POR_ESTADO,
  MOTIVOS_REEMPLAZO,
} from '../../pages/Flota/motivos.js'
import { conRegreso, ESTADOS_MAQUINA, estadoDe, operaEnEstado } from '../../pages/Flota/estados.js'
import styles from './FlotaAccion.module.css'
import { mensajeDeError } from '../../services/errores.js'
import { CLAVES } from '../../hooks/consultas.js'

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

// <input type="datetime-local"> trabaja en hora local sin zona: 'YYYY-MM-DDTHH:mm'
const aLocal = (fecha) => {
  const d = new Date(fecha)
  const dos = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}T${dos(d.getHours())}:${dos(d.getMinutes())}`
}
const aIso = (local) => (local ? new Date(local).toISOString() : null)
const esFutura = (local) => new Date(local).getTime() > Date.now()

// Respaldos posibles en un reemplazo (como en la app): no en mantenimiento ni cubriendo ya a otra. Primero los de
// respaldo (en reserva o fuera de servicio), que quedan operativos al entrar
const ESTADOS_RESPALDO = ['EN_RESERVA', 'BAJA', 'ACTIVA', 'BAJO_OBSERVACION']

/** Fecha estimada de regreso de una máquina en mantenimiento o fuera de servicio (opcional). */
function CampoRegreso({ valor, onCambio, nombre }) {
  // Se fija al abrir el formulario: no hace falta que avance mientras se llena
  const [minimo] = useState(() => aLocal(Date.now()))
  return (
    <label className={styles.campo}>
      <span className={styles.label}>Regreso estimado (opcional)</span>
      <input
        className={styles.input}
        type="datetime-local"
        min={minimo}
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
      />
      <span className={styles.ayuda}>
        Cuándo se espera que {nombre} vuelva a operar. Si se cumple y sigue sin volver, la flota lo marca para seguimiento.
      </span>
    </label>
  )
}

/**
 * La máquina tiene un turno en curso: para sacarla de operación el jefe de turno lo cierra en nombre del operador,
 * con el horómetro final que le dicta por radio. El cierre usa el mismo motivo de la acción.
 */
function CierreTurno({ maquina, horometro, onCambio }) {
  return (
    <div className={styles.cierreTurno}>
      <p className={styles.cierreTurnoTexto}>
        <AlertTriangle size={16} className={styles.avisoIcono} />
        <span>
          <strong>{maquina.nombre}</strong> tiene un turno en curso de <strong>{maquina.operadorActual}</strong>
          {maquina.ubicacionActual ? ` en ${maquina.ubicacionActual}` : ''}. Para continuar, se cerrará ese turno: pídele
          al operador el horómetro final por radio.
        </span>
      </p>
      <label className={styles.campo}>
        <span className={styles.label}>Horómetro final del turno (h) *</span>
        <input
          className={styles.input}
          type="number"
          inputMode="decimal"
          min={maquina.horometroActual ?? 0}
          step="0.1"
          value={horometro}
          onChange={(e) => onCambio(e.target.value)}
          required
        />
        {maquina.horometroActual !== null && (
          <span className={styles.ayuda}>Al iniciar el turno marcaba {formatoHoras.format(maquina.horometroActual)} h.</span>
        )}
      </label>
    </div>
  )
}

// Qué pasa con una candidata al entrar en un reemplazo (el operador en turno sigue con ella)
const notaCandidata = (m) => {
  if (m.estado === 'EN_RESERVA') return 'Disponible en reserva'
  if (m.estado === 'BAJA') return 'Fuera de servicio: queda operativa al entrar'
  if (m.operadorActual) return `En turno de ${m.operadorActual}`
  return estadoDe(m).etiqueta
}

/** Una máquina del resumen de un reemplazo: la que sale o la que entra (vacía mientras no se elige). */
function TarjetaCambio({ rol, nombre, detalle, estado }) {
  return (
    <div className={nombre ? styles.cambioMaquina : `${styles.cambioMaquina} ${styles.cambioPendiente}`}>
      <span className={styles.cambioRol}>{rol}</span>
      <strong className={styles.cambioNombre}>{nombre || 'Por elegir'}</strong>
      {detalle && <span className={styles.cambioDetalle}>{detalle}</span>}
      {estado && (
        <span className={styles.cambioEstado}>
          <span className={`${styles.punto} ${styles[estado.clase]}`} /> {estado.etiqueta}
        </span>
      )}
    </div>
  )
}

/** Máquinas de la flota que pueden entrar en un reemplazo, como tarjetas con su estado. */
function ListaCandidatas({ candidatas, valor, onCambio, onNueva }) {
  if (candidatas.length === 0) {
    return (
      <div className={styles.sinCandidatas}>
        <p className={styles.sinCandidatasTexto}>No hay máquinas de la flota disponibles para cubrirla.</p>
        <button type="button" className={styles.enlace} onClick={onNueva}>
          Registrar una máquina nueva
        </button>
      </div>
    )
  }
  return (
    <div className={styles.candidatas} role="radiogroup" aria-label="Máquina que entra">
      {candidatas.map((m) => {
        const elegida = String(m.idMaquina) === valor
        const estado = estadoDe(m)
        return (
          <label key={m.idMaquina} className={elegida ? `${styles.candidata} ${styles.candidataElegida}` : styles.candidata}>
            <input
              type="radio"
              name="entrante"
              className={styles.radio}
              checked={elegida}
              onChange={() => onCambio(String(m.idMaquina))}
            />
            <span className={`${styles.punto} ${styles[estado.clase]}`} />
            <span className={styles.candidataTexto}>
              <span className={styles.candidataNombre}>
                {m.nombre}
                <span className={styles.candidataModelo}>{[m.tipoMaquina, m.modelo].filter(Boolean).join(' · ')}</span>
              </span>
              <span className={styles.candidataNota}>{notaCandidata(m)}</span>
            </span>
            {elegida && <Check size={18} className={styles.candidataCheck} />}
          </label>
        )
      })}
    </div>
  )
}

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
 * 'incorporar' | 'editar' | 'estado' | 'reemplazar' | 'devolver'. Al guardar llama onGuardado(mensaje).
 */
function FlotaAccion({ accion, catalogos, flota, onCerrar, onGuardado }) {
  const { tipo, maquina } = accion
  const queryClient = useQueryClient()
  // Versión de la máquina sobre la que se prepara la acción. Si otro jefe de turno la cambió entremedio, se recarga la
  // flota y se adopta la nueva: volver a confirmar aplica el cambio sabiendo lo que hizo el otro
  const [versionBase, setVersionBase] = useState(() => maquina?.version)
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
  const regresoInicial = maquina?.regresoEstimado ? aLocal(maquina.regresoEstimado) : ''
  const [regreso, setRegreso] = useState(tipo === 'editar' ? regresoInicial : '')
  const [horometroCierre, setHorometroCierre] = useState('')
  // Si la acción falla después de cerrar el turno, al reintentar no se vuelve a cerrar
  const [turnoCerrado, setTurnoCerrado] = useState(false)

  // Devolver: el respaldo que cubre a la máquina (sus datos vienen de la flota)
  const respaldo = tipo === 'devolver' ? flota.find((m) => m.idMaquina === maquina.respaldo?.idMaquina) : null
  // Estado al que queda la máquina tras la acción (para el regreso estimado). En un reemplazo la saliente ya salió
  // de operación con "Estado" y conserva su estado y su regreso
  const estadoDestino = { estado: nuevoEstado, editar: estadoEditado }[tipo] ?? null
  const pideRegreso = estadoDestino !== null && conRegreso(estadoDestino)
  // La máquina cuyo turno en curso hay que cerrar antes de sacarla de operación
  const conTurno = tipo === 'devolver' ? respaldo : maquina
  const sacaDeOperacion =
    tipo === 'devolver' ||
    (tipo === 'estado' && nuevoEstado && !operaEnEstado(nuevoEstado)) ||
    (cambiaEstado && !operaEnEstado(estadoEditado))
  const pideCierre = Boolean(sacaDeOperacion && conTurno?.operadorActual && !turnoCerrado)

  const motivos = {
    incorporar: MOTIVOS_INCORPORACION,
    // Si cambia el estado, el motivo explica el cambio de estado (queda en la ficha mientras dure)
    editar: cambiaEstado ? (MOTIVOS_POR_ESTADO[estadoEditado] ?? []) : MOTIVOS_EDICION,
    estado: MOTIVOS_POR_ESTADO[nuevoEstado] ?? [],
    reemplazar: MOTIVOS_REEMPLAZO,
    devolver: MOTIVOS_DEVOLUCION,
  }[tipo]

  const titulo = {
    incorporar: 'Incorporar máquina',
    editar: `Editar ${maquina?.nombre}`,
    estado: `Cambiar estado de ${maquina?.nombre}`,
    reemplazar: `Reemplazar ${maquina?.nombre}`,
    devolver: `Devolver ${maquina?.nombre} a operación`,
  }[tipo]

  // Candidatas a entrar en un reemplazo: pueden trabajar, no cubren ya a otra y no son la saliente
  const candidatas = useMemo(
    () =>
      flota
        .filter((m) => ESTADOS_RESPALDO.includes(m.estado) && !m.cubreA && m.idMaquina !== maquina?.idMaquina)
        .sort((a, b) => ESTADOS_RESPALDO.indexOf(a.estado) - ESTADOS_RESPALDO.indexOf(b.estado)),
    [flota, maquina],
  )

  // Reemplazar: la candidata elegida, para el resumen "sale → entra"
  const elegida = candidatas.find((m) => String(m.idMaquina) === entrante.idMaquina)
  // Editar y reemplazar se arman en secciones numeradas, como en la app
  const conSecciones = tipo === 'editar' || tipo === 'reemplazar'

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
      const cambiaRegreso = pideRegreso && regreso !== regresoInicial
      if (huella(ficha, operador, estadoEditado) === original && !cambiaRegreso) return setError('No hay cambios que guardar.')
    }
    if (!motivo) return setError('Elige el motivo: queda registrado en la bitácora.')
    if (pideRegreso && regreso && !esFutura(regreso)) {
      return setError('El regreso estimado debe ser una fecha futura.')
    }
    const horometro = Number(horometroCierre)
    if (pideCierre && (horometroCierre === '' || !Number.isFinite(horometro))) {
      return setError(`Ingresa el horómetro final del turno de ${conTurno.operadorActual}.`)
    }
    const justificacion = { motivo, observacion: observacion.trim() || null }
    const idOperador = operador === '' ? null : Number(operador)
    // undefined = no se envía (no cambia); '' = se borra
    const regresoEstimado = pideRegreso ? aIso(regreso) : undefined

    setGuardando(true)
    let cerroTurno = false
    try {
      if (pideCierre) {
        await cerrarTurnoDeMaquina(conTurno.idMaquina, horometro, motivo, conTurno.idTurnoActual)
        cerroTurno = true
        setTurnoCerrado(true)
      }
      if (tipo === 'incorporar') {
        const nueva = await crearMaquina({ ...datosFicha(ficha, true), idOperador, ...justificacion })
        await onGuardado(`${nueva.nombre} se incorporó a la flota.`)
      } else if (tipo === 'editar') {
        await editarMaquina(maquina.idMaquina, {
          versionBase,
          ...datosFicha(ficha, false),
          idOperador,
          ...(cambiaEstado ? { estado: estadoEditado } : {}),
          ...(pideRegreso && regreso !== regresoInicial ? { regresoEstimado } : {}),
          ...justificacion,
        })
        const nombre = ficha.nombre.trim().toUpperCase()
        await onGuardado(
          cambiaEstado
            ? `Se guardaron los cambios de ${nombre}, que quedó ${ESTADOS_MAQUINA.find((e) => e.valor === estadoEditado).etiqueta.toLowerCase()}.`
            : `Se guardaron los cambios de ${nombre}.`,
        )
      } else if (tipo === 'estado') {
        await cambiarEstadoMaquina(
          maquina.idMaquina,
          versionBase,
          nuevoEstado,
          justificacion.motivo,
          justificacion.observacion,
          regresoEstimado ?? undefined,
        )
        await onGuardado(`${maquina.nombre} quedó ${destino.etiqueta.toLowerCase()}.`)
      } else if (tipo === 'devolver') {
        const { respaldo: devuelto } = await devolverMaquina(maquina.idMaquina, versionBase, justificacion.motivo, justificacion.observacion)
        await onGuardado(`${maquina.nombre} volvió a operar; ${devuelto.nombre} quedó ${estadoDe(devuelto).etiqueta.toLowerCase()}.`)
      } else {
        if (entrante.origen === 'flota' && !entrante.idMaquina) {
          setGuardando(false)
          return setError('Elige la máquina que entra en su lugar.')
        }
        const datos = {
          versionBase,
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
      if (e?.code === MAQUINA_MODIFICADA) {
        await queryClient.refetchQueries({ queryKey: CLAVES.flota })
        const actual = queryClient.getQueryData(CLAVES.flota)?.find((m) => m.idMaquina === maquina.idMaquina)
        if (actual) setVersionBase(actual.version)
      }
      // El turno pudo quedar cerrado aunque la acción fallara: al reintentar ya no se pide el horómetro
      const mensaje = mensajeDeError(e, 'No se pudo completar la acción.')
      setError(cerroTurno ? `El turno de ${conTurno.operadorActual} quedó cerrado, pero: ${mensaje}` : mensaje)
      setGuardando(false)
    }
  }

  const textoConfirmar = {
    incorporar: 'Incorporar',
    editar: 'Guardar cambios',
    estado: pideCierre ? 'Cerrar turno y cambiar estado' : 'Cambiar estado',
    reemplazar: 'Reemplazar',
    devolver: pideCierre ? 'Cerrar turno y devolver' : 'Devolver',
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
        variante: deshabilitar || tipo === 'reemplazar' || pideCierre || (cambiaEstado && estadoEditado === 'BAJA') ? 'ambar' : 'primario',
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
                {operaEnEstado(nuevoEstado)
                  ? 'La máquina queda disponible para iniciar turnos.'
                  : 'La máquina dejará de estar disponible para iniciar turnos. Si necesitas que otra la cubra, usa "Reemplazar".'}
              </p>
            )}
            {pideRegreso && <CampoRegreso valor={regreso} onCambio={setRegreso} nombre={maquina.nombre} />}
          </>
        )}

        {tipo === 'devolver' && respaldo && (
          <p className={styles.aviso}>
            <Info size={16} className={styles.avisoIcono} />
            {maquina.nombre} vuelve a operar
            {respaldo.operadorAsignado ? ` con ${respaldo.operadorAsignado.nombre}` : ''}, y {respaldo.nombre} vuelve a
            quedar {(ESTADOS_MAQUINA.find((e) => e.valor === maquina.respaldo.estadoAlDevolver)?.etiqueta ?? 'en reserva').toLowerCase()}.
          </p>
        )}

        {tipo === 'reemplazar' && (
          <>
            <div className={styles.cambio}>
              <div className={styles.cambioFila}>
                <TarjetaCambio
                  rol="Sale"
                  nombre={maquina.nombre}
                  detalle={[maquina.tipoMaquina, maquina.modelo].filter(Boolean).join(' · ')}
                  estado={estadoActual}
                />
                <ArrowRight size={20} className={styles.cambioFlecha} aria-hidden />
                <TarjetaCambio
                  rol="Entra"
                  nombre={entrante.origen === 'flota' ? elegida?.nombre : ficha.nombre.trim().toUpperCase()}
                  detalle={
                    entrante.origen === 'flota'
                      ? elegida && [elegida.tipoMaquina, elegida.modelo].filter(Boolean).join(' · ')
                      : 'Máquina nueva'
                  }
                />
              </div>
              <p className={styles.cambioTexto}>
                <Info size={14} className={styles.avisoIcono} />
                {maquina.nombre} sigue {estadoActual.etiqueta.toLowerCase()}. Cuando vuelva, usa "Devolver" para dejar
                todo como estaba.
              </p>
            </div>

            <section className={styles.seccion}>
              <h3 className={styles.seccionTitulo}>
                <Truck size={16} className={styles.seccionIcono} /> 1. Máquina que entra
              </h3>
              <div className={styles.segmentado} role="radiogroup" aria-label="Origen de la máquina que entra">
                {[
                  ['flota', 'Una de la flota', Truck],
                  ['nueva', 'Una máquina nueva', PlusCircle],
                ].map(([valor, texto, Icono]) => (
                  <label key={valor} className={`${styles.segmento} ${entrante.origen === valor ? styles.segmentoActivo : ''}`}>
                    <input
                      type="radio"
                      name="origen"
                      className={styles.radio}
                      checked={entrante.origen === valor}
                      onChange={() => setEntrante((e) => ({ ...e, origen: valor }))}
                    />
                    <Icono size={15} />
                    {texto}
                  </label>
                ))}
              </div>
              {entrante.origen === 'flota' ? (
                <ListaCandidatas
                  candidatas={candidatas}
                  valor={entrante.idMaquina}
                  onCambio={(idMaquina) => setEntrante((e) => ({ ...e, idMaquina }))}
                  onNueva={() => setEntrante((e) => ({ ...e, origen: 'nueva' }))}
                />
              ) : (
                <CamposFicha ficha={ficha} onCambio={setFicha} catalogos={catalogos} conHorometro conPlantilla />
              )}
            </section>

            <section className={styles.seccion}>
              <h3 className={styles.seccionTitulo}>
                <UserRound size={16} className={styles.seccionIcono} /> 2. Operador
              </h3>
              <CampoOperador valor={operador} onCambio={setOperador} operadores={catalogos.operadores} maquina={maquina} conMantener />
            </section>
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
                  {operaEnEstado(estadoEditado)
                    ? 'La máquina queda disponible para iniciar turnos.'
                    : 'La máquina dejará de estar disponible para iniciar turnos. Si necesitas que otra la cubra, usa "Reemplazar".'}
                </p>
              )}
              {pideRegreso && <CampoRegreso valor={regreso} onCambio={setRegreso} nombre={maquina.nombre} />}
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

        {tipo === 'incorporar' && (
          <>
            <CamposFicha ficha={ficha} onCambio={setFicha} catalogos={catalogos} conHorometro conPlantilla />
            <CampoOperador valor={operador} onCambio={setOperador} operadores={catalogos.operadores} maquina={maquina} conMantener={false} />
          </>
        )}

        <div className={conSecciones ? styles.seccion : styles.grupo}>
          {conSecciones && (
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

        {pideCierre && <CierreTurno maquina={conTurno} horometro={horometroCierre} onCambio={setHorometroCierre} />}

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
