import { useState } from 'react'
import { AlertCircle, RefreshCw, Settings } from 'lucide-react'
import Skeleton, { AvisoCarga } from '../Skeleton/Skeleton.jsx'
import { useDashboard } from '../../hooks/consultas.js'
import { useTheme } from '../../hooks/useTheme.js'
import { urlConTema } from '../../services/dashboardsService.js'
import { mensajeDeError } from '../../services/errores.js'
import styles from './DashboardEmbebido.module.css'

/**
 * Dashboard de Metabase en un <iframe> con la URL que firma el Backend (quien lo ve no necesita cuenta en Metabase).
 * tipo: 'operacion' | 'estado-pago' (con el período AAAA-MM de una carga). Sigue el tema claro u oscuro de la web.
 */
function DashboardEmbebido({ tipo, periodo, titulo }) {
  const { theme } = useTheme()
  const consulta = useDashboard(tipo, periodo)
  const url = consulta.data ? urlConTema(consulta.data.url, theme) : null
  // Metabase tarda en arrancar si estaba detenido: el skeleton sigue hasta que el iframe termina de cargar
  const [cargada, setCargada] = useState(null)
  const cargando = !url || cargada !== url

  if (consulta.error && !consulta.data) {
    const sinConfigurar = consulta.error.status === 503
    return (
      <div className={styles.dashboardEmbebido}>
        <div className={styles.estado} role="alert">
          {sinConfigurar ? <Settings size={22} /> : <AlertCircle size={22} />}
          <p className={styles.estadoTitulo}>
            {sinConfigurar ? 'Este dashboard todavía no está disponible' : 'No se pudo cargar el dashboard'}
          </p>
          <p className={styles.estadoTexto}>
            {sinConfigurar
              ? 'Falta publicarlo en Metabase o configurar su id en el Backend (ver docs/metabase.md).'
              : mensajeDeError(consulta.error, 'Intenta nuevamente en unos minutos.')}
          </p>
          {!sinConfigurar && (
            <button type="button" className={styles.reintentar} onClick={() => consulta.refetch()}>
              <RefreshCw size={16} /> Reintentar
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.dashboardEmbebido}>
      {cargando && (
        <div className={styles.skeleton}>
          <AvisoCarga texto="Cargando dashboard…" />
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
          // Una URL nueva (token renovado o cambio de tema) vuelve a cargar el dashboard
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
