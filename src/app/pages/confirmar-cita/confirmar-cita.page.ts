import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { mapApiError } from 'src/app/shared/utils/api-error.mapper';
import {
  CitaGestionPublicaResponseDto,
  ConfirmacionPublicaService,
  DisponibilidadPublicaResponseDto,
} from './confirmacion-publica.service';

export type VistaEstado =
  | 'pendiente'
  | 'reprogramar'
  | 'cancelar'
  | 'confirmada'
  | 'cancelada'
  | 'reprogramada'
  | 'expirado';

interface ConfirmarCitaData {
  nombrePaciente: string;
  inicialesPaciente: string;
  avatarColor: string;
  profesional: string;
  especialidad: string;
  fechaLarga: string;
  fechaCorta: string;
  horaInicio: string;
  horaFin: string;
  modalidad: 'Presencial' | 'Virtual';
  ubicacion: string;
  diasRestantes: number;
}

interface SlotSugerido {
  fecha: string;
  horaInicio: string;
  horaFin: string;
  fechaLabel: string;
  horaLabel: string;
}

@Component({
  selector: 'app-confirmar-cita',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule],
  templateUrl: './confirmar-cita.page.html',
  styleUrls: ['./confirmar-cita.page.scss'],
})
export class ConfirmarCitaPage implements OnInit {
  vista: VistaEstado = 'pendiente';
  slotSeleccionado: number | null = null;
  motivoReprogramacion = '';
  token = '';
  accionLoading = false;
  loadingSlots = false;
  slotsError = '';
  expiredTitle = 'Enlace no valido';
  expiredMessage = 'Este enlace ha expirado o ya no esta disponible.';

  puedeConfirmar = false;
  puedeCancelar = false;
  puedeSolicitarReprogramacion = false;

  cita: ConfirmarCitaData = {
    nombrePaciente: '',
    inicialesPaciente: '',
    avatarColor: '#6366f1',
    profesional: '',
    especialidad: '',
    fechaLarga: '',
    fechaCorta: '',
    horaInicio: '',
    horaFin: '',
    modalidad: 'Presencial',
    ubicacion: '',
    diasRestantes: 0,
  };

  slotsSugeridos: SlotSugerido[] = [];
  private citaResponse: CitaGestionPublicaResponseDto | null = null;

  constructor(
    private route: ActivatedRoute,
    private confirmacionPublicaSvc: ConfirmacionPublicaService,
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    if (!this.token) {
      this.setExpiredState('Enlace no valido', 'No se encontro un token valido para gestionar esta cita.');
      return;
    }

    void this.cargarCita();
  }

  get statusLabel(): string {
    const map: Record<VistaEstado, string> = {
      pendiente: 'Pendiente',
      reprogramar: 'Pendiente',
      cancelar: 'Pendiente',
      confirmada: 'Confirmada',
      cancelada: 'Cancelada',
      reprogramada: 'Solicitud enviada',
      expirado: '',
    };
    return map[this.vista];
  }

  get statusIcon(): string {
    if (this.vista === 'confirmada') return 'checkmark-circle';
    if (this.vista === 'cancelada') return 'close-circle';
    if (this.vista === 'reprogramada') return 'calendar';
    return 'time-outline';
  }

  async confirmar(): Promise<void> {
    if (this.accionLoading || !this.puedeConfirmar) return;

    this.accionLoading = true;
    try {
      const response = await this.confirmacionPublicaSvc.confirmar(this.token);
      this.aplicarAccion(response, 'confirmada');
    } catch (error) {
      this.manejarError(error);
    } finally {
      this.accionLoading = false;
    }
  }

  irAReprogramar(): void {
    if (!this.puedeSolicitarReprogramacion || this.accionLoading) return;
    this.vista = 'reprogramar';
    if (this.slotsSugeridos.length === 0 && !this.loadingSlots) {
      void this.cargarDisponibilidadPublica();
    }
  }

  irACancelar(): void {
    if (!this.puedeCancelar || this.accionLoading) return;
    this.vista = 'cancelar';
  }

  async cancelarCita(): Promise<void> {
    if (this.accionLoading || !this.puedeCancelar) return;

    this.accionLoading = true;
    try {
      const response = await this.confirmacionPublicaSvc.cancelar(this.token);
      this.aplicarAccion(response, 'cancelada');
    } catch (error) {
      this.manejarError(error);
    } finally {
      this.accionLoading = false;
    }
  }

