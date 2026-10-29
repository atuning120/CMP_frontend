<p align="center">
  <img src="public/logoGeoPlanta.png" alt="GeoPlanta" width="96" />
</p>

<h1 align="center">GeoPlanta Web</h1>

<p align="center">
  Panel web para supervisar en tiempo real la flota de maquinaria de una planta minera:
  mapa en vivo, geocercas, turnos, alertas y dashboards de operación.
</p>

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white" />
  <img alt="React Router" src="https://img.shields.io/badge/React_Router-7-ca4245?logo=reactrouter&logoColor=white" />
  <img alt="MapLibre" src="https://img.shields.io/badge/MapLibre_GL-6-396cb2?logo=maplibre&logoColor=white" />
  <img alt="pnpm" src="https://img.shields.io/badge/pnpm-f69220?logo=pnpm&logoColor=white" />
</p>

---

## Contenido

- [Qué es](#qué-es)
- [Funcionalidades](#funcionalidades)
- [Roles y permisos](#roles-y-permisos)
- [Stack](#stack)
- [Primeros pasos](#primeros-pasos)
- [Scripts](#scripts)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Convenciones](#convenciones)
- [Despliegue](#despliegue)

## Qué es

GeoPlanta es un ecosistema de dos clientes, **GeoPlanta Móvil** (app de terreno para operadores y jefes de turno) y
**GeoPlanta Web** (este repositorio), que comparten un mismo Backend REST + WebSocket. La web es el puesto de control:
muestra dónde está cada máquina, en qué estado se encuentra y qué pasó durante el turno, y permite gestionar la flota,
las geocercas y los usuarios sin depender del celular.

## Funcionalidades

| Módulo | Ruta | Descripción |
|---|---|---|
| **Mapa en vivo** | `/mapa` | Posición de cada máquina en tiempo real (Socket.IO) sobre imagen satelital, con su estado operacional, el área en que se encuentra y el detalle de su turno. Incluye la administración de geocercas: dibujar, editar y eliminar polígonos. |
| **Flota** | `/flota` | Las mismas acciones que el jefe de turno tiene en la app móvil (asignar, liberar, cambiar estado, etc.). Cada acción pide un motivo y queda registrada en la bitácora. |
| **Historial** | `/historial` | Bitácora de inicios y cierres de turno, cambios de área y acciones sobre la flota, agrupada por día y con scroll infinito. Incluye la galería de evidencias fotográficas. |
| **Alertas** | `/alertas` | Turnos excedidos, cierres automáticos y máquinas detenidas. Las alertas nuevas llegan en tiempo real y cada una se puede atender y comentar. |
| **Dashboards** | `/dashboards` | Indicadores de operación y comparación con el estado de pago mensual (carga de Excel con previsualización), embebidos desde Metabase. |
| **Administración** | `/admin` | Alta y edición de usuarios web y operadores, roles, activación y restablecimiento de contraseña. |

Además:

- **Inicio de sesión** con usuario y contraseña o con cuenta Microsoft (Entra ID). Las cuentas nuevas entran con el
  rol de solo lectura hasta que un administrador les asigna otro.
- **Modo claro y oscuro**, que sigue la preferencia del sistema o la elección del usuario.
- **Sesión con renovación automática** del token y reconexión de los WebSockets tras un corte.
- **Recuperación tras un deploy**: si una pestaña abierta pide un chunk que ya no existe, se recarga sola una vez.
- Skeletons de carga y manejo de errores por página, sin perder la navegación.

## Roles y permisos

| Rol | Acceso |
|---|---|
| `VISOR` | Mapa en vivo (solo lectura). |
| `JEFE_TURNO` | Todo lo anterior, más flota, historial, alertas y dashboards. |
| `ADMIN` | Todo lo anterior, más geocercas y administración de usuarios. |

Las rutas se protegen en el cliente con `RequireAuth`, pero la autorización real la valida siempre el Backend.

## Stack

| Área | Herramientas |
|---|---|
| UI | React 19, CSS Modules (con nesting nativo), `lucide-react` |
| Routing | React Router 7 (`createBrowserRouter`, carga diferida de páginas pesadas) |
| Datos | TanStack Query (caché, reintentos e invalidación), `fetch` con renovación de token |
| Tiempo real | `socket.io-client` |
| Mapas | MapLibre GL, Terra Draw (edición de polígonos), Turf (cálculos geoespaciales) |
| Autenticación | MSAL (`@azure/msal-browser`) para Microsoft Entra ID |
| Interacción | `dnd-kit` (drag & drop en el panel de geocercas) |
| Calidad | ESLint, Vitest |
| Build y servidor | Vite 8, nginx (imagen Docker) |

## Primeros pasos

### Requisitos

- Node.js 24
- pnpm
- Una instancia del Backend de GeoPlanta corriendo (local o remota)

### Instalación

```bash
pnpm install
# crear un archivo .env con las variables de abajo
pnpm dev
```

La app queda disponible en `http://localhost:5173`.

### Variables de entorno

| Variable | Requerida | Descripción |
|---|---|---|
| `VITE_API_URL` | Sí | URL base del Backend (REST y Socket.IO). |
| `VITE_AZURE_CLIENT_ID` | No | Client ID de la app registrada en Entra ID. Sin ella, el botón de Microsoft no aparece y solo se usa usuario y contraseña. |

> Las variables `VITE_*` quedan incrustadas en el bundle y son públicas: nunca pongas secretos en ellas.

## Scripts

| Comando | Descripción |
|---|---|
| `pnpm dev` | Servidor de desarrollo con HMR. |
| `pnpm build` | Build de producción en `dist/`. |
| `pnpm preview` | Sirve el build localmente. |
| `pnpm lint` | ESLint sobre todo el proyecto. |
| `pnpm test` | Tests unitarios con Vitest. |
| `pnpm test:watch` | Tests en modo watch. |

Antes de abrir un PR: `pnpm lint`, `pnpm test` y `pnpm build`.

## Estructura del proyecto

```
src/
├── main.jsx            # Punto de entrada: RouterProvider + QueryClientProvider
├── router.jsx          # Todas las rutas, guards por rol y carga diferida
├── index.css           # Estilos globales y design tokens (variables CSS, tema claro/oscuro)
├── pages/              # Una carpeta por página: Mapa, Flota, Historial, Alertas, Dashboards, Admin…
├── components/         # Componentes reutilizables: MainLayout, MapaPlanta, Skeleton, diálogos…
├── hooks/              # Consultas de TanStack Query, alertas en vivo, tema
└── services/           # Acceso al API, sesión, sockets, auth y lógica de cada módulo (+ tests)
nginx/                  # Configuración de nginx para producción (SPA + headers de seguridad)
public/                 # Íconos y logo
```

Cada componente o página vive en su propia carpeta con su JSX y su hoja de estilos al lado:

```
components/FlotaPanel/
├── FlotaPanel.jsx
└── FlotaPanel.module.css
```

## Convenciones

- **Estilos:** solo CSS Modules. Nada de estilos inline ni CSS-in-JS. Las clases van en camelCase, hay una clase raíz
  por archivo y se anida como máximo 3 niveles.
- **Design tokens:** colores, fuentes y sombras salen siempre de variables en `src/index.css`. Así el modo oscuro se
  resuelve cambiando tokens, sin tocar los componentes.
- **Routing:** todas las rutas en `src/router.jsx`. La navegación interna usa `Link`/`NavLink`, nunca `<a href>`.
- **Datos:** las llamadas al API van en `src/services/`, y los componentes las consumen a través de los hooks de
  `src/hooks/consultas.js`.
- **Idioma:** la interfaz y el código del dominio están en español; los términos técnicos se mantienen en inglés.

## Despliegue

La imagen de producción es un nginx que sirve el contenido de `dist/` (ver `Dockerfile`). El pipeline de CI corre
lint, tests y build en cada PR, y al integrar en la rama principal publica la imagen y la despliega automáticamente.

```bash
pnpm build
docker build -t geoplanta-web .
docker run -p 8080:80 geoplanta-web
```

nginx envía una **Content-Security-Policy** (`nginx/seguridad.conf`) que lista los únicos orígenes con los que la web
puede conectarse: Backend, Metabase, imagen satelital de Esri y Microsoft. Si cambia la URL de alguno, hay que
actualizarla ahí. El script inline de `index.html` se autoriza por su hash, y `nginx/csp.test.js` falla si se edita
sin actualizarlo.
