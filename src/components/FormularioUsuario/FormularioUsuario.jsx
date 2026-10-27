import { useState } from 'react'
import { AlertCircle, AlertTriangle, Eye, EyeOff, Info, KeyRound } from 'lucide-react'
import PanelLateral from '../PanelLateral/PanelLateral.jsx'
import { crearUsuario, editarUsuario, ETIQUETA_ROL, ROLES_CREABLES } from '../../services/usuariosService.js'
import styles from './FormularioUsuario.module.css'
import { mensajeDeError } from '../../services/errores.js'

const LARGO_MINIMO_PASSWORD = 8
// Sin caracteres que se confunden al dictarla o copiarla a mano (0/O, 1/l/I)
const ALFABETO_GENERADO = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'

const generarPassword = (largo = 12) => {
  const valores = crypto.getRandomValues(new Uint32Array(largo))
  return Array.from(valores, (v) => ALFABETO_GENERADO[v % ALFABETO_GENERADO.length]).join('')
}

// Qué permite cada rol: así el administrador sabe qué acceso necesita
const DESCRIPCION_ROL = {
  VISOR: 'Solo ve el mapa y la flota en el panel web.',
  JEFE_TURNO: 'Gestiona la flota, el historial y las alertas. También usa la app móvil (con contraseña).',
  ADMIN: 'Todo lo del jefe de turno, más geocercas y usuarios.',
  OPERADOR: 'Usa la app móvil para registrar sus turnos. Entra con su RUT o correo y contraseña.',
}

const formularioDe = (usuario) => ({
  rol: usuario?.rol ?? 'VISOR',
  nombreCompleto: usuario?.nombre ?? '',
  nombre: usuario?.operador?.nombre ?? '',
  apellido: usuario?.operador?.apellido ?? '',
  email: usuario?.email ?? '',
  rut: usuario?.operador?.rut ?? '',
  telefono: usuario?.operador?.telefono ?? '',
  // Al crear, lo habitual en la planta es la cuenta Microsoft de la organización
  accesoMicrosoft: usuario ? usuario.proveedorAuth === 'MICROSOFT' : true,
  password: '',
})

/**
 * Alta o edición de un usuario (solo ADMIN) en un panel lateral. usuario: null para crear.
 * El switch de Microsoft decide cómo entra: con su cuenta Microsoft (sin contraseña) o con contraseña propia.
 * Un operador siempre usa contraseña (la app móvil no tiene Microsoft). Al editar se puede restablecer la
 * contraseña de quien la olvidó. onGuardado recibe el usuario tal como lo devuelve el Backend.
 */
