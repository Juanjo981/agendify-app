import { Injectable } from '@angular/core';
import { AuthMeResponse, ProfesionalInfo } from '../shared/models/auth.models';
import { MiPerfilResponse } from '../shared/models/perfil.models';
import { RolUsuario } from '../shared/models/rol.model';
import { PermisosRecepcionista } from '../shared/models/permisos.model';
import { Permiso } from '../auth/permission.types';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  SessionService
 * ─────────────────────────────────────────────────────────────────────────────
 *  Single source of truth for the current user's identity and permissions.
 *
 *  Populated from the `/api/auth/me` response after login or session restore.
 *  Consumed by AuthorizationService, guards, and components.
 *
 *  Replaces the previous temporary session implementation and is now the
 *  only session source used by active application flows.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Maps backend permission keys (snake_case) to frontend Permiso enum values.
 * The backend /auth/me returns permisos as: { "agenda": true, "citas": true, "notas_clinicas": false, ... }
 */
const BACKEND_KEY_TO_PERMISO: Record<string, Permiso> = {
  agenda:         Permiso.AGENDA,
  citas:          Permiso.CITAS,
  pacientes:      Permiso.PACIENTES,
  notas_clinicas: Permiso.NOTAS_CLINICAS,
  configuracion:  Permiso.CONFIGURACION,
};

@Injectable({ providedIn: 'root' })
export class SessionService {

  private _user: AuthMeResponse | null = null;
  private _permisos: PermisosRecepcionista | null = null;

  // ─── Population ──────────────────────────────────────────────────────────────

  /**
   * Populate session from an AuthMeResponse (from /auth/me or login flow).
   */
  setUser(user: AuthMeResponse): void {
    this._user = user;
    this._permisos = this.mapPermisosFromBackend(user.permisos);
  }

  /**
   * Clear all session state. Called on logout or session invalidation.
   */
  clearSession(): void {
    this._user = null;
    this._permisos = null;
  }

  /** Whether a user is currently loaded in the session. */
  isSessionLoaded(): boolean {
    return this._user !== null;
  }

  // ─── Identity queries ────────────────────────────────────────────────────────

  getUser(): AuthMeResponse | null {
    return this._user;
  }

  getRol(): RolUsuario | null {
    return this._user?.id_rol as RolUsuario ?? null;
  }

  esProfesional(): boolean {
    return this._user?.id_rol === RolUsuario.PROFESIONAL;
  }

  esRecepcionista(): boolean {
    return this._user?.id_rol === RolUsuario.RECEPCIONISTA;
  }

  esAdmin(): boolean {
    return this._user?.id_rol === RolUsuario.ADMIN;
  }

  getNombreCompleto(): string {
    if (!this._user) return '';
    return `${this._user.nombre} ${this._user.apellido}`.trim();
  }

  getNombre(): string {
    return this._user?.nombre ?? '';
  }

  getUsername(): string {
    return this._user?.username ?? '';
  }

  getEmail(): string {
    return this._user?.email ?? '';
  }

  getProfesional(): ProfesionalInfo | null {
    return this._user?.profesional ?? null;
  }

  /**
   * Actualiza en memoria nombre/email/especialidad tras PUT /usuarios/me,
   * sin esperar a un GET /auth/me (evita menú desincronizado).
   */
  patchFromMiPerfil(perfil: MiPerfilResponse): void {
    if (!this._user) return;

    const [nombre, apellido] = this.splitFullName(perfil.nombreCompleto ?? '');
    const profesional = this._user.profesional
      ? {
          ...this._user.profesional,
          especialidad: perfil.especialidad || this._user.profesional.especialidad,
          nombre_consulta: perfil.nombreConsultorio || this._user.profesional.nombre_consulta,
        }
      : this._user.profesional;

    this._user = {
      ...this._user,
      nombre: nombre || this._user.nombre,
      apellido: apellido || this._user.apellido,
      email: perfil.correoElectronico || this._user.email,
      username: perfil.usuario || this._user.username,
      domicilio: perfil.domicilio ?? this._user.domicilio,
      numero_telefono: perfil.telefono ?? this._user.numero_telefono,
      profesional,
    };
  }

  // ─── Permission queries ──────────────────────────────────────────────────────

  /**
   * Returns the parsed PermisosRecepcionista, or null if the user
   * is not a recepcionista or permisos haven't been loaded.
   */
  getPermisos(): PermisosRecepcionista | null {
    return this._permisos;
  }

  /**
   * Check a specific permission by Permiso enum key.
   * PROFESIONAL/ADMIN always return true.
   */
  hasPermission(permiso: Permiso): boolean {
    if (!this._user) return false;
    if (this.esProfesional() || this.esAdmin()) return true;
    return this._permisos?.[permiso] ?? false;
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private splitFullName(fullName: string): [string, string] {
    const normalized = fullName.trim().replace(/\s+/g, ' ');
    if (!normalized) return ['', ''];
    const parts = normalized.split(' ');
    const nombre = parts.shift() ?? '';
    return [nombre, parts.join(' ')];
  }

  /**
   * Maps backend permission keys to the PermisosRecepcionista interface.
   * Returns null if permisos is null/empty (i.e., professional/admin user).
   */
  private mapPermisosFromBackend(permisos: Record<string, boolean> | null): PermisosRecepcionista | null {
    if (!permisos || Object.keys(permisos).length === 0) return null;

    return {
      agenda:        permisos['agenda'] ?? false,
      citas:         permisos['citas'] ?? false,
      pacientes:     permisos['pacientes'] ?? false,
      notasClinicas: permisos['notas_clinicas'] ?? false,
      configuracion: permisos['configuracion'] ?? false,
    };
  }
}
