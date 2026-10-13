import { apiJson } from './api.js'

// Áreas y zonas activas con su polígono GeoJSON (null si aún no tienen)
export const obtenerMapa = () => apiJson('/geocercas/mapa')

const enviar = (method, path, body) =>
  apiJson(path, { method, body: body === undefined ? undefined : JSON.stringify(body) })

// Solo ADMIN. datos: { nombre, descripcion, poligono } (en edición, solo lo que cambia)
export const crearArea = (datos) => enviar('POST', '/geocercas/areas', datos)
export const editarArea = (idArea, cambios) => enviar('PATCH', `/geocercas/areas/${idArea}`, cambios)
export const desactivarArea = (idArea) => enviar('DELETE', `/geocercas/areas/${idArea}`)
export const crearZona = (idArea, datos) => enviar('POST', `/geocercas/areas/${idArea}/zonas`, datos)
export const editarZona = (idZona, cambios) => enviar('PATCH', `/geocercas/zonas/${idZona}`, cambios)
export const desactivarZona = (idZona) => enviar('DELETE', `/geocercas/zonas/${idZona}`)
