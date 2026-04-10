import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FiltroEstadisticas } from '../models/filtros-estadisticas.model';
import { KpiCard } from '../models/estadisticas.model';
import { EstadisticasApiService } from '../estadisticas.service.api';
import { FiltrosEstadisticasComponent } from '../components/filtros-estadisticas/filtros-estadisticas.component';
import { ResumenKpisComponent } from '../components/resumen-kpis/resumen-kpis.component';
import { InsightsEstadisticasComponent } from '../components/insights-estadisticas/insights-estadisticas.component';
import { ChartCitasPorPeriodoComponent } from '../components/chart-citas-por-periodo/chart-citas-por-periodo.component';
import { ChartIngresosComponent } from '../components/chart-ingresos/chart-ingresos.component';
import { EstadisticasRefreshService } from '../../../shared/refresh/dashboard-module-refresh.services';

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
  private readonly destroyRef = inject(DestroyRef);
  filtrosActivos?: FiltroEstadisticas;
  kpis: KpiCard[] = [];
  cargando = false;

  constructor(
    private svc: EstadisticasApiService,
    private refresh: EstadisticasRefreshService,
  ) {}

  ngOnInit() {
    this.refresh.watchSection('dashboard')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.svc.reloadCurrentFilters();
        this.filtrosActivos = this.svc.filtrosActuales;
        void this.cargarResumen(this.filtrosActivos);
      });

    this.filtrosActivos = this.svc.filtrosActuales;
    void this.cargarResumen(this.filtrosActivos);
  }

  onFiltrosCambiados(filtros: FiltroEstadisticas) {
    this.filtrosActivos = filtros;
    this.svc.setFiltros(filtros);
    void this.cargarResumen(filtros);
  }

  private async cargarResumen(filtros: FiltroEstadisticas) {
    this.cargando = true;
    try {
      const resumen = await this.svc.getResumenKpis(filtros);
      this.kpis = this.svc.buildKpiCards(resumen);
    } catch {
      this.kpis = [
        { id: 'citas-hoy', label: 'Citas hoy', valor: 'No disponible', icono: 'calendar-outline', color: 'primary' },
        { id: 'citas-mes', label: 'Citas este mes', valor: 'No disponible', icono: 'calendar-number-outline', color: 'info' },
        { id: 'pacientes-nuevos', label: 'Pacientes nuevos', valor: 'No disponible', icono: 'person-add-outline', color: 'success' },
        { id: 'pacientes-recurrentes', label: 'Recurrentes', valor: 'No disponible', icono: 'people-outline', color: 'purple' },
      ];
    } finally {
      this.cargando = false;
    }
  }
}
