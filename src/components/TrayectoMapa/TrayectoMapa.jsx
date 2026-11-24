import { Clock3, MapPin, Route, X } from 'lucide-react'
import { mensajeDeError } from '../../services/errores.js'
import { horaTrayecto } from '../../pages/Mapa/recorrido.js'
import styles from './TrayectoMapa.module.css'

const formatoKm = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 })
const formatoEntero = new Intl.NumberFormat('es-CL')

const PERIODOS = [
  { tipo: 'turno', etiqueta: 'Turno' },
  { tipo: 'hoy', etiqueta: 'Hoy' },
]

// Qué período cubre el trayecto, cuánto recorrió y con cuántas posiciones (o por qué todavía no se sabe)
function Resumen({ consulta, distanciaKm }) {
  if (consulta.isPending) return <span>Cargando trayecto…</span>
  if (consulta.error && !consulta.data) return <span>{mensajeDeError(consulta.error, 'No se pudo cargar el trayecto.')}</span>
  const { desde, hasta, puntos, truncado } = consulta.data
  return (
    <>
      <span className={styles.dato}>
        <Clock3 size={14} className={styles.datoIcono} aria-hidden="true" />
        {horaTrayecto(desde)} –{' '}
        {hasta ? (
          horaTrayecto(hasta)
        ) : (
          <span className={puntos.length > 0 ? styles.enVivo : undefined}>ahora</span>
        )}
      </span>
      {puntos.length === 0 ? (
        <span>Sin posiciones GPS en este período</span>
      ) : (
        <>
          <span className={styles.dato}>
            <Route size={14} className={styles.datoIcono} aria-hidden="true" />
            {formatoKm.format(distanciaKm)} km
          </span>
          <span className={styles.dato}>
            <MapPin size={14} className={styles.datoIcono} aria-hidden="true" />
            {formatoEntero.format(puntos.length)} {puntos.length === 1 ? 'posición' : 'posiciones'}
          </span>
        </>
      )}
      {truncado && <span>Muestra solo las primeras</span>}
    </>
  )
}

/**
 * Tarjeta del trayecto dibujado en el mapa: de qué máquina es, su período (que se puede cambiar) y cómo cerrarlo.
 * conTurno: la máquina tiene un turno cuyo trayecto se puede ver. oculta: en teléfono, mientras otra tarjeta ocupa
 * ese lugar del mapa.
 */
function TrayectoMapa({ trayecto, consulta, distanciaKm, conTurno, onTipo, onCerrar, oculta }) {
  return (
    <div
      className={`${styles.trayectoMapa} ${oculta ? styles.oculta : ''}`}
      role="region"
      aria-label={`Trayecto de ${trayecto.nombre}`}
    >
      <div className={styles.cabecera}>
        <Route size={18} className={styles.icono} aria-hidden="true" />
        <strong className={styles.titulo}>{trayecto.nombre}</strong>
        <div className={styles.periodos} role="group" aria-label="Período del trayecto">
          {PERIODOS.filter(({ tipo }) => tipo !== 'turno' || conTurno).map(({ tipo, etiqueta }) => (
            <button
              key={tipo}
              type="button"
              className={`${styles.periodo} ${trayecto.tipo === tipo ? styles.periodoActivo : ''}`}
              aria-pressed={trayecto.tipo === tipo}
              onClick={() => trayecto.tipo !== tipo && onTipo(tipo)}
            >
              {etiqueta}
            </button>
          ))}
        </div>
        <button type="button" className={styles.cerrar} onClick={onCerrar} aria-label="Cerrar trayecto">
          <X size={18} />
        </button>
      </div>
      <div className={styles.resumen} aria-live="polite">
        <Resumen consulta={consulta} distanciaKm={distanciaKm} />
      </div>
    </div>
  )
}

export default TrayectoMapa
