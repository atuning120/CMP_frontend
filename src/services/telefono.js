// Número chileno sin el código de país: 9 dígitos (celular 9 XXXX XXXX, fijo 2 XXXX XXXX)
const LARGO_NUMERO = 9

/**
 * Da formato a un teléfono chileno mientras se escribe ("912345678" → "+56 9 1234 5678"). El +56 lo pone
 * el formato: si el texto ya lo trae (lo mostrado o un número pegado con código de país), no se repite.
 */
export const formatearTelefono = (valor) => {
  let digitos = valor.replace(/\D/g, '')
  if (digitos.startsWith('56') && (valor.trim().startsWith('+') || digitos.length > LARGO_NUMERO)) {
    digitos = digitos.slice(2)
  }
  digitos = digitos.slice(0, LARGO_NUMERO)
  if (!digitos) return ''
  const grupos = [digitos.slice(0, 1), digitos.slice(1, 5), digitos.slice(5)].filter(Boolean)
  return `+56 ${grupos.join(' ')}`
}
