import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ChartIngresosComponent } from '../components/chart-ingresos/chart-ingresos.component';
import { ResumenCajaDiariaComponent } from '../components/resumen-caja-diaria/resumen-caja-diaria.component';
import { EstadisticasApiService } from '../estadisticas.service.api';
import { EstadisticasRefreshService } from '../../../shared/refresh/dashboard-module-refresh.services';

@Component({
  selector: 'app-ingresos-estadisticas',
  templateUrl: './ingresos-estadisticas.page.html',
  styleUrls: ['./ingresos-estadisticas.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, ChartIngresosComponent, ResumenCajaDiariaComponent],
})
export class IngresosEstadisticasPage implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private svc: EstadisticasApiService,
    private refresh: EstadisticasRefreshService,
  ) {}

  ngOnInit(): void {
    this.refresh.watchSection('ingresos')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.svc.reloadCurrentFilters();
      });
  }
}
