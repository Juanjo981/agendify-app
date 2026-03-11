import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { permisosGuard } from './guards/permisos.guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
    children: [
      {
        path: '',
        redirectTo: 'agenda',
        pathMatch: 'full'
      },
      {
        path: 'agenda',
        canActivate: [permisosGuard],
        loadComponent: () =>
          import('./pages/agenda/agenda.page').then(m => m.AgendaPage)
      },
      {
        path: 'perfil',
        loadComponent: () => import('./pages/perfil/perfil.page').then(m => m.PerfilPage)
      },
      {
        path: 'pacientes',
        canActivate: [permisosGuard],
        loadComponent: () => import('./pages/pacientes/pacientes.page').then(m => m.PacientesPage)
      },
      {
        path: 'pacientes/:id',
        canActivate: [permisosGuard],
        loadComponent: () => import('./pages/pacientes/paciente-detalle.page').then(m => m.PacienteDetallePage)
      },
      {
        path: 'configuracion',
        canActivate: [permisosGuard],
        loadComponent: () => import('./pages/configuracion/configuracion.page').then(m => m.ConfiguracionPage)
      },
      {
        path: 'citas',
        canActivate: [permisosGuard],
        loadComponent: () => import('./pages/citas/citas.page').then(m => m.CitasPage)
      },
      {
        path: 'citas/:id',
        canActivate: [permisosGuard],
        loadComponent: () => import('./pages/citas/detalle-cita/detalle-cita.page').then(m => m.DetalleCitaPage)
      },
      {
        path: 'sesiones',
        canActivate: [permisosGuard],
        loadComponent: () => import('./pages/sesiones/sesiones.page').then(m => m.SesionesPage)
      },
      {
        path: 'sesiones/:id',
        canActivate: [permisosGuard],
        loadComponent: () => import('./pages/sesiones/detalle-sesion/detalle-sesion.page').then(m => m.DetalleSesionPage)
      },
      {
        path: 'estadisticas',
        canActivate: [permisosGuard],
        loadChildren: () => import('./pages/estadisticas/estadisticas.routes').then(m => m.ESTADISTICAS_ROUTES)
      },
      {
        path: 'acceso-restringido',
        loadComponent: () =>
          import('./pages/acceso-restringido/acceso-restringido.page').then(m => m.AccesoRestringidoPage)
      },
      {
        path: 'soporte',
        loadComponent: () => import('./pages/soporte/soporte.page').then(m => m.SoportePage)
      },
      {
        path: 'actividad',
        loadComponent: () => import('./pages/actividad/actividad.page').then(m => m.ActividadPage)
      },
    ]
  },
  {
    path: 'registro',
    loadComponent: () =>
      import('./pages/registro/registro.page').then(m => m.RegistroPage)
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
