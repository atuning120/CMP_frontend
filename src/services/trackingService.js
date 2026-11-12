import { apiJson } from './api.js'
import { suscribirSocket } from './socket.js'

/**
 * Última posición GPS de cada máquina en las últimas horas:
 * [{ idMaquina, fechaHora (ISO), latitud, longitud, velocidad, rumbo, bateria }]
 */
export const obtenerUltimasPosiciones = () => apiJson('/tracking/ultimas')

/**
 * Recorrido GPS de una máquina, de la posición más antigua a la más nueva:
 * { idMaquina, desde, hasta (null = hasta ahora), puntos: [{ fechaHora, latitud, longitud, velocidad }], truncado }
 */
// Durante un turno (en curso: hasta ahora)
export const obtenerRecorridoTurno = (idTurno) => apiJson(`/tracking/turnos/${idTurno}/recorrido`)

// Desde una fecha (ISO) hasta ahora; el Backend acepta como máximo 48 h
export const obtenerRecorridoMaquina = (idMaquina, desde) =>
  apiJson(`/tracking/maquinas/${idMaquina}/recorrido?${new URLSearchParams({ desde })}`)

/**
 * Posiciones en tiempo real (Socket.IO, namespace /tracking). `alRecibir` recibe cada lote de posiciones nuevas y
 * `alReconectar` avisa cuando la conexión vuelve tras un corte. Devuelve la función para desconectarse.
 */
export const suscribirPosiciones = ({ alRecibir, alReconectar }) =>
  suscribirSocket('/tracking', { posiciones: alRecibir }, alReconectar)
