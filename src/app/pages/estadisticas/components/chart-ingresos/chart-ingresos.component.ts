import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IonicModule } from '@ionic/angular';
import {
  IngresoPorPeriodo,
  IngresoPorMetodoPago,
  ResumenIngresosEstadistica,
  PeriodoCitas,
} from '../../models/estadisticas.model';
import { EstadisticasApiService } from '../../estadisticas.service.api';
import { FiltroEstadisticas } from '../../models/filtros-estadisticas.model';

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
  resumen: ResumenIngresosEstadistica = {
    totalPeriodo: 0,
    montoPendiente: 0,
    citasPagadas: 0,
    citasPendientes: 0,
    metodoPrincipal: 'Sin datos',
  };
  donutSegments: DonutSegment[] = [];
  totalMetodos = 0;
  private filtros: FiltroEstadisticas | null = null;
  private readonly destroyRef = inject(DestroyRef);

  readonly RADIUS = 70;
  get CIRCUMFERENCE(): number { return 2 * Math.PI * this.RADIUS; }

  periodoTabs: Array<{ value: PeriodoCitas; label: string }> = [
    { value: 'dia',    label: '7 días' },
    { value: 'semana', label: 'Semanas' },
    { value: 'mes',    label: 'Meses' },
  ];

  constructor(private svc: EstadisticasApiService) {}

  ngOnInit() {
    this.svc.filtros$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(filtros => {
        this.filtros = filtros;
        void this.cargar();
      });
  }

  cambiarPeriodo(periodo: PeriodoCitas) {
    this.periodoActivo = periodo;
    void this.cargar();
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
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 0,
    }).format(val);
  }

  trackByFecha(_: number, b: IngresoPorPeriodo): string { return b.fecha; }
  trackByMetodo(_: number, m: IngresoPorMetodoPago): string { return m.metodo; }
  trackByIndex(i: number): number { return i; }

  private async cargar() {
    if (!this.filtros) {
      return;
    }

    try {
      const data = await this.svc.getIngresosStats(this.periodoActivo, this.filtros);
      this.barras = data.barras;
      this.metodos = data.metodos;
      this.resumen = data.resumen;
      this.totalMetodos = this.metodos.reduce((s, m) => s + m.total, 0);
      this.donutSegments = this.buildDonut();
    } catch {
      this.barras = [];
      this.metodos = [];
      this.resumen = {
        totalPeriodo: 0,
        montoPendiente: 0,
        citasPagadas: 0,
        citasPendientes: 0,
        metodoPrincipal: 'No disponible',
      };
      this.totalMetodos = 0;
      this.donutSegments = [];
    }
  }
}


