import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, CalendarRange, FileSpreadsheet, History, Layers, Play, RefreshCw, Search, Truck } from 'lucide-react'
import HistorialEvento from '../../components/HistorialEvento/HistorialEvento.jsx'
import Skeleton, { AvisoCarga } from '../../components/Skeleton/Skeleton.jsx'
import SkeletonEvento from '../../components/SkeletonEvento/SkeletonEvento.jsx'
import { textoEvento } from '../../components/HistorialEvento/describirEvento.js'
import { descargarHistorialExcel, listarHistorial } from '../../services/historialService.js'
import { agruparPorDia, hoyMasDias, RANGOS, rangoPersonalizado, rangoUltimosDias } from './fechas.js'
import styles from './Historial.module.css'

const TIPOS = [
  { id: 'TODO', etiqueta: 'Todo', icono: Layers },
  { id: 'TURNOS', etiqueta: 'Turnos', icono: Play },
  { id: 'FLOTA', etiqueta: 'Flota', icono: Truck },
]

// Forma de la lista mientras carga: dos días, con tres y dos eventos
const DIAS_SKELETON = [
  [1, 2, 3],
  [4, 5],
]

const RESULTADO_VACIO = { clave: null, eventos: [], hayMas: false, error: null, errorMas: null }

// Mientras se busca se piden páginas más grandes: el filtro recorre el rango entero y no solo lo que se ve
const LIMITE_BUSCANDO = 50

// Sin tildes ni mayúsculas en ambos lados: "nunez" encuentra a "Nuñez"
const normalizar = (valor) => valor.normalize('NFD').replace(/\p{M}/gu, '')

// La búsqueda es una expresión regular de JavaScript; texto común (sin símbolos) funciona igual
const compilarBusqueda = (busqueda) => {
  const patron = busqueda.trim()
  if (!patron) return { regex: null }
  try {
    return { regex: new RegExp(normalizar(patron), 'i') }
  } catch (e) {
    return { regex: null, errorBusqueda: e.message }
  }
}

/**
 * Historial (JEFE_TURNO y ADMIN): la misma pestaña que el jefe de turno tiene en la app móvil.
 * Inicios y cierres de turno, cambios de área/zona de los operadores y acciones sobre la flota, agrupados por día y paginados
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
  const [busqueda, setBusqueda] = useState('')
  // Con muchos eventos cargados, filtrar no debe trabar la escritura
  const busquedaDiferida = useDeferredValue(busqueda)
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

  const { regex, errorBusqueda } = useMemo(() => compilarBusqueda(busquedaDiferida), [busquedaDiferida])
  const textos = useMemo(() => new Map(eventos.map((e) => [e.id, normalizar(textoEvento(e))])), [eventos])
  // Si no hay coincidencias a la vista, el centinela del final queda visible y se siguen pidiendo páginas
  const filtrados = useMemo(() => (regex ? eventos.filter((e) => regex.test(textos.get(e.id))) : eventos), [eventos, textos, regex])

  const cargarMas = useCallback(async () => {
    const ultimo = eventos[eventos.length - 1]
    if (!ultimo || !hayMas || cargando || cargandoMasRef.current || resultado.errorMas) return
    cargandoMasRef.current = true
    setCargandoMas(true)
    try {
      const p = await listarHistorial(tipo, rango, ultimo, regex ? LIMITE_BUSCANDO : undefined)
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
  }, [eventos, hayMas, cargando, resultado.errorMas, tipo, rango, clave, regex])

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
  }, [eventos.length, filtrados.length, hayMas, cargando, cargandoMas, resultado.errorMas])

  const reintentarMas = () => {
    setResultado((r) => ({ ...r, errorMas: null }))
    // Tras quitar el error, el observer vuelve a pedir la página
  }

  const dias = useMemo(() => agruparPorDia(filtrados), [filtrados])

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
          <p className={styles.subtitle}>Inicios y cierres de turno, cambios de área/zona y novedades de los operadores (con sus fotos) y acciones sobre la flota, del más reciente al más antiguo.</p>
        </div>
        <div className={styles.acciones}>
          <button
            type="button"
            className={styles.boton}
            onClick={exportarExcel}
            disabled={!rango || exportando || (vigente && eventos.length === 0)}
            title="Descargar el historial del rango y tipo elegidos en Excel (no aplica la búsqueda)"
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

      <div className={styles.busqueda}>
        <label className={styles.search}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Buscar operador, máquina, área, motivo…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            aria-label="Buscar en el historial"
            aria-invalid={Boolean(errorBusqueda)}
            aria-describedby="historial-busqueda-ayuda"
            spellCheck={false}
          />
        </label>
        <p id="historial-busqueda-ayuda" className={errorBusqueda ? styles.ayudaError : styles.ayuda}>
          {errorBusqueda
            ? `Expresión regular no válida: ${errorBusqueda}`
            : ''}
        </p>
      </div>

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
          {cargando
            ? <Skeleton className={styles.skConteo} />
            : regex
              ? `${filtrados.length}${hayMas ? '+' : ''} de ${eventos.length}${hayMas ? '+' : ''} eventos`
              : `${eventos.length}${hayMas ? '+' : ''} eventos`}
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
        {cargando && (
          <>
            <AvisoCarga texto="Cargando historial…" />
            {DIAS_SKELETON.map((eventos, i) => (
              <div key={i} aria-hidden="true">
                <Skeleton className={styles.skDia} />
                <ul className={styles.eventos}>
                  {eventos.map((n) => (
                    <SkeletonEvento key={n} />
                  ))}
                </ul>
              </div>
            ))}
          </>
        )}
        {vigente && !resultado.error && eventos.length === 0 && (
          <p className={styles.vacio}>No hay eventos en este rango de fechas.</p>
        )}
        {regex && eventos.length > 0 && filtrados.length === 0 && !hayMas && (
          <p className={styles.vacio}>Ningún evento de este rango coincide con la búsqueda.</p>
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
            <>
              <AvisoCarga texto="Cargando más eventos…" />
              <ul className={styles.eventos} aria-hidden="true">
                <SkeletonEvento />
                <SkeletonEvento />
              </ul>
            </>
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
