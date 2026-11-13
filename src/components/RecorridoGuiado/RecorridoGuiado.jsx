import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { pasosDePantalla } from '../../services/recorridos.js'
import styles from './RecorridoGuiado.module.css'

// Distancias en px: borde de la pantalla, foco–tarjeta y holgura del foco alrededor del elemento
const MARGEN = 12
const SEPARACION = 14
const HOLGURA = 6
// Lo que se espera a que aparezca el elemento de un paso (p. ej. el mapa cargándose) antes de saltarlo. Si ya está
// pero oculto (display: none en esta pantalla), se espera poco: solo por si es un panel a medio expandir
const ESPERA_OBJETIVO_MS = 2500
const ESPERA_OCULTO_MS = 300
// Teléfono: la tarjeta va como hoja, arriba o abajo según dónde quede el foco
const MOVIL = '(max-width: 640px)'
const LADOS = ['derecha', 'abajo', 'izquierda', 'arriba']

const sinMovimiento = () => matchMedia('(prefers-reduced-motion: reduce)').matches

// Elemento marcado con data-recorrido="<objetivo>": { el } si se ve, { oculto: true } si está pero sin tamaño, o null
const buscarObjetivo = (objetivo) => {
  const el = document.querySelector(`[data-recorrido="${objetivo}"]`)
  if (!el) return null
  const r = el.getBoundingClientRect()
  return r.width > 0 && r.height > 0 ? { el } : { oculto: true }
}

const limitar = (valor, min, max) => Math.min(Math.max(valor, min), Math.max(min, max))

// Rectángulo destacado: el del elemento con holgura, recortado a la pantalla. Sin elemento, un punto al centro
function calcularFoco(el, vw, vh) {
  if (!el) return { left: vw / 2, top: vh / 2, width: 0, height: 0 }
  const r = el.getBoundingClientRect()
  const left = Math.max(r.left - HOLGURA, 4)
  const top = Math.max(r.top - HOLGURA, 4)
  const right = Math.min(r.right + HOLGURA, vw - 4)
  const bottom = Math.min(r.bottom + HOLGURA, vh - 4)
  return { left, top, width: Math.max(right - left, 0), height: Math.max(bottom - top, 0) }
}

// Posición de la tarjeta: al lado preferido si cabe, si no en el primero que quepa; sobre un elemento grande
// (el mapa), dentro de él, en su esquina inferior derecha
function ubicarTarjeta(foco, ancho, alto, preferido, vw, vh) {
  if (foco.width === 0) return { x: (vw - ancho) / 2, y: (vh - alto) / 2 }
  const derecha = foco.left + foco.width
  const abajo = foco.top + foco.height
  const centroX = limitar(foco.left + foco.width / 2 - ancho / 2, MARGEN, vw - MARGEN - ancho)
  const centroY = limitar(foco.top + foco.height / 2 - alto / 2, MARGEN, vh - MARGEN - alto)
  const opciones = {
    derecha: { cabe: derecha + SEPARACION + ancho <= vw - MARGEN, x: derecha + SEPARACION, y: centroY },
    izquierda: { cabe: foco.left - SEPARACION - ancho >= MARGEN, x: foco.left - SEPARACION - ancho, y: centroY },
    abajo: { cabe: abajo + SEPARACION + alto <= vh - MARGEN, x: centroX, y: abajo + SEPARACION },
    arriba: { cabe: foco.top - SEPARACION - alto >= MARGEN, x: centroX, y: foco.top - SEPARACION - alto },
  }
  const lado = [preferido, ...LADOS].find((l) => opciones[l]?.cabe)
  if (lado) return opciones[lado]
  return {
    x: limitar(derecha - ancho - 24, MARGEN, vw - MARGEN - ancho),
    y: limitar(abajo - alto - 24, MARGEN, vh - MARGEN - alto),
  }
}

/**
 * Recorrido guiado sobre la interfaz real: oscurece la pantalla, destaca el elemento de cada paso
 * (data-recorrido="<objetivo>") y explica qué hace en una tarjeta junto a él. Bloquea el resto del panel mientras
 * dura (#root inerte). Si un paso es de otra página, navega a ella. Teclado: → siguiente, ← anterior, Esc omitir.
 * recorrido: ver services/recorridos.js. onTerminar('completado' | 'omitido')
 */
