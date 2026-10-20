import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiJson } from './api.js'

// JWT de prueba (sin firma real: el Frontend solo lee el payload)
const jwt = (exp, n = 0) => `x.${Buffer.from(JSON.stringify({ sub: 7, exp, n })).toString('base64url')}.y`
const enSegundos = (s) => Math.floor(Date.now() / 1000) + s

const VIGENTE = jwt(enSegundos(600), 1)
const VENCIDO = jwt(enSegundos(-1), 2)
const NUEVO = jwt(enSegundos(3600), 3)

let datos
const sesionGuardada = () => JSON.parse(datos['cmp.sesion'] ?? 'null')

const conSesion = (accessToken) => {
  datos = {
    'cmp.sesion': JSON.stringify({
      accessToken,
      refreshToken: 'refresh-1',
      refreshTokenExpiraEn: new Date(Date.now() + 86_400_000).toISOString(),
      rol: 'ADMIN',
      email: 'a@cmp.cl',
    }),
  }
}

const respuesta = (status, cuerpo) => ({ status, ok: status >= 200 && status < 300, json: async () => cuerpo })

// fetch falso: /auth/refresh/web responde `refresco`; el resto acepta solo el token NUEVO o VIGENTE
const conBackend = ({ refresco = respuesta(200, { accessToken: NUEVO, refreshToken: 'refresh-2', refreshTokenExpiraEn: new Date(Date.now() + 86_400_000).toISOString(), rol: 'JEFE_TURNO' }) } = {}) => {
  const fetch = vi.fn(async (url, init) => {
    if (url.endsWith('/auth/refresh/web')) return refresco
    const token = init.headers.Authorization?.replace('Bearer ', '')
    return token === NUEVO || token === VIGENTE ? respuesta(200, { ok: true }) : respuesta(401, {})
  })
  vi.stubGlobal('fetch', fetch)
  return fetch
}

const llamadasA = (fetch, ruta) => fetch.mock.calls.filter(([url]) => url.endsWith(ruta)).length

beforeEach(() => {
  vi.stubGlobal('localStorage', {
    getItem: (k) => datos[k] ?? null,
    setItem: (k, v) => {
      datos[k] = v
    },
    removeItem: (k) => {
      delete datos[k]
    },
  })
})

afterEach(() => vi.unstubAllGlobals())

describe('apiJson con renovación de sesión', () => {
  it('con el token vigente no renueva', async () => {
    conSesion(VIGENTE)
    const fetch = conBackend()

    await expect(apiJson('/historial')).resolves.toEqual({ ok: true })
    expect(llamadasA(fetch, '/auth/refresh/web')).toBe(0)
  })

  it('con el token vencido renueva antes de pedir y guarda los tokens nuevos (y el rol actual)', async () => {
    conSesion(VENCIDO)
    const fetch = conBackend()

    await expect(apiJson('/historial')).resolves.toEqual({ ok: true })
    expect(llamadasA(fetch, '/auth/refresh/web')).toBe(1)
    expect(sesionGuardada()).toMatchObject({ accessToken: NUEVO, refreshToken: 'refresh-2', rol: 'JEFE_TURNO', email: 'a@cmp.cl' })
  })

  it('varias peticiones con el token vencido comparten una sola renovación', async () => {
    conSesion(VENCIDO)
    const fetch = conBackend()

    await Promise.all([apiJson('/a'), apiJson('/b'), apiJson('/c')])
    expect(llamadasA(fetch, '/auth/refresh/web')).toBe(1)
  })

  it('un 401 con token aún vigente (revocado en el Backend) renueva una vez y reintenta', async () => {
    conSesion(jwt(enSegundos(600), 9))
    const fetch = conBackend()

    await expect(apiJson('/historial')).resolves.toEqual({ ok: true })
    expect(llamadasA(fetch, '/auth/refresh/web')).toBe(1)
    expect(llamadasA(fetch, '/historial')).toBe(2)
  })

  it('si el Backend rechaza el refresh token cierra la sesión', async () => {
    conSesion(VENCIDO)
    conBackend({ refresco: respuesta(401, { code: 'SESION_INVALIDA' }) })

    await expect(apiJson('/historial')).rejects.toMatchObject({ status: 401 })
    expect(sesionGuardada()).toBeNull()
  })

  it('sin conexión al renovar no cierra la sesión', async () => {
    conSesion(VENCIDO)
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))))

    await expect(apiJson('/historial')).rejects.toMatchObject({ status: 0 })
    expect(sesionGuardada()).not.toBeNull()
  })
})
