import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { CitaDto } from '../../models/cita.model';
import { EstadoBadgeComponent } from '../estado-badge/estado-badge.component';
import { PagoBadgeComponent } from '../pago-badge/pago-badge.component';

@Component({
  selector: 'app-cita-card',
  templateUrl: './cita-card.component.html',
  styleUrls: ['./cita-card.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, EstadoBadgeComponent, PagoBadgeComponent],
})
export class CitaCardComponent {
  @Input({ required: true }) cita!: CitaDto;
  @Output() ver = new EventEmitter<CitaDto>();
  @Output() editar = new EventEmitter<CitaDto>();

  get pacienteNombre(): string {
    return `${this.cita.apellido_paciente}, ${this.cita.nombre_paciente}`;
  }

  get iniciales(): string {
    return `${this.cita.apellido_paciente.charAt(0)}${this.cita.nombre_paciente.charAt(0)}`.toUpperCase();
  }

  formatFecha(iso: string): string {
    if (!iso) return '—';
    const [, m, d] = iso.split('-');
    const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    return `${parseInt(d)} ${meses[parseInt(m) - 1]}`;
  }

  formatMonto(n: number): string {
    return `€${n.toFixed(2)}`;
  }
}
