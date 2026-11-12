import { describirAlerta, textoAlerta } from '../components/AlertaItem/describirAlerta.js'

/*
 * Avisos de alertas nuevas cuando el panel no está a la vista (otra pestaña u otra ventana): notificación del
 * navegador, un sonido corto y el contador en el título de la pestaña. Funcionan mientras la pestaña esté abierta;
 * con el navegador cerrado haría falta Web Push (service worker), que todavía no existe.
 */

// Preferencia de cada usuario en su navegador: avisos con sonido y notificación activados (por defecto sí)
const CLAVE_PREFERENCIA = 'avisos.activados'
// Líneas de alertas que entran en una notificación con varias
const MAXIMO_LINEAS = 3

export const leerPreferencia = () => {
  try {
    return localStorage.getItem(CLAVE_PREFERENCIA) !== '0'
  } catch {
    return true
  }
}

export const guardarPreferencia = (activados) => {
  try {
    localStorage.setItem(CLAVE_PREFERENCIA, activados ? '1' : '0')
  } catch {
    // Sin localStorage la preferencia dura solo esta visita
  }
}

// El jefe de turno no está mirando el panel: la pestaña está oculta o la ventana no tiene el foco
export const pestanaALaVista = () => !document.hidden && document.hasFocus()

// 'granted' | 'denied' | 'default' | 'no-soportado'
export const permisoNotificaciones = () => ('Notification' in window ? Notification.permission : 'no-soportado')

// El navegador solo muestra la pregunta tras un clic del usuario
export const pedirPermisoNotificaciones = async () => {
  if (!('Notification' in window)) return 'no-soportado'
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

// Título de la pestaña con las alertas que llegaron sin que nadie las viera: "(3) GeoPlanta · CMP"
export const tituloConContador = (base, cantidad) => (cantidad > 0 ? `(${cantidad}) ${base}` : base)

/**
 * Texto de la notificación. Una alerta: qué pasó y su estado; varias: una línea por alerta (hasta MAXIMO_LINEAS).
 * El tag hace que otra pestaña del panel que reciba lo mismo reemplace la notificación en vez de duplicarla.
 */
export function contenidoNotificacion(nuevas) {
  if (nuevas.length === 1) {
    const [alerta] = nuevas
    return {
      titulo: 'Nueva alerta · GeoPlanta',
      cuerpo: `${textoAlerta(alerta)}\n${describirAlerta(alerta).etiqueta}`,
      tag: `alerta-${alerta.id}`,
    }
  }
  const lineas = nuevas.slice(0, MAXIMO_LINEAS).map(textoAlerta)
  if (nuevas.length > MAXIMO_LINEAS) lineas.push(`y ${nuevas.length - MAXIMO_LINEAS} más`)
  return {
    titulo: `${nuevas.length} alertas nuevas · GeoPlanta`,
    cuerpo: lineas.join('\n'),
    tag: `alertas-${nuevas.map((a) => a.id).join(',')}`,
  }
}

export function mostrarNotificacion({ titulo, cuerpo, tag }, alClic) {
  if (permisoNotificaciones() !== 'granted') return
  try {
    const notificacion = new Notification(titulo, { body: cuerpo, tag, icon: '/favicon.png' })
    notificacion.onclick = () => {
      window.focus()
      alClic?.()
      notificacion.close()
    }
  } catch {
    // Chrome en Android solo acepta notificaciones desde un service worker: ahí quedan el sonido y el título
  }
}

// El navegador no deja sonar audio hasta que el usuario hace un clic o toca una tecla en la página
let audio = null

export const desbloquearAudio = async () => {
  try {
    audio ??= new AudioContext()
    if (audio.state === 'suspended') await audio.resume()
  } catch {
    // Sin Web Audio no hay sonido; la notificación y el título siguen
  }
}

// Dos tonos cortos ascendentes (~0,35 s), generados en el momento: no hay archivo de audio que cargar
export function sonarAviso() {
  if (audio?.state !== 'running') return
  const inicio = audio.currentTime
  ;[
    [880, 0],
    [1320, 0.17],
  ].forEach(([frecuencia, desfase]) => {
    const oscilador = audio.createOscillator()
    const volumen = audio.createGain()
    oscilador.type = 'sine'
    oscilador.frequency.value = frecuencia
    volumen.gain.setValueAtTime(0.0001, inicio + desfase)
    volumen.gain.exponentialRampToValueAtTime(0.2, inicio + desfase + 0.02)
    volumen.gain.exponentialRampToValueAtTime(0.0001, inicio + desfase + 0.16)
    oscilador.connect(volumen).connect(audio.destination)
    oscilador.start(inicio + desfase)
    oscilador.stop(inicio + desfase + 0.18)
  })
}
