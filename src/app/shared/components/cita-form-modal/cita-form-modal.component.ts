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
import { TimeSlotPickerComponent, TimeSlotSelection } from '../time-slot-picker.component';
import { QuickMotivesComponent } from '../quick-motives.component';
import {
  CitaDto,
  TipoPago,
  durationInMinutes,
  isTipoPago,
  normalizeTipoPagoValue,
  toDatePart,
  toIsoDateTime,
  toTimePart,
} from '../../../pages/citas/models/cita.model';
import { CitasApiService } from '../../../pages/citas/citas-api.service';
import { mapApiError } from '../../utils/api-error.mapper';
import { ConfiguracionApiService } from '../../../services/configuracion-api.service';
import { ConfiguracionAgendaDto } from '../../models/configuracion.models';

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
  tipoPago?: TipoPago;
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
  tipoPago: TipoPago | '';
}

interface TipoPagoOption {
  value: TipoPago;
  label: string;
  icon: string;
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
    TimeSlotPickerComponent,
    QuickMotivesComponent,
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

  configuracionAgenda: ConfiguracionAgendaDto | null = null;
  citasDelDia: CitaDto[] = [];
  loadingSlots = false;
  slotsError = '';
  hayConflicto = false;
  motivosFrecuentes: string[] = [];

  readonly tipoPagoOptions: TipoPagoOption[] = [
    { value: 'EFECTIVO', label: 'Efectivo', icon: 'cash-outline' },
    { value: 'TRANSFERENCIA', label: 'Transferencia', icon: 'swap-horizontal-outline' },
    { value: 'TARJETA', label: 'Tarjeta', icon: 'card-outline' },
    { value: 'OTRO', label: 'Otro', icon: 'ellipsis-horizontal-outline' },
  ];

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

  get duracionActual(): number {
    if (!this.form.hora_inicio || !this.form.hora_fin) return 60;
    const duration = this.diffMinutes(this.form.hora_inicio, this.form.hora_fin);
    return duration > 0 ? duration : 60;
  }

  constructor(
    private citasService: CitasApiService,
    private configuracionService: ConfiguracionApiService,
  ) {}

  ngOnInit() {
    this.bootstrapForm();
    void this.cargarMotivosFrecuentes();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['cita'] && !changes['cita'].firstChange) {
      this.bootstrapForm();
      return;
    }

    if (changes['prefill'] && !changes['prefill'].firstChange && this.modo === 'crear') {
      this.applyPrefill();
      this.onFechaChange(false);
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

  onFechaChange(clearTime = true) {
    delete this.errores['fecha'];
    if (clearTime) {
      this.form.hora_inicio = '';
      this.form.hora_fin = '';
    }
    void this.cargarDatosHorario();
  }

  onHoraChange() {
    delete this.errores['hora_inicio'];
    delete this.errores['hora_fin'];
  }

  onSlotSeleccionado(slot: TimeSlotSelection) {
    this.form.hora_inicio = slot.horaInicio;
    this.form.hora_fin = slot.horaFin;
    this.hayConflicto = false;
    this.onHoraChange();
  }

  onMotivoFrecuenteSeleccionado(motivo: string) {
    this.form.motivo = motivo;
    delete this.errores['motivo'];
  }

  onTipoPagoSeleccionado(tipoPago: TipoPago) {
    this.form.tipoPago = this.form.tipoPago === tipoPago ? '' : tipoPago;
    delete this.errores['tipoPago'];
  }

  guardar() {
    if (!this.validar()) return;

    const data: CitaFormData = {
      id_paciente: this.form.id_paciente,
      nombre_paciente: this.form.nombre_paciente,
      apellido_paciente: this.form.apellido_paciente,
      fecha_inicio: toIsoDateTime(this.form.fecha, this.form.hora_inicio),
      fecha_fin: toIsoDateTime(this.form.fecha, this.form.hora_fin),
      motivo: this.form.motivo.trim(),
      notas_internas: this.form.notas_internas.trim(),
      observaciones: this.form.observaciones.trim(),
      monto: Number(this.form.monto || 0),
    };

    if (this.modo === 'editar' && this.form.tipoPago) {
      data.tipoPago = this.form.tipoPago;
    }

    this.saved.emit(data);
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
        tipoPago: normalizeTipoPagoValue(this.cita.tipoPago ?? this.cita.tipo_pago ?? this.cita.metodo_pago) ?? '',
      };
    } else {
      this.form = this.emptyForm();
      this.applyPrefill();
    }

