import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { InsightEstadistica } from '../../models/estadisticas.model';
import { EstadisticasMockService } from '../../estadisticas.service.mock';

@Component({
  selector: 'app-insights-estadisticas',
  templateUrl: './insights-estadisticas.component.html',
  styleUrls: ['./insights-estadisticas.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class InsightsEstadisticasComponent implements OnInit {
  insights: InsightEstadistica[] = [];

  constructor(private svc: EstadisticasMockService) {}

  ngOnInit() {
    this.insights = this.svc.getInsights();
  }

  trackById(_: number, ins: InsightEstadistica): string { return ins.id; }
}
