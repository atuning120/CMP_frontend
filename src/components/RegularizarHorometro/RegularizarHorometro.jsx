import { useRef, useState } from 'react'
import { AlertCircle, AlertTriangle, LoaderCircle, Timer } from 'lucide-react'
import { LARGO_MAXIMO_COMENTARIO, regularizarHorometro } from '../../services/alertasService.js'
import { mensajeDeError } from '../../services/errores.js'
import styles from './RegularizarHorometro.module.css'

// Un turno no dura más que esto: más horas de uso suele ser un error al escribir el horómetro
const HORAS_MAXIMAS_TURNO = 13
const formatoHoras = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 })

/**
 * Turno que el sistema cerró automáticamente sin horómetro final: el jefe de turno lo informa desde su alerta. Si ya
 * hubo un turno posterior en la máquina, se propone el horómetro con que partió, que además es el máximo permitido.
 * onRegularizado recibe { idAlerta, atenciones, horometroFinal }.
 */
function RegularizarHorometro({ alerta, onRegularizado }) {
  const { horometroInicial, horometroSiguiente } = alerta.turno
  const [abierto, setAbierto] = useState(false)
  const [horometro, setHorometro] = useState('')
  const [comentario, setComentario] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  // Identifica esta regularización: si la respuesta no llega y se reintenta, el Backend no la repite
  const idCliente = useRef(null)

  const haySiguiente = horometroSiguiente != null && horometroSiguiente >= horometroInicial
  const valor = horometro === '' ? null : Number(horometro)
  const muchasHoras = valor !== null && valor - horometroInicial > HORAS_MAXIMAS_TURNO

  const abrir = () => {
    setHorometro(haySiguiente ? String(horometroSiguiente) : '')
    setAbierto(true)
  }

  const cerrar = () => {
    setAbierto(false)
    setHorometro('')
    setComentario('')
    setError('')
    idCliente.current = null
  }

  const guardar = async (e) => {
    e.preventDefault()
    setGuardando(true)
    setError('')
    try {
      idCliente.current ??= crypto.randomUUID()
      onRegularizado(await regularizarHorometro(alerta.id, valor, comentario.trim(), idCliente.current))
      cerrar()
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo regularizar el horómetro.'))
    } finally {
      setGuardando(false)
    }
  }

  if (!abierto) {
    return (
      <div className={styles.regularizarHorometro}>
        <button type="button" className={styles.abrir} onClick={abrir}>
          <Timer size={14} /> Regularizar horómetro
        </button>
      </div>
    )
  }

  return (
    <form className={styles.regularizarHorometro} onSubmit={guardar}>
      <label className={styles.campo}>
        <span className={styles.etiqueta}>Horómetro final del turno (h)</span>
        <input
          className={styles.input}
          type="number"
          inputMode="decimal"
          min={horometroInicial ?? 0}
          max={haySiguiente ? horometroSiguiente : undefined}
          step="any"
          value={horometro}
          onChange={(e) => setHorometro(e.target.value)}
          required
          autoFocus
        />
      </label>
      <p className={styles.ayuda}>
        Partió con {formatoHoras.format(horometroInicial)} h.{' '}
        {haySiguiente
          ? `El turno siguiente de la máquina partió con ${formatoHoras.format(horometroSiguiente)} h: es el máximo posible.`
          : 'Léelo en la cabina de la máquina.'}
      </p>
      {muchasHoras && (
        <p className={styles.aviso}>
          <AlertTriangle size={14} /> Son {formatoHoras.format(valor - horometroInicial)} horas de uso en un turno: revisa que
          esté bien escrito.
        </p>
      )}
      <input
        className={styles.input}
        type="text"
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        maxLength={LARGO_MAXIMO_COMENTARIO}
        aria-label="Comentario"
        placeholder="Comentario (opcional)"
      />
      {error && (
        <p className={styles.error} role="alert">
          <AlertCircle size={14} /> {error}
        </p>
      )}
      <div className={styles.botones}>
        <button type="button" className={styles.secundario} onClick={cerrar} disabled={guardando}>
          Cancelar
        </button>
        <button type="submit" className={styles.primario} disabled={guardando}>
          {guardando && <LoaderCircle size={14} className={styles.girando} />}
          Guardar horómetro
        </button>
      </div>
    </form>
  )
}

export default RegularizarHorometro
