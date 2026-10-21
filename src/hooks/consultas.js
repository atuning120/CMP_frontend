import { useQuery } from '@tanstack/react-query'
import {
  listarMarcasMaquina,
  listarModelosMaquina,
  listarOperadoresAsignables,
  listarTiposMaquina,
  obtenerFlota,
  obtenerMaquinasConAlerta,
} from '../services/flotaService.js'
import { obtenerMapa } from '../services/geocercasService.js'
import { listarUsuarios } from '../services/usuariosService.js'

// Claves de la caché: las páginas que piden lo mismo (la flota en el mapa y en /flota) comparten la respuesta
export const CLAVES = {
  flota: ['flota'],
  alertas: ['alertas'],
  catalogos: ['catalogos'],
  geocercas: ['geocercas'],
  gps: ['gps'],
  usuarios: ['usuarios'],
}

// Las geocercas casi no cambian y sus polígonos son lo más pesado: se dan por vigentes 5 minutos
const VIGENCIA_GEOCERCAS_MS = 5 * 60_000

// Tipos, marcas, modelos y operadores asignables: los formularios de la flota
const obtenerCatalogos = async () => {
  const [tipos, marcas, modelos, operadores] = await Promise.all([
    listarTiposMaquina(),
    listarMarcasMaquina(),
    listarModelosMaquina(),
    listarOperadoresAsignables(),
  ])
  return { tipos, marcas, modelos, operadores }
}

export const useFlota = (opciones) => useQuery({ queryKey: CLAVES.flota, queryFn: obtenerFlota, ...opciones })

// Conjunto de ids de máquinas con turno extendido (vacío para un VISOR)
export const useMaquinasConAlerta = (opciones) =>
  useQuery({ queryKey: CLAVES.alertas, queryFn: obtenerMaquinasConAlerta, ...opciones })

export const useCatalogos = () => useQuery({ queryKey: CLAVES.catalogos, queryFn: obtenerCatalogos })

export const useGeocercas = () =>
  useQuery({ queryKey: CLAVES.geocercas, queryFn: obtenerMapa, staleTime: VIGENCIA_GEOCERCAS_MS })

export const useUsuarios = () => useQuery({ queryKey: CLAVES.usuarios, queryFn: listarUsuarios })

// Un refresco que falla no tapa lo que ya se muestra: el error solo se informa si no hay datos que mostrar
export const errorSinDatos = (consulta) => (consulta.data === undefined ? (consulta.error?.message ?? null) : null)
