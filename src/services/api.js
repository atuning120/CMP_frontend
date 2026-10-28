import { accessTokenPorVencer, actualizarTokens, cerrarSesion, getSesion } from './session.js'
import { ErrorParaUsuario, MENSAJE_SIN_CONEXION, mensajeDeRespuesta } from './errores.js'

// URL del Backend desde las variables de entorno de Vite (gitignoradas):
// .env.development para `pnpm dev` (Backend local) y .env.production para `pnpm build` (Azure).
// Vite incrusta el valor en el bundle al compilar; no es un secreto.
const URL_CONFIGURADA = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, '')

if (!URL_CONFIGURADA) {
  console.error('Falta VITE_API_URL: define la URL del Backend en .env.development o .env.production')
}

export const API_URL = URL_CONFIGURADA ?? ''

const TIMEOUT_MS = 15000

/**
 * fetch contra el Backend con timeout. Los cuerpos string se envían como JSON.
 */
export async function apiFetch(path, init = {}, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(`${API_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        ...(typeof init.body === 'string' ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    })
  } finally {
    clearTimeout(timer)
  }
}

// Su mensaje ya está traducido para el usuario (ver mensajeDeRespuesta)
export class ApiError extends ErrorParaUsuario {
  constructor(message, status, code) {
    super(message)
    this.status = status
    this.code = code
  }
}

const errorConexion = () => new ApiError(MENSAJE_SIN_CONEXION, 0)

const sesionExpirada = () => {
  cerrarSesion()
  return new ApiError('Tu sesión expiró. Vuelve a iniciar sesión.', 401)
}

// true si se renovó; false si el Backend ya no acepta el refresh token (vencido, revocado o sin acceso web)
async function renovar() {
  const refreshToken = getSesion()?.refreshToken
  if (!refreshToken) return false
  let response
  try {
    response = await apiFetch('/auth/refresh/web', { method: 'POST', body: JSON.stringify({ refreshToken }) })
  } catch {
    throw errorConexion()
  }
  if (response.status === 401) return false
  if (!response.ok) throw new ApiError(mensajeDeRespuesta(response.status, null), response.status)
  actualizarTokens(await response.json())
  return true
}

// Una sola renovación a la vez: las peticiones que encuentran el token vencido esperan la misma.
// El refresh token rota en cada uso, así que dos renovaciones en paralelo gastarían el mismo
let renovacionEnCurso = null
export function renovarSesion() {
  renovacionEnCurso ??= renovar().finally(() => {
    renovacionEnCurso = null
  })
  return renovacionEnCurso
}

async function llamar(path, init, timeoutMs, accessToken) {
  try {
    return await apiFetch(
      path,
      { ...init, headers: { ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), ...init.headers } },
      timeoutMs,
    )
  } catch {
    throw errorConexion()
  }
}

/**
 * Llamada autenticada que devuelve la respuesta ya validada. Con el access token vencido (o rechazado con 401)
 * renueva la sesión y reintenta una vez; si ya no se puede renovar cierra la sesión, y RequireAuth lleva al login.
 * Lanza ApiError con un mensaje para el usuario (el del Backend solo si es un error de negocio).
 */
async function apiAutenticado(path, init, timeoutMs) {
  const sesion = getSesion()
  if (sesion?.refreshToken && accessTokenPorVencer(sesion) && !(await renovarSesion())) throw sesionExpirada()

  const tokenUsado = getSesion()?.accessToken
  let response = await llamar(path, init, timeoutMs, tokenUsado)
  if (response.status === 401) {
    // Otra pestaña o petición pudo renovarla mientras tanto: entonces basta reintentar con el token nuevo
    const renovada = getSesion()?.accessToken !== tokenUsado || (await renovarSesion())
    if (!renovada) throw sesionExpirada()
    response = await llamar(path, init, timeoutMs, getSesion()?.accessToken)
    if (response.status === 401) throw sesionExpirada()
  }
  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new ApiError(mensajeDeRespuesta(response.status, data), response.status, data?.code)
  }
  return response
}

// El JSON de la respuesta (o null si no hay cuerpo)
export async function apiJson(path, init = {}, timeoutMs = TIMEOUT_MS) {
  const response = await apiAutenticado(path, init, timeoutMs)
  return response.status === 204 ? null : await response.json().catch(() => null)
}

// Un archivo que arma el Backend, como el Excel del historial: { archivo (Blob), nombre (de Content-Disposition o null) }
export async function apiArchivo(path, init = {}, timeoutMs = TIMEOUT_MS) {
  const response = await apiAutenticado(path, init, timeoutMs)
  const nombre = response.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1] ?? null
  return { archivo: await response.blob(), nombre }
}
