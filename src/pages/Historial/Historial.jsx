import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, CalendarRange, FileSpreadsheet, History, Layers, Play, RefreshCw, Truck } from 'lucide-react'
import HistorialEvento from '../../components/HistorialEvento/HistorialEvento.jsx'
import { descargarHistorialExcel, listarHistorial } from '../../services/historialService.js'
import { agruparPorDia, hoyMasDias, RANGOS, rangoPersonalizado, rangoUltimosDias } from './fechas.js'
import styles from './Historial.module.css'

const TIPOS = [
  { id: 'TODO', etiqueta: 'Todo', icono: Layers },
  { id: 'TURNOS', etiqueta: 'Turnos', icono: Play },
  { id: 'FLOTA', etiqueta: 'Flota', icono: Truck },
]

const RESULTADO_VACIO = { clave: null, eventos: [], hayMas: false, error: null, errorMas: null }

/**
 * Historial (JEFE_TURNO y ADMIN): la misma pestaña que el jefe de turno tiene en la app móvil.
 * Inicios de turno de los operadores y acciones sobre la flota, agrupados por día y paginados
 * del más reciente al más antiguo (la página siguiente se pide al llegar al final).
 */
function Historial() {
  const [tipo, setTipo] = useState('TODO')
  const [opcionRango, setOpcionRango] = useState('7')
  const [personalizado, setPersonalizado] = useState(() => ({ desde: hoyMasDias(-6), hasta: hoyMasDias(0) }))
  const [recargas, setRecargas] = useState(0)
  const [resultado, setResultado] = useState(RESULTADO_VACIO)
  const [cargandoMas, setCargandoMas] = useState(false)
  const [exportando, setExportando] = useState(false)
  const [errorExcel, setErrorExcel] = useState(null)
  // Muchos avisos del observer seguidos: el estado no alcanza a actualizarse entre uno y otro
  const cargandoMasRef = useRef(false)
  const centinelaRef = useRef(null)

  const { rango, errorRango } = useMemo(() => {
    if (opcionRango !== 'personalizado') return { rango: rangoUltimosDias(RANGOS.find((r) => r.id === opcionRango).dias) }
    const r = rangoPersonalizado(personalizado.desde, personalizado.hasta)
    return { rango: r.rango ?? null, errorRango: r.error }
  }, [opcionRango, personalizado])

  // Identifica la consulta vigente: respuestas de un filtro o rango anterior se descartan
  const clave = rango ? `${tipo}|${rango.desde}|${rango.hasta}|${recargas}` : null
  const vigente = resultado.clave === clave
  const cargando = clave !== null && !vigente
  const { eventos, hayMas } = vigente ? resultado : RESULTADO_VACIO

  useEffect(() => {
    if (!clave) return
    let activa = true
    listarHistorial(tipo, rango)
      .then((p) => activa && setResultado({ ...RESULTADO_VACIO, clave, eventos: p.eventos, hayMas: p.hayMas }))
      .catch((e) => activa && setResultado({ ...RESULTADO_VACIO, clave, error: e.message }))
    return () => {
      activa = false
    }
    // rango cambia de identidad en cada cálculo; clave ya resume tipo, rango y recargas
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave])

  const cargarMas = useCallback(async () => {
    const ultimo = eventos[eventos.length - 1]
    if (!ultimo || !hayMas || cargando || cargandoMasRef.current || resultado.errorMas) return
    cargandoMasRef.current = true
    setCargandoMas(true)
    try {
      const p = await listarHistorial(tipo, rango, ultimo)
      setResultado((r) =>
        r.clave !== clave
          ? r
          : { ...r, eventos: [...r.eventos, ...p.eventos.filter((e) => !r.eventos.some((x) => x.id === e.id))], hayMas: p.hayMas },
      )
    } catch (e) {
      setResultado((r) => (r.clave !== clave ? r : { ...r, errorMas: e.message }))
    } finally {
      cargandoMasRef.current = false
      setCargandoMas(false)
    }
  }, [eventos, hayMas, cargando, resultado.errorMas, tipo, rango, clave])

  // Scroll infinito: se vuelve a observar tras cada página, por si el final sigue a la vista
  const cargarMasRef = useRef(cargarMas)
  useEffect(() => {
    cargarMasRef.current = cargarMas
  })
  useEffect(() => {
    const centinela = centinelaRef.current
    if (!centinela) return
    const observer = new IntersectionObserver(([entrada]) => entrada.isIntersecting && cargarMasRef.current(), {
      rootMargin: '400px',
    })
    observer.observe(centinela)
    return () => observer.disconnect()
  }, [eventos.length, hayMas, cargando, cargandoMas, resultado.errorMas])

  const reintentarMas = () => {
    setResultado((r) => ({ ...r, errorMas: null }))
    // Tras quitar el error, el observer vuelve a pedir la página
  }

  const dias = useMemo(() => agruparPorDia(eventos), [eventos])

  // El Backend arma el Excel con todo el rango y tipo elegidos, no solo las páginas ya cargadas
  const exportarExcel = async () => {
    setExportando(true)
    setErrorExcel(null)
    try {
      await descargarHistorialExcel(tipo, rango)
    } catch (e) {
      setErrorExcel(e.message)
    } finally {
      setExportando(false)
    }
  }

  return (
    <section className={styles.historial}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>
            <History size={22} className={styles.titleIcon} />
            Historial
          </h1>
          <p className={styles.subtitle}>Inicios de turno de los operadores y acciones sobre la flota, del más reciente al más antiguo.</p>
        </div>
        <div className={styles.acciones}>
          <button
            type="button"
            className={styles.boton}
            onClick={exportarExcel}
            disabled={!rango || exportando || (vigente && eventos.length === 0)}
            title="Descargar el historial del rango y tipo elegidos en Excel"
          >
            <FileSpreadsheet size={16} /> {exportando ? 'Generando…' : 'Exportar Excel'}
          </button>
          <button
            type="button"
            className={styles.boton}
            onClick={() => setRecargas((n) => n + 1)}
            disabled={cargando}
            title="Recargar"
          >
            <RefreshCw size={16} /> Recargar
          </button>
        </div>
      </header>

      {errorExcel && (
        <p className={styles.error} role="alert">
          <AlertCircle size={16} /> No se pudo generar el Excel: {errorExcel}
          <button type="button" className={styles.reintentar} onClick={() => setErrorExcel(null)}>
            Cerrar
          </button>
        </p>
      )}

      <div className={styles.toolbar}>
        <div className={styles.grupo} role="tablist" aria-label="Tipo de evento">
          {TIPOS.map(({ id, etiqueta, icono: Icono }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tipo === id}
              className={`${styles.segmento} ${tipo === id ? styles.segmentoActivo : ''}`}
              onClick={() => setTipo(id)}
            >
              <Icono size={15} /> {etiqueta}
            </button>
          ))}
        </div>

        <div className={styles.rangos} role="tablist" aria-label="Rango de fechas">
          {RANGOS.map((r) => (
            <button
              key={r.id}
              type="button"
              role="tab"
              aria-selected={opcionRango === r.id}
              className={`${styles.filtro} ${opcionRango === r.id ? styles.filtroActivo : ''}`}
              onClick={() => setOpcionRango(r.id)}
            >
              {r.id === 'personalizado' && <CalendarRange size={14} />}
              {r.etiqueta}
            </button>
          ))}
        </div>

        <span className={styles.conteo}>
          {cargando ? 'Cargando…' : `${eventos.length}${hayMas ? '+' : ''} eventos`}
        </span>
      </div>

      {opcionRango === 'personalizado' && (
        <div className={styles.personalizado}>
          <label className={styles.campo}>
            Desde
            <input
              type="date"
              className={styles.fechaInput}
              value={personalizado.desde}
              max={hoyMasDias(0)}
              onChange={(e) => setPersonalizado((p) => ({ ...p, desde: e.target.value }))}
            />
          </label>
          <label className={styles.campo}>
            Hasta
            <input
              type="date"
              className={styles.fechaInput}
              value={personalizado.hasta}
              max={hoyMasDias(0)}
              onChange={(e) => setPersonalizado((p) => ({ ...p, hasta: e.target.value }))}
            />
          </label>
        </div>
      )}

      {(errorRango || (vigente && resultado.error)) && (
        <p className={styles.error} role="alert">
          <AlertCircle size={16} /> {errorRango ?? resultado.error}
          {!errorRango && (
            <button type="button" className={styles.reintentar} onClick={() => setRecargas((n) => n + 1)}>
              Reintentar
            </button>
          )}
        </p>
      )}

      <div className={styles.lista}>
        {cargando && <p className={styles.vacio}>Cargando historial…</p>}
        {vigente && !resultado.error && eventos.length === 0 && (
          <p className={styles.vacio}>No hay eventos en este rango de fechas.</p>
        )}

        {dias.map((dia) => (
          <div key={dia.clave}>
            <h2 className={styles.diaTitulo}>{dia.titulo}</h2>
            <ul className={styles.eventos}>
              {dia.eventos.map((evento) => (
                <HistorialEvento key={evento.id} evento={evento} />
              ))}
            </ul>
          </div>
        ))}

        {eventos.length > 0 &&
          (cargandoMas ? (
            <p className={styles.fin}>Cargando más eventos…</p>
          ) : resultado.errorMas ? (
            <button type="button" className={styles.cargarMas} onClick={reintentarMas}>
              No se pudieron cargar más eventos. Reintentar
            </button>
          ) : hayMas ? (
            <div ref={centinelaRef} className={styles.fin} aria-hidden="true" />
          ) : (
            <p className={styles.fin}>No hay más eventos en este rango.</p>
          ))}
      </div>
    </section>
  )
}

export default Historial
