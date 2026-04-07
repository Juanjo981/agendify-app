import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IonicModule } from '@ionic/angular';
import { ResumenCitasEstadistica, EstadoCitaEstadistica } from '../../models/estadisticas.model';
import { EstadisticasApiService } from '../../estadisticas.service.api';

@Component({
  selector: 'app-chart-citas-resumen',
  templateUrl: './chart-citas-resumen.component.html',
  styleUrls: ['./chart-citas-resumen.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class ChartCitasResumenComponent implements OnInit {
  resumen: ResumenCitasEstadistica = {
    totalPeriodo: 0,
    estadoPredominante: 'Sin datos',
    horasMasOcupadas: [],
    diasMasOcupados: [],
  };
  estados: EstadoCitaEstadistica[] = [];
  private readonly destroyRef = inject(DestroyRef);

  constructor(private svc: EstadisticasApiService) {}

  ngOnInit() {
    this.svc.filtros$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(filtros => {
        void this.cargar(filtros);
      });
  }

  get maxHoras(): number {
    return Math.max(...(this.resumen?.horasMasOcupadas ?? []).map(h => h.citas), 1);
  }

  get maxDias(): number {
    return Math.max(...(this.resumen?.diasMasOcupados ?? []).map(d => d.citas), 1);
  }

  get noAsistencias(): EstadoCitaEstadistica | undefined {
    return this.estados.find(e => e.estado === 'No asistió');
  }

  get canceladas(): EstadoCitaEstadistica | undefined {
    return this.estados.find(e => e.estado === 'Cancelada');
  }

  barPct(val: number, max: number): string {
    return `${Math.round((val / max) * 100)}%`;
  }

  private async cargar(filtros: any) {
    try {
      const data = await this.svc.getCitasStats('mes', filtros);
      this.resumen = data.resumen;
      this.estados = data.estados;
    } catch {
      this.resumen = {
        totalPeriodo: 0,
        estadoPredominante: 'No disponible',
        horasMasOcupadas: [],
        diasMasOcupados: [],
      };
      this.estados = [];
    }
  }
}
