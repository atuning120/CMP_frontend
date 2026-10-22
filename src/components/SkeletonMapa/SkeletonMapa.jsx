import Skeleton, { AvisoCarga } from '../Skeleton/Skeleton.jsx'
import SkeletonMaquina from '../SkeletonMaquina/SkeletonMaquina.jsx'
import styles from './SkeletonMapa.module.css'

const TARJETAS = [1, 2, 3, 4]

// Mientras se descarga la página del mapa (MapLibre pesa ~1 MB): panel de flota y mapa con su forma final
function SkeletonMapa() {
  return (
    <div className={styles.skeletonMapa}>
      <AvisoCarga texto="Cargando mapa…" />
      <aside className={styles.panel} aria-hidden="true">
        <div className={styles.cabecera}>
          <Skeleton className={styles.titulo} />
          <Skeleton className={styles.buscador} />
          <span className={styles.filtros}>
            <Skeleton className={styles.filtro} />
            <Skeleton className={styles.filtro} />
            <Skeleton className={styles.filtro} />
          </span>
        </div>
        <ul className={styles.lista}>
          {TARJETAS.map((n) => (
            <SkeletonMaquina key={n} />
          ))}
        </ul>
      </aside>
      <Skeleton className={styles.mapa} />
    </div>
  )
}

export default SkeletonMapa
