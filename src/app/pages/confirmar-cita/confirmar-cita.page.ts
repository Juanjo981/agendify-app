import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';

/** All possible screen states for the page. */
export type VistaEstado =
  | 'pendiente'
  | 'reprogramar'
  | 'cancelar'
  | 'confirmada'
  | 'cancelada'
  | 'reprogramada'
  | 'expirado';

/** Shape of appointment data — will come from API via /:token. */
export interface ConfirmarCitaData {
  nombrePaciente:     string;
  inicialesPaciente:  string;
  avatarColor:        string;
  profesional:        string;
  especialidad:       string;
  fechaLarga:         string;
  fechaCorta:         string;
  horaInicio:         string;
  horaFin:            string;
  modalidad:          'Presencial' | 'Virtual';
  ubicacion:          string;
  diasRestantes:      number;
}

@Component({
  selector:    'app-confirmar-cita',
  standalone:   true,
  imports:     [CommonModule, IonicModule, FormsModule],
  templateUrl: './confirmar-cita.page.html',
  styleUrls:   ['./confirmar-cita.page.scss'],
})
export class ConfirmarCitaPage {

  /** Current screen state. Change this to preview any state. */
  vista: VistaEstado = 'pendiente';

  /** Index of the selected suggested slot (0-2), null = none. */
  slotSeleccionado: number | null = null;

  /** Text typed by the patient in the reschedule textarea. */
  motivoReprogramacion = '';

  /** Mock data — replace with data fetched from API using the URL :token param. */
  cita: ConfirmarCitaData = {
    nombrePaciente:    'María García',
    inicialesPaciente: 'MG',
    avatarColor:       '#6366f1',
    profesional:       'Dr. Carlos Mendoza',
    especialidad:      'Psicología clínica',
    fechaLarga:        'Martes, 17 de marzo de 2026',
    fechaCorta:        'Mar 17 de marzo',
    horaInicio:        '10:00',
    horaFin:           '11:00',
    modalidad:         'Presencial',
    ubicacion:         'Av. Insurgentes Sur 1234, Piso 5, CDMX',
    diasRestantes:     2,
  };

  // ── Status badge computed values ────────────────────────────────────────────
  get statusLabel(): string {
    const map: Record<VistaEstado, string> = {
      pendiente:    'Pendiente',
      reprogramar:  'Pendiente',
      cancelar:     'Pendiente',
      confirmada:   'Confirmada',
      cancelada:    'Cancelada',
      reprogramada: 'Solicitud enviada',
      expirado:     '',
    };
    return map[this.vista];
  }

  get statusIcon(): string {
    if (this.vista === 'confirmada')   return 'checkmark-circle';
    if (this.vista === 'cancelada')    return 'close-circle';
    if (this.vista === 'reprogramada') return 'calendar';
    return 'time-outline';
  }

  // ── Actions ─────────────────────────────────────────────────────────────────
  confirmar(): void            { this.vista = 'confirmada'; }
  irAReprogramar(): void       { this.vista = 'reprogramar'; }
  irACancelar(): void          { this.vista = 'cancelar'; }
  cancelarCita(): void         { this.vista = 'cancelada'; }
  enviarReprogramacion(): void { this.vista = 'reprogramada'; }
  volver(): void               { this.vista = 'pendiente'; }
}
