import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const leer = (archivo) => readFileSync(new URL(archivo, import.meta.url), 'utf8')

describe('Content-Security-Policy', () => {
  // Si el script inline de index.html cambia y el hash no, el navegador lo bloquea y la página parpadea con el tema equivocado
  it('autoriza el script inline de index.html por su hash', () => {
    const scripts = [...leer('../index.html').matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1])
    expect(scripts).toHaveLength(1)
    const hash = `'sha256-${createHash('sha256').update(scripts[0]).digest('base64')}'`
    expect(leer('./seguridad.conf')).toContain(hash)
  })
})
