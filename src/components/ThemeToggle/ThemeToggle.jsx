import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme.js'
import styles from './ThemeToggle.module.css'

// variante 'marca': sobre el header azul CMP
function ThemeToggle({ className = '', variante }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      className={`${styles.themeToggle} ${variante === 'marca' ? styles.marca : ''} ${className}`}
      onClick={toggleTheme}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      title={isDark ? 'Modo claro' : 'Modo oscuro'}
    >
      {isDark ? <Sun size={18} className={styles.sun} /> : <Moon size={18} className={styles.moon} />}
    </button>
  )
}

export default ThemeToggle
