import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ChartIngresosComponent } from '../components/chart-ingresos/chart-ingresos.component';
import { ResumenCajaDiariaComponent } from '../components/resumen-caja-diaria/resumen-caja-diaria.component';

@Component({
  selector: 'app-ingresos-estadisticas',
  templateUrl: './ingresos-estadisticas.page.html',
  styleUrls: ['./ingresos-estadisticas.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, ChartIngresosComponent, ResumenCajaDiariaComponent],
})
export class IngresosEstadisticasPage {}
