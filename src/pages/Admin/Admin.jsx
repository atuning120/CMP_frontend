import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Check, Info, LoaderCircle, Pencil, Plus, Search, ShieldCheck, UserCheck, Users, UserX } from 'lucide-react'
import DialogoConfirmacion from '../../components/DialogoConfirmacion/DialogoConfirmacion.jsx'
import FormularioUsuario from '../../components/FormularioUsuario/FormularioUsuario.jsx'
import Skeleton, { AvisoCarga } from '../../components/Skeleton/Skeleton.jsx'
import { CLAVES, errorSinDatos, useUsuarios } from '../../hooks/consultas.js'
import { idUsuarioSesion, useSesion } from '../../services/session.js'
import { cambiarEstadoUsuario, cambiarRol, ETIQUETA_ROL, ROLES_ASIGNABLES } from '../../services/usuariosService.js'
import styles from './Admin.module.css'

const FILTROS = [
  { id: 'todos', etiqueta: 'Todos' },
  { id: 'VISOR', etiqueta: 'Visores' },
  { id: 'JEFE_TURNO', etiqueta: 'Jefes de turno' },
  { id: 'ADMIN', etiqueta: 'Administradores' },
  { id: 'OPERADOR', etiqueta: 'Operadores' },
]

const PROVEEDOR = { MICROSOFT: 'Microsoft', CREDENCIALES: 'Contraseña', GOOGLE: 'Google' }

const formatoFecha = new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })

const SIN_USUARIOS = []
const FILAS_SKELETON = [1, 2, 3, 4, 5]

/**
 * Administración de usuarios (solo ADMIN): alta y edición de usuarios web y operadores (incluido restablecer
 * la contraseña), rol y activación.
 * Quien entra por primera vez con Microsoft queda como Visor hasta que un administrador le asigna otro rol aquí.
 */
