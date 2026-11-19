import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import styles from './PanelLateral.module.css'

/**
 * Panel lateral modal (<dialog> nativo: foco dentro del panel, Esc para cerrar y fondo inerte).
 * Se monta abierto; el padre lo desmonta en onCerrar.
 * confirmar: { texto, form, variante: 'primario' | 'ambar', ocupado } -> botón submit del form indicado
 * icono (opcional): elemento que acompaña al título; etiqueta (opcional): texto breve sobre el título (p. ej. el rol)
 */
function PanelLateral({ titulo, subtitulo, icono, etiqueta, onCerrar, children, confirmar }) {
  const ref = useRef(null)

  useEffect(() => {
    const dialog = ref.current
    dialog.showModal()
    return () => dialog.close()
  }, [])

  return (
    <dialog
      ref={ref}
      className={styles.panelLateral}
      aria-labelledby="panel-lateral-titulo"
      onCancel={(e) => {
        e.preventDefault()
        onCerrar()
      }}
    >
      <header className={styles.header}>
        {icono && <span className={styles.icono}>{icono}</span>}
        <div className={styles.encabezado}>
          {etiqueta && <span className={styles.etiqueta}>{etiqueta}</span>}
          <h2 id="panel-lateral-titulo" className={styles.titulo}>
            {titulo}
          </h2>
          {subtitulo && <p className={styles.subtitulo}>{subtitulo}</p>}
        </div>
        <button type="button" className={styles.cerrar} onClick={onCerrar} aria-label="Cerrar">
          <X size={18} />
        </button>
      </header>
      <div className={styles.cuerpo}>{children}</div>
      {confirmar && (
        <footer className={styles.pie}>
          <button type="button" className={styles.secundario} onClick={onCerrar} disabled={confirmar.ocupado}>
            Cancelar
          </button>
          <button
            type="submit"
            form={confirmar.form}
            className={confirmar.variante === 'ambar' ? styles.ambar : styles.primario}
            disabled={confirmar.ocupado}
          >
            {confirmar.texto}
          </button>
        </footer>
      )}
    </dialog>
  )
}

export default PanelLateral
