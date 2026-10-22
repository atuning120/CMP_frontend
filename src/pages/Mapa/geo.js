import pointOnFeature from '@turf/point-on-feature'

// Centro del rajo de Mina Los Colorados (WGS84)
export const LOS_COLORADOS = [-70.8085, -28.2999]
// Límite de la faena: rectángulo en UTM 19S entre las esquinas suroeste y noreste de la mina
export const LIMITE_FAENA = { zona: 19, hemisferio: 'S', este: [318188, 326929], norte: [6865281, 6871216] }
// Más allá de esta distancia el polígono está mal ubicado (p. ej. latitud con el signo invertido):
// el mapa no vuela hasta él ni se edita su forma, se redibuja
const RADIO_MAL_UBICADO_KM = 15

const RAD = Math.PI / 180

/** Lon/lat WGS84 -> UTM (fórmulas de Snyder; error sub-métrico, suficiente para mostrar la posición). */
export function aUtm(lon, lat) {
  const a = 6378137
  const f = 1 / 298.257223563
  const k0 = 0.9996
  const e2 = f * (2 - f)
  const ep2 = e2 / (1 - e2)
  const zona = Math.floor((lon + 180) / 6) + 1
  const lon0 = ((zona - 1) * 6 - 180 + 3) * RAD
  const phi = lat * RAD
  const N = a / Math.sqrt(1 - e2 * Math.sin(phi) ** 2)
  const T = Math.tan(phi) ** 2
  const C = ep2 * Math.cos(phi) ** 2
  const A = Math.cos(phi) * (lon * RAD - lon0)
  const M =
    a *
    ((1 - e2 / 4 - (3 * e2 ** 2) / 64 - (5 * e2 ** 3) / 256) * phi -
      ((3 * e2) / 8 + (3 * e2 ** 2) / 32 + (45 * e2 ** 3) / 1024) * Math.sin(2 * phi) +
      ((15 * e2 ** 2) / 256 + (45 * e2 ** 3) / 1024) * Math.sin(4 * phi) -
      ((35 * e2 ** 3) / 3072) * Math.sin(6 * phi))
  const este = k0 * N * (A + ((1 - T + C) * A ** 3) / 6 + ((5 - 18 * T + T ** 2 + 72 * C - 58 * ep2) * A ** 5) / 120) + 500000
  let norte =
    k0 *
    (M +
      N *
        Math.tan(phi) *
        (A ** 2 / 2 + ((5 - T + 9 * C + 4 * C ** 2) * A ** 4) / 24 + ((61 - 58 * T + T ** 2 + 600 * C - 330 * ep2) * A ** 6) / 720))
  if (lat < 0) norte += 10000000
  return { zona, hemisferio: lat < 0 ? 'S' : 'N', este, norte }
}

const distanciaKm = ([lon1, lat1], [lon2, lat2]) => {
  const dLat = (lat2 - lat1) * RAD
  const dLon = (lon2 - lon1) * RAD
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.sin(dLon / 2) ** 2
  return 12742 * Math.asin(Math.sqrt(h))
}

// Punto garantizado dentro del polígono (el centroide puede caer fuera en formas cóncavas)
export const puntoInterior = (poligono) => pointOnFeature(poligono).geometry.coordinates

const dentroDeFaena = ([lon, lat]) => {
  const { zona, hemisferio, este, norte } = aUtm(lon, lat)
  const { este: [oeste, esteMax], norte: [sur, norteMax] } = LIMITE_FAENA
  return (
    zona === LIMITE_FAENA.zona &&
    hemisferio === LIMITE_FAENA.hemisferio &&
    este >= oeste &&
    este <= esteMax &&
    norte >= sur &&
    norte <= norteMax
  )
}

// Fuera de la faena si algún vértice queda fuera del límite (el rectángulo es convexo: con todos los
// vértices dentro, el polígono entero está dentro)
export const fueraDeFaena = (poligono) =>
  Boolean(poligono) && poligono.coordinates.some((anillo) => anillo.some((vertice) => !dentroDeFaena(vertice)))

export const malUbicado = (poligono) =>
  Boolean(poligono) && distanciaKm(puntoInterior(poligono), LOS_COLORADOS) > RADIO_MAL_UBICADO_KM

/**
 * Estado operativo de una máquina para el mapa y la lista:
 * - fuera: dada de baja;  - alerta: turno extendido en curso;
 * - operando: con turno en curso;  - detenida: activa pero sin turno.
 */
export function estadoMaquina(maquina, conAlerta) {
  if (maquina.estado === 'BAJA') return 'fuera'
  if (conAlerta.has(maquina.idMaquina)) return 'alerta'
  if (maquina.operadorActual) return 'operando'
  return 'detenida'
}

export const ETIQUETA_ESTADO = {
  operando: 'Operando',
  alerta: 'Alerta',
  detenida: 'Sin turno',
  fuera: 'Fuera de servicio',
}

// Una posición GPS más antigua que esto ya no dice dónde está la máquina (la app y el LL301 mandan cada 30 s)
export const GPS_VIGENTE_MS = 15 * 60 * 1000

export const gpsVigente = (posicion, ahora) =>
  Boolean(posicion) && ahora - Date.parse(posicion.fechaHora) <= GPS_VIGENTE_MS

/**
 * Posición de cada máquina en el mapa. Con una posición GPS reciente va en ese punto (tenga o no turno).
 * Si no, se ubica en un punto interior de la zona (o del área) de su turno en curso; sin turno o sin
 * polígono, no aparece en el mapa.
 * gps: Map idMaquina -> { fechaHora, latitud, longitud, velocidad, ... }
 */
export function posicionarMaquinas(maquinas, areas, zonas, gps = new Map(), ahora = Date.now()) {
  const poligonoZona = new Map(zonas.map((z) => [z.idZona, z.poligono]))
  const poligonoArea = new Map(areas.map((a) => [a.idArea, a.poligono]))
  const puntos = new Map()
  return maquinas.flatMap((m) => {
    const posicion = gps.get(m.idMaquina)
    if (gpsVigente(posicion, ahora)) {
      return [{ maquina: m, lngLat: [posicion.longitud, posicion.latitud], indice: 0, gps: posicion }]
    }
    const poligono = poligonoZona.get(m.idZonaActual) ?? poligonoArea.get(m.idAreaActual)
    if (!m.operadorActual || !poligono) return []
    const clave = m.idZonaActual ? `z${m.idZonaActual}` : `a${m.idAreaActual}`
    if (!puntos.has(clave)) puntos.set(clave, { punto: puntoInterior(poligono), cantidad: 0 })
    const grupo = puntos.get(clave)
    // Varias máquinas en la misma zona se reparten alrededor del punto para no taparse
    const indice = grupo.cantidad++
    return [{ maquina: m, lngLat: grupo.punto, indice, gps: null }]
  })
}

/**
 * Agrega posiciones nuevas al mapa idMaquina -> posición, quedándose con la más reciente de cada máquina
 * (una posición guardada sin señal puede llegar después de otra más nueva). Devuelve el mismo Map si nada cambió.
 */
export function actualizarGps(gps, posiciones) {
  let siguiente = gps
  for (const p of posiciones) {
    const actual = siguiente.get(p.idMaquina)
    if (actual && Date.parse(actual.fechaHora) >= Date.parse(p.fechaHora)) continue
    if (siguiente === gps) siguiente = new Map(gps)
    siguiente.set(p.idMaquina, p)
  }
  return siguiente
}