function RecorridoGuiado({ recorrido, onTerminar }) {
  const navigate = useNavigate()
  // Solo los pasos de esta pantalla (p. ej. contraer el panel no existe en teléfono): la numeración no salta
  const [pasos] = useState(() => pasosDePantalla(recorrido))
  const [indice, setIndice] = useState(0)
  // Elemento destacado del paso actual (null mientras se busca)
  const [objetivo, setObjetivo] = useState(null)
  const direccionRef = useRef(1)
  // El paso actual cambió de página y su elemento aún no aparece: el velo cubre toda la pantalla mientras carga
  const navegandoRef = useRef(false)
  const capaRef = useRef(null)
  const tarjetaRef = useRef(null)
  const primarioRef = useRef(null)
  // El padre puede pasar una función nueva en cada render: los efectos usan siempre la última sin reiniciarse
  const onTerminarRef = useRef(onTerminar)
  useEffect(() => {
    onTerminarRef.current = onTerminar
  })
  const terminar = (motivo) => onTerminarRef.current(motivo)
  const paso = pasos[indice]
  const ultimo = indice === pasos.length - 1
  const Icono = paso.icono

  const ir = (nuevo) => {
    if (nuevo < 0) return
    if (nuevo >= pasos.length) {
      terminar('completado')
      return
    }
    direccionRef.current = nuevo > indice ? 1 : -1
    setObjetivo(null)
    setIndice(nuevo)
  }

  // El resto del panel queda inerte: ni el teclado ni el lector de pantalla salen de la tarjeta
  useEffect(() => {
    const raiz = document.getElementById('root')
    if (raiz) raiz.inert = true
    return () => {
      if (raiz) raiz.inert = false
    }
  }, [])

  // Busca el elemento del paso (puede tardar en aparecer); si no aparece, salta el paso en la dirección en que se iba
  useEffect(() => {
    if (paso.ruta && window.location.pathname !== paso.ruta) {
      navegandoRef.current = true
      navigate(paso.ruta)
    }
    if (!paso.objetivo) return
    const inicio = performance.now()
    let marco
    const intentar = () => {
      const encontrado = buscarObjetivo(paso.objetivo)
      const el = encontrado?.el
      if (el) {
        // Fuera de la pantalla en vertical: al centro. Si no, 'nearest' solo mueve lo justo, también dentro de
        // contenedores con scroll propio que lo recortan (p. ej. la fila de pestañas del teléfono)
        const r = el.getBoundingClientRect()
        const fueraVertical = r.top < 0 || r.bottom > innerHeight
        el.scrollIntoView({
          block: fueraVertical ? 'center' : 'nearest',
          inline: 'nearest',
          behavior: sinMovimiento() ? 'auto' : 'smooth',
        })
        navegandoRef.current = false
        setObjetivo(el)
        return
      }
      if (performance.now() - inicio < (encontrado?.oculto ? ESPERA_OCULTO_MS : ESPERA_OBJETIVO_MS)) {
        marco = requestAnimationFrame(intentar)
        return
      }
      const siguiente = indice + direccionRef.current
      if (siguiente >= pasos.length) onTerminarRef.current('completado')
      else if (siguiente < 0) setIndice(indice + 1)
      else setIndice(siguiente)
    }
    marco = requestAnimationFrame(intentar)
    return () => cancelAnimationFrame(marco)
  }, [paso.objetivo, paso.ruta, indice, pasos.length, navigate])

  // Sigue al elemento cuadro a cuadro (scroll, cambios de tamaño, paneles que se expanden) y ubica foco y tarjeta.
  // Las coordenadas van en variables CSS de la capa; el CSS dibuja con ellas
  useEffect(() => {
    const capa = capaRef.current
    const ultimoValor = {}
    const fijar = (nombre, valor) => {
      if (ultimoValor[nombre] === valor) return
      ultimoValor[nombre] = valor
      capa.style.setProperty(nombre, valor)
    }
    let marco
    const ubicar = () => {
      marco = requestAnimationFrame(ubicar)
      const vw = innerWidth
      const vh = innerHeight
      const buscando = paso.objetivo && !objetivo
      // Buscando el elemento del paso: la tarjeta se oculta, para no mostrar un paso sin su elemento. En la misma
      // página el foco queda donde estaba; tras cambiar de página se cierra al centro (el velo cubre todo)
      if (buscando) delete capa.dataset.visible
      if (buscando && !navegandoRef.current) return
      const foco = calcularFoco(buscando ? null : objetivo, vw, vh)
      fijar('--foco-x', `${Math.round(foco.left)}px`)
      fijar('--foco-y', `${Math.round(foco.top)}px`)
      fijar('--foco-ancho', `${Math.round(foco.width)}px`)
      fijar('--foco-alto', `${Math.round(foco.height)}px`)
      if (foco.width > 0) capa.dataset.conFoco = ''
      else delete capa.dataset.conFoco
      if (buscando) return
      const tarjeta = tarjetaRef.current
      if (matchMedia(MOVIL).matches) {
        // Hoja: donde no tape el foco
        capa.dataset.hoja = foco.width > 0 && foco.top + foco.height / 2 > vh / 2 ? 'arriba' : 'abajo'
      } else if (tarjeta) {
        delete capa.dataset.hoja
        const { x, y } = ubicarTarjeta(foco, tarjeta.offsetWidth, tarjeta.offsetHeight, paso.lado, vw, vh)
        fijar('--tarjeta-x', `${Math.round(x)}px`)
        fijar('--tarjeta-y', `${Math.round(y)}px`)
      }
      capa.dataset.visible = ''
    }
    marco = requestAnimationFrame(ubicar)
    return () => cancelAnimationFrame(marco)
  }, [objetivo, paso.objetivo, paso.lado])

  // El foco del teclado pasa al botón principal en cada paso
  useEffect(() => {
    primarioRef.current?.focus({ preventScroll: true })
  }, [indice])

  useEffect(() => {
    const alPresionar = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onTerminarRef.current('omitido')
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        primarioRef.current?.click()
      } else if (e.key === 'ArrowLeft' && indice > 0) {
        e.preventDefault()
        direccionRef.current = -1
        setObjetivo(null)
        setIndice(indice - 1)
      }
    }
    document.addEventListener('keydown', alPresionar)
    return () => document.removeEventListener('keydown', alPresionar)
  }, [indice])

  return createPortal(
    <div ref={capaRef} className={styles.recorridoGuiado}>
      {/* Velo con el hueco del foco: absorbe los clics para que no se use el panel a medio recorrido */}
      <div className={styles.velo} />
      <div className={styles.foco} />

      <div
        ref={tarjetaRef}
        className={styles.tarjeta}
        role="dialog"
        aria-modal="true"
        aria-labelledby="recorrido-titulo"
        aria-describedby="recorrido-texto"
      >
        <div key={indice} className={styles.contenido}>
          <div className={styles.cabecera}>
            <span className={styles.icono}>
              <Icono size={18} />
            </span>
            <span className={styles.contador}>
              {paso.seccion && <span className={styles.seccion}>{paso.seccion}</span>}
              Paso {indice + 1} de {pasos.length}
            </span>
            <button
              type="button"
              className={styles.cerrar}
              onClick={() => terminar('omitido')}
              aria-label="Omitir recorrido"
              title="Omitir recorrido (Esc)"
            >
              <X size={16} />
            </button>
          </div>
          <h2 id="recorrido-titulo" className={styles.titulo}>
            {paso.titulo}
          </h2>
          <p id="recorrido-texto" className={styles.texto}>
            {paso.texto}
          </p>
        </div>

        <div className={styles.progreso} aria-hidden="true">
          {pasos.map((p, i) => (
            <span key={p.objetivo ?? i} className={`${styles.segmento} ${i <= indice ? styles.segmentoHecho : ''}`} />
          ))}
        </div>

        <div className={styles.pie}>
          {indice > 0 ? (
            <button type="button" className={styles.secundario} onClick={() => ir(indice - 1)}>
              <ArrowLeft size={16} />
              Anterior
            </button>
          ) : (
            <button type="button" className={styles.enlace} onClick={() => terminar('omitido')}>
              Omitir recorrido
            </button>
          )}
          <button ref={primarioRef} type="button" className={styles.primario} onClick={() => ir(indice + 1)}>
            {ultimo ? 'Finalizar' : 'Siguiente'}
            {ultimo ? <Check size={16} /> : <ArrowRight size={16} />}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default RecorridoGuiado
