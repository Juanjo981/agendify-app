import { Injectable } from '@angular/core';
import { RolUsuario } from '../shared/models/rol.model';
import { UsuarioMock } from '../shared/models/usuario.model';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  SessionMockService
 * ─────────────────────────────────────────────────────────────────────────────
 *  Responsabilidad única: saber quién es el usuario actualmente "logueado"
 *  y qué permisos tiene.
 *
 *  FASE MOCK:
 *    El usuario activo se establece en `_currentUser` a través de
 *    `setCurrentUser()`, que es llamado desde el flujo de login o registro
 *    mock.  Por defecto se precarga con un PROFESIONAL para que la app
 *    funcione sin login previo durante el desarrollo.
 *
 *  FASE REAL:
 *    Reemplazar el cuerpo de `getCurrentUser()` por una lectura del token
 *    JWT / estado de auth (AuthService / store).  El resto de la app no
 *    necesita cambios porque consume solo los métodos públicos.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Usuario por defecto mientras no haya login real (simula PROFESIONAL logueado) */
const DEFAULT_USER: UsuarioMock = {
  id:               1,
  nombre:           'Juan José',
  apellido:         'García',
  email:            'juan@agendify.com',
  usuario:          'juangarcia',
  fecha_nacimiento: '1985-04-12',
  domicilio:        'Calle Mayor 10, Madrid',
  numero_telefono:  '612345678',
  activo:           true,
  idRol:            RolUsuario.PROFESIONAL,
  especialidad:     'Psicología',
  codigoVinculacion: 'AGD-4F7K2Q',
};

@Injectable({ providedIn: 'root' })
export class SessionMockService {

  private _currentUser: UsuarioMock = { ...DEFAULT_USER };

  // ─── Lectura ─────────────────────────────────────────────────────────────────

  getCurrentUser(): UsuarioMock {
    return this._currentUser;
  }

  getRol(): RolUsuario {
    return this._currentUser.idRol;
  }

  esProfesional(): boolean {
    return this._currentUser.idRol === RolUsuario.PROFESIONAL;
  }

  esRecepcionista(): boolean {
    return this._currentUser.idRol === RolUsuario.RECEPCIONISTA;
  }

  getNombre(): string {
    return this._currentUser.nombre;
  }

  // ─── Mutación (llamado desde login/registro mock) ────────────────────────────

  setCurrentUser(user: UsuarioMock): void {
    this._currentUser = { ...user };
  }

  clearSession(): void {
    this._currentUser = { ...DEFAULT_USER };
  }
}
