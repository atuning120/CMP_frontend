// Espacio entre el elemento y su etiqueta (incluye la flecha) y margen mínimo con el borde de la ventana
const SEPARACION = 9
const MARGEN = 8
// La flecha no llega a las esquinas redondeadas
const FLECHA_MIN = 14

const OPUESTO = { arriba: 'abajo', abajo: 'arriba', izquierda: 'derecha', derecha: 'izquierda' }

const limitar = (valor, min, max) => Math.max(min, Math.min(valor, max))

export const buscarAncla = (nodo) => nodo?.closest?.('[data-tooltip]') ?? null

// Algún texto del elemento sale cortado (ellipsis o line-clamp). Los textos solo para lector de pantalla miden 1 px
const recortado = (ancla) =>
  [ancla, ...ancla.querySelectorAll('*')].some(
    (n) =>
      n.clientWidth > 1 &&
      (n.scrollWidth > n.clientWidth + 1 || n.scrollHeight > n.clientHeight + 1) &&
      getComputedStyle(n).overflow !== 'visible',
  )

export function describirAncla(ancla) {
  const { tooltip, tooltipDetalle, tooltipLado, tooltipRecortado } = ancla.dataset
  if (!tooltip || (tooltipRecortado !== undefined && !recortado(ancla))) return null
  return { ancla, texto: tooltip, detalle: tooltipDetalle, lado: OPUESTO[tooltipLado] ? tooltipLado : 'arriba' }
}

/**
 * Posición de la etiqueta: en el lado pedido; si no cabe, en el opuesto; y si tampoco, arriba o abajo.
 * flecha: distancia desde el inicio de la etiqueta hasta el centro del elemento.
 */
export function ubicar(rect, { ancho, alto }, ventana, ladoPedido) {
  const cabe = {
    arriba: rect.top - MARGEN >= alto + SEPARACION,
    abajo: ventana.alto - rect.bottom - MARGEN >= alto + SEPARACION,
    izquierda: rect.left - MARGEN >= ancho + SEPARACION,
    derecha: ventana.ancho - rect.right - MARGEN >= ancho + SEPARACION,
  }
  const lado = [ladoPedido, OPUESTO[ladoPedido], 'arriba', 'abajo'].find((l) => cabe[l]) ?? 'abajo'
  const centroX = rect.left + rect.width / 2
  const centroY = rect.top + rect.height / 2

  if (lado === 'arriba' || lado === 'abajo') {
    const x = limitar(centroX - ancho / 2, MARGEN, Math.max(MARGEN, ventana.ancho - ancho - MARGEN))
    const y = lado === 'arriba' ? rect.top - alto - SEPARACION : rect.bottom + SEPARACION
    return { lado, x, y, flecha: limitar(centroX - x, FLECHA_MIN, ancho - FLECHA_MIN) }
  }
  const x = lado === 'izquierda' ? rect.left - ancho - SEPARACION : rect.right + SEPARACION
  const y = limitar(centroY - alto / 2, MARGEN, Math.max(MARGEN, ventana.alto - alto - MARGEN))
  return { lado, x, y, flecha: limitar(centroY - y, FLECHA_MIN, alto - FLECHA_MIN) }
}
