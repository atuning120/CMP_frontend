import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Layers,
  MapPinned,
  PencilLine,
  Plus,
  Shapes,
  SquareDashed,
  Trash2,
  Undo2,
  X,
} from 'lucide-react'
import { fueraDeFaena, malUbicado } from '../../pages/Mapa/geo.js'
import DistintivoArea from '../DistintivoArea/DistintivoArea.jsx'
import { ICONOS_AREA } from '../DistintivoArea/iconosArea.js'
import styles from './GeocercaDetalle.module.css'

const MINIMO_PUNTOS = 3
const NOMBRE_PASO = { dibujando: 'Dibuja la forma', ajustando: 'Ajusta los bordes', datos: 'Ponle nombre' }
const NUMERO_PASO = { dibujando: 1, ajustando: 2, datos: 3 }

// En pantallas táctiles se habla de "tocar"; con mouse, de "hacer clic"
const esTactil = () => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches

const instruccion = (fase, puntos) => {
  const toca = esTactil() ? 'Toca' : 'Haz clic en'
  if (fase === 'ajustando') {
    return 'Arrastra los puntos para afinar los bordes. Para agregar una esquina, arrastra uno de los puntos pequeños que hay entre dos esquinas.'
  }
  if (puntos === 0) return `${toca} el mapa en cada esquina de la geocerca, una tras otra.`
  if (puntos < MINIMO_PUNTOS) return `${toca} la siguiente esquina. Necesitas al menos ${MINIMO_PUNTOS} puntos.`
  return `Sigue marcando esquinas o cierra la figura cuando termines.`
}

const textoPuntos = (puntos) => (puntos === 1 ? '1 punto' : `${puntos} puntos`)

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
  puntos = 0,
  onDeshacerPunto,
  onCerrarFigura,
  onVolverADibujar,
  onContinuar,
  onAtras,
}) {
  if (accion) {
    const enForma = accion.tipo === 'crear' || accion.tipo === 'forma'
    // Al crear, "Guardar" llega en el paso de datos; al editar la forma, apenas se ajusta
    const pideDatos = accion.tipo === 'datos' || (accion.tipo === 'crear' && accion.fase === 'datos')
    const paso = enForma && accion.pasos > 1 ? NUMERO_PASO[accion.fase] : null

    return (
      <form className={`${styles.geocercaDetalle} ${styles.enEdicion}`} onSubmit={onGuardar}>
        <header className={styles.cabecera}>
          {paso ? (
            <span className={styles.tipo}>
              Paso {paso} de {accion.pasos} · {NOMBRE_PASO[accion.fase]}
            </span>
          ) : (
            <span />
          )}
          <button type="button" className={styles.cerrar} onClick={onCancelar} disabled={guardando} aria-label="Cancelar">
            <X size={16} />
          </button>
        </header>
        <h3 className={styles.nombre}>{titulo}</h3>
        {paso && (
          <ol className={styles.pasos} aria-hidden="true">
            {Array.from({ length: accion.pasos }, (_, i) => (
              <li key={i} className={`${styles.barraPaso} ${i < paso ? styles.barraPasoHecho : ''}`} />
            ))}
          </ol>
        )}

        {enForma && accion.fase !== 'datos' && <p className={styles.ayuda}>{instruccion(accion.fase, puntos)}</p>}
        {enForma && accion.fase === 'dibujando' && (
          <p className={`${styles.contador} ${puntos >= MINIMO_PUNTOS ? styles.contadorListo : ''}`} aria-live="polite">
            {puntos === 0 ? 'Aún no hay puntos' : textoPuntos(puntos)}
            {puntos >= MINIMO_PUNTOS && ' · ya puedes cerrar la figura'}
          </p>
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
        {pideDatos && (
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
          {accion.fase === 'dibujando' ? (
            <>
              <button type="button" className={styles.secundario} onClick={onDeshacerPunto} disabled={puntos === 0}>
                <Undo2 size={15} /> Deshacer punto
              </button>
              <button
                type="button"
                className={styles.primario}
                onClick={onCerrarFigura}
                disabled={puntos < MINIMO_PUNTOS}
              >
                <Check size={15} /> Cerrar figura
              </button>
            </>
          ) : accion.fase === 'ajustando' ? (
            <>
              <button type="button" className={styles.secundario} onClick={onVolverADibujar} disabled={guardando}>
                <SquareDashed size={15} /> Volver a dibujar
              </button>
              {accion.tipo === 'crear' ? (
                <button type="button" className={styles.primario} onClick={onContinuar}>
                  Continuar <ArrowRight size={15} />
                </button>
              ) : (
                <button type="submit" className={styles.primario} disabled={guardando}>
                  {guardando ? 'Guardando…' : 'Guardar'}
                </button>
              )}
            </>
          ) : (
            <>
              {accion.tipo === 'crear' ? (
                <button type="button" className={styles.secundario} onClick={onAtras} disabled={guardando}>
                  <ArrowLeft size={15} /> Atrás
                </button>
              ) : (
                <button type="button" className={styles.secundario} onClick={onCancelar} disabled={guardando}>
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                className={accion.tipo === 'desactivar' ? styles.peligro : styles.primario}
                disabled={guardando}
              >
                {guardando ? 'Guardando…' : accion.tipo === 'desactivar' ? 'Eliminar' : 'Guardar'}
              </button>
            </>
          )}
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
