import { describe, expect, it } from 'vitest'
import { aUtm, estadoMaquina, fueraDeFaena, posicionarMaquinas, puntoInterior } from './geo.js'

const cuadrado = (lon, lat, lado = 0.002) => ({
  type: 'Polygon',
  coordinates: [[[lon, lat], [lon + lado, lat], [lon + lado, lat + lado], [lon, lat + lado], [lon, lat]]],
})

const maquina = (cambios = {}) => ({
  idMaquina: 1,
  nombre: 'CF-01',
  estado: 'ACTIVA',
  operadorActual: null,
  idAreaActual: null,
  idZonaActual: null,
  ...cambios,
})

describe('aUtm', () => {
  it('convierte el rajo de Los Colorados a UTM 19S', () => {
    const utm = aUtm(-70.8085, -28.2999)
    expect(utm.zona).toBe(19)
    expect(utm.hemisferio).toBe('S')
    // Valores de referencia con precisión métrica
    expect(utm.este).toBeCloseTo(322662, -1)
    expect(utm.norte).toBeCloseTo(6868248, -1)
  })

  it('el meridiano central de la zona da 500 000 E', () => {
    expect(aUtm(-69, 0)).toMatchObject({ zona: 19, hemisferio: 'N', este: 500000, norte: 0 })
  })
})

describe('fueraDeFaena', () => {
  it('una geocerca sobre la mina está en la faena', () => {
    expect(fueraDeFaena(cuadrado(-70.81, -28.30))).toBe(false)
  })

  it('detecta polígonos lejos de la mina (p. ej. latitud con el signo invertido)', () => {
    expect(fueraDeFaena(cuadrado(-70.79, 28.52))).toBe(true)
  })

  it('sin polígono no se considera fuera', () => {
    expect(fueraDeFaena(null)).toBe(false)
  })
})

describe('estadoMaquina', () => {
  const sinAlertas = new Set()

  it.each([
    ['dada de baja', maquina({ estado: 'BAJA', operadorActual: 'Ana' }), 'fuera'],
    ['con turno en curso', maquina({ operadorActual: 'Ana' }), 'operando'],
    ['activa sin turno', maquina(), 'detenida'],
  ])('%s -> %s', (_caso, m, esperado) => {
    expect(estadoMaquina(m, sinAlertas)).toBe(esperado)
  })

  it('una alerta tiene prioridad sobre "operando"', () => {
    expect(estadoMaquina(maquina({ operadorActual: 'Ana' }), new Set([1]))).toBe('alerta')
  })

  it('una máquina dada de baja sigue "fuera" aunque tenga alerta', () => {
    expect(estadoMaquina(maquina({ estado: 'BAJA' }), new Set([1]))).toBe('fuera')
  })
})

describe('posicionarMaquinas', () => {
  const area = { idArea: 10, poligono: cuadrado(-70.81, -28.30, 0.01) }
  const zona = { idZona: 20, idArea: 10, poligono: cuadrado(-70.808, -28.298) }

  it('ubica una máquina en un punto dentro de la zona de su turno', () => {
    const [p] = posicionarMaquinas([maquina({ operadorActual: 'Ana', idAreaActual: 10, idZonaActual: 20 })], [area], [zona])
    expect(p.lngLat).toEqual(puntoInterior(zona.poligono))
    expect(p.indice).toBe(0)
  })

  it('sin zona usa el área', () => {
    const [p] = posicionarMaquinas([maquina({ operadorActual: 'Ana', idAreaActual: 10 })], [area], [zona])
    expect(p.lngLat).toEqual(puntoInterior(area.poligono))
  })

  it('no ubica máquinas sin turno en curso ni sin polígono', () => {
    const sinTurno = maquina({ idZonaActual: 20 })
    const sinPoligono = maquina({ idMaquina: 2, operadorActual: 'Luis', idAreaActual: 99 })
    expect(posicionarMaquinas([sinTurno, sinPoligono], [area], [zona])).toEqual([])
  })

  it('reparte varias máquinas de la misma zona con índices distintos', () => {
    const enZona = (idMaquina) => maquina({ idMaquina, operadorActual: 'Op', idAreaActual: 10, idZonaActual: 20 })
    const posiciones = posicionarMaquinas([enZona(1), enZona(2), enZona(3)], [area], [zona])
    expect(posiciones.map((p) => p.indice)).toEqual([0, 1, 2])
  })
})
