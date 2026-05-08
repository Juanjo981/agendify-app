import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IonicModule } from '@ionic/angular';
import { Chart } from 'chart.js/auto';
import type { ChartConfiguration } from 'chart.js';
import { CitasPorPeriodo, PeriodoCitas, ResumenCitasEstadistica } from '../../models/estadisticas.model';
import { EstadisticasApiService } from '../../estadisticas.service.api';
import { FiltroEstadisticas } from '../../models/filtros-estadisticas.model';
import {
  rellenarSerieCitasPorPeriodo,
  resolveAnioVistaAnual,
} from './citas-periodo-buckets.util';

type CitasStatsPayload = Awaited<ReturnType<EstadisticasApiService['getCitasStats']>>;

@Component({
  selector: 'app-chart-citas-por-periodo',
  templateUrl: './chart-citas-por-periodo.component.html',
  styleUrls: ['./chart-citas-por-periodo.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class ChartCitasPorPeriodoComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('chartCitas') private chartCitas?: ElementRef<HTMLCanvasElement>;

  periodoActivo: PeriodoCitas = 'mes';
  barras: CitasPorPeriodo[] = [];
  resumen: ResumenCitasEstadistica = {
    totalPeriodo: 0,
    estadoPredominante: 'Sin datos',
    horasMasOcupadas: [],
    diasMasOcupados: [],
  };
  private filtros: FiltroEstadisticas | null = null;
  private readonly destroyRef = inject(DestroyRef);
  private chart?: Chart;

  /** Respuesta `getCitasStats` por clave filtros+período (evita GET duplicado al cambiar pestaña). */
  private readonly statsCache = new Map<string, CitasStatsPayload>();

  periodoTabs: Array<{ value: PeriodoCitas; label: string }> = [
    { value: 'dia', label: '7 días' },
    { value: 'semana', label: 'Semanas' },
    { value: 'mes', label: 'Meses' },
  ];

  constructor(
    private svc: EstadisticasApiService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.svc.filtros$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(filtros => {
      this.filtros = filtros;
      this.statsCache.clear();
      void this.cargar();
    });
  }

  ngAfterViewInit() {
    queueMicrotask(() => this.syncChart());
  }

  ngOnDestroy() {
    this.destroyChart();
  }

  get anioEtiqueta(): number {
    if (!this.filtros) return new Date().getFullYear();
    return resolveAnioVistaAnual(this.filtros.fechaDesde, this.filtros.fechaHasta);
  }

  /** Mes/año del filtro para subtítulo en vista Semanas. */
  get mesEtiquetaSemana(): string {
    const f = this.filtros?.fechaHasta;
    if (!f || f.length < 10) return '';
    const d = new Date(Number(f.slice(0, 4)), Number(f.slice(5, 7)) - 1, Number(f.slice(8, 10)), 12, 0, 0, 0);
    return Number.isNaN(d.getTime())
      ? ''
      : d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
  }

  get subtituloVista(): string {
    switch (this.periodoActivo) {
      case 'dia':
        return 'Últimos 7 días (incluye hoy)';
      case 'semana':
        return this.mesEtiquetaSemana
          ? `Semanas del mes · ${this.mesEtiquetaSemana}`
          : 'Semanas del mes en curso';
      case 'mes':
      default:
        return `Panorama anual (Ene–Dic) · ${this.anioEtiqueta}`;
    }
  }

  cambiarPeriodo(periodo: PeriodoCitas) {
    if (periodo === this.periodoActivo) return;
    this.periodoActivo = periodo;
    void this.cargar();
  }

  private statsCacheKey(f: FiltroEstadisticas, p: PeriodoCitas): string {
    return [p, f.rango, f.fechaDesde, f.fechaHasta, f.profesional, f.estadoCita, f.metodoPago].join('|');
  }

  private async cargar() {
    if (!this.filtros) {
      return;
    }

    const cacheKey = this.statsCacheKey(this.filtros, this.periodoActivo);

    try {
      let data = this.statsCache.get(cacheKey);
      if (!data) {
        data = await this.svc.getCitasStats(this.periodoActivo, this.filtros);
        this.statsCache.set(cacheKey, data);
      }

      this.barras = rellenarSerieCitasPorPeriodo(
        data.barras,
        this.filtros.fechaDesde,
        this.filtros.fechaHasta,
        this.periodoActivo,
      );
      this.resumen = data.resumen;
    } catch {
      this.barras = this.filtros
        ? rellenarSerieCitasPorPeriodo([], this.filtros.fechaDesde, this.filtros.fechaHasta, this.periodoActivo)
        : [];
      this.resumen = {
        totalPeriodo: 0,
        estadoPredominante: 'No disponible',
        horasMasOcupadas: [],
        diasMasOcupados: [],
      };
    }

    this.cdr.detectChanges();
    queueMicrotask(() => this.syncChart());
  }

  private syncChart() {
    const canvas = this.chartCitas?.nativeElement;
    if (!canvas || this.barras.length === 0) {
      this.destroyChart();
      return;
    }

    this.destroyChart();

    const labels = this.barras.map(b => b.label);
    const values = this.barras.map(b => b.total);
    const primary = this.readCssVar('--primary-mid', '#6366f1');
    const muted = this.readCssVar('--text-muted', '#64748b');
    const grid = this.readCssVar('--border-soft', 'rgba(148, 163, 184, 0.35)');

    const cfg: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Citas',
            data: values,
            tension: 0.4,
            fill: true,
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 5,
            borderColor: primary,
            backgroundColor: ctx => {
              const chart = ctx.chart;
              const { ctx: c, chartArea } = chart;
              if (!chartArea) {
                return 'rgba(99, 102, 241, 0.12)';
              }
              const g = c.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
              g.addColorStop(0, 'rgba(99, 102, 241, 0)');
              g.addColorStop(1, 'rgba(99, 102, 241, 0.32)');
              return g;
            },
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        scales: {
          x: {
            grid: { color: grid, tickLength: 0 },
            ticks: { color: muted, font: { size: 10 }, maxRotation: 0 },
          },
          y: {
            beginAtZero: true,
            suggestedMax: Math.max(4, Math.ceil(Math.max(...values, 1) * 1.15)),
            ticks: {
              color: muted,
              font: { size: 10 },
              precision: 0,
              /* Si el dataset pasara a montos (ingresos), usar chartJsCurrencyTickFormatter desde currency-format.util.ts */
            },
            grid: { color: grid },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.92)',
            titleFont: { size: 12 },
            bodyFont: { size: 13 },
            padding: 10,
            cornerRadius: 10,
          },
        },
      },
    };

    this.chart = new Chart(canvas, cfg);
  }

  private destroyChart() {
    this.chart?.destroy();
    this.chart = undefined;
  }

  private readCssVar(name: string, fallback: string): string {
    if (typeof document === 'undefined') return fallback;
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }
}
