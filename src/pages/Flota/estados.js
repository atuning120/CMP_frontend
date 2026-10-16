// Estados de una máquina (MAQUINA.estado). ACTIVA y BAJA son los de siempre; BAJA no puede iniciar turnos
export const ESTADOS_MAQUINA = [
  { valor: 'ACTIVA', etiqueta: 'Operativa', clase: 'operativa' },
  { valor: 'BAJO_OBSERVACION', etiqueta: 'Operativa bajo observación', clase: 'observacion' },
  { valor: 'EN_MANTENIMIENTO', etiqueta: 'En mantenimiento', clase: 'mantenimiento' },
  { valor: 'EN_RESERVA', etiqueta: 'En reserva', clase: 'reserva' },
  { valor: 'BAJA', etiqueta: 'Fuera de servicio', clase: 'fuera' },
]

export const estadoDe = (maquina) => ESTADOS_MAQUINA.find((e) => e.valor === maquina.estado) ?? ESTADOS_MAQUINA[0]

// "Sin operador" no se guarda: nadie la tiene asignada ni la está operando en un turno
export const sinOperador = (maquina) => !maquina.operadorAsignado && !maquina.operadorActual
