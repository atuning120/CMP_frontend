import { apiJson } from './api.js'

// Historial del jefe de turno (GET /historial): acciones sobre la flota e inicios de turno de los
// operadores, del más reciente al más antiguo. Mismos roles que exige el Backend
export const ROLES_HISTORIAL = ['JEFE_TURNO', 'ADMIN']

export const puedeVerHistorial = (sesion) => ROLES_HISTORIAL.includes(sesion?.rol)

/**
 * Una página de eventos: { eventos, hayMas }.
 * tipo: 'TODO' | 'TURNOS' | 'FLOTA'. rango: { desde, hasta } en ISO; hasta es exclusiva y null es "hasta ahora".
 * ultimo: el último evento recibido (cursor fecha + id, para no perder eventos con la misma fecha).
 */
export function listarHistorial(tipo, rango, ultimo) {
  const params = new URLSearchParams({ tipo, desde: rango.desde })
  if (rango.hasta) params.set('hasta', rango.hasta)
  if (ultimo) {
    params.set('antes', ultimo.fecha)
    params.set('antesId', ultimo.id)
  }
  return apiJson(`/historial?${params}`)
}
