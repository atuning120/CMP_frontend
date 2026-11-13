import { CircleHelp, Eye, Map as IconoMapa, MapPin, PanelLeftClose, Palette, Route, Search, SlidersHorizontal, Truck } from 'lucide-react'

/**
 * Recorrido guiado del primer ingreso, uno por rol del panel web (un OPERADOR entra a la web como VISOR).
 * id: '<canal>.<rol>.v<n>'. El Backend guarda los ids vistos: al cambiar a fondo un recorrido se sube la versión
 * (v2) y se vuelve a ofrecer a todos.
 * Cada paso apunta a un elemento con data-recorrido="<objetivo>"; si no está en pantalla (p. ej. la flota vacía),
 * el paso se salta. lado: dónde se prefiere la tarjeta respecto del elemento. pantalla: media query en que el
 * paso aplica (sin ella, en todas).
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

const RECORRIDOS = { VISOR }

// Pasos que aplican al ancho de pantalla actual
export const pasosDePantalla = (pasos) => pasos.filter((p) => !p.pantalla || matchMedia(p.pantalla).matches)

// Recorrido del rol de la sesión, o null si ese rol todavía no tiene uno
export const recorridoDelRol = (rol) => RECORRIDOS[rol] ?? null
