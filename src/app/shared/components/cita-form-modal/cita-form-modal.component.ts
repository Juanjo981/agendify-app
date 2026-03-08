import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { CitaDto, EstadoCita } from '../../../pages/citas/models/cita.model';
import { PacienteDto } from '../../../pages/pacientes/pacientes.mock';
import { BuscarPacienteModalComponent } from '../../../pages/citas/components/buscar-paciente-modal/buscar-paciente-modal.component';
import { CitasMockService } from '../../../pages/citas/citas.service.mock';
import { DatePickerFieldComponent } from '../date-picker-field/date-picker-field.component';

export type CitaFormData = Omit<CitaDto, 'id_cita' | 'tiene_sesion'>;

/** All data the parent needs to pre-fill from calendar context */
export interface CitaFormContext {
  fecha?: string;
  horaInicio?: string;
  horaFin?: string;
}

@Component({
  selector: 'app-cita-form-modal',
  templateUrl: './cita-form-modal.component.html',
  styleUrls: ['./cita-form-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, BuscarPacienteModalComponent, DatePickerFieldComponent],
})
export class CitaFormModalComponent implements OnInit, OnChanges {
  /**
   * 'citas'  → renders a fixed overlay backdrop (centered modal).
   * 'agenda' → renders inner content only; the parent provides the outer container.
   */
  @Input() context: 'citas' | 'agenda' = 'citas';

  /** Pass a CitaDto to enter edit mode; null/undefined = create mode. */
  @Input() cita: CitaDto | null = null;

  /** Pre-fill values (used when context = 'agenda' and a calendar slot is known) */
  @Input() prefill: CitaFormContext = {};

  /** Whether this instance is "from calendar context" — shows the context banner */
  @Input() showContextBanner = false;

  /** Human-readable label for the context banner (e.g. "Mié 11/03/2026") */
  @Input() contextDateLabel = '';

  @Output() saved    = new EventEmitter<CitaFormData>();
  @Output() cancelled = new EventEmitter<void>();

  // ─────────────────────────────────────────────────────────────
  // Computed
  // ─────────────────────────────────────────────────────────────
  get modo(): 'crear' | 'editar' { return this.cita ? 'editar' : 'crear'; }
  get titulo(): string { return this.modo === 'crear' ? 'Nueva cita' : 'Editar cita'; }
  get subtitleText(): string {
    if (this.context === 'agenda') return 'Creando cita desde Agenda';
    return 'Completa los datos de la cita';
  }

  // ─────────────────────────────────────────────────────────────
  // Form state
  // ─────────────────────────────────────────────────────────────
  form: CitaFormData = this.emptyForm();
  errores: Record<string, string> = {};

  pacienteSeleccionado: PacienteDto | null = null;
  mostrarBuscador = false;

  slotSugerido: { hora_inicio: string; hora_fin: string } | null = null;
  hayConflicto = false;

  readonly estadoOpts: EstadoCita[] = [
    'Pendiente', 'Confirmada', 'Completada', 'Cancelada', 'No asistió', 'Pospuesta',
  ];

  constructor(private citasService: CitasMockService) {}

  get mostrarSugerencia(): boolean {
    if (this.modo !== 'crear' || !this.form.fecha) return false;
    return !this.form.hora_inicio || !this.form.hora_fin || this.hayConflicto;
  }

  // ─────────────────────────────────────────────────────────────
  // Lifecycle
  // ─────────────────────────────────────────────────────────────
  ngOnInit() {
    if (this.cita) {
      const { id_cita, tiene_sesion, ...rest } = this.cita;
      this.form = { ...rest };
    } else {
      this.form = this.emptyForm();
      if (this.prefill.fecha)       { this.form.fecha       = this.prefill.fecha; }
      if (this.prefill.horaInicio)  { this.form.hora_inicio = this.prefill.horaInicio; }
      if (this.prefill.horaFin)     { this.form.hora_fin    = this.prefill.horaFin; }
      if (this.form.hora_inicio && this.form.hora_fin) { this.actualizarDuracion(); }
      if (this.form.fecha) { this.calcularSiguienteSlot(); }
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['prefill'] && !changes['prefill'].firstChange) {
      if (this.modo === 'crear') {
        const p = this.prefill;
        if (p.fecha)      { this.form.fecha       = p.fecha; }
        if (p.horaInicio) { this.form.hora_inicio = p.horaInicio; }
        if (p.horaFin)    { this.form.hora_fin    = p.horaFin; }
        if (this.form.fecha) { this.calcularSiguienteSlot(); }
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Patient selection
  // ─────────────────────────────────────────────────────────────
  onPacienteSeleccionado(p: PacienteDto) {
    this.pacienteSeleccionado = p;
    this.form.id_paciente     = p.id_paciente;
    this.form.nombre_paciente  = p.nombre;
    this.form.apellido_paciente = p.apellido;
    this.mostrarBuscador = false;
    delete this.errores['paciente'];
  }

  iniciales(p: PacienteDto): string {
    return `${p.apellido.charAt(0)}${p.nombre.charAt(0)}`.toUpperCase();
  }

  avatarColor(nombre: string): string {
    const colors = ['#6366f1', '#8b5cf6', '#3b82f6', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444'];
    return colors[nombre.charCodeAt(0) % colors.length];
  }

  // ─────────────────────────────────────────────────────────────
  // Date / time handlers
  // ─────────────────────────────────────────────────────────────
  onFechaChange() {
    this.calcularSiguienteSlot();
    if (this.form.hora_inicio && this.form.hora_fin) { this.detectarConflicto(); }
    delete this.errores['fecha'];
  }

  onHoraChange() {
    this.actualizarDuracion();
    if (this.form.fecha && this.form.hora_inicio && this.form.hora_fin) { this.detectarConflicto(); }
  }

  actualizarDuracion() {
    if (!this.form.hora_inicio || !this.form.hora_fin) return;
    const diff = this.toMin(this.form.hora_fin) - this.toMin(this.form.hora_inicio);
    if (diff > 0) this.form.duracion = diff;
  }

  // ─────────────────────────────────────────────────────────────
  // Smart slot suggestion
  // ─────────────────────────────────────────────────────────────
  calcularSiguienteSlot() {
    this.slotSugerido = null;
    if (!this.form.fecha) return;

    const citasDelDia = this.citasService.getCitas()
      .filter(c => c.fecha === this.form.fecha && c.estado !== 'Cancelada');

    const duracion = this.form.duracion > 0 ? this.form.duracion : 60;
    const ocupados = citasDelDia
      .map(c => ({ inicio: this.toMin(c.hora_inicio), fin: this.toMin(c.hora_fin) }))
      .sort((a, b) => a.inicio - b.inicio);

    let cursor = 8 * 60;
    for (const bloque of ocupados) {
      if (cursor + duracion <= bloque.inicio) {
        this.slotSugerido = { hora_inicio: this.toTime(cursor), hora_fin: this.toTime(cursor + duracion) };
        return;
      }
      if (bloque.fin > cursor) { cursor = bloque.fin; }
    }
    if (cursor + duracion <= 20 * 60) {
      this.slotSugerido = { hora_inicio: this.toTime(cursor), hora_fin: this.toTime(cursor + duracion) };
    }
  }

  detectarConflicto() {
    this.hayConflicto = false;
    if (!this.form.fecha || !this.form.hora_inicio || !this.form.hora_fin) return;
    const inicio = this.toMin(this.form.hora_inicio);
    const fin    = this.toMin(this.form.hora_fin);
    this.hayConflicto = this.citasService.getCitas()
      .filter(c => c.fecha === this.form.fecha && c.estado !== 'Cancelada')
      .some(c => inicio < this.toMin(c.hora_fin) && fin > this.toMin(c.hora_inicio));
  }

  usarSugerencia() {
    if (!this.slotSugerido) return;
    this.form.hora_inicio = this.slotSugerido.hora_inicio;
    this.form.hora_fin    = this.slotSugerido.hora_fin;
    this.hayConflicto     = false;
    this.actualizarDuracion();
    delete this.errores['hora_inicio'];
    delete this.errores['hora_fin'];
  }

  // ─────────────────────────────────────────────────────────────
  // Validation & submit
  // ─────────────────────────────────────────────────────────────
  validar(): boolean {
    this.errores = {};
    if (!this.pacienteSeleccionado && this.modo === 'crear') {
      this.errores['paciente'] = 'Selecciona un paciente';
    }
    if (!this.form.fecha)        { this.errores['fecha'] = 'Fecha requerida'; }
    if (!this.form.hora_inicio)  { this.errores['hora_inicio'] = 'Hora inicio requerida'; }
    if (!this.form.hora_fin)     { this.errores['hora_fin'] = 'Hora fin requerida'; }
    if (this.form.hora_inicio && this.form.hora_fin &&
        this.form.hora_fin <= this.form.hora_inicio) {
      this.errores['hora_fin'] = 'Debe ser posterior a la hora inicio';
    }
    if (!this.form.motivo.trim()) { this.errores['motivo'] = 'Motivo requerido'; }
    return Object.keys(this.errores).length === 0;
  }

  guardar() {
    if (!this.validar()) return;
    this.saved.emit({ ...this.form });
  }

  // ─────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────
  private emptyForm(): CitaFormData {
    return {
      id_paciente: 0, nombre_paciente: '', apellido_paciente: '',
      fecha: '', hora_inicio: '', hora_fin: '', duracion: 60,
      motivo: '', notas_rapidas: '', estado: 'Pendiente',
      estado_pago: 'Pendiente', metodo_pago: '', monto: 0, monto_pagado: 0,
    };
  }

  private toMin(t: string): number {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  }

  private toTime(min: number): string {
    return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
  }
}
