import { Fragment } from 'react'
import { parsearBloques } from '../../services/textoFormateado.js'
import styles from './TextoFormateado.module.css'

// Arma elementos React (nunca HTML crudo): el texto viene de la base y se muestra sin riesgo de inyección
const Tramos = ({ tramos }) =>
  tramos.map(({ texto, negrita, cursiva }, i) => {
    let nodo = texto
    if (cursiva) nodo = <em>{nodo}</em>
    if (negrita) nodo = <strong className={styles.negrita}>{nodo}</strong>
    return <Fragment key={i}>{nodo}</Fragment>
  })

/** Muestra una descripción con formato liviano (negrita, cursiva, viñetas y listas numeradas). */
function TextoFormateado({ texto, className = '' }) {
  const bloques = parsearBloques(texto)
  if (bloques.length === 0) return null

  return (
    <div className={`${styles.textoFormateado} ${className}`}>
      {bloques.map((bloque, i) => {
        if (bloque.tipo === 'parrafo') {
          return (
            <p key={i} className={styles.parrafo}>
              {bloque.lineas.map((tramos, j) => (
                <Fragment key={j}>
                  {j > 0 && <br />}
                  <Tramos tramos={tramos} />
                </Fragment>
              ))}
            </p>
          )
        }
        const Lista = bloque.ordenada ? 'ol' : 'ul'
        return (
          <Lista key={i} className={styles.lista} start={bloque.ordenada && bloque.inicio !== 1 ? bloque.inicio : undefined}>
            {bloque.items.map((tramos, j) => (
              <li key={j}>
                <Tramos tramos={tramos} />
              </li>
            ))}
          </Lista>
        )
      })}
    </div>
  )
}

export default TextoFormateado
