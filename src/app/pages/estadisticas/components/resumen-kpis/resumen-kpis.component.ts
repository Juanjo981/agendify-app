import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { KpiCard } from '../../models/estadisticas.model';
import { CurrencyPreferenceService } from 'src/app/services/currency-preference.service';

@Component({
  selector: 'app-resumen-kpis',
  templateUrl: './resumen-kpis.component.html',
  styleUrls: ['./resumen-kpis.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class ResumenKpisComponent {
  constructor(private currencyPreference: CurrencyPreferenceService) {}

  @Input() kpis: KpiCard[] = [];

  formatValor(kpi: KpiCard): string {
    const v = kpi.valor;
    if (typeof v === 'number') {
      if (kpi.sufijo === 'currency') {
        return this.currencyPreference.format(v, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
      }
      if (kpi.sufijo === '%') {
        return v.toFixed(1) + '%';
      }
      return v.toString();
    }
    return v;
  }

  tendenciaLabel(kpi: KpiCard): string {
    if (!kpi.tendencia) return '';
    const sign = kpi.tendencia.direccion === 'up' ? '+' : '-';
    return `${sign}${kpi.tendencia.valor}% ${kpi.tendencia.label}`;
  }
}
