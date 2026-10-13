import { Clock3, MapPin, Search, Truck, User } from 'lucide-react'
import LeyendaMapa from '../LeyendaMapa/LeyendaMapa.jsx'
import { ETIQUETA_ESTADO } from '../../pages/Mapa/geo.js'
import styles from './FlotaPanel.module.css'

const FILTROS = [
  { id: 'todas', etiqueta: 'Todas' },
  { id: 'operando', etiqueta: 'Operando' },
  { id: 'alertas', etiqueta: 'Alertas' },
]

const formatoHoras = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 })

/**
 * Lista lateral de la flota: búsqueda, filtro por estado y una tarjeta por máquina.
 * items: [{ maquina, estado, ubicacion, enMapa }]
 */
function FlotaPanel({
  items,
  total,
  filtro,
  onFiltro,
  busqueda,
  onBusqueda,
  conteos,
  seleccionada,
  onSeleccionar,
  cargando,
  conAlertas,
}) {
  // Sin acceso a alertas (VISOR) no se muestran el filtro ni su leyenda
  const filtros = conAlertas ? FILTROS : FILTROS.filter((f) => f.id !== 'alertas')

  return (
    <aside className={styles.flotaPanel}>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <h2 className={styles.title}>
            <Truck size={18} className={styles.titleIcon} />
            Flota
          </h2>
          <span className={styles.counter}>{total} equipos</span>
        </div>
        <label className={styles.search}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Buscar código, zona u operador…"
            value={busqueda}
            onChange={(e) => onBusqueda(e.target.value)}
          />
        </label>
        <div className={styles.filtros} role="tablist" aria-label="Filtrar flota">
          {filtros.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filtro === f.id}
              className={`${styles.filtro} ${filtro === f.id ? styles.filtroActivo : ''}`}
              onClick={() => onFiltro(f.id)}
            >
              {f.etiqueta}
              <span className={styles.filtroConteo}>{conteos[f.id]}</span>
            </button>
          ))}
        </div>
      </header>

      <ul className={styles.lista}>
        {cargando && items.length === 0 && <li className={styles.vacio}>Cargando flota…</li>}
        {!cargando && items.length === 0 && <li className={styles.vacio}>No hay máquinas que coincidan.</li>}
        {items.map(({ maquina, estado, ubicacion, enMapa }) => (
          <li key={maquina.idMaquina}>
            <button
              type="button"
              className={`${styles.tarjeta} ${seleccionada === maquina.idMaquina ? styles.tarjetaActiva : ''}`}
              onClick={() => onSeleccionar(maquina.idMaquina)}
            >
              <span className={styles.fila}>
                <span className={styles.codigo}>{maquina.nombre}</span>
                {maquina.patente && <span className={styles.patente}>{maquina.patente}</span>}
                <span className={`${styles.badge} ${styles[`badge_${estado}`]}`}>
                  <span className={styles.badgePunto} />
                  {ETIQUETA_ESTADO[estado]}
                </span>
              </span>
              <span className={styles.modelo}>
                {[maquina.tipoMaquina, maquina.modelo].filter(Boolean).join(' · ') || 'Sin tipo registrado'}
              </span>
              <span className={styles.detalle}>
                <MapPin size={14} className={styles.detalleIcono} />
                {ubicacion ?? 'Sin turno en curso'}
                {ubicacion && !enMapa && <span className={styles.sinMapa}>· sin polígono en el mapa</span>}
              </span>
              <span className={styles.detalleDoble}>
                <span className={styles.detalle}>
                  <User size={14} className={styles.detalleIcono} />
                  {maquina.operadorActual ?? maquina.operadorAsignado?.nombre ?? 'Sin operador'}
                </span>
                {maquina.horometroActual !== null && (
                  <span className={styles.horometro}>
                    <Clock3 size={13} className={styles.detalleIcono} />
                    {formatoHoras.format(maquina.horometroActual)} h
                  </span>
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <footer className={styles.leyenda}>
        <LeyendaMapa conAlertas={conAlertas} />
      </footer>
    </aside>
  )
}

export default FlotaPanel
