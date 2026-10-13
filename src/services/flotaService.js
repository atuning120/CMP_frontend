import { apiJson } from './api.js'

// Todas las máquinas (también las dadas de baja) con su turno en curso y la zona de ese turno
export const obtenerFlota = () => apiJson('/maquinas/flota')

/**
 * Ids de las máquinas con un turno extendido (más de 10 h) que sigue en curso.
 * Un VISOR no tiene acceso a las alertas: en ese caso se devuelve un conjunto vacío.
 */
export async function obtenerMaquinasConAlerta() {
  try {
    const { alertas } = await apiJson('/alertas?tipo=EXTENDIDOS&limite=50')
    return new Set(alertas.filter((a) => a.turno.estado === 'EN_CURSO').map((a) => a.maquina.id))
  } catch {
    return new Set()
  }
}
