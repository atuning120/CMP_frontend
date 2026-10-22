import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, ChevronLeft, ChevronRight, Eye, Info, Layers, Truck } from 'lucide-react'
import FlotaPanel from '../../components/FlotaPanel/FlotaPanel.jsx'
import GeocercasPanel from '../../components/GeocercasPanel/GeocercasPanel.jsx'
import LeyendaMapa from '../../components/LeyendaMapa/LeyendaMapa.jsx'
import MapaPlanta from '../../components/MapaPlanta/MapaPlanta.jsx'
import Skeleton from '../../components/Skeleton/Skeleton.jsx'
import { CLAVES, errorSinDatos, useFlota, useGeocercas, useMaquinasConAlerta } from '../../hooks/consultas.js'
import { puedeVerAlertas } from '../../services/flotaService.js'
import { reordenarAreas } from '../../services/geocercasService.js'
import { esAdmin, useSesion } from '../../services/session.js'
import { obtenerUltimasPosiciones, suscribirPosiciones } from '../../services/trackingService.js'
import { actualizarGps, ETIQUETA_ESTADO, estadoMaquina, posicionarMaquinas, puntoInterior } from './geo.js'
import styles from './Mapa.module.css'

// La flota cambia con los turnos: se refresca cada minuto mientras la página está abierta
const REFRESCO_FLOTA_MS = 60_000

// Preferencia de cada usuario en su navegador: el panel lateral contraído o expandido
const CLAVE_PANEL = 'mapa.panelContraido'
const leerContraido = () => {
  try {
    return localStorage.getItem(CLAVE_PANEL) === '1'
  } catch {
    return false
  }
}
const formatoHoras = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 })

// Mientras no llega cada respuesta (referencias estables para los useMemo)
const SIN_GEOCERCAS = { areas: [], zonas: [] }
const SIN_MAQUINAS = []
const SIN_ALERTAS = new Set()
const SIN_GPS = new Map()

// "hace 3 min" desde la fecha de una posición GPS
const haceCuanto = (fechaHora, ahora) => {
  const minutos = Math.floor((ahora - Date.parse(fechaHora)) / 60_000)
  return minutos < 1 ? 'hace menos de 1 min' : `hace ${minutos} min`
}

