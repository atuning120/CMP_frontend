// Cuerpo de hasta 8 dígitos más el dígito verificador
const LARGO_MAXIMO = 9

/**
 * Da formato a un RUT mientras se escribe ("123456785" → "12.345.678-5"). El último carácter es el dígito
 * verificador; la K solo se acepta ahí. La validez (módulo 11) la revisa el Backend.
 */
export const formatearRut = (valor) => {
  const limpio = valor.replace(/[^0-9kK]/g, '').toUpperCase().slice(0, LARGO_MAXIMO)
  if (limpio.length <= 1) return limpio.replace('K', '')
  const cuerpo = limpio.slice(0, -1).replace(/K/g, '')
  const dv = limpio.slice(-1)
  return `${cuerpo.replace(/\B(?=(\d{3})+$)/g, '.')}-${dv}`
}
