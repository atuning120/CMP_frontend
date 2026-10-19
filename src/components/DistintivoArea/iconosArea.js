import { createElement } from 'react'
import { Building2, Droplets, Factory, Fuel, Layers, Mountain, Pickaxe, ShieldCheck, Truck, Warehouse, Wrench, Zap } from 'lucide-react'

// Catálogo de íconos que un ADMIN puede asignar a un área. El Backend guarda solo la clave,
// así que una clave desconocida (o vacía) se muestra con el ícono genérico
export const ICONOS_AREA = [
  { clave: 'capas', nombre: 'Genérica', Icono: Layers },
  { clave: 'planta', nombre: 'Planta', Icono: Factory },
  { clave: 'mina', nombre: 'Mina', Icono: Pickaxe },
  { clave: 'acopio', nombre: 'Acopio o botadero', Icono: Mountain },
  { clave: 'taller', nombre: 'Taller', Icono: Wrench },
  { clave: 'combustible', nombre: 'Combustible', Icono: Fuel },
  { clave: 'transporte', nombre: 'Transporte', Icono: Truck },
  { clave: 'bodega', nombre: 'Bodega', Icono: Warehouse },
  { clave: 'control', nombre: 'Control o garita', Icono: ShieldCheck },
  { clave: 'oficina', nombre: 'Oficinas', Icono: Building2 },
  { clave: 'agua', nombre: 'Agua', Icono: Droplets },
  { clave: 'energia', nombre: 'Energía', Icono: Zap },
]

// Devuelve el elemento ya creado (no el componente) para no definir componentes durante el render
export const iconoArea = (clave, props) =>
  createElement((ICONOS_AREA.find((i) => i.clave === clave) ?? ICONOS_AREA[0]).Icono, props)
