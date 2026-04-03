import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { firstValueFrom, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import {
  LoginRequest, LoginResponse, RefreshTokenResponse,
  RegisterRequest, RegisterResponse, Usuario,
} from '../shared/models/auth.models';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  AuthService
 * ─────────────────────────────────────────────────────────────────────────────
 *  Single source of truth para identidad y tokens en Agendify.
 *
 *  Responsabilidades:
 *    - Endpoints de autenticación (/auth/login, /auth/me, /auth/refresh, /auth/logout)
 *    - Persistir y recuperar tokens en localStorage
 *    - Proveer estado de sesión (isAuthenticated)
 *    - Restaurar sesión al iniciar la app
 *
 *  El interceptor authInterceptor lee getAccessToken() para inyectar
 *  Authorization y llama a refreshToken() / forceLogout() ante 401.
 * ─────────────────────────────────────────────────────────────────────────────
 */
@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly baseUrl = environment.apiUrl;

  private static readonly ACCESS_TOKEN_KEY  = 'access_token';
  private static readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private static readonly USER_KEY          = 'usuario';

  constructor(
    private http:   HttpClient,
    private router: Router,
  ) {}

  // ── Core auth ──────────────────────────────────────────────────────────────

  /**
   * Autentica al usuario. Guarda access_token y refresh_token en localStorage.
   */
  login(usuario: string, contrasena: string): Promise<LoginResponse> {
    const payload: LoginRequest = { usuario, contrasena };
    return firstValueFrom(
      this.http.post<LoginResponse>(`${this.baseUrl}/auth/login`, payload)
    ).then((res) => {
      this.saveTokens(res.access_token, res.refresh_token);
      return res;
    });
  }

  /** GET /api/auth/me — el token se inyecta automáticamente por el interceptor. */
  getCurrentUser(): Promise<Usuario> {
    return firstValueFrom(
      this.http.get<Usuario>(`${this.baseUrl}/auth/me`)
    );
  }

  /**
   * Refresca el access_token usando el refresh_token almacenado.
   * Devuelve un Observable para que el interceptor pueda hacer pipe/switchMap.
   * Guarda los nuevos tokens automáticamente si el refresh es exitoso.
   */
  refreshToken(): Observable<RefreshTokenResponse> {
    const refresh_token = this.getRefreshToken();
    if (!refresh_token) {
      return throwError(() => new Error('No refresh token stored'));
    }
    return this.http
      .post<RefreshTokenResponse>(`${this.baseUrl}/auth/refresh`, { refresh_token })
      .pipe(
        tap(res => this.saveTokens(res.access_token, res.refresh_token)),
        catchError(err => {
          // Si el backend rechaza el refresh, limpiamos la sesión inmediatamente
          this.clearSession();
          return throwError(() => err);
        }),
      );
  }

  /**
   * Logout manual: llama al backend con el refresh_token, luego limpia
   * la sesión local y navega a /login independientemente del resultado remoto.
   */
  async logout(): Promise<void> {
    const refresh_token = this.getRefreshToken();
    if (refresh_token) {
      try {
        await firstValueFrom(
          this.http.post(`${this.baseUrl}/auth/logout`, { refresh_token })
        );
      } catch {
        // El backend falló (token ya expirado, red caída, etc.)
        // Seguimos con la limpieza local de todas formas.
      }
    }
    this.clearSession();
    this.router.navigateByUrl('/login');
  }

  /**
   * Logout forzado — llamado por el interceptor cuando el refresh falla.
   * Solo limpia el estado local; la navegación la gestiona el interceptor.
   */
  forceLogout(): void {
    this.clearSession();
  }

  // ── Token management ──────────────────────────────────────────────────────

  saveTokens(access_token: string, refresh_token: string): void {
    localStorage.setItem(AuthService.ACCESS_TOKEN_KEY, access_token);
    localStorage.setItem(AuthService.REFRESH_TOKEN_KEY, refresh_token);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(AuthService.ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(AuthService.REFRESH_TOKEN_KEY);
  }

  // ── User storage ──────────────────────────────────────────────────────────

  saveUser(usuario: Usuario): void {
    localStorage.setItem(AuthService.USER_KEY, JSON.stringify(usuario));
  }

  getStoredUser(): Usuario | null {
    const raw = localStorage.getItem(AuthService.USER_KEY);
    return raw ? (JSON.parse(raw) as Usuario) : null;
  }

  clearSession(): void {
    localStorage.removeItem(AuthService.ACCESS_TOKEN_KEY);
    localStorage.removeItem(AuthService.REFRESH_TOKEN_KEY);
    localStorage.removeItem(AuthService.USER_KEY);
  }

  // ── Session state ─────────────────────────────────────────────────────────

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  /**
   * Restaura la sesión al arrancar la app.
   * Si el access_token expiró, el interceptor intentará refrescarlo
   * transparentemente antes de que esta Promise resuelva.
   * Si todo falla, el interceptor limpia la sesión y navega a /login.
   */
  async restoreSession(): Promise<boolean> {
    if (!this.isAuthenticated()) return false;
    try {
      const user = await this.getCurrentUser();
      this.saveUser(user);
      return true;
    } catch {
      // El interceptor ya limpió la sesión si fue un fallo de refresh.
      // Garantizamos limpieza también aquí.
      this.clearSession();
      return false;
    }
  }

  // ── Legacy helpers (backwards compat) ────────────────────────────────────

  /** @deprecated Usar isAuthenticated() */
  isLoggedIn(): boolean {
    return this.isAuthenticated();
  }

  /** @deprecated Usar getStoredUser()?.username */
  getNombre(): string {
    return this.getStoredUser()?.username ?? '';
  }

  forgotPassword(email: string): Promise<any> {
    return firstValueFrom(
      this.http.post(`${this.baseUrl}/auth/forgot-password`, { email })
    );
  }

  // ── Registro ──────────────────────────────────────────────────────────────

  register(payload: RegisterRequest): Promise<RegisterResponse> {
    return firstValueFrom(
      this.http.post<RegisterResponse>(`${this.baseUrl}/usuarios/registro`, payload)
    );
  }
}
