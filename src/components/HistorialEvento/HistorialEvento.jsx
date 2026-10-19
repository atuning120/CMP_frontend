import { Activity, AlarmClockOff, Ban, CircleCheck, CirclePlus, Clock, MapPin, Pencil, Play, RefreshCw, Square } from 'lucide-react'
import { formatearFecha } from '../../pages/Historial/fechas.js'
import { ESTADOS_MAQUINA } from '../../pages/Flota/estados.js'
import styles from './HistorialEvento.module.css'

// Igual que HistorialEventoCard de la app móvil
const PRESENTACION = {
  INICIO_TURNO: { icono: Play, verbo: 'inició turno en', tono: 'exito' },
  INCORPORAR: { icono: CirclePlus, verbo: 'incorporó', tono: 'primario' },
  EDITAR: { icono: Pencil, verbo: 'editó', tono: 'aviso' },
  HABILITAR: { icono: CircleCheck, verbo: 'habilitó', tono: 'exito' },
  DESHABILITAR: { icono: Ban, verbo: 'deshabilitó', tono: 'peligro' },
  CAMBIAR_ESTADO: { icono: Activity, verbo: 'cambió el estado de', tono: 'primario' },
  REEMPLAZAR: { icono: RefreshCw, verbo: 'reemplazó', tono: 'aviso' },
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
  const esTurno = evento.tipo === 'INICIO_TURNO'
  // Un turno ya cerrado se marca en rojo en la misma fila de su inicio
  const horaTermino = esTurno ? texto(detalle?.horaTermino) : null
  const Icono = horaTermino ? Square : presentacion.icono
  const tono = horaTermino ? 'peligro' : presentacion.tono
  const reemplazadaPor = evento.tipo === 'REEMPLAZAR' ? texto(detalle?.entrante) : null
  // Cambio de estado: a cuál pasó (los registros antiguos de habilitar/deshabilitar no lo traen)
  const estadoNuevo =
    evento.tipo === 'CAMBIAR_ESTADO' || evento.tipo === 'HABILITAR' ? texto(detalle?.despues?.estado) : null
  // El sistema lo cerró al pasar la duración máxima (probablemente el operador olvidó finalizarlo).
  // Sin número de horas: los turnos antiguos se cerraban a las 12 h y los actuales a las 13 h
  const cierreAutomatico = esTurno && detalle?.estadoTurno === 'CERRADO_AUTO'
  // Inicio de turno: dónde y con qué horómetro partió
  const ubicacion = [texto(detalle?.area), texto(detalle?.zona)].filter(Boolean).join(' · ')
  const horometro = esTurno ? numero(detalle?.horometroInicial) : null

  return (
    <li className={`${styles.historialEvento} ${styles[tono]}`}>
      <span className={styles.icono}>
        <Icono size={18} />
      </span>

      <div className={styles.cuerpo}>
        <p className={styles.titulo}>
          <strong className={styles.actor}>{evento.actor}</strong> {presentacion.verbo}{' '}
          <strong className={styles.maquina}>{evento.maquina.nombre}</strong>
          {reemplazadaPor && (
            <>
              {' por '}
              <strong className={styles.maquina}>{reemplazadaPor}</strong>
            </>
          )}
          {estadoNuevo && ` a ${etiquetaEstado(estadoNuevo).toLowerCase()}`}
        </p>

        {(evento.motivo || cierreAutomatico) && (
          <p className={styles.etiquetas}>
            {evento.motivo && <span className={styles.motivo}>{evento.motivo}</span>}
            {cierreAutomatico && (
              <span className={styles.cierreAuto}>
                <AlarmClockOff size={12} /> Cierre automático (superó la duración máxima)
              </span>
            )}
          </p>
        )}

        {evento.observacion && <p className={styles.observacion}>{evento.observacion}</p>}

        {esTurno && (ubicacion || horometro !== null) && (
          <p className={styles.meta}>
            {ubicacion && (
              <span className={styles.metaItem}>
                <MapPin size={13} /> {ubicacion}
              </span>
            )}
            {horometro !== null && (
              <span className={styles.metaItem}>
                <Clock size={13} /> {formatoHoras.format(horometro)} hrs
              </span>
            )}
          </p>
        )}
      </div>

      <time className={styles.fecha} dateTime={evento.fecha} title={new Date(evento.fecha).toLocaleString('es-CL')}>
        {horaTermino ? `Inicio ${formatearFecha(evento.fecha)} · Fin ${formatearFecha(horaTermino)}` : formatearFecha(evento.fecha)}
      </time>
    </li>
  )
}

export default HistorialEvento
