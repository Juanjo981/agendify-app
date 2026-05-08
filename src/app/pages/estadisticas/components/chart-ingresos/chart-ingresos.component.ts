import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IonicModule } from '@ionic/angular';
import {
  IngresoPorMetodoPago,
  IngresoPorPeriodo,
  PeriodoCitas,
  ResumenIngresosEstadistica,
} from '../../models/estadisticas.model';
import { EstadisticasApiService } from '../../estadisticas.service.api';
import { FiltroEstadisticas } from '../../models/filtros-estadisticas.model';
import { CurrencyPreferenceService } from 'src/app/services/currency-preference.service';
import { rellenarSerieIngresosPorPeriodo } from './ingresos-periodo-buckets.util';

interface DonutSegment {
  dasharray: string;
  dashoffset: number;
  color: string;
}

type IngresosPayload = Awaited<ReturnType<EstadisticasApiService['getIngresosStats']>>;

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
  private readonly ingresosCache = new Map<string, IngresosPayload>();

  readonly RADIUS = 70;
  get CIRCUMFERENCE(): number {
    return 2 * Math.PI * this.RADIUS;
  }

  periodoTabs: Array<{ value: PeriodoCitas; label: string }> = [
    { value: 'dia', label: '7 días' },
    { value: 'semana', label: 'Semanas' },
    { value: 'mes', label: 'Meses' },
  ];

  constructor(
    private svc: EstadisticasApiService,
    private cdr: ChangeDetectorRef,
    private currencyPreference: CurrencyPreferenceService,
  ) {}

  ngOnInit() {
    this.svc.filtros$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(filtros => {
      this.filtros = filtros;
      this.ingresosCache.clear();
      void this.cargar();
    });
  }

  cambiarPeriodo(periodo: PeriodoCitas) {
    if (periodo === this.periodoActivo) return;
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
    return this.currencyPreference.format(val, { maximumFractionDigits: 0 });
  }

  trackByFecha(_: number, b: IngresoPorPeriodo): string {
    return b.fecha;
  }
  trackByMetodo(_: number, m: IngresoPorMetodoPago): string {
    return m.metodo;
  }
  trackByIndex(i: number): number {
    return i;
  }

  private cacheKey(f: FiltroEstadisticas, p: PeriodoCitas): string {
    return [p, f.rango, f.fechaDesde, f.fechaHasta, f.profesional, f.estadoCita, f.metodoPago].join('|');
  }

  private async cargar() {
    if (!this.filtros) {
      return;
    }

    const key = this.cacheKey(this.filtros, this.periodoActivo);

    try {
      let data = this.ingresosCache.get(key);
      if (!data) {
        data = await this.svc.getIngresosStats(this.periodoActivo, this.filtros);
        this.ingresosCache.set(key, data);
      }

      this.barras = rellenarSerieIngresosPorPeriodo(
        data.barras,
        this.filtros.fechaDesde,
        this.filtros.fechaHasta,
        this.periodoActivo,
      );
      this.metodos = data.metodos;
      this.resumen = data.resumen;
      this.totalMetodos = this.metodos.reduce((s, m) => s + m.total, 0);
      this.donutSegments = this.buildDonut();
    } catch {
      const emptySeries = this.filtros
        ? rellenarSerieIngresosPorPeriodo([], this.filtros.fechaDesde, this.filtros.fechaHasta, this.periodoActivo)
        : [];
      this.barras = emptySeries;
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

    this.cdr.markForCheck();
  }
}