  async enviarReprogramacion(): Promise<void> {
    if (this.accionLoading || !this.puedeSolicitarReprogramacion || this.slotSeleccionado === null) return;

    const slot = this.slotsSugeridos[this.slotSeleccionado];
    if (!slot) return;

    this.accionLoading = true;
    try {
      await this.confirmacionPublicaSvc.solicitarReprogramacion(this.token, {
        fecha_solicitada: slot.fecha,
        hora_inicio_solicitada: this.toBackendTime(slot.horaInicio),
        hora_fin_solicitada: this.toBackendTime(slot.horaFin),
        motivo: this.motivoReprogramacion.trim() || 'Solicitud enviada desde la pagina publica.',
      });
      this.vista = 'reprogramada';
      this.puedeConfirmar = false;
      this.puedeCancelar = false;
      this.puedeSolicitarReprogramacion = false;
    } catch (error) {
      this.manejarError(error);
    } finally {
      this.accionLoading = false;
    }
  }

  volver(): void {
    this.vista = 'pendiente';
  }

  private async cargarCita(): Promise<void> {
    try {
      const response = await this.confirmacionPublicaSvc.getByToken(this.token);
      this.aplicarPayload(response);
    } catch (error) {
      this.manejarError(error);
    }
  }

  private aplicarPayload(response: CitaGestionPublicaResponseDto): void {
    this.citaResponse = response;
    this.cita = this.mapCita(response);
    this.puedeConfirmar = !!response.puede_confirmar;
    this.puedeCancelar = !!response.puede_cancelar;
    this.puedeSolicitarReprogramacion = !!response.puede_solicitar_reprogramacion;
    this.slotsSugeridos = [];
    this.slotSeleccionado = null;
    this.slotsError = '';

    if (!response.token_valido) {
      this.aplicarEstadoTokenInvalido(response);
      return;
    }

    this.vista = 'pendiente';
    if (this.puedeSolicitarReprogramacion) {
      void this.cargarDisponibilidadPublica();
    }
  }

  private aplicarEstadoTokenInvalido(response: CitaGestionPublicaResponseDto): void {
    const accion = (response.accion_realizada ?? '').toLowerCase();

    if (accion === 'confirmada') {
      this.vista = 'confirmada';
      return;
    }

    if (accion === 'cancelada') {
      this.vista = 'cancelada';
      return;
    }

    if (accion.includes('reprogram')) {
      this.vista = 'reprogramada';
      return;
    }

    if (accion === 'expirado') {
      this.setExpiredState('Enlace expirado', 'Este enlace ha expirado y ya no puede usarse para gestionar la cita.');
      return;
    }

    this.setExpiredState('Cita ya procesada', 'Esta cita ya fue gestionada previamente con este enlace.');
  }

  private aplicarAccion(response: CitaGestionPublicaResponseDto, vista: Extract<VistaEstado, 'confirmada' | 'cancelada'>): void {
    this.citaResponse = { ...this.citaResponse, ...response } as CitaGestionPublicaResponseDto;

    if (response.fecha_inicio && this.citaResponse) {
      this.cita = this.mapCita(this.citaResponse);
    }
    this.vista = vista;
    this.puedeConfirmar = false;
    this.puedeCancelar = false;
    this.puedeSolicitarReprogramacion = false;
  }

  private async cargarDisponibilidadPublica(): Promise<void> {
    if (!this.citaResponse) {
      this.slotsSugeridos = [];
      this.slotSeleccionado = null;
      return;
    }

    const source = this.mapCitaDuration(this.citaResponse);
    if (!source) {
      this.slotsSugeridos = [];
      this.slotSeleccionado = null;
      return;
    }

    this.loadingSlots = true;
    this.slotsError = '';

    try {
      const slots = await this.collectSlots(source.fechaInicio, source.duracionMinutos);
      this.slotsSugeridos = slots;
      this.slotSeleccionado = slots.length > 0 ? 0 : null;
    } catch (error) {
      this.slotsSugeridos = [];
      this.slotSeleccionado = null;
      this.slotsError = mapApiError(error).userMessage;
    } finally {
      this.loadingSlots = false;
    }
  }

