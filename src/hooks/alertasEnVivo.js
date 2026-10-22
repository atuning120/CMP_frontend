import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { suscribirAlertas } from '../services/alertasService.js'
import { CLAVES } from './consultas.js'

// Avisos emergentes a la vez: si llegan más, se descartan los más antiguos
const MAX_AVISOS = 3

// Páginas que muestran las alertas (la lista de /alertas): reciben las nuevas sin abrir otra conexión
const oyentes = new Set()

/**
 * Recibe las alertas en tiempo real que llegan a la conexión del layout: `alRecibir(nuevas)` con cada lote y
 * `alReconectar()` cuando la conexión vuelve tras un corte (lo que llegó mientras tanto se perdió).
 * Devuelve la función para dejar de escuchar.
 */
export function escucharAlertas(oyente) {
  oyentes.add(oyente)
  return () => oyentes.delete(oyente)
}

/**
 * Una sola conexión al namespace /alertas mientras dure la sesión (la abre MainLayout para jefes de turno y
 * administradores). Mantiene al día el contador de la pestaña y las máquinas con alerta del mapa, reparte las nuevas
 * a las páginas que escuchan y devuelve los avisos emergentes pendientes. Con `silenciar` (la página de alertas está
 * a la vista) no se suman avisos: las nuevas ya aparecen en la lista.
 */
export function useAlertasEnVivo(habilitado, silenciar) {
  const queryClient = useQueryClient()
  const [avisos, setAvisos] = useState([])
  const silenciarRef = useRef(silenciar)
  const [silenciadoAntes, setSilenciadoAntes] = useState(silenciar)

  // Al entrar a la página de alertas se descartan los avisos pendientes (ajuste durante el render, sin efecto)
  if (silenciar !== silenciadoAntes) {
    setSilenciadoAntes(silenciar)
    if (silenciar) setAvisos([])
  }

  useEffect(() => {
    silenciarRef.current = silenciar
  }, [silenciar])

  useEffect(() => {
    if (!habilitado) return
    const desuscribir = suscribirAlertas({
      alRecibir: ({ nuevas, activas }) => {
        queryClient.setQueryData(CLAVES.alertasActivas, activas)
        // El contador cambia también cuando un turno extendido se cierra: el mapa vuelve a pedir sus máquinas con alerta
        queryClient.invalidateQueries({ queryKey: CLAVES.alertas, exact: true })
        if (nuevas.length === 0) return
        oyentes.forEach((o) => o.alRecibir(nuevas))
        if (silenciarRef.current) return
        setAvisos((actuales) => {
          const ids = new Set(nuevas.map((a) => a.id))
          return [...nuevas, ...actuales.filter((a) => !ids.has(a.id))].slice(0, MAX_AVISOS)
        })
      },
      alReconectar: () => {
        queryClient.invalidateQueries({ queryKey: CLAVES.alertas })
        oyentes.forEach((o) => o.alReconectar())
      },
    })
    return () => {
      desuscribir()
      setAvisos([])
    }
  }, [habilitado, queryClient])

  const descartarAviso = useCallback((id) => setAvisos((actuales) => actuales.filter((a) => a.id !== id)), [])

  return { avisos, descartarAviso }
}
