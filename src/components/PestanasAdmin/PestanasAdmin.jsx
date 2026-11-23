import { NavLink } from 'react-router-dom'
import { Smartphone, Users } from 'lucide-react'
import styles from './PestanasAdmin.module.css'

const claseEnlace = ({ isActive }) => (isActive ? `${styles.pestana} ${styles.activa}` : styles.pestana)

// Secciones de Administración (solo ADMIN): usuarios y versiones de la app móvil
function PestanasAdmin() {
  return (
    <nav className={styles.pestanasAdmin} aria-label="Secciones de administración">
      <NavLink to="/admin" end className={claseEnlace}>
        <Users size={16} aria-hidden="true" /> Usuarios
      </NavLink>
      <NavLink to="/admin/app-movil" className={claseEnlace}>
        <Smartphone size={16} aria-hidden="true" /> App móvil
      </NavLink>
    </nav>
  )
}

export default PestanasAdmin
