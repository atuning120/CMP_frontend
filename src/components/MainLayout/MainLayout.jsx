import { NavLink, Outlet } from 'react-router-dom'
import ThemeToggle from '../ThemeToggle/ThemeToggle.jsx'
import styles from './MainLayout.module.css'

const navLinkClass = ({ isActive }) =>
  isActive ? `${styles.link} ${styles.active}` : styles.link

function MainLayout() {
  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <span className={styles.brand}>CMP</span>
        <nav className={styles.nav}>
          <NavLink to="/" end className={navLinkClass}>
            Inicio
          </NavLink>
          <ThemeToggle />
        </nav>
      </header>

      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  )
}

export default MainLayout
