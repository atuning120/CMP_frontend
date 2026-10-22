import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Check, Info, LoaderCircle, Search, Users } from 'lucide-react'
import Skeleton, { AvisoCarga } from '../../components/Skeleton/Skeleton.jsx'
import { CLAVES, errorSinDatos, useUsuarios } from '../../hooks/consultas.js'
import { idUsuarioSesion, useSesion } from '../../services/session.js'
import { cambiarRol, ETIQUETA_ROL, ROLES_ASIGNABLES } from '../../services/usuariosService.js'
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
 * Administración de usuarios (solo ADMIN). Quien entra por primera vez con Microsoft queda como Visor
 * hasta que un administrador le asigna otro rol aquí.
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
      queryClient.setQueryData(CLAVES.usuarios, (lista) =>
        lista?.map((u) => (u.idUsuario === actualizado.idUsuario ? actualizado : u)),
      )
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
        {/* En un span: dentro del flex, el texto y el <strong> serían columnas separadas */}
        <span>
          Quien entra por primera vez con Microsoft queda como <strong>Visor</strong> (solo ve el mapa y la flota). El
          cambio de rol se aplica la próxima vez que la persona inicie sesión.
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
                  <td className={`${styles.td} ${styles.resultado}`} />
                </tr>
              ))}
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
                <td className={`${styles.td} ${styles.fecha}`} data-label="Registrado">{formatoFecha.format(new Date(u.creadoEn))}</td>
                <td className={`${styles.td} ${styles.rol}`} data-label="Rol">{controlRol(u)}</td>
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