function Admin() {
  const sesion = useSesion()
  const miId = idUsuarioSesion(sesion)
  const queryClient = useQueryClient()
  const usuariosQuery = useUsuarios()
  const usuarios = usuariosQuery.data ?? SIN_USUARIOS
  const cargando = usuariosQuery.isPending
  const error = errorSinDatos(usuariosQuery)
  const [filtro, setFiltro] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  // Estado del guardado por fila: { [idUsuario]: 'guardando' | 'guardado' | mensaje de error }
  const [estadoFila, setEstadoFila] = useState({})
  // Panel del formulario: null cerrado, 'nuevo' para crear o el usuario que se edita
  const [formulario, setFormulario] = useState(null)
  // Usuario que se va a desactivar, a la espera de confirmación
  const [desactivando, setDesactivando] = useState(null)

  const conteos = useMemo(() => {
    const c = { todos: usuarios.length }
    usuarios.forEach((u) => (c[u.rol] = (c[u.rol] ?? 0) + 1))
    return c
  }, [usuarios])

  // Los más recientes primero: así los recién registrados con Microsoft quedan arriba
  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return usuarios
      .filter((u) => filtro === 'todos' || u.rol === filtro)
      .filter((u) => !texto || u.nombre.toLowerCase().includes(texto) || u.email.toLowerCase().includes(texto))
      .sort((a, b) => new Date(b.creadoEn) - new Date(a.creadoEn))
  }, [usuarios, filtro, busqueda])

  // Guarda un cambio de la fila y deja su resultado (guardando, guardado o el error) junto a ella
  const guardarFila = async (usuario, cambio) => {
    setEstadoFila((e) => ({ ...e, [usuario.idUsuario]: 'guardando' }))
    try {
      const actualizado = await cambio()
      queryClient.setQueryData(CLAVES.usuarios, (lista) =>
        lista?.map((u) => (u.idUsuario === actualizado.idUsuario ? actualizado : u)),
      )
      setEstadoFila((e) => ({ ...e, [usuario.idUsuario]: 'guardado' }))
    } catch (e) {
      setEstadoFila((prev) => ({ ...prev, [usuario.idUsuario]: e.message }))
    }
  }

  const handleRol = (usuario, rol) => guardarFila(usuario, () => cambiarRol(usuario.idUsuario, rol))

  const handleActivo = (usuario, activo) => {
    setDesactivando(null)
    guardarFila(usuario, () => cambiarEstadoUsuario(usuario.idUsuario, activo))
  }

  const handleGuardado = (usuario) => {
    const nuevo = formulario === 'nuevo'
    queryClient.setQueryData(CLAVES.usuarios, (lista = []) =>
      nuevo ? [usuario, ...lista] : lista.map((u) => (u.idUsuario === usuario.idUsuario ? usuario : u)),
    )
    setEstadoFila((e) => ({ ...e, [usuario.idUsuario]: 'guardado' }))
    setFormulario(null)
    if (nuevo) {
      // Que aparezca aunque el filtro o la búsqueda lo dejarían fuera
      setFiltro('todos')
      setBusqueda('')
    }
  }

  const controlRol = (u) => {
    if (u.rol === 'OPERADOR') {
      return <span className={styles.rolFijo} title="El rol de un operador va ligado a su ficha y no se cambia">{ETIQUETA_ROL.OPERADOR}</span>
    }
    if (u.idUsuario === miId || u.esPrincipal) {
      const motivo = u.esPrincipal ? 'El administrador principal se define en la configuración del Backend' : 'No puedes cambiar tu propio rol'
      return <span className={styles.rolFijo} title={motivo}>{ETIQUETA_ROL[u.rol] ?? u.rol}</span>
    }
    return (
      <select
        className={styles.select}
        value={u.rol}
        disabled={estadoFila[u.idUsuario] === 'guardando'}
        onChange={(e) => handleRol(u, e.target.value)}
        aria-label={`Rol de ${u.nombre}`}
      >
        {ROLES_ASIGNABLES.map((rol) => (
          <option key={rol} value={rol}>
            {ETIQUETA_ROL[rol]}
          </option>
        ))}
      </select>
    )
  }

  const controlAcciones = (u) => {
    const ocupado = estadoFila[u.idUsuario] === 'guardando'
    const esPropio = u.idUsuario === miId
    // Al administrador principal solo lo edita él mismo, y nadie lo desactiva
    if (u.esPrincipal && !esPropio) return null
    return (
      <div className={styles.botones}>
        <button type="button" className={styles.accion} disabled={ocupado} onClick={() => setFormulario(u)}>
          <Pencil size={15} /> Editar
        </button>
        {!esPropio &&
          !u.esPrincipal &&
          (u.activo ? (
            <button type="button" className={styles.accion} disabled={ocupado} onClick={() => setDesactivando(u)}>
              <UserX size={15} /> Desactivar
            </button>
          ) : (
            <button type="button" className={styles.accion} disabled={ocupado} onClick={() => handleActivo(u, true)}>
              <UserCheck size={15} /> Activar
            </button>
          ))}
      </div>
    )
  }

  const estadoGuardado = (u) => {
    const estado = estadoFila[u.idUsuario]
    if (!estado) return null
    if (estado === 'guardando') return <LoaderCircle size={16} className={styles.girando} aria-label="Guardando" />
    if (estado === 'guardado') return <Check size={16} className={styles.ok} aria-label="Guardado" />
    return (
      <span className={styles.errorFila} role="alert">
        <AlertCircle size={14} /> {estado}
      </span>
    )
  }

  return (
    <section className={styles.admin}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>
            <Users size={22} className={styles.titleIcon} />
            Usuarios
          </h1>
          <p className={styles.subtitle}>Crea y edita cuentas, restablece contraseñas y asigna roles.</p>
        </div>
        <button type="button" className={styles.primario} onClick={() => setFormulario('nuevo')}>
          <Plus size={18} /> Nuevo usuario
        </button>
      </header>

      <p className={styles.nota}>
        <Info size={16} className={styles.notaIcono} />
        {/* En un span: dentro del flex, el texto y el <strong> serían columnas separadas */}
        <span>
          Quien entra por primera vez con Microsoft queda como <strong>Visor</strong> (solo ve el mapa y la flota). Los
          cambios de rol se aplican la próxima vez que la persona inicie sesión. Desactivar no borra su historial.
        </span>
      </p>

      <div className={styles.toolbar}>
        <label className={styles.search}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Buscar por nombre o correo…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </label>
        <div className={styles.filtros} role="tablist" aria-label="Filtrar por rol">
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
              <span className={styles.filtroConteo}>
                {cargando ? <Skeleton className={styles.skConteo} /> : (conteos[f.id] ?? 0)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className={styles.error} role="alert">
          <AlertCircle size={16} /> {error}
        </p>
      )}

      {cargando && <AvisoCarga texto="Cargando usuarios…" />}
      <div className={styles.tablaWrapper}>
        <table className={styles.tabla}>
          <thead className={styles.cabecera}>
            <tr>
              <th className={styles.th}>Usuario</th>
              <th className={styles.th}>Ingreso</th>
              <th className={styles.th}>Estado</th>
              <th className={styles.th}>Registrado</th>
              <th className={styles.th}>Rol</th>
              <th className={styles.th}>
                <span className={styles.visuallyHidden}>Acciones</span>
              </th>
              <th className={styles.th}>
                <span className={styles.visuallyHidden}>Resultado</span>
              </th>
            </tr>
          </thead>
          <tbody className={styles.cuerpo}>
            {cargando &&
              FILAS_SKELETON.map((n) => (
                <tr key={n} className={styles.fila} aria-hidden="true">
                  <td className={styles.td}>
                    <Skeleton className={styles.skNombre} />
                    <Skeleton className={styles.skEmail} />
                  </td>
                  <td className={styles.td}>
                    <Skeleton className={styles.skPastilla} />
                  </td>
                  <td className={styles.td}>
                    <Skeleton className={styles.skEstado} />
                  </td>
                  <td className={`${styles.td} ${styles.fecha}`}>
                    <Skeleton className={styles.skFecha} />
                  </td>
                  <td className={`${styles.td} ${styles.rol}`} data-label="Rol">
                    <Skeleton className={styles.skSelect} />
                  </td>
                  <td className={`${styles.td} ${styles.acciones}`}>
                    <Skeleton className={styles.skAccion} />
                  </td>
                  <td className={`${styles.td} ${styles.resultado}`} />
                </tr>
              ))}
            {!cargando && visibles.length === 0 && (
              <tr>
                <td className={styles.vacio} colSpan={7}>
                  No hay usuarios que coincidan.
                </td>
              </tr>
            )}
            {visibles.map((u) => (
              <tr key={u.idUsuario} className={styles.fila}>
                <td className={styles.td}>
                  <span className={styles.nombre}>
                    {u.nombre}
                    {u.idUsuario === miId && <span className={styles.tu}>tú</span>}
                    {u.esPrincipal && (
                      <span className={styles.principal} title="Administrador principal: no se puede desactivar ni cambiar de rol">
                        <ShieldCheck size={12} /> Principal
                      </span>
                    )}
                  </span>
                  <span className={styles.email}>{u.email}</span>
                </td>
                <td className={styles.td}>
                  <span className={`${styles.proveedor} ${u.proveedorAuth === 'MICROSOFT' ? styles.proveedorMicrosoft : ''}`}>
                    {PROVEEDOR[u.proveedorAuth] ?? u.proveedorAuth}
                  </span>
                </td>
                <td className={styles.td}>
                  <span className={`${styles.estado} ${u.activo ? styles.activo : styles.inactivo}`}>
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className={`${styles.td} ${styles.fecha}`} data-label="Registrado">{formatoFecha.format(new Date(u.creadoEn))}</td>
                <td className={`${styles.td} ${styles.rol}`} data-label="Rol">{controlRol(u)}</td>
                <td className={`${styles.td} ${styles.acciones}`}>{controlAcciones(u)}</td>
                <td className={`${styles.td} ${styles.resultado}`}>{estadoGuardado(u)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {formulario && (
        <FormularioUsuario
          usuario={formulario === 'nuevo' ? null : formulario}
          esPropio={formulario !== 'nuevo' && formulario.idUsuario === miId}
          onCerrar={() => setFormulario(null)}
          onGuardado={handleGuardado}
        />
      )}
      {desactivando && (
        <DialogoConfirmacion
          titulo={`¿Desactivar a ${desactivando.nombre}?`}
          mensaje={
            desactivando.rol === 'OPERADOR'
              ? 'No podrá entrar a la app móvil ni ser asignado a una máquina. Su historial de turnos se conserva y puedes reactivarlo cuando quieras.'
              : 'No podrá iniciar sesión. Su historial se conserva y puedes reactivarlo cuando quieras. Si tiene una sesión abierta, termina cuando vence su acceso actual.'
          }
          icono={<UserX size={20} />}
          textoConfirmar="Desactivar"
          onConfirmar={() => handleActivo(desactivando, false)}
          onCancelar={() => setDesactivando(null)}
        />
      )}
    </section>
  )
}

export default Admin
