import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { CitasPorPeriodo, PeriodoCitas, ResumenCitasEstadistica } from '../../models/estadisticas.model';
import { EstadisticasMockService } from '../../estadisticas.service.mock';

@Component({
  selector: 'app-chart-citas-por-periodo',
  templateUrl: './chart-citas-por-periodo.component.html',
  styleUrls: ['./chart-citas-por-periodo.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class ChartCitasPorPeriodoComponent implements OnInit {
  periodoActivo: PeriodoCitas = 'mes';
  barras: CitasPorPeriodo[] = [];
  resumen!: ResumenCitasEstadistica;

  periodoTabs: Array<{ value: PeriodoCitas; label: string }> = [
    { value: 'dia',    label: '7 días' },
    { value: 'semana', label: 'Semanas' },
    { value: 'mes',    label: 'Meses' },
  ];

  constructor(private svc: EstadisticasMockService) {}

  ngOnInit() {
    this.resumen = this.svc.getResumenCitas();
    this.cambiarPeriodo(this.periodoActivo);
  }

  cambiarPeriodo(periodo: PeriodoCitas) {
    this.periodoActivo = periodo;
    this.barras = this.svc.getCitasPorPeriodo(periodo);
  }

  get maxValue(): number {
    return Math.max(...this.barras.map(b => b.total), 1);
  }

  getPct(total: number): number {
    return Math.round((total / this.maxValue) * 96); // 96% max leaves room for the value label
  }

  trackByFecha(_: number, b: CitasPorPeriodo): string {
    return b.fecha;
  }
}
