import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ChartCitasPorPeriodoComponent } from '../components/chart-citas-por-periodo/chart-citas-por-periodo.component';
import { ChartEstadosCitaComponent } from '../components/chart-estados-cita/chart-estados-cita.component';
import { ChartCitasResumenComponent } from '../components/chart-citas-resumen/chart-citas-resumen.component';

@Component({
  selector: 'app-citas-estadisticas',
  templateUrl: './citas-estadisticas.page.html',
  styleUrls: ['./citas-estadisticas.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, ChartCitasPorPeriodoComponent, ChartEstadosCitaComponent, ChartCitasResumenComponent],
})
export class CitasEstadisticasPage {}
