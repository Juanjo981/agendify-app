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

/** Usuario reducido que devuelve el backend en el login y en /auth/me */
export interface Usuario {
  id_usuario: number;
  username:   string;
}

export interface LoginResponse {
  access_token:  string;
  refresh_token: string;
  usuario:       Usuario;
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
 * IMPORTANTE: estos valores son DISTINTOS del enum RolUsuario usado en
 * la capa de permisos internos de la app (que tiene otros valores numéricos).
 */
export const ROL_REGISTRO = {
  PROFESIONAL:   1,
  RECEPCIONISTA: 2,
  ADMIN:         3,
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
