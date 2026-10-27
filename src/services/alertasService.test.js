import { describe, expect, it } from 'vitest'
import { coincideTipo } from './alertasService.js'
import { describirAlerta, textoAlerta } from '../components/AlertaItem/describirAlerta.js'

// Las alertas que llegan por WebSocket se suman a la lista solo si calzan con el filtro de tipo visible
describe('coincideTipo', () => {
  it.each([
    ['TODO', 'MANTENCION', true],
    ['EXTENDIDOS', 'TURNO_EXTENDIDO', true],
    ['EXTENDIDOS', 'JORNADA_EXTENDIDA', true],
    ['EXTENDIDOS', 'MANTENCION', false],
    ['CIERRES_AUTOMATICOS', 'CIERRE_AUTOMATICO', true],
    ['CIERRES_AUTOMATICOS', 'MANTENCION', false],
    ['MANTENCIONES', 'MANTENCION', true],
    ['MANTENCIONES', 'TURNO_EXTENDIDO', false],
  ])('filtro %s, alerta %s: %s', (filtro, tipo, esperado) => {
    expect(coincideTipo({ tipo }, filtro)).toBe(esperado)
  })
})

describe('describirAlerta: mantención o falla', () => {
  const alerta = (fin, estadoTurno = 'EN_CURSO') => ({
    tipo: 'MANTENCION',
    operador: 'Cristian Núñez',
    maquina: { id: 5, nombre: 'CF-05' },
    turno: { estado: estadoTurno, horaInicio: '2026-10-27T08:00:00Z', horaTermino: null },
    area: 'Área 15',
    zona: null,
    detencion: { estado: 'Mantención / Falla Mecánica Inesperada', inicio: '2026-10-27T10:00:00Z', fin },
  })

  it('sigue activa mientras la máquina no cambie de estado', () => {
    const { activa, tono, etiqueta } = describirAlerta(alerta(null))
    expect(activa).toBe(true)
    expect(tono).toBe('peligro')
    expect(etiqueta).toMatch(/^Activa · Detenida hace /)
    expect(textoAlerta(alerta(null))).toBe('Cristian Núñez reportó Falla Mecánica Inesperada en CF-05')
  })

  it('terminada: muestra cuánto duró', () => {
    const { activa, etiqueta } = describirAlerta(alerta('2026-10-27T10:45:00Z'))
    expect(activa).toBe(false)
    expect(etiqueta).toBe('Detenida 45 min')
  })
})
