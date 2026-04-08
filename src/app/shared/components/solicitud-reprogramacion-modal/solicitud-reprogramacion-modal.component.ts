import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { SolicitudReprogramacion } from '../../models/solicitud-reprogramacion.model';

@Component({
  selector: 'app-solicitud-reprogramacion-modal',
  templateUrl: './solicitud-reprogramacion-modal.component.html',
  styleUrls: ['./solicitud-reprogramacion-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
})
export class SolicitudReprogramacionModalComponent {

  @Input() solicitud!: SolicitudReprogramacion;

  /** Emitted when the professional accepts the request. */
  @Output() aceptada  = new EventEmitter<void>();
  /** Emitted when the professional rejects the request; carries optional motivo. */
  @Output() rechazada = new EventEmitter<string>();
  /** Emitted when the professional wants to inspect the calendar before deciding. */
  @Output() verAgenda = new EventEmitter<void>();
  /** Emitted when the modal is simply closed without a decision. */
  @Output() cerrado   = new EventEmitter<void>();

  // ─── Internal state ─────────────────────────────────────────────────────────
  mostrarRechazo = false;
  motivoRechazo  = '';

  // ─── Computed helpers ───────────────────────────────────────────────────────

  get esPendiente(): boolean {
    return this.solicitud?.estado === 'PENDIENTE';
  }

  get fechaFormateada(): string {
    if (!this.solicitud?.fecha_cita) return '';
    // Append T00:00 to avoid UTC→local-day drift
    const d = new Date(this.solicitud.fecha_cita + 'T00:00');
    return d.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  get fechaSugeridaFormateada(): string | null {
    if (!this.solicitud?.fecha_hora_sugerida) return null;
    const d = new Date(this.solicitud.fecha_hora_sugerida);
    const fecha = d.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    const hora = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    return `${fecha} • ${hora}`;
  }

  get tiempoTranscurrido(): string {
    if (!this.solicitud?.fecha_solicitud) return '';
    const diff = Date.now() - new Date(this.solicitud.fecha_solicitud).getTime();
    const mins  = Math.floor(diff / 60000);
    if (mins < 60)  return `hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `hace ${hours}h`;
    const days = Math.floor(hours / 24);
    return `hace ${days} día${days > 1 ? 's' : ''}`;
  }

  // ─── Actions ────────────────────────────────────────────────────────────────

  toggleRechazo(): void {
    this.mostrarRechazo = !this.mostrarRechazo;
    if (!this.mostrarRechazo) this.motivoRechazo = '';
  }

  confirmarRechazo(): void {
    this.rechazada.emit(this.motivoRechazo.trim());
  }

  onAceptar():   void { this.aceptada.emit(); }
  onVerAgenda(): void { this.verAgenda.emit(); }
  onCerrar():    void { this.cerrado.emit(); }
}

