import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, ChevronRight, Layers, MapPinned, Plus, Search } from 'lucide-react'
import GeocercaDetalle from '../GeocercaDetalle/GeocercaDetalle.jsx'
import { fueraDeFaena, malUbicado } from '../../pages/Mapa/geo.js'
import * as geocercas from '../../services/geocercasService.js'
import styles from './GeocercasPanel.module.css'

const NOMBRE = { area: 'área', zona: 'zona' }

// "Área 51 - Chancado Primario" se muestra como número + nombre para no repetir el prefijo en cada fila
const PATRON_AREA = /^área\s+(\S+)\s*[-–]\s*(.+)$/i

const partesArea = (nombre) => {
  const m = PATRON_AREA.exec(nombre)
  return m ? { numero: m[1], nombre: m[2] } : { numero: null, nombre }
}

const normalizar = (texto) =>
  (texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

/**
 * Edición de geocercas (solo ADMIN). Las geometrías se dibujan en el mapa con Terra Draw a través de
 * `mapa` (ref de MapaPlanta); el Backend valida que el polígono sea válido y que cada zona quede dentro
 * de su área. La geocerca seleccionada y la acción en curso se muestran en una tarjeta flotante sobre el
 * mapa (`destino`, nodo que provee la página), para que la lista conserve todo el alto del panel.
 */
function GeocercasPanel({ areas, zonas, seleccion, onSeleccionar, mapa, destino, onEditando, onGuardado }) {
  const [accion, setAccion] = useState(null)
  const [form, setForm] = useState({ nombre: '', descripcion: '' })
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [abiertas, setAbiertas] = useState(() => new Set())
  const [poligonoDibujado, setPoligonoDibujado] = useState(null)

  // Al salir del modo edición no debe quedar nada a medio dibujar
  useEffect(
    () => () => {
      mapa.current?.cancelarDibujo()
      onEditando(null)
    },
    [mapa, onEditando],
  )

  // Con el polígono ya cerrado, se sigue cada ajuste de vértices para avisar si sale de la faena
  const ajustando = accion?.fase === 'ajustando'
  useEffect(() => {
    if (!ajustando) return
    return mapa.current?.observarGeometria(setPoligonoDibujado)
  }, [ajustando, mapa])

  const buscar = (entidad, id) =>
    entidad === 'area' ? areas.find((a) => a.idArea === id) : zonas.find((z) => z.idZona === id)

  const seleccionado = seleccion && seleccion.tipo !== 'maquina' ? buscar(seleccion.tipo, seleccion.id) : null

  const limpiar = () => {
    mapa.current?.cancelarDibujo()
    onEditando(null)
    setAccion(null)
    setError(null)
  }

  const crear = (entidad, idArea) => {
    limpiar()
    setForm({ nombre: '', descripcion: '' })
    setAccion({ tipo: 'crear', entidad, idArea, fase: 'dibujando' })
    mapa.current.dibujar(() => setAccion((a) => a && { ...a, fase: 'ajustando' }))
  }

  const editarForma = (entidad, item, redibujar) => {
    limpiar()
    const id = entidad === 'area' ? item.idArea : item.idZona
    onEditando({ tipo: entidad, id })
    if (redibujar || !item.poligono) {
      setAccion({ tipo: 'forma', entidad, id, fase: 'dibujando' })
      mapa.current.dibujar(() => setAccion((a) => a && { ...a, fase: 'ajustando' }))
    } else {
      setAccion({ tipo: 'forma', entidad, id, fase: 'ajustando' })
      mapa.current.editarForma(item.poligono)
    }
  }

  const editarDatos = (entidad, item) => {
    limpiar()
    setForm({ nombre: item.nombre, descripcion: item.descripcion ?? '' })
    setAccion({ tipo: 'datos', entidad, id: entidad === 'area' ? item.idArea : item.idZona })
  }

  const confirmarDesactivar = (entidad, item) => {
    limpiar()
    setAccion({ tipo: 'desactivar', entidad, id: entidad === 'area' ? item.idArea : item.idZona })
  }

  const guardar = async (event) => {
    event?.preventDefault()
    setError(null)
    const { tipo, entidad, id, idArea } = accion
    const poligono = tipo === 'crear' || tipo === 'forma' ? mapa.current.geometria() : null
    if ((tipo === 'crear' || tipo === 'forma') && !poligono) return setError('Primero dibuja el polígono en el mapa.')
    if ((tipo === 'crear' || tipo === 'datos') && !form.nombre.trim()) return setError('Ingresa un nombre.')

    const datos = { nombre: form.nombre.trim(), descripcion: form.descripcion.trim() || null }
    setGuardando(true)
    try {
      let nueva = seleccion
      if (tipo === 'crear' && entidad === 'area') {
        const { idArea: nuevaId } = await geocercas.crearArea({ ...datos, poligono })
        nueva = { tipo: 'area', id: nuevaId }
      } else if (tipo === 'crear') {
        const { idZona } = await geocercas.crearZona(idArea, { ...datos, poligono })
        nueva = { tipo: 'zona', id: idZona }
      } else if (tipo === 'forma') {
        await (entidad === 'area' ? geocercas.editarArea(id, { poligono }) : geocercas.editarZona(id, { poligono }))
      } else if (tipo === 'datos') {
        await (entidad === 'area' ? geocercas.editarArea(id, datos) : geocercas.editarZona(id, datos))
      } else if (tipo === 'desactivar') {
        await (entidad === 'area' ? geocercas.desactivarArea(id) : geocercas.desactivarZona(id))
        nueva = null
      }
      limpiar()
      await onGuardado(nueva)
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  const titulo = () => {
    if (!accion) return null
    const item = accion.id ? buscar(accion.entidad, accion.id) : null
    if (accion.tipo === 'crear') {
      const area = accion.idArea ? buscar('area', accion.idArea) : null
      return accion.entidad === 'area' ? 'Nueva área' : `Nueva zona en ${area?.nombre ?? 'el área'}`
    }
    if (accion.tipo === 'forma') return `Forma de ${item?.nombre}`
    if (accion.tipo === 'datos') return `Datos de ${item?.nombre}`
    return `¿Desactivar ${NOMBRE[accion.entidad]} ${item?.nombre}?`
  }

  const zonasDe = (idArea) => zonas.filter((z) => z.idArea === idArea)

  const seleccionar = (entidad, item) => {
    const id = entidad === 'area' ? item.idArea : item.idZona
    // Un segundo clic sobre la geocerca ya seleccionada la deselecciona
    if (seleccion?.tipo === entidad && seleccion.id === id) return onSeleccionar(null)
    onSeleccionar({ tipo: entidad, id })
    // Una geocerca mal ubicada (lejos de la faena) no se encuadra: se redibuja sobre la mina
    if (item.poligono && !malUbicado(item.poligono)) mapa.current?.enfocar(item.poligono)
  }

  const alternar = (idArea) =>
    setAbiertas((prev) => {
      const sig = new Set(prev)
      if (sig.has(idArea)) sig.delete(idArea)
      else sig.add(idArea)
      return sig
    })

  // En la lista basta un ícono; el detalle de la tarjeta flotante explica el problema
  const aviso = (item) => {
    const motivo = !item.poligono ? 'Sin polígono' : fueraDeFaena(item.poligono) ? 'Fuera de la faena' : null
    return (
      motivo && (
        <span className={styles.aviso} title={motivo}>
          <AlertTriangle size={14} aria-hidden="true" />
          <span className={styles.visuallyHidden}>{motivo}</span>
        </span>
      )
    )
  }

  const conProblema = [...areas, ...zonas].filter((g) => !g.poligono || fueraDeFaena(g.poligono)).length

  // Un área aparece si coincide su nombre o el de alguna de sus zonas; en ese caso se muestran solo las zonas que coinciden
  const termino = normalizar(busqueda.trim())
  const grupos = areas
    .map((a) => {
      const propias = zonasDe(a.idArea)
      if (!termino) return { area: a, zonas: propias }
      const coincideArea = normalizar(a.nombre).includes(termino)
      const coincidentes = propias.filter((z) => normalizar(z.nombre).includes(termino))
      if (!coincideArea && coincidentes.length === 0) return null
      return { area: a, zonas: coincideArea ? propias : coincidentes }
    })
    .filter(Boolean)

  const idAreaSeleccionada =
    seleccion?.tipo === 'area' ? seleccion.id : seleccion?.tipo === 'zona' ? buscar('zona', seleccion.id)?.idArea : null

  const estaAbierta = (idArea) => Boolean(termino) || abiertas.has(idArea) || idAreaSeleccionada === idArea

  return (
    <aside className={styles.geocercasPanel}>
      <header className={styles.header}>
        <h2 className={styles.title}>
          <Layers size={18} className={styles.titleIcon} />
          Geocercas
        </h2>
        <button type="button" className={styles.primario} onClick={() => crear('area')} disabled={guardando}>
          <Plus size={16} /> Nueva área
        </button>
      </header>

      {destino &&
        createPortal(
          <GeocercaDetalle
            accion={accion}
            titulo={titulo()}
            form={form}
            onForm={setForm}
            error={error}
            guardando={guardando}
            onGuardar={guardar}
            fueraDeFaena={ajustando && fueraDeFaena(poligonoDibujado)}
            onCancelar={limpiar}
            geocerca={seleccionado}
            tipo={seleccion?.tipo}
            onCerrar={() => onSeleccionar(null)}
            onEditarForma={(redibujar) => editarForma(seleccion.tipo, seleccionado, redibujar)}
            onEditarDatos={() => editarDatos(seleccion.tipo, seleccionado)}
            onNuevaZona={() => crear('zona', seleccionado.idArea)}
            onDesactivar={() => confirmarDesactivar(seleccion.tipo, seleccionado)}
          />,
          destino,
        )}

      {areas.length > 0 && (
        <div className={styles.herramientas}>
          <label className={styles.search}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="search"
              className={styles.searchInput}
              placeholder="Buscar área o zona…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </label>
          <p className={styles.resumen}>
            {areas.length} {areas.length === 1 ? 'área' : 'áreas'} · {zonas.length} {zonas.length === 1 ? 'zona' : 'zonas'}
            {conProblema > 0 && (
              <span className={styles.resumenAviso}>
                <AlertTriangle size={13} /> {conProblema} por revisar
              </span>
            )}
          </p>
        </div>
      )}

      <ul className={styles.lista}>
        {areas.length === 0 && <li className={styles.vacio}>Aún no hay áreas. Crea la primera con “Nueva área”.</li>}
        {areas.length > 0 && grupos.length === 0 && (
          <li className={styles.vacio}>Ninguna área o zona coincide con “{busqueda.trim()}”.</li>
        )}
        {grupos.map(({ area: a, zonas: zonasArea }) => {
          const { numero, nombre } = partesArea(a.nombre)
          const abierta = estaAbierta(a.idArea)
          const total = zonasDe(a.idArea).length
          return (
            <li key={a.idArea} className={styles.grupo}>
              <div
                className={`${styles.fila} ${seleccion?.tipo === 'area' && seleccion.id === a.idArea ? styles.itemActivo : ''}`}
              >
                <button
                  type="button"
                  className={`${styles.toggle} ${abierta ? styles.toggleAbierto : ''}`}
                  onClick={() => alternar(a.idArea)}
                  disabled={total === 0 || Boolean(termino)}
                  aria-expanded={total > 0 ? abierta : undefined}
                  aria-label={abierta ? `Ocultar zonas de ${a.nombre}` : `Mostrar zonas de ${a.nombre}`}
                >
                  {total > 0 && <ChevronRight size={16} className={styles.chevron} />}
                </button>
                <button type="button" className={styles.item} onClick={() => seleccionar('area', a)} title={a.nombre}>
                  {numero ? (
                    <span className={styles.numero}>{numero}</span>
                  ) : (
                    <Layers size={15} className={styles.iconoArea} />
                  )}
                  <span className={styles.itemNombre}>{nombre}</span>
                  {aviso(a)}
                  {total > 0 && (
                    <span className={styles.conteo} title={`${total} ${total === 1 ? 'zona' : 'zonas'}`}>
                      {total}
                    </span>
                  )}
                </button>
              </div>
              {abierta && zonasArea.length > 0 && (
                <ul className={styles.sublista}>
                  {zonasArea.map((z) => (
                    <li key={z.idZona}>
                      <button
                        type="button"
                        className={`${styles.item} ${styles.itemZona} ${
                          seleccion?.tipo === 'zona' && seleccion.id === z.idZona ? styles.itemActivo : ''
                        }`}
                        onClick={() => seleccionar('zona', z)}
                        title={z.nombre}
                      >
                        <MapPinned size={14} className={styles.iconoZona} />
                        <span className={styles.itemNombre}>{z.nombre}</span>
                        {aviso(z)}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </aside>
  )
}

export default GeocercasPanel
