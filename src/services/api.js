import { cerrarSesion, getSesion } from './session.js'

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

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message)
    this.status = status
    this.code = code
  }
}

/**
 * Llamada autenticada que devuelve el JSON (o null si no hay cuerpo). Si el token ya no sirve (401)
 * cierra la sesión, y RequireAuth lleva al login. Lanza ApiError con el mensaje del Backend.
 */
export async function apiJson(path, init = {}) {
  const sesion = getSesion()
  let response
  try {
    response = await apiFetch(path, {
      ...init,
      headers: { ...(sesion ? { Authorization: `Bearer ${sesion.accessToken}` } : {}), ...init.headers },
    })
  } catch {
    throw new ApiError('No se pudo conectar con el servidor. Revisa tu conexión e intenta nuevamente.', 0)
  }

  if (response.status === 401) {
    cerrarSesion()
    throw new ApiError('Tu sesión expiró. Vuelve a iniciar sesión.', 401)
  }
  const data = response.status === 204 ? null : await response.json().catch(() => null)
  if (!response.ok) {
    throw new ApiError(data?.message ?? 'El servidor no pudo procesar la solicitud.', response.status, data?.code)
  }
  return data
}
