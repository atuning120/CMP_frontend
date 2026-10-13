import { createBrowserRouter } from 'react-router-dom'
import MainLayout from './components/MainLayout/MainLayout.jsx'
import Home from './pages/Home/Home.jsx'
import Login from './pages/Login/Login.jsx'
import NotFound from './pages/NotFound/NotFound.jsx'

export const router = createBrowserRouter([
  // Fuera de MainLayout: el login no muestra la navegación
  { path: '/login', element: <Login /> },
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])
