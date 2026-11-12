// Formato liviano para descripciones: **negrita**, *cursiva*, viñetas ("- ") y listas numeradas ("1. ").
// En el Backend se guarda como texto plano con esas marcas; aquí se interpreta para mostrarlo y se convierte
// desde y hacia el documento del editor visual (TipTap). Un "\" antes de una marca la vuelve texto literal.

const VINETA = /^(\s*)[-•*]\s+/
const NUMERO = /^(\s*)(\d+)([.)])\s+/

// Orden de las alternativas: primero *** (negrita y cursiva), luego ** y al final *. Las marcas deben pegarse
// al texto ("2 * 3 * 4" no es cursiva)
const INLINE = /\*\*\*(\S(?:.*?\S)??)\*\*\*|\*\*(\S(?:.*?\S)??)\*\*|\*([^\s*](?:.*?[^\s*])??)\*/

// Los caracteres escapados se cambian por uno de uso privado mientras se interpreta, y luego se devuelven
const ESCAPABLES = '\\*-.)•'
const protegerEscapes = (texto) =>
  texto.replace(/\\([\\*\-.)•])/g, (_, c) => String.fromCharCode(0xe000 + ESCAPABLES.indexOf(c)))
const restaurarEscapes = (texto) => texto.replace(/[-]/g, (c) => ESCAPABLES[c.charCodeAt(0) - 0xe000])

function tramosDe(texto, estilo) {
  const tramos = []
  let resto = texto
  while (resto) {
    const m = INLINE.exec(resto)
    if (!m) {
      tramos.push({ texto: resto, ...estilo })
      break
    }
    if (m.index > 0) tramos.push({ texto: resto.slice(0, m.index), ...estilo })
    if (m[1] !== undefined) tramos.push(...tramosDe(m[1], { ...estilo, negrita: true, cursiva: true }))
    else if (m[2] !== undefined) tramos.push(...tramosDe(m[2], { ...estilo, negrita: true }))
    else tramos.push(...tramosDe(m[3], { ...estilo, cursiva: true }))
    resto = resto.slice(m.index + m[0].length)
  }
  return tramos
}

/** Divide una línea en tramos { texto, negrita?, cursiva? }; la cursiva puede ir dentro de la negrita. */
export function parsearInline(texto) {
  return tramosDe(protegerEscapes(texto), {}).map((t) => ({ ...t, texto: restaurarEscapes(t.texto) }))
}

/**
 * Agrupa el texto en bloques: párrafos (separados por una línea en blanco; cada salto de línea se respeta)
 * y listas (líneas seguidas que empiezan con "- " o "1. ").
 */
export function parsearBloques(texto) {
  const bloques = []
  let parrafo = null
  let lista = null
  for (const linea of (texto ?? '').replace(/\r\n?/g, '\n').split('\n')) {
    const vineta = linea.match(VINETA)
    const numero = vineta ? null : linea.match(NUMERO)
    if (vineta || numero) {
      const ordenada = Boolean(numero)
      if (!lista || lista.ordenada !== ordenada) {
        lista = { tipo: 'lista', ordenada, inicio: numero ? Number(numero[2]) : 1, items: [] }
        bloques.push(lista)
        parrafo = null
      }
      lista.items.push(parsearInline(linea.slice((vineta ?? numero)[0].length).trim()))
    } else if (!linea.trim()) {
      parrafo = null
      lista = null
    } else {
      if (!parrafo) {
        parrafo = { tipo: 'parrafo', lineas: [] }
        bloques.push(parrafo)
        lista = null
      }
      parrafo.lineas.push(parsearInline(linea.trim()))
    }
  }
  return bloques
}

// --- Editor visual (documento de TipTap / ProseMirror en JSON) --------------------------------------

const nodosDeTexto = (tramos) =>
  tramos
    .filter((t) => t.texto)
    .map(({ texto, negrita, cursiva }) => {
      const marks = [...(negrita ? [{ type: 'bold' }] : []), ...(cursiva ? [{ type: 'italic' }] : [])]
      return marks.length ? { type: 'text', text: texto, marks } : { type: 'text', text: texto }
    })

const nodoParrafo = (content) => (content.length ? { type: 'paragraph', content } : { type: 'paragraph' })

/** Texto guardado → documento del editor. */
export function aDocumento(texto) {
  const content = parsearBloques(texto).map((bloque) => {
    if (bloque.tipo === 'parrafo') {
      return nodoParrafo(bloque.lineas.flatMap((tramos, i) => [...(i > 0 ? [{ type: 'hardBreak' }] : []), ...nodosDeTexto(tramos)]))
    }
    return {
      type: bloque.ordenada ? 'orderedList' : 'bulletList',
      ...(bloque.ordenada ? { attrs: { start: bloque.inicio } } : {}),
      content: bloque.items.map((tramos) => ({ type: 'listItem', content: [nodoParrafo(nodosDeTexto(tramos))] })),
    }
  })
  return { type: 'doc', content: content.length ? content : [{ type: 'paragraph' }] }
}

const escapar = (texto) => texto.replace(/[\\*]/g, '\\$&')

// Una línea de párrafo que empieza como lista ("- algo", "1. algo") se escapa para que siga siendo párrafo
const escaparInicioDeLista = (linea) =>
  linea.replace(/^(\s*)([-•])(?=\s)/, '$1\\$2').replace(/^(\s*\d+)([.)])(?=\s)/, '$1\\$2')

// Cada nodo cierra sus propias marcas: "**a*****b***" se lee bien porque el cierre más corto gana
function serializarLinea(contenido = [], saltoDeLinea) {
  return contenido
    .map((nodo) => {
      if (nodo.type === 'hardBreak') return saltoDeLinea
      if (nodo.type !== 'text') return ''
      const texto = escapar(nodo.text)
      const negrita = nodo.marks?.some((m) => m.type === 'bold')
      const cursiva = nodo.marks?.some((m) => m.type === 'italic')
      const marca = negrita && cursiva ? '***' : negrita ? '**' : cursiva ? '*' : ''
      if (!marca || !texto.trim()) return texto
      // Los espacios de los bordes quedan fuera de las marcas ("**hola **" no se leería como negrita)
      const [, antes, nucleo, despues] = texto.match(/^(\s*)([\s\S]*?)(\s*)$/)
      return antes + marca + nucleo + marca + despues
    })
    .join('')
}

function serializarBloque(nodo) {
  if (nodo.type === 'paragraph') {
    return serializarLinea(nodo.content, '\n').split('\n').map((l) => escaparInicioDeLista(l.trimEnd())).join('\n').trim()
  }
  if (nodo.type === 'bulletList' || nodo.type === 'orderedList') {
    const inicio = nodo.attrs?.start ?? 1
    return (nodo.content ?? [])
      .map((item) => (item.content ?? []).map((p) => serializarLinea(p.content, ' ')).join(' ').trim())
      .filter(Boolean)
      .map((texto, i) => (nodo.type === 'orderedList' ? `${inicio + i}. ${texto}` : `- ${texto}`))
      .join('\n')
  }
  return ''
}

/** Documento del editor → texto para guardar. */
export function aTexto(documento) {
  return (documento?.content ?? []).map(serializarBloque).filter(Boolean).join('\n\n')
}
