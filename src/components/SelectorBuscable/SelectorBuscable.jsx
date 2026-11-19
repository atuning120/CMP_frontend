import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Plus, Search, SearchX, X } from 'lucide-react'
import { buscar } from './busqueda.js'
import styles from './SelectorBuscable.module.css'

const identidad = (x) => x

/** Etiqueta con los tramos que coinciden con la búsqueda resaltados. */
function TextoResaltado({ texto, rangos }) {
  if (rangos.length === 0) return texto
  const partes = []
  let cursor = 0
  rangos.forEach(([inicio, fin]) => {
    if (inicio > cursor) partes.push(texto.slice(cursor, inicio))
    partes.push(
      <mark key={inicio} className={styles.resaltado}>
        {texto.slice(inicio, fin)}
      </mark>,
    )
    cursor = fin
  })
  if (cursor < texto.length) partes.push(texto.slice(cursor))
  return partes
}

/**
 * Combobox como el de la app: el mismo campo despliega las opciones y permite escribir para filtrarlas (sin
 * acentos ni mayúsculas, palabras en cualquier orden). La lista flota sobre el formulario (position: fixed),
 * así no la recorta el scroll del panel lateral.
 * valor: la clave de la opción elegida (una que no está en la lista = ninguna). onCambio(clave | null).
 * accionFinal: { texto, onClick(consulta) } fija al final de la lista (p. ej. crear una opción nueva).
 */
