import { useId } from 'react'
import { Info } from 'lucide-react'
import PuntoEstado from '../PuntoEstado/PuntoEstado.jsx'
import styles from './LeyendaMapa.module.css'

// estado: el punto de la máquina (PuntoEstado, igual que en el mapa); si no, una muestra propia (línea o halo)
const ELEMENTOS = [
  { clase: 'area', texto: 'Límite de área', detalle: 'Polígono mayor' },
  { clase: 'zona', texto: 'Zona de trabajo', detalle: 'Geocerca activa' },
  { estado: 'productivo', texto: 'Productivo', detalle: 'Estado del turno' },
  { estado: 'demora', texto: 'Demora', detalle: 'Estado del turno' },
  { estado: 'mantencion', texto: 'Mantención o falla', detalle: 'Estado del turno' },
  { estado: 'sinEstado', texto: 'Sin estado', detalle: 'Turno recién iniciado' },
  { clase: 'alerta', texto: 'Alerta', detalle: 'Halo: turno de más de 10 h' },
]

/**
 * Leyenda del mapa. Se usa al pie de la lista de la flota y en la barra contraída del panel.
 * conAlertas: sin acceso a alertas (VISOR) no se muestra su fila.
 */
function LeyendaMapa({ conAlertas, id, className = '' }) {
  const idTitulo = useId()
  const elementos = conAlertas ? ELEMENTOS : ELEMENTOS.filter((e) => e.clase !== 'alerta')
  return (
    <div id={id} className={`${styles.leyendaMapa} ${className}`}>
      <h3 id={idTitulo} className={styles.titulo}>
        <Info size={14} />
        Leyenda del mapa
      </h3>
      <ul className={styles.lista} aria-labelledby={idTitulo}>
        {elementos.map((e) => (
          <li key={e.estado ?? e.clase} className={styles.item}>
            {e.estado ? (
              <PuntoEstado categoria={e.estado} className={styles.punto} />
            ) : (
              <span className={`${styles.muestra} ${styles[e.clase]}`} aria-hidden="true" />
            )}
            <span className={styles.texto}>{e.texto}</span>
            <span className={styles.detalle}>{e.detalle}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default LeyendaMapa
