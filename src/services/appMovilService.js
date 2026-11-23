import { API_URL, ApiError, apiFetch, apiJson } from './api.js'
import { ErrorParaUsuario, MENSAJE_SIN_CONEXION, mensajeDeRespuesta } from './errores.js'

/*
 * App móvil (APK de Android). La página /app-movil es pública: muestra el historial de versiones publicadas y las
 * descarga sin sesión. El Backend redirige cada descarga a un enlace firmado de Azure, así que los enlaces de aquí no
 * vencen. Solo el ADMIN publica, edita, retira y elimina versiones (/admin/app-movil).
 */

// Mismo tope que el Backend
export const TAMANO_MAXIMO_APK = 300 * 1024 * 1024
export const MAXIMO_NOTAS = 2000
export const FORMATO_VERSION = /^\d{1,4}\.\d{1,4}\.\d{1,4}$/

// Enlaces de descarga (públicos, el Backend responde con una redirección)
export const urlDescargaUltima = () => `${API_URL}/app-movil/descarga`
export const urlDescargaVersion = (idVersion) => `${API_URL}/app-movil/versiones/${idVersion}/descarga`

// GET sin sesión: la página pública también la abren quienes no tienen cuenta en el panel
async function apiPublico(path) {
  let response
  try {
    response = await apiFetch(path)
  } catch {
    throw new ApiError(MENSAJE_SIN_CONEXION, 0)
  }
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new ApiError(mensajeDeRespuesta(response.status, data), response.status, data?.code)
  return data
}

// [{ idVersion, version, notas, tamanoBytes, subidaEn }], de la más alta a la más baja
export const listarVersionesPublicas = () => apiPublico('/app-movil/versiones')

// Solo ADMIN: también las retiradas, con { publicada, subidaPor }
export const listarVersionesAdmin = () => apiJson('/app-movil/admin/versiones')

export const editarVersion = (idVersion, cambios) =>
  apiJson(`/app-movil/admin/versiones/${idVersion}`, { method: 'PATCH', body: JSON.stringify(cambios) })

export const eliminarVersion = (idVersion) => apiJson(`/app-movil/admin/versiones/${idVersion}`, { method: 'DELETE' })

// La APK va directo del navegador a Azure con el enlace que firma el Backend: ~80 MB no pasan por el servidor
const subirArchivo = (url, archivo, onProgreso) =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.setRequestHeader('x-ms-blob-type', 'BlockBlob')
    xhr.setRequestHeader('Content-Type', 'application/vnd.android.package-archive')
    // fetch no informa el avance de una subida: por eso XMLHttpRequest
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgreso?.(e.loaded / e.total)
    }
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new ErrorParaUsuario('El almacenamiento rechazó el archivo. Intenta nuevamente.'))
    // Sin respuesta legible: sin conexión, o la cuenta de Azure no tiene CORS para este sitio
    xhr.onerror = () => {
      console.warn('Subida de la APK fallida: revisa la conexión y el CORS de la cuenta de almacenamiento')
      reject(new ErrorParaUsuario('No se pudo subir el archivo. Revisa tu conexión e intenta nuevamente.'))
    }
    xhr.send(archivo)
  })

/**
 * Publica una versión en tres pasos: el Backend revisa versión y tamaño y entrega dónde subir, el navegador sube la APK
 * y el Backend la registra. onProgreso(0..1) informa la subida.
 */
export async function publicarVersion({ archivo, version, notas }, onProgreso) {
  const subida = await apiJson('/app-movil/admin/versiones/subida', {
    method: 'POST',
    body: JSON.stringify({ version, tamanoBytes: archivo.size }),
  })
  await subirArchivo(subida.urlSubida, archivo, onProgreso)
  return apiJson('/app-movil/admin/versiones', {
    method: 'POST',
    body: JSON.stringify({ version, notas, archivo: subida.archivo }),
  })
}

// Número sugerido para la próxima versión: la más alta con el último número + 1 ('1.4.2' -> '1.4.3')
export const siguienteVersion = (versiones) => {
  const alta = versiones?.[0]?.version
  if (!alta) return '1.0.0'
  const [mayor, menor, parche] = alta.split('.').map(Number)
  return `${mayor}.${menor}.${parche + 1}`
}

// 75_000_000 -> "71,5 MB"
export const formatearTamano = (bytes) =>
  `${(bytes / 1024 / 1024).toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} MB`

// '2026-11-18T09:30:00Z' -> '18 de noviembre de 2026'
export const formatearFecha = (iso) => new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })
