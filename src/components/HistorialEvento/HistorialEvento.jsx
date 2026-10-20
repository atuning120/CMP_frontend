import {
  Activity,
  AlarmClockOff,
  ArrowLeftRight,
  Ban,
  CircleCheck,
  CirclePlus,
  Clock,
  MapPin,
  Pencil,
  Play,
  RefreshCw,
  Square,
  Undo2,
  UserCheck,
} from 'lucide-react'
import { formatearFecha } from '../../pages/Historial/fechas.js'
import { ESTADOS_MAQUINA } from '../../pages/Flota/estados.js'
import styles from './HistorialEvento.module.css'

// Igual que HistorialEventoCard de la app móvil
const PRESENTACION = {
  INICIO_TURNO: { icono: Play, verbo: 'inició turno en', tono: 'exito' },
  FIN_TURNO: { icono: Square, verbo: 'cerró turno en', tono: 'peligro' },
  CAMBIO_UBICACION: { icono: ArrowLeftRight, verbo: 'trasladó', tono: 'primario' },
  INCORPORAR: { icono: CirclePlus, verbo: 'incorporó', tono: 'primario' },
  EDITAR: { icono: Pencil, verbo: 'editó', tono: 'aviso' },
  HABILITAR: { icono: CircleCheck, verbo: 'habilitó', tono: 'exito' },
  DESHABILITAR: { icono: Ban, verbo: 'deshabilitó', tono: 'peligro' },
  CAMBIAR_ESTADO: { icono: Activity, verbo: 'cambió el estado de', tono: 'primario' },
  REEMPLAZAR: { icono: RefreshCw, verbo: 'reemplazó', tono: 'aviso' },
  DEVOLVER: { icono: Undo2, verbo: 'devolvió a operación', tono: 'exito' },
}

const formatoHoras = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 })

const texto = (valor) => (typeof valor === 'string' && valor.trim() !== '' ? valor : null)

// null/undefined no deben leerse como 0 (Number(null) === 0)
const numero = (valor) => {
  if (valor === null || valor === undefined || valor === '') return null
  const n = Number(valor)
  return Number.isFinite(n) ? n : null
}

const etiquetaEstado = (valor) => ESTADOS_MAQUINA.find((e) => e.valor === valor)?.etiqueta ?? valor

