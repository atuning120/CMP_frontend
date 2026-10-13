import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { rutaInicial, useSesion } from '../../services/session.js'

// Protege rutas: sin sesión manda al login; con `roles`, solo deja pasar a esos roles
function RequireAuth({ roles }) {
  const sesion = useSesion()
  const location = useLocation()

  if (!sesion) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (roles && !roles.includes(sesion.rol)) return <Navigate to={rutaInicial(sesion)} replace />
  return <Outlet />
}

export default RequireAuth
