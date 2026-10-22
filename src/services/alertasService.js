import { apiJson } from './api.js'
import { suscribirSocket } from './socket.js'

// Alertas de turno del jefe de turno (GET /alertas), las mismas de la pestaña Alertas de la app móvil:
// - TURNO_EXTENDIDO: el turno llegó a las 10 h
// - JORNADA_EXTENDIDA: el operador sumó 10 h en una jornada de varios turnos
// - CIERRE_AUTOMATICO: el sistema cerró el turno a las 13 h (posible olvido de cierre)
// Los roles que pueden verlas están en flotaService (puedeVerAlertas)

/**
 * Una página de alertas: { alertas, hayMas, activas }. `activas` son los operadores con más de 10 h trabajadas
 * ahora mismo, sin importar el rango.
 * tipo: 'TODO' | 'EXTENDIDOS' | 'CIERRES_AUTOMATICOS'. rango: { desde, hasta } en ISO; hasta es exclusiva y null es
 * "hasta ahora". ultimo: la última alerta recibida (cursor fecha + id).
 */
export function listarAlertas(tipo, rango, ultimo) {
  const params = new URLSearchParams({ tipo, desde: rango.desde })
  if (rango.hasta) params.set('hasta', rango.hasta)
  if (ultimo) {
    params.set('antes', ultimo.fecha)
    params.set('antesId', ultimo.id)
  }
  return apiJson(`/alertas?${params}`)
}

// Solo el contador de activas (para la pestaña del header): la página más chica posible
export const obtenerAlertasActivas = async () => (await apiJson('/alertas?limite=1')).activas

// Si la alerta corresponde al filtro de tipo de la página
export const coincideTipo = (alerta, tipo) =>
  tipo === 'TODO' || (tipo === 'CIERRES_AUTOMATICOS') === (alerta.tipo === 'CIERRE_AUTOMATICO')

/**
 * Alertas nuevas en tiempo real (Socket.IO, namespace /alertas): `alRecibir` recibe { nuevas, activas } cada vez que
 * aparecen alertas o cambia el contador. `alReconectar` avisa cuando la conexión vuelve tras un corte (lo que llegó
 * mientras tanto se perdió). Devuelve la función para desconectarse.
 */
export const suscribirAlertas = ({ alRecibir, alReconectar }) =>
  suscribirSocket('/alertas', { alertas: alRecibir }, alReconectar)
