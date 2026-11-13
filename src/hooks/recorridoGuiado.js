import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { marcarRecorridoVisto, obtenerRecorridosVistos } from '../services/recorridosService.js'
import { recorridoDelRol } from '../services/recorridos.js'
import { idUsuarioSesion } from '../services/session.js'

/**
 * Recorrido guiado del rol de la sesión. La primera vez que el usuario entra al panel (su recorrido no está entre
 * los vistos del Backend) se le ofrece con una bienvenida: lo hace o lo omite, y en ambos casos queda marcado como
 * visto. Después se puede repetir desde el botón de ayuda del header.
 * Si el Backend no responde (o aún no tiene la migración) no se ofrece nada: el panel funciona igual.
 * fase: null | 'bienvenida' | 'recorrido'
 */
export function useRecorridoGuiado(sesion) {
  const recorrido = recorridoDelRol(sesion?.rol)
  const idUsuario = idUsuarioSesion(sesion)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const clave = ['perfil', 'recorridos', idUsuario]
  const vistosQuery = useQuery({
    queryKey: clave,
    queryFn: obtenerRecorridosVistos,
    enabled: Boolean(recorrido && idUsuario),
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  })
  // null: lo decide el Backend (pendiente o no); 'cerrado' tras terminarlo u omitirlo en esta visita
  const [faseElegida, setFaseElegida] = useState(null)
  const pendiente = Boolean(recorrido && vistosQuery.data && !vistosQuery.data.vistos?.includes(recorrido.id))
  const fase = faseElegida === 'cerrado' ? null : (faseElegida ?? (pendiente ? 'bienvenida' : null))

  const marcarVisto = () => {
    if (!pendiente) return
    // Al instante en la caché: aunque el Backend falle, no se vuelve a ofrecer en esta visita
    queryClient.setQueryData(clave, (actual) => ({ vistos: [...(actual?.vistos ?? []), recorrido.id] }))
    marcarRecorridoVisto(recorrido.id).catch(() => {})
  }

  const comenzar = () => {
    if (!recorrido) return
    if (pathname !== recorrido.ruta) navigate(recorrido.ruta)
    setFaseElegida('recorrido')
  }

  // Terminado u omitido (desde la bienvenida o a mitad del recorrido)
  const cerrar = () => {
    marcarVisto()
    setFaseElegida('cerrado')
  }

  return { recorrido, fase, comenzar, cerrar }
}
