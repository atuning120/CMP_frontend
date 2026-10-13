import { useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  BellRing,
  Eye,
  EyeOff,
  HardHat,
  Lock,
  MapPinned,
  ShieldCheck,
  Truck,
  User,
} from 'lucide-react'
import cmpLogo from '../../assets/CMP_logo.png'
import cmpLogoDark from '../../assets/CMP_logo_modo_oscuro.png'
import microsoftLogo from '../../assets/microsoft.svg'
import ThemeToggle from '../../components/ThemeToggle/ThemeToggle.jsx'
import { useTheme } from '../../hooks/useTheme.js'
import styles from './Login.module.css'

const HIGHLIGHTS = [
  { icon: Truck, text: 'Estado de la flota por turno' },
  { icon: MapPinned, text: 'Ubicación de equipos y geocercas' },
  { icon: BellRing, text: 'Alertas e historial de eventos' },
]

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  // Campos marcados como inválidos en el último intento de envío
  const [invalid, setInvalid] = useState({ email: false, password: false })
  const { theme } = useTheme()

  // Pendiente: conectar con el Backend (POST /auth/login)
  const handleSubmit = (event) => {
    event.preventDefault()
    const missing = { email: !email.trim(), password: !password.trim() }
    setInvalid(missing)
    if (missing.email || missing.password) {
      setErrorMsg('Ingresa tu correo corporativo y tu contraseña para continuar.')
      return
    }
    setErrorMsg(null)
  }

  const handleEmailChange = (event) => {
    setEmail(event.target.value)
    setInvalid((prev) => ({ ...prev, email: false }))
  }

  const handlePasswordChange = (event) => {
    setPassword(event.target.value)
    setInvalid((prev) => ({ ...prev, password: false }))
  }

  // Pendiente: obtener el token de Entra ID con MSAL y enviarlo a POST /auth/login/web
  const handleMicrosoftLogin = () => {}

  return (
    <div className={styles.login}>
      <aside className={styles.hero}>
        <img src={cmpLogoDark} alt="CMP" className={styles.heroLogo} />

        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>Gestión de Riesgo en los Procesos</h1>
          <p className={styles.heroText}>
            Panel web de supervisión de la operación en Mina Los Colorados.
          </p>
          <ul className={styles.highlights}>
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className={styles.highlight}>
                <Icon size={18} />
                {text}
              </li>
            ))}
          </ul>
        </div>

        <span className={styles.heroFooter}>GRP · Mina Los Colorados · CMP</span>
      </aside>

      <main className={styles.panel}>
        {/* En teléfonos la página replica el login de la app: header, card sobre la foto y footer */}
        <header className={styles.mobileHeader}>
          <span className={styles.mobileBrand}>
            <img
              src={theme === 'dark' ? cmpLogoDark : cmpLogo}
              alt="CMP"
              className={styles.mobileLogo}
            />
            <ThemeToggle />
          </span>
          <span className={styles.mobileSystem}>
            <HardHat size={14} />
            Panel Web MLC
          </span>
        </header>

        <ThemeToggle className={styles.themeToggle} />

        <div className={styles.formWrapper}>
          <h2 className={styles.title}>Inicio de sesión</h2>
          <p className={styles.subtitle}>Ingresa con tu cuenta corporativa de CMP.</p>

          <button type="button" className={styles.microsoft} onClick={handleMicrosoftLogin}>
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
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>

            <button type="submit" className={styles.submit}>
              Iniciar sesión
              <ArrowRight size={18} />
            </button>
          </form>

          <p className={styles.help}>
            <ShieldCheck size={14} className={styles.helpIcon} />
            Acceso exclusivo para personal autorizado.
          </p>
        </div>

        <footer className={styles.mobileFooter}>
          <span className={styles.mobileFooterRow}>
            <ShieldCheck size={14} className={styles.mobileFooterIcon} />
            Gestión de Riesgo en los Procesos (GRP)
          </span>
          <span>Mina Los Colorados · CMP</span>
        </footer>
      </main>
    </div>
  )
}

export default Login
