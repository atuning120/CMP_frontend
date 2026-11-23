import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import QRCode from 'qrcode'
import { ArrowLeft, CircleAlert, Clock, Download, HardDrive, History, LogIn, PackageCheck, QrCode, RefreshCw, ShieldCheck, Smartphone } from 'lucide-react'
import cmpLogoDark from '../../assets/CMP_logo_modo_oscuro.png'
import geoPlantaLogo from '../../assets/logoGeoPlanta.png'
import Skeleton, { AvisoCarga } from '../../components/Skeleton/Skeleton.jsx'
import { useVersionesApp } from '../../hooks/consultas.js'
import { formatearFecha, formatearTamano, urlDescargaUltima, urlDescargaVersion } from '../../services/appMovilService.js'
import { mensajeDeError } from '../../services/errores.js'
import { useSesion } from '../../services/session.js'
import styles from './AppMovil.module.css'

// Un QR se lee bien solo en negro sobre blanco, sea cual sea el tema: por eso estos colores no son tokens
const OPCIONES_QR = { errorCorrectionLevel: 'M', margin: 1, width: 440, color: { dark: '#000000', light: '#ffffff' } }

// Imagen (data URL) del QR de un enlace; null mientras se genera
function useCodigoQr(texto) {
  const [qr, setQr] = useState(null)
  useEffect(() => {
    let vigente = true
    QRCode.toDataURL(texto, OPCIONES_QR)
      .then((imagen) => vigente && setQr({ texto, imagen }))
      .catch(() => vigente && setQr(null))
    return () => {
      vigente = false
    }
  }, [texto])
  return qr?.texto === texto ? qr.imagen : null
}

const PASOS = [
  {
    titulo: 'Descarga el archivo',
    texto: 'Con el botón, en el mismo teléfono, o escaneando el código QR con la cámara. Se guarda en Descargas.',
  },
  {
    titulo: 'Autoriza la instalación',
    texto: 'Al abrir el archivo, Android pide permitir «Instalar apps desconocidas» para el navegador o la app de archivos. Es solo para esta instalación.',
  },
  {
    titulo: 'Instala e ingresa',
    texto: 'Abre GeoPlanta Móvil e ingresa con tu cuenta. Si ya tenías la app, se actualiza encima y conserva lo guardado en el teléfono.',
  },
]

function Cargando() {
  return (
    <div className={styles.producto}>
      <AvisoCarga texto="Cargando la app móvil…" />
      <div className={styles.ficha}>
        <Skeleton className={styles.skIcono} />
        <div className={styles.datos}>
          <Skeleton className={styles.skTitulo} />
          <Skeleton className={styles.skLinea} />
          <Skeleton className={styles.skBoton} />
        </div>
      </div>
      <Skeleton className={styles.skQr} />
    </div>
  )
}

function Aviso({ titulo, texto, onReintentar }) {
  return (
    <div className={styles.aviso} role={onReintentar ? 'alert' : 'status'}>
      <CircleAlert size={22} className={styles.avisoIcono} aria-hidden="true" />
      <div>
        <h2 className={styles.avisoTitulo}>{titulo}</h2>
        <p className={styles.avisoTexto}>{texto}</p>
        {onReintentar && (
          <button type="button" className={styles.reintentar} onClick={onReintentar}>
            <RefreshCw size={16} aria-hidden="true" /> Reintentar
          </button>
        )}
      </div>
    </div>
  )
}

// La última versión publicada: botón de descarga y QR que siempre apunta a la última
function Producto({ ultima }) {
  const qr = useCodigoQr(urlDescargaUltima())

  return (
    <div className={styles.producto}>
      <div className={styles.ficha}>
        <img src={geoPlantaLogo} alt="" className={styles.icono} width="256" height="249" />
        <div className={styles.datos}>
          <span className={styles.plataforma}>
            <Smartphone size={14} aria-hidden="true" /> Android
          </span>
          <h2 className={styles.nombre}>GeoPlanta Móvil</h2>
          <p className={styles.descripcion}>Turnos, estados operacionales, horómetro y evidencias. Funciona sin señal.</p>

          <dl className={styles.meta}>
            <div>
              <dt className={styles.metaEtiqueta}>
                <PackageCheck size={15} aria-hidden="true" /> Versión
              </dt>
              <dd className={styles.metaValor}>{ultima.version}</dd>
            </div>
            <div>
              <dt className={styles.metaEtiqueta}>
                <Clock size={15} aria-hidden="true" /> Publicada
              </dt>
              <dd className={styles.metaValor}>{formatearFecha(ultima.subidaEn)}</dd>
            </div>
            <div>
              <dt className={styles.metaEtiqueta}>
                <HardDrive size={15} aria-hidden="true" /> Tamaño
              </dt>
              <dd className={styles.metaValor}>{formatearTamano(ultima.tamanoBytes)}</dd>
            </div>
          </dl>

          {/* Enlace al Backend, que redirige al archivo en Azure: es externo, por eso <a> y no <Link> */}
          <a className={styles.descargar} href={urlDescargaVersion(ultima.idVersion)}>
            <Download size={20} aria-hidden="true" /> Descargar APK
          </a>
          <p className={styles.nota}>
            <ShieldCheck size={15} className={styles.textoIcono} aria-hidden="true" /> Instalador oficial de GeoPlanta para los
            teléfonos de la faena.
          </p>
        </div>
      </div>

      <aside className={styles.qr} aria-label="Descargar con el teléfono">
        <div className={styles.qrMarco}>
          {qr ? (
            <img src={qr} alt="Código QR para descargar la última versión de GeoPlanta Móvil" className={styles.qrImagen} width="220" height="220" />
          ) : (
            <Skeleton className={styles.qrImagen} />
          )}
        </div>
        <p className={styles.qrTexto}>
          <QrCode size={16} className={styles.textoIcono} aria-hidden="true" /> Escanéalo con la cámara del teléfono para descargar
          la última versión.
        </p>
      </aside>
    </div>
  )
}

