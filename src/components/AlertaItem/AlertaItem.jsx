import { Clock, MapPin, Timer } from 'lucide-react'
import { fechaCompleta, formatearFecha } from '../../pages/Historial/fechas.js'
import AtencionAlerta from '../AtencionAlerta/AtencionAlerta.jsx'
import RegularizarHorometro from '../RegularizarHorometro/RegularizarHorometro.jsx'
import { describirAlerta, faltaHorometroFinal } from './describirAlerta.js'
import styles from './AlertaItem.module.css'

// Una alerta en la lista de /alertas, con la misma forma que un evento del historial. `nueva`: llegó por WebSocket.
// onAtendida recibe { idAlerta, atenciones } cuando se atiende o se le agrega una nota, más horometroFinal si se
// regularizó el horómetro
function AlertaItem({ alerta, nueva, onAtendida }) {
  const { tipo, icono: Icono, tono, activa, frase, etiqueta, ubicacion, jornada } = describirAlerta(alerta)
  // Marcada con su color mientras requiere acción: sigue en curso o, en un cierre automático, falta el horómetro final
  const marcada = activa || faltaHorometroFinal(alerta)

  return (
    <li
      className={`${styles.alertaItem} ${styles[tono]} ${activa ? styles.activa : ''} ${marcada ? '' : styles.terminada} ${nueva ? styles.nueva : ''}`}
    >
      <span className={styles.icono} aria-hidden="true">
        <Icono size={18} />
      </span>

      <div className={styles.cuerpo}>
        <p className={styles.titulo}>
          {/* El tipo lo muestran el icono y el color; el lector de pantalla lo anuncia primero */}
          <span className={styles.visuallyHidden}>Alerta de {tipo.toLowerCase()}: </span>
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

        {faltaHorometroFinal(alerta) && <RegularizarHorometro alerta={alerta} onRegularizado={onAtendida} />}
        <AtencionAlerta alerta={alerta} onGuardada={onAtendida} />
      </div>

      <time className={styles.fecha} dateTime={alerta.fecha} title={fechaCompleta(alerta.fecha)}>
        <span aria-hidden="true">{formatearFecha(alerta.fecha)}</span>
        <span className={styles.visuallyHidden}>{fechaCompleta(alerta.fecha)}</span>
      </time>
    </li>
  )
}

export default AlertaItem
