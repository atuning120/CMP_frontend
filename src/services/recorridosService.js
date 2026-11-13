import { apiJson } from './api.js'

// Recorridos guiados que el usuario de la sesión ya hizo u omitió: { vistos: ['web.visor.v1', …] }. Vacío = primer ingreso
export const obtenerRecorridosVistos = () => apiJson('/perfil/recorridos')

// Terminó u omitió el recorrido: no se le vuelve a ofrecer solo (puede repetirlo desde el botón de ayuda). Idempotente
export const marcarRecorridoVisto = (id) => apiJson(`/perfil/recorridos/${encodeURIComponent(id)}`, { method: 'PUT' })
