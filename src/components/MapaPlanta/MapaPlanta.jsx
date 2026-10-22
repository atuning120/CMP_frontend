import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import bbox from '@turf/bbox'
import { Map as MapLibreMap, Marker, NavigationControl, Popup, ScaleControl, setWorkerUrl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
// MapLibre 6 procesa los datos en un worker ES aparte que Vite no detecta solo; `?worker&url`
// lo empaqueta con sus dependencias (con `?url` a secas falla en el build de producción)
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { TerraDraw, TerraDrawPolygonMode, TerraDrawSelectMode } from 'terra-draw'
import { TerraDrawMapLibreGLAdapter } from 'terra-draw-maplibre-gl-adapter'
import { aUtm, LOS_COLORADOS, puntoInterior } from '../../pages/Mapa/geo.js'
import Skeleton from '../Skeleton/Skeleton.jsx'
import styles from './MapaPlanta.module.css'

setWorkerUrl(workerUrl)

// Imagen satelital de Esri (ArcGIS). Sobre Los Colorados hay imagen real hasta z18 (~0,5 m/px); desde
// z19 Esri responde "Map data not yet available", así que se amplía z18 hasta el zoom máximo del mapa
const ESTILO = {
  version: 8,
  sources: {
    satelite: {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      maxzoom: 18,
      attribution: 'Imagery © Esri, Maxar, Earthstar Geographics',
    },
  },
  layers: [{ id: 'satelite', type: 'raster', source: 'satelite' }],
}

const VACIO = { type: 'FeatureCollection', features: [] }
const CAPAS_SELECCIONABLES = ['zonas-relleno', 'areas-relleno']

// Los colores salen de los tokens del tema (src/index.css)
const token = (nombre) => getComputedStyle(document.documentElement).getPropertyValue(nombre).trim()

const coleccion = (items, idKey, excluir) => ({
  type: 'FeatureCollection',
  features: items
    .filter((i) => i.poligono && i[idKey] !== excluir)
    .map((i) => ({ type: 'Feature', id: i[idKey], geometry: i.poligono, properties: { id: i[idKey] } })),
})

// Varias máquinas en la misma zona se reparten en un círculo de 26 px alrededor del punto
const desplazamiento = (indice) => {
  if (indice === 0) return [0, 0]
  const angulo = (indice - 1) * (Math.PI / 3)
  return [Math.round(Math.cos(angulo) * 26), Math.round(Math.sin(angulo) * 26)]
}

// Última vista del mapa (centro, zoom y rotación): sobrevive a la navegación entre páginas para que
// al volver a /mapa quede encuadrado donde estaba; al recargar la pestaña se parte de la vista inicial
let ultimaVista = { center: LOS_COLORADOS, zoom: 14.2, bearing: 0 }

const formatoUtm = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 })

// Puntos ya marcados del polígono que se está dibujando. Terra Draw los lleva en committedCoordinateCount;
// si no viniera, se cuentan los vértices distintos del anillo (sin el de cierre, que repite el primero)
const puntosEnDibujo = (draw) => {
  const enCurso = draw.getSnapshot().find((f) => f.properties.currentlyDrawing)
  if (!enCurso) return 0
  const { committedCoordinateCount } = enCurso.properties
  if (Number.isInteger(committedCoordinateCount)) return committedCoordinateCount
  return new Set(enCurso.geometry.coordinates[0].slice(0, -1).map((c) => c.join())).size
}

/**
 * Mapa satelital de la planta con áreas (borde discontinuo), zonas de trabajo (borde continuo) y
 * máquinas. Expone por `ref` el control del dibujo (Terra Draw) para el modo administrador.
 */
