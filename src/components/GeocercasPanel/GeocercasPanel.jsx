import { useEffect, useState } from 'react'
import { AlertCircle, Layers, MapPinned, PencilLine, Plus, Shapes, SquareDashed, Trash2 } from 'lucide-react'
import { fueraDeFaena } from '../../pages/Mapa/geo.js'
import * as geocercas from '../../services/geocercasService.js'
import styles from './GeocercasPanel.module.css'

const NOMBRE = { area: 'área', zona: 'zona' }

const INSTRUCCIONES = {
  dibujando: 'Haz clic en el mapa para agregar vértices y clic en el primero para cerrar el polígono.',
  ajustando:
    'Arrastra los vértices para ajustar la forma; arrastra un punto intermedio para agregar un vértice. Luego guarda.',
}

/**
 * Edición de geocercas (solo ADMIN). Las geometrías se dibujan en el mapa con Terra Draw a través de
 * `mapa` (ref de MapaPlanta); el Backend valida que el polígono sea válido y que cada zona quede dentro
 * de su área.
 */
function GeocercasPanel({ areas, zonas, seleccion, onSeleccionar, mapa, onEditando, onGuardado }) {
  const [accion, setAccion] = useState(null)
  const [form, setForm] = useState({ nombre: '', descripcion: '' })
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)

  // Al salir del modo edición no debe quedar nada a medio dibujar
  useEffect(
    () => () => {
      mapa.current?.cancelarDibujo()
      onEditando(null)
    },
    [mapa, onEditando],
  )

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
    onSeleccionar({ tipo: entidad, id: entidad === 'area' ? item.idArea : item.idZona })
    // Una geocerca mal ubicada (lejos de la faena) no se encuadra: se redibuja sobre la mina
    if (item.poligono && !fueraDeFaena(item.poligono)) mapa.current?.enfocar(item.poligono)
  }

  const etiquetas = (item) => (
    <>
      {!item.poligono && <span className={styles.flag}>Sin polígono</span>}
      {fueraDeFaena(item.poligono) && <span className={styles.flag}>Fuera de la faena</span>}
    </>
  )

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

      {accion && (
        <form className={styles.accion} onSubmit={guardar}>
          <h3 className={styles.accionTitulo}>{titulo()}</h3>
          {(accion.tipo === 'crear' || accion.tipo === 'forma') && (
            <p className={styles.ayuda}>{INSTRUCCIONES[accion.fase]}</p>
          )}
          {accion.tipo === 'desactivar' && (
            <p className={styles.ayuda}>
              {accion.entidad === 'area'
                ? 'El área y todas sus zonas dejarán de mostrarse y de estar disponibles al iniciar turno. Queda registrado en la auditoría.'
                : 'La zona dejará de mostrarse y de estar disponible al iniciar turno. Queda registrado en la auditoría.'}
            </p>
          )}
          {(accion.tipo === 'datos' || (accion.tipo === 'crear' && accion.fase === 'ajustando')) && (
            <>
              <label className={styles.campo}>
                <span className={styles.label}>Nombre</span>
                <input
                  className={styles.input}
                  value={form.nombre}
                  maxLength={100}
                  onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                  placeholder={accion.entidad === 'area' ? 'Área 51 - Chancado Primario' : 'Tolva de alimentación'}
                  autoFocus
                />
              </label>
              <label className={styles.campo}>
                <span className={styles.label}>Descripción (opcional)</span>
                <textarea
                  className={styles.textarea}
                  rows={2}
                  value={form.descripcion}
                  onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                />
              </label>
            </>
          )}
          {error && (
            <p className={styles.error} role="alert">
              <AlertCircle size={15} /> {error}
            </p>
          )}
          <div className={styles.acciones}>
            <button type="button" className={styles.secundario} onClick={limpiar} disabled={guardando}>
              Cancelar
            </button>
            <button
              type="submit"
              className={accion.tipo === 'desactivar' ? styles.peligro : styles.primario}
              disabled={guardando || accion.fase === 'dibujando'}
            >
              {guardando ? 'Guardando…' : accion.tipo === 'desactivar' ? 'Desactivar' : 'Guardar'}
            </button>
          </div>
        </form>
      )}

      {!accion && seleccionado && (
        <section className={styles.detalle}>
          <span className={styles.tipo}>{seleccion.tipo === 'area' ? 'Área' : 'Zona de trabajo'}</span>
          <h3 className={styles.detalleNombre}>{seleccionado.nombre}</h3>
          {seleccionado.descripcion && <p className={styles.ayuda}>{seleccionado.descripcion}</p>}
          <div className={styles.flags}>{etiquetas(seleccionado)}</div>
          <div className={styles.botones}>
            {seleccionado.poligono && !fueraDeFaena(seleccionado.poligono) && (
              <button type="button" className={styles.secundario} onClick={() => editarForma(seleccion.tipo, seleccionado, false)}>
                <Shapes size={15} /> Editar forma
              </button>
            )}
            <button type="button" className={styles.secundario} onClick={() => editarForma(seleccion.tipo, seleccionado, true)}>
              <SquareDashed size={15} /> {seleccionado.poligono ? 'Redibujar' : 'Dibujar polígono'}
            </button>
            <button type="button" className={styles.secundario} onClick={() => editarDatos(seleccion.tipo, seleccionado)}>
              <PencilLine size={15} /> Nombre y descripción
            </button>
            {seleccion.tipo === 'area' && (
              <button type="button" className={styles.secundario} onClick={() => crear('zona', seleccionado.idArea)}>
                <Plus size={15} /> Nueva zona aquí
              </button>
            )}
            <button type="button" className={styles.peligroSuave} onClick={() => confirmarDesactivar(seleccion.tipo, seleccionado)}>
              <Trash2 size={15} /> Desactivar
            </button>
          </div>
        </section>
      )}

      <ul className={styles.lista}>
        {areas.length === 0 && <li className={styles.vacio}>Aún no hay áreas. Crea la primera con “Nueva área”.</li>}
        {areas.map((a) => (
          <li key={a.idArea} className={styles.grupo}>
            <button
              type="button"
              className={`${styles.item} ${seleccion?.tipo === 'area' && seleccion.id === a.idArea ? styles.itemActivo : ''}`}
              onClick={() => seleccionar('area', a)}
            >
              <span className={styles.lineaArea} />
              <span className={styles.itemNombre}>{a.nombre}</span>
              {etiquetas(a)}
            </button>
            {zonasDe(a.idArea).length > 0 && (
              <ul className={styles.sublista}>
                {zonasDe(a.idArea).map((z) => (
                  <li key={z.idZona}>
                    <button
                      type="button"
                      className={`${styles.item} ${styles.itemZona} ${
                        seleccion?.tipo === 'zona' && seleccion.id === z.idZona ? styles.itemActivo : ''
                      }`}
                      onClick={() => seleccionar('zona', z)}
                    >
                      <MapPinned size={14} className={styles.iconoZona} />
                      <span className={styles.itemNombre}>{z.nombre}</span>
                      {etiquetas(z)}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </aside>
  )
}

export default GeocercasPanel
