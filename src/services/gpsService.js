import { apiJson } from './api.js'

// GPS instalados en las máquinas (JEFE_TURNO y ADMIN, los mismos que gestionan la flota)

const enviar = (method, path, body) => apiJson(path, { method, body: JSON.stringify(body) })

// [{ idGps, imei, modelo, numeroSim, activo, maquina: { idMaquina, nombre } | null, asignadoDesde, ultimaPosicion: { fechaHora, bateria } | null }]
export const listarGps = () => apiJson('/gps')

// Máquinas en que estuvo un GPS, la más reciente primero: [{ idAsignacion, maquina, desde, hasta | null }]
export const obtenerHistorialGps = (idGps) => apiJson(`/gps/${idGps}/asignaciones`)

// datos: { imei, modelo, numeroSim }
export const registrarGps = (datos) => enviar('POST', '/gps', datos)

// cambios: { modelo, numeroSim, activo }; lo que no viene no se toca
export const editarGps = (idGps, cambios) => enviar('PATCH', `/gps/${idGps}`, cambios)

// Se manda lo que vio el usuario (la máquina en que estaba y el GPS que sale del destino): si otro lo cambió mientras
// tanto, el Backend no aplica el cambio y responde 409 con uno de estos códigos
export const GPS_CAMBIO = ['GPS_MODIFICADO', 'MAQUINA_CON_GPS']

// Vincula el GPS a una máquina o lo mueve desde la que estaba. gpsDestino: el GPS que ya tiene esa máquina, que queda sin máquina
export const asignarGps = (gps, idMaquina, gpsDestino, { motivo, observacion }) =>
  enviar('POST', `/gps/${gps.idGps}/asignacion`, {
    idMaquina,
    idMaquinaActual: gps.maquina?.idMaquina ?? null,
    idGpsDesplazado: gpsDestino?.idGps ?? null,
    motivo,
    observacion,
  })

export const desvincularGps = (gps, { motivo, observacion }) =>
  enviar('POST', `/gps/${gps.idGps}/desvinculacion`, { idMaquinaActual: gps.maquina?.idMaquina ?? null, motivo, observacion })

// El GPS que hoy tiene una máquina
export const gpsDeMaquina = (dispositivos, idMaquina) => dispositivos.find((d) => d.maquina?.idMaquina === idMaquina) ?? null

/**
 * IMEI listo para enviar, o null si no es válido: 15 dígitos con su verificador (Luhn), que detecta un dígito mal
 * copiado. Se aceptan los espacios y guiones de la etiqueta.
 */
export function normalizarImei(valor) {
  const imei = valor.replace(/[\s-]/g, '')
  if (!/^\d{15}$/.test(imei)) return null
  const suma = imei
    .split('')
    .reverse()
    .reduce((total, d, i) => {
      const n = Number(d) * (i % 2 === 1 ? 2 : 1)
      return total + (n > 9 ? n - 9 : n)
    }, 0)
  return suma % 10 === 0 ? imei : null
}

// ── Estado de un GPS, para la sección GPS de la flota ──────────────────────────────────────────────

export const estadoGps = (d) => (d.maquina ? 'vinculado' : d.activo ? 'libre' : 'baja')

// Detenido, el LL301 duerme y puede pasar un turno entero sin reportar: solo después de un día llama la atención
export const HORAS_SIN_REPORTAR = 24
export const BATERIA_BAJA = 20

// Un GPS recién vinculado tiene el mismo plazo para su primera posición. La última puede ser de otra máquina
export const sinReportar = (d, ahora) => {
  if (!d.maquina) return false
  const desde = Math.max(Date.parse(d.asignadoDesde), d.ultimaPosicion ? Date.parse(d.ultimaPosicion.fechaHora) : 0)
  return ahora - desde > HORAS_SIN_REPORTAR * 3_600_000
}

export const bateriaBaja = (d) => Boolean(d.maquina) && typeof d.ultimaPosicion?.bateria === 'number' && d.ultimaPosicion.bateria <= BATERIA_BAJA

export function haceCuanto(fecha, ahora) {
  const minutos = Math.floor((ahora - Date.parse(fecha)) / 60_000)
  if (minutos < 1) return 'Ahora'
  if (minutos < 60) return `Hace ${minutos} min`
  const horas = Math.floor(minutos / 60)
  if (horas < 24) return `Hace ${horas} h`
  const dias = Math.floor(horas / 24)
  return dias === 1 ? 'Hace 1 día' : `Hace ${dias} días`
}

/**
 * GPS que quedaron en una máquina que otra está reemplazando y que no tiene el suyo: [{ gps, sale, entra }]. No se mueven
 * solos porque hay que instalar el equipo en la otra máquina.
 */
export const cambiosSugeridos = (dispositivos, flota) =>
  dispositivos.flatMap((gps) => {
    const sale = flota.find((m) => m.idMaquina === gps.maquina?.idMaquina)
    const entra = sale?.respaldo
    return entra && !gpsDeMaquina(dispositivos, entra.idMaquina) ? [{ gps, sale, entra }] : []
  })
