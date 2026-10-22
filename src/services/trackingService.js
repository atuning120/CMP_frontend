import { apiJson } from './api.js'
import { suscribirSocket } from './socket.js'

/**
 * Última posición GPS de cada máquina en las últimas horas:
 * [{ idMaquina, fechaHora (ISO), latitud, longitud, velocidad, rumbo, bateria }]
 */
export const obtenerUltimasPosiciones = () => apiJson('/tracking/ultimas')

/**
 * Posiciones en tiempo real (Socket.IO, namespace /tracking). `alRecibir` recibe cada lote de posiciones nuevas y
 * `alReconectar` avisa cuando la conexión vuelve tras un corte. Devuelve la función para desconectarse.
 */
export const suscribirPosiciones = ({ alRecibir, alReconectar }) =>
  suscribirSocket('/tracking', { posiciones: alRecibir }, alReconectar)
