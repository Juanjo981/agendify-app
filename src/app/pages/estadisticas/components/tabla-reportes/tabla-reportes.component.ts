import { Component, DestroyRef, OnInit, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IonicModule } from '@ionic/angular';
import { ReporteEstadistica } from '../../models/estadisticas.model';
import { EstadisticasApiService } from '../../estadisticas.service.api';

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
  cargandoDetalle = false;
  private readonly destroyRef = inject(DestroyRef);

  // Columns to show in the detail preview table (derived from first row keys)
  columnasPorReporte: Record<string, string[]> = {};

  constructor(private svc: EstadisticasApiService) {}

  ngOnInit() {
    this.svc.filtros$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(filtros => {
        void this.cargarReportes(filtros);
      });
  }

  async toggleDetalle(id: string) {
    this.reporteExpandido = this.reporteExpandido === id ? null : id;
    if (!this.reporteExpandido) {
      return;
    }

    const reporte = this.reportes.find(item => item.id === id);
    if (!reporte || reporte.filas.length > 0) {
      return;
    }

    this.cargandoDetalle = true;
    try {
      const detalle = await this.svc.getReporteDetalle(reporte);
      this.reportes = this.reportes.map(item => item.id === detalle.id ? detalle : item);
      if (detalle.filas.length > 0) {
        this.columnasPorReporte[detalle.id] = Object.keys(detalle.filas[0]);
      }
    } catch {
      this.reportes = this.reportes.map(item => item.id === reporte.id ? {
        ...item,
        resumenTexto: 'No fue posible cargar el detalle del reporte',
        filas: [],
      } : item);
    } finally {
      this.cargandoDetalle = false;
    }
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

  private async cargarReportes(filtros: any) {
    try {
      this.reportes = await this.svc.getReportes(filtros);
    } catch {
      this.reportes = [];
    }

    this.columnasPorReporte = {};
    this.reportes.forEach(reporte => {
      if (reporte.filas.length > 0) {
        this.columnasPorReporte[reporte.id] = Object.keys(reporte.filas[0]);
      }
    });
  }
}

