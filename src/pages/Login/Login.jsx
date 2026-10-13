import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
  User,
} from 'lucide-react'
import cmpLogo from '../../assets/CMP_logo.png'
import cmpLogoDark from '../../assets/CMP_logo_modo_oscuro.png'
import microsoftLogo from '../../assets/microsoft.svg'
import ThemeToggle from '../../components/ThemeToggle/ThemeToggle.jsx'
import { useTheme } from '../../hooks/useTheme.js'
import { AuthError, loginConCredenciales } from '../../services/authService.js'
import { loginConMicrosoft, prepararMicrosoft } from '../../services/microsoftAuth.js'
import { rutaInicial, useSesion } from '../../services/session.js'
import styles from './Login.module.css'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  // Campos marcados como inválidos en el último intento de envío
  const [invalid, setInvalid] = useState({ email: false, password: false })
  const [submitting, setSubmitting] = useState(false)
  const { theme } = useTheme()
  const sesion = useSesion()
  const navigate = useNavigate()
  const location = useLocation()

  // Destino tras entrar: la ruta que pidió antes del login o la pantalla de inicio de su rol.
  // Solo un admin vuelve a /admin; al resto RequireAuth lo redirige igual.
  const destino = (nueva) => location.state?.from ?? rutaInicial(nueva)

  const handleSubmit = async (event) => {
    event.preventDefault()
    const missing = { email: !email.trim(), password: !password.trim() }
    setInvalid(missing)
    if (missing.email || missing.password) {
      setErrorMsg('Ingresa tu correo corporativo y tu contraseña para continuar.')
      return
    }
    setErrorMsg(null)
    setSubmitting(true)
    try {
      const nueva = await loginConCredenciales(email, password)
      navigate(destino(nueva), { replace: true })
    } catch (error) {
      setErrorMsg(error instanceof AuthError ? error.message : 'No se pudo iniciar sesión.')
      setSubmitting(false)
    }
  }

  const handleEmailChange = (event) => {
    setEmail(event.target.value)
    setInvalid((prev) => ({ ...prev, email: false }))
  }

  const handlePasswordChange = (event) => {
    setPassword(event.target.value)
    setInvalid((prev) => ({ ...prev, password: false }))
  }

  // Descarga e inicializa MSAL al abrir el login, para que el clic abra la ventana sin esperas
  useEffect(() => {
    prepararMicrosoft()?.catch(() => {})
  }, [])

  // Si la cuenta no existe, el Backend la registra como VISOR
  const handleMicrosoftLogin = async () => {
    setErrorMsg(null)
    setInvalid({ email: false, password: false })
    setSubmitting(true)
    try {
      const nueva = await loginConMicrosoft()
      if (!nueva) return setSubmitting(false)
      navigate(destino(nueva), { replace: true })
    } catch (error) {
      setErrorMsg(error instanceof AuthError ? error.message : 'No se pudo iniciar sesión con Microsoft.')
      setSubmitting(false)
    }
  }

  // Con sesión vigente no tiene sentido mostrar el login (salvo mientras se navega tras entrar)
  if (sesion && !submitting) return <Navigate to={rutaInicial(sesion)} replace />

  return (
    <div className={styles.login}>
      <aside className={styles.hero}>
        <img src={cmpLogoDark} alt="CMP" className={styles.heroLogo} />

        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>Gestión de Riesgo en los Procesos</h1>
          <p className={styles.heroText}>
            Panel web de supervisión de la operación en faena.
          </p>
        </div>

        <div className={styles.heroMeta}>
          <span>Mina Los Colorados</span>
          <span>Compañía Minera del Pacífico</span>
        </div>
      </aside>

      <main className={styles.panel}>
        {/* Misma estructura que el login de la app: header, formulario y footer.
            En teléfonos el formulario pasa a ser una card sobre la foto */}
        <header className={styles.panelHeader}>
          <span className={styles.panelBrand}>
            <img
              src={theme === 'dark' ? cmpLogoDark : cmpLogo}
              alt="CMP"
              className={styles.mobileLogo}
            />
            <ThemeToggle />
          </span>
        </header>

        <div className={styles.formWrapper}>
          <h2 className={styles.title}>Inicio de sesión</h2>
          <p className={styles.subtitle}>Ingresa con tu cuenta corporativa de CMP.</p>

          <button
            type="button"
            className={styles.microsoft}
            onClick={handleMicrosoftLogin}
            disabled={submitting}
          >
            <img src={microsoftLogo} alt="" className={styles.microsoftIcon} />
            Iniciar sesión con Microsoft
          </button>

          <div className={styles.divider}>
            o ingresa con tu correo
          </div>

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            {errorMsg && (
              <div id="login-error" className={styles.error} role="alert">
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <label className={styles.field}>
              <span className={styles.label}>Correo corporativo</span>
              <span className={styles.inputWrapper}>
                <User size={18} className={styles.inputIcon} />
                <input
                  className={styles.input}
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  aria-invalid={invalid.email}
                  aria-describedby={invalid.email ? 'login-error' : undefined}
                  placeholder="nombre.apellido@cmp.cl"
                  autoComplete="username"
                />
              </span>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Contraseña</span>
              <span className={styles.inputWrapper}>
                <Lock size={18} className={styles.inputIcon} />
                <input
                  className={styles.input}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={handlePasswordChange}
                  aria-invalid={invalid.password}
                  aria-describedby={invalid.password ? 'login-error' : undefined}
                  placeholder="Ingresa tu contraseña"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className={styles.togglePassword}
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </span>
            </label>

            <button type="submit" className={styles.submit} disabled={submitting}>
              {submitting ? 'Ingresando…' : 'Iniciar sesión'}
              {!submitting && <ArrowRight size={18} />}
            </button>
          </form>

          <p className={styles.help}>
            Acceso exclusivo para personal autorizado.
          </p>
        </div>

        <footer className={styles.panelFooter}>
          <span className={styles.panelFooterRow}>
            <ShieldCheck size={14} className={styles.panelFooterIcon} />
            Gestión de Riesgo en los Procesos (GRP)
          </span>
          <span>Mina Los Colorados · CMP</span>
        </footer>
      </main>
    </div>
  )
}

export default Login