function Historial({ versiones }) {
  return (
    <section className={styles.historial} aria-labelledby="historial-titulo">
      <h2 id="historial-titulo" className={styles.seccionTitulo}>
        <History size={20} aria-hidden="true" /> Historial de versiones
      </h2>
      <ol className={styles.versiones}>
        {versiones.map((v, i) => (
          <li key={v.idVersion} className={styles.version}>
            <div className={styles.versionCabecera}>
              <span className={styles.versionNumero}>Versión {v.version}</span>
              {i === 0 && <span className={styles.ultima}>Última</span>}
              <span className={styles.versionDatos}>
                {formatearFecha(v.subidaEn)} · {formatearTamano(v.tamanoBytes)}
              </span>
              <a className={styles.versionDescargar} href={urlDescargaVersion(v.idVersion)} aria-label={`Descargar la versión ${v.version}`}>
                <Download size={16} aria-hidden="true" /> Descargar
              </a>
            </div>
            {v.notas ? <p className={styles.versionNotas}>{v.notas}</p> : <p className={styles.sinNotas}>Sin notas para esta versión.</p>}
          </li>
        ))}
      </ol>
    </section>
  )
}

/**
 * Página pública de descarga de la app móvil (sin sesión): última versión con su QR, cómo instalarla y el historial de
 * versiones publicadas. Las versiones las administra el ADMIN en /admin/app-movil.
 */
function AppMovil() {
  const sesion = useSesion()
  const consulta = useVersionesApp()
  const versiones = consulta.data

  let contenido
  if (versiones?.length) contenido = <Producto ultima={versiones[0]} />
  else if (versiones) contenido = <Aviso titulo="Todavía no hay una versión publicada" texto="Cuando se publique la app, aparecerá aquí lista para descargar." />
  else if (consulta.error)
    contenido = (
      <Aviso
        titulo="No se pudo cargar la app"
        texto={mensajeDeError(consulta.error, 'No se pudo cargar la app móvil.')}
        onReintentar={() => consulta.refetch()}
      />
    )
  else contenido = <Cargando />

  return (
    <div className={styles.appMovil}>
      <header className={styles.barra}>
        <span className={styles.marca}>
          <img src={cmpLogoDark} alt="CMP" className={styles.marcaCmp} />
          <img src={geoPlantaLogo} alt="" className={styles.marcaLogo} width="256" height="249"/>
          <span className={styles.marcaNombre}>GeoPlanta</span>
        </span>
        <Link to={sesion ? '/mapa' : '/login'} className={styles.barraBoton}>
          {sesion ? <ArrowLeft size={16} aria-hidden="true" /> : <LogIn size={16} aria-hidden="true" />}
          {sesion ? 'Volver al panel' : 'Iniciar sesión'}
        </Link>
      </header>

      <main className={styles.contenido}>
        <div>
          <h1 className={styles.title}>Descarga la app móvil</h1>
          <p className={styles.subtitle}>GeoPlanta Móvil para operadores y jefes de turno en terreno.</p>
        </div>

        {contenido}

        {versiones?.length > 0 && (
          <>
            <section className={styles.pasos} aria-labelledby="pasos-titulo">
              <h2 id="pasos-titulo" className={styles.seccionTitulo}>
                Cómo instalarla
              </h2>
              <ol className={styles.lista}>
                {PASOS.map((paso, i) => (
                  <li key={paso.titulo} className={styles.paso}>
                    <span className={styles.numero} aria-hidden="true">
                      {i + 1}
                    </span>
                    <div>
                      <h3 className={styles.pasoTitulo}>{paso.titulo}</h3>
                      <p className={styles.pasoTexto}>{paso.texto}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
            <Historial versiones={versiones} />
          </>
        )}
      </main>

      <footer className={styles.pie}>Gestión de Riesgo en los Procesos (GRP) · Mina Los Colorados · CMP</footer>
    </div>
  )
}

export default AppMovil
