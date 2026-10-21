import { QueryClient } from '@tanstack/react-query'
import { getSesion, idUsuarioSesion, suscribirSesion } from './session.js'

// Caché en memoria de las respuestas del Backend (no se guarda en el navegador): al volver a una página se muestra lo
// último recibido y se actualiza en segundo plano
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Durante 30 s lo recibido se da por vigente: navegar entre páginas no repite las peticiones
      staleTime: 30_000,
      // Solo un corte de conexión se reintenta (una vez); un error del Backend se muestra de inmediato
      retry: (fallos, error) => error?.status === 0 && fallos < 1,
    },
  },
})

// Los datos son de quien inició sesión: al cerrarla (aquí o en otra pestaña) o entrar con otra cuenta se descartan
let usuario = idUsuarioSesion(getSesion())
suscribirSesion(() => {
  const actual = idUsuarioSesion(getSesion())
  if (actual === usuario) return
  usuario = actual
  queryClient.clear()
})
