import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Download, Eye, EyeOff, Info, LoaderCircle, Pencil, Plus, Smartphone, Trash2 } from 'lucide-react'
import DialogoConfirmacion from '../../components/DialogoConfirmacion/DialogoConfirmacion.jsx'
import PestanasAdmin from '../../components/PestanasAdmin/PestanasAdmin.jsx'
import PublicarVersion from '../../components/PublicarVersion/PublicarVersion.jsx'
import Skeleton, { AvisoCarga } from '../../components/Skeleton/Skeleton.jsx'
import { CLAVES, errorSinDatos, useVersionesAppAdmin } from '../../hooks/consultas.js'
import {
  editarVersion,
  eliminarVersion,
  formatearFecha,
  formatearTamano,
  MAXIMO_NOTAS,
  siguienteVersion,
  urlDescargaVersion,
} from '../../services/appMovilService.js'
import { mensajeDeError } from '../../services/errores.js'
import styles from './AdminVersionesApp.module.css'

const SIN_VERSIONES = []
const FILAS_SKELETON = [1, 2, 3]

/**
 * Versiones de la app móvil (solo ADMIN): publicar una nueva (APK + número + notas), editar notas, retirar o volver a
 * publicar, y eliminar. Lo publicado se descarga sin sesión desde la página pública /app-movil.
 */
