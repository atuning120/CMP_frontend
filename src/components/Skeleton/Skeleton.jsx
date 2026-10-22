import styles from './Skeleton.module.css'

// Bloque animado que ocupa el lugar de un dato mientras carga. Ancho, alto y forma los da `className`
function Skeleton({ className = '' }) {
  return <span className={`${styles.skeleton} ${className}`} aria-hidden="true" />
}

// El skeleton es solo visual: esto le dice al lector de pantalla qué se está cargando
export function AvisoCarga({ texto }) {
  return (
    <span className={styles.aviso} role="status">
      {texto}
    </span>
  )
}

export default Skeleton
