import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlarmClockOff, AlertCircle, AlertTriangle, CalendarRange, CheckCircle2, CircleDashed, Layers3, RefreshCw, ShieldAlert, Wrench } from 'lucide-react'
import AlertaItem from '../../components/AlertaItem/AlertaItem.jsx'
import Skeleton, { AvisoCarga } from '../../components/Skeleton/Skeleton.jsx'
import SkeletonEvento from '../../components/SkeletonEvento/SkeletonEvento.jsx'
import { useAlertasActivas } from '../../hooks/consultas.js'
import { escucharAlertas } from '../../hooks/alertasEnVivo.js'
import { coincideTipo, listarAlertas } from '../../services/alertasService.js'
import { agruparPorDia, hoyMasDias, RANGOS, rangoPersonalizado, rangoUltimosDias } from '../Historial/fechas.js'
import styles from './Alertas.module.css'
import { mensajeDeError } from '../../services/errores.js'

// Los mismos filtros de la pestaña Alertas de la app móvil
const TIPOS = [
  { id: 'TODO', etiqueta: 'Todas', icono: ShieldAlert },
  { id: 'EXTENDIDOS', etiqueta: '+10 horas', icono: AlertTriangle },
  { id: 'CIERRES_AUTOMATICOS', etiqueta: 'Cierre auto', icono: AlarmClockOff },
  { id: 'MANTENCIONES', etiqueta: 'Mantención', icono: Wrench },
]

// Si alguien ya atendió la alerta (la atención y sus notas se guardan; las alertas se calculan desde los turnos)
const ESTADOS = [
  { id: 'TODAS', etiqueta: 'Cualquiera', icono: Layers3 },
  { id: 'PENDIENTES', etiqueta: 'Pendientes', icono: CircleDashed },
  { id: 'ATENDIDAS', etiqueta: 'Atendidas', icono: CheckCircle2 },
]

// Forma de la lista mientras carga: dos días, con tres y dos eventos
const DIAS_SKELETON = [
  [1, 2, 3],
  [4, 5],
]

const RESULTADO_VACIO = { clave: null, alertas: [], hayMas: false, error: null, errorMas: null }

// Del más reciente al más antiguo, como las entrega el Backend (fecha y luego id)
const ordenar = (a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id)

/**
 * Alertas de turno (JEFE_TURNO y ADMIN): turnos y jornadas de más de 10 h, cierres automáticos y máquinas detenidas por
 * mantención o falla, agrupados por día y paginados del más reciente al más antiguo. Las que aparecen mientras la página está abierta llegan por WebSocket
 * y se suman arriba, marcadas como nuevas. Cada una se puede atender (y después agregarle notas); lo que atiende otro
 * jefe de turno también llega en tiempo real.
 */
