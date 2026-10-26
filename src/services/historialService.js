import { apiArchivo, apiJson } from './api.js'

// Historial del jefe de turno (GET /historial): acciones sobre la flota, inicios y cierres de turno (con su reporte),
// cambios de área/zona y novedades con fotos
// de los operadores, del más reciente al más antiguo. Mismos roles que exige el Backend
export const ROLES_HISTORIAL = ['JEFE_TURNO', 'ADMIN']

export const puedeVerHistorial = (sesion) => ROLES_HISTORIAL.includes(sesion?.rol)

/**
 * Una página de eventos: { eventos, hayMas }.
 * tipo: 'TODO' | 'TURNOS' | 'FLOTA'. rango: { desde, hasta } en ISO; hasta es exclusiva y null es "hasta ahora".
 * ultimo: el último evento recibido (cursor fecha + id, para no perder eventos con la misma fecha).
 * limite: eventos por página (el Backend usa 30 por defecto y acepta hasta 50).
 */
export function listarHistorial(tipo, rango, ultimo, limite) {
  const params = new URLSearchParams({ tipo, desde: rango.desde })
  if (rango.hasta) params.set('hasta', rango.hasta)
  if (limite) params.set('limite', limite)
  if (ultimo) {
    params.set('antes', ultimo.fecha)
    params.set('antesId', ultimo.id)
  }
  return apiJson(`/historial?${params}`)
}

// Un rango completo de 90 días puede tardar más que una página
const TIMEOUT_EXCEL_MS = 60000

/**
 * Excel del historial (GET /historial/excel): todo el rango y tipo de la pantalla, sin paginar, armado
 * por el Backend. Las fechas del archivo van en la zona horaria del navegador. Descarga el archivo.
 */
export async function descargarHistorialExcel(tipo, rango) {
  const params = new URLSearchParams({ tipo, desde: rango.desde })
  if (rango.hasta) params.set('hasta', rango.hasta)
  params.set('zonaHoraria', Intl.DateTimeFormat().resolvedOptions().timeZone)
  const { archivo, nombre } = await apiArchivo(`/historial/excel?${params}`, {}, TIMEOUT_EXCEL_MS)

  const enlace = document.createElement('a')
  enlace.href = URL.createObjectURL(archivo)
  enlace.download = nombre ?? `historial_${tipo.toLowerCase()}.xlsx`
  enlace.click()
  setTimeout(() => URL.revokeObjectURL(enlace.href), 1000)
}
