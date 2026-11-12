import { distanciaKm } from './geo.js'

// Más que esto sin posiciones (la app y el LL301 mandan cada 30 s) = el GPS estuvo sin señal. Ese tramo se dibuja
// punteado: la recta entre los dos puntos no es el camino que hizo la máquina
export const SALTO_MS = 5 * 60 * 1000

const coordenada = (p) => [p.longitud, p.latitud]
const linea = (tipo, coordenadas) => ({ type: 'Feature', geometry: { type: 'LineString', coordinates: coordenadas }, properties: { tipo } })
const punto = (tipo, p) => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates: coordenada(p) },
  properties: { tipo, fechaHora: p.fechaHora, velocidad: p.velocidad },
})

/**
 * Recorrido como GeoJSON para una sola fuente del mapa (cada capa filtra por `tipo`):
 * - 'tramo': línea continua entre posiciones seguidas
 * - 'salto': recta entre dos posiciones separadas por más de SALTO_MS (sin señal)
 * - 'punto': cada posición, con su hora y velocidad (se ven al acercarse y al pasar el cursor)
 * - 'inicio': la primera posición (el final es la máquina misma)
 * puntos: [{ fechaHora (ISO), latitud, longitud, velocidad }] de la más antigua a la más nueva
 */
export function geojsonRecorrido(puntos) {
  const features = []
  let tramo = []
  const cerrarTramo = () => {
    if (tramo.length >= 2) features.push(linea('tramo', tramo))
    tramo = []
  }
  puntos.forEach((p, i) => {
    const anterior = puntos[i - 1]
    if (anterior && Date.parse(p.fechaHora) - Date.parse(anterior.fechaHora) > SALTO_MS) {
      cerrarTramo()
      features.push(linea('salto', [coordenada(anterior), coordenada(p)]))
    }
    tramo.push(coordenada(p))
  })
  cerrarTramo()
  puntos.forEach((p) => features.push(punto('punto', p)))
  if (puntos.length > 0) features.push(punto('inicio', puntos[0]))
  return { type: 'FeatureCollection', features }
}

// Distancia recorrida en km, sumando los tramos sin señal en línea recta (lo mínimo que tuvo que moverse)
export const distanciaRecorridoKm = (puntos) =>
  puntos.reduce((total, p, i) => (i === 0 ? 0 : total + distanciaKm(coordenada(puntos[i - 1]), coordenada(p))), 0)

/**
 * Suma a un recorrido abierto (hasta = null) las posiciones de su máquina que llegan por WebSocket. Las que ya están o
 * son anteriores al último punto se ignoran (una posición guardada sin señal llega tarde: aparece al recargar).
 * Devuelve el mismo objeto si nada cambió.
 */
export function agregarAlRecorrido(recorrido, posiciones) {
  if (!recorrido || recorrido.hasta !== null) return recorrido
  const ultimo = recorrido.puntos.at(-1)
  const desde = Date.parse(ultimo?.fechaHora ?? recorrido.desde)
  const nuevos = posiciones
    .filter((p) => p.idMaquina === recorrido.idMaquina && Date.parse(p.fechaHora) > desde)
    .sort((a, b) => Date.parse(a.fechaHora) - Date.parse(b.fechaHora))
    .map(({ fechaHora, latitud, longitud, velocidad }) => ({ fechaHora, latitud, longitud, velocidad }))
  if (nuevos.length === 0) return recorrido
  return { ...recorrido, puntos: [...recorrido.puntos, ...nuevos] }
}

// Medianoche de hoy en la hora local del navegador, en ISO (el inicio de "trayecto de hoy")
export const inicioDelDia = (ahora = new Date()) => {
  const dia = new Date(ahora)
  dia.setHours(0, 0, 0, 0)
  return dia.toISOString()
}
