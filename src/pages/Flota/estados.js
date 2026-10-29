// Estados de una máquina (MAQUINA.estado). ACTIVA y BAJA son los de siempre; BAJA no puede iniciar turnos
export const ESTADOS_MAQUINA = [
  { valor: 'ACTIVA', etiqueta: 'Operativa', clase: 'operativa' },
  { valor: 'BAJO_OBSERVACION', etiqueta: 'Operativa bajo observación', clase: 'observacion' },
  { valor: 'EN_MANTENIMIENTO', etiqueta: 'En mantenimiento', clase: 'mantenimiento' },
  { valor: 'EN_RESERVA', etiqueta: 'En reserva', clase: 'reserva' },
  { valor: 'BAJA', etiqueta: 'Fuera de servicio', clase: 'fuera' },
]

// Igual que el Backend: en mantenimiento, en reserva o fuera de servicio la máquina no trabaja (no inicia turnos
// y para pasarla a esos estados hay que cerrar antes su turno en curso). "Bajo observación" sí opera
const ESTADOS_SIN_OPERAR = ['EN_MANTENIMIENTO', 'EN_RESERVA', 'BAJA']
export const operaEnEstado = (estado) => !ESTADOS_SIN_OPERAR.includes(estado)

// Estados con fecha estimada de regreso: solo una reparación. Fuera de servicio no tiene fecha conocida
export const conRegreso = (estado) => estado === 'EN_MANTENIMIENTO'

// Regreso estimado ya cumplido y la máquina sigue sin volver: el jefe de turno debe hacer seguimiento
export const regresoVencido = (maquina, ahora = Date.now()) =>
  Boolean(maquina.regresoEstimado) && conRegreso(maquina.estado) && new Date(maquina.regresoEstimado).getTime() <= ahora

export const estadoDe = (maquina) => ESTADOS_MAQUINA.find((e) => e.valor === maquina.estado) ?? ESTADOS_MAQUINA[0]

// "Sin operador" no se guarda: nadie la tiene asignada ni la está operando en un turno
export const sinOperador = (maquina) => !maquina.operadorAsignado && !maquina.operadorActual
