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

// Además de los roles web, el administrador da de alta a los operadores de la app móvil
export const ROLES_CREABLES = [...ROLES_ASIGNABLES, 'OPERADOR']

/**
 * Crea un usuario y devuelve cómo queda en la lista. datos: { nombre, apellido, email, rol, accesoMicrosoft, password?, rut?, telefono? }.
 * Con accesoMicrosoft entra solo con Microsoft (sin contraseña); si no, la contraseña es obligatoria. Un OPERADOR exige RUT.
 */
export const crearUsuario = (datos) => apiJson('/usuarios', { method: 'POST', body: JSON.stringify(datos) })

// Activa o desactiva la cuenta (no se borra: su historial se conserva). Devuelve el usuario actualizado
export const cambiarEstadoUsuario = (idUsuario, activo) =>
  apiJson(`/usuarios/${idUsuario}/activo`, { method: 'PATCH', body: JSON.stringify({ activo }) })

/**
 * Edita nombre, correo, ficha del operador y forma de entrar. datos: { email, nombre, apellido?, rut?, telefono?,
 * accesoMicrosoft, password? }. Una contraseña nueva la restablece; cambiar el acceso cierra sus sesiones abiertas.
 */
export const editarUsuario = (idUsuario, datos) =>
  apiJson(`/usuarios/${idUsuario}`, { method: 'PATCH', body: JSON.stringify(datos) })
