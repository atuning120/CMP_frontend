import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { buscarAncla, describirAncla, ubicar } from './tooltip.js'
import styles from './Tooltip.module.css'

const ESPERA_MS = 300
// Al pasar de un botón al de al lado, la siguiente aparece sin espera
const GRACIA_MS = 400

/**
 * Etiqueta emergente de todo el panel; se monta una vez, en main.jsx. Cualquier elemento la usa con atributos:
 * - data-tooltip: texto (o título, si hay detalle)
 * - data-tooltip-detalle: explicación bajo el título
 * - data-tooltip-lado: 'arriba' (por defecto), 'abajo', 'derecha' o 'izquierda'; si no cabe, va al lado opuesto
 * - data-tooltip-recortado: solo se muestra si el texto del elemento no cabe y sale cortado
 * Es un popover: va en la top layer, así ninguna tabla con scroll la recorta y se ve sobre los <dialog>.
 * Un botón que solo tiene ícono necesita además su aria-label.
 */
function Tooltip() {
  const [visible, setVisible] = useState(null)
  const nodoRef = useRef(null)
  const id = useId()

  useEffect(() => {
    // El elemento bajo el mouse o con el foco; mientras no cambie, no se vuelve a mostrar tras un clic o Esc
    let ancla = null
    let espera = null
    let mostrado = false
    let ocultadoEn = -Infinity

    const ocultar = () => {
      clearTimeout(espera)
      if (!mostrado) return
      mostrado = false
      ocultadoEn = performance.now()
      setVisible(null)
    }

    const mostrar = () => {
      const datos = ancla?.isConnected ? describirAncla(ancla) : null
      if (!datos) {
        ocultar()
        return
      }
      mostrado = true
      setVisible(datos)
    }

    const cambiarAncla = (nueva, demora) => {
      if (nueva === ancla) return
      ancla = nueva
      clearTimeout(espera)
      if (!nueva) ocultar()
      else if (mostrado || performance.now() - ocultadoEn < GRACIA_MS) mostrar()
      else espera = setTimeout(mostrar, demora)
    }

    const alPasar = (e) => {
      // Con el dedo no hay hover: aparecería encima de lo que se acaba de tocar
      if (e.pointerType !== 'touch') cambiarAncla(buscarAncla(e.target), ESPERA_MS)
    }
    const alSalir = (e) => {
      if (!e.relatedTarget) cambiarAncla(null)
    }
    const alEnfocar = (e) => {
      // Solo con teclado: con el mouse ya la muestra el hover
      if (e.target.matches(':focus-visible')) cambiarAncla(buscarAncla(e.target), 0)
    }
    const alDesenfocar = (e) => {
      if (ancla && ancla === buscarAncla(e.target) && !ancla.matches(':hover')) cambiarAncla(null)
    }
    const alTeclear = (e) => {
      if (['Escape', 'Enter', ' '].includes(e.key)) ocultar()
    }
    const alDesplazar = (e) => {
      if (ancla && e.target.contains(ancla)) ocultar()
    }

    document.addEventListener('pointerover', alPasar)
    document.addEventListener('pointerout', alSalir)
    document.addEventListener('pointerdown', ocultar, true)
    document.addEventListener('focusin', alEnfocar)
    document.addEventListener('focusout', alDesenfocar)
    document.addEventListener('keydown', alTeclear, true)
    document.addEventListener('scroll', alDesplazar, true)
    window.addEventListener('resize', ocultar)
    return () => {
      clearTimeout(espera)
      document.removeEventListener('pointerover', alPasar)
      document.removeEventListener('pointerout', alSalir)
      document.removeEventListener('pointerdown', ocultar, true)
      document.removeEventListener('focusin', alEnfocar)
      document.removeEventListener('focusout', alDesenfocar)
      document.removeEventListener('keydown', alTeclear, true)
      document.removeEventListener('scroll', alDesplazar, true)
      window.removeEventListener('resize', ocultar)
    }
  }, [])

  useLayoutEffect(() => {
    const nodo = nodoRef.current
    if (!nodo.showPopover) return undefined
    const abierto = nodo.matches(':popover-open')
    if (!visible) {
      if (abierto) nodo.hidePopover()
      return undefined
    }
    if (!abierto) nodo.showPopover()

    const { ancla, texto, detalle, lado } = visible
    const posicion = ubicar(
      ancla.getBoundingClientRect(),
      { ancho: nodo.offsetWidth, alto: nodo.offsetHeight },
      { ancho: document.documentElement.clientWidth, alto: window.innerHeight },
      lado,
    )
    nodo.dataset.lado = posicion.lado
    nodo.style.setProperty('--tooltip-x', `${posicion.x}px`)
    nodo.style.setProperty('--tooltip-y', `${posicion.y}px`)
    nodo.style.setProperty('--tooltip-flecha', `${posicion.flecha}px`)

    // El lector de pantalla la lee como descripción, salvo que repita el nombre del elemento
    const describe = (detalle || texto !== ancla.getAttribute('aria-label')) && !ancla.hasAttribute('aria-describedby')
    if (!describe) return undefined
    ancla.setAttribute('aria-describedby', id)
    return () => ancla.removeAttribute('aria-describedby')
  }, [visible, id])

  return (
    <div ref={nodoRef} id={id} role="tooltip" popover="manual" className={styles.tooltip}>
      <span className={visible?.detalle ? styles.titulo : styles.texto}>{visible?.texto}</span>
      {visible?.detalle && <span className={styles.detalle}>{visible.detalle}</span>}
    </div>
  )
}

export default Tooltip
