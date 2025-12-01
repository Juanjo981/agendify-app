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
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DashboardPageRoutingModule { }
