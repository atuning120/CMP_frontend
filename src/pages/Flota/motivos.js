// Mismos motivos que la app móvil (Front-mobile/src/constants/motivosJefeTurno.ts): quedan en la bitácora
export const MOTIVOS_INCORPORACION = [
  'Aumento de capacidad',
  'Reemplazo de equipo',
  'Equipo nuevo de contratista',
  'Retorno desde mantención',
  'Otro',
]

export const MOTIVOS_EDICION = [
  'Corrección de datos',
  'Cambio de patente',
  'Actualización de ficha técnica',
  'Equipo en mantención',
  'Retorno desde mantención',
  'Otro',
]

// Al dejar una máquina fuera de servicio: el motivo se muestra en su ficha de la flota
export const MOTIVOS_DESHABILITAR = [
  'Falla mecánica',
  'Falla eléctrica',
  'Falla hidráulica',
  'Mantención programada',
  'Accidente o incidente',
  'Sin operador disponible',
  'Otro',
]

export const MOTIVOS_HABILITAR = ['Reparación finalizada', 'Retorno desde mantención', 'Operador disponible', 'Otro']

export const MOTIVOS_OBSERVACION = [
  'Ruido o vibración anormal',
  'Fuga menor',
  'Alarma intermitente',
  'Reparación reciente en seguimiento',
  'Otro',
]

export const MOTIVOS_MANTENIMIENTO = [
  'Mantención programada',
  'Mantención correctiva',
  'Falla mecánica',
  'Falla eléctrica',
  'Falla hidráulica',
  'Otro',
]

export const MOTIVOS_RESERVA = ['Equipo de respaldo', 'Baja demanda operacional', 'Sin frente de trabajo asignado', 'Otro']

// Motivos según el estado al que pasa la máquina
export const MOTIVOS_POR_ESTADO = {
  ACTIVA: MOTIVOS_HABILITAR,
  BAJO_OBSERVACION: MOTIVOS_OBSERVACION,
  EN_MANTENIMIENTO: MOTIVOS_MANTENIMIENTO,
  EN_RESERVA: MOTIVOS_RESERVA,
  BAJA: MOTIVOS_DESHABILITAR,
}

export const MOTIVOS_REEMPLAZO = [
  'Falla mecánica',
  'Falla eléctrica',
  'Falla hidráulica',
  'Mantención programada',
  'Accidente o incidente',
  'Renovación de equipo',
  'Fin de contrato (contratista)',
  'Otro',
]
