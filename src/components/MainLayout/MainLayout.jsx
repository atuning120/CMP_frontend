import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { NavLink, Outlet, useMatch, useNavigate } from 'react-router-dom'
import cmpLogoDark from '../../assets/CMP_logo_modo_oscuro.png'
import geoPlantaLogo from '../../assets/logoGeoPlanta.png'
import { useAlertasEnVivo } from '../../hooks/alertasEnVivo.js'
import { useAlertasActivas } from '../../hooks/consultas.js'
import { puedeGestionarFlota, puedeVerAlertas } from '../../services/flotaService.js'
import { puedeVerHistorial } from '../../services/historialService.js'
import { puedeVerDashboards } from '../../services/dashboardsService.js'
import { salir } from '../../services/authService.js'
import { esAdmin, useSesion } from '../../services/session.js'
import AvisosAlertas from '../AvisosAlertas/AvisosAlertas.jsx'
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
  // Alertas en tiempo real para jefes de turno y administradores, en cualquier página del panel
  const conAlertas = puedeVerAlertas(sesion)
  const enAlertas = useMatch('/alertas') !== null
  const { avisos, descartarAviso } = useAlertasEnVivo(conAlertas, enAlertas)
  const activas = useAlertasActivas(conAlertas).data ?? 0

  const handleLogout = () => {
    salir()
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
          {puedeVerDashboards(sesion) && (
            <NavLink to="/dashboards" className={navLinkClass}>
              Dashboards
            </NavLink>
          )}
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
          {conAlertas && (
            <NavLink to="/alertas" className={navLinkClass}>
              Alertas
              {activas > 0 && (
                <span className={styles.badge} title={`${activas} alertas activas: operadores con más de 10 h trabajadas o máquinas detenidas por mantención o falla`}>
                  {activas}
                  <span className={styles.visuallyHidden}> activas</span>
                </span>
              )}
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

      {avisos.length > 0 && <AvisosAlertas avisos={avisos} onCerrar={descartarAviso} />}

      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  )
}

export default MainLayout
