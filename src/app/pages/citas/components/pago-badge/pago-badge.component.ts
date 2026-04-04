import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EstadoPago, estadoPagoToLabel } from '../../models/cita.model';

@Component({
  selector: 'app-pago-badge',
  templateUrl: './pago-badge.component.html',
  styleUrls: ['./pago-badge.component.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class PagoBadgeComponent {
  @Input({ required: true }) estado!: EstadoPago;

  get colorClass(): string {
    const map: Record<EstadoPago, string> = {
      PENDIENTE: 'pb--pending',
      PARCIAL: 'pb--partial',
      PAGADO: 'pb--paid',
      NO_APLICA: 'pb--na',
      REEMBOLSADO: 'pb--refund',
    };
    return map[this.estado] ?? 'pb--pending';
  }

  get label(): string {
    return estadoPagoToLabel(this.estado);
  }
}
