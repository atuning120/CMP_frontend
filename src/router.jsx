import { createBrowserRouter, Navigate } from 'react-router-dom'
import Cargando from './components/Cargando/Cargando.jsx'
import MainLayout from './components/MainLayout/MainLayout.jsx'
import RequireAuth from './components/RequireAuth/RequireAuth.jsx'
import Admin from './pages/Admin/Admin.jsx'
import Login from './pages/Login/Login.jsx'
import NotFound from './pages/NotFound/NotFound.jsx'

export const router = createBrowserRouter([
  // Fuera de MainLayout: el login no muestra la navegación
  { path: '/login', element: <Login /> },
  {
    // Todo el panel requiere sesión
    element: <RequireAuth />,
    children: [
      {
        path: '/',
        element: <MainLayout />,
        children: [
          { index: true, element: <Navigate to="/mapa" replace /> },
          {
            path: 'mapa',
            // Carga diferida: MapLibre pesa ~1 MB y no debe sumarse al login
            lazy: () => import('./pages/Mapa/Mapa.jsx').then((m) => ({ Component: m.default })),
            hydrateFallbackElement: <Cargando texto="Cargando mapa…" />,
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
])
