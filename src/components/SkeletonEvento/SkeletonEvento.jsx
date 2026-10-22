import Skeleton from '../Skeleton/Skeleton.jsx'
import styles from './SkeletonEvento.module.css'

// Un evento del historial (o una alerta) mientras carga: misma forma que HistorialEvento y AlertaItem
function SkeletonEvento() {
  return (
    <li className={styles.skeletonEvento} aria-hidden="true">
      <Skeleton className={styles.icono} />
      <div className={styles.cuerpo}>
        <Skeleton className={styles.titulo} />
        <Skeleton className={styles.etiqueta} />
        <Skeleton className={styles.meta} />
      </div>
      <Skeleton className={styles.fecha} />
    </li>
  )
}

export default SkeletonEvento
