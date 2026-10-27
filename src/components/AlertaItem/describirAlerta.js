import { AlarmClockOff, AlertTriangle, Layers, Wrench } from 'lucide-react'
import { formatearDuracion } from '../../pages/Historial/fechas.js'

const minutosEntre = (desde, hasta) => ((hasta ? new Date(hasta).getTime() : Date.now()) - new Date(desde).getTime()) / 60000

// "Mantención / Falla Mecánica Inesperada" -> "Falla Mecánica Inesperada": la categoría ya la dice el tipo de alerta
const nombreEstadoSinCategoria = (nombre) => nombre.replace(/^[^/]+\/\s*/, '')

// Mantención o falla que marcó el operador (en rojo en el mapa): activa mientras la máquina siga en ese estado
function describirDetencion(alerta) {
  const { detencion, turno } = alerta
  const activa = turno.estado === 'EN_CURSO' && !detencion.fin
  const duracion = formatearDuracion(minutosEntre(detencion.inicio, detencion.fin))
  const etiqueta = activa ? `Detenida hace ${duracion}` : `Detenida ${duracion}`
  return {
    icono: Wrench,
    tono: 'peligro',
    activa,
    frase: { antes: '', despues: ` reportó ${nombreEstadoSinCategoria(detencion.estado)} en ` },
    etiqueta: activa ? `Activa · ${etiqueta}` : etiqueta,
    ubicacion: [alerta.area, alerta.zona].filter(Boolean).join(' · '),
    jornada: null,
  }
}

/**
 * Lo que muestran la lista y los avisos de una alerta (igual que AlertaCard de la app móvil): icono, tono, si sigue
 * activa (turno o jornada extendidos que siguen abiertos, o máquina que sigue detenida: los que todavía requieren
 * acción), la frase de qué pasó (en partes, para resaltar operador y máquina) y la etiqueta con el estado.
 */
export function describirAlerta(alerta) {
  if (alerta.tipo === 'MANTENCION' && alerta.detencion) return describirDetencion(alerta)
  const { turno } = alerta
  const esCierreAutomatico = alerta.tipo === 'CIERRE_AUTOMATICO'
  const jornada = alerta.tipo === 'JORNADA_EXTENDIDA' ? (alerta.jornada ?? null) : null
  const activa = !esCierreAutomatico && turno.estado === 'EN_CURSO'
  const duracion = formatearDuracion(minutosEntre(turno.horaInicio, turno.horaTermino))
  const pasoLas10 = activa ? 'lleva más de 10 h' : 'superó las 10 h'

  const frase = esCierreAutomatico
    ? { antes: 'Se cerró automáticamente el turno de ', despues: ' en ' }
    : jornada
      ? { antes: '', despues: ` ${pasoLas10} de jornada sumando turnos; ahora en ` }
      : { antes: '', despues: ` ${pasoLas10} de turno en ` }

  const etiqueta = esCierreAutomatico
    ? `Cierre automático tras ${duracion} · posible olvido de cierre`
    : jornada
      ? `${formatearDuracion(jornada.horas * 60)} en ${jornada.turnos} turnos${activa ? ' y sigue trabajando' : ''}`
      : activa
        ? `Turno abierto hace ${duracion}`
        : `Turno de ${duracion}${turno.estado === 'CERRADO_AUTO' ? ' · se cerró automáticamente' : ''}`

  return {
    icono: esCierreAutomatico ? AlarmClockOff : jornada ? Layers : AlertTriangle,
    tono: esCierreAutomatico ? 'peligro' : 'aviso',
    activa,
    frase,
    etiqueta: activa ? `Activa · ${etiqueta}` : etiqueta,
    ubicacion: [alerta.area, alerta.zona].filter(Boolean).join(' · '),
    jornada,
  }
}

// La frase completa en texto plano (avisos emergentes y lectores de pantalla)
export function textoAlerta(alerta) {
  const { frase } = describirAlerta(alerta)
  return `${frase.antes}${alerta.operador}${frase.despues}${alerta.maquina.nombre}`
}