    this.errores = {};
    this.hayConflicto = false;
    this.citasDelDia = [];
    this.slotsError = '';

    if (this.form.fecha) {
      void this.cargarDatosHorario();
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
      tipoPago: '',
    };
  }

  private validar(): boolean {
    this.errores = {};

    if (!this.form.id_paciente) {
      this.errores['paciente'] = 'Selecciona un paciente';
    }
    if (!this.form.fecha) this.errores['fecha'] = 'Fecha requerida';
    if (!this.form.hora_inicio) this.errores['hora_inicio'] = 'Hora inicio requerida';
    if (!this.form.hora_fin) this.errores['hora_fin'] = 'Hora fin requerida';
    if (!this.form.motivo.trim()) this.errores['motivo'] = 'Motivo requerido';
    if (this.form.monto < 0) this.errores['monto'] = 'El monto no puede ser negativo';
    if (this.form.tipoPago && !isTipoPago(this.form.tipoPago)) {
      this.errores['tipoPago'] = 'Tipo de pago no valido';
    }

    if (this.form.hora_inicio && this.form.hora_fin) {
      const diff = this.diffMinutes(this.form.hora_inicio, this.form.hora_fin);
      if (diff <= 0) this.errores['hora_fin'] = 'Debe ser posterior a la hora inicio';
    }

    return Object.keys(this.errores).length === 0;
  }

  private async cargarDatosHorario() {
    if (!this.form.fecha) return;

    this.loadingSlots = true;
    this.slotsError = '';

    try {
      const [configuracion, citasPage] = await Promise.all([
        this.configuracionAgenda
          ? Promise.resolve(this.configuracionAgenda)
          : this.configuracionService.getAgenda(),
        this.citasService.getAll({
          fechaDesde: `${this.form.fecha}T00:00:00`,
          fechaHasta: `${this.form.fecha}T23:59:59`,
          size: 500,
          sort: 'fecha_inicio,asc',
        }),
      ]);

      this.configuracionAgenda = configuracion;
      this.citasDelDia = citasPage.content ?? [];
      this.hayConflicto = false;
    } catch (err) {
      this.citasDelDia = [];
      this.slotsError = mapApiError(err).userMessage;
      this.hayConflicto = false;
    } finally {
      this.loadingSlots = false;
    }
  }

  private async cargarMotivosFrecuentes() {
    try {
      const page = await this.citasService.getAll({
        size: 200,
        sort: 'fecha_inicio,desc',
      });
      this.motivosFrecuentes = this.buildMotivosFrecuentes(page.content ?? []);
    } catch {
      this.motivosFrecuentes = [];
    }
  }

  private buildMotivosFrecuentes(citas: CitaDto[]): string[] {
    const frecuencia = new Map<string, { motivo: string; count: number; lastIndex: number }>();

    citas.forEach((cita, index) => {
      const motivo = this.normalizeMotivo(cita.motivo);
      if (!motivo) return;

      const key = motivo.toLocaleLowerCase();
      const current = frecuencia.get(key);
      if (current) {
        current.count += 1;
        current.lastIndex = Math.min(current.lastIndex, index);
      } else {
        frecuencia.set(key, { motivo, count: 1, lastIndex: index });
      }
    });

    return [...frecuencia.values()]
      .sort((a, b) => b.count - a.count || a.lastIndex - b.lastIndex)
      .map(item => item.motivo)
      .slice(0, 7);
  }

  private normalizeMotivo(motivo: string | null | undefined): string {
    return String(motivo ?? '').trim().replace(/\s+/g, ' ');
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
