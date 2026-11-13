import { useEffect, useRef } from 'react'
import { ArrowRight, Clock3 } from 'lucide-react'
import geoPlantaLogo from '../../assets/logoGeoPlanta.png'
import { pasosDePantalla } from '../../services/recorridos.js'
import styles from './BienvenidaRecorrido.module.css'

/**
 * Bienvenida del primer ingreso: qué es el panel para su rol y la invitación al recorrido guiado.
 * <dialog> nativo (foco dentro y fondo inerte). Esc o "Omitir" lo cierran sin hacerlo: queda como visto igual,
 * y se puede repetir desde el botón de ayuda del header.
 */
function BienvenidaRecorrido({ recorrido, onComenzar, onOmitir }) {
  const ref = useRef(null)
  const comenzarRef = useRef(null)

  useEffect(() => {
    const dialog = ref.current
    dialog.showModal()
    // showModal lleva el foco al primer botón ("Omitir"): la acción principal es comenzar
    comenzarRef.current?.focus()
    return () => dialog.close()
  }, [])

  return (
    <dialog
      ref={ref}
      className={styles.bienvenidaRecorrido}
      aria-labelledby="bienvenida-recorrido-titulo"
      aria-describedby="bienvenida-recorrido-resumen"
      onCancel={(e) => {
        e.preventDefault()
        onOmitir()
      }}
    >
      <div className={styles.portada}>
        <span className={styles.marca}>
          <img src={geoPlantaLogo} alt="" className={styles.logo} width="256" height="249" />
          GeoPlanta
        </span>
        <span className={styles.perfil}>{recorrido.perfil}</span>
      </div>

      <div className={styles.cuerpo}>
        <p className={styles.antetitulo}>Primer ingreso</p>
        <h2 id="bienvenida-recorrido-titulo" className={styles.titulo}>
          {recorrido.titulo}
        </h2>
        <p id="bienvenida-recorrido-resumen" className={styles.resumen}>
          {recorrido.resumen}
        </p>

        <p className={styles.subtitulo}>En este recorrido verás cómo</p>
        <ul className={styles.lista}>
          {recorrido.aprenderas.map(({ icono: Icono, texto }) => (
            <li key={texto} className={styles.item}>
              <span className={styles.itemIcono}>
                <Icono size={16} />
              </span>
              {texto}
            </li>
          ))}
        </ul>
      </div>

      <footer className={styles.pie}>
        <span className={styles.duracion}>
          <Clock3 size={14} />
          {pasosDePantalla(recorrido.pasos).length} pasos · {recorrido.duracion}
        </span>
        <div className={styles.acciones}>
          <button type="button" className={styles.secundario} onClick={onOmitir}>
            Omitir
          </button>
          <button ref={comenzarRef} type="button" className={styles.primario} onClick={onComenzar}>
            Comenzar recorrido
            <ArrowRight size={16} />
          </button>
        </div>
      </footer>
      <p className={styles.nota}>Puedes repetirlo cuando quieras desde el botón de ayuda del menú superior.</p>
    </dialog>
  )
}

export default BienvenidaRecorrido
