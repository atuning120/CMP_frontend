import { Link } from 'react-router-dom'
import styles from './NotFound.module.css'

function NotFound() {
  return (
    <section className={styles.notFound}>
      <h1 className={styles.code}>404</h1>
      <p>La página que buscas no existe.</p>
      <Link to="/" className={styles.back}>
        Volver al inicio
      </Link>
    </section>
  )
}

export default NotFound
