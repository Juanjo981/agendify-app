import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, PopoverController } from '@ionic/angular';
import { CitaDto } from '../../../citas/models/cita.model';

export type CqaAction =
  | 'verDetalle'
  | 'paciente'
  | 'reprogramar'
  | 'completada'
  | 'noAsistio'
  | 'cancelar'
  | 'crearSesion';

@Component({
  selector: 'app-cqa-popover',
  templateUrl: './cqa-popover.component.html',
  styleUrls: ['./cqa-popover.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class CqaPopoverComponent {

  @Input() citaActiva!: CitaDto;

  readonly estadoClaseMap: Record<string, string> = {
    'Confirmada': 'cpop-badge--confirmada',
    'Completada': 'cpop-badge--completada',
    'Pendiente':  'cpop-badge--pendiente',
    'Cancelada':  'cpop-badge--cancelada',
    'No asistió': 'cpop-badge--no-asistio',
    'Pospuesta':  'cpop-badge--pospuesta',
  };

  constructor(private popoverCtrl: PopoverController) {}

  act(action: CqaAction) {
    this.popoverCtrl.dismiss({ action });
  }

  get iniciales(): string {
    return (
      (this.citaActiva.nombre_paciente.charAt(0) ?? '') +
      (this.citaActiva.apellido_paciente.charAt(0) ?? '')
    ).toUpperCase();
  }

  isDisabled(action: CqaAction): boolean {
    const e = this.citaActiva.estado;
    if (action === 'completada') return e === 'Completada';
    if (action === 'noAsistio')  return e === 'No asistió';
    if (action === 'cancelar')   return e === 'Cancelada';
    return false;
  }

  get showCrearSesion(): boolean {
    return this.citaActiva.estado === 'Completada' && !this.citaActiva.tiene_sesion;
  }
}