function HistorialEvento({ evento }) {
  const presentacion = PRESENTACION[evento.tipo]
  // Un tipo que esta versión del panel no conoce (Backend más nuevo) no debe romper la lista
  if (!presentacion) return null

  const { detalle } = evento
  // El inicio y el cierre del turno son eventos separados, cada uno en su fecha
  const esTurno = evento.tipo === 'INICIO_TURNO' || evento.tipo === 'FIN_TURNO'
  const esCierre = evento.tipo === 'FIN_TURNO'
  const Icono = presentacion.icono
  const tono = presentacion.tono
  const reemplazadaPor = evento.tipo === 'REEMPLAZAR' ? texto(detalle?.entrante) : null
  // Reemplazo: cómo quedó la saliente (los registros antiguos no lo traen). Devolución: el respaldo que sale
  const estadoSaliente = evento.tipo === 'REEMPLAZAR' ? texto(detalle?.despues?.estado) : null
  const respaldoDevuelto = evento.tipo === 'DEVOLVER' ? texto(detalle?.respaldo) : null
  // Turno cerrado por un jefe de turno en nombre del operador (falla de la máquina, mantención)
  const cerradoPor = esCierre ? texto(detalle?.cerradoPor) : null
  // Cambio de estado: a cuál pasó (los registros antiguos de habilitar/deshabilitar no lo traen)
  const estadoNuevo =
    evento.tipo === 'CAMBIAR_ESTADO' || evento.tipo === 'HABILITAR' ? texto(detalle?.despues?.estado) : null
  // El sistema lo cerró al pasar la duración máxima (probablemente el operador olvidó finalizarlo).
  // Sin número de horas: los turnos antiguos se cerraban a las 12 h y los actuales a las 13 h
  const cierreAutomatico = esCierre && detalle?.estadoTurno === 'CERRADO_AUTO'
  // Inicio: dónde y con qué horómetro partió. Cierre: dónde terminó y cuánto avanzó el horómetro.
  // Cambio de área/zona: desde dónde y a dónde fue
  const ubicacion = [texto(detalle?.area), texto(detalle?.zona)].filter(Boolean).join(' · ')
  const horometroInicial = esTurno ? numero(detalle?.horometroInicial) : null
  const horometroFinal = esCierre ? numero(detalle?.horometroFinal) : null
  let horometro = horometroInicial !== null ? `${formatoHoras.format(horometroInicial)} hrs` : null
  if (esCierre) {
    horometro =
      horometroFinal === null
        ? 'Sin horómetro final'
        : `${horometroInicial !== null ? `${formatoHoras.format(horometroInicial)} → ` : ''}${formatoHoras.format(horometroFinal)} hrs`
  }
  const esCambioUbicacion = evento.tipo === 'CAMBIO_UBICACION'
  const ubicacionAnterior = esCambioUbicacion
    ? [texto(detalle?.areaAnterior), texto(detalle?.zonaAnterior)].filter(Boolean).join(' · ')
    : ''
  const traslado = esCambioUbicacion ? [ubicacionAnterior, ubicacion].filter(Boolean).join(' → ') : ''

  return (
    <li className={`${styles.historialEvento} ${styles[tono]}`}>
      <span className={styles.icono}>
        <Icono size={18} />
      </span>

      <div className={styles.cuerpo}>
        <p className={styles.titulo}>
          {/* El cierre no siempre lo hace el operador: lo puede cerrar su jefe de turno o el sistema */}
          {cierreAutomatico && !cerradoPor ? (
            <>
              El turno de <strong className={styles.actor}>{evento.actor}</strong> en{' '}
              <strong className={styles.maquina}>{evento.maquina.nombre}</strong> se cerró automáticamente
            </>
          ) : cerradoPor ? (
            <>
              <strong className={styles.actor}>{cerradoPor}</strong> cerró el turno de{' '}
              <strong className={styles.actor}>{evento.actor}</strong> en <strong className={styles.maquina}>{evento.maquina.nombre}</strong>
            </>
          ) : (
            <>
              <strong className={styles.actor}>{evento.actor}</strong> {presentacion.verbo}{' '}
              <strong className={styles.maquina}>{evento.maquina.nombre}</strong>
            </>
          )}
          {reemplazadaPor && (
            <>
              {' por '}
              <strong className={styles.maquina}>{reemplazadaPor}</strong>
            </>
          )}
          {estadoNuevo && ` a ${etiquetaEstado(estadoNuevo).toLowerCase()}`}
          {estadoSaliente && ` · queda ${etiquetaEstado(estadoSaliente).toLowerCase()}`}
          {respaldoDevuelto && (
            <>
              {' · sale el respaldo '}
              <strong className={styles.maquina}>{respaldoDevuelto}</strong>
            </>
          )}
        </p>

        {(evento.motivo || cierreAutomatico || cerradoPor) && (
          <p className={styles.etiquetas}>
            {evento.motivo && <span className={styles.motivo}>{evento.motivo}</span>}
            {cerradoPor && (
              <span className={styles.cierreAuto}>
                <UserCheck size={12} />{' '}
                {texto(detalle?.motivoCierre) ? `Motivo: ${detalle.motivoCierre}` : 'Cerrado por el jefe de turno'}
              </span>
            )}
            {cierreAutomatico && !cerradoPor && (
              <span className={styles.cierreAuto}>
                <AlarmClockOff size={12} /> Superó la duración máxima del turno
              </span>
            )}
          </p>
        )}

        {evento.observacion && <p className={styles.observacion}>{evento.observacion}</p>}

        {traslado && (
          <p className={styles.meta}>
            <span className={styles.metaItem}>
              <MapPin size={13} /> {traslado}
            </span>
          </p>
        )}

        {esTurno && (ubicacion || horometro !== null) && (
          <p className={styles.meta}>
            {ubicacion && (
              <span className={styles.metaItem}>
                <MapPin size={13} /> {ubicacion}
              </span>
            )}
            {horometro !== null && (
              <span className={styles.metaItem}>
                <Clock size={13} /> {horometro}
              </span>
            )}
          </p>
        )}
      </div>

      <time className={styles.fecha} dateTime={evento.fecha} title={new Date(evento.fecha).toLocaleString('es-CL')}>
        {formatearFecha(evento.fecha)}
      </time>
    </li>
  )
}

export default HistorialEvento
