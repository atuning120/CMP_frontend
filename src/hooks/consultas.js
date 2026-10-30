import { useQuery } from '@tanstack/react-query'
import {
  listarMarcasMaquina,
  listarModelosMaquina,
  listarOperadoresAsignables,
  listarTiposMaquina,
  obtenerFlota,
  obtenerMaquinasConAlerta,
} from '../services/flotaService.js'
import { obtenerAlertasActivas } from '../services/alertasService.js'
import { obtenerMapa } from '../services/geocercasService.js'
import { listarUsuarios } from '../services/usuariosService.js'
import { obtenerEvidencia } from '../services/evidenciasService.js'
import { listarCargasEp, obtenerDashboard } from '../services/dashboardsService.js'
import { mensajeDeError } from '../services/errores.js'

// Claves de la caché: las páginas que piden lo mismo (la flota en el mapa y en /flota) comparten la respuesta
export const CLAVES = {
  flota: ['flota'],
  alertas: ['alertas'],
  // Dentro de 'alertas': invalidar las alertas también refresca el contador
  alertasActivas: ['alertas', 'activas'],
  catalogos: ['catalogos'],
  geocercas: ['geocercas'],
  gps: ['gps'],
  usuarios: ['usuarios'],
  evidencias: ['evidencias'],
  dashboards: ['dashboards'],
  // Dentro de 'dashboards': confirmar una carga refresca la lista y las URL firmadas
  cargasEp: ['dashboards', 'cargas'],
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

// Operadores con más de 10 h trabajadas ahora mismo (contador de la pestaña Alertas); el WebSocket lo mantiene al día
export const useAlertasActivas = (habilitado) =>
  useQuery({ queryKey: CLAVES.alertasActivas, queryFn: obtenerAlertasActivas, enabled: habilitado })

export const useCatalogos = () => useQuery({ queryKey: CLAVES.catalogos, queryFn: obtenerCatalogos })

export const useGeocercas = () =>
  useQuery({ queryKey: CLAVES.geocercas, queryFn: obtenerMapa, staleTime: VIGENCIA_GEOCERCAS_MS })

export const useUsuarios = () => useQuery({ queryKey: CLAVES.usuarios, queryFn: listarUsuarios })

// Un refresco que falla no tapa lo que ya se muestra: el error solo se informa si no hay datos que mostrar
export const errorSinDatos = (consulta) =>
  consulta.data === undefined && consulta.error ? mensajeDeError(consulta.error, 'No se pudo cargar la información.') : null

// Una foto de evidencia no cambia nunca: se descarga una vez y se reutiliza mientras se navega el historial.
// Pasados unos minutos sin mostrarse se libera (son data URL de varios cientos de KB)
export const useEvidencia = (idEvidencia, { enabled = true } = {}) =>
  useQuery({
    queryKey: [...CLAVES.evidencias, idEvidencia],
    queryFn: () => obtenerEvidencia(idEvidencia),
    enabled,
    staleTime: Infinity,
    gcTime: 5 * 60_000,
    retry: 1,
  })

// La URL firmada del dashboard vence en una hora: se pide otra antes. Sin reintentos si Metabase no está configurado
const RENOVAR_DASHBOARD_MS = 55 * 60_000
// Metabase escala a 0 y tarda 1–2 min en arrancar: mientras tanto el Backend responde METABASE_NO_DISPONIBLE y se
// reintenta cada 5 s (más los 5 s que espera el Backend) por unos 3 min antes de mostrar el error
const REINTENTOS_ARRANQUE_METABASE = 18
const ESPERA_ARRANQUE_METABASE_MS = 5000
const reintentarDashboard = (intentos, error) => {
  if (error?.code === 'METABASE_NO_DISPONIBLE') return intentos < REINTENTOS_ARRANQUE_METABASE
  return error?.status !== 503 && error?.status !== 404 && intentos < 2
}

export const useDashboard = (tipo, periodo, { enabled = true } = {}) =>
  useQuery({
    queryKey: [...CLAVES.dashboards, tipo, periodo ?? null],
    queryFn: () => obtenerDashboard(tipo, periodo),
    enabled,
    staleTime: RENOVAR_DASHBOARD_MS,
    refetchInterval: RENOVAR_DASHBOARD_MS,
    // Volver a la pestaña no debe recargar el iframe (se perderían los filtros que el usuario movió)
    refetchOnWindowFocus: false,
    retry: reintentarDashboard,
    retryDelay: (intentos, error) =>
      error?.code === 'METABASE_NO_DISPONIBLE' ? ESPERA_ARRANQUE_METABASE_MS : Math.min(1000 * 2 ** intentos, 30_000),
  })

export const useCargasEp = ({ enabled = true } = {}) => useQuery({ queryKey: CLAVES.cargasEp, queryFn: listarCargasEp, enabled })
