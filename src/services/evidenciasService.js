import { apiArchivo } from './api.js'

// Una foto puede pesar varios MB y llegar por una conexión lenta
const TIMEOUT_FOTO_MS = 30000

const comoDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const lector = new FileReader()
    lector.onload = () => resolve(lector.result)
    lector.onerror = () => reject(lector.error)
    lector.readAsDataURL(blob)
  })

/**
 * Foto de una evidencia (GET /evidencias/:id/archivo), como data URL lista para <img src> y para descargar.
 * El Backend exige el token, así que no sirve apuntar un <img> directo a la URL. Solo jefe de turno y administrador
 * ven las de cualquier turno.
 */
export async function obtenerEvidencia(idEvidencia) {
  const { archivo } = await apiArchivo(`/evidencias/${encodeURIComponent(idEvidencia)}/archivo`, {}, TIMEOUT_FOTO_MS)
  return comoDataUrl(archivo)
}
