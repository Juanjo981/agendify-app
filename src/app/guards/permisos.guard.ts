import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthorizationService } from '../auth/authorization.service';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  permisosGuard  (functional CanActivate)
 * ─────────────────────────────────────────────────────────────────────────────
 *  Bloquea el acceso a rutas del dashboard cuando el usuario no tiene el
 *  permiso requerido.
 *
 *  Uso en el router:
 *    canActivate: [permisosGuard]
 *
 *  La resolución de permisos delega en AuthorizationService.canAccessSegmento()
 *  que consulta SEGMENTO_MODULO → MODULO_PERMISO centralizados en permission.maps.
 *
 *  Comportamiento cuando no hay acceso:
 *    → Redirige a /dashboard/acceso-restringido
 *    → Pasa queryParam `origen` con el segmento intentado (para mostrar en UI)
 *
 *  FASE REAL:
 *    AuthorizationService es el único punto de cambio — conectar con auth
 *    real ahí y este guard no necesita modificaciones.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const permisosGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authSvc = inject(AuthorizationService);
  const router  = inject(Router);

  const segmento = route.routeConfig?.path ?? '';

  if (authSvc.canAccessSegmento(segmento)) {
    return true;
  }

  return router.createUrlTree(['/dashboard/acceso-restringido'], {
    queryParams: { origen: segmento || 'este módulo' },
  });
};
