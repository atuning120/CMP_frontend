// Tras un deploy, los chunks con el hash anterior ya no existen en el servidor: si una pestaña
// abierta antes del deploy pide uno, recarga una vez para traer el index.html nuevo
export function importarConRecarga(importar) {
  return importar().then(
    (modulo) => {
      sessionStorage.removeItem('recargaPorChunk')
      return modulo
    },
    (error) => {
      // Ya se recargó y sigue fallando: no es un deploy, mostrar el error
      if (sessionStorage.getItem('recargaPorChunk')) throw error
      sessionStorage.setItem('recargaPorChunk', '1')
      window.location.reload()
      return new Promise(() => {})
    },
  )
}
