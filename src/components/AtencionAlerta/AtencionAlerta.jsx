import { useState } from 'react'
import { AlertCircle, CheckCircle2, LoaderCircle, MessageSquarePlus } from 'lucide-react'
import { formatearFecha } from '../../pages/Historial/fechas.js'
import { atenderAlerta, LARGO_MAXIMO_COMENTARIO } from '../../services/alertasService.js'
import styles from './AtencionAlerta.module.css'
import { mensajeDeError } from '../../services/errores.js'

/**
 * Quién atendió la alerta y las notas posteriores, con el formulario para atenderla (comentario opcional) o agregar
 * una nota (comentario obligatorio). Nada se edita ni se borra. onGuardada recibe { idAlerta, atenciones }.
 */
function AtencionAlerta({ alerta, onGuardada }) {
  const [abierto, setAbierto] = useState(false)
  const [comentario, setComentario] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [atencion, ...notas] = alerta.atenciones ?? []
  const esNota = Boolean(atencion)

  const cerrar = () => {
    setAbierto(false)
    setComentario('')
    setError('')
  }

  const guardar = async (e) => {
    e.preventDefault()
    if (esNota && !comentario.trim()) return setError('Escribe la nota que quieres agregar.')
    setGuardando(true)
    setError('')
    try {
      onGuardada(await atenderAlerta(alerta.id, comentario.trim()))
      cerrar()
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo guardar la atención.'))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className={styles.atencionAlerta}>
      {atencion && (
        <div className={styles.registro}>
          <p className={styles.atendida}>
            <CheckCircle2 size={14} className={styles.check} />
            <span>
              Atendida por <strong>{atencion.usuario}</strong> · {formatearFecha(atencion.fecha)}
            </span>
          </p>
          {atencion.comentario && <p className={styles.comentario}>{atencion.comentario}</p>}
          {notas.map((nota, i) => (
            <p key={i} className={styles.nota}>
              <span className={styles.notaAutor}>
                Nota de {nota.usuario} · {formatearFecha(nota.fecha)}
              </span>
              {nota.comentario}
            </p>
          ))}
        </div>
      )}

      {abierto ? (
        <form className={styles.formulario} onSubmit={guardar}>
          <textarea
            className={styles.texto}
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            maxLength={LARGO_MAXIMO_COMENTARIO}
            rows={2}
            autoFocus
            aria-label={esNota ? 'Nota' : 'Comentario'}
            placeholder={esNota ? 'Nota (obligatoria)' : 'Comentario (opcional): qué se hizo, p. ej. "Se llamó al operador"'}
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
              {esNota ? 'Agregar nota' : 'Marcar como atendida'}
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className={esNota ? styles.enlace : styles.atender} onClick={() => setAbierto(true)}>
          {esNota ? (
            <>
              <MessageSquarePlus size={14} /> Agregar nota
            </>
          ) : (
            <>
              <CheckCircle2 size={14} /> Atender
            </>
          )}
        </button>
      )}
    </div>
  )
}

export default AtencionAlerta
