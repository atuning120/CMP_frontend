import { AlertCircle, AlertTriangle, Layers, MapPinned, PencilLine, Plus, Shapes, SquareDashed, Trash2, X } from 'lucide-react'
import { fueraDeFaena, malUbicado } from '../../pages/Mapa/geo.js'
import DistintivoArea from '../DistintivoArea/DistintivoArea.jsx'
import { ICONOS_AREA } from '../DistintivoArea/iconosArea.js'
import styles from './GeocercaDetalle.module.css'

const INSTRUCCIONES = {
  dibujando: 'Haz clic en el mapa para agregar vértices y clic en el primero para cerrar el polígono.',
  ajustando:
    'Arrastra los vértices para ajustar la forma; arrastra un punto intermedio para agregar un vértice. Luego guarda.',
}

/**
 * Tarjeta flotante sobre el mapa con la geocerca seleccionada o la acción en curso (crear, editar
 * forma, datos, desactivar). Solo presenta: el estado y las llamadas al Backend viven en GeocercasPanel.
 */
function GeocercaDetalle({
  accion,
  titulo,
  form,
  onForm,
  error,
  guardando,
  onGuardar,
  fueraDeFaena: dibujoFuera,
  onCancelar,
  geocerca,
  tipo,
  onCerrar,
  onEditarForma,
  onEditarDatos,
  onNuevaZona,
  onDesactivar,
}) {
  if (accion) {
    return (
      <form className={`${styles.geocercaDetalle} ${styles.enEdicion}`} onSubmit={onGuardar}>
        <h3 className={styles.nombre}>{titulo}</h3>
        {(accion.tipo === 'crear' || accion.tipo === 'forma') && (
          <p className={styles.ayuda}>{INSTRUCCIONES[accion.fase]}</p>
        )}
        {dibujoFuera && (
          <p className={styles.alerta} role="status">
            <AlertTriangle size={14} />
            Fuera de la faena: parte del polígono queda fuera del límite de la mina. Puedes guardarlo igual, pero quedará
            marcado.
          </p>
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
                onChange={(e) => onForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder={accion.entidad === 'area' ? 'Chancado Primario' : 'Tolva de alimentación'}
                autoFocus
              />
            </label>
            {accion.entidad === 'area' && (
              <fieldset className={styles.distintivo}>
                <legend className={styles.label}>Cómo se ve en el listado</legend>
                <div className={styles.vistaPrevia}>
                  <DistintivoArea codigo={form.codigo.trim()} icono={form.icono} />
                  <span className={styles.vistaPreviaNombre}>{form.nombre.trim() || 'Nombre del área'}</span>
                </div>
                <label className={styles.campo}>
                  <span className={styles.sublabel}>Código (opcional, hasta 4 caracteres)</span>
                  <input
                    className={styles.input}
                    value={form.codigo}
                    maxLength={4}
                    onChange={(e) => onForm((f) => ({ ...f, codigo: e.target.value.replace(/\s/g, '') }))}
                    placeholder="51"
                  />
                </label>
                <div className={styles.campo}>
                  <span className={styles.sublabel}>
                    {form.codigo.trim() ? 'Ícono (se muestra si quitas el código)' : 'Ícono'}
                  </span>
                  <div className={styles.iconos} role="radiogroup" aria-label="Ícono del área">
                    {ICONOS_AREA.map(({ clave, nombre, Icono }) => {
                      const elegido = (form.icono || 'capas') === clave
                      return (
                        <button
                          key={clave}
                          type="button"
                          role="radio"
                          aria-checked={elegido}
                          aria-label={nombre}
                          title={nombre}
                          className={`${styles.icono} ${elegido ? styles.iconoElegido : ''}`}
                          onClick={() => onForm((f) => ({ ...f, icono: clave === 'capas' ? '' : clave }))}
                        >
                          <Icono size={16} />
                        </button>
                      )
                    })}
                  </div>
                </div>
              </fieldset>
            )}
            <label className={styles.campo}>
              <span className={styles.label}>Descripción (opcional)</span>
              <textarea
                className={styles.textarea}
                rows={2}
                value={form.descripcion}
                onChange={(e) => onForm((f) => ({ ...f, descripcion: e.target.value }))}
              />
            </label>
          </>
        )}
        {error && (
          <p className={styles.error} role="alert">
            <AlertCircle size={15} /> {error}
          </p>
        )}
        <div className={styles.pie}>
          <button type="button" className={styles.secundario} onClick={onCancelar} disabled={guardando}>
            Cancelar
          </button>
          <button
            type="submit"
            className={accion.tipo === 'desactivar' ? styles.peligro : styles.primario}
            disabled={guardando || accion.fase === 'dibujando'}
          >
            {guardando ? 'Guardando…' : accion.tipo === 'desactivar' ? 'Eliminar' : 'Guardar'}
          </button>
        </div>
      </form>
    )
  }

  if (!geocerca) return null

  const lejos = malUbicado(geocerca.poligono)
  const fuera = fueraDeFaena(geocerca.poligono)
  const IconoTipo = tipo === 'area' ? Layers : MapPinned

  return (
    <section className={styles.geocercaDetalle} aria-label={`Detalle de ${geocerca.nombre}`}>
      <header className={styles.cabecera}>
        <span className={styles.tipo}>
          <IconoTipo size={13} /> {tipo === 'area' ? 'Área' : 'Zona de trabajo'}
        </span>
        <button type="button" className={styles.cerrar} onClick={onCerrar} aria-label="Cerrar detalle">
          <X size={16} />
        </button>
      </header>
      <h3 className={styles.nombre}>{geocerca.nombre}</h3>
      {geocerca.descripcion && <p className={styles.ayuda}>{geocerca.descripcion}</p>}
      {(!geocerca.poligono || fuera) && (
        <p className={styles.alerta}>
          <AlertTriangle size={14} />
          {!geocerca.poligono
            ? 'Sin polígono: dibújalo para que aparezca en el mapa.'
            : lejos
              ? 'Fuera de la faena: el polígono está lejos de la mina, redibújalo.'
              : 'Fuera de la faena: parte del polígono queda fuera del límite de la mina. Ajusta su forma.'}
        </p>
      )}
      <ul className={styles.menu}>
        {geocerca.poligono && !lejos && (
          <li>
            <button type="button" className={styles.opcion} onClick={() => onEditarForma(false)}>
              <Shapes size={15} /> Editar forma
            </button>
          </li>
        )}
        <li>
          <button type="button" className={styles.opcion} onClick={() => onEditarForma(true)}>
            <SquareDashed size={15} /> {geocerca.poligono ? 'Redibujar' : 'Dibujar polígono'}
          </button>
        </li>
        <li>
          <button type="button" className={styles.opcion} onClick={onEditarDatos}>
            <PencilLine size={15} /> {tipo === 'area' ? 'Nombre, código e ícono' : 'Nombre y descripción'}
          </button>
        </li>
        {tipo === 'area' && (
          <li>
            <button type="button" className={styles.opcion} onClick={onNuevaZona}>
              <Plus size={15} /> Nueva zona aquí
            </button>
          </li>
        )}
        <li className={styles.separador}>
          <button type="button" className={`${styles.opcion} ${styles.opcionPeligro}`} onClick={onDesactivar}>
            <Trash2 size={15} /> Eliminar
          </button>
        </li>
      </ul>
    </section>
  )
}

export default GeocercaDetalle