function MapaPlanta({ ref, areas, zonas, maquinas, seleccion, onSeleccionar, editando, popup, overlay }) {
  const contenedorRef = useRef(null)
  const mapRef = useRef(null)
  const drawRef = useRef(null)
  const modoPoligonoRef = useRef(null)
  const listoRef = useRef(false)
  const marcadoresRef = useRef([])
  const popupRef = useRef(null)
  const onSeleccionarRef = useRef(onSeleccionar)
  const [listo, setListo] = useState(false)
  const [cursor, setCursor] = useState(null)
  const [popupNodo] = useState(() => document.createElement('div'))

  useEffect(() => {
    onSeleccionarRef.current = onSeleccionar
  }, [onSeleccionar])

  // Mapa, capas y Terra Draw: se crean una sola vez
  useEffect(() => {
    const map = new MapLibreMap({
      container: contenedorRef.current,
      style: ESTILO,
      ...ultimaVista,
      maxZoom: 20,
      // Vista siempre cenital: se puede desplazar y rotar, pero no inclinar (sin eje z)
      maxPitch: 0,
      pitchWithRotate: false,
      attributionControl: { compact: true },
    })
    map.touchPitch.disable()
    map.addControl(new NavigationControl({ visualizePitch: false }), 'top-right')
    map.addControl(new ScaleControl({ unit: 'metric' }), 'bottom-left')
    mapRef.current = map

    // MapLibre solo escucha el tamaño de la ventana: al contraer o expandir el panel lateral cambia
    // el ancho del contenedor y hay que avisarle para que redibuje sin deformarse
    const observador = new ResizeObserver(() => map.resize())
    observador.observe(contenedorRef.current)

    const area = token('--map-area')
    const contornoArea = token('--map-area-casing')
    const zona = token('--map-zona')
    const sel = token('--map-seleccion')

    map.once('load', () => {
      map.addSource('areas', { type: 'geojson', data: VACIO })
      map.addSource('zonas', { type: 'geojson', data: VACIO })
      const seleccionado = ['boolean', ['feature-state', 'seleccionado'], false]
      map.addLayer({
        id: 'areas-relleno',
        type: 'fill',
        source: 'areas',
        paint: { 'fill-color': ['case', seleccionado, sel, area], 'fill-opacity': ['case', seleccionado, 0.14, 0.06] },
      })
      // Contorno oscuro bajo la línea discontinua: se lee igual sobre terreno claro y sobre el rajo
      map.addLayer({
        id: 'areas-contorno',
        type: 'line',
        source: 'areas',
        paint: { 'line-color': contornoArea, 'line-width': ['case', seleccionado, 5, 3.6], 'line-opacity': 0.75 },
      })
      map.addLayer({
        id: 'areas-borde',
        type: 'line',
        source: 'areas',
        paint: {
          'line-color': ['case', seleccionado, sel, area],
          'line-width': ['case', seleccionado, 2.5, 1.6],
          'line-dasharray': [3, 2],
        },
      })
      map.addLayer({
        id: 'zonas-relleno',
        type: 'fill',
        source: 'zonas',
        paint: { 'fill-color': ['case', seleccionado, sel, zona], 'fill-opacity': ['case', seleccionado, 0.3, 0.2] },
      })
      map.addLayer({
        id: 'zonas-contorno',
        type: 'line',
        source: 'zonas',
        paint: { 'line-color': contornoArea, 'line-width': ['case', seleccionado, 5.5, 4], 'line-opacity': 0.6 },
      })
      map.addLayer({
        id: 'zonas-borde',
        type: 'line',
        source: 'zonas',
        paint: { 'line-color': ['case', seleccionado, sel, zona], 'line-width': ['case', seleccionado, 3, 2.2] },
      })

      // Clic en una zona (tiene prioridad) o en un área. Mientras se dibuja, el clic es de Terra Draw
      map.on('click', (e) => {
        if (drawRef.current && drawRef.current.getMode() !== 'static') return
        const [hit] = map.queryRenderedFeatures(e.point, { layers: CAPAS_SELECCIONABLES })
        if (!hit) return onSeleccionarRef.current(null)
        onSeleccionarRef.current({ tipo: hit.layer.id === 'zonas-relleno' ? 'zona' : 'area', id: hit.id })
      })
      map.on('mousemove', (e) => {
        setCursor(e.lngLat)
        const dibujando = drawRef.current && drawRef.current.getMode() !== 'static'
        const sobre = !dibujando && map.queryRenderedFeatures(e.point, { layers: CAPAS_SELECCIONABLES }).length > 0
        map.getCanvas().style.cursor = sobre ? 'pointer' : ''
      })
      map.on('mouseout', () => setCursor(null))

      const draw = new TerraDraw({
        adapter: new TerraDrawMapLibreGLAdapter({ map }),
        modes: [
          (modoPoligonoRef.current = new TerraDrawPolygonMode({
            styles: {
              fillColor: sel,
              fillOpacity: 0.25,
              outlineColor: sel,
              outlineWidth: 2,
              closingPointColor: sel,
              closingPointOutlineColor: area,
            },
          })),
          new TerraDrawSelectMode({
            // Radio invisible (px) alrededor de cada vértice dentro del cual se puede tomar para arrastrarlo
            pointerDistance: 40,
            // Un clic que no cae justo sobre la geocerca no la deselecciona: sin selección los vértices no se
            // pueden arrastrar, y eso obligaba a apuntar con precisión. Se sale de la edición con Guardar/Cancelar
            allowManualDeselection: false,
            // El cursor avisa que el vértice ya está al alcance antes de presionar
            cursors: { pointerOverCoordinate: 'grab', dragStart: 'grabbing', dragEnd: 'grab' },
            flags: {
              polygon: {
                feature: { draggable: true, coordinates: { midpoints: true, draggable: true, deletable: true } },
              },
            },
            styles: {
              selectedPolygonColor: sel,
              selectedPolygonFillOpacity: 0.25,
              selectedPolygonOutlineColor: sel,
              selectionPointColor: sel,
              selectionPointOutlineColor: area,
              selectionPointWidth: 7,
              selectionPointOutlineWidth: 2,
              midPointColor: area,
              midPointWidth: 5,
            },
          }),
        ],
      })
      draw.start()
      drawRef.current = draw
      listoRef.current = true
      setListo(true)
    })

    return () => {
      observador.disconnect()
      marcadoresRef.current.forEach((m) => m.remove())
      marcadoresRef.current = []
      popupRef.current?.remove()
      drawRef.current?.stop()
      drawRef.current = null
      listoRef.current = false
      ultimaVista = { center: map.getCenter().toArray(), zoom: map.getZoom(), bearing: map.getBearing() }
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Polígonos (el que se está editando se oculta: lo muestra Terra Draw)
  useEffect(() => {
    if (!listo) return
    const map = mapRef.current
    map.getSource('areas').setData(coleccion(areas, 'idArea', editando?.tipo === 'area' ? editando.id : null))
    map.getSource('zonas').setData(coleccion(zonas, 'idZona', editando?.tipo === 'zona' ? editando.id : null))
  }, [listo, areas, zonas, editando])

  // Resaltado de la selección con feature-state (no hace falta regenerar los datos)
  useEffect(() => {
    if (!listo || !seleccion || (seleccion.tipo !== 'area' && seleccion.tipo !== 'zona')) return
    const map = mapRef.current
    const fuente = { source: seleccion.tipo === 'area' ? 'areas' : 'zonas', id: seleccion.id }
    map.setFeatureState(fuente, { seleccionado: true })
    return () => {
      if (mapRef.current?.getSource(fuente.source)) mapRef.current.setFeatureState(fuente, { seleccionado: false })
    }
  }, [listo, seleccion, areas, zonas])

  // Etiquetas de áreas y zonas, y marcadores de máquinas (HTML, estilados con el CSS module)
  useEffect(() => {
    if (!listo) return
    const map = mapRef.current
    marcadoresRef.current.forEach((m) => m.remove())
    const nuevos = []

    const etiqueta = (texto, clase, lngLat, anchor, onClick) => {
      const el = document.createElement('button')
      el.type = 'button'
      el.className = clase
      el.textContent = texto
      el.addEventListener('click', (e) => {
        e.stopPropagation()
        onClick()
      })
      nuevos.push(new Marker({ element: el, anchor }).setLngLat(lngLat).addTo(map))
    }

    areas.forEach((a) => {
      if (!a.poligono || (editando?.tipo === 'area' && editando.id === a.idArea)) return
      // Etiqueta del área sobre su borde norte
      const [oeste, , este, norte] = bbox(a.poligono)
      etiqueta(a.nombre, styles.areaLabel, [(oeste + este) / 2, norte], 'bottom', () =>
        onSeleccionarRef.current({ tipo: 'area', id: a.idArea }),
      )
    })
    zonas.forEach((z) => {
      if (!z.poligono || (editando?.tipo === 'zona' && editando.id === z.idZona)) return
      etiqueta(z.nombre, styles.zonaLabel, puntoInterior(z.poligono), 'top', () =>
        onSeleccionarRef.current({ tipo: 'zona', id: z.idZona }),
      )
    })
    maquinas.forEach(({ maquina, lngLat, indice, estado, categoria }) => {
      const activa = seleccion?.tipo === 'maquina' && seleccion.id === maquina.idMaquina
      const el = document.createElement('button')
      el.type = 'button'
      el.className = `${styles.maquina} ${styles[estado] ?? ''} ${styles[categoria] ?? ''} ${activa ? styles.maquinaActiva : ''}`
      el.setAttribute('aria-label', `Máquina ${maquina.nombre}`)
      el.setAttribute('aria-pressed', String(activa))
      const punto = document.createElement('span')
      punto.className = styles.punto
      const codigo = document.createElement('span')
      codigo.className = styles.codigo
      codigo.textContent = maquina.nombre
      el.append(punto, codigo)
      // Un segundo clic sobre la máquina ya seleccionada la deselecciona (y cierra su tarjeta)
      el.addEventListener('click', (e) => {
        e.stopPropagation()
        onSeleccionarRef.current(activa ? null : { tipo: 'maquina', id: maquina.idMaquina })
      })
      nuevos.push(new Marker({ element: el, anchor: 'top', offset: desplazamiento(indice) }).setLngLat(lngLat).addTo(map))
    })

    marcadoresRef.current = nuevos
  }, [listo, areas, zonas, maquinas, seleccion, editando])

  // Tarjeta flotante (contenido React vía portal dentro del popup de MapLibre)
  useEffect(() => {
    if (!listo) return
    popupRef.current?.remove()
    popupRef.current = null
    if (!popup) return
    popupRef.current = new Popup({ closeButton: false, closeOnClick: false, offset: 18, maxWidth: '300px', className: styles.popup })
      .setLngLat(popup.lngLat)
      .setDOMContent(popupNodo)
      .addTo(mapRef.current)
  }, [listo, popup, popupNodo])

  useImperativeHandle(ref, () => ({
    // Encuadra un polígono o centra un punto
    enfocar(objetivo) {
      const map = mapRef.current
      if (!map) return
      if (Array.isArray(objetivo)) return map.flyTo({ center: objetivo, zoom: Math.max(map.getZoom(), 16.5) })
      const [o, s, e, n] = bbox(objetivo)
      // En teléfono la tarjeta de la geocerca ocupa el borde inferior: se deja ese espacio libre
      const angosto = map.getContainer().clientWidth <= 640
      const padding = angosto ? { top: 56, bottom: 184, left: 24, right: 24 } : 80
      map.fitBounds([[o, s], [e, n]], { padding, maxZoom: 18 })
    },
    // Dibuja un polígono nuevo; al cerrarlo queda seleccionado para ajustar sus vértices
    dibujar(onTerminado) {
      const draw = drawRef.current
      if (!draw) return
      draw.clear()
      draw.setMode('polygon')
      const alTerminar = (id) => {
        draw.off('finish', alTerminar)
        draw.setMode('select')
        draw.selectFeature(id)
        onTerminado()
      }
      draw.on('finish', alTerminar)
    },
    // Cierra el polígono en curso con los puntos ya marcados (mínimo 3), sin tener que tocar el primero:
    // equivale a la tecla Enter, el atajo de "terminar" del modo polígono. Dispara el mismo 'finish'
    cerrarFigura() {
      modoPoligonoRef.current?.onKeyUp({ key: 'Enter', heldKeys: [], preventDefault: () => {} })
    },
    // Quita el último punto marcado. Con uno solo, el undo de Terra Draw no tiene a qué volver: se borra el
    // dibujo y el modo polígono queda listo para marcar desde cero
    deshacerPunto() {
      const draw = drawRef.current
      if (!draw) return
      if (puntosEnDibujo(draw) <= 1) draw.clear()
      else modoPoligonoRef.current?.undo()
    },
    // Avisa cuántos puntos lleva el polígono en curso, ahora y en cada cambio. Devuelve cómo dejar de observar
    observarDibujo(alCambiar) {
      const draw = drawRef.current
      if (!draw) return () => {}
      const avisar = () => alCambiar(puntosEnDibujo(draw))
      draw.on('change', avisar)
      avisar()
      return () => draw.off('change', avisar)
    },
    // Carga un polígono existente para mover sus vértices
    editarForma(poligono) {
      const draw = drawRef.current
      if (!draw) return
      draw.clear()
      const id = crypto.randomUUID()
      draw.addFeatures([{ id, type: 'Feature', geometry: poligono, properties: { mode: 'polygon' } }])
      draw.setMode('select')
      draw.selectFeature(id)
      this.enfocar(poligono)
    },
    // Polígono dibujado o editado (o null si no hay)
    geometria() {
      const poligono = drawRef.current?.getSnapshot().find((f) => f.geometry.type === 'Polygon')
      return poligono ? poligono.geometry : null
    },
    // Avisa el polígono actual ahora y en cada cambio (vértices arrastrados o agregados). Devuelve cómo dejar de observar
    observarGeometria(alCambiar) {
      const draw = drawRef.current
      if (!draw) return () => {}
      const avisar = () => alCambiar(this.geometria())
      draw.on('change', avisar)
      avisar()
      return () => draw.off('change', avisar)
    },
    cancelarDibujo() {
      const draw = drawRef.current
      if (!draw) return
      draw.clear()
      draw.setMode('static')
    },
  }))

  const utm = cursor ? aUtm(cursor.lng, cursor.lat) : null

  return (
    <div className={styles.mapaPlanta}>
      <div ref={contenedorRef} className={styles.mapa} />
      {/* Hasta que MapLibre carga el estilo y las primeras imágenes satelitales */}
      {!listo && <Skeleton className={styles.cargando} />}
      <div className={styles.overlay}>
        {overlay}
        <span className={styles.coordenadas}>
          {utm
            ? `UTM ${utm.zona}${utm.hemisferio}  ${formatoUtm.format(utm.este)} E / ${formatoUtm.format(utm.norte)} N`
            : 'Mueve el cursor sobre el mapa'}
        </span>
      </div>
      {popup && createPortal(popup.contenido, popupNodo)}
    </div>
  )
}

export default MapaPlanta
