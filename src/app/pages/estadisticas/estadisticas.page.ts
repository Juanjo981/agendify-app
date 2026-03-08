import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FiltroEstadisticas } from './models/filtros-estadisticas.model';
import { KpiCard, ReporteEstadistica, ExportacionReporteResponse } from './models/estadisticas.model';
import { EstadisticasMockService } from './estadisticas.service.mock';
import { FiltrosEstadisticasComponent } from './components/filtros-estadisticas/filtros-estadisticas.component';
import { ResumenKpisComponent } from './components/resumen-kpis/resumen-kpis.component';
import { ChartCitasPorPeriodoComponent } from './components/chart-citas-por-periodo/chart-citas-por-periodo.component';
import { ChartEstadosCitaComponent } from './components/chart-estados-cita/chart-estados-cita.component';
import { ChartIngresosComponent } from './components/chart-ingresos/chart-ingresos.component';
import { ResumenCajaDiariaComponent } from './components/resumen-caja-diaria/resumen-caja-diaria.component';
import { ChartPacientesComponent } from './components/chart-pacientes/chart-pacientes.component';
import { InsightsEstadisticasComponent } from './components/insights-estadisticas/insights-estadisticas.component';
import { TablaReportesComponent } from './components/tabla-reportes/tabla-reportes.component';
import { ExportarReporteModalComponent } from './components/exportar-reporte-modal/exportar-reporte-modal.component';

@Component({
  selector: 'app-estadisticas',
  templateUrl: './estadisticas.page.html',
  styleUrls: ['./estadisticas.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    FiltrosEstadisticasComponent,
    ResumenKpisComponent,
    ChartCitasPorPeriodoComponent,
    ChartEstadosCitaComponent,
    ChartIngresosComponent,
    ResumenCajaDiariaComponent,
    ChartPacientesComponent,
    InsightsEstadisticasComponent,
    TablaReportesComponent,
    ExportarReporteModalComponent,
  ],
})
export class EstadisticasPage implements OnInit {
  filtrosActivos?: FiltroEstadisticas;
  kpis: KpiCard[] = [];

  reporteParaExportar: ReporteEstadistica | null = null;
  modalExportarAbierto = false;

  constructor(private svc: EstadisticasMockService) {}

  ngOnInit() {
    const resumen = this.svc.getResumenKpis();
    this.kpis = this.svc.getKpiCards(resumen);
  }

  onFiltrosCambiados(filtros: FiltroEstadisticas) {
    this.filtrosActivos = filtros;
    // TODO: pass filtros to backend; for now refresh with same mock data
    const resumen = this.svc.getResumenKpis();
    this.kpis = this.svc.getKpiCards(resumen);
  }

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
