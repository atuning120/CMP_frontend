import { Info } from 'lucide-react'
import styles from './LeyendaMapa.module.css'

const ELEMENTOS = [
  { clase: 'area', texto: 'Límite de área', detalle: 'Polígono mayor' },
  { clase: 'zona', texto: 'Zona de trabajo', detalle: 'Geocerca activa' },
  { clase: 'productivo', texto: 'Productivo', detalle: 'Estado del turno' },
  { clase: 'demora', texto: 'Demora', detalle: 'Estado del turno' },
  { clase: 'mantencion', texto: 'Mantención o falla', detalle: 'Estado del turno' },
  { clase: 'sinEstado', texto: 'Sin estado', detalle: 'Turno recién iniciado' },
  { clase: 'alerta', texto: 'Alerta', detalle: 'Halo: turno de más de 10 h' },
]

/**
 * Leyenda del mapa. Se usa al pie de la lista de la flota y en la barra contraída del panel.
 * conAlertas: sin acceso a alertas (VISOR) no se muestra su fila.
 */
function LeyendaMapa({ conAlertas, id, className = '' }) {
  const elementos = conAlertas ? ELEMENTOS : ELEMENTOS.filter((e) => e.clase !== 'alerta')
  return (
    <div id={id} className={`${styles.leyendaMapa} ${className}`}>
      <h3 className={styles.titulo}>
        <Info size={14} />
        Leyenda del mapa
      </h3>
      <ul className={styles.lista}>
        {elementos.map((e) => (
          <li key={e.clase} className={styles.item}>
            <span className={`${styles.muestra} ${styles[e.clase]}`} />
            <span className={styles.texto}>{e.texto}</span>
            <span className={styles.detalle}>{e.detalle}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default LeyendaMapa
