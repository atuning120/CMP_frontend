import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  ArrowLeftRight,
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  CheckCircle2,
  History,
  Link2,
  PackageOpen,
  Pencil,
  Plus,
  Power,
  PowerOff,
  SatelliteDish,
  Search,
  WifiOff,
  Truck,
  Unlink,
} from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import DialogoConfirmacion from '../../components/DialogoConfirmacion/DialogoConfirmacion.jsx'
import GpsAccion from '../../components/GpsAccion/GpsAccion.jsx'
import PestanasFlota from '../../components/PestanasFlota/PestanasFlota.jsx'
import Skeleton, { AvisoCarga } from '../../components/Skeleton/Skeleton.jsx'
import { CLAVES, errorSinDatos, useDispositivosGps, useFlota } from '../../hooks/consultas.js'
import { mensajeDeError } from '../../services/errores.js'
import {
  BATERIA_BAJA,
  bateriaBaja,
  cambiosSugeridos,
  editarGps,
  estadoGps,
  haceCuanto,
  HORAS_SIN_REPORTAR,
  sinReportar,
} from '../../services/gpsService.js'
import { estadoDe } from '../Flota/estados.js'
import styles from './FlotaGps.module.css'

const ESTADOS = {
  vinculado: { etiqueta: 'Vinculado', clase: 'vinculado' },
  libre: { etiqueta: 'Disponible', clase: 'libre' },
  baja: { etiqueta: 'Dado de baja', clase: 'baja' },
}

// Cada filtro recibe el GPS y la hora de la última carga
const FILTROS = [
  { id: 'enUso', etiqueta: 'En uso', incluye: (d) => estadoGps(d) !== 'baja' },
  { id: 'vinculado', etiqueta: 'Vinculados', incluye: (d) => estadoGps(d) === 'vinculado' },
  { id: 'libre', etiqueta: 'Disponibles', incluye: (d) => estadoGps(d) === 'libre' },
  { id: 'atencion', etiqueta: 'Por revisar', incluye: (d, ahora) => sinReportar(d, ahora) || bateriaBaja(d) },
  { id: 'baja', etiqueta: 'Dados de baja', incluye: (d) => estadoGps(d) === 'baja' },
]

const formatoFecha = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short' })
const formatoFechaHora = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })

const SIN_DATOS = []
const FILAS_SKELETON = [1, 2, 3]
const COLUMNAS = 6

// /flota/gps?mover=<idGps>&a=<idMaquina> (enlace de la flota tras un reemplazo): abre el cambio de máquina ya elegido
const accionDeUrl = (parametros) => {
  const idGps = Number(parametros.get('mover'))
  const idMaquina = Number(parametros.get('a'))
  return idGps > 0 ? { tipo: 'asignar', idGps, idMaquina: idMaquina > 0 ? idMaquina : undefined } : null
}

/** Nivel de batería con el ícono y el color que corresponden. */
function Bateria({ nivel }) {
  if (nivel === null || nivel === undefined) return <span className={styles.secundario}>Sin dato</span>
  const [Icono, clase] =
    nivel <= BATERIA_BAJA ? [BatteryLow, styles.bateriaBaja] : nivel <= 60 ? [BatteryMedium, ''] : [BatteryFull, styles.bateriaBuena]
  return (
    <span className={`${styles.bateria} ${clase}`}>
      <Icono size={18} aria-hidden="true" /> {Math.round(nivel)} %
    </span>
  )
}

/** Un dato del resumen: valor, explicación y, si hay algo que revisar, en ámbar. */
function Indicador({ Icono, titulo, valor, detalle, alerta, cargando, children }) {
  return (
    <div className={`${styles.indicador} ${alerta ? styles.indicadorAlerta : ''}`}>
      <span className={styles.indicadorTitulo}>
        <Icono size={16} className={styles.indicadorIcono} aria-hidden="true" /> {titulo}
      </span>
      <span className={styles.indicadorValor}>{cargando ? <Skeleton className={styles.skValor} /> : valor}</span>
      {children}
      <span className={styles.indicadorDetalle}>{detalle}</span>
    </div>
  )
}

/**
 * Sección GPS de la flota (JEFE_TURNO y ADMIN): registrar los GPS, vincularlos a las máquinas, cambiarlos de máquina y
 * darlos de baja. Solo en el panel web: la app móvil no los administra.
 */
