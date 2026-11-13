import {
  ArrowLeftRight,
  BarChart3,
  Bell,
  CircleHelp,
  Eye,
  FileSpreadsheet,
  History,
  Map as IconoMapa,
  MapPin,
  PanelLeftClose,
  Palette,
  Plus,
  Route,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Truck,
} from 'lucide-react'

/**
 * Recorrido guiado del primer ingreso, uno por rol del panel web (un OPERADOR entra a la web como VISOR).
 * id: '<canal>.<rol>.v<n>'. El Backend guarda los ids vistos: al cambiar a fondo un recorrido se sube la versión
 * (v2) y se vuelve a ofrecer a todos.
 * Cada paso apunta a un elemento con data-recorrido="<objetivo>"; si no está en pantalla (p. ej. la flota vacía),
 * el paso se salta. lado: dónde se prefiere la tarjeta respecto del elemento. pantalla: media query en que el
 * paso aplica (sin ella, en todas). ruta: página del paso (sin ella, la del recorrido); el recorrido navega solo.
 * seccion: nombre de la sección del panel, que la tarjeta muestra junto al número de paso (recorridos de varias páginas).
 */
const VISOR = {
  id: 'web.visor.v1',
  ruta: '/mapa',
  perfil: 'Visor · solo lectura',
  titulo: 'Te damos la bienvenida a GeoPlanta',
  resumen:
    'Sigue en tiempo real la flota de la planta Mina Los Colorados: dónde está cada equipo, quién lo opera y en qué estado está.',
  aprenderas: [
    { icono: MapPin, texto: 'Ubicar cada equipo en el mapa satelital en vivo' },
    { icono: Palette, texto: 'Leer su estado operacional por el color' },
    { icono: Route, texto: 'Revisar el trayecto del turno o del día' },
  ],
  duracion: '1 minuto',
  pasos: [
    {
      objetivo: 'mapa',
      lado: 'izquierda',
      icono: IconoMapa,
      titulo: 'El mapa de la planta, en vivo',
      texto:
        'Cada punto es un equipo. Su posición GPS se actualiza sola y el color indica el estado operacional de su turno. Acerca, aleja o arrastra para recorrer la planta.',
    },
    {
      objetivo: 'flota-busqueda',
      lado: 'derecha',
      icono: Search,
      titulo: 'Encuentra un equipo',
      texto: 'Escribe un código, una zona de trabajo o el nombre del operador y la lista se filtra al instante.',
    },
    {
      objetivo: 'flota-filtros',
      lado: 'derecha',
      icono: SlidersHorizontal,
      titulo: 'Filtra la flota',
      texto: 'Mira todos los equipos o solo los que están operando. El número indica cuántos hay en cada grupo.',
    },
    {
      objetivo: 'flota-equipo',
      lado: 'derecha',
      icono: Truck,
      titulo: 'La ficha de cada equipo',
      texto:
        'Estado, ubicación, operador y horómetro de un vistazo. Haz clic en un equipo para centrarlo en el mapa: su ficha te deja ver el trayecto del turno o de hoy.',
    },
    {
      objetivo: 'flota-leyenda',
      lado: 'derecha',
      icono: Palette,
      titulo: 'Qué significa cada color',
      texto:
        'Verde: productivo. Ámbar: demora. Rojo: mantención o falla. Gris: turno recién iniciado, aún sin estado. Los polígonos marcan áreas y zonas de trabajo.',
    },
    {
      objetivo: 'panel-alternar',
      lado: 'derecha',
      // Bajo 900 px el panel va bajo el mapa y no se contrae (Mapa.module.css)
      pantalla: '(min-width: 901px)',
      icono: PanelLeftClose,
      titulo: 'Más espacio para el mapa',
      texto: 'Contrae el panel lateral cuando quieras ver el mapa completo. Los totales de la flota siguen a la vista.',
    },
    {
      objetivo: 'solo-lectura',
      lado: 'abajo',
      icono: Eye,
      titulo: 'Tu cuenta es de solo lectura',
      texto:
        'Puedes consultar todo lo que ves. Los cambios en la flota, los turnos y las geocercas los hacen los jefes de turno y los administradores.',
    },
    {
      objetivo: 'ayuda',
      lado: 'abajo',
      icono: CircleHelp,
      titulo: 'Repasa cuando quieras',
      texto: 'Este botón vuelve a abrir el recorrido. Ya estás listo para seguir la operación de la planta.',
    },
  ],
}

// Pasos de una sección del panel: todos llevan su página y su nombre (se muestra en la tarjeta)
const seccion = (nombre, ruta, pasos) => pasos.map((p) => ({ seccion: nombre, ruta, ...p }))

