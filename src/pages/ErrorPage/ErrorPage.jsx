import { Link, isRouteErrorResponse, useRouteError } from 'react-router-dom'
import styles from './ErrorPage.module.css'

// errorElement del router: reemplaza la pantalla por defecto de React Router
function ErrorPage() {
  const error = useRouteError()
  console.error(error)

  const detalle = isRouteErrorResponse(error) ? `${error.status} ${error.statusText}` : error?.message

  return (
    <section className={styles.errorPage}>
      <h1 className={styles.title}>Algo salió mal</h1>
      <p>Ocurrió un error inesperado al cargar esta página. Recargar suele solucionarlo.</p>
      {import.meta.env.DEV && detalle && <pre className={styles.detail}>{detalle}</pre>}
      <div className={styles.actions}>
        <button type="button" className={styles.primary} onClick={() => window.location.reload()}>
          Recargar
        </button>
        <Link to="/" className={styles.secondary}>
          Volver al inicio
        </Link>
      </div>
    </section>
  )
}

export default ErrorPage
