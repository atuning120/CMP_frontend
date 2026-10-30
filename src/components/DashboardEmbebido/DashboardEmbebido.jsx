import { useState } from 'react'
import { CloudOff, RefreshCw, Settings } from 'lucide-react'
import Skeleton, { AvisoCarga } from '../Skeleton/Skeleton.jsx'
import { useDashboard } from '../../hooks/consultas.js'
import { urlConTema } from '../../services/dashboardsService.js'
import styles from './DashboardEmbebido.module.css'

/**
 * Dashboard de Metabase en un <iframe> con la URL que firma el Backend (quien lo ve no necesita cuenta en Metabase).
 * tipo: 'operacion' | 'estado-pago' (con el período AAAA-MM de una carga). Los gráficos quedan sobre el fondo de la
 * página; el modo oscuro lo resuelve el CSS sin recargar el iframe.
 */
function DashboardEmbebido({ tipo, periodo, titulo }) {
  const consulta = useDashboard(tipo, periodo)
  const url = consulta.data ? urlConTema(consulta.data.url) : null
  // Metabase tarda en arrancar si estaba detenido: el skeleton sigue hasta que el iframe termina de cargar
  const [cargada, setCargada] = useState(null)
  const cargando = !url || cargada !== url

  if (consulta.error && !consulta.data) {
    const sinConfigurar = consulta.error.code === 'METABASE_NO_CONFIGURADO'
    const reintentando = consulta.isFetching
    return (
      <div className={styles.dashboardEmbebido}>
        <div className={styles.estado} role="alert">
          <span className={styles.estadoIcono}>{sinConfigurar ? <Settings size={26} /> : <CloudOff size={26} />}</span>
          <p className={styles.estadoTitulo}>
            {sinConfigurar ? 'Este dashboard todavía no está disponible' : 'No pudimos cargar el dashboard'}
          </p>
          <p className={styles.estadoTexto}>
            {sinConfigurar
              ? 'Falta publicarlo en Metabase o configurar su id en el Backend (ver docs/metabase.md).'
              : 'El servidor de dashboards no respondió. Puede estar iniciándose o tener un problema momentáneo; vuelve a intentarlo en unos segundos.'}
          </p>
          {!sinConfigurar && (
            <button
              type="button"
              className={styles.reintentar}
              onClick={() => consulta.refetch()}
              disabled={reintentando}
            >
              <RefreshCw size={16} className={reintentando ? styles.girando : undefined} />
              {reintentando ? 'Reintentando…' : 'Reintentar'}
            </button>
          )}
        </div>
      </div>
    )
  }

  // Mientras Metabase arranca el Backend responde 503 y la consulta sigue reintentando
  const arrancando = consulta.failureReason?.code === 'METABASE_NO_DISPONIBLE'

  return (
    <div className={styles.dashboardEmbebido}>
      {cargando && (
        <div className={styles.skeleton}>
          <AvisoCarga texto={arrancando ? 'Iniciando el servidor de dashboards…' : 'Cargando dashboard…'} />
          <div className={styles.fila}>
            <Skeleton className={styles.tarjeta} />
            <Skeleton className={styles.tarjeta} />
            <Skeleton className={styles.tarjeta} />
          </div>
          <Skeleton className={styles.grafico} />
          <p className={styles.pista}>Si el servidor de dashboards estaba detenido, puede tardar hasta un minuto.</p>
        </div>
      )}
      {url && (
        <iframe
          // Una URL nueva (token renovado) vuelve a cargar el dashboard
          key={url}
          src={url}
          title={titulo}
          className={cargando ? `${styles.marco} ${styles.oculto}` : styles.marco}
          onLoad={() => setCargada(url)}
        />
      )}
    </div>
  )
}

export default DashboardEmbebido
