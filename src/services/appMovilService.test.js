import { describe, expect, it } from 'vitest'
import { FORMATO_VERSION, formatearTamano, siguienteVersion } from './appMovilService.js'

describe('siguienteVersion', () => {
  it('sugiere la más alta con el último número + 1', () => {
    expect(siguienteVersion([{ version: '1.4.2' }, { version: '1.3.9' }])).toBe('1.4.3')
    expect(siguienteVersion([{ version: '2.0.9' }])).toBe('2.0.10')
  })

  it('sin versiones publicadas sugiere 1.0.0', () => {
    expect(siguienteVersion([])).toBe('1.0.0')
    expect(siguienteVersion(undefined)).toBe('1.0.0')
  })
})

describe('FORMATO_VERSION', () => {
  it('acepta tres números y rechaza el resto, como el Backend', () => {
    expect(FORMATO_VERSION.test('1.4.0')).toBe(true)
    expect(FORMATO_VERSION.test('10.12.105')).toBe(true)
    expect(FORMATO_VERSION.test('1.4')).toBe(false)
    expect(FORMATO_VERSION.test('v1.4.0')).toBe(false)
    expect(FORMATO_VERSION.test('1.4.0-beta')).toBe(false)
  })
})

describe('formatearTamano', () => {
  it('muestra megabytes con un decimal', () => {
    expect(formatearTamano(75_000_000)).toBe('71,5 MB')
    expect(formatearTamano(1024 * 1024)).toBe('1,0 MB')
  })
})
