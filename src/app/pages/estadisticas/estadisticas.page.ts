import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterOutlet } from '@angular/router';
import { EstadisticasSubmenuComponent } from './components/estadisticas-submenu/estadisticas-submenu.component';

@Component({
  selector: 'app-estadisticas',
  templateUrl: './estadisticas.page.html',
  styleUrls: ['./estadisticas.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterOutlet, EstadisticasSubmenuComponent],
})
export class EstadisticasPage {}
