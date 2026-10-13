import { useSyncExternalStore } from 'react'

// Misma clave que el script de index.html que aplica el tema antes de pintar
const STORAGE_KEY = 'theme'
const systemDark = window.matchMedia('(prefers-color-scheme: dark)')
const listeners = new Set()

const readStored = () => {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

const applyTheme = (theme) => {
  document.documentElement.dataset.theme = theme
  listeners.forEach((listener) => listener())
}

// Mientras el usuario no elija un tema, se sigue el del sistema operativo
systemDark.addEventListener('change', (event) => {
  if (!readStored()) applyTheme(event.matches ? 'dark' : 'light')
})

const subscribe = (listener) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const getTheme = () =>
  document.documentElement.dataset.theme ?? (systemDark.matches ? 'dark' : 'light')

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getTheme)

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Sin localStorage la elección dura solo hasta recargar
    }
    applyTheme(next)
  }

  return { theme, toggleTheme }
}
