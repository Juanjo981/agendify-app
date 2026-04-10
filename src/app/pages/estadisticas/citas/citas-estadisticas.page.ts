import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ChartCitasPorPeriodoComponent } from '../components/chart-citas-por-periodo/chart-citas-por-periodo.component';
import { ChartEstadosCitaComponent } from '../components/chart-estados-cita/chart-estados-cita.component';
import { ChartCitasResumenComponent } from '../components/chart-citas-resumen/chart-citas-resumen.component';
import { EstadisticasApiService } from '../estadisticas.service.api';
import { EstadisticasRefreshService } from '../../../shared/refresh/dashboard-module-refresh.services';

@Component({
  selector: 'app-citas-estadisticas',
  templateUrl: './citas-estadisticas.page.html',
  styleUrls: ['./citas-estadisticas.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, ChartCitasPorPeriodoComponent, ChartEstadosCitaComponent, ChartCitasResumenComponent],
})
export class CitasEstadisticasPage implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private svc: EstadisticasApiService,
    private refresh: EstadisticasRefreshService,
  ) {}

  ngOnInit(): void {
    this.refresh.watchSection('citas')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.svc.reloadCurrentFilters();
      });
  }
}
