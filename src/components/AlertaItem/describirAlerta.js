import { AlarmClockOff, AlertTriangle, Layers } from 'lucide-react'
import { formatearDuracion } from '../../pages/Historial/fechas.js'

const minutosEntre = (desde, hasta) => ((hasta ? new Date(hasta).getTime() : Date.now()) - new Date(desde).getTime()) / 60000

/**
 * Lo que muestran la lista y los avisos de una alerta (igual que AlertaCard de la app móvil): icono, tono, si sigue
 * activa (turno o jornada extendidos que siguen abiertos: los que todavía requieren acción), la frase de qué pasó
 * (en partes, para resaltar operador y máquina) y la etiqueta con el estado.
 */
export function describirAlerta(alerta) {
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
