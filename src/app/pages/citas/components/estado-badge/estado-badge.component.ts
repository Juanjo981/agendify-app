import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EstadoCita } from '../../models/cita.model';

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
      'Pendiente':   'eb--pending',
      'Confirmada':  'eb--confirmed',
      'Completada':  'eb--completed',
      'Cancelada':   'eb--cancelled',
      'No asistió':  'eb--absent',
      'Pospuesta':   'eb--postponed',
    };
    return map[this.estado] ?? 'eb--pending';
  }
}