function AdminVersionesApp() {
  const queryClient = useQueryClient()
  const consulta = useVersionesAppAdmin()
  const versiones = consulta.data ?? SIN_VERSIONES
  const error = errorSinDatos(consulta)
  const [publicando, setPublicando] = useState(false)
  // { idVersion, notas } de la versión cuyas notas se editan
  const [editando, setEditando] = useState(null)
  const [eliminando, setEliminando] = useState(null)
  // Por versión: 'guardando' o el mensaje de error del último cambio
  const [estadoFila, setEstadoFila] = useState({})

  // La que descarga la página pública: la publicada de número más alto (la lista viene ordenada)
  const idUltima = versiones.find((v) => v.publicada)?.idVersion
  // Publicar, retirar o eliminar cambia también la lista pública
  const refrescar = () => queryClient.invalidateQueries({ queryKey: CLAVES.appMovil })

  const guardar = async (version, cambio) => {
    setEstadoFila((e) => ({ ...e, [version.idVersion]: 'guardando' }))
    try {
      await cambio()
      await refrescar()
      setEstadoFila((e) => ({ ...e, [version.idVersion]: null }))
      return true
    } catch (err) {
      setEstadoFila((e) => ({ ...e, [version.idVersion]: mensajeDeError(err, 'No se pudo guardar el cambio.') }))
      return false
    }
  }

  const guardarNotas = async (version) => {
    if (await guardar(version, () => editarVersion(version.idVersion, { notas: editando.notas }))) setEditando(null)
  }

  const confirmarEliminar = () => {
    const version = eliminando
    setEliminando(null)
    guardar(version, () => eliminarVersion(version.idVersion))
  }

  const renderVersion = (v) => {
    const estado = estadoFila[v.idVersion]
    const ocupado = estado === 'guardando'
    const editandoEsta = editando?.idVersion === v.idVersion

    return (
      <li key={v.idVersion} className={`${styles.version} ${v.publicada ? '' : styles.retirada}`}>
        <div className={styles.cabecera}>
          <span className={styles.numero}>Versión {v.version}</span>
          {v.idVersion === idUltima && <span className={styles.chipUltima}>Última · se descarga por defecto</span>}
          {!v.publicada && <span className={styles.chipRetirada}>Retirada</span>}
          {ocupado && <LoaderCircle size={16} className={styles.girando} aria-label="Guardando" />}
        </div>
        <p className={styles.datos}>
          {formatearFecha(v.subidaEn)} · {formatearTamano(v.tamanoBytes)}
          {v.subidaPor && ` · publicada por ${v.subidaPor}`}
        </p>

        {editandoEsta ? (
          <div className={styles.edicion}>
            <textarea
              className={styles.textarea}
              value={editando.notas}
              onChange={(e) => setEditando({ ...editando, notas: e.target.value })}
              maxLength={MAXIMO_NOTAS}
              rows={4}
              aria-label={`Notas de la versión ${v.version}`}
              autoFocus
            />
            <div className={styles.botones}>
              <button type="button" className={styles.accion} onClick={() => setEditando(null)} disabled={ocupado}>
                Cancelar
              </button>
              <button type="button" className={styles.guardar} onClick={() => guardarNotas(v)} disabled={ocupado}>
                Guardar notas
              </button>
            </div>
          </div>
        ) : v.notas ? (
          <p className={styles.notas}>{v.notas}</p>
        ) : (
          <p className={styles.sinNotas}>Sin notas.</p>
        )}

        {estado && estado !== 'guardando' && (
          <p className={styles.error} role="alert">
            <AlertCircle size={16} aria-hidden="true" /> {estado}
          </p>
        )}

        {!editandoEsta && (
          <div className={styles.botones}>
            <button type="button" className={styles.accion} disabled={ocupado} onClick={() => setEditando({ idVersion: v.idVersion, notas: v.notas })}>
              <Pencil size={15} aria-hidden="true" /> Editar notas
            </button>
            <button
              type="button"
              className={styles.accion}
              disabled={ocupado}
              onClick={() => guardar(v, () => editarVersion(v.idVersion, { publicada: !v.publicada }))}
            >
              {v.publicada ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
              {v.publicada ? 'Retirar' : 'Volver a publicar'}
            </button>
            {v.publicada && (
              <a className={styles.accion} href={urlDescargaVersion(v.idVersion)}>
                <Download size={15} aria-hidden="true" /> Descargar
              </a>
            )}
            <button type="button" className={`${styles.accion} ${styles.peligro}`} disabled={ocupado} onClick={() => setEliminando(v)}>
              <Trash2 size={15} aria-hidden="true" /> Eliminar
            </button>
          </div>
        )}
      </li>
    )
  }

  return (
    <section className={styles.adminVersionesApp}>
      <PestanasAdmin />

      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>
            <Smartphone size={22} className={styles.titleIcon} aria-hidden="true" />
            App móvil
          </h1>
          <p className={styles.subtitle}>Publica las versiones de GeoPlanta Móvil que se descargan desde la página pública.</p>
        </div>
        <div className={styles.headerBotones}>
          <Link to="/app-movil" target="_blank" rel="noopener" className={styles.secundario}>
            Ver página pública
          </Link>
          {!publicando && (
            <button type="button" className={styles.primario} onClick={() => setPublicando(true)}>
              <Plus size={18} aria-hidden="true" /> Publicar versión
            </button>
          )}
        </div>
      </header>

      <p className={styles.nota}>
        <Info size={16} className={styles.notaIcono} aria-hidden="true" />
        La página /app-movil no pide iniciar sesión: cualquiera con el enlace descarga las versiones publicadas. Retirar una
        versión la oculta de esa página sin borrar el archivo; eliminarla la borra para siempre.
      </p>

      {publicando && (
        <PublicarVersion
          sugerida={siguienteVersion(versiones)}
          onCancelar={() => setPublicando(false)}
          onPublicada={async () => {
            setPublicando(false)
            await refrescar()
          }}
        />
      )}

      {error && (
        <p className={styles.error} role="alert">
          <AlertCircle size={16} aria-hidden="true" /> {error}
        </p>
      )}

      {consulta.isPending ? (
        <>
          <AvisoCarga texto="Cargando las versiones…" />
          <ul className={styles.versiones}>
            {FILAS_SKELETON.map((n) => (
              <li key={n} className={styles.version}>
                <Skeleton className={styles.skTitulo} />
                <Skeleton className={styles.skLinea} />
              </li>
            ))}
          </ul>
        </>
      ) : versiones.length ? (
        <ul className={styles.versiones}>{versiones.map(renderVersion)}</ul>
      ) : (
        !error && <p className={styles.vacio}>Todavía no hay versiones. Publica la primera con «Publicar versión».</p>
      )}

      {eliminando && (
        <DialogoConfirmacion
          titulo={`¿Eliminar la versión ${eliminando.version}?`}
          mensaje="Se borra el archivo y deja de aparecer en el historial. No se puede deshacer. Si solo quieres ocultarla, usa «Retirar»."
          icono={<Trash2 size={20} />}
          textoConfirmar="Eliminar"
          onConfirmar={confirmarEliminar}
          onCancelar={() => setEliminando(null)}
        />
      )}
    </section>
  )
}

export default AdminVersionesApp
