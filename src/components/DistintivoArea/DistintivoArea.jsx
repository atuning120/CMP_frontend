import { iconoArea } from './iconosArea.js'
import styles from './DistintivoArea.module.css'

/**
 * Cuadrado de tamaño fijo que identifica un área en los listados: muestra su código (p. ej. "51")
 * o, si no tiene, su ícono. Así todas las filas quedan alineadas sin importar el formato del nombre.
 */
function DistintivoArea({ codigo, icono }) {
  return (
    <span className={styles.distintivoArea} aria-hidden="true">
      {codigo ? <span className={styles.codigo}>{codigo}</span> : iconoArea(icono, { size: 14 })}
    </span>
  )
}

export default DistintivoArea
