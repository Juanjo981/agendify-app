import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

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
        loadComponent: () =>
          import('./pages/agenda/agenda.page').then(m => m.AgendaPage)
      },
      {
        path: 'perfil',
        loadComponent: () => import('./pages/perfil/perfil.page').then(m => m.PerfilPage)
      },
      {
        path: 'pacientes',
        loadComponent: () => import('./pages/pacientes/pacientes.page').then(m => m.PacientesPage)
      },
      {
        path: 'pacientes/:id',
        loadComponent: () => import('./pages/pacientes/paciente-detalle.page').then(m => m.PacienteDetallePage)
      },
      {
        path: 'configuracion',
        loadComponent: () => import('./pages/configuracion/configuracion.page').then(m => m.ConfiguracionPage)
      },
      {
        path: 'citas',
        loadComponent: () => import('./pages/citas/citas.page').then(m => m.CitasPage)
      },
      {
        path: 'citas/:id',
        loadComponent: () => import('./pages/citas/detalle-cita/detalle-cita.page').then(m => m.DetalleCitaPage)
      },
      {
        path: 'sesiones',
        loadComponent: () => import('./pages/sesiones/sesiones.page').then(m => m.SesionesPage)
      },
      {
        path: 'sesiones/:id',
        loadComponent: () => import('./pages/sesiones/detalle-sesion/detalle-sesion.page').then(m => m.DetalleSesionPage)
      },
      {
        path: 'estadisticas',
        loadComponent: () => import('./pages/estadisticas/estadisticas.page').then(m => m.EstadisticasPage)
      }
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