function Mapa() {
  const sesion = useSesion()
  const admin = esAdmin(sesion)
  const mapaRef = useRef(null)
  const seccionMapaRef = useRef(null)
  const queryClient = useQueryClient()
  // Al volver al mapa se dibuja lo último recibido (caché) mientras se actualiza en segundo plano
  const geocercasQuery = useGeocercas()
  const flotaQuery = useFlota({ refetchInterval: REFRESCO_FLOTA_MS })
  const alertasQuery = useMaquinasConAlerta({ refetchInterval: REFRESCO_FLOTA_MS })
  // Última posición GPS de cada máquina (idMaquina -> posición): las de /tracking/ultimas al abrir (y al recuperar la
  // conexión) se suman a las que llegan por WebSocket. Si el tracking falla el mapa sigue con la zona de cada turno
  const gpsQuery = useQuery({
    queryKey: CLAVES.gps,
    queryFn: async () => {
      const posiciones = await obtenerUltimasPosiciones()
      return actualizarGps(queryClient.getQueryData(CLAVES.gps) ?? SIN_GPS, posiciones)
    },
    // Sin el WebSocket (fuera del mapa) se pierden posiciones: al volver siempre se piden las últimas
    staleTime: 0,
    refetchOnWindowFocus: false,
  })
  const geocercas = geocercasQuery.data ?? SIN_GEOCERCAS
  const flota = flotaQuery.data ?? SIN_MAQUINAS
  const conAlerta = alertasQuery.data ?? SIN_ALERTAS
  const gps = gpsQuery.data ?? SIN_GPS
  const cargandoGeocercas = geocercasQuery.isPending
  const cargandoFlota = flotaQuery.isPending
  const error = errorSinDatos(geocercasQuery) ?? errorSinDatos(flotaQuery)
  // Hora de referencia para descartar posiciones GPS viejas; avanza cada minuto y con cada posición nueva
  const [ahora, setAhora] = useState(() => Date.now())
  const [modo, setModo] = useState('flota')
  const [contraido, setContraido] = useState(leerContraido)
  const [seleccion, setSeleccion] = useState(null)
  const [destinoDetalle, setDestinoDetalle] = useState(null)
  const [editando, setEditando] = useState(null)
  const [filtro, setFiltro] = useState('todas')
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    const intervalo = setInterval(() => setAhora(Date.now()), REFRESCO_FLOTA_MS)
    return () => clearInterval(intervalo)
  }, [])

  // Posiciones GPS en tiempo real por WebSocket
  useEffect(() => {
    let vigente = true
    const agregar = (posiciones) => {
      if (!vigente) return
      queryClient.setQueryData(CLAVES.gps, (actual) => actualizarGps(actual ?? SIN_GPS, posiciones))
      setAhora(Date.now())
    }
    const desuscribir = suscribirPosiciones({
      alRecibir: agregar,
      alReconectar: () => queryClient.invalidateQueries({ queryKey: CLAVES.gps }),
    })
    return () => {
      vigente = false
      desuscribir()
    }
  }, [queryClient])

  const { areas, zonas } = geocercas
  const nombreArea = useMemo(() => new Map(areas.map((a) => [a.idArea, a.nombre])), [areas])

  // Máquinas con su estado, el texto de ubicación y si tienen punto en el mapa
  const posiciones = useMemo(() => posicionarMaquinas(flota, areas, zonas, gps, ahora), [flota, areas, zonas, gps, ahora])
  const items = useMemo(() => {
    const enMapa = new Set(posiciones.map((p) => p.maquina.idMaquina))
    return flota.map((maquina) => {
      const area = nombreArea.get(maquina.idAreaActual)
      const ubicacion =
        maquina.ubicacionActual && area && maquina.ubicacionActual !== area
          ? `${maquina.ubicacionActual} · ${area}`
          : maquina.ubicacionActual
      return { maquina, estado: estadoMaquina(maquina, conAlerta), ubicacion, enMapa: enMapa.has(maquina.idMaquina) }
    })
  }, [flota, posiciones, nombreArea, conAlerta])

  const conteos = useMemo(
    () => ({
      todas: items.length,
      operando: items.filter((i) => i.estado === 'operando' || i.estado === 'alerta').length,
      alertas: items.filter((i) => i.estado === 'alerta').length,
      fuera: items.filter((i) => i.estado === 'fuera').length,
    }),
    [items],
  )

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return items.filter((i) => {
      if (filtro === 'operando' && i.estado !== 'operando' && i.estado !== 'alerta') return false
      if (filtro === 'alertas' && i.estado !== 'alerta') return false
      if (!texto) return true
      const { maquina } = i
      return [maquina.nombre, maquina.tipoMaquina, maquina.modelo, maquina.operadorActual, i.ubicacion]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(texto))
    })
  }, [items, filtro, busqueda])

  const marcadores = useMemo(() => {
    const estados = new Map(items.map((i) => [i.maquina.idMaquina, i.estado]))
    return posiciones.map((p) => ({ ...p, estado: estados.get(p.maquina.idMaquina) }))
  }, [posiciones, items])

  // En pantalla angosta la lista va bajo el mapa: se vuelve a él para ver lo elegido o dibujar
  const verMapa = useCallback(() => {
    if (!matchMedia('(max-width: 900px)').matches) return
    const suave = !matchMedia('(prefers-reduced-motion: reduce)').matches
    seccionMapaRef.current?.scrollIntoView({ behavior: suave ? 'smooth' : 'auto', block: 'start' })
  }, [])

  const seleccionarMaquina = (idMaquina) => {
    setSeleccion({ tipo: 'maquina', id: idMaquina })
    const posicion = posiciones.find((p) => p.maquina.idMaquina === idMaquina)
    if (posicion) {
      mapaRef.current?.enfocar(posicion.lngLat)
      verMapa()
    }
  }

  const cambiarModo = (nuevo) => {
    setModo(nuevo)
    setSeleccion(null)
  }

  const alternarPanel = (valor) => {
    setContraido(valor)
    try {
      localStorage.setItem(CLAVE_PANEL, valor ? '1' : '0')
    } catch {
      // Sin localStorage la preferencia dura solo esta visita
    }
  }

  // Desde la barra contraída: abre el panel en la sección elegida
  const abrirEn = (nuevo) => {
    if (nuevo !== modo) cambiarModo(nuevo)
    alternarPanel(false)
  }

  // El listado cambia de inmediato; si el Backend rechaza el orden se recarga el vigente
  const alReordenar = useCallback(
    async (idsAreas) => {
      // Una recarga en curso pisaría el orden nuevo con el anterior
      await queryClient.cancelQueries({ queryKey: CLAVES.geocercas })
      queryClient.setQueryData(CLAVES.geocercas, (g) => {
        const porId = new Map(g.areas.map((a) => [a.idArea, a]))
        return { ...g, areas: idsAreas.map((id) => porId.get(id)) }
      })
      try {
        await reordenarAreas(idsAreas)
      } catch (e) {
        await queryClient.invalidateQueries({ queryKey: CLAVES.geocercas })
        throw e
      }
    },
    [queryClient],
  )

  // La geocerca ya quedó guardada: si la recarga falla se verá en el próximo refresco
  const alGuardar = useCallback(
    async (nuevaSeleccion) => {
      await queryClient.invalidateQueries({ queryKey: CLAVES.geocercas })
      setSeleccion(nuevaSeleccion)
    },
    [queryClient],
  )

  // Tarjeta flotante sobre la máquina, zona o área seleccionada
  const popup = useMemo(() => {
    if (!seleccion || editando) return null
    if (seleccion.tipo === 'maquina') {
      const posicion = marcadores.find((p) => p.maquina.idMaquina === seleccion.id)
      const item = items.find((i) => i.maquina.idMaquina === seleccion.id)
      if (!posicion || !item) return null
      const { maquina, estado, ubicacion } = item
      return {
        lngLat: posicion.lngLat,
        contenido: (
          <div className={styles.tarjeta}>
            <strong className={styles.tarjetaTitulo}>
              {maquina.nombre} · {[maquina.tipoMaquina, maquina.modelo].filter(Boolean).join(' ')}
            </strong>
            <span>Operador: {maquina.operadorActual}</span>
            <span>{ubicacion}</span>
            {maquina.horometroActual !== null && <span>Horómetro: {formatoHoras.format(maquina.horometroActual)} h</span>}
            {posicion.gps && (
              <span>
                GPS {haceCuanto(posicion.gps.fechaHora, ahora)}
                {posicion.gps.velocidad !== null && ` · ${formatoHoras.format(posicion.gps.velocidad)} km/h`}
              </span>
            )}
            <span className={`${styles.tarjetaEstado} ${styles[estado]}`}>{ETIQUETA_ESTADO[estado]}</span>
          </div>
        ),
      }
    }
    const geocerca =
      seleccion.tipo === 'area'
        ? areas.find((a) => a.idArea === seleccion.id)
        : zonas.find((z) => z.idZona === seleccion.id)
    if (!geocerca?.poligono || modo === 'geocercas') return null
    const maquinasDentro = marcadores.filter((p) =>
      seleccion.tipo === 'area' ? p.maquina.idAreaActual === seleccion.id : p.maquina.idZonaActual === seleccion.id,
    ).length
    return {
      lngLat: puntoInterior(geocerca.poligono),
      contenido: (
        <div className={styles.tarjeta}>
          <span className={styles.tarjetaTipo}>{seleccion.tipo === 'area' ? 'Área' : 'Zona de trabajo'}</span>
          <strong className={styles.tarjetaTitulo}>{geocerca.nombre}</strong>
          {seleccion.tipo === 'zona' && <span>{nombreArea.get(geocerca.idArea)}</span>}
          {geocerca.descripcion && <span>{geocerca.descripcion}</span>}
          <span>
            {maquinasDentro === 0 ? 'Sin máquinas operando' : `${maquinasDentro} máquina${maquinasDentro === 1 ? '' : 's'} operando`}
          </span>
        </div>
      ),
    }
  }, [seleccion, editando, marcadores, items, areas, zonas, modo, nombreArea, ahora])

  const overlay = (
    <>
      <span className={`${styles.chip} ${styles.chipPlanta}`}>
        <span className={styles.chipPunto} />
        Planta Mina Los Colorados (MLC)
      </span>
      {/* Qué muestra la columna izquierda: la flota o, para un administrador, la edición de geocercas */}
      {admin && (
        <span className={styles.modos} role="radiogroup" aria-label="Contenido del panel lateral">
          <button
            type="button"
            role="radio"
            aria-checked={modo === 'flota'}
            className={`${styles.modo} ${modo === 'flota' ? styles.modoActivo : ''}`}
            onClick={() => cambiarModo('flota')}
          >
            <Truck size={14} /> Flota
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={modo === 'geocercas'}
            className={`${styles.modo} ${modo === 'geocercas' ? styles.modoGeocercas : ''}`}
            onClick={() => cambiarModo('geocercas')}
          >
            <Layers size={14} /> Geocercas
          </button>
        </span>
      )}
      {sesion?.rol === 'VISOR' && (
        <span className={styles.chip}>
          <Eye size={14} /> Solo lectura
        </span>
      )}
    </>
  )

  return (
    <div
      className={`${styles.mapaPage} ${contraido ? styles.contraido : ''} ${editando ? styles.editandoGeocerca : ''}`}
    >
      <div id="panel-lateral-mapa" className={styles.lateral}>
        {contraido ? (
          <nav className={styles.rail} aria-label="Panel lateral contraído">
            {/* Secciones: al elegir una, el panel se expande en ella */}
            <div className={styles.railSecciones}>
              <button
                type="button"
                className={`${styles.railBoton} ${modo === 'flota' ? styles.railActivo : ''}`}
                onClick={() => abrirEn('flota')}
                aria-label={`Flota: ${items.length} equipos`}
                data-tooltip="Flota"
              >
                <span className={styles.railIcono}>
                  <Truck size={20} />
                  <span className={styles.railInsignia}>{items.length}</span>
                </span>
                <span className={styles.railTexto}>Flota</span>
              </button>
              {admin && (
                <button
                  type="button"
                  className={`${styles.railBoton} ${modo === 'geocercas' ? styles.railActivo : ''}`}
                  onClick={() => abrirEn('geocercas')}
                  aria-label={`Geocercas: ${areas.length} áreas`}
                  data-tooltip="Geocercas"
                >
                  <span className={styles.railIcono}>
                    <Layers size={20} />
                    {!cargandoGeocercas && <span className={styles.railInsignia}>{areas.length}</span>}
                  </span>
                  <span className={styles.railTexto}>Geocercas</span>
                </button>
              )}
            </div>

            {/* Resumen del estado de la flota, visible aunque el panel esté contraído */}
            <ul className={styles.railResumen} aria-label="Resumen de la flota">
              <li className={styles.railDato} data-tooltip="Operando ahora" tabIndex={0}>
                <span className={`${styles.railPunto} ${styles.railOperando}`} />
                {cargandoFlota ? (
                  <Skeleton className={styles.skRailNumero} />
                ) : (
                  <span className={styles.railNumero}>{conteos.operando}</span>
                )}
                <span className={styles.visuallyHidden}>operando</span>
              </li>
              {puedeVerAlertas(sesion) && (
                <li className={styles.railDato} data-tooltip="Con alerta (turno de más de 10 h)" tabIndex={0}>
                  <span className={`${styles.railPunto} ${styles.railAlerta}`} />
                  {cargandoFlota ? (
                    <Skeleton className={styles.skRailNumero} />
                  ) : (
                    <span className={styles.railNumero}>{conteos.alertas}</span>
                  )}
                  <span className={styles.visuallyHidden}>con alerta</span>
                </li>
              )}
              <li className={styles.railDato} data-tooltip="Fuera de servicio" tabIndex={0}>
                <span className={`${styles.railPunto} ${styles.railFuera}`} />
                {cargandoFlota ? (
                  <Skeleton className={styles.skRailNumero} />
                ) : (
                  <span className={styles.railNumero}>{conteos.fuera}</span>
                )}
                <span className={styles.visuallyHidden}>fuera de servicio</span>
              </li>
            </ul>

            {/* Al pie: la leyenda del mapa, que con el panel expandido va al final de la lista */}
            <div className={styles.railInfo}>
              <button type="button" className={styles.railInfoBoton} aria-label="Leyenda del mapa" aria-describedby="leyenda-barra">
                <Info size={18} />
              </button>
              <div id="leyenda-barra" role="tooltip" className={styles.railLeyenda}>
                <LeyendaMapa conAlertas={puedeVerAlertas(sesion)} />
              </div>
            </div>
          </nav>
        ) : modo === 'geocercas' ? (
          <GeocercasPanel
            areas={areas}
            zonas={zonas}
            seleccion={seleccion}
            onSeleccionar={setSeleccion}
            mapa={mapaRef}
            destino={destinoDetalle}
            onEditando={setEditando}
            onGuardado={alGuardar}
            onVerMapa={verMapa}
            onReordenar={alReordenar}
            cargando={cargandoGeocercas}
          />
        ) : (
          <FlotaPanel
            items={visibles}
            total={items.length}
            filtro={filtro}
            onFiltro={setFiltro}
            busqueda={busqueda}
            onBusqueda={setBusqueda}
            conteos={conteos}
            seleccionada={seleccion?.tipo === 'maquina' ? seleccion.id : null}
            onSeleccionar={seleccionarMaquina}
            cargando={cargandoGeocercas || cargandoFlota}
            conAlertas={puedeVerAlertas(sesion)}
          />
        )}
      </div>

      <section ref={seccionMapaRef} className={styles.mapa} aria-label="Mapa de la planta">
        {/* Un único control para contraer y expandir, siempre en el mismo lugar: la pestaña del borde.
            Mientras se dibuja una geocerca no se contrae (se perdería el dibujo) */}
        <button
          type="button"
          className={styles.alternar}
          onClick={() => alternarPanel(!contraido)}
          aria-expanded={!contraido}
          aria-controls="panel-lateral-mapa"
          aria-label={contraido ? 'Expandir panel lateral' : 'Contraer panel lateral'}
          data-tooltip={contraido ? 'Expandir panel' : 'Contraer panel'}
          disabled={!contraido && Boolean(editando)}
        >
          {contraido ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
        <MapaPlanta
          ref={mapaRef}
          areas={areas}
          zonas={zonas}
          maquinas={marcadores}
          seleccion={seleccion}
          onSeleccionar={setSeleccion}
          editando={editando}
          popup={popup}
          overlay={overlay}
        />
        {/* Tarjeta flotante de la geocerca seleccionada (la llena GeocercasPanel con un portal) */}
        <div ref={setDestinoDetalle} className={styles.detalleGeocerca} />
        {error && (
          <p className={styles.error} role="alert">
            <AlertCircle size={16} /> {error}
          </p>
        )}
      </section>
    </div>
  )
}

export default Mapa
