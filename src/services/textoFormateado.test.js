import { describe, expect, it } from 'vitest'
import { aDocumento, aTexto, parsearBloques, parsearInline } from './textoFormateado.js'

const texto = (text, ...marcas) =>
  marcas.length ? { type: 'text', text, marks: marcas.map((type) => ({ type })) } : { type: 'text', text }
const parrafo = (...content) => ({ type: 'paragraph', content })
const doc = (...content) => ({ type: 'doc', content })

describe('parsearInline', () => {
  it('reconoce negrita, cursiva y ambas', () => {
    expect(parsearInline('a **b** *c* ***d***')).toEqual([
      { texto: 'a ' },
      { texto: 'b', negrita: true },
      { texto: ' ' },
      { texto: 'c', cursiva: true },
      { texto: ' ' },
      { texto: 'd', negrita: true, cursiva: true },
    ])
  })

  it('admite cursiva dentro de negrita', () => {
    expect(parsearInline('**con *valor* alto**')).toEqual([
      { texto: 'con ', negrita: true },
      { texto: 'valor', negrita: true, cursiva: true },
      { texto: ' alto', negrita: true },
    ])
  })

  it('deja tal cual los asteriscos sueltos o separados del texto', () => {
    expect(parsearInline('2 * 3 * 4')).toEqual([{ texto: '2 * 3 * 4' }])
    expect(parsearInline('**sin cerrar')).toEqual([{ texto: '**sin cerrar' }])
  })

  it('respeta los caracteres escapados', () => {
    expect(parsearInline('\\*no\\* es cursiva, C:\\\\ruta')).toEqual([{ texto: '*no* es cursiva, C:\\ruta' }])
  })
})

describe('parsearBloques', () => {
  it('separa párrafos, viñetas y listas numeradas', () => {
    const bloques = parsearBloques('Banqueo.\nRechazo con valor\n\n- uno\n* dos\n3. tres\n4) cuatro\nfinal')
    expect(bloques.map((b) => b.tipo)).toEqual(['parrafo', 'lista', 'lista', 'parrafo'])
    expect(bloques[0].lineas).toHaveLength(2)
    expect(bloques[1]).toMatchObject({ ordenada: false, items: [[{ texto: 'uno' }], [{ texto: 'dos' }]] })
    expect(bloques[2]).toMatchObject({ ordenada: true, inicio: 3, items: [[{ texto: 'tres' }], [{ texto: 'cuatro' }]] })
  })

  it('no confunde cursiva al inicio de línea ni un guion escapado con una viñeta', () => {
    expect(parsearBloques('*nota* importante')[0].tipo).toBe('parrafo')
    expect(parsearBloques('\\- no es lista')[0]).toEqual({ tipo: 'parrafo', lineas: [[{ texto: '- no es lista' }]] })
  })

  it('tolera texto vacío o nulo', () => {
    expect(parsearBloques('')).toEqual([])
    expect(parsearBloques(null)).toEqual([])
  })
})

describe('aDocumento', () => {
  it('convierte párrafos con saltos de línea y listas', () => {
    expect(aDocumento('**Banqueo**, material.\nRechazo\n\n3. uno')).toEqual(
      doc(
        parrafo(texto('Banqueo', 'bold'), texto(', material.'), { type: 'hardBreak' }, texto('Rechazo')),
        {
          type: 'orderedList',
          attrs: { start: 3 },
          content: [{ type: 'listItem', content: [parrafo(texto('uno'))] }],
        },
      ),
    )
  })

  it('un texto vacío da un párrafo vacío', () => {
    expect(aDocumento('')).toEqual(doc({ type: 'paragraph' }))
    expect(aDocumento(null)).toEqual(doc({ type: 'paragraph' }))
  })
})

describe('aTexto', () => {
  it('deja los espacios fuera de las marcas y separa los nodos con distinto formato', () => {
    const d = doc(parrafo(texto('Banqueo ', 'bold'), texto('de'), texto('a', 'bold'), texto('b', 'bold', 'italic')))
    const guardado = aTexto(d)
    expect(guardado).toBe('**Banqueo** de**a*****b***')
    expect(parsearInline(guardado)).toEqual([
      { texto: 'Banqueo', negrita: true },
      { texto: ' de' },
      { texto: 'a', negrita: true },
      { texto: 'b', negrita: true, cursiva: true },
    ])
  })

  it('escapa los asteriscos y los inicios que parecen lista', () => {
    const d = doc(parrafo(texto('- 2*3'), { type: 'hardBreak' }, texto('1. paso')))
    expect(aTexto(d)).toBe('\\- 2\\*3\n1\\. paso')
    expect(aTexto(aDocumento(aTexto(d)))).toBe(aTexto(d))
  })

  it('omite párrafos e ítems vacíos', () => {
    const lista = { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph' }] }] }
    expect(aTexto(doc({ type: 'paragraph' }, lista, parrafo(texto('  ')), parrafo(texto('fin'))))).toBe('fin')
  })

  it('ida y vuelta conserva el texto', () => {
    const original = 'Banqueo, **movimiento** de *material*.\nRechazo con valor\n\n- uno\n- ***dos***\n\n2. a\n3. b\n\nCierre'
    expect(aTexto(aDocumento(original))).toBe(original)
  })
})
