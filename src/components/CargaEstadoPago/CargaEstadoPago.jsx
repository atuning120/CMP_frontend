import { useState } from 'react'
import { AlertCircle, AlertTriangle, FileSpreadsheet, Info, ShieldCheck } from 'lucide-react'
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

const horasTexto = (horas) => `${horas.toLocaleString('es-CL', { maximumFractionDigits: 1 })} h`

/**
 * Subir el Excel del estado de pago (EP) de un mes, en dos pasos: "Revisar" lo lee en el Backend sin guardarlo
 * (filas, errores, horas por equipo) y "Confirmar" lo guarda. Cambiar cualquier dato vuelve al primer paso.
 * onCargado(carga) recibe la carga guardada.
 */
function CargaEstadoPago({ onCerrar, onCargado }) {
  const [periodo, setPeriodo] = useState(periodoAnterior)
  const [rango, setRango] = useState(() => rangoSugerido(periodoAnterior()))
  const [archivo, setArchivo] = useState(null)
  const [vista, setVista] = useState(null)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState(null)

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

  return (
    <PanelLateral
      titulo="Subir estado de pago"
      subtitulo="Excel mensual del contratista con las horas por equipo"
      onCerrar={onCerrar}
      confirmar={{ texto: textoConfirmar, form: FORM_ID, variante: vista?.cargaExistente && listoParaConfirmar ? 'ambar' : 'primario', ocupado }}
    >
      <form id={FORM_ID} className={styles.cargaEstadoPago} onSubmit={enviar} noValidate>
        <p className={styles.aviso}>
          <ShieldCheck size={16} className={styles.avisoIcono} />
          Solo se lee la hoja «Base de datos». Las demás hojas (horas extra, tarifas, montos) y el archivo no se guardan.
        </p>

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
        <span className={styles.ayuda}>Días que cubre el EP (ambos incluidos). Se propone del 25 del mes anterior al 25 del mes.</span>

        <label className={styles.campo}>
          <span className={styles.label}>Archivo Excel (.xlsx, hasta 10 MB)</span>
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className={styles.archivo}
            onChange={(e) => cambiar(() => setArchivo(e.target.files?.[0] ?? null))}
          />
        </label>

        {error && (
          <p className={styles.error} role="alert">
            <AlertCircle size={16} /> {error}
          </p>
        )}

        {vista && <VistaPrevia vista={vista} periodo={periodo} />}
      </form>
    </PanelLateral>
  )
}

function VistaPrevia({ vista, periodo }) {
  const sinFlota = vista.equipos.filter((e) => !e.enFlota)
  return (
    <section className={styles.vista} aria-live="polite">
      <h3 className={styles.vistaTitulo}>
        <FileSpreadsheet size={16} /> Revisión de {vista.archivo}
      </h3>
      <dl className={styles.resumen}>
        <div className={styles.dato}>
          <dt className={styles.datoNombre}>Filas válidas</dt>
          <dd className={styles.datoValor}>{vista.filasValidas.toLocaleString('es-CL')}</dd>
        </div>
        <div className={styles.dato}>
          <dt className={styles.datoNombre}>Horas</dt>
          <dd className={styles.datoValor}>{horasTexto(vista.horas)}</dd>
        </div>
        <div className={styles.dato}>
          <dt className={styles.datoNombre}>Errores</dt>
          <dd className={vista.totalErrores ? `${styles.datoValor} ${styles.malo}` : styles.datoValor}>
            {vista.totalErrores.toLocaleString('es-CL')}
          </dd>
        </div>
      </dl>

      {vista.totalErrores > 0 && (
        <div className={styles.bloqueError}>
          <p className={styles.bloqueTitulo}>
            <AlertCircle size={16} /> Corrige estas filas en el Excel y vuelve a elegir el archivo: no se carga con errores.
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
          <AlertTriangle size={16} />
          {`${nombrePeriodo(periodo)} ya tiene un estado de pago (${vista.cargaExistente.archivo}, subido por ${vista.cargaExistente.subidoPor} el ${new Date(vista.cargaExistente.subidoEn).toLocaleDateString('es-CL')}). Al confirmar se reemplaza; el anterior queda guardado como historial.`}
        </p>
      )}

      {vista.equipos.length > 0 && (
        <table className={styles.tabla}>
          <caption className={styles.pista}>
            Horas por equipo del {fechaCorta(vista.fechaDesde)} al {fechaCorta(vista.fechaHasta)}
          </caption>
          <thead>
            <tr>
              <th scope="col" className={styles.celdaTitulo}>Equipo</th>
              <th scope="col" className={styles.celdaTitulo}>Registros</th>
              <th scope="col" className={styles.celdaTitulo}>Horas</th>
            </tr>
          </thead>
          <tbody>
            {vista.equipos.map((e) => (
              <tr key={e.equipo}>
                <td className={styles.celda}>
                  {e.equipo}
                  {!e.enFlota && <span className={styles.etiqueta}>No está en la flota</span>}
                </td>
                <td className={styles.celda}>{e.registros}</td>
                <td className={styles.celda}>{horasTexto(e.horas)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {(sinFlota.length > 0 || vista.actividadesSinArea.length > 0) && (
        <div className={styles.bloqueInfo}>
          <Info size={16} className={styles.avisoIcono} />
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
    </section>
  )
}

export default CargaEstadoPago
