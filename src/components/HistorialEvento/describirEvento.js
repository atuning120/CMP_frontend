import { Activity, ArrowLeftRight, Ban, Camera, CircleCheck, CirclePlus, Pencil, Play, RefreshCw, Square, Undo2 } from 'lucide-react'
import { ESTADOS_MAQUINA } from '../../pages/Flota/estados.js'

// Igual que HistorialEventoCard de la app móvil
const PRESENTACION = {
  INICIO_TURNO: { icono: Play, verbo: 'inició turno en', tono: 'exito' },
  FIN_TURNO: { icono: Square, verbo: 'cerró turno en', tono: 'peligro' },
  CAMBIO_UBICACION: { icono: ArrowLeftRight, verbo: 'trasladó', tono: 'primario' },
  NOVEDAD: { icono: Camera, verbo: 'reportó una novedad en', tono: 'aviso' },
  INCORPORAR: { icono: CirclePlus, verbo: 'incorporó', tono: 'primario' },
  EDITAR: { icono: Pencil, verbo: 'editó', tono: 'aviso' },
  HABILITAR: { icono: CircleCheck, verbo: 'habilitó', tono: 'exito' },
  DESHABILITAR: { icono: Ban, verbo: 'deshabilitó', tono: 'peligro' },
  CAMBIAR_ESTADO: { icono: Activity, verbo: 'cambió el estado de', tono: 'primario' },
  REEMPLAZAR: { icono: RefreshCw, verbo: 'reemplazó', tono: 'aviso' },
  DEVOLVER: { icono: Undo2, verbo: 'devolvió a operación', tono: 'exito' },
}

const formatoHoras = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 })

const texto = (valor) => (typeof valor === 'string' && valor.trim() !== '' ? valor : null)

// null/undefined no deben leerse como 0 (Number(null) === 0)
const numero = (valor) => {
  if (valor === null || valor === undefined || valor === '') return null
  const n = Number(valor)
  return Number.isFinite(n) ? n : null
}

// Cómo se llama el texto que el operador escribió en cada reporte de la app
const ETIQUETA_REPORTE = { INICIO_TURNO: 'Instrucciones', FIN_TURNO: 'Novedades del cierre' }

const evidenciasDe = (lista) => (Array.isArray(lista) ? lista.filter((e) => typeof e?.id === 'string') : [])

/**
 * Lo que el operador reportó con el evento: { etiqueta, descripcion, evidencias } o null si no hay nada.
 * Inicio y cierre de turno lo traen en detalle.reporte; una novedad trae su texto en observacion (se muestra
 * como cualquier observación) y sus fotos en detalle.evidencias.
 */
const reporteDe = (evento) => {
  const { detalle } = evento
  if (evento.tipo === 'NOVEDAD') {
    const evidencias = evidenciasDe(detalle?.evidencias)
    return evidencias.length ? { etiqueta: null, descripcion: null, evidencias } : null
  }
  const etiqueta = ETIQUETA_REPORTE[evento.tipo]
  if (!etiqueta || !detalle?.reporte) return null
  const descripcion = texto(detalle.reporte.descripcion)
  const evidencias = evidenciasDe(detalle.reporte.evidencias)
  return descripcion || evidencias.length ? { etiqueta, descripcion, evidencias } : null
}

export const etiquetaEstado = (valor) => ESTADOS_MAQUINA.find((e) => e.valor === valor)?.etiqueta ?? valor

/**
 * Lo que muestra la tarjeta de un evento, ya derivado de su detalle. null si el tipo no se conoce
 * (Backend más nuevo que esta versión del panel).
 */
