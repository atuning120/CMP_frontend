import { describe, expect, it } from 'vitest'
import { contenidoNotificacion, tituloConContador } from './avisosNavegador.js'

const alerta = (id, operador, maquina) => ({
  id,
  tipo: 'TURNO_EXTENDIDO',
  fecha: '2026-11-12T18:00:00Z',
  operador,
  maquina: { id: 1, nombre: maquina },
  turno: { id: 1, estado: 'EN_CURSO', horaInicio: '2026-11-12T08:00:00Z', horaTermino: null },
  area: 'Chancado',
  zona: null,
  jornada: null,
  detencion: null,
  atenciones: [],
})

describe('tituloConContador', () => {
  it('antepone las alertas sin ver al título', () => {
    expect(tituloConContador('GeoPlanta · CMP', 3)).toBe('(3) GeoPlanta · CMP')
  })

  it('sin alertas sin ver deja el título como está', () => {
    expect(tituloConContador('GeoPlanta · CMP', 0)).toBe('GeoPlanta · CMP')
  })
})

describe('contenidoNotificacion', () => {
  it('una alerta: qué pasó y su estado, con un tag por alerta', () => {
    const contenido = contenidoNotificacion([alerta('E-7', 'Operador 1', 'CF-01')])
    expect(contenido.titulo).toBe('Nueva alerta · GeoPlanta')
    expect(contenido.cuerpo).toMatch(/^Operador 1 lleva más de 10 h de turno en CF-01\nActiva · Turno abierto hace /)
    expect(contenido.tag).toBe('alerta-E-7')
  })

  it('varias: una línea por alerta, hasta tres, y cuántas más', () => {
    const nuevas = [1, 2, 3, 4, 5].map((n) => alerta(`E-${n}`, `Operador ${n}`, `CF-0${n}`))
    const contenido = contenidoNotificacion(nuevas)
    expect(contenido.titulo).toBe('5 alertas nuevas · GeoPlanta')
    expect(contenido.cuerpo.split('\n')).toEqual([
      'Operador 1 lleva más de 10 h de turno en CF-01',
      'Operador 2 lleva más de 10 h de turno en CF-02',
      'Operador 3 lleva más de 10 h de turno en CF-03',
      'y 2 más',
    ])
    expect(contenido.tag).toBe('alertas-E-1,E-2,E-3,E-4,E-5')
  })
})
