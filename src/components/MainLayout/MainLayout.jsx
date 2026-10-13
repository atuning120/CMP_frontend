import { LogOut } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import cmpLogoDark from '../../assets/CMP_logo_modo_oscuro.png'
import { puedeGestionarFlota } from '../../services/flotaService.js'
import { cerrarSesion, esAdmin, useSesion } from '../../services/session.js'
import ThemeToggle from '../ThemeToggle/ThemeToggle.jsx'
import styles from './MainLayout.module.css'

const ROL_LABEL = {
  ADMIN: 'Administrador',
  JEFE_TURNO: 'Jefe de turno',
  VISOR: 'Visor',
}

const navLinkClass = ({ isActive }) => (isActive ? `${styles.link} ${styles.active}` : styles.link)

// Iniciales para el avatar: "ana.rojas@cmp.cl" -> "AR"
const iniciales = (email = '') =>
  email
    .split('@')[0]
    .split(/[._-]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')

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
        <div className={styles.brand}>
          <img src={cmpLogoDark} alt="CMP" className={styles.logo} />
          <span className={styles.product}>
            <span className={styles.productName}>Motor Maps</span>
            <span className={styles.productSub}>Monitoreo de flota · Mina Los Colorados</span>
          </span>
        </div>

        <nav className={styles.nav}>
          <NavLink to="/mapa" className={navLinkClass}>
            Mapa
          </NavLink>
          {puedeGestionarFlota(sesion) && (
            <NavLink to="/flota" className={navLinkClass}>
              Flota
            </NavLink>
          )}
          {esAdmin(sesion) && (
            <NavLink to="/admin" className={navLinkClass}>
              Administración
            </NavLink>
          )}
        </nav>

        <div className={styles.cuenta}>
          <ThemeToggle variante="marca" />
          <span className={styles.user}>
            <span className={styles.avatar} aria-hidden="true">
              {iniciales(sesion?.email)}
            </span>
            <span className={styles.userText}>
              <span className={styles.userEmail}>{sesion?.email}</span>
              <span className={styles.userRole}>{ROL_LABEL[sesion?.rol] ?? sesion?.rol}</span>
            </span>
          </span>
          <button type="button" className={styles.logout} onClick={handleLogout} aria-label="Cerrar sesión" title="Cerrar sesión">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  )
}

export default MainLayout
