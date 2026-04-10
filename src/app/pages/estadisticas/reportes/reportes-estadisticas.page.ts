import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReporteEstadistica, ExportacionReporteResponse } from '../models/estadisticas.model';
import { TablaReportesComponent } from '../components/tabla-reportes/tabla-reportes.component';
import { ExportarReporteModalComponent } from '../components/exportar-reporte-modal/exportar-reporte-modal.component';
import { EstadisticasApiService } from '../estadisticas.service.api';
import { EstadisticasRefreshService } from '../../../shared/refresh/dashboard-module-refresh.services';

@Component({
  selector: 'app-reportes-estadisticas',
  templateUrl: './reportes-estadisticas.page.html',
  styleUrls: ['./reportes-estadisticas.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, TablaReportesComponent, ExportarReporteModalComponent],
})
export class ReportesEstadisticasPage implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  reporteParaExportar: ReporteEstadistica | null = null;
  modalExportarAbierto = false;

  constructor(
    private svc: EstadisticasApiService,
    private refresh: EstadisticasRefreshService,
  ) {}

  ngOnInit(): void {
    this.refresh.watchSection('reportes')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.svc.reloadCurrentFilters();
      });
  }

  abrirModalExportar(reporte: ReporteEstadistica) {
    this.reporteParaExportar = reporte;
    this.modalExportarAbierto = true;
  }

  cerrarModalExportar() {
    this.modalExportarAbierto = false;
    this.reporteParaExportar = null;
  }

  onExportado(_: ExportacionReporteResponse) {
  }
}
