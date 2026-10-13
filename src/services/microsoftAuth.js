import { apiFetch } from './api.js'
import { AuthError } from './authService.js'
import { guardarSesion } from './session.js'

// App registrada en Microsoft Entra ID (multi-organización). El Client ID no es secreto
const CLIENT_ID = import.meta.env.VITE_AZURE_CLIENT_ID?.trim()

export const microsoftConfigurado = Boolean(CLIENT_ID)

const MENSAJES_ERROR = {
  DOMINIO_NO_PERMITIDO:
    'Solo pueden ingresar cuentas institucionales de CMP (@cmp.cl), IMOPAC (@imopac.cl) o la UCN (@ucn.cl, @alumnos.ucn.cl).',
  USUARIO_INACTIVO: 'Tu usuario está desactivado. Contacta a un administrador.',
  SIN_ACCESO_WEB: 'Tu usuario no tiene acceso al panel web.',
  CUENTA_YA_VINCULADA: 'Tu correo ya está asociado a otra cuenta de Microsoft. Contacta a un administrador.',
  MICROSOFT_NO_CONFIGURADO: 'El inicio de sesión con Microsoft aún no está disponible.',
  TOKEN_INVALIDO: 'No se pudo validar tu cuenta de Microsoft. Intenta nuevamente.',
}

// MSAL se descarga e inicializa al abrir el login, no al hacer clic: si el clic tuviera que esperar
// la descarga, el navegador podría bloquear la ventana emergente de Microsoft
let msalPromesa = null

export function prepararMicrosoft() {
  if (!microsoftConfigurado) return null
  msalPromesa ??= import('@azure/msal-browser').then(async ({ PublicClientApplication }) => {
    const msal = new PublicClientApplication({
      auth: {
        clientId: CLIENT_ID,
        // Cuentas de cualquier organización; el Backend acepta solo los dominios de CMP, IMOPAC y la UCN
        authority: 'https://login.microsoftonline.com/organizations',
        redirectUri: `${window.location.origin}/redirect.html`,
      },
      cache: { cacheLocation: 'sessionStorage' },
    })
    await msal.initialize()
    return msal
  })
  return msalPromesa
}

/**
 * Login con Microsoft: abre la ventana de Microsoft, envía el ID token a POST /auth/login/web y
 * guarda la sesión. Si la cuenta no existía, el Backend la registra como VISOR (nuevo: true).
 * Devuelve null si el usuario cerró la ventana sin terminar.
 */
export async function loginConMicrosoft() {
  if (!microsoftConfigurado) throw new AuthError(MENSAJES_ERROR.MICROSOFT_NO_CONFIGURADO)
  const msal = await prepararMicrosoft()

  let resultado
  try {
    resultado = await msal.loginPopup({ scopes: ['openid', 'profile', 'email'], prompt: 'select_account' })
  } catch (error) {
    if (error?.errorCode === 'user_cancelled') return null
    if (error?.errorCode === 'popup_window_error' || error?.errorCode === 'empty_window_error') {
      throw new AuthError('El navegador bloqueó la ventana de Microsoft. Permite las ventanas emergentes para este sitio.')
    }
    throw new AuthError('No se pudo iniciar sesión con Microsoft. Intenta nuevamente.')
  }

  let response
  try {
    response = await apiFetch('/auth/login/web', {
      method: 'POST',
      body: JSON.stringify({ entraIdToken: resultado.idToken }),
    })
  } catch {
    throw new AuthError('No se pudo conectar con el servidor. Revisa tu conexión e intenta nuevamente.')
  }
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new AuthError(MENSAJES_ERROR[data?.code] ?? 'El servidor no pudo procesar el inicio de sesión.')
  }

  const sesion = { accessToken: data.accessToken, rol: data.rol, email: data.email, nombre: data.nombre }
  guardarSesion(sesion)
  return { ...sesion, nuevo: data.nuevo }
}
