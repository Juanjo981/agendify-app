import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ChartPacientesComponent } from '../components/chart-pacientes/chart-pacientes.component';

@Component({
  selector: 'app-pacientes-estadisticas',
  templateUrl: './pacientes-estadisticas.page.html',
  styleUrls: ['./pacientes-estadisticas.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, ChartPacientesComponent],
})
export class PacientesEstadisticasPage {}
