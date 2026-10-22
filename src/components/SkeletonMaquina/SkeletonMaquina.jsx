import Skeleton from '../Skeleton/Skeleton.jsx'
import styles from './SkeletonMaquina.module.css'

// Tarjeta de máquina del panel de flota mientras carga: misma forma que las de FlotaPanel
function SkeletonMaquina() {
  return (
    <li className={styles.skeletonMaquina} aria-hidden="true">
      <span className={styles.fila}>
        <Skeleton className={styles.codigo} />
        <Skeleton className={styles.badge} />
      </span>
      <Skeleton className={styles.modelo} />
      <Skeleton className={styles.detalle} />
      <span className={styles.pie}>
        <Skeleton className={styles.operador} />
        <Skeleton className={styles.horometro} />
      </span>
    </li>
  )
}

export default SkeletonMaquina
