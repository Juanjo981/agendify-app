import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IonicModule } from '@ionic/angular';
import { InsightEstadistica } from '../../models/estadisticas.model';
import { EstadisticasApiService } from '../../estadisticas.service.api';

@Component({
  selector: 'app-insights-estadisticas',
  templateUrl: './insights-estadisticas.component.html',
  styleUrls: ['./insights-estadisticas.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class InsightsEstadisticasComponent implements OnInit {
  insights: InsightEstadistica[] = [];
  loading = false;
  loadError = false;
  private readonly destroyRef = inject(DestroyRef);

  constructor(private svc: EstadisticasApiService) {}

  ngOnInit() {
    this.svc.filtros$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(filtros => {
        void this.cargarInsights(filtros);
      });
  }

  trackById(_: number, ins: InsightEstadistica): string { return ins.id; }

  private async cargarInsights(filtros: any) {
    this.loading = true;
    this.loadError = false;
    console.debug('[InsightsEstadisticas] cargarInsights filtros:', filtros);
    try {
      const response = await this.svc.getInsights(filtros);
      console.debug('[InsightsEstadisticas] response real /insights:', response);
      this.insights = response ?? [];
    } catch (error) {
      console.error('[InsightsEstadisticas] Error cargando insights:', error);
      this.insights = [];
      this.loadError = true;
    } finally {
      this.loading = false;
    }
  }
}
