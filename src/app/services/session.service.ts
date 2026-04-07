import { Injectable } from '@angular/core';
import { AuthMeResponse, ProfesionalInfo } from '../shared/models/auth.models';
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
