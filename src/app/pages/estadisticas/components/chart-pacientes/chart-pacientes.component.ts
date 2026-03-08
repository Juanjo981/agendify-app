import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import {
  NuevosVsRecurrentesPunto,
  RankingPaciente,
  ResumenPacientesEstadistica,
} from '../../models/estadisticas.model';
import { EstadisticasMockService } from '../../estadisticas.service.mock';

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
  resumen!: ResumenPacientesEstadistica;

  rankingTab: 'citas' | 'no-asistencias' = 'citas';

  constructor(private svc: EstadisticasMockService) {}

  ngOnInit() {
    this.puntos = this.svc.getNuevosVsRecurrentes();
    this.resumen = this.svc.getResumenPacientes();
    this.rankingCitas = this.svc.getRankingMasCitas();
    this.rankingNoAsist = this.svc.getRankingMasNoAsistencias();
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
}
