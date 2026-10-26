import { useEffect, useState } from 'react'

/**
 * true desde que el elemento entra (o está por entrar) en pantalla, y se queda en true: sirve para pedir
 * algo pesado, como una foto, solo cuando hace falta.
 */
export function useEnPantalla(ref, margen = '200px') {
  const [visto, setVisto] = useState(false)

  useEffect(() => {
    const elemento = ref.current
    if (visto || !elemento) return
    const observer = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) setVisto(true)
      },
      { rootMargin: margen },
    )
    observer.observe(elemento)
    return () => observer.disconnect()
  }, [ref, margen, visto])

  return visto
}
