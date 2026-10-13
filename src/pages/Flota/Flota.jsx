import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, ArrowLeftRight, CheckCircle2, Pencil, Plus, Power, PowerOff, Search, Truck } from 'lucide-react'
import FlotaAccion from '../../components/FlotaAccion/FlotaAccion.jsx'
import {
  listarMarcasMaquina,
  listarModelosMaquina,
  listarOperadoresAsignables,
  listarTiposMaquina,
  obtenerFlota,
} from '../../services/flotaService.js'
import styles from './Flota.module.css'

const FILTROS = [
  { id: 'todas', etiqueta: 'Todas' },
  { id: 'operativas', etiqueta: 'Operativas' },
  { id: 'fuera', etiqueta: 'Fuera de servicio' },
]

const formatoHoras = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 })
const formatoFecha = new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short' })

const CATALOGOS_VACIOS = { tipos: [], marcas: [], modelos: [], operadores: [] }

/**
 * Gestión de la flota (JEFE_TURNO y ADMIN): las mismas acciones que el jefe de turno tiene en la app
 * móvil. Cada acción pide un motivo y queda en la bitácora.
 */
function Flota() {
  const [flota, setFlota] = useState([])
  const [catalogos, setCatalogos] = useState(CATALOGOS_VACIOS)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [filtro, setFiltro] = useState('todas')
  const [busqueda, setBusqueda] = useState('')
  const [accion, setAccion] = useState(null)
  const [aviso, setAviso] = useState(null)

  // Flota y catálogos de los formularios (tipos, marcas, modelos y operadores asignables)
  const cargar = useCallback(async () => {
    const [maquinas, tipos, marcas, modelos, operadores] = await Promise.all([
      obtenerFlota(),
      listarTiposMaquina(),
      listarMarcasMaquina(),
      listarModelosMaquina(),
      listarOperadoresAsignables(),
    ])
    return { maquinas, catalogos: { tipos, marcas, modelos, operadores } }
  }, [])

  useEffect(() => {
    let vigente = true
    cargar()
      .then(({ maquinas, catalogos: c }) => {
        if (!vigente) return
        setFlota(maquinas)
        setCatalogos(c)
      })
      .catch((e) => vigente && setError(e.message))
      .finally(() => vigente && setCargando(false))
    return () => {
      vigente = false
    }
  }, [cargar])

  const conteos = useMemo(
    () => ({
      todas: flota.length,
      operativas: flota.filter((m) => m.estado !== 'BAJA').length,
      fuera: flota.filter((m) => m.estado === 'BAJA').length,
    }),
    [flota],
  )

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return flota.filter((m) => {
      if (filtro === 'operativas' && m.estado === 'BAJA') return false
      if (filtro === 'fuera' && m.estado !== 'BAJA') return false
      if (!texto) return true
      return [m.nombre, m.patente, m.tipoMaquina, m.marca, m.modelo, m.operadorAsignado?.nombre, m.operadorActual]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(texto))
    })
  }, [flota, filtro, busqueda])

  const alGuardar = async (mensaje) => {
    const { maquinas, catalogos: c } = await cargar()
    setFlota(maquinas)
    setCatalogos(c)
    setAccion(null)
    setAviso(mensaje)
  }

  return (
    <section className={styles.flota}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>
            <Truck size={22} className={styles.titleIcon} />
            Flota
          </h1>
          <p className={styles.subtitle}>Incorpora, edita, habilita y reemplaza las máquinas de la planta.</p>
        </div>
        <button type="button" className={styles.primario} onClick={() => setAccion({ tipo: 'incorporar' })}>
          <Plus size={18} /> Incorporar máquina
        </button>
      </header>

      {aviso && (
        <p className={styles.exito} role="status">
          <CheckCircle2 size={16} /> {aviso}
          <button type="button" className={styles.cerrarAviso} onClick={() => setAviso(null)} aria-label="Cerrar aviso">
            ×
          </button>
        </p>
      )}

      <div className={styles.toolbar}>
        <label className={styles.search}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Buscar código, patente, modelo u operador…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </label>
        <div className={styles.filtros} role="tablist" aria-label="Filtrar por estado">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filtro === f.id}
              className={`${styles.filtro} ${filtro === f.id ? styles.filtroActivo : ''}`}
              onClick={() => setFiltro(f.id)}
            >
              {f.etiqueta}
              <span className={styles.filtroConteo}>{conteos[f.id]}</span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className={styles.error} role="alert">
          <AlertCircle size={16} /> {error}
        </p>
      )}

      <div className={styles.tablaWrapper}>
        <table className={styles.tabla}>
          <thead>
            <tr>
              <th className={styles.th}>Máquina</th>
              <th className={styles.th}>Operador asignado</th>
              <th className={styles.th}>Turno en curso</th>
              <th className={`${styles.th} ${styles.numero}`}>Horómetro</th>
              <th className={styles.th}>Estado</th>
              <th className={`${styles.th} ${styles.acciones}`}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando && (
              <tr>
                <td className={styles.vacio} colSpan={6}>
                  Cargando flota…
                </td>
              </tr>
            )}
            {!cargando && visibles.length === 0 && (
              <tr>
                <td className={styles.vacio} colSpan={6}>
                  No hay máquinas que coincidan.
                </td>
              </tr>
            )}
            {visibles.map((m) => {
              const fuera = m.estado === 'BAJA'
              return (
                <tr key={m.idMaquina} className={styles.fila}>
                  <td className={styles.td}>
                    <span className={styles.codigo}>
                      {m.nombre}
                      {m.patente && <span className={styles.patente}>{m.patente}</span>}
                      {m.esContratista && <span className={styles.contratista}>Contratista</span>}
                    </span>
                    <span className={styles.secundario}>
                      {[m.tipoMaquina, m.marca, m.modelo].filter(Boolean).join(' · ') || 'Sin tipo registrado'}
                    </span>
                  </td>
                  <td className={styles.td}>{m.operadorAsignado?.nombre ?? <span className={styles.secundario}>Sin operador</span>}</td>
                  <td className={styles.td}>
                    {m.operadorActual ? (
                      <>
                        <span className={styles.enTurno}>{m.operadorActual}</span>
                        <span className={styles.secundario}>{m.ubicacionActual ?? 'Sin ubicación'}</span>
                      </>
                    ) : (
                      <span className={styles.secundario}>—</span>
                    )}
                  </td>
                  <td className={`${styles.td} ${styles.numero}`}>
                    {m.horometroActual !== null ? `${formatoHoras.format(m.horometroActual)} h` : '—'}
                  </td>
                  <td className={styles.td}>
                    <span className={`${styles.estado} ${fuera ? styles.fuera : styles.operativa}`}>
                      {fuera ? 'Fuera de servicio' : 'Operativa'}
                    </span>
                    {fuera && m.fueraDeServicio && (
                      <span className={styles.secundario}>
                        {m.fueraDeServicio.motivo} · {formatoFecha.format(new Date(m.fueraDeServicio.fecha))}
                        {m.fueraDeServicio.reemplazadaPor && ` · por ${m.fueraDeServicio.reemplazadaPor}`}
                      </span>
                    )}
                  </td>
                  <td className={`${styles.td} ${styles.acciones}`}>
                    <div className={styles.botones}>
                      <button
                        type="button"
                        className={styles.accion}
                        onClick={() => setAccion({ tipo: 'editar', maquina: m })}
                        title="Editar ficha"
                      >
                        <Pencil size={15} />
                        <span className={styles.accionTexto}>Editar</span>
                      </button>
                      <button
                        type="button"
                        className={styles.accion}
                        onClick={() => setAccion({ tipo: 'estado', maquina: m })}
                        title={fuera ? 'Habilitar' : 'Dejar fuera de servicio'}
                      >
                        {fuera ? <Power size={15} /> : <PowerOff size={15} />}
                        <span className={styles.accionTexto}>{fuera ? 'Habilitar' : 'Deshabilitar'}</span>
                      </button>
                      {!fuera && (
                        <button
                          type="button"
                          className={styles.accion}
                          onClick={() => setAccion({ tipo: 'reemplazar', maquina: m })}
                          title="Reemplazar por otra máquina"
                        >
                          <ArrowLeftRight size={15} />
                          <span className={styles.accionTexto}>Reemplazar</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {accion && (
        <FlotaAccion
          key={`${accion.tipo}-${accion.maquina?.idMaquina ?? 'nueva'}`}
          accion={accion}
          catalogos={catalogos}
          flota={flota}
          onCerrar={() => setAccion(null)}
          onGuardado={alGuardar}
        />
      )}
    </section>
  )
}

export default Flota
