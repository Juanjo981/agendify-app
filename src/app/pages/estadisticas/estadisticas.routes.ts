import { Routes } from '@angular/router';
import { EstadisticasPage } from './estadisticas.page';

export const ESTADISTICAS_ROUTES: Routes = [
  {
    path: '',
    component: EstadisticasPage,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./dashboard/dashboard-estadisticas.page').then(m => m.DashboardEstadisticasPage),
      },
      {
        path: 'citas',
        loadComponent: () =>
          import('./citas/citas-estadisticas.page').then(m => m.CitasEstadisticasPage),
      },
      {
        path: 'ingresos',
        loadComponent: () =>
          import('./ingresos/ingresos-estadisticas.page').then(m => m.IngresosEstadisticasPage),
      },
      {
        path: 'pacientes',
        loadComponent: () =>
          import('./pacientes/pacientes-estadisticas.page').then(m => m.PacientesEstadisticasPage),
      },
      {
        path: 'reportes',
        loadComponent: () =>
          import('./reportes/reportes-estadisticas.page').then(m => m.ReportesEstadisticasPage),
      },
    ],
  },
];
