import { Injectable } from '@angular/core';
import { SessionService } from '../services/session.service';
import { Permiso, Modulo } from './permission.types';
import { MODULO_PERMISO, SEGMENTO_MODULO, RUTA_MODULO } from './permission.maps';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  AuthorizationService
 * ─────────────────────────────────────────────────────────────────────────────
 *  Single source of truth for WHAT the current user can do.
 *
 *  Separation of concerns:
 *    SessionService       → WHO the user is  (identity / session state)
 *    AuthorizationService → WHAT they can do (policy evaluation)
 *
 *  Public API:
 *    isProfesional()                        → role check
 *    isRecepcionista()                      → role check
 *    hasPermission(Permiso.AGENDA)          → discrete permission gate
 *    canAccessModule(Modulo.CONFIGURACION)  → module-level gate (string or enum)
 *    canAccessRoute('/dashboard/citas')     → full-path gate
 *    canAccessSegmento('pacientes')         → router-segment gate (used by guard)
 *
 *  Usage in components:
 *    constructor(public authSvc: AuthorizationService) {}
 *    authSvc.canAccessModule('citas')
 *
 *  Usage in templates (via structural directive):
 *    *appHasPermission="'citas'"
 * ─────────────────────────────────────────────────────────────────────────────
 */
@Injectable({ providedIn: 'root' })
export class AuthorizationService {

  constructor(private session: SessionService) {}

  // ─── Role queries ────────────────────────────────────────────────────────────

  isProfesional(): boolean {
    return this.session.esProfesional();
  }

  isRecepcionista(): boolean {
    return this.session.esRecepcionista();
  }

  /** Returns the display name of the current user. */
  getNombreUsuario(): string {
    return this.session.getNombreCompleto() || this.session.getUsername();
  }

  // ─── Permission queries ───────────────────────────────────────────────────────

  /**
   * Returns true if the current user holds the given permission.
   * PROFESIONAL/ADMIN always returns true regardless of the permission.
   */
  hasPermission(permiso: Permiso): boolean {
    return this.session.hasPermission(permiso);
  }

  // ─── Module queries ───────────────────────────────────────────────────────────

  /**
   * Returns true if the current user can access the given module.
   * Accepts both enum values and plain strings (template-friendly).
   *
   * Modules not present in MODULO_PERMISO are considered public.
   *
   * @example authSvc.canAccessModule(Modulo.CONFIGURACION)
   * @example authSvc.canAccessModule('configuracion')
   */
  canAccessModule(modulo: Modulo | string): boolean {
    if (this.isProfesional()) return true;
    const permiso = MODULO_PERMISO[modulo as Modulo];
    if (permiso === undefined) return true;     // module is public
    return this.hasPermission(permiso);
  }

  // ─── Route queries ────────────────────────────────────────────────────────────

  /**
   * Returns true if the current user can access the given full URL path.
   * Routes not present in RUTA_MODULO are considered public.
   *
   * @example authSvc.canAccessRoute('/dashboard/citas')
   */
  canAccessRoute(ruta: string): boolean {
    if (this.isProfesional()) return true;
    const modulo = RUTA_MODULO[ruta];
    if (modulo === undefined) return true;      // route is public
    return this.canAccessModule(modulo);
  }

  /**
   * Returns true if the current user can access a route segment as it
   * appears in the Angular router configuration (supports ':id' patterns).
   * Segments not present in SEGMENTO_MODULO are considered public.
   *
   * Used internally by permisosGuard.
   *
   * @example authSvc.canAccessSegmento('pacientes')
   * @example authSvc.canAccessSegmento('citas/:id')
   */
  canAccessSegmento(segmento: string): boolean {
    if (this.isProfesional()) return true;
    const modulo = SEGMENTO_MODULO[segmento];
    if (modulo === undefined) return true;      // segment is public
    return this.canAccessModule(modulo);
  }
}