function FormularioUsuario({ usuario = null, esPropio = false, onCerrar, onGuardado }) {
  const editando = Boolean(usuario)
  // Su correo y su contraseña los fija el .env del Backend
  const esPrincipal = Boolean(usuario?.esPrincipal)
  const [form, setForm] = useState(() => formularioDe(usuario))
  const [verPassword, setVerPassword] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const esOperador = form.rol === 'OPERADOR'
  // Al editar, la ficha (nombre, apellido, RUT) solo existe para quien usa la app como operador
  const conFicha = esOperador && (!editando || Boolean(usuario.operador))
  const microsoft = form.accesoMicrosoft && !esOperador
  const teniaPassword = usuario?.proveedorAuth === 'CREDENCIALES'
  // Contraseña obligatoria al crear sin Microsoft o al dejar Microsoft; si ya tenía, escribir una la restablece
  const passwordObligatoria = !microsoft && !teniaPassword
  const cambiaAcceso = editando && (microsoft ? teniaPassword : Boolean(form.password) || !teniaPassword)

  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }))

  const generar = () => {
    setForm((f) => ({ ...f, password: generarPassword() }))
    setVerPassword(true) // para que el administrador la pueda copiar y entregar
  }

  const validar = () => {
    const sinNombre = editando && !conFicha ? !form.nombreCompleto.trim() : !form.nombre.trim() || !form.apellido.trim()
    if (sinNombre || !form.email.trim()) return 'Completa los datos obligatorios.'
    if (conFicha && !form.rut.trim()) return 'Un operador necesita su RUT.'
    if (passwordObligatoria && !form.password) return 'Escribe una contraseña o genera una.'
    if (!microsoft && form.password && form.password.trim().length < LARGO_MINIMO_PASSWORD) {
      return `La contraseña debe tener al menos ${LARGO_MINIMO_PASSWORD} caracteres.`
    }
    return ''
  }

  const datosAEnviar = () => {
    const nombre = editando && !conFicha ? { nombre: form.nombreCompleto } : { nombre: form.nombre, apellido: form.apellido }
    return {
      ...(editando ? {} : { rol: form.rol }),
      ...nombre,
      email: form.email,
      ...(conFicha ? { rut: form.rut, telefono: form.telefono } : {}),
      accesoMicrosoft: microsoft,
      ...(!microsoft && form.password ? { password: form.password } : {}),
    }
  }

  const guardar = async (e) => {
    e.preventDefault()
    const problema = validar()
    setError(problema)
    if (problema) return

    setGuardando(true)
    try {
      const guardado = editando ? await editarUsuario(usuario.idUsuario, datosAEnviar()) : await crearUsuario(datosAEnviar())
      onGuardado(guardado)
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo guardar el usuario.'))
      setGuardando(false)
    }
  }

  const textoConfirmar = editando ? (guardando ? 'Guardando…' : 'Guardar cambios') : guardando ? 'Creando…' : 'Crear usuario'

  return (
    <PanelLateral
      titulo={editando ? 'Editar usuario' : 'Nuevo usuario'}
      subtitulo={editando ? `${ETIQUETA_ROL[usuario.rol] ?? usuario.rol} · ${usuario.email}` : 'Acceso al panel web o a la app móvil'}
      onCerrar={onCerrar}
      confirmar={{ texto: textoConfirmar, form: 'formulario-usuario', variante: 'primario', ocupado: guardando }}
    >
      <form id="formulario-usuario" className={styles.formularioUsuario} onSubmit={guardar} noValidate>
        {!editando && (
          <label className={styles.campo}>
            <span className={styles.label}>Rol *</span>
            <select className={styles.input} value={form.rol} onChange={set('rol')}>
              {ROLES_CREABLES.map((rol) => (
                <option key={rol} value={rol}>
                  {ETIQUETA_ROL[rol]}
                </option>
              ))}
            </select>
            <span className={styles.ayuda}>{DESCRIPCION_ROL[form.rol]}</span>
          </label>
        )}

        {editando && !conFicha ? (
          <label className={styles.campo}>
            <span className={styles.label}>Nombre completo *</span>
            <input className={styles.input} value={form.nombreCompleto} onChange={set('nombreCompleto')} maxLength={100} autoComplete="off" />
          </label>
        ) : (
          <div className={styles.dosColumnas}>
            <label className={styles.campo}>
              <span className={styles.label}>Nombre *</span>
              <input className={styles.input} value={form.nombre} onChange={set('nombre')} maxLength={50} autoComplete="off" />
            </label>
            <label className={styles.campo}>
              <span className={styles.label}>Apellido *</span>
              <input className={styles.input} value={form.apellido} onChange={set('apellido')} maxLength={50} autoComplete="off" />
            </label>
          </div>
        )}

        <label className={styles.campo}>
          <span className={styles.label}>Correo *</span>
          <input
            type="email"
            className={styles.input}
            value={form.email}
            onChange={set('email')}
            maxLength={150}
            autoComplete="off"
            placeholder="nombre.apellido@cmp.cl"
            readOnly={esPrincipal}
          />
          {esPrincipal && <span className={styles.ayuda}>Es el administrador principal: su correo se define en la configuración del Backend.</span>}
        </label>

        {conFicha && (
          <div className={styles.dosColumnas}>
            <label className={styles.campo}>
              <span className={styles.label}>RUT *</span>
              <input className={styles.input} value={form.rut} onChange={set('rut')} maxLength={12} placeholder="12.345.678-5" autoComplete="off" />
            </label>
            <label className={styles.campo}>
              <span className={styles.label}>Teléfono</span>
              <input
                type="tel"
                className={styles.input}
                value={form.telefono}
                onChange={set('telefono')}
                maxLength={20}
                placeholder="+56 9 1234 5678"
                autoComplete="off"
              />
            </label>
          </div>
        )}

        <fieldset className={styles.acceso} disabled={esPropio}>
          <legend className={styles.label}>Acceso</legend>

          <label className={`${styles.switch} ${esOperador ? styles.switchBloqueado : ''}`}>
            <span className={styles.switchTexto}>
              <span className={styles.switchTitulo}>Inicia sesión con Microsoft</span>
              <span className={styles.ayuda}>
                {esOperador
                  ? 'No disponible para operadores: la app móvil entra con contraseña.'
                  : microsoft
                    ? 'Entra con su cuenta Microsoft de la organización usando este correo. No necesita contraseña.'
                    : 'Entra con su correo y una contraseña.'}
              </span>
            </span>
            <input
              type="checkbox"
              role="switch"
              className={styles.switchInput}
              checked={microsoft}
              disabled={esOperador}
              onChange={(e) => setForm((f) => ({ ...f, accesoMicrosoft: e.target.checked }))}
            />
            <span className={styles.switchPista} aria-hidden="true" />
          </label>

          {microsoft && form.rol === 'JEFE_TURNO' && (
            <p className={styles.aviso}>
              <Info size={16} className={styles.avisoIcono} />
              <span>Con Microsoft solo entra al panel web. Para usar la app móvil necesita contraseña.</span>
            </p>
          )}

          {!microsoft && (
            <div className={styles.campo}>
              <span className={styles.label} id="formulario-usuario-password">
                {passwordObligatoria ? 'Contraseña *' : 'Nueva contraseña'}
              </span>
              <div className={styles.password}>
                <input
                  type={verPassword ? 'text' : 'password'}
                  className={styles.input}
                  value={form.password}
                  onChange={set('password')}
                  autoComplete="new-password"
                  aria-labelledby="formulario-usuario-password"
                  placeholder={passwordObligatoria ? '' : 'Déjala vacía para mantener la actual'}
                />
                <button
                  type="button"
                  className={styles.icono}
                  onClick={() => setVerPassword((v) => !v)}
                  aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  title={verPassword ? 'Ocultar' : 'Mostrar'}
                >
                  {verPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button type="button" className={styles.generar} onClick={generar}>
                  <KeyRound size={15} /> Generar
                </button>
              </div>
              <span className={styles.ayuda}>
                Al menos {LARGO_MINIMO_PASSWORD} caracteres. Entrégasela a la persona por un canal seguro.
              </span>
            </div>
          )}

          {esPropio && (
            <p className={styles.aviso}>
              <Info size={16} className={styles.avisoIcono} />
              <span>
                {esPrincipal
                  ? 'Tu contraseña de administrador principal se cambia en ADMIN_PRINCIPAL_PASSWORD, en la configuración del Backend.'
                  : 'No puedes cambiar tu propia contraseña ni tu forma de ingreso desde aquí.'}
              </span>
            </p>
          )}

          {cambiaAcceso && (
            <p className={`${styles.aviso} ${styles.avisoAmbar}`}>
              <AlertTriangle size={16} className={styles.avisoIcono} />
              <span>
                {microsoft
                  ? 'Se eliminará su contraseña: desde ahora entra solo con Microsoft.'
                  : teniaPassword
                    ? 'Su contraseña actual dejará de funcionar.'
                    : 'Desde ahora entrará con esta contraseña.'}{' '}
                Sus sesiones abiertas se cerrarán.
              </span>
            </p>
          )}
        </fieldset>

        {error && (
          <p className={styles.error} role="alert">
            <AlertCircle size={16} /> {error}
          </p>
        )}
      </form>
    </PanelLateral>
  )
}

export default FormularioUsuario
