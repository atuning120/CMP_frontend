import { NavLink } from 'react-router-dom'
import { SatelliteDish, Truck } from 'lucide-react'
import { useDispositivosGps, useFlota } from '../../hooks/consultas.js'
import { estadoGps } from '../../services/gpsService.js'
import styles from './PestanasFlota.module.css'

const claseEnlace = ({ isActive }) => (isActive ? `${styles.pestana} ${styles.activa}` : styles.pestana)

// Secciones de Flota (JEFE_TURNO y ADMIN): las máquinas y los GPS instalados en ellas
function PestanasFlota() {
  const maquinas = useFlota().data?.length
  const gps = useDispositivosGps().data?.filter((d) => estadoGps(d) !== 'baja').length
  return (
    <nav className={styles.pestanasFlota} aria-label="Secciones de la flota">
      <NavLink to="/flota" end className={claseEnlace}>
        <Truck size={16} aria-hidden="true" /> Máquinas
        {maquinas !== undefined && <span className={styles.conteo}>{maquinas}</span>}
      </NavLink>
      <NavLink to="/flota/gps" className={claseEnlace} data-recorrido="flota-pestana-gps">
        <SatelliteDish size={16} aria-hidden="true" /> GPS
        {gps !== undefined && <span className={styles.conteo}>{gps}</span>}
      </NavLink>
    </nav>
  )
}

export default PestanasFlota