function FlotaGps() {
  const queryClient = useQueryClient()
  const gpsQuery = useDispositivosGps()
  const flotaQuery = useFlota()
  const dispositivos = gpsQuery.data ?? SIN_DATOS
  const flota = flotaQuery.data ?? SIN_DATOS
  const errorCarga = errorSinDatos(gpsQuery) ?? errorSinDatos(flotaQuery)
  const cargando = !errorCarga && (gpsQuery.isPending || flotaQuery.isPending)
  // Hora de la última carga (cada minuto): de ahí salen "hace cuánto" y "sin reportar"
  const ahora = gpsQuery.dataUpdatedAt
  const [parametros, setParametros] = useSearchParams()
  const [filtro, setFiltro] = useState('enUso')
  const [busqueda, setBusqueda] = useState('')
  const [accion, setAccion] = useState(() => accionDeUrl(parametros))
  const [porDarDeBaja, setPorDarDeBaja] = useState(null)
  const [aviso, setAviso] = useState(null)
  const [error, setError] = useState(null)

  const maquinaPorId = useMemo(() => new Map(flota.map((m) => [m.idMaquina, m])), [flota])
  const conteos = useMemo(
    () => Object.fromEntries(FILTROS.map((f) => [f.id, dispositivos.filter((d) => f.incluye(d, ahora)).length])),
    [dispositivos, ahora],
  )
  const sugerencias = useMemo(() => cambiosSugeridos(dispositivos, flota), [dispositivos, flota])
  // Cobertura: las máquinas fuera de servicio no necesitan GPS
  const enServicio = flota.filter((m) => m.estado !== 'BAJA')
  const conGps = enServicio.filter((m) => dispositivos.some((d) => d.maquina?.idMaquina === m.idMaquina)).length
  const callados = dispositivos.filter((d) => sinReportar(d, ahora)).length
  const conBateriaBaja = dispositivos.filter(bateriaBaja).length

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    const { incluye } = FILTROS.find((f) => f.id === filtro)
    return dispositivos.filter(
      (d) => incluye(d, ahora) && (!texto || [d.imei, d.modelo, d.numeroSim, d.maquina?.nombre].some((v) => v?.toLowerCase().includes(texto))),
    )
  }, [dispositivos, filtro, busqueda, ahora])

  const cerrarAccion = () => {
    setAccion(null)
    if (parametros.size > 0) setParametros({}, { replace: true })
  }

  // La acción ya quedó hecha: si la recarga falla, la tabla se pone al día en el próximo refresco
  const alGuardar = async (mensaje) => {
    await queryClient.invalidateQueries({ queryKey: CLAVES.dispositivosGps })
    cerrarAccion()
    setError(null)
    setAviso(mensaje)
  }

  const cambiarActivo = async (gps, activo) => {
    setPorDarDeBaja(null)
    try {
      await editarGps(gps.idGps, { activo })
      await alGuardar(activo ? `El GPS ${gps.imei} volvió a estar disponible.` : `El GPS ${gps.imei} quedó dado de baja.`)
    } catch (e) {
      setAviso(null)
      setError(mensajeDeError(e, 'No se pudo cambiar el estado del GPS.'))
      queryClient.invalidateQueries({ queryKey: CLAVES.dispositivosGps })
    }
  }

  const abrir = (tipo, gps, idMaquina) => {
    setAviso(null)
    setError(null)
    setAccion({ tipo, idGps: gps?.idGps, idMaquina })
  }

  const botonesDe = (d) => {
    const estado = estadoGps(d)
    return [
      estado === 'vinculado' && { Icono: ArrowLeftRight, texto: 'Cambiar', detalle: 'Pasar este GPS a otra máquina', onClick: () => abrir('asignar', d) },
      estado === 'libre' && { Icono: Link2, texto: 'Vincular', detalle: 'Asignar este GPS a una máquina', onClick: () => abrir('asignar', d) },
      estado === 'baja' && { Icono: Power, texto: 'Reactivar', detalle: 'Volver a usar este GPS', onClick: () => cambiarActivo(d, true) },
      estado === 'vinculado' && { Icono: Unlink, texto: 'Desvincular', detalle: 'Dejar este GPS sin máquina', onClick: () => abrir('desvincular', d), soloIcono: true },
      { Icono: Pencil, texto: 'Editar', detalle: 'El modelo o la SIM', onClick: () => abrir('editar', d), soloIcono: true },
      { Icono: History, texto: 'Historial', detalle: 'Máquinas en que ha estado', onClick: () => abrir('historial', d), soloIcono: true },
      estado === 'libre' && { Icono: PowerOff, texto: 'Dar de baja', detalle: 'Dejar de usar este GPS', onClick: () => setPorDarDeBaja(d), soloIcono: true },
    ].filter(Boolean)
  }

  const mensajeError = errorCarga ?? error
  // El panel necesita el GPS y las máquinas ya cargados (con el enlace de la flota se abre al entrar)
  const panelListo = accion && !cargando && !errorCarga && (accion.tipo === 'registrar' || dispositivos.some((d) => d.idGps === accion.idGps))

  return (
    <section className={styles.flotaGps}>
      <PestanasFlota />
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>
            <SatelliteDish size={22} className={styles.titleIcon} />
            GPS de la flota
          </h1>
          <p className={styles.subtitle}>Vincula cada GPS a su máquina y cámbialo cuando otra tome su lugar.</p>
        </div>
        <button type="button" className={styles.primario} onClick={() => abrir('registrar')}>
          <Plus size={18} /> Registrar GPS
        </button>
      </header>

      {aviso && (
        <p className={styles.exito} role="status">
          <CheckCircle2 size={16} /> {aviso}
          <button type="button" className={styles.cerrarAviso} onClick={() => setAviso(null)} aria-label="Cerrar aviso">
            ×
          </button>
        </p>
      )}

      {mensajeError && (
        <p className={styles.error} role="alert">
          <AlertCircle size={16} /> {mensajeError}
        </p>
      )}

      {!errorCarga && (
        <div className={styles.resumen}>
          <Indicador Icono={Truck} titulo="Máquinas con GPS" valor={`${conGps} de ${enServicio.length}`} detalle="sin contar las fuera de servicio" cargando={cargando}>
            <progress className={styles.cobertura} value={conGps} max={Math.max(enServicio.length, 1)} aria-label="Máquinas con GPS" />
          </Indicador>
          <Indicador Icono={PackageOpen} titulo="Disponibles" valor={conteos.libre} detalle="GPS listos para vincular" cargando={cargando} />
          <Indicador
            Icono={WifiOff}
            titulo="Sin reportar"
            valor={callados}
            detalle={`vinculados, hace más de ${HORAS_SIN_REPORTAR} h`}
            alerta={callados > 0}
            cargando={cargando}
          />
          <Indicador
            Icono={BatteryLow}
            titulo="Batería baja"
            valor={conBateriaBaja}
            detalle={`vinculados, con ${BATERIA_BAJA} % o menos`}
            alerta={conBateriaBaja > 0}
            cargando={cargando}
          />
        </div>
      )}

      {sugerencias.map(({ gps, sale, entra }) => (
        <div key={gps.idGps} className={styles.sugerencia} role="status">
          <ArrowLeftRight size={18} className={styles.sugerenciaIcono} aria-hidden="true" />
          <p className={styles.sugerenciaTexto}>
            <strong>{entra.nombre}</strong> está reemplazando a <strong>{sale.nombre}</strong>, pero el GPS sigue vinculado a {sale.nombre}.
          </p>
          <button type="button" className={styles.accion} onClick={() => abrir('asignar', gps, entra.idMaquina)}>
            Pasar a {entra.nombre}
          </button>
        </div>
      ))}

      <div className={styles.toolbar}>
        <label className={styles.search}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Buscar IMEI, SIM o máquina…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </label>
        <div className={styles.filtros} role="tablist" aria-label="Filtrar por estado">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filtro === f.id}
              className={`${styles.filtro} ${filtro === f.id ? styles.filtroActivo : ''}`}
              onClick={() => setFiltro(f.id)}
            >
              {f.etiqueta}
              <span className={styles.filtroConteo}>{cargando ? <Skeleton className={styles.skConteo} /> : conteos[f.id]}</span>
            </button>
          ))}
        </div>
      </div>

      {cargando && <AvisoCarga texto="Cargando GPS…" />}
      {!errorCarga && (
        <div className={styles.tablaWrapper}>
          <table className={styles.tabla}>
            <thead className={styles.cabecera}>
              <tr>
                <th className={styles.th}>Máquina</th>
                <th className={styles.th}>GPS</th>
                <th className={styles.th}>Última posición</th>
                <th className={styles.th}>Batería</th>
                <th className={styles.th}>Estado</th>
                <th className={`${styles.th} ${styles.acciones}`}>Acciones</th>
              </tr>
            </thead>
            <tbody className={styles.cuerpo}>
              {cargando &&
                FILAS_SKELETON.map((n) => (
                  <tr key={n} className={styles.fila} aria-hidden="true">
                    {Array.from({ length: COLUMNAS }, (_, i) => (
                      <td key={i} className={styles.td}>
                        <Skeleton className={styles.skTexto} />
                      </td>
                    ))}
                  </tr>
                ))}
              {!cargando && visibles.length === 0 && (
                <tr>
                  <td className={styles.vacio} colSpan={COLUMNAS}>
                    {dispositivos.length === 0 ? (
                      <span className={styles.vacioInicial}>
                        <SatelliteDish size={28} aria-hidden="true" />
                        Aún no hay GPS. Registra el primero con el IMEI de su etiqueta.
                      </span>
                    ) : (
                      'No hay GPS que coincidan.'
                    )}
                  </td>
                </tr>
              )}
              {!cargando &&
                visibles.map((d) => {
                  const estado = ESTADOS[estadoGps(d)]
                  const maquina = maquinaPorId.get(d.maquina?.idMaquina)
                  const callado = sinReportar(d, ahora)
                  return (
                    <tr key={d.idGps} className={styles.fila}>
                      <td className={styles.td}>
                        {d.maquina ? (
                          <>
                            <span className={styles.maquina}>{d.maquina.nombre}</span>
                            <span className={styles.secundario}>
                              {[maquina?.tipoMaquina, maquina && maquina.estado !== 'ACTIVA' && estadoDe(maquina).etiqueta].filter(Boolean).join(' · ') ||
                                'Sin tipo registrado'}
                            </span>
                          </>
                        ) : (
                          <span className={styles.sinMaquina}>Sin máquina</span>
                        )}
                      </td>
                      <td className={styles.td} data-label="GPS">
                        <span className={styles.imei}>{d.imei}</span>
                        <span className={styles.secundario}>{[d.modelo, d.numeroSim && `SIM ${d.numeroSim}`].filter(Boolean).join(' · ') || 'Sin modelo'}</span>
                      </td>
                      <td className={styles.td} data-label="Última posición">
                        {d.ultimaPosicion ? (
                          <>
                            <span className={callado ? styles.callado : styles.dato}>{haceCuanto(d.ultimaPosicion.fechaHora, ahora)}</span>
                            <span className={styles.secundario}>{formatoFechaHora.format(new Date(d.ultimaPosicion.fechaHora))}</span>
                          </>
                        ) : (
                          <span className={callado ? styles.callado : styles.secundario}>Sin posiciones</span>
                        )}
                      </td>
                      <td className={styles.td} data-label="Batería">
                        <Bateria nivel={d.ultimaPosicion?.bateria} />
                      </td>
                      <td className={styles.td} data-label="Estado">
                        <span className={`${styles.estado} ${styles[estado.clase]}`}>{estado.etiqueta}</span>
                        {d.maquina && <span className={styles.secundario}>desde el {formatoFecha.format(new Date(d.asignadoDesde))}</span>}
                      </td>
                      <td className={`${styles.td} ${styles.acciones}`}>
                        <div className={styles.botones}>
                          {botonesDe(d).map(({ Icono, texto, detalle, onClick, soloIcono }) => (
                            <button
                              key={texto}
                              type="button"
                              className={`${styles.accion} ${soloIcono ? styles.accionIcono : ''}`}
                              onClick={onClick}
                              data-tooltip={texto}
                              data-tooltip-detalle={detalle}
                              aria-label={`${texto} GPS ${d.imei}`}
                            >
                              <Icono size={15} />
                              {!soloIcono && <span className={styles.accionTexto}>{texto}</span>}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      )}

      {panelListo && (
        <GpsAccion
          key={`${accion.tipo}-${accion.idGps ?? 'nuevo'}`}
          accion={accion}
          dispositivos={dispositivos}
          flota={flota}
          onCerrar={cerrarAccion}
          onGuardado={alGuardar}
        />
      )}

      {porDarDeBaja && (
        <DialogoConfirmacion
          titulo="¿Dar de baja este GPS?"
          mensaje={`El GPS ${porDarDeBaja.imei} no se podrá vincular hasta reactivarlo. Su historial se conserva.`}
          icono={<PowerOff size={20} />}
          textoConfirmar="Dar de baja"
          onConfirmar={() => cambiarActivo(porDarDeBaja, false)}
          onCancelar={() => setPorDarDeBaja(null)}
        />
      )}
    </section>
  )
}

export default FlotaGps
