// Búsqueda para listas cortas (marcas, tipos, motivos, operadores), la misma lógica de la app móvil sin la
// tolerancia a errores de tipeo: ignora mayúsculas y acentos, acepta palabras en cualquier orden y letras
// salteadas ("cgdor" → "Cargador"). Devuelve los tramos que coinciden para resaltarlos.

const SEPARADORES = String.raw`\s\-–—_/().,:;`

const escapar = (texto) => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Carácter a carácter para conservar los índices del texto original (necesario para resaltar)
export const normalizar = (texto) =>
  !/[^\x20-\x7E]/.test(texto)
    ? texto.toLowerCase()
    : [...texto].map((c) => c.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().charAt(0) || c).join('')

const unirRangos = (rangos) => {
  const unidos = []
  for (const [inicio, fin] of [...rangos].sort((a, b) => a[0] - b[0])) {
    const ultimo = unidos.at(-1)
    if (ultimo && inicio <= ultimo[1]) ultimo[1] = Math.max(ultimo[1], fin)
    else unidos.push([inicio, fin])
  }
  return unidos
}

const prepararConsulta = (consulta) => {
  const frase = normalizar(consulta).trim().replace(/\s+/g, ' ')
  if (!frase) return null
  const tokens = frase.split(' ')
  const compacta = tokens.join('')
  return {
    frase,
    tokens,
    inicioPalabra: new RegExp(`(^|[${SEPARADORES}])(${escapar(frase)})`),
    letrasEnOrden: compacta.length >= 2 ? new RegExp([...compacta].map((c) => `(${escapar(c)})`).join('.*?')) : null,
    compacta,
  }
}

// Puntaje y tramos de una opción, o null si no coincide
const evaluar = (texto, { frase, tokens, inicioPalabra, letrasEnOrden, compacta }) => {
  if (texto.startsWith(frase)) return { puntaje: 100, rangos: [[0, frase.length]] }

  const palabra = inicioPalabra.exec(texto)
  if (palabra) {
    const inicio = palabra.index + palabra[1].length
    return { puntaje: 80 - inicio / 100, rangos: [[inicio, inicio + frase.length]] }
  }

  const contenida = texto.indexOf(frase)
  if (contenida >= 0) return { puntaje: 60 - contenida / 100, rangos: [[contenida, contenida + frase.length]] }

  if (tokens.length > 1) {
    const rangos = tokens.map((token) => {
      const i = texto.indexOf(token)
      return i < 0 ? null : [i, i + token.length]
    })
    if (rangos.every(Boolean)) return { puntaje: 40, rangos: unirRangos(rangos) }
  }

  const letras = letrasEnOrden?.exec(texto)
  if (letras) {
    const rangos = []
    let cursor = letras.index
    for (let i = 1; i < letras.length; i++) {
      const posicion = texto.indexOf(letras[i], cursor)
      rangos.push([posicion, posicion + 1])
      cursor = posicion + 1
    }
    // Exigir una densidad mínima evita coincidencias absurdas en textos largos
    const densidad = compacta.length / (cursor - letras.index)
    if (densidad >= 0.35) return { puntaje: 20 + densidad * 10, rangos: unirRangos(rangos) }
  }
  return null
}

/** Opciones que coinciden con la consulta, de la mejor a la peor: [{ item, rangos }]. Sin consulta, todas. */
export function buscar(opciones, etiquetaDe, consulta) {
  const preparada = prepararConsulta(consulta)
  if (!preparada) return opciones.map((item) => ({ item, rangos: [] }))
  return opciones
    .map((item, orden) => {
      const resultado = evaluar(normalizar(etiquetaDe(item)), preparada)
      return resultado && { item, orden, ...resultado }
    })
    .filter(Boolean)
    .sort((a, b) => b.puntaje - a.puntaje || a.orden - b.orden)
}
