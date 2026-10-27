/*
 * Mensajes de error que ve el usuario. Nunca se muestra el texto técnico de un error (JavaScript,
 * respuestas internas del framework del Backend, detalles del navegador): ese queda solo en la consola.
 */

// Lo que ve el usuario cuando el Backend no responde (sin conexión, timeout o servidor caído)
export const MENSAJE_SIN_CONEXION = 'Problemas de conexión. Intenta más tarde.'

/**
 * Error cuyo mensaje está escrito para el usuario y se puede mostrar tal cual. Los errores propios del
 * panel (API, sesión) heredan de esta clase; cualquier otro error es técnico.
 */
export class ErrorParaUsuario extends Error {}

/**
 * Mensaje para una respuesta de error del Backend. Sus errores de negocio traen `code` y un mensaje
 * pensado para el usuario; los demás (500, rutas inexistentes, validaciones del framework) vienen en
 * inglés o con detalles internos, y se reemplazan por uno según el status.
 */
export const mensajeDeRespuesta = (status, cuerpo) => {
  const esDeNegocio = status >= 400 && status < 500 && typeof cuerpo?.code === 'string'
  if (esDeNegocio && typeof cuerpo?.message === 'string' && cuerpo.message.trim()) return cuerpo.message
  if (status === 401) return 'Tu sesión expiró. Vuelve a iniciar sesión.'
  if (status === 403) return 'No tienes permiso para realizar esta acción.'
  if (status === 404) return 'No se encontró la información solicitada. Puede que ya no exista.'
  if (status === 408 || status === 502 || status === 503 || status === 504) return MENSAJE_SIN_CONEXION
  if (status === 409) return 'La información cambió mientras trabajabas. Actualiza e intenta nuevamente.'
  if (status === 413) return 'El archivo es demasiado grande para enviarlo.'
  if (status === 429) return 'Demasiados intentos seguidos. Espera unos minutos e intenta nuevamente.'
  if (status >= 500) return 'El servidor tuvo un problema. Intenta más tarde.'
  return 'No se pudo completar la acción. Revisa los datos e intenta nuevamente.'
}

/**
 * Mensaje a mostrar para un error capturado: el suyo si está escrito para el usuario, o `porDefecto`
 * (qué se intentaba hacer, p. ej. "No se pudo guardar el usuario.") si es un error técnico.
 */
export const mensajeDeError = (error, porDefecto) => {
  if (error instanceof ErrorParaUsuario && error.message) return error.message
  console.warn(porDefecto, error)
  return porDefecto
}
