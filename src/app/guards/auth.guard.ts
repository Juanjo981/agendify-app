import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  authGuard  (functional CanActivate)
 * ─────────────────────────────────────────────────────────────────────────────
 *  Protege las rutas privadas de Agendify.
 *
 *  Comportamiento:
 *    - Si hay access_token en localStorage → permite el acceso.
 *    - Si NO hay token → redirige a /login.
 *
 *  Uso en el router:
 *    canActivate: [authGuard]
 *
 *  Nota: la validez real del token se verifica en app.component.ts
 *  mediante restoreSession() al iniciar la app. Si el token expiró,
 *  el interceptor recibirá un 401 y la sesión se limpiará.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router      = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};