function SelectorBuscable({
  etiqueta,
  placeholder,
  opciones,
  valor,
  onCambio,
  claveDe = identidad,
  etiquetaDe = identidad,
  descripcionDe,
  vacio = 'No hay opciones disponibles',
  ayuda,
  accionFinal,
  limpiable = true,
}) {
  const id = useId()
  const inputRef = useRef(null)
  const campoRef = useRef(null)
  const listaRef = useRef(null)
  const [abierto, setAbierto] = useState(false)
  const [consulta, setConsulta] = useState('')
  // Mientras no se escriba se muestran todas las opciones, aunque el campo tenga la selección actual
  const [escribiendo, setEscribiendo] = useState(false)
  const [activo, setActivo] = useState(0)

  const elegida = valor == null ? undefined : opciones.find((o) => claveDe(o) === valor)
  const textoElegida = elegida ? etiquetaDe(elegida) : ''
  const busqueda = escribiendo ? consulta.trim() : ''
  const resultados = useMemo(() => buscar(opciones, etiquetaDe, busqueda), [opciones, etiquetaDe, busqueda])
  // La acción final se recorre con el teclado como una opción más, la última
  const total = resultados.length + (accionFinal ? 1 : 0)

  const abrir = () => {
    setConsulta(textoElegida)
    setEscribiendo(false)
    setActivo(Math.max(0, opciones.findIndex((o) => claveDe(o) === valor)))
    setAbierto(true)
  }

  const cerrar = () => {
    setAbierto(false)
    setEscribiendo(false)
    setConsulta('')
  }

  const elegir = (item) => {
    onCambio(claveDe(item))
    cerrar()
  }

  const ejecutarAccion = () => {
    const texto = busqueda
    cerrar()
    accionFinal.onClick(texto)
  }

  const limpiar = () => {
    onCambio(null)
    setConsulta('')
    setEscribiendo(false)
    inputRef.current?.focus()
  }

  // Ubica la lista bajo el campo (o sobre él si abajo no cabe) y la sigue al hacer scroll o cambiar el tamaño
  useLayoutEffect(() => {
    if (!abierto) return
    const lista = listaRef.current
    const ubicar = () => {
      const r = campoRef.current.getBoundingClientRect()
      const margen = 8
      const abajo = window.innerHeight - r.bottom - margen
      const arriba = r.top - margen
      const haciaArriba = abajo < Math.min(lista.scrollHeight, 280) && arriba > abajo
      lista.style.setProperty('--izquierda', `${r.left}px`)
      lista.style.setProperty('--ancho', `${r.width}px`)
      lista.style.setProperty('--alto-maximo', `${Math.max(160, haciaArriba ? arriba : abajo) - 4}px`)
      lista.style.setProperty('--arriba', haciaArriba ? 'auto' : `${r.bottom + 6}px`)
      lista.style.setProperty('--abajo', haciaArriba ? `${window.innerHeight - r.top + 6}px` : 'auto')
    }
    ubicar()
    window.addEventListener('resize', ubicar)
    // capture: también el scroll del cuerpo del panel lateral
    window.addEventListener('scroll', ubicar, true)
    return () => {
      window.removeEventListener('resize', ubicar)
      window.removeEventListener('scroll', ubicar, true)
    }
  }, [abierto, total])

  // La opción activa (teclado) siempre a la vista
  useEffect(() => {
    if (abierto) document.getElementById(`${id}-${activo}`)?.scrollIntoView({ block: 'nearest' })
  }, [abierto, activo, id])

  const alTeclear = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!abierto) return abrir()
      if (total === 0) return
      const paso = e.key === 'ArrowDown' ? 1 : -1
      setActivo((i) => (i + paso + total) % total)
    } else if (e.key === 'Enter' && abierto) {
      // No envía el formulario: elige la opción activa
      e.preventDefault()
      if (activo < resultados.length) elegir(resultados[activo].item)
      else if (accionFinal) ejecutarAccion()
    } else if (e.key === 'Escape' && abierto) {
      // Esc cierra la lista, no el panel lateral
      e.preventDefault()
      e.stopPropagation()
      cerrar()
    } else if (e.key === 'Tab') {
      cerrar()
    }
  }

  // Los clics en la lista no le quitan el foco al campo (si no, el blur la cerraría antes del clic)
  const sinQuitarFoco = (e) => e.preventDefault()

  const hayTexto = abierto ? consulta.length > 0 : Boolean(elegida)

  return (
    <div className={styles.selectorBuscable}>
      <label className={styles.label} htmlFor={`${id}-campo`}>
        {etiqueta}
      </label>
      <div ref={campoRef} className={`${styles.campo} ${abierto ? styles.campoAbierto : ''}`}>
        <Search size={17} className={styles.lupa} aria-hidden />
        <input
          ref={inputRef}
          id={`${id}-campo`}
          className={styles.input}
          role="combobox"
          aria-expanded={abierto}
          aria-controls={`${id}-lista`}
          aria-autocomplete="list"
          aria-activedescendant={abierto && total > 0 ? `${id}-${activo}` : undefined}
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder}
          value={abierto ? consulta : textoElegida}
          onFocus={(e) => {
            abrir()
            e.target.select()
          }}
          onClick={() => !abierto && abrir()}
          onBlur={cerrar}
          onChange={(e) => {
            setConsulta(e.target.value)
            setEscribiendo(true)
            setActivo(0)
            setAbierto(true)
          }}
          onKeyDown={alTeclear}
        />
        {hayTexto && limpiable && (
          <button
            type="button"
            className={styles.icono}
            tabIndex={-1}
            aria-label="Limpiar"
            onMouseDown={sinQuitarFoco}
            onClick={limpiar}
          >
            <X size={16} />
          </button>
        )}
        <button
          type="button"
          className={`${styles.icono} ${styles.chevron}`}
          tabIndex={-1}
          aria-label={abierto ? 'Cerrar lista' : 'Abrir lista'}
          onMouseDown={sinQuitarFoco}
          onClick={() => {
            if (abierto) return cerrar()
            // Si el campo ya tenía el foco (tras elegir), focus() no dispara onFocus
            inputRef.current?.focus()
            abrir()
          }}
        >
          <ChevronDown size={18} />
        </button>
      </div>
      {ayuda && <span className={styles.ayuda}>{ayuda}</span>}

      {abierto && (
        <div ref={listaRef} className={styles.lista} onMouseDown={sinQuitarFoco}>
          {resultados.length > 0 && (
            <div className={styles.encabezado}>
              <span>{busqueda ? 'Coincidencias' : 'Todas las opciones'}</span>
              <span>
                {resultados.length} de {opciones.length}
              </span>
            </div>
          )}
          {resultados.length === 0 ? (
            <div className={styles.estado}>
              <SearchX size={22} className={styles.estadoIcono} />
              {busqueda ? `Sin coincidencias para «${busqueda}»` : vacio}
            </div>
          ) : (
            <ul id={`${id}-lista`} className={styles.opciones} role="listbox" aria-label={etiqueta}>
              {resultados.map(({ item, rangos }, i) => {
                const clave = claveDe(item)
                const esElegida = clave === valor
                const descripcion = descripcionDe?.(item)
                return (
                  <li
                    key={clave}
                    id={`${id}-${i}`}
                    role="option"
                    aria-selected={esElegida}
                    className={`${styles.opcion} ${i === activo ? styles.opcionActiva : ''} ${esElegida ? styles.opcionElegida : ''}`}
                    onMouseEnter={() => setActivo(i)}
                    onClick={() => elegir(item)}
                  >
                    <span className={styles.opcionTextos}>
                      <span className={styles.opcionEtiqueta}>
                        <TextoResaltado texto={etiquetaDe(item)} rangos={rangos} />
                      </span>
                      {descripcion && <span className={styles.opcionDescripcion}>{descripcion}</span>}
                    </span>
                    {esElegida && <Check size={16} className={styles.check} />}
                  </li>
                )
              })}
            </ul>
          )}
          {accionFinal && (
            <button
              type="button"
              id={`${id}-${resultados.length}`}
              tabIndex={-1}
              className={`${styles.accion} ${activo === resultados.length ? styles.accionActiva : ''}`}
              onMouseEnter={() => setActivo(resultados.length)}
              onClick={ejecutarAccion}
            >
              <span className={styles.accionIcono}>
                <Plus size={15} />
              </span>
              {accionFinal.texto}
              {busqueda && <span className={styles.accionConsulta}>«{busqueda}»</span>}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default SelectorBuscable
