import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import {
  ReporteEstadistica,
  ExportacionReporteRequest,
  ExportacionReporteResponse,
  FormatoExportacion,
} from '../../models/estadisticas.model';
import { EstadisticasMockService } from '../../estadisticas.service.mock';

@Component({
  selector: 'app-exportar-reporte-modal',
  templateUrl: './exportar-reporte-modal.component.html',
  styleUrls: ['./exportar-reporte-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
})
export class ExportarReporteModalComponent implements OnInit {
  @Input() reporte!: ReporteEstadistica;
  @Output() cerrar = new EventEmitter<void>();
  @Output() exportado = new EventEmitter<ExportacionReporteResponse>();

  formato: FormatoExportacion = 'pdf';
  incluirResumen = true;
  incluirDetalle = true;
  profesional = '';
  fechaDesde = '';
  fechaHasta = '';
  nombreArchivo = '';

  exportando = false;
  resultado: ExportacionReporteResponse | null = null;

  constructor(private svc: EstadisticasMockService) {}

  ngOnInit() {
    // Defaults based on current month
    const hoy = new Date();
    this.fechaHasta = hoy.toISOString().slice(0, 10);
    this.fechaDesde = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
      .toISOString().slice(0, 10);
    this.nombreArchivo = this.buildNombreArchivo();
  }

  setFormato(f: FormatoExportacion) {
    this.formato = f;
    this.nombreArchivo = this.buildNombreArchivo();
  }

  private buildNombreArchivo(): string {
    const slug = this.reporte?.tipo ?? 'reporte';
    const fecha = new Date().toISOString().slice(0, 10);
    return `agendify-${slug}-${fecha}`;
  }

  async exportar() {
    this.exportando = true;
    this.resultado = null;

    const req: ExportacionReporteRequest = {
      reporteId: this.reporte.id,
      tipo: this.reporte.tipo,
      formato: this.formato,
      fechaDesde: this.fechaDesde,
      fechaHasta: this.fechaHasta,
      profesional: this.profesional || undefined,
      incluirResumen: this.incluirResumen,
      incluirDetalle: this.incluirDetalle,
      nombreArchivo: this.nombreArchivo,
    };

    try {
      const res = this.formato === 'pdf'
        ? await this.svc.exportarPdf(req)
        : await this.svc.exportarExcel(req);

      this.resultado = res;
      if (res.ok) {
        this.exportado.emit(res);
      }
    } finally {
      this.exportando = false;
    }
  }

  onCerrar() {
    this.cerrar.emit();
  }
}
