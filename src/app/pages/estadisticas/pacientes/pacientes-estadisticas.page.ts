import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ChartPacientesComponent } from '../components/chart-pacientes/chart-pacientes.component';
import { EstadisticasApiService } from '../estadisticas.service.api';
import { EstadisticasRefreshService } from '../../../shared/refresh/dashboard-module-refresh.services';

@Component({
  selector: 'app-pacientes-estadisticas',
  templateUrl: './pacientes-estadisticas.page.html',
  styleUrls: ['./pacientes-estadisticas.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, ChartPacientesComponent],
})
export class PacientesEstadisticasPage implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private svc: EstadisticasApiService,
    private refresh: EstadisticasRefreshService,
  ) {}

  ngOnInit(): void {
    this.refresh.watchSection('pacientes')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.svc.reloadCurrentFilters();
      });
  }
}
