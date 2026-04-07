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
    try {
      this.insights = await this.svc.getInsights(filtros);
    } catch {
      this.insights = [{
        id: 'insight-error',
        icono: 'alert-circle-outline',
        titulo: 'Insights no disponibles',
        valor: 'Sin datos',
        descripcion: 'No fue posible obtener insights para este período.',
        tipo: 'warning',
      }];
    }
  }
}
