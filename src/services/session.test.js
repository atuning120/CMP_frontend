import { afterEach, describe, expect, it, vi } from 'vitest'
import { esAdmin, getSesion, idUsuarioSesion, rutaInicial } from './session.js'

// JWT de prueba (sin firma real: el Frontend solo lee el payload)
const jwt = (payload) => `x.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.y`
const ahora = () => Math.floor(Date.now() / 1000)

const conSesionGuardada = (sesion) => {
  const datos = { 'cmp.sesion': JSON.stringify(sesion) }
  vi.stubGlobal('localStorage', { getItem: (k) => datos[k] ?? null, setItem: vi.fn(), removeItem: vi.fn() })
}

afterEach(() => vi.unstubAllGlobals())

describe('getSesion', () => {
  it('devuelve la sesión guardada si el token sigue vigente', () => {
    const sesion = { accessToken: jwt({ sub: 7, rol: 'ADMIN', exp: ahora() + 600 }), rol: 'ADMIN', email: 'a@cmp.cl' }
    conSesionGuardada(sesion)
    expect(getSesion()).toEqual(sesion)
  })

  it('considera cerrada una sesión con el token vencido', () => {
    conSesionGuardada({ accessToken: jwt({ sub: 7, rol: 'ADMIN', exp: ahora() - 1 }), rol: 'ADMIN' })
    expect(getSesion()).toBeNull()
  })

  it('con el access token vencido sigue abierta mientras el refresh token sea válido', () => {
    const sesion = {
      accessToken: jwt({ sub: 7, rol: 'ADMIN', exp: ahora() - 1 }),
      refreshToken: 'r',
      refreshTokenExpiraEn: new Date(Date.now() + 60_000).toISOString(),
      rol: 'ADMIN',
    }
    conSesionGuardada(sesion)
    expect(getSesion()).toEqual(sesion)
  })

  it('con ambos tokens vencidos la sesión queda cerrada', () => {
    conSesionGuardada({
      accessToken: jwt({ sub: 7, rol: 'ADMIN', exp: ahora() - 1 }),
      refreshToken: 'r',
      refreshTokenExpiraEn: new Date(Date.now() - 1).toISOString(),
      rol: 'ADMIN',
    })
    expect(getSesion()).toBeNull()
  })

  it('un token ilegible cuenta como vencido', () => {
    conSesionGuardada({ accessToken: 'no-es-un-jwt', rol: 'ADMIN' })
    expect(getSesion()).toBeNull()
  })

  it('sin localStorage disponible no hay sesión (y no se cae)', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('bloqueado')
      },
    })
    expect(getSesion()).toBeNull()
  })
})

describe('helpers de sesión', () => {
  it('idUsuarioSesion lee el sub del JWT', () => {
    expect(idUsuarioSesion({ accessToken: jwt({ sub: 24 }) })).toBe(24)
    expect(idUsuarioSesion({ accessToken: 'roto' })).toBeNull()
    expect(idUsuarioSesion(null)).toBeNull()
  })

  it('esAdmin solo para ADMIN', () => {
    expect(esAdmin({ rol: 'ADMIN' })).toBe(true)
    expect(esAdmin({ rol: 'JEFE_TURNO' })).toBe(false)
    expect(esAdmin(null)).toBe(false)
  })

  it('todos los roles entran al mapa', () => {
    expect(rutaInicial()).toBe('/mapa')
  })
})
