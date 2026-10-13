import { LoaderCircle } from 'lucide-react'
import styles from './Cargando.module.css'

// Mientras se descarga una página con carga diferida (p. ej. el mapa)
function Cargando({ texto = 'Cargando…' }) {
  return (
    <div className={styles.cargando} role="status">
      <LoaderCircle size={22} className={styles.icono} />
      {texto}
    </div>
  )
}

export default Cargando
