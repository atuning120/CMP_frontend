import { apiJson } from './api.js'
import { getSesion } from './session.js'

// Mismos roles que exige el Backend en GET /alertas
const ROLES_ALERTAS = ['JEFE_TURNO', 'ADMIN']

export const puedeVerAlertas = (sesion) => ROLES_ALERTAS.includes(sesion?.rol)

// Todas las máquinas (también las dadas de baja) con su turno en curso y la zona de ese turno
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

// Ficha completa + motivo. idOperador null deja la máquina sin operador
export const editarMaquina = (idMaquina, datos) => enviar('PATCH', `/maquinas/${idMaquina}`, datos)

// Habilitar / deshabilitar: el mismo PATCH enviando solo el estado
export const cambiarEstadoMaquina = (idMaquina, estado, motivo, observacion) =>
  enviar('PATCH', `/maquinas/${idMaquina}`, { estado, motivo, observacion })

// La entrante es de la flota (idMaquinaEntrante) o nueva (maquinaNueva). Sin idOperador, pasa el de la saliente
export const reemplazarMaquina = (idSaliente, datos) => enviar('POST', `/maquinas/${idSaliente}/reemplazo`, datos)

export const listarOperadoresAsignables = () => apiJson('/maquinas/operadores')
export const listarModelosMaquina = () => apiJson('/modelos-maquina')
export const listarTiposMaquina = () => apiJson('/maquinas/tipos')
export const listarMarcasMaquina = () => apiJson('/maquinas/marcas')
