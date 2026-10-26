import { useRef, useState } from 'react'
import { ImageOff } from 'lucide-react'
import Skeleton from '../Skeleton/Skeleton.jsx'
import VisorEvidencias from '../VisorEvidencias/VisorEvidencias.jsx'
import { useEvidencia } from '../../hooks/consultas.js'
import { useEnPantalla } from '../../hooks/enPantalla.js'
import styles from './GaleriaEvidencias.module.css'

function Miniatura({ evidencia, numero, total, cargar, onAbrir }) {
  const foto = useEvidencia(evidencia.id, { enabled: cargar })
  const etiqueta = total > 1 ? `Ver foto ${numero} de ${total}` : 'Ver foto'

  return (
    <button type="button" className={styles.miniatura} onClick={onAbrir} aria-label={etiqueta} title={etiqueta}>
      {foto.data ? (
        <img className={styles.foto} src={foto.data} alt="" />
      ) : foto.isError ? (
        <ImageOff size={20} className={styles.sinFoto} />
      ) : (
        <Skeleton className={styles.cargando} />
      )}
    </button>
  )
}

/**
 * Miniaturas de las fotos de un reporte; al hacer clic se abren en el visor. Las fotos se piden recién cuando
 * el evento aparece en pantalla, para no descargar las de todo el historial de una vez.
 * contexto: { titulo, maquina, descripcion } para el visor.
 */
function GaleriaEvidencias({ evidencias, contexto }) {
  const ref = useRef(null)
  const visible = useEnPantalla(ref)
  const [abierta, setAbierta] = useState(null)

  return (
    <div ref={ref} className={styles.galeriaEvidencias}>
      {evidencias.map((evidencia, i) => (
        <Miniatura
          key={evidencia.id}
          evidencia={evidencia}
          numero={i + 1}
          total={evidencias.length}
          cargar={visible}
          onAbrir={() => setAbierta(i)}
        />
      ))}
      {abierta !== null && (
        <VisorEvidencias evidencias={evidencias} inicial={abierta} contexto={contexto} onCerrar={() => setAbierta(null)} />
      )}
    </div>
  )
}

export default GaleriaEvidencias
