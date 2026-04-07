import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IonicModule } from '@ionic/angular';
import {
  NuevosVsRecurrentesPunto,
  RankingPaciente,
  ResumenPacientesEstadistica,
} from '../../models/estadisticas.model';
import { EstadisticasApiService } from '../../estadisticas.service.api';

@Component({
  selector: 'app-chart-pacientes',
  templateUrl: './chart-pacientes.component.html',
  styleUrls: ['./chart-pacientes.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class ChartPacientesComponent implements OnInit {
  puntos: NuevosVsRecurrentesPunto[] = [];
  rankingCitas: RankingPaciente[] = [];
  rankingNoAsist: RankingPaciente[] = [];
  resumen: ResumenPacientesEstadistica = {
    totalActivos: 0,
    nuevosEsteMes: 0,
    recurrentesEsteMes: 0,
    tasaRetencion: 0,
  };
  private readonly destroyRef = inject(DestroyRef);

  rankingTab: 'citas' | 'no-asistencias' = 'citas';

  constructor(private svc: EstadisticasApiService) {}

  ngOnInit() {
    this.svc.filtros$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(filtros => {
        void this.cargar(filtros);
      });
  }

  get rankingActivo(): RankingPaciente[] {
    return this.rankingTab === 'citas' ? this.rankingCitas : this.rankingNoAsist;
  }

  get maxNuevos(): number {
    return Math.max(...this.puntos.map(p => p.nuevos), 1);
  }

  get maxRecurrentes(): number {
    return Math.max(...this.puntos.map(p => p.recurrentes), 1);
  }

  get maxRanking(): number {
    return Math.max(...this.rankingActivo.map(r => r.valor), 1);
  }

  getPctNuevos(val: number): number {
    return Math.round((val / this.maxNuevos) * 88);
  }

  getPctRecurrentes(val: number): number {
    return Math.round((val / this.maxRecurrentes) * 88);
  }

  trackByLabel(_: number, p: NuevosVsRecurrentesPunto): string { return p.label; }
  trackByPosicion(_: number, r: RankingPaciente): number { return r.posicion; }

  private async cargar(filtros: any) {
    try {
      const data = await this.svc.getPacientesStats(filtros);
      this.puntos = data.puntos;
      this.resumen = data.resumen;
      this.rankingCitas = data.rankingCitas;
      this.rankingNoAsist = data.rankingNoAsistencias;
    } catch {
      this.puntos = [];
      this.resumen = {
        totalActivos: 0,
        nuevosEsteMes: 0,
        recurrentesEsteMes: 0,
        tasaRetencion: 0,
      };
      this.rankingCitas = [];
      this.rankingNoAsist = [];
    }
  }
}
