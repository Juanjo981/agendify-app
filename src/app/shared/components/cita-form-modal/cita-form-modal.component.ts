import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { PacienteDto } from '../../../pages/pacientes/models/paciente.model';
import { getAvatarColor as avatarColorUtil } from '../../utils/avatar.utils';
import { BuscarPacienteModalComponent } from '../../../pages/citas/components/buscar-paciente-modal/buscar-paciente-modal.component';
import { DatePickerFieldComponent } from '../date-picker-field/date-picker-field.component';
import { AgfTimePickerComponent } from '../agf-time-picker/agf-time-picker.component';
import {
  CitaDto,
  DisponibilidadSlot,
  durationInMinutes,
  toDatePart,
  toIsoDateTime,
  toTimePart,
} from '../../../pages/citas/models/cita.model';
import { CitasApiService } from '../../../pages/citas/citas-api.service';
import { mapApiError } from '../../utils/api-error.mapper';

export interface CitaFormData {
  id_paciente: number;
  nombre_paciente: string;
  apellido_paciente: string;
  fecha_inicio: string;
  fecha_fin: string;
  motivo: string;
  notas_internas: string;
  observaciones: string;
  monto: number;
}

export interface CitaFormContext {
  fecha?: string;
  horaInicio?: string;
  horaFin?: string;
}

interface CitaFormInternal {
  id_paciente: number;
  nombre_paciente: string;
  apellido_paciente: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  motivo: string;
  notas_internas: string;
  observaciones: string;
  monto: number;
}

@Component({
  selector: 'app-cita-form-modal',
  templateUrl: './cita-form-modal.component.html',
  styleUrls: ['./cita-form-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    BuscarPacienteModalComponent,
    DatePickerFieldComponent,
    AgfTimePickerComponent,
  ],
})
export class CitaFormModalComponent implements OnInit, OnChanges {
  @Input() context: 'citas' | 'agenda' = 'citas';
  @Input() cita: CitaDto | null = null;
  @Input() prefill: CitaFormContext = {};
  @Input() showContextBanner = false;
  @Input() contextDateLabel = '';
  @Input() saving = false;

  @Output() saved = new EventEmitter<CitaFormData>();
  @Output() cancelled = new EventEmitter<void>();

  form: CitaFormInternal = this.emptyForm();
  errores: Record<string, string> = {};

  pacienteSeleccionado: PacienteDto | null = null;
  mostrarBuscador = false;

  slotsDisponibles: DisponibilidadSlot[] = [];
  slotSugerido: DisponibilidadSlot | null = null;
  loadingSlots = false;
  slotsError = '';
  hayConflicto = false;

  get modo(): 'crear' | 'editar' {
    return this.cita ? 'editar' : 'crear';
  }

  get titulo(): string {
    return this.modo === 'crear' ? 'Nueva cita' : 'Editar cita';
  }

  get subtitleText(): string {
    if (this.context === 'agenda') return 'Creando cita desde Agenda';
    return 'Completa los datos de la cita';
  }

  get mostrarSugerencia(): boolean {
    if (!this.form.fecha) return false;
    return this.loadingSlots || !!this.slotSugerido || !!this.slotsError || this.hayConflicto;
  }

  get duracionActual(): number {
    if (!this.form.hora_inicio || !this.form.hora_fin) return 60;
    const duration = this.diffMinutes(this.form.hora_inicio, this.form.hora_fin);
    return duration > 0 ? duration : 60;
  }

  constructor(private citasService: CitasApiService) {}

  ngOnInit() {
    this.bootstrapForm();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['cita'] && !changes['cita'].firstChange) {
      this.bootstrapForm();
      return;
    }

