import { RolUsuario } from './rol.model';
import { PermisosRecepcionista } from './permisos.model';

/**
 * DTO que se envía al backend al registrar un usuario.
 * Compatible con el formulario de registro actual de Agendify.
 */
export interface UsuarioRegistroDto {
  nombre:      string;
  apellido:    string;
  email:       string;
  usuario:     string;
  contrasena:  string;
  fecha_nacimiento: string;
  domicilio:   string;
  numero_telefono: string;
  activo:      boolean;
  idRol:       RolUsuario;

  // Solo PROFESIONAL
  especialidad?: string;

  // Solo RECEPCIONISTA
  codigoVinculacionIngresado?: string;
  profesionalId?: number;
  permisos?: PermisosRecepcionista;
}

/**
 * Representación interna completa de un usuario (mock / session).
 * Extiende el DTO con campos que solo existen tras la creación.
 */
export interface UsuarioMock {
  id:          number;
  nombre:      string;
  apellido:    string;
  email:       string;
  usuario:     string;
  fecha_nacimiento: string;
  domicilio:   string;
  numero_telefono: string;
  activo:      boolean;
  idRol:       RolUsuario;

  // Solo PROFESIONAL
  especialidad?: string;
  codigoVinculacion?: string;

  // Solo RECEPCIONISTA
  profesionalId?: number;
  permisos?: PermisosRecepcionista;
}
