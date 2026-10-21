import { useSyncExternalStore } from 'react'

// Sesión del panel web: { accessToken, refreshToken, refreshTokenExpiraEn, rol, email }. El rol solo decide qué
// vistas mostrar; cada endpoint del Backend vuelve a validar los permisos con el JWT.
const STORAGE_KEY = 'cmp.sesion'
const listeners = new Set()

// Los JWT del Backend expiran (1 h por defecto); el refresh token (30 días) permite renovarlos sin volver al login.
// margenMs: se renueva un poco antes de que venza, para que no expire en el camino
const tokenVencido = (token, margenMs = 0) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now() + margenMs
  } catch {
    return true
  }
}

const MARGEN_RENOVACION_MS = 30 * 1000

export const accessTokenPorVencer = (sesion) => tokenVencido(sesion.accessToken, MARGEN_RENOVACION_MS)

// Sesiones guardadas antes del refresh token no lo traen: con el access token vencido quedan cerradas
const puedeRenovarse = (sesion) =>
  typeof sesion.refreshToken === 'string' && Date.parse(sesion.refreshTokenExpiraEn) > Date.now()

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
  if (cacheSesion && tokenVencido(cacheSesion.accessToken) && !puedeRenovarse(cacheSesion)) return null
  return cacheSesion
}

const notificar = () => listeners.forEach((listener) => listener())

export const guardarSesion = (sesion) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sesion))
  } catch {
    // Sin localStorage la sesión no sobrevive a una recarga
  }
  notificar()
}

// Tokens nuevos tras renovar la sesión (el rol puede haber cambiado). Si mientras tanto se cerró, no la revive
export const actualizarTokens = ({ accessToken, refreshToken, refreshTokenExpiraEn, rol }) => {
  const sesion = getSesion()
  if (sesion) guardarSesion({ ...sesion, accessToken, refreshToken, refreshTokenExpiraEn, rol })
}

export const cerrarSesion = () => {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nada que borrar
  }
  notificar()
}

export const suscribirSesion = (listener) => {
  listeners.add(listener)
  // Cerrar sesión en otra pestaña también la cierra aquí
  const onStorage = (event) => event.key === STORAGE_KEY && listener()
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

// id del usuario de la sesión (claim sub del JWT), p. ej. para marcar "tú" en la lista de usuarios
export const idUsuarioSesion = (sesion) => {
  try {
    return JSON.parse(atob(sesion.accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).sub ?? null
  } catch {
    return null
  }
}

// Pantalla de inicio tras el login: el mapa de planta para todos los roles
export const rutaInicial = () => '/mapa'
