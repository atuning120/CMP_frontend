import { apiJson } from './api.js'
import { suscribirSocket } from './socket.js'

// Alertas de turno del jefe de turno (GET /alertas), las mismas de la pestaña Alertas de la app móvil:
// - TURNO_EXTENDIDO: el turno llegó a las 10 h
// - JORNADA_EXTENDIDA: el operador sumó 10 h en una jornada de varios turnos
// - CIERRE_AUTOMATICO: el sistema cerró el turno a las 13 h (posible olvido de cierre)
// - MANTENCION: el operador marcó un estado de mantención o falla (en rojo en el mapa); trae `detencion`
//   ({ estado, inicio, fin }, fin null = sigue detenida)
// Los roles que pueden verlas están en flotaService (puedeVerAlertas)

/**
 * Una página de alertas: { alertas, hayMas, activas }. `activas` es lo que requiere acción ahora, sin importar el
 * rango: operadores con más de 10 h trabajadas y máquinas detenidas en mantención o falla. Cada alerta trae `atenciones` ({ usuario, fecha, comentario }, de la primera a la
 * última): vacío es pendiente; la primera es quien la atendió y las siguientes, notas posteriores.
 * tipo: 'TODO' | 'EXTENDIDOS' | 'CIERRES_AUTOMATICOS' | 'MANTENCIONES'. estado: 'TODAS' | 'PENDIENTES' | 'ATENDIDAS'.
 * rango: { desde, hasta } en ISO; hasta es exclusiva y null es "hasta ahora". ultimo: la última alerta recibida
 * (cursor fecha + id).
 */
export function listarAlertas(tipo, rango, ultimo, estado = 'TODAS') {
  const params = new URLSearchParams({ tipo, estado, desde: rango.desde })
  if (rango.hasta) params.set('hasta', rango.hasta)
  if (ultimo) {
    params.set('antes', ultimo.fecha)
    params.set('antesId', ultimo.id)
  }
  return apiJson(`/alertas?${params}`)
}

// Solo el contador de activas (para la pestaña del header): la página más chica posible
export const obtenerAlertasActivas = async () => (await apiJson('/alertas?limite=1')).activas

// Máximo que acepta el Backend
export const LARGO_MAXIMO_COMENTARIO = 500

/**
 * Atiende la alerta (la primera vez; comentario opcional) o le agrega una nota (después; comentario obligatorio).
 * Nada se edita ni se borra. Devuelve { idAlerta, atenciones } con todas sus atenciones.
 * idCliente (UUID): el mismo en cada reintento, para no duplicarla. atencionesVistas: cuántas tenía al atenderla; si
 * otro jefe de turno la atendió entremedio, la del jefe se agrega igual (las dos quedan registradas).
 */
export const atenderAlerta = (idAlerta, comentario, idCliente, atencionesVistas) =>
  apiJson(`/alertas/${encodeURIComponent(idAlerta)}/atenciones`, {
    method: 'POST',
    body: JSON.stringify({ comentario, idCliente, atencionesVistas }),
  })

// Tipos de alerta que muestra cada filtro de la página
const TIPOS_DEL_FILTRO = {
  EXTENDIDOS: ['TURNO_EXTENDIDO', 'JORNADA_EXTENDIDA'],
  CIERRES_AUTOMATICOS: ['CIERRE_AUTOMATICO'],
  MANTENCIONES: ['MANTENCION'],
}

// Si la alerta corresponde al filtro de tipo de la página
export const coincideTipo = (alerta, tipo) => tipo === 'TODO' || (TIPOS_DEL_FILTRO[tipo] ?? []).includes(alerta.tipo)

/**
 * Alertas en tiempo real (Socket.IO, namespace /alertas): `alRecibir` recibe { nuevas, activas } cada vez que
 * aparecen alertas o cambia el contador; `alAtender` recibe { idAlerta, atenciones } cuando alguien (incluido otro
 * jefe de turno) atiende una alerta o le agrega una nota. `alReconectar` avisa cuando la conexión vuelve tras un corte
 * (lo que llegó mientras tanto se perdió). Devuelve la función para desconectarse.
 */
export const suscribirAlertas = ({ alRecibir, alAtender, alReconectar }) =>
  suscribirSocket('/alertas', { alertas: alRecibir, atenciones: alAtender }, alReconectar)
