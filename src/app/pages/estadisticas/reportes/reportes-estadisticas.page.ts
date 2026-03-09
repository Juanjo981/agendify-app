import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ReporteEstadistica, ExportacionReporteResponse } from '../models/estadisticas.model';
import { TablaReportesComponent } from '../components/tabla-reportes/tabla-reportes.component';
import { ExportarReporteModalComponent } from '../components/exportar-reporte-modal/exportar-reporte-modal.component';

@Component({
  selector: 'app-reportes-estadisticas',
  templateUrl: './reportes-estadisticas.page.html',
  styleUrls: ['./reportes-estadisticas.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, TablaReportesComponent, ExportarReporteModalComponent],
})
export class ReportesEstadisticasPage {
  reporteParaExportar: ReporteEstadistica | null = null;
  modalExportarAbierto = false;

  abrirModalExportar(reporte: ReporteEstadistica) {
    this.reporteParaExportar = reporte;
    this.modalExportarAbierto = true;
  }

  cerrarModalExportar() {
    this.modalExportarAbierto = false;
    this.reporteParaExportar = null;
  }

  onExportado(res: ExportacionReporteResponse) {
    console.log('Exportado:', res);
    // TODO: show toast notification when backend is wired
  }
}
