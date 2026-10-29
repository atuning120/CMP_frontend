import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  confirmarCargaEp,
  fechaCorta,
  periodoAnterior,
  puedeCargarEstadoPago,
  puedeVerDashboards,
  rangoSugerido,
  urlConTema,
} from './dashboardsService.js'

afterEach(() => vi.unstubAllGlobals())

// Solo jefe de turno y administrador ven los dashboards y cargan el Excel
describe('permisos de dashboards por rol', () => {
  it.each([
    ['VISOR', false, false],
    ['JEFE_TURNO', true, true],
    ['ADMIN', true, true],
    ['OPERADOR', false, false],
  ])('%s ve: %s, carga: %s', (rol, ve, carga) => {
    expect(puedeVerDashboards({ rol })).toBe(ve)
    expect(puedeCargarEstadoPago({ rol })).toBe(carga)
  })
})

describe('fechas del estado de pago', () => {
  it('propone del 25 del mes anterior al 25 del mes, también en enero', () => {
    expect(rangoSugerido('2026-06')).toEqual({ desde: '2026-05-25', hasta: '2026-06-25' })
    expect(rangoSugerido('2026-01')).toEqual({ desde: '2025-12-25', hasta: '2026-01-25' })
  })

  it('el período que se suele cargar es el mes anterior', () => {
    expect(periodoAnterior(new Date(2026, 9, 28))).toBe('2026-09')
    expect(periodoAnterior(new Date(2026, 0, 5))).toBe('2025-12')
  })

  it('muestra las fechas como DD-MM-AAAA', () => {
    expect(fechaCorta('2026-05-25')).toBe('25-05-2026')
  })
})

describe('urlConTema', () => {
  it('agrega theme=transparent al fragmento', () => {
    const url = 'https://mb/embed/dashboard/tok#bordered=false&titled=false'
    expect(urlConTema(url)).toBe(`${url}&theme=transparent`)
    expect(urlConTema('https://mb/embed/dashboard/tok')).toBe('https://mb/embed/dashboard/tok#theme=transparent')
  })
})

describe('confirmarCargaEp', () => {
  it('envía el Excel como multipart, con reemplazar solo si se pidió', async () => {
    const payload = Buffer.from(JSON.stringify({ sub: 5, rol: 'ADMIN', exp: Math.floor(Date.now() / 1000) + 600 })).toString('base64url')
    const sesion = JSON.stringify({ accessToken: `x.${payload}.y`, rol: 'ADMIN' })
    vi.stubGlobal('localStorage', { getItem: (k) => (k === 'cmp.sesion' ? sesion : null) })
    const fetch = vi.fn(async () => new Response(JSON.stringify({ idCarga: 1 }), { status: 201 }))
    vi.stubGlobal('fetch', fetch)

    const archivo = new File(['PK'], 'EP.xlsx')
    const carga = { periodo: '2026-06', fechaDesde: '2026-05-25', fechaHasta: '2026-06-25', archivo }
    await confirmarCargaEp(carga, true)

    const [url, init] = fetch.mock.calls[0]
    expect(url).toMatch(/\/dashboards\/cargas$/)
    expect(init.method).toBe('POST')
    // Sin Content-Type propio: lo pone el navegador con el boundary del multipart
    expect(init.headers['Content-Type']).toBeUndefined()
    expect(Object.fromEntries(init.body.entries())).toEqual({ ...carga, archivo: expect.any(File), reemplazar: 'true' })

    await confirmarCargaEp(carga, false)
    expect(fetch.mock.calls[1][1].body.has('reemplazar')).toBe(false)
  })
})
