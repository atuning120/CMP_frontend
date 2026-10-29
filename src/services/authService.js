import { apiFetchSesion } from './api.js'
import { cerrarSesion, getSesion, guardarSesion } from './session.js'
import { ErrorParaUsuario, MENSAJE_SIN_CONEXION } from './errores.js'

// Mensajes para el usuario según el código de error del Backend; nunca se muestra el texto crudo
const MENSAJES_ERROR = {
  DATOS_INCOMPLETOS: 'Ingresa tu correo corporativo y tu contraseña para continuar.',
  CREDENCIALES_INVALIDAS: 'Correo o contraseña incorrectos.',
  SIN_ACCESO_WEB: 'Tu usuario no tiene acceso al panel web.',
  DEMASIADOS_INTENTOS: 'Demasiados intentos fallidos. Espera unos minutos e intenta nuevamente.',
}

export class AuthError extends ErrorParaUsuario {}

/**
 * Login con email y contraseña (POST /auth/login/web/credenciales). Guarda la sesión y la
 * devuelve; lanza AuthError con un mensaje listo para mostrar.
 */
export async function loginConCredenciales(email, password) {
  let response
  try {
    response = await apiFetchSesion('/auth/login/web/credenciales', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim(), password }),
    })
  } catch {
    throw new AuthError(MENSAJE_SIN_CONEXION)
  }

  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new AuthError(
      MENSAJES_ERROR[data?.code] ??
        'El servidor no pudo procesar el inicio de sesión. Intenta nuevamente en unos minutos.',
    )
  }

  guardarSesion({ ...(await response.json()), email: email.trim() })
  return getSesion()
}

/**
 * Cierra la sesión en este navegador: el Backend revoca el refresh token de la cookie y la borra (POST /auth/logout).
 * No espera la respuesta: sin conexión la sesión igual se cierra aquí y el token vence solo.
 */
export function salir() {
  const sesion = getSesion()
  if (sesion) {
    // refreshToken: solo lo traen las sesiones guardadas antes de la cookie
    apiFetchSesion('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: sesion.refreshToken }),
      keepalive: true,
    }).catch(() => {})
  }
  cerrarSesion()
}
