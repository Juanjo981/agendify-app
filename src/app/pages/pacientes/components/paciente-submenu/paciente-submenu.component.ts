import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

export type SeccionPaciente = 'informacion' | 'notas' | 'sesiones' | 'historial';

interface SubmenuItem {
  key: SeccionPaciente;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-paciente-submenu',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './paciente-submenu.component.html',
  styleUrls: ['./paciente-submenu.component.scss']
})
export class PacienteSubmenuComponent {
  @Input() seccionActiva: SeccionPaciente = 'informacion';
  @Output() seccionCambiada = new EventEmitter<SeccionPaciente>();

  items: SubmenuItem[] = [
    { key: 'informacion', label: 'Información', icon: 'person-outline' },
    { key: 'notas',       label: 'Notas',       icon: 'document-text-outline' },
    { key: 'sesiones',    label: 'Sesiones',    icon: 'pulse-outline' },
    { key: 'historial',   label: 'Historial',   icon: 'time-outline' },
  ];

  seleccionar(key: SeccionPaciente): void {
    this.seccionCambiada.emit(key);
  }
}
