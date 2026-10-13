import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, Eye, ShieldCheck } from 'lucide-react'
import FlotaPanel from '../../components/FlotaPanel/FlotaPanel.jsx'
import GeocercasPanel from '../../components/GeocercasPanel/GeocercasPanel.jsx'
import MapaPlanta from '../../components/MapaPlanta/MapaPlanta.jsx'
import { obtenerFlota, obtenerMaquinasConAlerta, puedeVerAlertas } from '../../services/flotaService.js'
import { obtenerMapa } from '../../services/geocercasService.js'
import { esAdmin, useSesion } from '../../services/session.js'
import { ETIQUETA_ESTADO, estadoMaquina, posicionarMaquinas, puntoInterior } from './geo.js'
import styles from './Mapa.module.css'

// La flota cambia con los turnos: se refresca cada minuto mientras la página está abierta
const REFRESCO_FLOTA_MS = 60_000
const formatoHoras = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 })

function Mapa() {
  const sesion = useSesion()
  const admin = esAdmin(sesion)
  const mapaRef = useRef(null)
  const [geocercas, setGeocercas] = useState({ areas: [], zonas: [] })
  const [flota, setFlota] = useState([])
  const [conAlerta, setConAlerta] = useState(() => new Set())
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [modo, setModo] = useState('vista')
  const [seleccion, setSeleccion] = useState(null)
  const [editando, setEditando] = useState(null)
  const [filtro, setFiltro] = useState('todas')
  const [busqueda, setBusqueda] = useState('')

  const cargarGeocercas = useCallback(async () => setGeocercas(await obtenerMapa()), [])

  // Carga inicial y refresco periódico de la flota
  useEffect(() => {
    let vigente = true
    const cargarFlota = async () => {
      const [maquinas, alertas] = await Promise.all([obtenerFlota(), obtenerMaquinasConAlerta()])
      if (!vigente) return
      setFlota(maquinas)
      setConAlerta(alertas)
    }
    const cargarTodo = async () => {
      try {
        const [mapa] = await Promise.all([obtenerMapa(), cargarFlota()])
        if (!vigente) return
        setGeocercas(mapa)
        setError(null)
      } catch (e) {
        if (vigente) setError(e.message)
      } finally {
        if (vigente) setCargando(false)
      }
    }
    cargarTodo()
    const intervalo = setInterval(() => cargarFlota().catch(() => {}), REFRESCO_FLOTA_MS)
    return () => {
      vigente = false
      clearInterval(intervalo)
    }
  }, [])

  const { areas, zonas } = geocercas
  const nombreArea = useMemo(() => new Map(areas.map((a) => [a.idArea, a.nombre])), [areas])

  // Máquinas con su estado, el texto de ubicación y si tienen punto en el mapa
  const posiciones = useMemo(() => posicionarMaquinas(flota, areas, zonas), [flota, areas, zonas])
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

  const seleccionarMaquina = (idMaquina) => {
    setSeleccion({ tipo: 'maquina', id: idMaquina })
    const posicion = posiciones.find((p) => p.maquina.idMaquina === idMaquina)
    if (posicion) mapaRef.current?.enfocar(posicion.lngLat)
  }

  const cambiarModo = (nuevo) => {
    setModo(nuevo)
    setSeleccion(null)
  }

  const alGuardar = useCallback(
    async (nuevaSeleccion) => {
      await cargarGeocercas()
      setSeleccion(nuevaSeleccion)
    },
    [cargarGeocercas],
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
            <span className={`${styles.tarjetaEstado} ${styles[estado]}`}>{ETIQUETA_ESTADO[estado]}</span>
          </div>
        ),
      }
    }
    const geocerca =
      seleccion.tipo === 'area'
        ? areas.find((a) => a.idArea === seleccion.id)
        : zonas.find((z) => z.idZona === seleccion.id)
    if (!geocerca?.poligono || modo === 'edicion') return null
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
  }, [seleccion, editando, marcadores, items, areas, zonas, modo, nombreArea])

  const overlay = (
    <>
      <span className={styles.chip}>
        <span className={styles.chipPunto} />
        Planta Mina Los Colorados (MLC)
      </span>
      {admin ? (
        <span className={styles.modos} role="radiogroup" aria-label="Modo del mapa">
          <button
            type="button"
            role="radio"
            aria-checked={modo === 'vista'}
            className={`${styles.modo} ${modo === 'vista' ? styles.modoActivo : ''}`}
            onClick={() => cambiarModo('vista')}
          >
            <Eye size={14} /> Vista
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={modo === 'edicion'}
            className={`${styles.modo} ${modo === 'edicion' ? styles.modoEdicion : ''}`}
            onClick={() => cambiarModo('edicion')}
          >
            <ShieldCheck size={14} /> Administrador
          </button>
        </span>
      ) : (
        <span className={styles.chip}>
          <Eye size={14} /> Vista · solo lectura
        </span>
      )}
    </>
  )

  return (
    <div className={styles.mapaPage}>
      {modo === 'edicion' ? (
        <GeocercasPanel
          areas={areas}
          zonas={zonas}
          seleccion={seleccion}
          onSeleccionar={setSeleccion}
          mapa={mapaRef}
          onEditando={setEditando}
          onGuardado={alGuardar}
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
          cargando={cargando}
          conAlertas={puedeVerAlertas(sesion)}
        />
      )}

      <section className={styles.mapa} aria-label="Mapa de la planta">
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
