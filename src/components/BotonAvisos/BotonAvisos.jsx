import { Bell, BellOff } from 'lucide-react'
import styles from './BotonAvisos.module.css'

const DETALLE_PERMISO = {
  granted: 'con sonido y notificación del navegador',
  denied: 'solo con sonido: las notificaciones están bloqueadas para este sitio (se permiten en la configuración del navegador)',
  'no-soportado': 'solo con sonido: este navegador no muestra notificaciones',
}

/**
 * Avisos de alertas nuevas cuando el panel no está a la vista (en el header azul). Activados pero sin haber
 * contestado el permiso de notificaciones, el punto invita a hacer clic: el navegador solo lo pregunta tras un clic.
 */
function BotonAvisos({ activados, permiso, onActivar, onDesactivar }) {
  const faltaPermiso = activados && permiso === 'default'
  const etiqueta = !activados
    ? 'Avisos de alertas desactivados. Activar sonido y notificación cuando el panel no está a la vista'
    : faltaPermiso
      ? 'Avisos de alertas con sonido. Permitir también las notificaciones del navegador'
      : `Avisos de alertas activados ${DETALLE_PERMISO[permiso] ?? ''}. Desactivar`

  return (
    <button
      type="button"
      className={`${styles.botonAvisos} ${activados ? '' : styles.apagado}`}
      onClick={activados && !faltaPermiso ? onDesactivar : onActivar}
      aria-pressed={activados}
      aria-label={etiqueta}
      title={etiqueta}
    >
      {activados ? <Bell size={17} /> : <BellOff size={17} />}
      {faltaPermiso && <span className={styles.punto} aria-hidden="true" />}
    </button>
  )
}

export default BotonAvisos
