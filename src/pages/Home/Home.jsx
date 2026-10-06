import styles from './Home.module.css'

function Home() {
  return (
    <section className={styles.home}>
      <h1 className={styles.title}>Inicio</h1>
      <p className={styles.subtitle}>Panel web de CMP</p>
    </section>
  )
}

export default Home
