import { useId } from 'react'
import { Sparkles } from 'lucide-react'
import SelectorBuscable from '../SelectorBuscable/SelectorBuscable.jsx'
import styles from './SelectorConCreacion.module.css'

/**
 * Desplegable con búsqueda que al final ofrece crear una opción nueva (como en la app): en ese caso el campo
 * pasa a texto libre. Si lo escrito ya existe con otras mayúsculas se avisa que se usará la opción existente.
 * creando lo controla el formulario (p. ej. aplicar un modelo registrado vuelve a la lista).
 */
function SelectorConCreacion({
  etiqueta,
  etiquetaNueva,
  placeholder,
  placeholderNuevo,
  textoCrear,
  ayudaNueva,
  vacio,
  opciones,
  valor,
  onCambio,
  creando,
  onCreandoCambio,
  maxLength = 50,
}) {
  const id = useId()
  // La opción de la lista que corresponde al valor aunque difiera en mayúsculas (p. ej. una ficha antigua)
  const existente = opciones.find((o) => o.toUpperCase() === valor.trim().toUpperCase())

  if (!creando) {
    return (
      <SelectorBuscable
        etiqueta={etiqueta}
        placeholder={placeholder}
        opciones={opciones}
        valor={existente ?? valor}
        onCambio={(v) => onCambio(v ?? '')}
        vacio={vacio}
        accionFinal={{
          texto: textoCrear,
          // Lo que se estaba buscando es el punto de partida del valor nuevo
          onClick: (consulta) => {
            onCambio(consulta)
            onCreandoCambio(true)
          },
        }}
      />
    )
  }

  return (
    <div className={styles.selectorConCreacion}>
      <div className={styles.encabezado}>
        <label className={styles.label} htmlFor={id}>
          {etiquetaNueva}
        </label>
        <button
          type="button"
          className={styles.enlace}
          onClick={() => {
            onCreandoCambio(false)
            onCambio(existente ?? '')
          }}
        >
          Elegir de la lista
        </button>
      </div>
      <div className={styles.campo}>
        <Sparkles size={16} className={styles.icono} aria-hidden />
        <input
          id={id}
          className={styles.input}
          value={valor}
          onChange={(e) => onCambio(e.target.value)}
          placeholder={placeholderNuevo}
          maxLength={maxLength}
          autoComplete="off"
          autoFocus
        />
        {!existente && valor.trim() && <span className={styles.distintivo}>Nueva</span>}
      </div>
      <span className={existente ? `${styles.ayuda} ${styles.ayudaExistente}` : styles.ayuda}>
        {existente ? `Ya existe: se usará «${existente}».` : ayudaNueva}
      </span>
    </div>
  )
}

export default SelectorConCreacion
