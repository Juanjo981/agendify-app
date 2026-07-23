export interface UsuarioPerfilDto {
  id_usuario: number;
  nombre: string;
  apellido: string;
  email: string;
  username: string;
  domicilio?: string | null;
  numero_telefono?: string | null;
  fecha_nacimiento?: string | null;
  id_rol?: number | null;
  activo?: boolean | null;
  bloqueado?: boolean | null;
  /** Opcional: puede venir en GET /usuarios/me cuando el backend lo expone. */
  especialidad?: string | null;
  cedulaProfesional?: string | null;
}

/** @deprecated Preferir ActualizarMiPerfilRequest para PUT /usuarios/me */
export interface UsuarioPerfilUpdateRequest {
  nombre: string;
  apellido: string;
  email: string;
  username: string;
  domicilio: string;
  numero_telefono: string;
  fecha_nacimiento?: string | null;
  id_rol?: number | null;
  activo?: boolean | null;
  bloqueado?: boolean | null;
}

/**
 * Payload explícito para PUT /api/usuarios/me.
 * No incluye idUsuario ni campos administrativos.
 * '' limpia el campo; el contrato no usa undefined para “omitir” en este flujo.
 */
export interface ActualizarMiPerfilRequest {
  nombreCompleto?: string;
  correoElectronico?: string;
  usuario?: string;
  telefono?: string;
  domicilio?: string;
  especialidad?: string;
  cedulaProfesional?: string;
  nombreConsultorio?: string;
  telefonoConsultorio?: string;
  direccionConsultorio?: string;
  descripcionProfesional?: string;
}

/**
 * Respuesta normalizada de GET/PUT /api/usuarios/me
 * (datos combinados de Usuario + Profesional).
 */
export interface MiPerfilResponse {
  idUsuario?: number;
  nombreCompleto: string;
  correoElectronico: string;
  usuario: string;
  telefono?: string;
  domicilio?: string;
  especialidad?: string;
  cedulaProfesional?: string;
  nombreConsultorio?: string;
  telefonoConsultorio?: string;
  direccionConsultorio?: string;
  descripcionProfesional?: string;
}

export interface ProfesionalPerfilDto {
  id_profesional?: number | null;
  especialidad?: string | null;
  /** Cédula profesional (texto). Preparado para recetas/PDF. */
  cedula_profesional?: string | null;
  nombre_consulta?: string | null;
  tipo_servicio?: string | null;
  descripcion?: string | null;
  codigo_vinculacion?: string | null;
  telefono_consultorio?: string | null;
  direccion_consultorio?: string | null;
}

export interface ProfesionalPerfilUpdateRequest {
  especialidad: string;
  /** Cédula profesional opcional; preparada para recetas/PDF. */
  cedula_profesional?: string | null;
  nombre_consulta: string;
  tipo_servicio?: string | null;
  descripcion?: string | null;
}

export interface ChangePasswordRequest {
  password_actual: string;
  password_nueva: string;
}
