import { apiJson } from './api.js'

// Dashboards de Metabase embebidos (GET /dashboards/:tipo): solo jefes de turno y administradores los ven y cargan el Excel
// del estado de pago (EP) del contratista; el VISOR no tiene acceso. Mismos roles que exige el Backend
export const ROLES_DASHBOARDS = ['ADMIN', 'JEFE_TURNO']
export const ROLES_CARGA_EP = ['ADMIN', 'JEFE_TURNO']

export const puedeVerDashboards = (sesion) => ROLES_DASHBOARDS.includes(sesion?.rol)
export const puedeCargarEstadoPago = (sesion) => ROLES_CARGA_EP.includes(sesion?.rol)

// El Excel puede pesar varios MB y el Backend lo lee entero
const TIMEOUT_CARGA_MS = 60000

const dosDigitos = (n) => String(n).padStart(2, '0')

// 'AAAA-MM' -> 'junio 2026'
export const nombrePeriodo = (periodo) => {
  const [anio, mes] = periodo.split('-').map(Number)
  return new Date(anio, mes - 1, 1).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
}

// 'AAAA-MM-DD' -> '25-05-2026'
export const fechaCorta = (fecha) => fecha.split('-').reverse().join('-')

/**
 * Rango que se propone para el EP de un mes: del 25 del mes anterior al 25 del mes (así venía el EP de junio 2026,
 * del 25-05 al 25-06). Se puede corregir en el formulario.
 */
export const rangoSugerido = (periodo) => {
  const [anio, mes] = periodo.split('-').map(Number)
  const anterior = new Date(anio, mes - 2, 1)
  return {
    desde: `${anterior.getFullYear()}-${dosDigitos(anterior.getMonth() + 1)}-25`,
    hasta: `${anio}-${dosDigitos(mes)}-25`,
  }
}

// Mes anterior al actual, el que se suele cargar: 'AAAA-MM'
export const periodoAnterior = (hoy = new Date()) => {
  const d = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
  return `${d.getFullYear()}-${dosDigitos(d.getMonth() + 1)}`
}

// Meses con EP cargado, del más reciente al más antiguo: [{ idCarga, periodo, fechaDesde, fechaHasta, archivo, filas, subidoPor, subidoEn }]
export const listarCargasEp = () => apiJson('/dashboards/cargas')

/**
 * URL firmada del dashboard para el <iframe>: { url, expiraEn, carga }. tipo: 'operacion' | 'estado-pago'
 * (este último con el período AAAA-MM de una carga). Vence en una hora.
 */
export const obtenerDashboard = (tipo, periodo) =>
  apiJson(`/dashboards/${tipo}${periodo ? `?${new URLSearchParams({ periodo })}` : ''}`)

// multipart/form-data: el navegador pone el Content-Type con su boundary
const formularioCarga = ({ periodo, fechaDesde, fechaHasta, archivo }, reemplazar) => {
  const datos = new FormData()
  datos.set('periodo', periodo)
  datos.set('fechaDesde', fechaDesde)
  datos.set('fechaHasta', fechaHasta)
  if (reemplazar) datos.set('reemplazar', 'true')
  datos.set('archivo', archivo)
  return datos
}

/**
 * Revisa el Excel sin guardarlo: { filasValidas, horas, equipos, actividadesSinArea, errores, totalErrores,
 * cargaExistente, puedeConfirmar, ... }
 */
export const previsualizarCargaEp = (carga) =>
  apiJson('/dashboards/cargas/previsualizar', { method: 'POST', body: formularioCarga(carga, false) }, TIMEOUT_CARGA_MS)

// Guarda el Excel (se vuelve a enviar el archivo). reemplazar: el mes ya tenía uno cargado
export const confirmarCargaEp = (carga, reemplazar) =>
  apiJson('/dashboards/cargas', { method: 'POST', body: formularioCarga(carga, reemplazar) }, TIMEOUT_CARGA_MS)

/**
 * URL del iframe con el tema de la web: Metabase acepta `theme=night` en el fragmento (#) de la URL firmada.
 */
export const urlConTema = (url, tema) => (tema === 'dark' ? `${url}${url.includes('#') ? '&' : '#'}theme=night` : url)