function Alertas() {
  const [tipo, setTipo] = useState('TODO')
  const [estado, setEstado] = useState('TODAS')
  const [opcionRango, setOpcionRango] = useState('7')
  const [personalizado, setPersonalizado] = useState(() => ({ desde: hoyMasDias(-6), hasta: hoyMasDias(0) }))
  const [recargas, setRecargas] = useState(0)
  const [resultado, setResultado] = useState(RESULTADO_VACIO)
  const [cargandoMas, setCargandoMas] = useState(false)
  const [nuevas, setNuevas] = useState(() => new Set())
  const activasQuery = useAlertasActivas(true)
  // Muchos avisos del observer seguidos: el estado no alcanza a actualizarse entre uno y otro
  const cargandoMasRef = useRef(false)
  const centinelaRef = useRef(null)

  const { rango, errorRango } = useMemo(() => {
    if (opcionRango !== 'personalizado') return { rango: rangoUltimosDias(RANGOS.find((r) => r.id === opcionRango).dias) }
    const r = rangoPersonalizado(personalizado.desde, personalizado.hasta)
    return { rango: r.rango ?? null, errorRango: r.error }
  }, [opcionRango, personalizado])

  // Identifica la consulta vigente: respuestas de un filtro o rango anterior se descartan
  const clave = rango ? `${tipo}|${estado}|${rango.desde}|${rango.hasta}|${recargas}` : null
  const vigente = resultado.clave === clave
  const cargando = clave !== null && !vigente
  const { alertas, hayMas } = vigente ? resultado : RESULTADO_VACIO

  useEffect(() => {
    if (!clave) return
    let activa = true
    listarAlertas(tipo, rango, null, estado)
      .then((p) => activa && setResultado({ ...RESULTADO_VACIO, clave, alertas: p.alertas, hayMas: p.hayMas }))
      .catch((e) => activa && setResultado({ ...RESULTADO_VACIO, clave, error: mensajeDeError(e, 'No se pudieron cargar las alertas.') }))
    return () => {
      activa = false
    }
    // rango cambia de identidad en cada cálculo; clave ya resume tipo, rango y recargas
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave])

  // Atención propia o de otro jefe de turno: se actualiza la alerta donde esté (aunque ya no calce con el filtro,
  // para que no desaparezca mientras se mira)
  const aplicarAtencion = useCallback(({ idAlerta, atenciones }) => {
    setResultado((r) =>
      r.alertas.some((a) => a.id === idAlerta)
        ? { ...r, alertas: r.alertas.map((a) => (a.id === idAlerta ? { ...a, atenciones } : a)) }
        : r,
    )
  }, [])

  // Alertas en tiempo real: solo caben en un rango que llega hasta ahora, si son del tipo elegido y si el filtro
  // admite pendientes (una alerta nueva nunca está atendida)
  const enVivoRef = useRef({ clave, tipo, estado, rango })
  useEffect(() => {
    enVivoRef.current = { clave, tipo, estado, rango }
  })
  useEffect(
    () =>
      escucharAlertas({
        alRecibir: (recibidas) => {
          const { clave: vigenteAhora, tipo: tipoAhora, estado: estadoAhora, rango: rangoAhora } = enVivoRef.current
          if (!rangoAhora || rangoAhora.hasta || estadoAhora === 'ATENDIDAS') return
          const caben = recibidas.filter((a) => coincideTipo(a, tipoAhora) && a.fecha >= rangoAhora.desde)
          if (caben.length === 0) return
          setResultado((r) => {
            if (r.clave !== vigenteAhora) return r
            const ids = new Set(caben.map((a) => a.id))
            return { ...r, alertas: [...caben, ...r.alertas.filter((a) => !ids.has(a.id))].sort(ordenar) }
          })
          setNuevas((actuales) => new Set([...actuales, ...caben.map((a) => a.id)]))
        },
        alAtender: aplicarAtencion,
        // Lo que llegó durante el corte se perdió: se vuelve a pedir la lista
        alReconectar: () => setRecargas((n) => n + 1),
      }),
    [aplicarAtencion],
  )

  const cargarMas = useCallback(async () => {
    const ultimo = alertas[alertas.length - 1]
    if (!ultimo || !hayMas || cargando || cargandoMasRef.current || resultado.errorMas) return
    cargandoMasRef.current = true
    setCargandoMas(true)
    try {
      const p = await listarAlertas(tipo, rango, ultimo, estado)
      setResultado((r) =>
        r.clave !== clave
          ? r
          : { ...r, alertas: [...r.alertas, ...p.alertas.filter((a) => !r.alertas.some((x) => x.id === a.id))], hayMas: p.hayMas },
      )
    } catch (e) {
      setResultado((r) => (r.clave !== clave ? r : { ...r, errorMas: mensajeDeError(e, 'No se pudieron cargar más alertas.') }))
    } finally {
      cargandoMasRef.current = false
      setCargandoMas(false)
    }
  }, [alertas, hayMas, cargando, resultado.errorMas, tipo, estado, rango, clave])

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
  }, [alertas.length, hayMas, cargando, cargandoMas, resultado.errorMas])

  const recargar = () => {
    setNuevas(new Set())
    setRecargas((n) => n + 1)
    activasQuery.refetch()
  }

  const dias = useMemo(() => agruparPorDia(alertas), [alertas])
  const activas = activasQuery.data

  return (
    <section className={styles.alertas}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>
            <ShieldAlert size={22} className={styles.titleIcon} />
            Alertas
            {activas !== undefined && (
              <span className={`${styles.activas} ${activas > 0 ? styles.hayActivas : ''}`}>
                {activas === 1 ? '1 activa' : `${activas} activas`}
              </span>
            )}
          </h1>
          <p className={styles.subtitle}>
            Turnos y jornadas de más de 10 h y cierres automáticos, del más reciente al más antiguo. Las nuevas llegan en
            tiempo real; al atenderlas queda registrado quién lo hizo, cuándo y con qué comentario.
          </p>
        </div>
        <button type="button" className={styles.boton} onClick={recargar} disabled={cargando} title="Recargar">
          <RefreshCw size={16} /> Recargar
        </button>
      </header>

      <div className={styles.toolbar}>
        <div className={styles.grupo} role="tablist" aria-label="Tipo de alerta">
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

        <div className={styles.grupo} role="tablist" aria-label="Atención">
          {ESTADOS.map(({ id, etiqueta, icono: Icono }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={estado === id}
              className={`${styles.segmento} ${estado === id ? styles.segmentoActivo : ''}`}
              onClick={() => setEstado(id)}
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
          {cargando ? <Skeleton className={styles.skConteo} /> : `${alertas.length}${hayMas ? '+' : ''} alertas`}
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
            <AvisoCarga texto="Cargando alertas…" />
            {DIAS_SKELETON.map((eventos, i) => (
              <div key={i} aria-hidden="true">
                <Skeleton className={styles.skDia} />
                <ul className={styles.items}>
                  {eventos.map((n) => (
                    <SkeletonEvento key={n} />
                  ))}
                </ul>
              </div>
            ))}
          </>
        )}
        {vigente && !resultado.error && alertas.length === 0 && (
          <p className={styles.vacio}>
            {estado === 'PENDIENTES'
              ? 'No hay alertas pendientes en este rango de fechas.'
              : estado === 'ATENDIDAS'
                ? 'No hay alertas atendidas en este rango de fechas.'
                : 'No hay alertas en este rango de fechas.'}
          </p>
        )}

        {dias.map((dia) => (
          <div key={dia.clave}>
            <h2 className={styles.diaTitulo}>{dia.titulo}</h2>
            <ul className={styles.items}>
              {dia.eventos.map((alerta) => (
                <AlertaItem key={alerta.id} alerta={alerta} nueva={nuevas.has(alerta.id)} onAtendida={aplicarAtencion} />
              ))}
            </ul>
          </div>
        ))}

        {alertas.length > 0 &&
          (cargandoMas ? (
            <>
              <AvisoCarga texto="Cargando más alertas…" />
              <ul className={styles.items} aria-hidden="true">
                <SkeletonEvento />
                <SkeletonEvento />
              </ul>
            </>
          ) : resultado.errorMas ? (
            <button type="button" className={styles.cargarMas} onClick={() => setResultado((r) => ({ ...r, errorMas: null }))}>
              No se pudieron cargar más alertas. Reintentar
            </button>
          ) : hayMas ? (
            <div ref={centinelaRef} className={styles.fin} aria-hidden="true" />
          ) : (
            <p className={styles.fin}>No hay más alertas en este rango.</p>
          ))}
      </div>
    </section>
  )
}

export default Alertas
