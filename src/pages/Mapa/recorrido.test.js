import { describe, expect, it } from 'vitest'
import { agregarAlRecorrido, distanciaRecorridoKm, geojsonRecorrido, inicioDelDia, SALTO_MS } from './recorrido.js'

const BASE = Date.parse('2026-11-12T11:00:00Z')
// Cada punto 30 s después del anterior, salvo que se indique otro desfase; avanza ~0,001° de longitud (~100 m)
const p = (segundos, i = segundos / 30) => ({
  fechaHora: new Date(BASE + segundos * 1000).toISOString(),
  latitud: -28.3,
  longitud: -70.81 + i * 0.001,
  velocidad: 10,
})
const tipos = (geojson) => geojson.features.map((f) => f.properties.tipo)

describe('geojsonRecorrido', () => {
  it('sin puntos no dibuja nada', () => {
    expect(geojsonRecorrido([]).features).toEqual([])
  })

  it('un solo punto: solo el inicio, sin línea', () => {
    expect(tipos(geojsonRecorrido([p(0)]))).toEqual(['punto', 'inicio'])
  })

  it('posiciones seguidas forman un solo tramo', () => {
    const geojson = geojsonRecorrido([p(0), p(30), p(60)])
    expect(tipos(geojson)).toEqual(['tramo', 'punto', 'punto', 'punto', 'inicio'])
    expect(geojson.features[0].geometry.coordinates).toHaveLength(3)
    expect(geojson.features.at(-1).geometry.coordinates).toEqual([-70.81, -28.3])
  })

  it('un hueco de más de SALTO_MS corta el tramo y queda como salto', () => {
    const despues = SALTO_MS / 1000 + 60
    const geojson = geojsonRecorrido([p(0), p(30), p(30 + despues, 2), p(60 + despues, 3)])
    expect(tipos(geojson).filter((t) => t !== 'punto')).toEqual(['tramo', 'salto', 'tramo', 'inicio'])
    expect(geojson.features[1].geometry.coordinates).toEqual([
      [-70.809, -28.3],
      [-70.808, -28.3],
    ])
  })

  it('cada punto lleva su hora y velocidad para el cursor', () => {
    const [, punto] = geojsonRecorrido([p(0), p(30)]).features
    expect(punto.properties).toEqual({ tipo: 'punto', fechaHora: p(0).fechaHora, velocidad: 10 })
  })
})

describe('distanciaRecorridoKm', () => {
  it('suma la distancia entre puntos consecutivos', () => {
    // 0,002° de longitud a -28,3° de latitud ≈ 196 m
    expect(distanciaRecorridoKm([p(0), p(30), p(60)])).toBeCloseTo(0.196, 2)
    expect(distanciaRecorridoKm([p(0)])).toBe(0)
    expect(distanciaRecorridoKm([])).toBe(0)
  })
})

describe('agregarAlRecorrido', () => {
  const abierto = { idMaquina: 4, desde: p(0).fechaHora, hasta: null, puntos: [p(0), p(30)] }
  const enVivo = (segundos, idMaquina = 4) => ({ ...p(segundos), idMaquina, rumbo: 90, bateria: 80 })

  it('agrega en orden las posiciones nuevas de su máquina, solo con los campos del recorrido', () => {
    const siguiente = agregarAlRecorrido(abierto, [enVivo(90), enVivo(60), enVivo(60, 9)])
    expect(siguiente.puntos.map((x) => x.fechaHora)).toEqual([p(0), p(30), p(60), p(90)].map((x) => x.fechaHora))
    expect(siguiente.puntos.at(-1)).toEqual(p(90))
  })

  it('ignora las repetidas o atrasadas y devuelve el mismo objeto si no hay nada nuevo', () => {
    expect(agregarAlRecorrido(abierto, [enVivo(30), enVivo(0)])).toBe(abierto)
    expect(agregarAlRecorrido(abierto, [enVivo(60, 9)])).toBe(abierto)
  })

  it('un recorrido cerrado (turno terminado o rango con fin) no cambia', () => {
    const cerrado = { ...abierto, hasta: p(30).fechaHora }
    expect(agregarAlRecorrido(cerrado, [enVivo(60)])).toBe(cerrado)
  })

  it('un recorrido abierto sin puntos acepta los posteriores a su inicio', () => {
    const vacio = { ...abierto, puntos: [] }
    expect(agregarAlRecorrido(vacio, [enVivo(60)]).puntos).toEqual([p(60)])
  })
})

describe('inicioDelDia', () => {
  it('es la medianoche local del mismo día', () => {
    const inicio = new Date(inicioDelDia(new Date(2026, 10, 12, 15, 30)))
    expect([inicio.getFullYear(), inicio.getMonth(), inicio.getDate(), inicio.getHours(), inicio.getMinutes()]).toEqual([2026, 10, 12, 0, 0])
  })
})
