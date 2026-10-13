import { createBrowserRouter } from 'react-router-dom'
import MainLayout from './components/MainLayout/MainLayout.jsx'
import RequireAuth from './components/RequireAuth/RequireAuth.jsx'
import Admin from './pages/Admin/Admin.jsx'
import Home from './pages/Home/Home.jsx'
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
          { index: true, element: <Home /> },
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
