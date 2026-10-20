import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import cmpLogoDark from '../../assets/CMP_logo_modo_oscuro.png'
import geoPlantaLogo from '../../assets/logoGeoPlanta.png'
import { puedeGestionarFlota } from '../../services/flotaService.js'
import { puedeVerHistorial } from '../../services/historialService.js'
import { cerrarSesion, esAdmin, useSesion } from '../../services/session.js'
import DialogoConfirmacion from '../DialogoConfirmacion/DialogoConfirmacion.jsx'
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
  const [confirmandoSalida, setConfirmandoSalida] = useState(false)

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
            <img src={geoPlantaLogo} alt="GeoPlanta" className={styles.productLogo} width="256" height="249" />
            <span className={styles.productText}>
              <span className={styles.productName}>GeoPlanta</span>
              <span className={styles.productSub}>Flota · Turnos · Geocercas / Mina Los Colorados</span>
            </span>
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
          {puedeVerHistorial(sesion) && (
            <NavLink to="/historial" className={navLinkClass}>
              Historial
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
          <button
            type="button"
            className={styles.logout}
            onClick={() => setConfirmandoSalida(true)}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            aria-haspopup="dialog"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {confirmandoSalida && (
        <DialogoConfirmacion
          titulo="¿Cerrar sesión?"
          mensaje="Tendrás que volver a iniciar sesión para usar el panel. Si estabas dibujando o editando una geocerca, ese cambio sin guardar se pierde."
          icono={<LogOut size={20} />}
          textoConfirmar="Cerrar sesión"
          onConfirmar={handleLogout}
          onCancelar={() => setConfirmandoSalida(false)}
        />
      )}

      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  )
}

export default MainLayout