    if (changes['prefill'] && !changes['prefill'].firstChange && this.modo === 'crear') {
      this.applyPrefill();
      this.onFechaChange();
    }
  }

  onPacienteSeleccionado(p: PacienteDto) {
    this.pacienteSeleccionado = p;
    this.form.id_paciente = p.id_paciente;
    this.form.nombre_paciente = p.nombre;
    this.form.apellido_paciente = p.apellido;
    this.mostrarBuscador = false;
    delete this.errores['paciente'];
  }

  iniciales(p: PacienteDto): string {
    return `${p.apellido.charAt(0)}${p.nombre.charAt(0)}`.toUpperCase();
  }

  avatarColor(nombre: string): string {
    return avatarColorUtil(nombre);
  }

  onFechaChange() {
    delete this.errores['fecha'];
    void this.cargarDisponibilidad();
  }

  onHoraChange() {
    delete this.errores['hora_inicio'];
    delete this.errores['hora_fin'];
    this.validarConflictoHorario();
    if (this.form.fecha) {
      void this.cargarDisponibilidad();
    }
  }

  usarSugerencia() {
    if (!this.slotSugerido) return;
    this.form.hora_inicio = this.slotSugerido.hora_inicio;
    this.form.hora_fin = this.slotSugerido.hora_fin;
    this.hayConflicto = false;
  }

  guardar() {
    if (!this.validar()) return;

    this.saved.emit({
      id_paciente: this.form.id_paciente,
      nombre_paciente: this.form.nombre_paciente,
      apellido_paciente: this.form.apellido_paciente,
      fecha_inicio: toIsoDateTime(this.form.fecha, this.form.hora_inicio),
      fecha_fin: toIsoDateTime(this.form.fecha, this.form.hora_fin),
      motivo: this.form.motivo.trim(),
      notas_internas: this.form.notas_internas.trim(),
      observaciones: this.form.observaciones.trim(),
      monto: Number(this.form.monto || 0),
    });
  }

  private bootstrapForm() {
    if (this.cita) {
      this.form = {
        id_paciente: this.cita.id_paciente,
        nombre_paciente: this.cita.nombre_paciente,
        apellido_paciente: this.cita.apellido_paciente,
        fecha: toDatePart(this.cita.fecha_inicio),
        hora_inicio: toTimePart(this.cita.fecha_inicio),
        hora_fin: toTimePart(this.cita.fecha_fin),
        motivo: this.cita.motivo ?? '',
        notas_internas: this.cita.notas_internas ?? '',
        observaciones: this.cita.observaciones ?? '',
        monto: Number(this.cita.monto ?? 0),
      };
    } else {
      this.form = this.emptyForm();
      this.applyPrefill();
    }

    this.errores = {};
    this.hayConflicto = false;
    this.slotsDisponibles = [];
    this.slotSugerido = null;
    this.slotsError = '';

    if (this.form.fecha) {
      void this.cargarDisponibilidad();
    }
  }

  private applyPrefill() {
    if (this.prefill.fecha) this.form.fecha = this.prefill.fecha;
    if (this.prefill.horaInicio) this.form.hora_inicio = this.prefill.horaInicio;
    if (this.prefill.horaFin) this.form.hora_fin = this.prefill.horaFin;
  }

  private emptyForm(): CitaFormInternal {
    return {
      id_paciente: 0,
      nombre_paciente: '',
      apellido_paciente: '',
      fecha: '',
      hora_inicio: '',
      hora_fin: '',
      motivo: '',
      notas_internas: '',
      observaciones: '',
      monto: 0,
    };
  }

  private validar(): boolean {
    this.errores = {};

    if (this.modo === 'crear' && !this.form.id_paciente) {
      this.errores['paciente'] = 'Selecciona un paciente';
    }
    if (!this.form.fecha) this.errores['fecha'] = 'Fecha requerida';
    if (!this.form.hora_inicio) this.errores['hora_inicio'] = 'Hora inicio requerida';
    if (!this.form.hora_fin) this.errores['hora_fin'] = 'Hora fin requerida';
    if (!this.form.motivo.trim()) this.errores['motivo'] = 'Motivo requerido';
    if (this.form.monto < 0) this.errores['monto'] = 'El monto no puede ser negativo';

    if (this.form.hora_inicio && this.form.hora_fin) {
      const diff = this.diffMinutes(this.form.hora_inicio, this.form.hora_fin);
      if (diff <= 0) this.errores['hora_fin'] = 'Debe ser posterior a la hora inicio';
    }

    this.validarConflictoHorario();
    if (this.hayConflicto) {
      this.errores['hora_inicio'] = 'Horario no disponible para esta fecha';
    }

    return Object.keys(this.errores).length === 0;
  }

  private async cargarDisponibilidad() {
    if (!this.form.fecha) return;

    this.loadingSlots = true;
    this.slotsError = '';

    try {
      const response = await this.citasService.getDisponibilidad({
        fecha: this.form.fecha,
        duracionMinutos: this.duracionActual,
        citaIdExcluir: this.cita?.id_cita,
      });
      this.slotsDisponibles = response.slots ?? [];
      this.slotSugerido = this.slotsDisponibles[0] ?? null;
      this.validarConflictoHorario();
    } catch (err) {
      this.slotsDisponibles = [];
      this.slotSugerido = null;
      this.slotsError = mapApiError(err).userMessage;
      this.hayConflicto = false;
    } finally {
      this.loadingSlots = false;
    }
  }

  private validarConflictoHorario() {
    this.hayConflicto = false;
    if (!this.form.hora_inicio || !this.form.hora_fin || this.slotsDisponibles.length === 0) return;

    const selectedStart = this.normalizeHour(this.form.hora_inicio);
    const selectedEnd = this.normalizeHour(this.form.hora_fin);

    const exists = this.slotsDisponibles.some(
      slot =>
        this.normalizeHour(slot.hora_inicio) === selectedStart &&
        this.normalizeHour(slot.hora_fin) === selectedEnd
    );

    this.hayConflicto = !exists;
  }

  private diffMinutes(start: string, end: string): number {
    const startIso = toIsoDateTime('2000-01-01', this.normalizeHour(start));
    const endIso = toIsoDateTime('2000-01-01', this.normalizeHour(end));
    return durationInMinutes(startIso, endIso);
  }

  private normalizeHour(hour: string): string {
    if (!hour) return '';
    return hour.length >= 5 ? hour.substring(0, 5) : hour;
  }
}
