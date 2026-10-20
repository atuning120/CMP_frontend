import { AlarmClockOff, Clock, MapPin, UserCheck } from 'lucide-react'
import { formatearFecha } from '../../pages/Historial/fechas.js'
import { describirEvento, etiquetaEstado } from './describirEvento.js'
import styles from './HistorialEvento.module.css'

function HistorialEvento({ evento }) {
  const descripcion = describirEvento(evento)
  // Un tipo que esta versión del panel no conoce (Backend más nuevo) no debe romper la lista
  if (!descripcion) return null

  const {
    presentacion,
    esTurno,
    reemplazadaPor,
    estadoSaliente,
    respaldoDevuelto,
    cerradoPor,
    motivoCierre,
    estadoNuevo,
    cierreAutomatico,
    ubicacion,
    horometro,
    traslado,
  } = descripcion
  const Icono = presentacion.icono
  const tono = presentacion.tono

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
                {motivoCierre ? `Motivo: ${motivoCierre}` : 'Cerrado por el jefe de turno'}
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
