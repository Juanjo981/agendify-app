import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { AuthService } from '../services/auth';
import { RefreshTokenResponse } from '../shared/models/auth.models';
import { mapApiError, API_ERROR_CODES } from '../shared/utils/api-error.mapper';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  authInterceptor  (functional HttpInterceptorFn)
 * ─────────────────────────────────────────────────────────────────────────────
 *  Responsabilidades:
 *    1. Inyectar Authorization: Bearer {token} en requests autenticados.
 *    2. Ante un 401, intentar refrescar el access_token automáticamente.
 *    3. Reintentar el request original con el nuevo token si el refresh ok.
 *    4. Hacer logout forzado + navegar a /login si el refresh también falla.
 *    5. Serializar los refreshes concurrentes: solo uno a la vez.
 *       Los demás requests esperan el resultado usando refreshSubject.
 *
 *  Registro: app.module.ts → provideHttpClient(withInterceptors([authInterceptor]))
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Concurrency state (module-level = singleton por instancia de app) ────────
// isRefreshing evita disparar múltiples POST /auth/refresh en paralelo.
// refreshSubject emite el nuevo access_token cuando el refresh completa,
// permitiendo a los requests en espera reintentar con el token correcto.
let isRefreshing = false;
const refreshSubject = new BehaviorSubject<string | null>(null);

/**
 * Prevents showing multiple "session expired" toasts when several concurrent
 * requests all fail at the same time. Reset when a refresh succeeds.
 */
let sessionExpiredNotified = false;

// ── Public URL fragments — estas rutas no llevan Bearer ni disparan refresh ──
const PUBLIC_URLS: ReadonlyArray<string> = [
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/auth/logout',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/usuarios/registro',
  '/public/citas/gestion/',
  'storage.googleapis.com',
  'storage.cloud.google.com',
];

function isPublicUrl(url: string): boolean {
  // Fragmentos conocidos de rutas públicas/auth del backend
  if (PUBLIC_URLS.some(fragment => url.includes(fragment))) {
    return true;
  }
  // Cualquier ruta bajo /public/ es pública por convención del backend
  if (url.includes('/public/')) {
    return true;
  }
  // URLs externas (ej: signed URLs de storage para upload/download de adjuntos)
  if (!url.startsWith('/') && !url.includes('localhost') && !url.includes('agendify.com')) {
    return true;
  }
  return false;
}

function withBearerToken<T>(req: HttpRequest<T>, token: string): HttpRequest<T> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

// ── Interceptor ───────────────────────────────────────────────────────────────

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // inject() solo válido al nivel superior de la función
  const authService = inject(AuthService);
  const router      = inject(Router);
  const toastCtrl   = inject(ToastController);

  if (isPublicUrl(req.url)) {
    return next(req);
  }

  const token = authService.getAccessToken();
  const authReq = token ? withBearerToken(req, token) : req;

  return next(authReq).pipe(
    catchError(error => {
      if (error.status === 401) {
        return handle401(req, next, authService, router, toastCtrl);
      }
      return throwError(() => error);
    }),
  );
};

// ── 401 handler ───────────────────────────────────────────────────────────────

function handle401(
  originalReq: HttpRequest<unknown>,
  next:        HttpHandlerFn,
  authService: AuthService,
  router:      Router,
  toastCtrl:   ToastController,
): Observable<any> {

  // Sin refresh_token en storage → no hay nada que intentar
  if (!authService.getRefreshToken()) {
    authService.forceLogout();
    router.navigateByUrl('/login');
    return throwError(() => new Error('No refresh token available'));
  }

  // ── Si NO hay un refresh en curso, iniciamos uno ──────────────────────────
  if (!isRefreshing) {
    isRefreshing = true;
    refreshSubject.next(null); // bloquea los requests en espera

    return authService.refreshToken().pipe(
      switchMap((tokens: RefreshTokenResponse) => {
        isRefreshing = false;
        sessionExpiredNotified = false; // Reset para el próximo evento de expiración
        refreshSubject.next(tokens.access_token); // desbloquea los en espera
        return next(withBearerToken(originalReq, tokens.access_token));
      }),
      catchError(err => {
        isRefreshing = false;
        refreshSubject.next(null);
        authService.forceLogout();

        // Show at most one toast per session expiry event (concurrency guard)
        if (!sessionExpiredNotified) {
          sessionExpiredNotified = true;
          const apiError  = mapApiError(err);
          const isNetwork = apiError.status === 0;
          const isTokenError =
            apiError.code === API_ERROR_CODES.TOKEN_EXPIRED ||
            apiError.code === API_ERROR_CODES.TOKEN_INVALID;

          const message = isNetwork
            ? 'Sin conexión. Verifica tu red e inicia sesión nuevamente.'
            : isTokenError
              ? 'Tu sesión expiró. Inicia sesión nuevamente.'
              : 'Sesión finalizada. Inicia sesión nuevamente.';

          showSessionToast(toastCtrl, message);
        }

        router.navigateByUrl('/login');
        return throwError(() => err);
      }),
    );
  }

  // ── Ya hay un refresh en curso — esperar su resultado ─────────────────────
  return refreshSubject.pipe(
    filter((token): token is string => token !== null),
    take(1),
    switchMap(token => next(withBearerToken(originalReq, token))),
  );
}

/** Fire-and-forget session toast. Silences its own errors to never crash the interceptor. */
function showSessionToast(toastCtrl: ToastController, message: string): void {
  toastCtrl
    .create({ message, duration: 3500, position: 'top', color: 'warning', icon: 'time-outline' })
    .then(toast => toast.present())
    .catch(() => {});
}

