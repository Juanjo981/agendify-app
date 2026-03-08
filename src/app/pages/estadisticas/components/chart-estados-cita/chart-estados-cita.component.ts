import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { EstadoCitaEstadistica } from '../../models/estadisticas.model';
import { EstadisticasMockService } from '../../estadisticas.service.mock';

interface DonutSegment {
  dasharray: string;
  dashoffset: number;
  color: string;
}

@Component({
  selector: 'app-chart-estados-cita',
  templateUrl: './chart-estados-cita.component.html',
  styleUrls: ['./chart-estados-cita.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class ChartEstadosCitaComponent implements OnInit {
  estados: EstadoCitaEstadistica[] = [];
  donutSegments: DonutSegment[] = [];
  total = 0;

  // SVG donut: cx=100 cy=100 r=70 → circumference ≈ 439.82
  readonly RADIUS = 70;
  get CIRCUMFERENCE(): number { return 2 * Math.PI * this.RADIUS; }

  constructor(private svc: EstadisticasMockService) {}

  ngOnInit() {
    this.estados = this.svc.getEstadosCita();
    this.total = this.estados.reduce((s, e) => s + e.total, 0);
    this.donutSegments = this.buildDonut();
  }

  private buildDonut(): DonutSegment[] {
    const C = this.CIRCUMFERENCE;
    // CSS rotates SVG -90deg so the natural 3-o'clock start becomes 12-o'clock
    // Each segment's dashoffset is -(cumulative length of previous segments)
    let cumulative = 0;
    return this.estados.map(e => {
      const len = (e.porcentaje / 100) * C;
      const seg: DonutSegment = {
        dasharray: `${len.toFixed(2)} ${C.toFixed(2)}`,
        dashoffset: parseFloat((-cumulative).toFixed(2)),
        color: e.color,
      };
      cumulative += len;
      return seg;
    });
  }

  trackByEstado(_: number, e: EstadoCitaEstadistica): string {
    return e.estado;
  }

  trackByIndex(i: number): number {
    return i;
  }
}