// Jefe de turno: recorre las secciones en el orden del menú. Cada sección empieza en su pestaña: el foco se posa en
// ella mientras la página cambia debajo, para que quede claro dónde está cada una
const JEFE_TURNO = {
  id: 'web.jefe-turno.v1',
  ruta: '/mapa',
  perfil: 'Jefe de turno',
  titulo: 'Te damos la bienvenida a GeoPlanta',
  resumen:
    'Supervisa en tiempo real la operación de la planta Mina Los Colorados: la flota en el mapa, las alertas de turno, el historial y los indicadores del mes.',
  aprenderas: [
    { icono: MapPin, texto: 'Seguir la flota en vivo y detectar alertas en el mapa' },
    { icono: Truck, texto: 'Gestionar máquinas: incorporar, editar y reemplazar' },
    { icono: ShieldAlert, texto: 'Atender alertas y revisar el historial de turnos' },
  ],
  duracion: '3 minutos',
  pasos: [
    ...seccion('Mapa', '/mapa', [
      {
        objetivo: 'mapa',
        lado: 'izquierda',
        icono: IconoMapa,
        titulo: 'La planta, en vivo',
        texto:
          'Cada punto es un equipo con su posición GPS en tiempo real, y su color indica el estado operacional del turno. Un halo ámbar marca a un operador con más de 10 h de turno.',
      },
      {
        objetivo: 'flota-filtros',
        lado: 'derecha',
        icono: SlidersHorizontal,
        titulo: 'Encuentra lo urgente',
        texto: 'Filtra la flota por equipos operando o con alerta. El número de cada filtro se actualiza solo.',
      },
      {
        objetivo: 'flota-equipo',
        lado: 'derecha',
        icono: Route,
        titulo: 'Ficha y trayecto de cada equipo',
        texto:
          'Haz clic en un equipo para centrarlo en el mapa. Desde su ficha puedes dibujar el trayecto del turno o del día completo.',
      },
    ]),
    ...seccion('Dashboards', '/dashboards', [
      {
        objetivo: 'nav-dashboards',
        lado: 'abajo',
        icono: BarChart3,
        titulo: 'Indicadores del turno y del mes',
        texto: 'En Dashboards ves la operación de la planta en gráficos, armados con lo que registran los operadores en la app.',
      },
      {
        objetivo: 'dashboards-vistas',
        lado: 'abajo',
        icono: FileSpreadsheet,
        titulo: 'Operación y estado de pago',
        texto:
          'Operación resume lo registrado en la app. Estado de pago lo compara con el Excel mensual del contratista, que subes desde esa misma vista.',
      },
    ]),
    ...seccion('Flota', '/flota', [
      {
        objetivo: 'nav-flota',
        lado: 'abajo',
        icono: Truck,
        titulo: 'Administra las máquinas',
        texto: 'En Flota mantienes al día las máquinas de la planta: altas, estado, operador asignado y reemplazos.',
      },
      {
        objetivo: 'gestion-incorporar',
        lado: 'abajo',
        icono: Plus,
        titulo: 'Incorpora máquinas',
        texto: 'Registra una máquina nueva en la flota con su ficha, su estado y el operador asignado.',
      },
      {
        objetivo: 'gestion-acciones',
        lado: 'abajo',
        icono: ArrowLeftRight,
        titulo: 'Edita, reemplaza y devuelve',
        texto:
          'Editar cambia la ficha, el operador o el estado. Si una máquina entra a mantención, Reemplazar asigna otra que cubre su lugar, y Devolver la reincorpora cuando vuelve a operar.',
      },
    ]),
    ...seccion('Historial', '/historial', [
      {
        objetivo: 'nav-historial',
        lado: 'abajo',
        icono: History,
        titulo: 'El registro de la planta',
        texto: 'En Historial queda todo lo que pasa en la planta, del evento más reciente al más antiguo.',
      },
      {
        objetivo: 'historial-busqueda',
        lado: 'abajo',
        icono: Search,
        titulo: 'Todo lo que pasó, en un solo lugar',
        texto:
          'Inicios y cierres de turno, cambios de zona, novedades con fotos y acciones sobre la flota. Busca por operador, máquina, área o motivo, y filtra por tipo y fechas.',
      },
      {
        objetivo: 'historial-excel',
        lado: 'abajo',
        icono: FileSpreadsheet,
        titulo: 'Exporta a Excel',
        texto: 'Descarga el historial del tipo y el rango de fechas elegidos para tus reportes.',
      },
    ]),
    ...seccion('Alertas', '/alertas', [
      {
        objetivo: 'nav-alertas',
        lado: 'abajo',
        icono: ShieldAlert,
        titulo: 'Lo que requiere tu atención',
        texto: 'En Alertas están las situaciones del turno que debes revisar. El número sobre la pestaña indica cuántas siguen activas.',
      },
      {
        objetivo: 'alertas-filtros',
        lado: 'abajo',
        icono: SlidersHorizontal,
        titulo: 'Alertas de turno',
        texto:
          'Turnos y jornadas de más de 10 h, cierres automáticos y equipos detenidos por mantención. Llegan en tiempo real y, al atenderlas, queda registrado quién, cuándo y con qué comentario.',
      },
      {
        objetivo: 'avisos',
        lado: 'abajo',
        icono: Bell,
        titulo: 'Avisos aunque estés en otra pestaña',
        texto:
          'Activa el sonido y la notificación del navegador para enterarte de una alerta nueva aunque el panel no esté a la vista.',
      },
    ]),
    {
      ruta: '/alertas',
      objetivo: 'ayuda',
      lado: 'abajo',
      icono: CircleHelp,
      titulo: 'Repasa cuando quieras',
      texto: 'Este botón vuelve a abrir el recorrido. Ya estás listo para supervisar la operación de la planta.',
    },
  ],
}

const RECORRIDOS = { VISOR, JEFE_TURNO }

// Pasos del recorrido que aplican al ancho de pantalla actual, cada uno con su página
export const pasosDePantalla = (recorrido) =>
  recorrido.pasos
    .filter((p) => !p.pantalla || matchMedia(p.pantalla).matches)
    .map((p) => ({ ...p, ruta: p.ruta ?? recorrido.ruta }))

// Recorrido del rol de la sesión, o null si ese rol todavía no tiene uno
export const recorridoDelRol = (rol) => RECORRIDOS[rol] ?? null
