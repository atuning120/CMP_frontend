import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./api.js', () => ({ apiJson: vi.fn() }))

import { apiJson } from './api.js'
import { asignarGps, bateriaBaja, cambiosSugeridos, desvincularGps, gpsDeMaquina, haceCuanto, normalizarImei, sinReportar } from './gpsService.js'

const EN_CF33 = { idGps: 1, imei: '864032050668829', maquina: { idMaquina: 33, nombre: 'CF-33' } }
const LIBRE = { idGps: 2, imei: '352099001761481', maquina: null }
const JUSTIFICACION = { motivo: 'Reemplazo de máquina', observacion: null }

const ultimoEnvio = () => {
  const [ruta, { method, body }] = apiJson.mock.lastCall
  return { ruta, method, body: JSON.parse(body) }
}

beforeEach(() => apiJson.mockReset())

describe('normalizarImei', () => {
  it.each([
    ['864032050668829', '864032050668829'],
    [' 864032-050668 829 ', '864032050668829'],
    ['864032050668828', null],
    ['86403205066882', null],
    ['abc', null],
    ['', null],
  ])('%s -> %s', (valor, esperado) => expect(normalizarImei(valor)).toBe(esperado))
})

describe('asignación', () => {
  it('manda dónde se vio el GPS y cuál sale del destino', () => {
    asignarGps(EN_CF33, 23, LIBRE, JUSTIFICACION)
    expect(ultimoEnvio()).toEqual({
      ruta: '/gps/1/asignacion',
      method: 'POST',
      body: { idMaquina: 23, idMaquinaActual: 33, idGpsDesplazado: 2, ...JUSTIFICACION },
    })
  })

  it('un GPS sin máquina a una máquina sin GPS va con null explícito', () => {
    asignarGps(LIBRE, 23, null, JUSTIFICACION)
    expect(ultimoEnvio().body).toMatchObject({ idMaquinaActual: null, idGpsDesplazado: null })
  })

  it('desvincular manda la máquina en que se vio', () => {
    desvincularGps(EN_CF33, JUSTIFICACION)
    expect(ultimoEnvio()).toMatchObject({ ruta: '/gps/1/desvinculacion', body: { idMaquinaActual: 33 } })
  })

  it('encuentra el GPS de una máquina', () => {
    expect(gpsDeMaquina([LIBRE, EN_CF33], 33)).toBe(EN_CF33)
    expect(gpsDeMaquina([LIBRE, EN_CF33], 23)).toBeNull()
  })
})

describe('estado de los GPS', () => {
  const AHORA = Date.parse('2026-11-24T12:00:00Z')
  const hace = (horas) => new Date(AHORA - horas * 3_600_000).toISOString()
  const vinculado = (asignadoHace, posicionHace, bateria = 90) => ({
    ...EN_CF33,
    asignadoDesde: hace(asignadoHace),
    ultimaPosicion: posicionHace === null ? null : { fechaHora: hace(posicionHace), bateria },
  })

  it.each([
    ['reportó hace poco', vinculado(100, 1), false],
    ['durmió toda la noche', vinculado(100, 15), false],
    ['lleva más de un día', vinculado(100, 25), true],
    ['nunca reportó y lleva más de un día', vinculado(25, null), true],
    ['recién vinculado, sin posiciones', vinculado(1, null), false],
    ['recién cambiado de máquina, con posición antigua', vinculado(1, 60), false],
    ['sin máquina', { ...LIBRE, ultimaPosicion: null }, false],
  ])('sin reportar: %s', (_caso, gps, esperado) => expect(sinReportar(gps, AHORA)).toBe(esperado))

  it('la batería baja solo importa en un GPS vinculado', () => {
    expect(bateriaBaja(vinculado(1, 1, 20))).toBe(true)
    expect(bateriaBaja(vinculado(1, 1, 21))).toBe(false)
    expect(bateriaBaja(vinculado(1, 1, null))).toBe(false)
    expect(bateriaBaja({ ...LIBRE, ultimaPosicion: { fechaHora: hace(1), bateria: 5 } })).toBe(false)
  })

  it.each([
    [0, 'Ahora'],
    [0.5, 'Hace 30 min'],
    [15, 'Hace 15 h'],
    [30, 'Hace 1 día'],
    [72, 'Hace 3 días'],
  ])('hace %s h -> %s', (horas, esperado) => expect(haceCuanto(hace(horas), AHORA)).toBe(esperado))

  it('sugiere pasar el GPS de una máquina reemplazada a su respaldo, si este no tiene', () => {
    const entra = { idMaquina: 23, nombre: 'BD-23' }
    const flota = [{ idMaquina: 33, nombre: 'CF-33', respaldo: entra }, { ...entra, respaldo: null }]
    expect(cambiosSugeridos([EN_CF33, LIBRE], flota)).toEqual([{ gps: EN_CF33, sale: flota[0], entra }])
    expect(cambiosSugeridos([EN_CF33, { ...LIBRE, maquina: entra }], flota)).toEqual([])
  })
})
