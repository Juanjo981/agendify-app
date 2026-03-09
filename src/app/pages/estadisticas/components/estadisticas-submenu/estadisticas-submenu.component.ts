import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IonicModule } from '@ionic/angular';

interface SubmenuItem {
  label: string;
  icon: string;
  path: string;
}

@Component({
  selector: 'app-estadisticas-submenu',
  templateUrl: './estadisticas-submenu.component.html',
  styleUrls: ['./estadisticas-submenu.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterLink, RouterLinkActive],
})
export class EstadisticasSubmenuComponent {
  items: SubmenuItem[] = [
    { label: 'Dashboard',  icon: 'grid-outline',          path: '/dashboard/estadisticas/dashboard' },
    { label: 'Citas',      icon: 'clipboard-outline',     path: '/dashboard/estadisticas/citas' },
    { label: 'Ingresos',   icon: 'wallet-outline',        path: '/dashboard/estadisticas/ingresos' },
    { label: 'Pacientes',  icon: 'people-outline',        path: '/dashboard/estadisticas/pacientes' },
    { label: 'Reportes',   icon: 'document-text-outline', path: '/dashboard/estadisticas/reportes' },
  ];
}
