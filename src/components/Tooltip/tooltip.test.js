import { describe, expect, it } from 'vitest'
import { ubicar } from './tooltip.js'

const VENTANA = { ancho: 1000, alto: 600 }
const TAMANO = { ancho: 200, alto: 50 }
const caja = (left, top, width = 40, height = 30) => ({ left, top, width, height, right: left + width, bottom: top + height })

describe('ubicar', () => {
  it('centra la etiqueta en el lado pedido', () => {
    expect(ubicar(caja(480, 300), TAMANO, VENTANA, 'arriba')).toEqual({ lado: 'arriba', x: 400, y: 241, flecha: 100 })
    expect(ubicar(caja(480, 300), TAMANO, VENTANA, 'derecha')).toEqual({ lado: 'derecha', x: 529, y: 290, flecha: 25 })
  })

  it('pasa al lado opuesto si no cabe', () => {
    expect(ubicar(caja(480, 10), TAMANO, VENTANA, 'arriba').lado).toBe('abajo')
    expect(ubicar(caja(900, 300), TAMANO, VENTANA, 'derecha').lado).toBe('izquierda')
  })

  it('no se sale de la ventana y la flecha sigue apuntando al elemento', () => {
    const { x, flecha } = ubicar(caja(950, 300), TAMANO, VENTANA, 'arriba')
    expect(x).toBe(792)
    expect(x + flecha).toBe(970)
  })

  it('en pantallas angostas usa arriba o abajo si no cabe a los costados', () => {
    expect(ubicar(caja(120, 300), TAMANO, { ancho: 300, alto: 600 }, 'derecha').lado).toBe('arriba')
  })
})
