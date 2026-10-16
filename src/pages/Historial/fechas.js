// Rangos de fechas y agrupación por día del historial (los mismos de la app móvil: utils/historialFechas.ts)

// Igual que el Backend: un rango más largo se rechaza
export const DIAS_MAXIMOS = 90

export const RANGOS = [
  { id: 'hoy', etiqueta: 'Hoy', dias: 1 },
  { id: '7', etiqueta: '7 días', dias: 7 },
  { id: '30', etiqueta: '30 días', dias: 30 },
  { id: 'personalizado', etiqueta: 'Personalizado' },
]

const inicioDelDia = (fecha) => new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate())

const sumarDias = (fecha, dias) => new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + dias)

// Días calendario entre dos fechas, contando ambos extremos (hoy a hoy = 1)
const diasIncluidos = (desde, hasta) => Math.round((inicioDelDia(hasta) - inicioDelDia(desde)) / (24 * 60 * 60 * 1000)) + 1

// <input type="date"> trabaja con "YYYY-MM-DD" en hora local
export const aValorInput = (fecha) =>
  `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`

const deValorInput = (valor) => {
  const [anio, mes, dia] = valor.split('-').map(Number)
  return new Date(anio, mes - 1, dia)
}

export const hoyMasDias = (dias) => aValorInput(sumarDias(new Date(), dias))

// Días completos en hora local: "7 días" son hoy y los 6 anteriores
export const rangoUltimosDias = (dias) => ({ desde: sumarDias(new Date(), -(dias - 1)).toISOString(), hasta: null })

/**
 * Personalizado: del inicio del primer día al inicio del día siguiente al último (hasta es exclusiva).
 * Devuelve { rango } o { error } si las fechas no forman un rango válido.
 */
export function rangoPersonalizado(desdeValor, hastaValor) {
  if (!desdeValor || !hastaValor) return { error: 'Elige las dos fechas del rango.' }
  const desde = deValorInput(desdeValor)
  const hasta = deValorInput(hastaValor)
  if (desde > hasta) return { error: 'La fecha de inicio debe ser anterior a la de término.' }
  if (diasIncluidos(desde, hasta) > DIAS_MAXIMOS) return { error: `El rango no puede superar los ${DIAS_MAXIMOS} días.` }
  return { rango: { desde: desde.toISOString(), hasta: sumarDias(hasta, 1).toISOString() } }
}

const formatoCorto = (fecha) => fecha.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' })

// "Hoy", "Ayer" o "Lunes 06/10"
const etiquetaDia = (dia) => {
  const hoy = inicioDelDia(new Date())
  if (dia.getTime() === hoy.getTime()) return 'Hoy'
  if (dia.getTime() === sumarDias(hoy, -1).getTime()) return 'Ayer'
  const semana = dia.toLocaleDateString('es-CL', { weekday: 'long' })
  return `${semana.charAt(0).toUpperCase()}${semana.slice(1)} ${formatoCorto(dia)}`
}

// Los eventos vienen del más reciente al más antiguo: basta con cortar cuando cambia el día
export function agruparPorDia(eventos) {
  const dias = []
  for (const evento of eventos) {
    const dia = inicioDelDia(new Date(evento.fecha))
    const clave = dia.toISOString()
    const ultimo = dias[dias.length - 1]
    if (ultimo?.clave === clave) ultimo.eventos.push(evento)
    else dias.push({ clave, titulo: etiquetaDia(dia), eventos: [evento] })
  }
  return dias
}

// "hace 5 min", "hace 3 h", "hoy 14:30", "ayer 14:30" o "05/10 14:30"
export function formatearFecha(iso) {
  const fecha = new Date(iso)
  const minutos = Math.floor((Date.now() - fecha.getTime()) / 60000)
  const hora = fecha.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
  if (minutos < 1) return 'recién'
  if (minutos < 60) return `hace ${minutos} min`
  if (minutos < 12 * 60) return `hace ${Math.floor(minutos / 60)} h`
  const ayer = sumarDias(new Date(), -1)
  if (fecha.toDateString() === new Date().toDateString()) return `hoy ${hora}`
  if (fecha.toDateString() === ayer.toDateString()) return `ayer ${hora}`
  return `${formatoCorto(fecha)} ${hora}`
}
