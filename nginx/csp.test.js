import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const leer = (archivo) => readFileSync(new URL(archivo, import.meta.url), 'utf8')

describe('Content-Security-Policy', () => {
  // Si el script inline de index.html cambia y el hash no, el navegador lo bloquea y la página parpadea con el tema equivocado
  it('autoriza el script inline de index.html por su hash', () => {
    const scripts = [...leer('../index.html').matchAll(/<script>([\s\S]*?)<\/script>/gi)].map((m) => m[1])
    expect(scripts).toHaveLength(1)
    const hash = `'sha256-${createHash('sha256').update(scripts[0]).digest('base64')}'`
    expect(leer('./seguridad.conf')).toContain(hash)
  })
})

describe('Headers de seguridad', () => {
  it('fija HSTS y Permissions-Policy', () => {
    const conf = leer('./seguridad.conf')
    expect(conf).toMatch(/add_header Strict-Transport-Security "max-age=\d{7,}" always;/)
    expect(conf).toMatch(/add_header Permissions-Policy "[^"]*camera=\(\)[^"]*geolocation=\(\)[^"]*" always;/)
  })

  // nginx descarta los add_header del server en una location que define los suyos: cada una debe incluir el snippet
  it('cada location que sirve la app incluye seguridad.conf', () => {
    const locations = [...leer('./default.conf').matchAll(/location\s+([^{]+)\{([^}]*)\}/g)]
    const sinHeaders = locations
      .filter(([, ruta, cuerpo]) => ruta.trim() !== '= /healthz' && !cuerpo.includes('include /etc/nginx/snippets/seguridad.conf;'))
      .map(([, ruta]) => ruta.trim())
    expect(locations.length).toBeGreaterThan(1)
    expect(sinHeaders).toEqual([])
  })
})
