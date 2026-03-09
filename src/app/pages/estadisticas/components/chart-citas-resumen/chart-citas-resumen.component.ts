import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ResumenCitasEstadistica, EstadoCitaEstadistica } from '../../models/estadisticas.model';
import { EstadisticasMockService } from '../../estadisticas.service.mock';

@Component({
  selector: 'app-chart-citas-resumen',
  templateUrl: './chart-citas-resumen.component.html',
  styleUrls: ['./chart-citas-resumen.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class ChartCitasResumenComponent implements OnInit {
  resumen!: ResumenCitasEstadistica;
  estados: EstadoCitaEstadistica[] = [];

  constructor(private svc: EstadisticasMockService) {}

  ngOnInit() {
    this.resumen = this.svc.getResumenCitas();
    this.estados = this.svc.getEstadosCita();
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
}
