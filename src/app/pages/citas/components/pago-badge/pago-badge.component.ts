import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EstadoPago } from '../../models/cita.model';

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
      'Pendiente': 'pb--pending',
      'Parcial':   'pb--partial',
      'Pagado':    'pb--paid',
    };
    return map[this.estado] ?? 'pb--pending';
  }
}
