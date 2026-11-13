import { CircleHelp } from 'lucide-react'
import styles from './BotonRecorrido.module.css'

// Botón de ayuda del header: vuelve a abrir el recorrido guiado del rol (es además el último paso del recorrido)
function BotonRecorrido({ onClick }) {
  return (
    <button
      type="button"
      className={styles.botonRecorrido}
      onClick={onClick}
      aria-label="Ver el recorrido guiado"
      title="Recorrido guiado"
      data-recorrido="ayuda"
    >
      <CircleHelp size={18} />
    </button>
  )
}

export default BotonRecorrido
