import { apiFetch } from './api.js'
import { guardarSesion } from './session.js'

// Mensajes para el usuario según el código de error del Backend; nunca se muestra el texto crudo
const MENSAJES_ERROR = {
  DATOS_INCOMPLETOS: 'Ingresa tu correo corporativo y tu contraseña para continuar.',
  CREDENCIALES_INVALIDAS: 'Correo o contraseña incorrectos.',
  SIN_ACCESO_WEB: 'Tu usuario no tiene acceso al panel web.',
}

export class AuthError extends Error {}

/**
 * Login con email y contraseña (POST /auth/login/web/credenciales). Guarda la sesión y la
 * devuelve; lanza AuthError con un mensaje listo para mostrar.
 */
export async function loginConCredenciales(email, password) {
  let response
  try {
    response = await apiFetch('/auth/login/web/credenciales', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim(), password }),
    })
  } catch {
    throw new AuthError('No se pudo conectar con el servidor. Revisa tu conexión e intenta nuevamente.')
  }

  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new AuthError(
      MENSAJES_ERROR[data?.code] ??
        'El servidor no pudo procesar el inicio de sesión. Intenta nuevamente en unos minutos.',
    )
  }

  const { accessToken, rol } = await response.json()
  const sesion = { accessToken, rol, email: email.trim() }
  guardarSesion(sesion)
  return sesion
}
