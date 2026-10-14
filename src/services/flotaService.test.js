import { afterEach, describe, expect, it, vi } from 'vitest'
import { obtenerMaquinasConAlerta, puedeGestionarFlota, puedeVerAlertas } from './flotaService.js'

afterEach(() => vi.unstubAllGlobals())

// Matriz de permisos del panel web: VISOR solo ve; JEFE_TURNO y ADMIN gestionan la flota y ven alertas
describe('permisos de flota por rol', () => {
  it.each([
    ['VISOR', false],
    ['JEFE_TURNO', true],
    ['ADMIN', true],
    ['OPERADOR', false],
  ])('%s gestiona la flota y ve alertas: %s', (rol, esperado) => {
    expect(puedeGestionarFlota({ rol })).toBe(esperado)
    expect(puedeVerAlertas({ rol })).toBe(esperado)
  })

  it('sin sesión no hay permisos', () => {
    expect(puedeGestionarFlota(null)).toBe(false)
    expect(puedeVerAlertas(undefined)).toBe(false)
  })
})

describe('obtenerMaquinasConAlerta', () => {
  it('un VISOR no hace la petición de alertas (evita un 403 en la consola)', async () => {
    const payload = Buffer.from(JSON.stringify({ sub: 5, rol: 'VISOR', exp: Math.floor(Date.now() / 1000) + 600 })).toString('base64url')
    const sesion = JSON.stringify({ accessToken: `x.${payload}.y`, rol: 'VISOR' })
    vi.stubGlobal('localStorage', { getItem: (k) => (k === 'cmp.sesion' ? sesion : null) })
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)

    expect(await obtenerMaquinasConAlerta()).toEqual(new Set())
    expect(fetch).not.toHaveBeenCalled()
  })
})
