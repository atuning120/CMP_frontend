import { Clock, MapPin, Timer } from 'lucide-react'
import { formatearFecha } from '../../pages/Historial/fechas.js'
import AtencionAlerta from '../AtencionAlerta/AtencionAlerta.jsx'
import { describirAlerta } from './describirAlerta.js'
import styles from './AlertaItem.module.css'

// Una alerta en la lista de /alertas, con la misma forma que un evento del historial. `nueva`: llegó por WebSocket.
// onAtendida recibe { idAlerta, atenciones } cuando se atiende o se le agrega una nota
function AlertaItem({ alerta, nueva, onAtendida }) {
  const { icono: Icono, tono, activa, frase, etiqueta, ubicacion, jornada } = describirAlerta(alerta)

  return (
    <li className={`${styles.alertaItem} ${styles[tono]} ${activa ? styles.activa : ''} ${nueva ? styles.nueva : ''}`}>
      <span className={styles.icono}>
        <Icono size={18} />
      </span>

      <div className={styles.cuerpo}>
        <p className={styles.titulo}>
          {frase.antes}
          <strong className={styles.actor}>{alerta.operador}</strong>
          {frase.despues}
          <strong className={styles.maquina}>{alerta.maquina.nombre}</strong>
        </p>

        <p className={styles.etiquetas}>
          <span className={styles.etiqueta}>
            <Timer size={12} /> {etiqueta}
          </span>
          {nueva && <span className={styles.recien}>Nueva</span>}
        </p>

        <p className={styles.meta}>
          {ubicacion && (
            <span className={styles.metaItem}>
              <MapPin size={13} /> {ubicacion}
            </span>
          )}
          <span className={styles.metaItem}>
            <Clock size={13} />
            {jornada ? `Jornada desde ${formatearFecha(jornada.inicio)}` : `Inicio ${formatearFecha(alerta.turno.horaInicio)}`}
          </span>
        </p>

        <AtencionAlerta alerta={alerta} onGuardada={onAtendida} />
      </div>

      <time className={styles.fecha} dateTime={alerta.fecha} title={new Date(alerta.fecha).toLocaleString('es-CL')}>
        {formatearFecha(alerta.fecha)}
      </time>
    </li>
  )
}

export default AlertaItem
