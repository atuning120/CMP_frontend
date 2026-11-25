import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { AlertCircle, CalendarDays, LoaderCircle, MapPin, MapPinOff, Maximize, Route, Timer, WifiOff, X } from 'lucide-react'
import MapaPlanta from '../MapaPlanta/MapaPlanta.jsx'
import Skeleton from '../Skeleton/Skeleton.jsx'
import { useGeocercas, useTrayectoCerrado } from '../../hooks/consultas.js'
import { formatearDuracion } from '../../pages/Historial/fechas.js'
import { distanciaRecorridoKm, geojsonRecorrido, tiempoSinSenalMs } from '../../pages/Mapa/recorrido.js'
import { mensajeDeError } from '../../services/errores.js'
import styles from './TrayectoTurno.module.css'

const formatoKm = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 })
const formatoEntero = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 })
const formatoDia = new Intl.DateTimeFormat('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })
const formatoDiaCorto = new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: '2-digit' })
const formatoHora = new Intl.DateTimeFormat('es-CL', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

const SIN_GEOCERCAS = { areas: [], zonas: [] }
const SIN_MAQUINAS = []
// Al pie del mapa no va ninguna tarjeta, solo la escala
const MARGEN_INFERIOR = 64
// En teléfono las etiquetas de inicio y término no deben cortarse contra el borde
const MARGEN_LATERAL = 64

const hora = (fecha) => formatoHora.format(new Date(fecha))
const lngLat = (p) => [p.longitud, p.latitud]
const enMinutos = (ms) => Math.round(ms / 60_000)

// "Lunes, 23 de noviembre" y "08:00 – 16:30" (con el día de término si cruza la medianoche)
const periodo = (inicio, termino) => {
  const desde = new Date(inicio)
  const hasta = new Date(termino)
  const dia = formatoDia.format(desde)
  const cruza = desde.toDateString() !== hasta.toDateString()
  return {
    dia: dia.charAt(0).toUpperCase() + dia.slice(1),
    horas: `${hora(desde)} – ${hora(hasta)}${cruza ? ` del ${formatoDiaCorto.format(hasta)}` : ''}`,
  }
}

// El mismo trazo con que MapaPlanta dibuja cada línea (grosor, contorno y punteado)
function Leyenda({ conSaltos }) {
  return (
    <ul className={styles.leyenda} aria-label="Leyenda del trayecto">
      <li className={styles.item}>
        <svg className={styles.trazo} viewBox="0 0 34 10" aria-hidden="true">
          <line className={styles.contorno} x1="5" y1="5" x2="29" y2="5" />
          <line className={styles.continua} x1="5" y1="5" x2="29" y2="5" />
        </svg>
        Recorrido
      </li>
      {conSaltos && (
        <li className={styles.item}>
          <svg className={styles.trazo} viewBox="0 0 34 10" aria-hidden="true">
            <line className={styles.punteada} x1="3" y1="5" x2="31" y2="5" />
          </svg>
          Sin señal GPS
        </li>
      )}
    </ul>
  )
}

/**
 * Trayecto de la máquina durante un turno ya cerrado (<dialog> nativo: Esc o clic fuera para cerrar). Va sobre el
 * historial y no en /mapa: no se pierden los filtros y no se mezcla con las máquinas en vivo.
 * cierre: el evento FIN_TURNO del historial. Se monta abierto; el padre lo desmonta en onCerrar.
 */
function TrayectoTurno({ cierre, onCerrar }) {
  const { maquina, actor, fecha, detalle } = cierre
  const ref = useRef(null)
  const mapaRef = useRef(null)
  const { areas, zonas } = useGeocercas().data ?? SIN_GEOCERCAS
  const { data, error, isPending, isFetching, refetch } = useTrayectoCerrado(detalle.idTurno)
  const puntos = data?.puntos
  const conPuntos = puntos?.length > 0
  const geojson = useMemo(() => (puntos ? geojsonRecorrido(puntos, { conFin: true }) : null), [puntos])
  const conSaltos = geojson?.features.some((f) => f.properties.tipo === 'salto') ?? false
  const hitos = useMemo(() => {
    if (!puntos?.length) return []
    const inicio = { tipo: 'inicio', texto: `Inicio · ${hora(puntos[0].fechaHora)}`, lngLat: lngLat(puntos[0]) }
    if (puntos.length === 1) return [inicio]
    const ultimo = puntos.at(-1)
    return [inicio, { tipo: 'fin', texto: `Término · ${hora(ultimo.fechaHora)}`, lngLat: lngLat(ultimo) }]
  }, [puntos])

  const { dia, horas } = periodo(detalle.horaInicio, fecha)
  const datos = useMemo(() => {
    const sinSenal = conPuntos ? enMinutos(tiempoSinSenalMs(puntos, detalle.horaInicio, fecha)) : null
    return [
      { icono: Route, etiqueta: 'Distancia', valor: conPuntos ? `${formatoKm.format(distanciaRecorridoKm(puntos))} km` : null },
      {
        icono: Timer,
        etiqueta: 'Duración',
        valor: formatearDuracion(enMinutos(Date.parse(fecha) - Date.parse(detalle.horaInicio))),
        propio: true,
      },
      { icono: WifiOff, etiqueta: 'Sin señal', valor: sinSenal === null ? null : formatearDuracion(sinSenal), aviso: sinSenal > 0 },
      { icono: MapPin, etiqueta: 'Posiciones', valor: puntos ? formatoEntero.format(puntos.length) : null },
    ]
  }, [puntos, conPuntos, detalle.horaInicio, fecha])

  // Antes de que se cree el mapa (un useEffect de MapaPlanta): cerrado, el diálogo no tiene tamaño
  useLayoutEffect(() => {
    const dialog = ref.current
    dialog.showModal()
    return () => dialog.close()
  }, [])

  const encuadrar = useCallback(() => mapaRef.current?.enfocar(geojson, MARGEN_INFERIOR, MARGEN_LATERAL), [geojson])
  useEffect(() => {
    if (conPuntos) encuadrar()
  }, [conPuntos, encuadrar])

  const overlay = conPuntos && (
    <>
      <Leyenda conSaltos={conSaltos} />
      <button type="button" className={styles.encuadrar} onClick={encuadrar} aria-label="Encuadrar el trayecto">
        <Maximize size={14} aria-hidden="true" /> <span className={styles.encuadrarTexto}>Encuadrar</span>
      </button>
    </>
  )

  return (
    <dialog
      ref={ref}
      className={styles.trayectoTurno}
      aria-labelledby="trayecto-turno-titulo"
      onCancel={(e) => {
        e.preventDefault()
        onCerrar()
      }}
      onClick={(e) => e.target === e.currentTarget && onCerrar()}
    >
      <header className={styles.header}>
        <span className={styles.icono} aria-hidden="true">
          <Route size={20} />
        </span>
        <div className={styles.encabezado}>
          <h2 id="trayecto-turno-titulo" className={styles.titulo}>
            Trayecto de {maquina.nombre}
          </h2>
          <p className={styles.subtitulo}>{actor}</p>
        </div>
        <p className={styles.periodo}>
          <CalendarDays size={16} className={styles.periodoIcono} aria-hidden="true" />
          <span className={styles.periodoDia}>{dia}</span>
          <span className={styles.periodoHoras}>{horas}</span>
        </p>
        <button type="button" className={styles.cerrar} onClick={onCerrar} aria-label="Cerrar">
          <X size={18} />
        </button>
      </header>

      <dl className={styles.datos}>
        {datos.map(({ icono: Icono, etiqueta, valor, propio, aviso }) => (
          <div key={etiqueta} className={styles.dato}>
            <dt className={styles.etiqueta}>
              <Icono size={14} aria-hidden="true" /> {etiqueta}
            </dt>
            <dd className={`${styles.valor} ${aviso ? styles.valorAviso : ''}`}>
              {isPending && !propio ? <Skeleton className={styles.skValor} /> : (valor ?? '—')}
            </dd>
          </div>
        ))}
      </dl>

      <div className={styles.lienzo}>
        <MapaPlanta
          ref={mapaRef}
          areas={areas}
          zonas={zonas}
          maquinas={SIN_MAQUINAS}
          recorrido={geojson}
          hitos={hitos}
          overlay={overlay}
          soloLectura
        />
        {isPending && (
          <p className={styles.aviso} role="status">
            <LoaderCircle size={18} className={styles.girando} aria-hidden="true" /> Cargando trayecto…
          </p>
        )}
        {error && !data && !isPending && (
          <p className={styles.aviso} role="alert">
            <AlertCircle size={18} aria-hidden="true" /> {mensajeDeError(error, 'No se pudo cargar el trayecto.')}
            <button type="button" className={styles.reintentar} onClick={() => refetch()} disabled={isFetching}>
              Reintentar
            </button>
          </p>
        )}
        {puntos?.length === 0 && (
          <p className={styles.aviso} role="status">
            <MapPinOff size={18} aria-hidden="true" /> La máquina no registró posiciones GPS durante este turno.
          </p>
        )}
        {data?.truncado && (
          <p className={styles.truncado} role="status">
            El turno tiene más posiciones de las que se pueden mostrar: se ven solo las primeras.
          </p>
        )}
      </div>
    </dialog>
  )
}

export default TrayectoTurno
