import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Check, Info, LoaderCircle, Search, Users } from 'lucide-react'
import { idUsuarioSesion, useSesion } from '../../services/session.js'
import { cambiarRol, ETIQUETA_ROL, listarUsuarios, ROLES_ASIGNABLES } from '../../services/usuariosService.js'
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

/**
 * Administración de usuarios (solo ADMIN). Quien entra por primera vez con Microsoft queda como Visor
 * hasta que un administrador le asigna otro rol aquí.
 */
function Admin() {
  const sesion = useSesion()
  const miId = idUsuarioSesion(sesion)
  const [usuarios, setUsuarios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [filtro, setFiltro] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  // Estado del guardado por fila: { [idUsuario]: 'guardando' | 'guardado' | mensaje de error }
  const [estadoFila, setEstadoFila] = useState({})

  useEffect(() => {
    let vigente = true
    listarUsuarios()
      .then((lista) => vigente && setUsuarios(lista))
      .catch((e) => vigente && setError(e.message))
      .finally(() => vigente && setCargando(false))
    return () => {
      vigente = false
    }
  }, [])

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

  const handleRol = async (usuario, rol) => {
    setEstadoFila((e) => ({ ...e, [usuario.idUsuario]: 'guardando' }))
    try {
      const actualizado = await cambiarRol(usuario.idUsuario, rol)
      setUsuarios((lista) => lista.map((u) => (u.idUsuario === actualizado.idUsuario ? actualizado : u)))
      setEstadoFila((e) => ({ ...e, [usuario.idUsuario]: 'guardado' }))
    } catch (e) {
      setEstadoFila((prev) => ({ ...prev, [usuario.idUsuario]: e.message }))
    }
  }

  const controlRol = (u) => {
    if (u.rol === 'OPERADOR') {
      return <span className={styles.rolFijo} title="Los operadores se gestionan desde la app móvil">{ETIQUETA_ROL.OPERADOR}</span>
    }
    if (u.idUsuario === miId) {
      return <span className={styles.rolFijo} title="No puedes cambiar tu propio rol">{ETIQUETA_ROL[u.rol] ?? u.rol}</span>
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
          <p className={styles.subtitle}>Asigna el rol de cada persona que usa el panel web.</p>
        </div>
      </header>

      <p className={styles.nota}>
        <Info size={16} className={styles.notaIcono} />
        Quien entra por primera vez con Microsoft queda como <strong>Visor</strong> (solo ve el mapa y la flota). El
        cambio de rol se aplica la próxima vez que la persona inicie sesión.
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
              <span className={styles.filtroConteo}>{conteos[f.id] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className={styles.error} role="alert">
          <AlertCircle size={16} /> {error}
        </p>
      )}

      <div className={styles.tablaWrapper}>
        <table className={styles.tabla}>
          <thead>
            <tr>
              <th className={styles.th}>Usuario</th>
              <th className={styles.th}>Ingreso</th>
              <th className={styles.th}>Estado</th>
              <th className={styles.th}>Registrado</th>
              <th className={styles.th}>Rol</th>
              <th className={styles.th}>
                <span className={styles.visuallyHidden}>Resultado</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {cargando && (
              <tr>
                <td className={styles.vacio} colSpan={6}>
                  Cargando usuarios…
                </td>
              </tr>
            )}
            {!cargando && visibles.length === 0 && (
              <tr>
                <td className={styles.vacio} colSpan={6}>
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
                <td className={`${styles.td} ${styles.fecha}`}>{formatoFecha.format(new Date(u.creadoEn))}</td>
                <td className={styles.td}>{controlRol(u)}</td>
                <td className={`${styles.td} ${styles.resultado}`}>{estadoGuardado(u)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default Admin