  private async collectSlots(fechaInicio: string, duracionMinutos: number): Promise<SlotSugerido[]> {
    const start = new Date(fechaInicio);
    const slots: SlotSugerido[] = [];

    for (let dayOffset = 1; slots.length < 3 && dayOffset <= 14; dayOffset++) {
      const nextDate = new Date(start);
      nextDate.setDate(nextDate.getDate() + dayOffset);

      const day = nextDate.getDay();
      if (day === 0 || day === 6) {
        continue;
      }

      const disponibilidad = await this.confirmacionPublicaSvc.getDisponibilidad(this.token, {
        fecha: this.toDateOnly(nextDate),
        duracionMinutos,
      });

      const mapped = this.mapDisponibilidad(disponibilidad);
      for (const slot of mapped) {
        slots.push(slot);
        if (slots.length === 3) {
          break;
        }
      }
    }

    return slots;
  }

  private mapDisponibilidad(response: DisponibilidadPublicaResponseDto): SlotSugerido[] {
    const fecha = response.fecha;
    const date = new Date(`${fecha}T00:00:00`);

    return (response.slots ?? []).map(slot => ({
      fecha,
      horaInicio: this.normalizeHour(slot.hora_inicio),
      horaFin: this.normalizeHour(slot.hora_fin),
      fechaLabel: this.formatSlotDate(date),
      horaLabel: `${this.normalizeHour(slot.hora_inicio)} – ${this.normalizeHour(slot.hora_fin)}`,
    }));
  }

  private manejarError(error: unknown): void {
    const mapped = mapApiError(error);
    if (mapped.status === 404) {
      this.setExpiredState('Enlace no valido', 'Este enlace no es valido o ya no esta disponible.');
      return;
    }

    this.setExpiredState('No pudimos procesar tu solicitud', mapped.userMessage);
  }

  private setExpiredState(title: string, message: string): void {
    this.expiredTitle = title;
    this.expiredMessage = message;
    this.puedeConfirmar = false;
    this.puedeCancelar = false;
    this.puedeSolicitarReprogramacion = false;
    this.vista = 'expirado';
  }

  private mapCita(response: CitaGestionPublicaResponseDto): ConfirmarCitaData {
    const start = new Date(response.fecha_inicio);
    const end = new Date(response.fecha_fin);
    const nombrePaciente = response.paciente_nombre ?? 'Paciente';
    const modalidad = this.detectModalidad(response);

    return {
      nombrePaciente,
      inicialesPaciente: this.getInitials(nombrePaciente),
      avatarColor: '#6366f1',
      profesional: response.profesional_nombre ?? 'Profesional',
      especialidad: response.profesional_especialidad ?? '',
      fechaLarga: this.formatLongDate(start),
      fechaCorta: this.formatShortDate(start),
      horaInicio: this.formatTime(start),
      horaFin: this.formatTime(end),
      modalidad,
      ubicacion: modalidad === 'Presencial' ? (response.nombre_consulta ?? '') : '',
      diasRestantes: this.computeDaysLeft(start),
    };
  }

  private mapCitaDuration(response: CitaGestionPublicaResponseDto): { fechaInicio: string; duracionMinutos: number } | null {
    const start = new Date(response.fecha_inicio);
    const end = new Date(response.fecha_fin);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return null;
    }

    return {
      fechaInicio: response.fecha_inicio,
      duracionMinutos: Math.max(Math.round((end.getTime() - start.getTime()) / 60000), 1),
    };
  }

  private detectModalidad(response: CitaGestionPublicaResponseDto): 'Presencial' | 'Virtual' {
    const source = `${response.nombre_consulta ?? ''} ${response.motivo ?? ''}`.toLowerCase();
    return source.includes('virtual') || source.includes('online') ? 'Virtual' : 'Presencial';
  }

  private getInitials(nombre: string): string {
    const parts = nombre.split(' ').filter(Boolean);
    return parts.slice(0, 2).map(part => part.charAt(0).toUpperCase()).join('') || 'PA';
  }

  private computeDaysLeft(start: Date): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(start);
    target.setHours(0, 0, 0, 0);
    return Math.max(Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)), 0);
  }

  private formatLongDate(date: Date): string {
    return new Intl.DateTimeFormat('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  }

  private formatShortDate(date: Date): string {
    return new Intl.DateTimeFormat('es-MX', {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
    }).format(date);
  }

  private formatSlotDate(date: Date): string {
    return new Intl.DateTimeFormat('es-MX', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    }).format(date);
  }

  private formatTime(date: Date): string {
    return new Intl.DateTimeFormat('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  }

  private toDateOnly(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private toBackendTime(value: string): string {
    return `${value}:00`;
  }

  private normalizeHour(value: string): string {
    return String(value ?? '').slice(0, 5);
  }
}
