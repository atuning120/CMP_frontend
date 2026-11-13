import { useEffect, useId, useRef, useState } from 'react'
import { Bell, BellOff, ChevronDown, CircleHelp, LogOut, Moon, Sun } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme.js'
import styles from './MenuCuenta.module.css'

// Estado de los avisos en una línea
const estadoAvisos = ({ activados, permiso }) => {
  if (!activados) return 'Desactivados'
  if (permiso === 'default') return 'Falta permitir notificaciones'
  if (permiso === 'granted') return 'Sonido y notificación'
  return 'Solo sonido'
}

/**
 * Menú de la cuenta, en el header en todas las pantallas: el avatar (con correo y rol si hay espacio) abre debajo las
 * opciones del usuario: avisos de alertas, recorrido guiado, tema y cerrar sesión. Así el header cabe en una fila
 * aunque estén todas las pestañas.
 * avisos: { activados, permiso, onActivar, onDesactivar } o null (sin acceso a alertas). onRecorrido: o null.
 */
function MenuCuenta({ email, rol, iniciales, avisos, onRecorrido, onCerrarSesion }) {
  const [abierto, setAbierto] = useState(false)
  const { theme, toggleTheme } = useTheme()
  const raizRef = useRef(null)
  const botonRef = useRef(null)
  const menuRef = useRef(null)
  const idMenu = useId()
  const oscuro = theme === 'dark'
  const faltaPermiso = avisos?.activados && avisos.permiso === 'default'

  const cerrar = (devolverFoco) => {
    setAbierto(false)
    if (devolverFoco) botonRef.current?.focus()
  }

  // Abierto: el foco pasa a la primera opción; un clic fuera o Esc lo cierran
  useEffect(() => {
    if (!abierto) return
    menuRef.current?.querySelector('[role^="menuitem"]')?.focus()
    const alTocarFuera = (e) => {
      if (!raizRef.current?.contains(e.target)) setAbierto(false)
    }
    document.addEventListener('pointerdown', alTocarFuera)
    return () => document.removeEventListener('pointerdown', alTocarFuera)
  }, [abierto])

  // Teclado del menú: flechas para moverse entre opciones, Esc para cerrar
  const alTeclear = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      cerrar(true)
      return
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const opciones = [...menuRef.current.querySelectorAll('[role^="menuitem"]')]
    const actual = opciones.indexOf(document.activeElement)
    const siguiente = (actual + (e.key === 'ArrowDown' ? 1 : -1) + opciones.length) % opciones.length
    opciones[siguiente]?.focus()
  }

  return (
    <div ref={raizRef} className={styles.menuCuenta}>
      <button
        ref={botonRef}
        type="button"
        className={`${styles.disparador} ${abierto ? styles.abierto : ''}`}
        onClick={() => setAbierto((a) => !a)}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-controls={idMenu}
        aria-label={`Menú de la cuenta: ${email ?? ''}`}
        title="Menú de la cuenta"
        data-recorrido="menu-cuenta"
      >
        <span className={styles.avatar} aria-hidden="true">
          {iniciales}
          {faltaPermiso && <span className={styles.punto} />}
        </span>
        <span className={styles.identidad} aria-hidden="true">
          <span className={styles.identidadEmail}>{email}</span>
          <span className={styles.identidadRol}>{rol}</span>
        </span>
        <ChevronDown size={16} className={styles.flecha} aria-hidden="true" />
      </button>

      {abierto && (
        <div ref={menuRef} id={idMenu} className={styles.menu} role="menu" aria-label="Cuenta" onKeyDown={alTeclear}>
          <div className={styles.cabecera}>
            <span className={styles.email}>{email}</span>
            <span className={styles.rol}>{rol}</span>
          </div>

          {avisos && (
            <button
              type="button"
              role="menuitemcheckbox"
              aria-checked={avisos.activados}
              className={styles.opcion}
              onClick={avisos.activados && !faltaPermiso ? avisos.onDesactivar : avisos.onActivar}
            >
              <span className={`${styles.icono} ${avisos.activados ? '' : styles.iconoApagado}`}>
                {avisos.activados ? <Bell size={18} /> : <BellOff size={18} />}
              </span>
              <span className={styles.texto}>
                Avisos de alertas
                <span className={styles.detalle}>{estadoAvisos(avisos)}</span>
              </span>
              <span className={`${styles.interruptor} ${avisos.activados ? styles.interruptorOn : ''}`} aria-hidden="true" />
            </button>
          )}

          {onRecorrido && (
            <button
              type="button"
              role="menuitem"
              className={styles.opcion}
              onClick={() => {
                cerrar(false)
                onRecorrido()
              }}
            >
              <span className={styles.icono}>
                <CircleHelp size={18} />
              </span>
              <span className={styles.texto}>
                Recorrido guiado
                <span className={styles.detalle}>Repasa las funciones del panel</span>
              </span>
            </button>
          )}

          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={oscuro}
            className={styles.opcion}
            onClick={toggleTheme}
          >
            <span className={styles.icono}>{oscuro ? <Moon size={18} /> : <Sun size={18} />}</span>
            <span className={styles.texto}>
              Modo oscuro
              <span className={styles.detalle}>{oscuro ? 'Activado' : 'Desactivado'}</span>
            </span>
            <span className={`${styles.interruptor} ${oscuro ? styles.interruptorOn : ''}`} aria-hidden="true" />
          </button>

          <div className={styles.separador} role="separator" />
          <button
            type="button"
            role="menuitem"
            className={`${styles.opcion} ${styles.opcionSalir}`}
            aria-haspopup="dialog"
            onClick={() => {
              cerrar(false)
              onCerrarSesion()
            }}
          >
            <span className={`${styles.icono} ${styles.iconoSalir}`}>
              <LogOut size={18} />
            </span>
            <span className={styles.texto}>Cerrar sesión</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default MenuCuenta
