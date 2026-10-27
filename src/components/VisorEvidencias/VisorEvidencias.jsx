import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, ImageOff, LoaderCircle, X } from 'lucide-react'
import { useEvidencia } from '../../hooks/consultas.js'
import styles from './VisorEvidencias.module.css'
import { mensajeDeError } from '../../services/errores.js'

const formatoFecha = new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeStyle: 'short' })

// Extensión según el tipo de la data URL, para el nombre del archivo descargado
const extensionDe = (dataUrl) => (dataUrl.match(/^data:image\/(\w+)/)?.[1] ?? 'jpg').replace('jpeg', 'jpg')

/**
 * Fotos de un reporte a pantalla completa (<dialog> nativo: Esc o clic fuera para cerrar, flechas para pasar
 * de una a otra). Se monta abierto en la foto `inicial`; el padre lo desmonta en onCerrar.
 * contexto: quién, en qué máquina y qué reporte, para el encabezado y el nombre del archivo.
 */
function VisorEvidencias({ evidencias, inicial = 0, contexto, onCerrar }) {
  const ref = useRef(null)
  const [indice, setIndice] = useState(inicial)
  const evidencia = evidencias[indice]
  const foto = useEvidencia(evidencia.id)
  const total = evidencias.length

  useEffect(() => {
    const dialog = ref.current
    dialog.showModal()
    return () => dialog.close()
  }, [])

  const mover = (paso) => setIndice((i) => (i + paso + total) % total)

  const nombreArchivo = foto.data
    ? `evidencia_${contexto.maquina}_${evidencia.fecha.slice(0, 10)}_${indice + 1}.${extensionDe(foto.data)}`
    : undefined

  return (
    <dialog
      ref={ref}
      className={styles.visorEvidencias}
      aria-labelledby="visor-evidencias-titulo"
      onCancel={(e) => {
        e.preventDefault()
        onCerrar()
      }}
      onClick={(e) => e.target === e.currentTarget && onCerrar()}
      onKeyDown={(e) => {
        if (total < 2) return
        if (e.key === 'ArrowLeft') mover(-1)
        if (e.key === 'ArrowRight') mover(1)
      }}
    >
      <header className={styles.header}>
        <div className={styles.encabezado}>
          <h2 id="visor-evidencias-titulo" className={styles.titulo}>
            {contexto.titulo}
          </h2>
          <p className={styles.subtitulo}>
            {total > 1 && `Foto ${indice + 1} de ${total} · `}
            {formatoFecha.format(new Date(evidencia.fecha))}
          </p>
        </div>
        {foto.data && (
          <a className={styles.boton} href={foto.data} download={nombreArchivo}>
            <Download size={16} /> <span className={styles.textoBoton}>Descargar</span>
          </a>
        )}
        <button type="button" className={styles.cerrar} onClick={onCerrar} aria-label="Cerrar">
          <X size={18} />
        </button>
      </header>

      <div className={styles.lienzo}>
        {foto.isPending && <LoaderCircle size={28} className={styles.girando} aria-label="Cargando foto" />}
        {foto.isError && (
          <p className={styles.error} role="alert">
            <ImageOff size={22} /> {mensajeDeError(foto.error, 'No se pudo cargar la foto.')}
          </p>
        )}
        {foto.data && <img className={styles.foto} src={foto.data} alt={`Evidencia de ${contexto.titulo}`} />}

        {total > 1 && (
          <>
            <button type="button" className={`${styles.flecha} ${styles.anterior}`} onClick={() => mover(-1)} aria-label="Foto anterior">
              <ChevronLeft size={22} />
            </button>
            <button type="button" className={`${styles.flecha} ${styles.siguiente}`} onClick={() => mover(1)} aria-label="Foto siguiente">
              <ChevronRight size={22} />
            </button>
          </>
        )}
      </div>

      {contexto.descripcion && <p className={styles.descripcion}>{contexto.descripcion}</p>}
    </dialog>
  )
}

export default VisorEvidencias
