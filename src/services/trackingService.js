import { io } from 'socket.io-client'
import { API_URL, apiJson, renovarSesion } from './api.js'
import { getSesion } from './session.js'

// Si el Backend rechaza la conexión, se reintenta tras esta espera (después de intentar renovar la sesión)
const ESPERA_RECONEXION_MS = 5000

/**
 * Última posición GPS de cada máquina en las últimas horas:
 * [{ idMaquina, fechaHora (ISO), latitud, longitud, velocidad, rumbo, bateria }]
 */
export const obtenerUltimasPosiciones = () => apiJson('/tracking/ultimas')

/**
 * Posiciones en tiempo real (Socket.IO, namespace /tracking). `alRecibir` recibe cada lote de posiciones nuevas y
 * `alReconectar` avisa cuando la conexión vuelve tras un corte, para recuperar lo que llegó mientras tanto.
 * El JWT va en el handshake; cuando vence, el Backend corta y se reconecta con el token renovado.
 * Devuelve la función para desconectarse.
 */
export function suscribirPosiciones({ alRecibir, alReconectar }) {
  const socket = io(`${API_URL}/tracking`, {
    // Función: en cada (re)conexión se manda el token vigente, no el del primer intento
    auth: (cb) => cb({ token: getSesion()?.accessToken }),
  })
  let cerrado = false
  let temporizador = null
  let primeraConexion = true

  // Rechazada por el Backend (token vencido) o cortada por él: Socket.IO no reintenta solo en esos casos
  const reconectar = () => {
    if (cerrado || temporizador) return
    temporizador = setTimeout(async () => {
      temporizador = null
      if (cerrado) return
      const renovada = await renovarSesion().catch(() => true)
      if (renovada && !cerrado) socket.connect()
    }, ESPERA_RECONEXION_MS)
  }

  socket.on('posiciones', alRecibir)
  socket.on('connect', () => {
    if (!primeraConexion) alReconectar?.()
    primeraConexion = false
  })
  socket.on('connect_error', () => {
    if (!socket.active) reconectar()
  })
  socket.on('disconnect', (motivo) => {
    if (motivo === 'io server disconnect') reconectar()
  })

  return () => {
    cerrado = true
    clearTimeout(temporizador)
    socket.disconnect()
  }
}
