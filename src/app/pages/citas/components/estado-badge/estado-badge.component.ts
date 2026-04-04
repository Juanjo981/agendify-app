import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EstadoCita, estadoCitaToLabel } from '../../models/cita.model';

@Component({
  selector: 'app-estado-badge',
  templateUrl: './estado-badge.component.html',
  styleUrls: ['./estado-badge.component.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class EstadoBadgeComponent {
  @Input({ required: true }) estado!: EstadoCita;

  get colorClass(): string {
    const map: Record<EstadoCita, string> = {
      PENDIENTE: 'eb--pending',
      CONFIRMADA: 'eb--confirmed',
      COMPLETADA: 'eb--completed',
      CANCELADA: 'eb--cancelled',
      NO_ASISTIO: 'eb--absent',
      REPROGRAMADA: 'eb--postponed',
    };
    return map[this.estado] ?? 'eb--pending';
  }

  get label(): string {
    return estadoCitaToLabel(this.estado);
  }
}
