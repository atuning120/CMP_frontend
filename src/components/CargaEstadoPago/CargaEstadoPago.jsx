import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CircleCheck,
  CloudUpload,
  FileSpreadsheet,
  Info,
  ShieldCheck,
  X,
} from 'lucide-react'
import PanelLateral from '../PanelLateral/PanelLateral.jsx'
import {
  confirmarCargaEp,
  fechaCorta,
  nombrePeriodo,
  periodoAnterior,
  previsualizarCargaEp,
  rangoSugerido,
} from '../../services/dashboardsService.js'
import { mensajeDeError } from '../../services/errores.js'
import styles from './CargaEstadoPago.module.css'

const FORM_ID = 'carga-estado-pago'
const INPUT_ARCHIVO_ID = 'carga-estado-pago-archivo'
const MAX_MB = 10
const MAX_BYTES = MAX_MB * 1024 * 1024

const horasTexto = (horas) => `${horas.toLocaleString('es-CL', { maximumFractionDigits: 1 })} h`

const tamanoTexto = (bytes) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024)).toLocaleString('es-CL')} KB`
    : `${(bytes / 1024 / 1024).toLocaleString('es-CL', { maximumFractionDigits: 1 })} MB`

// Mensaje si el archivo no sirve; null si se puede revisar
const problemaDelArchivo = (archivo) => {
  if (!/\.xlsx$/i.test(archivo.name)) return `«${archivo.name}» no es un Excel .xlsx.`
  if (archivo.size > MAX_BYTES) return `«${archivo.name}» pesa ${tamanoTexto(archivo.size)}: el máximo es ${MAX_MB} MB.`
  return null
}

// Solo se reacciona a arrastres de archivos (no a texto o enlaces arrastrados dentro de la página)
const traeArchivos = (e) => Array.from(e.dataTransfer?.types ?? []).includes('Files')

/**
 * Subir el Excel del estado de pago (EP) de un mes, en dos pasos: "Revisar" lo lee en el Backend sin guardarlo
 * (filas, errores, horas por equipo) y "Confirmar" lo guarda. Cambiar cualquier dato vuelve al primer paso.
 * El archivo se elige con el explorador o arrastrándolo a cualquier parte del panel.
 * onCargado(carga) recibe la carga guardada.
 */
function CargaEstadoPago({ onCerrar, onCargado }) {
  const [periodo, setPeriodo] = useState(periodoAnterior)
  const [rango, setRango] = useState(() => rangoSugerido(periodoAnterior()))
  const [archivo, setArchivo] = useState(null)
  const [vista, setVista] = useState(null)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState(null)
  const [arrastrando, setArrastrando] = useState(false)
  // dragenter/dragleave también saltan al pasar por los elementos hijos: se cuentan para saber cuándo sale del panel
  const entradas = useRef(0)

  // Mientras el panel está abierto, soltar un archivo fuera del formulario no debe abrirlo en la pestaña
  useEffect(() => {
    const ignorar = (e) => {
      if (traeArchivos(e)) e.preventDefault()
    }
    window.addEventListener('dragover', ignorar)
    window.addEventListener('drop', ignorar)
    return () => {
      window.removeEventListener('dragover', ignorar)
      window.removeEventListener('drop', ignorar)
    }
  }, [])

  const cambiar = (aplicar) => {
    aplicar()
    setVista(null)
    setError(null)
  }

  const cambiarPeriodo = (valor) =>
    cambiar(() => {
      setPeriodo(valor)
      if (valor) setRango(rangoSugerido(valor))
    })

  const elegirArchivo = (lista) => {
    if (ocupado || !lista?.length) return
    if (lista.length > 1) {
      setError('Suelta un solo archivo: el Excel del estado de pago.')
      return
    }
    const problema = problemaDelArchivo(lista[0])
    if (problema) {
      setError(problema)
      return
    }
    cambiar(() => setArchivo(lista[0]))
  }

  const arrastre = {
    onDragEnter: (e) => {
      if (!traeArchivos(e)) return
      e.preventDefault()
      entradas.current += 1
      setArrastrando(true)
    },
    onDragOver: (e) => {
      if (!traeArchivos(e)) return
      e.preventDefault()
      e.dataTransfer.dropEffect = ocupado ? 'none' : 'copy'
    },
    onDragLeave: (e) => {
      if (!traeArchivos(e)) return
      entradas.current = Math.max(0, entradas.current - 1)
      if (entradas.current === 0) setArrastrando(false)
    },
    onDrop: (e) => {
      if (!traeArchivos(e)) return
      e.preventDefault()
      entradas.current = 0
      setArrastrando(false)
      elegirArchivo(e.dataTransfer.files)
    },
  }

  const datos = { periodo, fechaDesde: rango.desde, fechaHasta: rango.hasta, archivo }
  const listoParaConfirmar = vista?.puedeConfirmar

  const enviar = async (e) => {
    e.preventDefault()
    if (!archivo) {
      setError('Elige el Excel del estado de pago.')
      return
    }
    setOcupado(true)
    setError(null)
    try {
      if (listoParaConfirmar) {
        onCargado(await confirmarCargaEp(datos, Boolean(vista.cargaExistente)))
      } else {
        setVista(await previsualizarCargaEp(datos))
      }
    } catch (err) {
      setError(mensajeDeError(err, listoParaConfirmar ? 'No se pudo guardar el estado de pago.' : 'No se pudo revisar el Excel.'))
    } finally {
      setOcupado(false)
    }
  }

  const textoConfirmar = ocupado
    ? listoParaConfirmar
      ? 'Guardando…'
      : 'Revisando…'
    : listoParaConfirmar
      ? vista.cargaExistente
        ? 'Reemplazar estado de pago'
        : 'Confirmar carga'
      : 'Revisar Excel'

  // Mientras revisa o guarda no acepta otro archivo: no se resalta la zona
  const resaltar = arrastrando && !ocupado
  const periodoCompleto = Boolean(periodo && rango.desde && rango.hasta)
  const estadoRevision = vista ? (listoParaConfirmar ? 'completo' : 'conError') : 'pendiente'

  return (
    <PanelLateral
      titulo="Subir estado de pago"
      subtitulo="Excel mensual del contratista con las horas por equipo"
      onCerrar={onCerrar}
      confirmar={{ texto: textoConfirmar, form: FORM_ID, variante: vista?.cargaExistente && listoParaConfirmar ? 'ambar' : 'primario', ocupado }}
    >
      <form id={FORM_ID} className={styles.cargaEstadoPago} onSubmit={enviar} noValidate {...arrastre}>
        <Paso numero={1} titulo="Período" estado={periodoCompleto ? 'completo' : 'pendiente'}>
          <label className={styles.campo}>
            <span className={styles.label}>Mes del estado de pago</span>
            <input type="month" className={styles.input} value={periodo} onChange={(e) => cambiarPeriodo(e.target.value)} required />
          </label>

          <div className={styles.dosColumnas}>
            <label className={styles.campo}>
              <span className={styles.label}>Desde</span>
              <input
                type="date"
                className={styles.input}
                value={rango.desde}
                onChange={(e) => cambiar(() => setRango((r) => ({ ...r, desde: e.target.value })))}
                required
              />
            </label>
            <label className={styles.campo}>
              <span className={styles.label}>Hasta</span>
              <input
                type="date"
                className={styles.input}
                value={rango.hasta}
                onChange={(e) => cambiar(() => setRango((r) => ({ ...r, hasta: e.target.value })))}
                required
              />
            </label>
          </div>
          <span className={styles.ayuda}>Días que cubre el EP (ambos incluidos). Se propone del 26 del mes anterior al 25 del mes.</span>
        </Paso>

        <Paso numero={2} titulo="Archivo Excel" estado={archivo ? 'completo' : 'pendiente'}>
          {/* Oculto a la vista pero enfocable: Tab llega a la zona y Enter/Espacio abre el explorador */}
          <input
            id={INPUT_ARCHIVO_ID}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className={styles.inputOculto}
            disabled={ocupado}
            onChange={(e) => {
              elegirArchivo(e.target.files)
              // Permite volver a elegir el mismo archivo después de corregirlo
              e.target.value = ''
            }}
          />
          {archivo ? (
            <ArchivoElegido
              archivo={archivo}
              arrastrando={resaltar}
              ocupado={ocupado && !listoParaConfirmar}
              estado={estadoRevision}
              onQuitar={() => cambiar(() => setArchivo(null))}
            />
          ) : (
            <label htmlFor={INPUT_ARCHIVO_ID} className={resaltar ? `${styles.zona} ${styles.activa}` : styles.zona}>
              <span className={styles.zonaIcono}>
                <CloudUpload size={26} strokeWidth={1.75} />
              </span>
              <span className={styles.zonaTitulo}>{resaltar ? 'Suelta el archivo para cargarlo' : 'Arrastra el Excel aquí'}</span>
              <span className={styles.zonaTexto}>
                o <span className={styles.zonaEnlace}>búscalo en tu equipo</span>
              </span>
              <span className={styles.zonaFormato}>.xlsx · hasta {MAX_MB} MB</span>
            </label>
          )}
          <p className={styles.privacidad}>
            <ShieldCheck size={14} className={styles.privacidadIcono} />
            Solo se lee la hoja «Base de datos». Las demás hojas (horas extra, tarifas, montos) y el archivo no se guardan.
          </p>
          {error && (
            <p className={styles.error} role="alert">
              <AlertCircle size={16} className={styles.bloqueIcono} /> {error}
            </p>
          )}
        </Paso>

        {vista && (
          <Paso numero={3} titulo="Revisión" estado={estadoRevision}>
            <VistaPrevia vista={vista} periodo={periodo} />
          </Paso>
        )}
      </form>
    </PanelLateral>
  )
}

// Sección numerada del formulario; estado: 'pendiente' | 'completo' | 'conError'
function Paso({ numero, titulo, estado, children }) {
  return (
    <section className={styles.paso}>
      <h3 className={styles.pasoTitulo}>
        <span className={`${styles.pasoNumero} ${styles[estado]}`} aria-hidden="true">
          {estado === 'completo' ? <Check size={14} strokeWidth={3} /> : numero}
        </span>
        {titulo}
      </h3>
      <div className={styles.pasoCuerpo}>{children}</div>
    </section>
  )
}

const ETIQUETA_ESTADO = { pendiente: 'Sin revisar', completo: 'Revisado', conError: 'Con errores' }

function ArchivoElegido({ archivo, arrastrando, ocupado, estado, onQuitar }) {
  const clases = [styles.archivo, arrastrando && styles.activa].filter(Boolean).join(' ')
  return (
    <div className={clases}>
      <span className={styles.archivoIcono}>
        <FileSpreadsheet size={22} strokeWidth={1.75} />
      </span>
      <div className={styles.archivoDatos}>
        <span className={styles.archivoNombre} title={archivo.name}>
          {archivo.name}
        </span>
        <span className={styles.archivoMeta}>
          {arrastrando ? (
            'Suelta para reemplazarlo'
          ) : (
            <>
              {tamanoTexto(archivo.size)}
              <span className={`${styles.chip} ${styles[estado]}`}>{ocupado ? 'Revisando…' : ETIQUETA_ESTADO[estado]}</span>
            </>
          )}
        </span>
      </div>
      <div className={styles.archivoAcciones}>
        <label htmlFor={INPUT_ARCHIVO_ID} className={styles.botonTexto} aria-disabled={ocupado}>
          Cambiar
        </label>
        <button type="button" className={styles.botonIcono} onClick={onQuitar} disabled={ocupado} aria-label="Quitar archivo">
          <X size={16} />
        </button>
      </div>
      {ocupado && <span className={styles.progreso} aria-hidden="true" />}
    </div>
  )
}

function VistaPrevia({ vista, periodo }) {
  const sinFlota = vista.equipos.filter((e) => !e.enFlota)
  return (
    <div className={styles.vista} aria-live="polite">
      <dl className={styles.resumen}>
        <div className={styles.dato}>
          <dt className={styles.datoNombre}>Filas válidas</dt>
          <dd className={styles.datoValor}>{vista.filasValidas.toLocaleString('es-CL')}</dd>
        </div>
        <div className={styles.dato}>
          <dt className={styles.datoNombre}>Horas</dt>
          <dd className={styles.datoValor}>{horasTexto(vista.horas)}</dd>
        </div>
        <div className={vista.totalErrores ? `${styles.dato} ${styles.malo}` : styles.dato}>
          <dt className={styles.datoNombre}>Errores</dt>
          <dd className={styles.datoValor}>{vista.totalErrores.toLocaleString('es-CL')}</dd>
        </div>
      </dl>

      {vista.puedeConfirmar && !vista.cargaExistente && (
        <p className={styles.bloqueExito}>
          <CircleCheck size={16} className={styles.bloqueIcono} />
          El Excel no tiene errores. Revisa las horas por equipo y confirma para guardarlo.
        </p>
      )}

      {vista.totalErrores > 0 && (
        <div className={styles.bloqueError}>
          <p className={styles.bloqueTitulo}>
            <AlertCircle size={16} className={styles.bloqueIcono} /> Corrige estas filas en el Excel y vuelve a elegir el archivo: no se
            carga con errores.
          </p>
          <ul className={styles.lista}>
            {vista.errores.map((e, i) => (
              <li key={i}>{e.fila ? `Fila ${e.fila}: ${e.mensaje}` : e.mensaje}</li>
            ))}
          </ul>
          {vista.totalErrores > vista.errores.length && (
            <p className={styles.pista}>y {vista.totalErrores - vista.errores.length} errores más.</p>
          )}
        </div>
      )}

      {vista.cargaExistente && (
        <p className={styles.bloqueAmbar}>
          <AlertTriangle size={16} className={styles.bloqueIcono} />
          {`${nombrePeriodo(periodo)} ya tiene un estado de pago (${vista.cargaExistente.archivo}, subido por ${vista.cargaExistente.subidoPor} el ${new Date(vista.cargaExistente.subidoEn).toLocaleDateString('es-CL')}). Al confirmar se reemplaza; el anterior queda guardado como historial.`}
        </p>
      )}

      {vista.equipos.length > 0 && (
        <div className={styles.tablaMarco}>
          <table className={styles.tabla}>
            <caption className={styles.tablaTitulo}>
              Horas por equipo · {fechaCorta(vista.fechaDesde)} al {fechaCorta(vista.fechaHasta)}
            </caption>
            <thead>
              <tr>
                <th scope="col" className={styles.celdaTitulo}>Equipo</th>
                <th scope="col" className={`${styles.celdaTitulo} ${styles.numero}`}>Registros</th>
                <th scope="col" className={`${styles.celdaTitulo} ${styles.numero}`}>Horas</th>
              </tr>
            </thead>
            <tbody>
              {vista.equipos.map((e) => (
                <tr key={e.equipo} className={styles.fila}>
                  <td className={styles.celda}>
                    {e.equipo}
                    {!e.enFlota && <span className={styles.etiqueta}>No está en la flota</span>}
                  </td>
                  <td className={`${styles.celda} ${styles.numero}`}>{e.registros.toLocaleString('es-CL')}</td>
                  <td className={`${styles.celda} ${styles.numero}`}>{horasTexto(e.horas)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(sinFlota.length > 0 || vista.actividadesSinArea.length > 0) && (
        <div className={styles.bloqueInfo}>
          <Info size={16} className={styles.bloqueIcono} />
          <div>
            {sinFlota.length > 0 && (
              <p className={styles.parrafo}>
                {sinFlota.length === 1 ? 'Un equipo no coincide' : `${sinFlota.length} equipos no coinciden`} con el código
                interno de ninguna máquina: se cargan igual, pero en la comparación aparecerán solo en el Excel.
              </p>
            )}
            {vista.actividadesSinArea.length > 0 && (
              <p className={styles.parrafo}>Actividades sin área en la app: {vista.actividadesSinArea.join(', ')}. Se cargan igual, sin área asociada.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default CargaEstadoPago
