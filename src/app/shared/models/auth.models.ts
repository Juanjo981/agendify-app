/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Auth models
 * ─────────────────────────────────────────────────────────────────────────────
 *  Contratos de la API de autenticación y registro.
 *  Los nombres de campo respetan exactamente los del backend (snake_case).
 */

// ── Login ─────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  usuario:    string;
  contrasena: string;
}

/** Usuario que devuelve el backend en el login response */
export interface LoginUsuario {
  id_usuario: number;
  id_rol:     number;
  nombre:     string;
  apellido:   string;
  email:      string;
  username:   string;
  activo:     boolean;
  bloqueado:  boolean;
}

export interface LoginResponse {
  access_token:  string;
  refresh_token: string;
  usuario:       LoginUsuario;
}

// ── /auth/me ──────────────────────────────────────────────────────────────────

/** Datos del profesional embebidos en la respuesta de /auth/me */
export interface ProfesionalInfo {
  id_profesional:   number;
  especialidad:     string;
  nombre_consulta:  string;
  codigo_vinculacion: string;
}

/**
 * Respuesta completa de GET /api/auth/me (AuthMeResponseDto).
 * Incluye datos del usuario, extensión profesional (si aplica) y permisos (si recepcionista).
 */
export interface AuthMeResponse {
  id_usuario:       number;
  username:         string;
  nombre:           string;
  apellido:         string;
  email:            string;
  id_rol:           number;
  nombre_rol:       string;
  activo:           boolean;
  fecha_nacimiento: string;
  domicilio:        string;
  numero_telefono:  string;
  profesional:      ProfesionalInfo | null;
  permisos:         Record<string, boolean> | null;
}

// ── Refresh token ─────────────────────────────────────────────────────────────

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface RefreshTokenResponse {
  access_token:  string;
  refresh_token: string;
}

// ── Logout ────────────────────────────────────────────────────────────────────

export interface LogoutRequest {
  refresh_token: string;
}

// ── Registro ──────────────────────────────────────────────────────────────────

/**
 * id_rol que espera el endpoint POST /api/usuarios/registro.
 * Valores alineados con el catálogo real del backend (GET /api/roles).
 */
export const ROL_REGISTRO = {
  ADMIN:         1,
  PROFESIONAL:   2,
  RECEPCIONISTA: 3,
} as const;

export type RolRegistroId = (typeof ROL_REGISTRO)[keyof typeof ROL_REGISTRO];

/** Payload exacto que espera POST /api/usuarios/registro */
export interface RegisterRequest {
  nombre:             string;
  apellido:           string;
  email:              string;
  username:           string;
  contrasena:         string;
  fecha_nacimiento:   string;
  domicilio:          string;
  numero_telefono:    string;
  id_rol:             RolRegistroId;
  especialidad:       string | null;
  codigo_beta:        string | null;
  codigo_vinculacion: string | null;
  alias_interno:      string | null;
  puesto:             string | null;
}

/** Respuesta del backend tras un registro exitoso */
export interface RegisterResponse {
  id_usuario:       number;
  id_rol:           number;
  nombre_rol:       string;
  nombre:           string;
  apellido:         string;
  email:            string;
  username:         string;
  fecha_nacimiento: string;
  domicilio:        string;
  numero_telefono:  string;
  activo:           boolean;
  bloqueado:        boolean;
  especialidad:     string | null;
  alias_interno:    string | null;
  puesto:           string | null;
  created_at:       string;
  updated_at:       string;
}

/**
 * Standard error response body returned by the backend API
 */
export interface ApiErrorResponse {
  timestamp?: string;
  status:     number;
  error?:     string;
  code?:      string;
  message?:   string;
  path?:      string;
  details?:   string[];
}
