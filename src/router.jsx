import { createBrowserRouter, Navigate } from 'react-router-dom'
import SkeletonMapa from './components/SkeletonMapa/SkeletonMapa.jsx'
import MainLayout from './components/MainLayout/MainLayout.jsx'
import RequireAuth from './components/RequireAuth/RequireAuth.jsx'
import Admin from './pages/Admin/Admin.jsx'
import Dashboards from './pages/Dashboards/Dashboards.jsx'
import Alertas from './pages/Alertas/Alertas.jsx'
import ErrorPage from './pages/ErrorPage/ErrorPage.jsx'
import Flota from './pages/Flota/Flota.jsx'
import Historial from './pages/Historial/Historial.jsx'
import Login from './pages/Login/Login.jsx'
import NotFound from './pages/NotFound/NotFound.jsx'

// Tras un deploy, los chunks con el hash anterior ya no existen en el servidor: si una pestaña
// abierta antes del deploy pide uno, recarga una vez para traer el index.html nuevo
function importarConRecarga(importar) {
  return importar().then(
    (modulo) => {
      sessionStorage.removeItem('recargaPorChunk')
      return modulo
    },
    (error) => {
      // Ya se recargó y sigue fallando: no es un deploy, mostrar el error
      if (sessionStorage.getItem('recargaPorChunk')) throw error
      sessionStorage.setItem('recargaPorChunk', '1')
      window.location.reload()
      return new Promise(() => {})
    },
  )
}

export const router = createBrowserRouter([
  // Fuera de MainLayout: el login no muestra la navegación
  { path: '/login', element: <Login />, errorElement: <ErrorPage /> },
  {
    // Todo el panel requiere sesión
    element: <RequireAuth />,
    // Último recurso: errores del propio MainLayout o de RequireAuth, a pantalla completa
    errorElement: <ErrorPage />,
    children: [
      {
        path: '/',
        element: <MainLayout />,
        children: [
          {
            // Errores de las páginas: se muestran dentro del layout, con el menú visible
            errorElement: <ErrorPage />,
            children: [
              { index: true, element: <Navigate to="/mapa" replace /> },
              {
                path: 'mapa',
                // Carga diferida: MapLibre pesa ~1 MB y no debe sumarse al login
                lazy: () =>
                  importarConRecarga(() => import('./pages/Mapa/Mapa.jsx')).then((m) => ({ Component: m.default })),
                hydrateFallbackElement: <SkeletonMapa />,
              },
              {
                // Gestión de la flota, historial, alertas y dashboards: jefes de turno y administradores
                element: <RequireAuth roles={['JEFE_TURNO', 'ADMIN']} />,
                children: [
                  { path: 'dashboards', element: <Dashboards /> },
                  { path: 'flota', element: <Flota /> },
                  { path: 'historial', element: <Historial /> },
                  { path: 'alertas', element: <Alertas /> },
                ],
              },
              {
                element: <RequireAuth roles={['ADMIN']} />,
                children: [{ path: 'admin', element: <Admin /> }],
              },
              { path: '*', element: <NotFound /> },
            ],
          },
        ],
      },
    ],
  },
])
