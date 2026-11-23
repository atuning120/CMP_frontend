import { useEffect, useId, useState } from 'react'
import { AlertCircle, FileUp, LoaderCircle, Upload } from 'lucide-react'
import {
  FORMATO_VERSION,
  formatearTamano,
  MAXIMO_NOTAS,
  publicarVersion,
  TAMANO_MAXIMO_APK,
} from '../../services/appMovilService.js'
import { mensajeDeError } from '../../services/errores.js'
import styles from './PublicarVersion.module.css'

const revisarArchivo = (archivo) => {
  if (!archivo) return ''
  if (!archivo.name.toLowerCase().endsWith('.apk')) return 'Elige el instalador de Android (archivo .apk).'
  if (archivo.size > TAMANO_MAXIMO_APK) return 'El archivo supera los 300 MB.'
  return ''
}

/**
 * Formulario para publicar una versión de la app (solo ADMIN): APK, número de versión y notas. La APK se sube directo a
 * Azure con barra de avance; al terminar la versión queda publicada en la página pública.
 * sugerida: número propuesto (la más alta + 1). onPublicada(version) al terminar.
 */
function PublicarVersion({ sugerida, onCancelar, onPublicada }) {
  const idArchivo = useId()
  const [archivo, setArchivo] = useState(null)
  const [version, setVersion] = useState(sugerida)
  const [notas, setNotas] = useState('')
  // null sin enviar; 0..1 mientras sube; 1 también mientras el Backend la registra
  const [progreso, setProgreso] = useState(null)
  const [error, setError] = useState('')

  // Un archivo arrastrado está sobre la zona: se resalta para indicar que se puede soltar
  const [arrastrando, setArrastrando] = useState(false)

  // Mientras el formulario está abierto, un archivo soltado fuera de la zona no debe abrirse en la pestaña (se
  // perdería el formulario): el navegador lo ignora
  useEffect(() => {
    const ignorar = (e) => {
      if (e.dataTransfer?.types?.includes('Files')) e.preventDefault()
    }
    window.addEventListener('dragover', ignorar)
    window.addEventListener('drop', ignorar)
    return () => {
      window.removeEventListener('dragover', ignorar)
      window.removeEventListener('drop', ignorar)
    }
  }, [])

  const errorArchivo = revisarArchivo(archivo)
  const versionValida = FORMATO_VERSION.test(version.trim())
  const enviando = progreso !== null
  const puedePublicar = archivo && !errorArchivo && versionValida && notas.length <= MAXIMO_NOTAS && !enviando

  // Arrastrar y soltar sobre la zona del archivo (además del clic, que abre el selector)
  const alArrastrarEncima = (e) => {
    if (enviando || !e.dataTransfer.types.includes('Files')) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setArrastrando(true)
  }
  const alSalir = (e) => {
    // Pasar sobre el ícono o el texto también dispara dragleave: solo cuenta salir de la zona
    if (!e.currentTarget.contains(e.relatedTarget)) setArrastrando(false)
  }
  const alSoltar = (e) => {
    e.preventDefault()
    setArrastrando(false)
    if (enviando) return
    const soltado = e.dataTransfer.files?.[0]
    if (soltado) setArchivo(soltado)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!puedePublicar) return
    setError('')
    setProgreso(0)
    try {
      onPublicada(await publicarVersion({ archivo, version: version.trim(), notas }, setProgreso))
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo publicar la versión.'))
      setProgreso(null)
    }
  }

  return (
    <form className={styles.publicarVersion} onSubmit={handleSubmit} noValidate>
      <h2 className={styles.titulo}>Publicar una versión</h2>

      <label
        htmlFor={idArchivo}
        className={`${styles.archivo} ${archivo ? styles.archivoElegido : ''} ${arrastrando ? styles.archivoArrastrando : ''}`}
        onDragEnter={alArrastrarEncima}
        onDragOver={alArrastrarEncima}
        onDragLeave={alSalir}
        onDrop={alSoltar}
      >
        <FileUp size={26} className={styles.archivoIcono} aria-hidden="true" />
        {arrastrando ? (
          <span className={styles.archivoTexto}>
            <strong className={styles.archivoNombre}>Suelta el archivo aquí</strong>
            {archivo ? `Reemplaza a ${archivo.name}` : 'Instalador .apk de hasta 300 MB'}
          </span>
        ) : archivo ? (
          <span className={styles.archivoTexto}>
            <strong className={styles.archivoNombre}>{archivo.name}</strong>
            {formatearTamano(archivo.size)} · arrastra otro o haz clic para cambiarlo
          </span>
        ) : (
          <span className={styles.archivoTexto}>
            <strong className={styles.archivoNombre}>Arrastra aquí el archivo .apk</strong>
            o haz clic para elegirlo · el instalador que genera EAS Build (hasta 300 MB)
          </span>
        )}
        <input
          id={idArchivo}
          type="file"
          accept=".apk,application/vnd.android.package-archive"
          className={styles.inputArchivo}
          disabled={enviando}
          onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
        />
      </label>
      {errorArchivo && <p className={styles.errorCampo}>{errorArchivo}</p>}

      <div className={styles.campos}>
        <label className={styles.campo}>
          <span className={styles.etiqueta}>Número de versión</span>
          <input
            className={styles.input}
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            disabled={enviando}
            placeholder="1.0.0"
            inputMode="decimal"
            aria-invalid={!versionValida}
          />
          <span className={versionValida ? styles.ayuda : styles.errorCampo}>
            {versionValida ? 'El mismo "version" de app.json, p. ej. 1.4.0.' : 'Tres números separados por puntos, p. ej. 1.4.0.'}
          </span>
        </label>

        <label className={styles.campo}>
          <span className={styles.etiqueta}>Novedades de esta versión (opcional)</span>
          <textarea
            className={styles.textarea}
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            disabled={enviando}
            maxLength={MAXIMO_NOTAS}
            rows={4}
            placeholder={'- Historial de los últimos estados\n- Corrección en el cierre de turno'}
          />
          <span className={styles.ayuda}>
            Se muestran en la página pública. {notas.length}/{MAXIMO_NOTAS}
          </span>
        </label>
      </div>

      {enviando && (
        <div className={styles.avance} role="status">
          <progress className={styles.barra} value={progreso} max={1} />
          <span className={styles.avanceTexto}>
            {progreso < 1 ? `Subiendo el archivo… ${Math.round(progreso * 100)} %` : 'Registrando la versión…'}
          </span>
        </div>
      )}

      {error && (
        <p className={styles.error} role="alert">
          <AlertCircle size={16} aria-hidden="true" /> {error}
        </p>
      )}

      <div className={styles.botones}>
        <button type="button" className={styles.secundario} onClick={onCancelar} disabled={enviando}>
          Cancelar
        </button>
        <button type="submit" className={styles.primario} disabled={!puedePublicar}>
          {enviando ? <LoaderCircle size={18} className={styles.girando} aria-hidden="true" /> : <Upload size={18} aria-hidden="true" />}
          {enviando ? 'Publicando…' : 'Publicar versión'}
        </button>
      </div>
    </form>
  )
}

export default PublicarVersion
