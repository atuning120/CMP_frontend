import { apiJson } from './api.js'

// Solo ADMIN. Todos los usuarios (activos o no) con su rol y forma de ingreso
export const listarUsuarios = () => apiJson('/usuarios')

// Roles que un administrador puede asignar desde el panel web
export const ROLES_ASIGNABLES = ['VISOR', 'JEFE_TURNO', 'ADMIN']

export const ETIQUETA_ROL = {
  VISOR: 'Visor',
  JEFE_TURNO: 'Jefe de turno',
  ADMIN: 'Administrador',
  OPERADOR: 'Operador',
}

// Devuelve el usuario actualizado. El nuevo rol rige desde su próximo inicio de sesión
export const cambiarRol = (idUsuario, rol) =>
  apiJson(`/usuarios/${idUsuario}/rol`, { method: 'PATCH', body: JSON.stringify({ rol }) })
