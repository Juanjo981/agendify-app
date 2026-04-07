import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IonicModule } from '@ionic/angular';
import { CitasPorPeriodo, PeriodoCitas, ResumenCitasEstadistica } from '../../models/estadisticas.model';
import { EstadisticasApiService } from '../../estadisticas.service.api';
import { FiltroEstadisticas } from '../../models/filtros-estadisticas.model';

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
  resumen: ResumenCitasEstadistica = {
    totalPeriodo: 0,
    estadoPredominante: 'Sin datos',
    horasMasOcupadas: [],
    diasMasOcupados: [],
  };
  private filtros: FiltroEstadisticas | null = null;
  private readonly destroyRef = inject(DestroyRef);

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
    return Math.round((total / this.maxValue) * 96); // 96% max leaves room for the value label
  }

  trackByFecha(_: number, b: CitasPorPeriodo): string {
    return b.fecha;
  }

  private async cargar() {
    if (!this.filtros) {
      return;
    }

    try {
      const data = await this.svc.getCitasStats(this.periodoActivo, this.filtros);
      this.barras = data.barras;
      this.resumen = data.resumen;
    } catch {
      this.barras = [];
      this.resumen = {
        totalPeriodo: 0,
        estadoPredominante: 'No disponible',
        horasMasOcupadas: [],
        diasMasOcupados: [],
      };
    }
  }
}
