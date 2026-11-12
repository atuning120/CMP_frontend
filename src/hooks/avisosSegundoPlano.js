import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  contenidoNotificacion,
  desbloquearAudio,
  guardarPreferencia,
  leerPreferencia,
  mostrarNotificacion,
  pedirPermisoNotificaciones,
  permisoNotificaciones,
  pestanaALaVista,
  sonarAviso,
  tituloConContador,
} from '../services/avisosNavegador.js'
import { escucharAlertas } from './alertasEnVivo.js'

// El de index.html ("GeoPlanta · CMP"): ninguna página lo cambia
const TITULO_BASE = document.title

/**
 * Avisa las alertas nuevas que llegan por WebSocket mientras el panel no está a la vista: suma el contador del título
 * siempre y, si el usuario no los desactivó, suena y muestra una notificación del navegador (si dio permiso). Al
 * volver al panel el contador se borra. Lo usa MainLayout para jefes de turno y administradores.
 */
export function useAvisosSegundoPlano(habilitado) {
  const navigate = useNavigate()
  const [activados, setActivados] = useState(leerPreferencia)
  const [permiso, setPermiso] = useState(permisoNotificaciones)
  const [sinVer, setSinVer] = useState(0)
  const activadosRef = useRef(activados)

  useEffect(() => {
    activadosRef.current = activados
  }, [activados])

  // El primer clic o tecla en el panel habilita el audio (antes el navegador no deja sonar)
  useEffect(() => {
    if (!habilitado) return
    const desbloquear = () => void desbloquearAudio()
    window.addEventListener('pointerdown', desbloquear, { once: true })
    window.addEventListener('keydown', desbloquear, { once: true })
    return () => {
      window.removeEventListener('pointerdown', desbloquear)
      window.removeEventListener('keydown', desbloquear)
    }
  }, [habilitado])

  useEffect(() => {
    if (!habilitado) return
    return escucharAlertas({
      alRecibir: (nuevas) => {
        if (pestanaALaVista()) return
        setSinVer((n) => n + nuevas.length)
        if (!activadosRef.current) return
        sonarAviso()
        mostrarNotificacion(contenidoNotificacion(nuevas), () => navigate('/alertas'))
      },
      alReconectar: () => {},
    })
  }, [habilitado, navigate])

  // De vuelta en el panel: lo nuevo ya está en los avisos emergentes y en la lista
  useEffect(() => {
    const alVolver = () => {
      if (pestanaALaVista()) setSinVer(0)
    }
    document.addEventListener('visibilitychange', alVolver)
    window.addEventListener('focus', alVolver)
    return () => {
      document.removeEventListener('visibilitychange', alVolver)
      window.removeEventListener('focus', alVolver)
    }
  }, [])

  useEffect(() => {
    if (!habilitado) return
    document.title = tituloConContador(TITULO_BASE, sinVer)
    return () => {
      document.title = TITULO_BASE
    }
  }, [habilitado, sinVer])

  // Clic del usuario: habilita el audio, pide el permiso de notificaciones si falta y suena una vez como prueba
  const activar = useCallback(async () => {
    guardarPreferencia(true)
    setActivados(true)
    await desbloquearAudio()
    if (permisoNotificaciones() === 'default') setPermiso(await pedirPermisoNotificaciones())
    sonarAviso()
  }, [])

  const desactivar = useCallback(() => {
    guardarPreferencia(false)
    setActivados(false)
  }, [])

  return { activados, permiso, activar, desactivar }
}