export function describirEvento(evento) {
  const presentacion = PRESENTACION[evento.tipo]
  if (!presentacion) return null

  const { detalle } = evento
  // El inicio y el cierre del turno son eventos separados, cada uno en su fecha
  const esTurno = evento.tipo === 'INICIO_TURNO' || evento.tipo === 'FIN_TURNO'
  const esCierre = evento.tipo === 'FIN_TURNO'
  const reemplazadaPor = evento.tipo === 'REEMPLAZAR' ? texto(detalle?.entrante) : null
  // Reemplazo: cómo quedó la saliente (los registros antiguos no lo traen). Devolución: el respaldo que sale
  const estadoSaliente = evento.tipo === 'REEMPLAZAR' ? texto(detalle?.despues?.estado) : null
  const respaldoDevuelto = evento.tipo === 'DEVOLVER' ? texto(detalle?.respaldo) : null
  // Turno cerrado por un jefe de turno en nombre del operador (falla de la máquina, mantención)
  const cerradoPor = esCierre ? texto(detalle?.cerradoPor) : null
  const motivoCierre = cerradoPor ? texto(detalle?.motivoCierre) : null
  // Cambio de estado: a cuál pasó (los registros antiguos de habilitar/deshabilitar no lo traen)
  const estadoNuevo =
    evento.tipo === 'CAMBIAR_ESTADO' || evento.tipo === 'HABILITAR' ? texto(detalle?.despues?.estado) : null
  // El sistema lo cerró al pasar la duración máxima (probablemente el operador olvidó finalizarlo).
  // Sin número de horas: los turnos antiguos se cerraban a las 12 h y los actuales a las 13 h
  const cierreAutomatico = esCierre && detalle?.estadoTurno === 'CERRADO_AUTO'
  // Inicio: dónde y con qué horómetro partió. Cierre: dónde terminó y cuánto avanzó el horómetro.
  // Cambio de área/zona: desde dónde y a dónde fue
  const ubicacion = [texto(detalle?.area), texto(detalle?.zona)].filter(Boolean).join(' · ')
  const horometroInicial = esTurno ? numero(detalle?.horometroInicial) : null
  const horometroFinal = esCierre ? numero(detalle?.horometroFinal) : null
  let horometro = horometroInicial !== null ? `${formatoHoras.format(horometroInicial)} hrs` : null
  if (esCierre) {
    horometro =
      horometroFinal === null
        ? 'Sin horómetro final'
        : `${horometroInicial !== null ? `${formatoHoras.format(horometroInicial)} → ` : ''}${formatoHoras.format(horometroFinal)} hrs`
  }
  const esCambioUbicacion = evento.tipo === 'CAMBIO_UBICACION'
  const ubicacionAnterior = esCambioUbicacion
    ? [texto(detalle?.areaAnterior), texto(detalle?.zonaAnterior)].filter(Boolean).join(' · ')
    : ''
  const traslado = esCambioUbicacion ? [ubicacionAnterior, ubicacion].filter(Boolean).join(' → ') : ''
  const reporte = reporteDe(evento)

  return {
    presentacion,
    esTurno,
    reemplazadaPor,
    estadoSaliente,
    respaldoDevuelto,
    cerradoPor,
    motivoCierre,
    estadoNuevo,
    cierreAutomatico,
    ubicacion,
    horometro,
    traslado,
    reporte,
  }
}

/**
 * La tarjeta como texto plano y en el orden en que se lee (título, etiquetas, observación, ubicación, horómetro y
 * reporte del operador),
 * para buscar en el historial. Los campos van unidos por " · " para que una expresión pueda abarcar varios.
 */
export function textoEvento(evento) {
  const d = describirEvento(evento)
  if (!d) return ''

  const maquina = evento.maquina.nombre
  let titulo
  if (d.cierreAutomatico && !d.cerradoPor) titulo = `El turno de ${evento.actor} en ${maquina} se cerró automáticamente`
  else if (d.cerradoPor) titulo = `${d.cerradoPor} cerró el turno de ${evento.actor} en ${maquina}`
  else titulo = `${evento.actor} ${d.presentacion.verbo} ${maquina}`
  if (d.reemplazadaPor) titulo += ` por ${d.reemplazadaPor}`
  if (d.estadoNuevo) titulo += ` a ${etiquetaEstado(d.estadoNuevo).toLowerCase()}`
  if (d.estadoSaliente) titulo += ` · queda ${etiquetaEstado(d.estadoSaliente).toLowerCase()}`
  if (d.respaldoDevuelto) titulo += ` · sale el respaldo ${d.respaldoDevuelto}`

  return [
    titulo,
    evento.motivo,
    d.cerradoPor && (d.motivoCierre ? `Motivo: ${d.motivoCierre}` : 'Cerrado por el jefe de turno'),
    d.cierreAutomatico && !d.cerradoPor && 'Superó la duración máxima del turno',
    evento.observacion,
    d.traslado,
    d.esTurno && d.ubicacion,
    d.esTurno && d.horometro,
    d.reporte?.descripcion && `${d.reporte.etiqueta}: ${d.reporte.descripcion}`,
    d.reporte?.evidencias.length && (d.reporte.evidencias.length === 1 ? 'Con foto' : `Con ${d.reporte.evidencias.length} fotos`),
  ]
    .filter(Boolean)
    .join(' · ')
}
