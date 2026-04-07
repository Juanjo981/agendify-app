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
}

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

export interface ProfesionalPerfilDto {
  id_profesional?: number | null;
  especialidad?: string | null;
  nombre_consulta?: string | null;
  tipo_servicio?: string | null;
  descripcion?: string | null;
  codigo_vinculacion?: string | null;
  telefono_consultorio?: string | null;
  direccion_consultorio?: string | null;
}

export interface ProfesionalPerfilUpdateRequest {
  especialidad: string;
  nombre_consulta: string;
  tipo_servicio?: string | null;
  descripcion?: string | null;
}

export interface ChangePasswordRequest {
  password_actual: string;
  password_nueva: string;
}
