import { useSyncExternalStore } from 'react'

// Sesión del panel web. En localStorage queda solo lo que no sirve para autenticarse:
// { idUsuario, rol, email, nombre, refreshTokenExpiraEn }. El refresh token viaja en una cookie httpOnly que JavaScript
// no puede leer, y el access token (JWT, 1 h) vive solo en memoria: cada pestaña pide el suyo al abrirse (renovarSesion
// en api.js). Así un XSS no encuentra tokens que llevarse. El rol solo decide qué vistas mostrar; cada endpoint del
// Backend vuelve a validar los permisos con el JWT.
const STORAGE_KEY = 'cmp.sesion'
const listeners = new Set()

let accessToken = null

const payloadDe = (token) => {
  try {
    return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return null
  }
}

// Se renueva un poco antes de que venza, para que no expire en el camino
const MARGEN_RENOVACION_MS = 30 * 1000

export const getAccessToken = () => accessToken

// También true sin token (pestaña recién abierta o recargada): hay que pedirlo
export const accessTokenPorVencer = () => {
  const exp = payloadDe(accessToken)?.exp
  return typeof exp !== 'number' || exp * 1000 <= Date.now() + MARGEN_RENOVACION_MS
}

const leer = () => {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

// useSyncExternalStore exige un snapshot estable: se cachea por el texto guardado
let cacheRaw = null
let cacheSesion = null

export const getSesion = () => {
  const raw = leer()
  if (raw !== cacheRaw) {
    cacheRaw = raw
    try {
      cacheSesion = raw ? JSON.parse(raw) : null
    } catch {
      cacheSesion = null
    }
  }
  // Con el refresh token vencido ya no se puede renovar: la sesión quedó cerrada
  if (cacheSesion && !(Date.parse(cacheSesion.refreshTokenExpiraEn) > Date.now())) return null
  return cacheSesion
}

const notificar = () => listeners.forEach((listener) => listener())

/**
 * Sesión recién iniciada o renovada (respuesta del login o de /auth/refresh/web, más email y nombre): el access token
 * queda en memoria y el resto en localStorage. Una sesión guardada antes de la cookie traía también los tokens: al
 * renovarla se reescribe sin ellos
 */
export const guardarSesion = ({ accessToken: token, refreshTokenExpiraEn, rol, email, nombre }) => {
  accessToken = token
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ idUsuario: payloadDe(token)?.sub ?? null, rol, email, nombre, refreshTokenExpiraEn }),
    )
  } catch {
    // Sin localStorage la sesión no sobrevive a una recarga
  }
  notificar()
}

// Token nuevo tras renovar la sesión (el rol puede haber cambiado). Si mientras tanto se cerró, no la revive
export const actualizarTokens = ({ accessToken: token, refreshTokenExpiraEn, rol }) => {
  const sesion = getSesion()
  if (sesion) guardarSesion({ ...sesion, accessToken: token, refreshTokenExpiraEn, rol })
}

export const cerrarSesion = () => {
  accessToken = null
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nada que borrar
  }
  notificar()
}

export const suscribirSesion = (listener) => {
  listeners.add(listener)
  // Cerrar sesión en otra pestaña también la cierra aquí. Si allá se entró con otra cuenta, el token en memoria
  // es del usuario anterior: se descarta y la próxima petición pide uno nuevo con la cookie (ya de la cuenta nueva)
  const onStorage = (event) => {
    if (event.key !== STORAGE_KEY) return
    if (payloadDe(accessToken)?.sub !== idUsuarioSesion(getSesion())) accessToken = null
    listener()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

export function useSesion() {
  return useSyncExternalStore(suscribirSesion, getSesion)
}

export const esAdmin = (sesion) => sesion?.rol === 'ADMIN'

// id del usuario de la sesión, p. ej. para marcar "tú" en la lista de usuarios. Las sesiones guardadas antes de la
// cookie no lo traen: se lee del claim sub del JWT que guardaban
export const idUsuarioSesion = (sesion) => sesion?.idUsuario ?? payloadDe(sesion?.accessToken)?.sub ?? null

// Pantalla de inicio tras el login: el mapa de planta para todos los roles
export const rutaInicial = () => '/mapa'
