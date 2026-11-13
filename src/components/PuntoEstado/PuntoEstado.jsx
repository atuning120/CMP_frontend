import styles from './PuntoEstado.module.css'

/**
 * Punto de color del estado operacional de una máquina: una sola definición para la leyenda, la ficha del mapa y,
 * con las mismas clases, los marcadores (MapaPlanta arma esos con DOM). Decorativo: el texto de al lado (o la
 * etiqueta del marcador) dice el estado.
 * categoria: 'productivo' | 'demora' | 'mantencion' | 'sinEstado' | null (sin turno: solo gris)
 */
function PuntoEstado({ categoria, className = '' }) {
  return <span className={`${styles.puntoEstado} ${styles[categoria] ?? ''} ${className}`} aria-hidden="true" />
}

export default PuntoEstado
