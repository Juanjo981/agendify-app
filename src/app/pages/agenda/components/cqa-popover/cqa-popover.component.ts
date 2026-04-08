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
  | 'eliminar'
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
    CONFIRMADA: 'cpop-badge--confirmada',
    COMPLETADA: 'cpop-badge--completada',
    PENDIENTE:  'cpop-badge--pendiente',
    CANCELADA:  'cpop-badge--cancelada',
    NO_ASISTIO: 'cpop-badge--no-asistio',
    REPROGRAMADA:  'cpop-badge--pospuesta',
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
    const e = this.citaActiva.estado_cita;
    if (action === 'completada') return e === 'COMPLETADA';
    if (action === 'noAsistio')  return e === 'NO_ASISTIO';
    if (action === 'cancelar')   return e === 'CANCELADA';
    if (action === 'eliminar')   return e === 'COMPLETADA';
    return false;
  }

  get showCrearSesion(): boolean {
    return this.citaActiva.estado_cita === 'COMPLETADA' && !this.citaActiva.tiene_sesion;
  }
}
