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
