import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  accessTokenPorVencer,
  actualizarTokens,
  cerrarSesion,
  esAdmin,
  getAccessToken,
  getSesion,
  guardarSesion,
  idUsuarioSesion,
  rutaInicial,
} from './session.js'

// JWT de prueba (sin firma real: el Frontend solo lee el payload)
const jwt = (payload) => `x.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.y`
const ahora = () => Math.floor(Date.now() / 1000)
const enUnDia = () => new Date(Date.now() + 86_400_000).toISOString()

let datos
const conLocalStorage = (inicial = {}) => {
  datos = { ...inicial }
  vi.stubGlobal('localStorage', {
    getItem: (k) => datos[k] ?? null,
    setItem: (k, v) => {
      datos[k] = v
    },
    removeItem: (k) => {
      delete datos[k]
    },
  })
}
const conSesionGuardada = (sesion) => conLocalStorage({ 'cmp.sesion': JSON.stringify(sesion) })

beforeEach(() => {
  conLocalStorage()
  cerrarSesion()
})

afterEach(() => vi.unstubAllGlobals())

describe('getSesion', () => {
  it('devuelve la sesión guardada mientras el refresh token sea válido', () => {
    const sesion = { idUsuario: 7, rol: 'ADMIN', email: 'a@cmp.cl', refreshTokenExpiraEn: enUnDia() }
    conSesionGuardada(sesion)
    expect(getSesion()).toEqual(sesion)
  })

  it('con el refresh token vencido la sesión queda cerrada', () => {
    conSesionGuardada({ idUsuario: 7, rol: 'ADMIN', refreshTokenExpiraEn: new Date(Date.now() - 1).toISOString() })
    expect(getSesion()).toBeNull()
  })

  it('una sesión sin vencimiento del refresh token cuenta como cerrada', () => {
    conSesionGuardada({ accessToken: jwt({ sub: 7, exp: ahora() + 600 }), rol: 'ADMIN' })
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

describe('tokens', () => {
  it('guardarSesion deja el access token solo en memoria', () => {
    const token = jwt({ sub: 7, exp: ahora() + 600 })
    guardarSesion({ accessToken: token, refreshToken: 'no-debe-guardarse', refreshTokenExpiraEn: enUnDia(), rol: 'ADMIN', email: 'a@cmp.cl' })

    expect(getAccessToken()).toBe(token)
    expect(datos['cmp.sesion']).not.toContain(token)
    expect(datos['cmp.sesion']).not.toContain('no-debe-guardarse')
    expect(getSesion()).toMatchObject({ idUsuario: 7, rol: 'ADMIN', email: 'a@cmp.cl' })
  })

  it('sin token en memoria (pestaña recién abierta) hay que pedirlo', () => {
    expect(accessTokenPorVencer()).toBe(true)
  })

  it('un token a menos de 30 s de vencer se renueva antes', () => {
    guardarSesion({ accessToken: jwt({ sub: 7, exp: ahora() + 10 }), refreshTokenExpiraEn: enUnDia(), rol: 'ADMIN' })
    expect(accessTokenPorVencer()).toBe(true)
    guardarSesion({ accessToken: jwt({ sub: 7, exp: ahora() + 600 }), refreshTokenExpiraEn: enUnDia(), rol: 'ADMIN' })
    expect(accessTokenPorVencer()).toBe(false)
  })

  it('actualizarTokens no revive una sesión que se cerró mientras se renovaba', () => {
    actualizarTokens({ accessToken: jwt({ sub: 7 }), refreshTokenExpiraEn: enUnDia(), rol: 'ADMIN' })
    expect(getSesion()).toBeNull()
    expect(getAccessToken()).toBeNull()
  })

  it('cerrarSesion borra también el token en memoria', () => {
    guardarSesion({ accessToken: jwt({ sub: 7 }), refreshTokenExpiraEn: enUnDia(), rol: 'ADMIN' })
    cerrarSesion()
    expect(getAccessToken()).toBeNull()
    expect(getSesion()).toBeNull()
  })
})

describe('helpers de sesión', () => {
  it('idUsuarioSesion usa el id guardado o, en sesiones anteriores a la cookie, el sub del JWT', () => {
    expect(idUsuarioSesion({ idUsuario: 24 })).toBe(24)
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
