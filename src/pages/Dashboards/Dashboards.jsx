import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Activity, AlertCircle, BarChart3, FileSpreadsheet, GitCompareArrows, Upload } from 'lucide-react'
import CargaEstadoPago from '../../components/CargaEstadoPago/CargaEstadoPago.jsx'
import DashboardEmbebido from '../../components/DashboardEmbebido/DashboardEmbebido.jsx'
import Skeleton from '../../components/Skeleton/Skeleton.jsx'
import { CLAVES, errorSinDatos, useCargasEp } from '../../hooks/consultas.js'
import { fechaCorta, nombrePeriodo, puedeCargarEstadoPago } from '../../services/dashboardsService.js'
import { useSesion } from '../../services/session.js'
import styles from './Dashboards.module.css'

const VISTAS = [
  { id: 'operacion', etiqueta: 'Operación', icono: Activity },
  { id: 'estado-pago', etiqueta: 'Estado de pago', icono: FileSpreadsheet },
  { id: 'comparacion', etiqueta: 'Comparación', icono: GitCompareArrows },
]

// Vistas que dependen del Excel de un mes: comparten el selector de mes y la carga del archivo
const VISTAS_POR_MES = {
  'estado-pago': {
    titulo: (mes) => `Estado de pago de ${mes}`,
    vacioConCarga: 'Sube el Excel mensual del contratista para ver sus indicadores.',
    vacioSinCarga: 'Cuando un jefe de turno o administrador suba el Excel del mes, sus indicadores aparecerán aquí.',
  },
  comparacion: {
    titulo: (mes) => `Comparación del estado de pago de ${mes} con la app`,
    vacioConCarga: 'Sube el Excel mensual del contratista para compararlo con las horas registradas en la app.',
    vacioSinCarga:
      'Cuando un jefe de turno o administrador suba el Excel del mes, podrás compararlo aquí con las horas registradas en la app.',
  },
}

/**
 * Dashboards de Metabase (los diseña el equipo en Metabase; aquí solo se muestran). Operación: datos de la app en vivo.
 * Estado de pago: el Excel mensual del contratista, por mes cargado. Comparación: ese Excel contra las horas de la app.
 * La pestaña y el mes quedan en la URL (?vista=estado-pago&periodo=2026-06) para compartirla o volver con Atrás.
 */
function Dashboards() {
  const sesion = useSesion()
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const [cargando, setCargando] = useState(false)
  const vista = VISTAS.some((v) => v.id === params.get('vista')) ? params.get('vista') : 'operacion'
  const vistaPorMes = VISTAS_POR_MES[vista]
  const puedeCargar = puedeCargarEstadoPago(sesion)

  const consultaCargas = useCargasEp({ enabled: Boolean(vistaPorMes) })
  const cargas = consultaCargas.data ?? []
  // Sin mes en la URL (o uno sin carga), el más reciente
  const periodo = cargas.some((c) => c.periodo === params.get('periodo')) ? params.get('periodo') : cargas[0]?.periodo
  const carga = cargas.find((c) => c.periodo === periodo)

  const elegirVista = (id) => setParams(id === 'operacion' ? {} : { vista: id, ...(periodo ? { periodo } : {}) }, { replace: true })
  const elegirPeriodo = (valor) => setParams({ vista, periodo: valor }, { replace: true })

  const alCargar = async (nueva) => {
    setCargando(false)
    // La lista de meses y la URL firmada del mes reemplazado (ahora apunta a otra carga)
    await queryClient.invalidateQueries({ queryKey: CLAVES.dashboards })
    elegirPeriodo(nueva.periodo)
  }

  const errorCargas = errorSinDatos(consultaCargas)

  return (
    <section className={styles.dashboards}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>
            <BarChart3 size={22} className={styles.titleIcon} />
            Dashboards
          </h1>
          <p className={styles.subtitle}>
            Indicadores de la operación registrada en la app, del estado de pago mensual del contratista y la comparación entre ambos.
          </p>
        </div>
        <div className={styles.grupo} role="tablist" aria-label="Dashboard" data-recorrido="dashboards-vistas">
          {VISTAS.map(({ id, etiqueta, icono: Icono }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={vista === id}
              className={vista === id ? `${styles.segmento} ${styles.segmentoActivo}` : styles.segmento}
              onClick={() => elegirVista(id)}
            >
              <Icono size={15} className={styles.segmentoIcono} /> {etiqueta}
            </button>
          ))}
        </div>
      </header>

      {!vistaPorMes && <DashboardEmbebido tipo="operacion" titulo="Dashboard de operación" />}

      {vistaPorMes && (
        <>
          <div className={styles.toolbar}>
            {consultaCargas.isPending ? (
              <Skeleton className={styles.selectorSkeleton} />
            ) : (
              cargas.length > 0 && (
                <label className={styles.selector}>
                  <span className={styles.selectorLabel}>Mes</span>
                  <select className={styles.select} value={periodo} onChange={(e) => elegirPeriodo(e.target.value)}>
                    {cargas.map((c) => (
                      <option key={c.periodo} value={c.periodo}>
                        {`${nombrePeriodo(c.periodo)} (${fechaCorta(c.fechaDesde)} al ${fechaCorta(c.fechaHasta)})`}
                      </option>
                    ))}
                  </select>
                </label>
              )
            )}
            {carga && (
              <p className={styles.detalle}>
                {`${carga.archivo} · ${carga.filas.toLocaleString('es-CL')} filas · subido por ${carga.subidoPor} el ${new Date(carga.subidoEn).toLocaleDateString('es-CL')}`}
              </p>
            )}
            {puedeCargar && (
              <button type="button" className={styles.boton} onClick={() => setCargando(true)} aria-haspopup="dialog">
                <Upload size={16} /> Subir estado de pago
              </button>
            )}
          </div>

          {errorCargas && (
            <p className={styles.error} role="alert">
              <AlertCircle size={16} /> {errorCargas}
              <button type="button" className={styles.reintentar} onClick={() => consultaCargas.refetch()}>
                Reintentar
              </button>
            </p>
          )}

          {consultaCargas.isSuccess && cargas.length === 0 && (
            <div className={styles.vacio}>
              <FileSpreadsheet size={28} className={styles.vacioIcono} />
              <p className={styles.vacioTitulo}>Aún no hay estados de pago cargados</p>
              <p className={styles.vacioTexto}>
                {puedeCargar ? vistaPorMes.vacioConCarga : vistaPorMes.vacioSinCarga}
              </p>
            </div>
          )}

          {periodo && (
            // Con key: cambiar de vista no debe dejar el estado de carga del otro dashboard
            <DashboardEmbebido key={vista} tipo={vista} periodo={periodo} titulo={vistaPorMes.titulo(nombrePeriodo(periodo))} />
          )}
        </>
      )}

      {cargando && <CargaEstadoPago onCerrar={() => setCargando(false)} onCargado={alCargar} />}
    </section>
  )
}

export default Dashboards
