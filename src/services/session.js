import { useSyncExternalStore } from 'react'

// Sesión del panel web: { accessToken, rol, email }. El rol solo decide qué vistas mostrar;
// cada endpoint del Backend vuelve a validar los permisos con el JWT.
const STORAGE_KEY = 'cmp.sesion'
const listeners = new Set()

// Los JWT del Backend expiran (1 h por defecto) y el panel web aún no tiene refresh token
const tokenVencido = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now()
  } catch {
    return true
  }
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
  if (cacheSesion && tokenVencido(cacheSesion.accessToken)) return null
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

export const cerrarSesion = () => {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nada que borrar
  }
  notificar()
}

const subscribe = (listener) => {
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
  return useSyncExternalStore(subscribe, getSesion)
}

export const esAdmin = (sesion) => sesion?.rol === 'ADMIN'

// Pantalla de inicio tras el login: el mapa de planta para todos los roles
export const rutaInicial = () => '/mapa'
