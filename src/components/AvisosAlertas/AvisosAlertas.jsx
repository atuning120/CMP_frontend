import { useEffect } from 'react'
import { X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatearFecha } from '../../pages/Historial/fechas.js'
import { describirAlerta, textoAlerta } from '../AlertaItem/describirAlerta.js'
import styles from './AvisosAlertas.module.css'

// Cada aviso se cierra solo pasado este tiempo
const DURACION_AVISO_MS = 12000

function Aviso({ alerta, onCerrar }) {
  const { icono: Icono, tono, etiqueta } = describirAlerta(alerta)

  useEffect(() => {
    const temporizador = setTimeout(() => onCerrar(alerta.id), DURACION_AVISO_MS)
    return () => clearTimeout(temporizador)
  }, [alerta.id, onCerrar])

  return (
    <li className={`${styles.aviso} ${styles[tono]}`}>
      <span className={styles.icono}>
        <Icono size={18} />
      </span>
      <div className={styles.cuerpo}>
        <p className={styles.texto}>{textoAlerta(alerta)}</p>
        <p className={styles.detalle}>
          {etiqueta} · {formatearFecha(alerta.fecha)}
        </p>
        <Link to="/alertas" className={styles.ver} onClick={() => onCerrar(alerta.id)}>
          Ver alertas
        </Link>
      </div>
      <button type="button" className={styles.cerrar} onClick={() => onCerrar(alerta.id)} aria-label="Cerrar aviso">
        <X size={16} />
      </button>
    </li>
  )
}

// Avisos emergentes de las alertas que llegan por WebSocket, apilados en la esquina superior derecha
function AvisosAlertas({ avisos, onCerrar }) {
  return (
    <ul className={styles.avisosAlertas} aria-live="polite" aria-label="Alertas nuevas">
      {avisos.map((alerta) => (
        <Aviso key={alerta.id} alerta={alerta} onCerrar={onCerrar} />
      ))}
    </ul>
  )
}

export default AvisosAlertas
