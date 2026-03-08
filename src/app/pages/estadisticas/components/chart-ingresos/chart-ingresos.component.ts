import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import {
  IngresoPorPeriodo,
  IngresoPorMetodoPago,
  ResumenIngresosEstadistica,
  PeriodoCitas,
} from '../../models/estadisticas.model';
import { EstadisticasMockService } from '../../estadisticas.service.mock';

interface DonutSegment {
  dasharray: string;
  dashoffset: number;
  color: string;
}

@Component({
  selector: 'app-chart-ingresos',
  templateUrl: './chart-ingresos.component.html',
  styleUrls: ['./chart-ingresos.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class ChartIngresosComponent implements OnInit {
  periodoActivo: PeriodoCitas = 'mes';
  barras: IngresoPorPeriodo[] = [];
  metodos: IngresoPorMetodoPago[] = [];
  resumen!: ResumenIngresosEstadistica;
  donutSegments: DonutSegment[] = [];
  totalMetodos = 0;

  readonly RADIUS = 70;
  get CIRCUMFERENCE(): number { return 2 * Math.PI * this.RADIUS; }

  periodoTabs: Array<{ value: PeriodoCitas; label: string }> = [
    { value: 'dia',    label: '7 días' },
    { value: 'semana', label: 'Semanas' },
    { value: 'mes',    label: 'Meses' },
  ];

  constructor(private svc: EstadisticasMockService) {}

  ngOnInit() {
    this.metodos = this.svc.getIngresosPorMetodoPago();
    this.resumen = this.svc.getResumenIngresos();
    this.totalMetodos = this.metodos.reduce((s, m) => s + m.total, 0);
    this.donutSegments = this.buildDonut();
    this.cambiarPeriodo(this.periodoActivo);
  }

  cambiarPeriodo(periodo: PeriodoCitas) {
    this.periodoActivo = periodo;
    this.barras = this.svc.getIngresosPorPeriodo(periodo);
  }

  get maxValue(): number {
    return Math.max(...this.barras.map(b => b.total), 1);
  }

  getPct(total: number): number {
    return Math.round((total / this.maxValue) * 92);
  }

  private buildDonut(): DonutSegment[] {
    const C = this.CIRCUMFERENCE;
    let cumulative = 0;
    return this.metodos.map(m => {
      const len = (m.porcentaje / 100) * C;
      const seg: DonutSegment = {
        dasharray: `${len.toFixed(2)} ${C.toFixed(2)}`,
        dashoffset: parseFloat((-cumulative).toFixed(2)),
        color: m.color,
      };
      cumulative += len;
      return seg;
    });
  }

  formatCurrency(val: number): string {
    if (val >= 1000) return `€${(val / 1000).toFixed(1)}k`;
    return `€${val}`;
  }

  trackByFecha(_: number, b: IngresoPorPeriodo): string { return b.fecha; }
  trackByMetodo(_: number, m: IngresoPorMetodoPago): string { return m.metodo; }
  trackByIndex(i: number): number { return i; }
}
