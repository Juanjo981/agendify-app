import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ReporteEstadistica } from '../../models/estadisticas.model';
import { EstadisticasMockService } from '../../estadisticas.service.mock';

@Component({
  selector: 'app-tabla-reportes',
  templateUrl: './tabla-reportes.component.html',
  styleUrls: ['./tabla-reportes.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class TablaReportesComponent implements OnInit {
  @Output() exportarReporte = new EventEmitter<ReporteEstadistica>();

  reportes: ReporteEstadistica[] = [];
  reporteExpandido: string | null = null;

  // Columns to show in the detail preview table (derived from first row keys)
  columnasPorReporte: Record<string, string[]> = {};

  constructor(private svc: EstadisticasMockService) {}

  ngOnInit() {
    this.reportes = this.svc.getReportes();
    this.reportes.forEach(r => {
      if (r.filas.length > 0) {
        this.columnasPorReporte[r.id] = Object.keys(r.filas[0]);
      }
    });
  }

  toggleDetalle(id: string) {
    this.reporteExpandido = this.reporteExpandido === id ? null : id;
  }

  onExportar(reporte: ReporteEstadistica) {
    this.exportarReporte.emit(reporte);
  }

  formatKey(key: string): string {
    const map: Record<string, string> = {
      fecha: 'Fecha', paciente: 'Paciente', hora: 'Hora',
      estado: 'Estado', profesional: 'Profesional', monto: 'Monto',
      metodo: 'Método', correo: 'Correo', citas: 'Citas',
      diasPendiente: 'Días pend.', motivo: 'Motivo',
    };
    return map[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
  }

  formatVal(key: string, val: string | number): string {
    if (key === 'monto') return `€${val}`;
    return String(val);
  }

  trackById(_: number, r: ReporteEstadistica): string { return r.id; }
  trackByKey(_: number, k: string): string { return k; }
  trackByIndex(i: number): number { return i; }
}
