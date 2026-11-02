import { describe, expect, it } from 'vitest'
import { formatearTelefono } from './telefono.js'

describe('formatearTelefono', () => {
  it.each([
    ['', ''],
    ['9', '+56 9'],
    ['912', '+56 9 12'],
    ['91234', '+56 9 1234'],
    ['912345', '+56 9 1234 5'],
    ['912345678', '+56 9 1234 5678'],
    ['222345678', '+56 2 2234 5678'],
  ])('%s → %s', (escrito, esperado) => {
    expect(formatearTelefono(escrito)).toBe(esperado)
  })

  it('sigue escribiendo sobre el +56 ya mostrado sin repetirlo', () => {
    expect(formatearTelefono('+56 9 1')).toBe('+56 9 1')
    expect(formatearTelefono('+56 5')).toBe('+56 5')
    expect(formatearTelefono('+56 56')).toBe('+56 5 6')
  })

  it('al borrar hasta el código de país, el campo queda vacío', () => {
    expect(formatearTelefono('+56 ')).toBe('')
  })

  it.each([
    ['+56912345678', '+56 9 1234 5678'],
    ['+56 9 1234 5678', '+56 9 1234 5678'],
    ['56912345678', '+56 9 1234 5678'],
    ['9 1234-5678', '+56 9 1234 5678'],
  ])('al pegar %s → %s', (pegado, esperado) => {
    expect(formatearTelefono(pegado)).toBe(esperado)
  })

  it('no pasa de 9 dígitos', () => {
    expect(formatearTelefono('9123456789')).toBe('+56 9 1234 5678')
  })
})
