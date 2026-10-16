import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import styles from './SelectorEstado.module.css'

/**
 * Selector del estado de una máquina con el punto de color de cada estado (un <select> nativo no
 * puede mostrarlo). La lista flota sobre el resto del formulario (position: fixed), así no la recorta
 * el scroll del panel ni empuja los campos de abajo.
 * opciones: elementos de ESTADOS_MAQUINA ({ valor, etiqueta, clase }). valor '' = sin elegir.
 */
function SelectorEstado({ valor, opciones, onCambio, placeholder = 'Elegir estado…', etiqueta }) {
  const [abierto, setAbierto] = useState(false)
  const [activo, setActivo] = useState(0)
  const raizRef = useRef(null)
  const listaRef = useRef(null)
  const id = useId()
  const elegido = opciones.find((o) => o.valor === valor)

  // Un clic fuera del selector lo cierra
  useEffect(() => {
    if (!abierto) return
    const alClic = (e) => !raizRef.current?.contains(e.target) && setAbierto(false)
    document.addEventListener('mousedown', alClic)
    return () => document.removeEventListener('mousedown', alClic)
  }, [abierto])

  // Ubica la lista bajo el botón (o sobre él si abajo no cabe) y la sigue al hacer scroll o cambiar el tamaño
  useLayoutEffect(() => {
    if (!abierto) return
    const lista = listaRef.current
    const boton = raizRef.current.querySelector('button')
    const ubicar = () => {
      const r = boton.getBoundingClientRect()
      const margen = 8
      const abajo = window.innerHeight - r.bottom - margen
      const arriba = r.top - margen
      const haciaArriba = abajo < Math.min(lista.scrollHeight, 240) && arriba > abajo
      const alto = Math.max(120, haciaArriba ? arriba : abajo)
      lista.style.setProperty('--izquierda', `${r.left}px`)
      lista.style.setProperty('--ancho', `${r.width}px`)
      lista.style.setProperty('--alto-maximo', `${alto - 4}px`)
      lista.style.setProperty('--arriba', haciaArriba ? 'auto' : `${r.bottom + 4}px`)
      lista.style.setProperty('--abajo', haciaArriba ? `${window.innerHeight - r.top + 4}px` : 'auto')
    }
    ubicar()
    lista.focus()
    window.addEventListener('resize', ubicar)
    // capture: también el scroll del cuerpo del panel lateral
    window.addEventListener('scroll', ubicar, true)
    return () => {
      window.removeEventListener('resize', ubicar)
      window.removeEventListener('scroll', ubicar, true)
    }
  }, [abierto])

  const abrir = () => {
    setActivo(Math.max(0, opciones.findIndex((o) => o.valor === valor)))
    setAbierto(true)
  }

  const elegir = (opcion) => {
    onCambio(opcion.valor)
    setAbierto(false)
    raizRef.current?.querySelector('button')?.focus()
  }

  const alTeclear = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const paso = e.key === 'ArrowDown' ? 1 : -1
      setActivo((i) => (i + paso + opciones.length) % opciones.length)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      elegir(opciones[activo])
    } else if (e.key === 'Escape') {
      // Esc cierra la lista, no el panel lateral
      e.preventDefault()
      e.stopPropagation()
      setAbierto(false)
      raizRef.current?.querySelector('button')?.focus()
    } else if (e.key === 'Tab') {
      setAbierto(false)
    }
  }

  return (
    <div ref={raizRef} className={styles.selectorEstado}>
      <button
        type="button"
        className={`${styles.boton} ${abierto ? styles.botonAbierto : ''}`}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-controls={`${id}-lista`}
        aria-label={etiqueta}
        onClick={() => (abierto ? setAbierto(false) : abrir())}
        onKeyDown={(e) => {
          if (!abierto && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault()
            abrir()
          }
        }}
      >
        {elegido ? (
          <span className={styles.opcionTexto}>
            <span className={`${styles.punto} ${styles[elegido.clase]}`} />
            {elegido.etiqueta}
          </span>
        ) : (
          <span className={styles.placeholder}>{placeholder}</span>
        )}
        <ChevronDown size={18} className={styles.chevron} />
      </button>

      {abierto && (
        <ul
          ref={listaRef}
          id={`${id}-lista`}
          className={styles.lista}
          role="listbox"
          tabIndex={-1}
          aria-label={etiqueta}
          aria-activedescendant={`${id}-${activo}`}
          onKeyDown={alTeclear}
        >
          {opciones.map((o, i) => (
            <li
              key={o.valor}
              id={`${id}-${i}`}
              role="option"
              aria-selected={o.valor === valor}
              className={`${styles.opcion} ${i === activo ? styles.opcionActiva : ''} ${o.valor === valor ? styles.opcionElegida : ''}`}
              onMouseEnter={() => setActivo(i)}
              onClick={() => elegir(o)}
            >
              <span className={`${styles.punto} ${styles[o.clase]}`} />
              {o.etiqueta}
              {o.valor === valor && <Check size={16} className={styles.check} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default SelectorEstado
