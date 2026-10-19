import { useEffect, useRef } from 'react'
import styles from './DialogoConfirmacion.module.css'

/**
 * Confirmación centrada (<dialog> nativo: foco dentro, Esc o clic fuera para cancelar y fondo inerte).
 * Se monta abierto; el padre lo desmonta en onCancelar y onConfirmar. El foco parte en "Cancelar" para
 * que un Enter accidental no ejecute la acción.
 */
function DialogoConfirmacion({ titulo, mensaje, icono, textoConfirmar, onConfirmar, onCancelar }) {
  const ref = useRef(null)

  useEffect(() => {
    const dialog = ref.current
    dialog.showModal()
    return () => dialog.close()
  }, [])

  return (
    <dialog
      ref={ref}
      className={styles.dialogoConfirmacion}
      aria-labelledby="dialogo-confirmacion-titulo"
      aria-describedby="dialogo-confirmacion-mensaje"
      onCancel={(e) => {
        e.preventDefault()
        onCancelar()
      }}
      // El clic en el fondo llega al propio <dialog>; los clics dentro de la tarjeta tienen otro target
      onClick={(e) => e.target === e.currentTarget && onCancelar()}
    >
      <div className={styles.tarjeta}>
        {icono && <span className={styles.icono}>{icono}</span>}
        <h2 id="dialogo-confirmacion-titulo" className={styles.titulo}>
          {titulo}
        </h2>
        <p id="dialogo-confirmacion-mensaje" className={styles.mensaje}>
          {mensaje}
        </p>
        <div className={styles.pie}>
          <button type="button" className={styles.secundario} onClick={onCancelar} autoFocus>
            Cancelar
          </button>
          <button type="button" className={styles.peligro} onClick={onConfirmar}>
            {textoConfirmar}
          </button>
        </div>
      </div>
    </dialog>
  )
}

export default DialogoConfirmacion
