import { LogOut } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { cerrarSesion, esAdmin, useSesion } from '../../services/session.js'
import ThemeToggle from '../ThemeToggle/ThemeToggle.jsx'
import styles from './MainLayout.module.css'

const ROL_LABEL = {
  ADMIN: 'Administrador',
  JEFE_TURNO: 'Jefe de turno',
  VISOR: 'Visor',
}

const navLinkClass = ({ isActive }) =>
  isActive ? `${styles.link} ${styles.active}` : styles.link

function MainLayout() {
  const sesion = useSesion()
  const navigate = useNavigate()

  const handleLogout = () => {
    cerrarSesion()
    navigate('/login', { replace: true })
  }

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <span className={styles.brand}>CMP</span>
        <nav className={styles.nav}>
          <NavLink to="/" end className={navLinkClass}>
            Inicio
          </NavLink>
          {esAdmin(sesion) && (
            <NavLink to="/admin" className={navLinkClass}>
              Administración
            </NavLink>
          )}
          <span className={styles.user}>
            <span className={styles.userEmail}>{sesion?.email}</span>
            <span className={styles.userRole}>{ROL_LABEL[sesion?.rol] ?? sesion?.rol}</span>
          </span>
          <ThemeToggle />
          <button type="button" className={styles.logout} onClick={handleLogout}>
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </nav>
      </header>

      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  )
}

export default MainLayout
