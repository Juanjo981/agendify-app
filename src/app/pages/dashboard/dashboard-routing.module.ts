import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { DashboardPage } from './dashboard.page';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'agenda',
    pathMatch: 'full'
  },
  {
    path: 'agenda',
    loadChildren: () => import('../agenda/agenda.page').then(m => m.AgendaPage)
  },
  {
    path: 'perfil',
    loadComponent: () => import('../perfil/perfil.page').then(m => m.PerfilPage)
  },
  {
    path: 'configuracion',
    loadComponent: () => import('../configuracion/configuracion.page').then(m => m.ConfiguracionPage)
  },
  {
    path: 'pacientes',
    loadComponent: () => import('../pacientes/pacientes.page').then(m => m.PacientesPage)
  },
  {
    path: 'pacientes/:id',
    loadComponent: () => import('../pacientes/paciente-detalle.page').then(m => m.PacienteDetallePage)
  },
  {
    path: 'soporte',
    loadComponent: () => import('../soporte/soporte.page').then(m => m.SoportePage)
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DashboardPageRoutingModule { }
