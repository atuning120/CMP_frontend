import { apiJson } from './api.js'
import { getSesion } from './session.js'
import { suscribirSocket } from './socket.js'

// Mismos roles que exige el Backend en GET /alertas
const ROLES_ALERTAS = ['JEFE_TURNO', 'ADMIN']

export const puedeVerAlertas = (sesion) => ROLES_ALERTAS.includes(sesion?.rol)

/**
 * Cambios de estado operacional en tiempo real (Socket.IO, namespace /estados): `alRecibir` recibe
 * { idMaquina, idTurno, estadoOperacional: { idEstado, nombre, categoria, desde } } cada vez que un operador cambia de
 * estado en la app, y `alReconectar` avisa cuando la conexión vuelve tras un corte. Devuelve la función para desconectarse.
 */
export const suscribirEstadosOperacionales = ({ alRecibir, alReconectar }) =>
  suscribirSocket('/estados', { estados: alRecibir }, alReconectar)

// Todas las máquinas (también las dadas de baja) con su turno en curso, la zona y el estado operacional de ese turno
export const obtenerFlota = () => apiJson('/maquinas/flota')

/**
 * Ids de las máquinas con un turno extendido (más de 10 h) que sigue en curso.
 * Un VISOR no tiene acceso a las alertas: ni se piden (conjunto vacío).
 */
export async function obtenerMaquinasConAlerta() {
  if (!puedeVerAlertas(getSesion())) return new Set()
  try {
    const { alertas } = await apiJson('/alertas?tipo=EXTENDIDOS&limite=50')
    return new Set(alertas.filter((a) => a.turno.estado === 'EN_CURSO').map((a) => a.maquina.id))
  } catch {
    return new Set()
  }
}

// ── Gestión de la flota (JEFE_TURNO y ADMIN, igual que en la app móvil) ──────────────────────────
// Cada acción exige un motivo, que queda en la bitácora del jefe de turno

export const ROLES_GESTION_FLOTA = ['JEFE_TURNO', 'ADMIN']

export const puedeGestionarFlota = (sesion) => ROLES_GESTION_FLOTA.includes(sesion?.rol)

const enviar = (method, path, body) => apiJson(path, { method, body: JSON.stringify(body) })

// datos: { nombre, marca, modelo, tipoMaquina, anio, patente, numeroChasis, horometroInicial, esContratista, idOperador, motivo, observacion }
export const crearMaquina = (datos) => enviar('POST', '/maquinas', datos)

// versionBase (en editar, cambiar estado, reemplazar y devolver): la `version` de la máquina que vio el jefe de turno.
// Si otro la cambió mientras tanto, el Backend no aplica la acción y responde 409 con code MAQUINA_MODIFICADA
export const MAQUINA_MODIFICADA = 'MAQUINA_MODIFICADA'

// Ficha completa + motivo + versionBase. idOperador null deja la máquina sin operador
export const editarMaquina = (idMaquina, datos) => enviar('PATCH', `/maquinas/${idMaquina}`, datos)

// Habilitar / deshabilitar: el mismo PATCH enviando solo el estado. regresoEstimado (ISO) solo en mantenimiento
// o fuera de servicio; undefined no lo toca
export const cambiarEstadoMaquina = (idMaquina, versionBase, estado, motivo, observacion, regresoEstimado) =>
  enviar('PATCH', `/maquinas/${idMaquina}`, { estado, motivo, observacion, regresoEstimado, versionBase })

// La entrante es de la flota (idMaquinaEntrante) o nueva (maquinaNueva). Sin idOperador, pasa el de la saliente.
// estadoSaliente: EN_MANTENIMIENTO o BAJA; regresoEstimado: ISO, solo con EN_MANTENIMIENTO; versionBase: la de la saliente
export const reemplazarMaquina = (idSaliente, datos) => enviar('POST', `/maquinas/${idSaliente}/reemplazo`, datos)

// La original vuelve a operar con el operador de su respaldo, y el respaldo vuelve a su estado anterior
export const devolverMaquina = (idMaquina, versionBase, motivo, observacion) =>
  enviar('POST', `/maquinas/${idMaquina}/devolucion`, { motivo, observacion, versionBase })

// Cierra el turno en curso de la máquina en nombre del operador (para sacarla de operación). El horómetro final
// lo obtiene el jefe de turno en terreno o por radio. idTurno: el turno que se ve (idTurnoActual de la flota); si el
// operador u otro jefe lo cerró antes, el Backend responde 409 TURNO_YA_CERRADO con quién y a qué hora
export const cerrarTurnoDeMaquina = (idMaquina, horometroFinal, motivo, idTurno) =>
  enviar('POST', `/turnos/maquina/${idMaquina}/cierre`, { horometroFinal, motivo, idTurno: idTurno ?? undefined })

export const listarOperadoresAsignables = () => apiJson('/maquinas/operadores')
export const listarModelosMaquina = () => apiJson('/modelos-maquina')
export const listarTiposMaquina = () => apiJson('/maquinas/tipos')
export const listarMarcasMaquina = () => apiJson('/maquinas/marcas')
