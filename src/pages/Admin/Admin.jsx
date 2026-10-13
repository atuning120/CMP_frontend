import styles from './Admin.module.css'

function Admin() {
  return (
    <section className={styles.admin}>
      <h1 className={styles.title}>Administración</h1>
      <p className={styles.subtitle}>Panel exclusivo para usuarios administradores.</p>
    </section>
  )
}

export default Admin
