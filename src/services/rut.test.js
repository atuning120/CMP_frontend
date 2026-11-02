import { describe, expect, it } from 'vitest'
import { formatearRut } from './rut.js'

describe('formatearRut', () => {
  it.each([
    ['', ''],
    ['1', '1'],
    ['12', '1-2'],
    ['1234', '123-4'],
    ['12345', '1.234-5'],
    ['12345678', '1.234.567-8'],
    ['123456785', '12.345.678-5'],
    ['12.345.678-5', '12.345.678-5'],
    ['12.345.678 - 5', '12.345.678-5'],
  ])('%s → %s', (escrito, esperado) => {
    expect(formatearRut(escrito)).toBe(esperado)
  })

  it('acepta la K solo como dígito verificador', () => {
    expect(formatearRut('7654321k')).toBe('7.654.321-K')
    expect(formatearRut('K')).toBe('')
    expect(formatearRut('12K34')).toBe('123-4')
  })

  it('no pasa de 8 dígitos más el verificador', () => {
    expect(formatearRut('1234567851')).toBe('12.345.678-5')
  })

  it('descarta letras y símbolos', () => {
    expect(formatearRut('12a.3b4')).toBe('123-4')
  })
})
