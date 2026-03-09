import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FiltroEstadisticas } from '../models/filtros-estadisticas.model';
import { KpiCard } from '../models/estadisticas.model';
import { EstadisticasMockService } from '../estadisticas.service.mock';
import { FiltrosEstadisticasComponent } from '../components/filtros-estadisticas/filtros-estadisticas.component';
import { ResumenKpisComponent } from '../components/resumen-kpis/resumen-kpis.component';
import { InsightsEstadisticasComponent } from '../components/insights-estadisticas/insights-estadisticas.component';
import { ChartCitasPorPeriodoComponent } from '../components/chart-citas-por-periodo/chart-citas-por-periodo.component';
import { ChartIngresosComponent } from '../components/chart-ingresos/chart-ingresos.component';

@Component({
  selector: 'app-dashboard-estadisticas',
  templateUrl: './dashboard-estadisticas.page.html',
  styleUrls: ['./dashboard-estadisticas.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    FiltrosEstadisticasComponent,
    ResumenKpisComponent,
    InsightsEstadisticasComponent,
    ChartCitasPorPeriodoComponent,
    ChartIngresosComponent,
  ],
})
export class DashboardEstadisticasPage implements OnInit {
  filtrosActivos?: FiltroEstadisticas;
  kpis: KpiCard[] = [];

  constructor(private svc: EstadisticasMockService) {}

  ngOnInit() {
    const resumen = this.svc.getResumenKpis();
    this.kpis = this.svc.getKpiCards(resumen);
  }

  onFiltrosCambiados(filtros: FiltroEstadisticas) {
    this.filtrosActivos = filtros;
    const resumen = this.svc.getResumenKpis();
    this.kpis = this.svc.getKpiCards(resumen);
  }
}
