import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule, PopoverController, createAnimation } from '@ionic/angular';
import {
  CitaFormContext,
  CitaFormData,
  CitaFormModalComponent,
} from '../../shared/components/cita-form-modal/cita-form-modal.component';
import {
  ConfirmDialogComponent,
  ConfirmDialogConfig,
} from '../../shared/confirm-dialog/confirm-dialog.component';
import {
  CqaAction,
  CqaPopoverComponent,
} from './components/cqa-popover/cqa-popover.component';
import { SolicitudReprogramacionModalComponent } from '../../shared/components/solicitud-reprogramacion-modal/solicitud-reprogramacion-modal.component';
import { SolicitudReprogramacion } from '../../shared/models/solicitud-reprogramacion.model';
import { PacientesApiService } from '../pacientes/pacientes-api.service';
import { CitasApiService } from '../citas/citas-api.service';
import { SolicitudReprogramacionApiService } from '../citas/solicitud-reprogramacion-api.service';
import {
  CitaDto,
  CitaUpsertRequest,
  EstadoCita,
} from '../citas/models/cita.model';
import { mapApiError } from '../../shared/utils/api-error.mapper';
import { AgendaApiService } from './agenda-api.service';
import {
  AgendaResponseDto,
  BloqueoHorarioDto,
  BloqueoHorarioUpsertRequest,
  ConfiguracionJornadaDto,
} from './agenda.models';

interface CalendarEvent {
  title: string;
  time: string;
  color: string;
  kind: 'cita' | 'bloqueo';
  status?: string;
  cita?: CitaDto;
  bloqueo?: BloqueoHorarioDto;
}

interface CalendarDay {
  date: Date;
  number: number;
  inCurrentMonth: boolean;
  isToday: boolean;
  fullDate: string;
  events: CalendarEvent[];
  citas: number;
  colorCitas: string;
}

@Component({
  selector: 'app-agenda',
  templateUrl: './agenda.page.html',
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    CitaFormModalComponent,
    ConfirmDialogComponent,
    SolicitudReprogramacionModalComponent,
  ],
  standalone: true,
  styleUrls: ['./agenda.page.scss'],
})
export class AgendaPage implements OnInit, OnDestroy {
  nombreUsuario = 'Juan Jose';
  showNewAppointmentPanel = false;

  currentDate = new Date();
  currentMonth = this.currentDate.getMonth();
  currentYear = this.currentDate.getFullYear();

  weekDays = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
  monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril',
    'Mayo', 'Junio', 'Julio', 'Agosto',
    'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];

  maxCitasPorDia = 8;
  loading = false;
  saving = false;
  deletingBlockId: number | null = null;
  errorMessage = '';
  successMessage = '';

  pacientes: { id: number; nombre: string }[] = [];
  selectedPaciente: { id: number; nombre: string } | null = null;

  agendaResponse: AgendaResponseDto | null = null;
  configuracionJornada: ConfiguracionJornadaDto | null = null;
  citasMes: CitaDto[] = [];
  bloqueosMes: BloqueoHorarioDto[] = [];

  calendarDays: CalendarDay[] = [];
  selectedDay: CalendarDay | null = null;

  dayName = '';
  fullDate = '';
  eventsToday = 0;

  showDateModal = false;
  activeDateField: 'inicio' | 'fin' | null = null;
  monthName = '';

  showHourModal = false;
  horas: string[] = [];
  selectingHourFor: 'inicio' | 'fin' | null = null;
  selectingHourForBlock: 'block-inicio' | 'block-fin' | null = null;

  showBuscarPacienteModal = false;
  buscarModo: 'seleccionar' | 'toolbar' = 'toolbar';
  buscarBusqueda = '';
  buscarFiltrados: { id: number; nombre: string }[] = [];
  private pendingNavUrl: string | null = null;

  apptPrefill: CitaFormContext = {};
  apptShowBanner = false;
  apptContextLabel = '';

  citaActiva: CitaDto | null = null;
  showQuickActions = false;
  private openPopover: HTMLIonPopoverElement | null = null;

  solicitudSeleccionada: SolicitudReprogramacion | null = null;
  showSolicitudModal = false;

  showCqaConfirm = false;
  cqaConfirmConfig: ConfirmDialogConfig | null = null;
  private cqaConfirmFn: (() => void) | null = null;

  readonly estadoClaseMap: Record<string, string> = {
    CONFIRMADA: 'cqa-estado--confirmada',
    COMPLETADA: 'cqa-estado--completada',
    PENDIENTE: 'cqa-estado--pendiente',
    CANCELADA: 'cqa-estado--cancelada',
    NO_ASISTIO: 'cqa-estado--no-asistio',
    REPROGRAMADA: 'cqa-estado--pospuesta',
  };

  showBlockModal = false;
  editingBlock: BloqueoHorarioDto | null = null;
  blockDateMode = false;

  blockForm = {
    fecha: null as string | null,
    allDay: true,
    horaInicio: null as string | null,
    horaFin: null as string | null,
    motivo: '',
    repeat: 'none' as 'none' | 'daily' | 'weekly' | 'monthly',
    createdAt: null as string | null,
  };

  blockErrors: { fecha?: string; rango?: string } = {};

  readonly blockChips = ['Comida', 'Vacaciones', 'Reunion', 'Urgencia', 'Capacitacion', 'Personal'];
  readonly repeatOptions = [
    { value: 'none' as const, label: 'No repetir' },
    { value: 'daily' as const, label: 'Diario' },
    { value: 'weekly' as const, label: 'Semanal' },
    { value: 'monthly' as const, label: 'Mensual' },
  ];

  private dragStartY = 0;
  private dragCurrentY = 0;
  private isDragging = false;

  constructor(
    private pacientesSvc: PacientesApiService,
    private router: Router,
    private citasSvc: CitasApiService,
    private agendaApi: AgendaApiService,
    private popoverCtrl: PopoverController,
    private solicitudSvc: SolicitudReprogramacionApiService,
  ) {
    this.horas = this.buildHourOptions();
    this.generateCalendar();
    this.updateHeaderInfo();
  }

  async ngOnInit() {
    try {
      const page = await this.pacientesSvc.getAll({ activo: true, size: 500 });
      this.pacientes = page.content.map(p => ({
        id: p.id_paciente,
        nombre: `${p.nombre} ${p.apellido}`,
      }));
    } catch {
      this.pacientes = [];
    }

    await this.loadAgendaForCurrentMonth();
  }

  ngOnDestroy() {
    this.cerrarModales();
  }

  ionViewWillLeave() {
    this.cerrarModales();
  }

  get jornadaResumen(): string {
    if (!this.configuracionJornada) return '';
    const intervalo = this.configuracionJornada.intervalo_minutos ?? this.configuracionJornada.intervalo ?? 30;
    return `Jornada ${this.toDisplayHour(this.configuracionJornada.hora_inicio)}-${this.toDisplayHour(this.configuracionJornada.hora_fin)} · intervalo ${intervalo} min`;
  }

  getSolicitudPendiente(idCita: number | undefined): SolicitudReprogramacion | undefined {
    if (!idCita) return undefined;
    return this.solicitudSvc.getByCita(idCita);
  }

  abrirSolicitudDesdeAgenda(ev: CalendarEvent): void {
    if (!ev.cita) return;
    const solicitud = this.solicitudSvc.getByCita(ev.cita.id_cita);
    if (!solicitud) return;
    this.solicitudSeleccionada = solicitud;
    this.showSolicitudModal = true;
  }

  async onSolicitudAceptada(): Promise<void> {
    if (!this.solicitudSeleccionada) return;

    const solicitud = this.solicitudSeleccionada;

    try {
      this.saving = true;
      await this.solicitudSvc.aprobar(solicitud.id_solicitud);
      const cita = this.citasMes.find(c => c.id_cita === solicitud.id_cita);
      if (cita) {
        this.citaActiva = cita;
        this.apptPrefill = {
          fecha: cita.fecha,
          horaInicio: cita.hora_inicio,
          horaFin: cita.hora_fin,
        };
        this.apptShowBanner = true;
        this.apptContextLabel = 'Reprogramando cita aceptada';
        document.body.classList.add('modal-open');
        this.showNewAppointmentPanel = true;
      }

      this.showSolicitudModal = false;
      this.solicitudSeleccionada = null;
      this.successMessage = 'Solicitud aprobada correctamente.';
      this.generateCalendar();
    } catch (err) {
      this.errorMessage = mapApiError(err).userMessage;
    } finally {
      this.saving = false;
    }
  }

  async onSolicitudRechazada(motivo: string): Promise<void> {
    if (!this.solicitudSeleccionada) return;

    const solicitud = this.solicitudSeleccionada;
    try {
      this.saving = true;
      await this.solicitudSvc.rechazar(solicitud.id_solicitud, motivo);
      this.showSolicitudModal = false;
      this.solicitudSeleccionada = null;
      this.successMessage = 'Solicitud rechazada correctamente.';
      this.generateCalendar();
    } catch (err) {
      this.errorMessage = mapApiError(err).userMessage;
    } finally {
      this.saving = false;
    }
  }

  onVerAgendaDesdeModal(): void {
    this.showSolicitudModal = false;
    this.solicitudSeleccionada = null;
  }

  cerrarSolicitudModal(): void {
    this.showSolicitudModal = false;
    this.solicitudSeleccionada = null;
  }
  updateHeaderInfo() {
    const today = new Date();
    const weekNames = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
    this.dayName = weekNames[today.getDay()];
    this.fullDate = `${today.getDate()} de ${this.monthNames[today.getMonth()]} de ${today.getFullYear()}`;

    const todayStr = this.formatDateLocal(today);
    const todayCalendarDay = this.calendarDays.find(d => d.fullDate === todayStr);
    this.eventsToday = todayCalendarDay?.events.length || 0;
  }

  private async loadAgendaForCurrentMonth() {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const agenda = await this.agendaApi.getAgendaMes(this.currentMonth + 1, this.currentYear);
      this.agendaResponse = agenda;
      this.citasMes = agenda.citas ?? [];
      this.bloqueosMes = agenda.bloqueos ?? [];
      this.configuracionJornada = agenda.configuracion_jornada ?? null;
      this.maxCitasPorDia = this.calcularCapacidadJornada(this.configuracionJornada);
      await this.solicitudSvc.preloadPendientes(this.citasMes.map(cita => cita.id_cita));
      this.horas = this.buildHourOptions(this.configuracionJornada ?? undefined);
      this.generateCalendar();
      this.updateHeaderInfo();
    } catch (err) {
      this.errorMessage = mapApiError(err).userMessage;
      this.agendaResponse = null;
      this.citasMes = [];
      this.bloqueosMes = [];
      this.configuracionJornada = null;
      this.maxCitasPorDia = this.calcularCapacidadJornada(null);
      this.solicitudSvc.clearCache();
      this.horas = this.buildHourOptions();
      this.generateCalendar();
      this.updateHeaderInfo();
    } finally {
      this.loading = false;
    }
  }

  private mapCitaToEvent(cita: CitaDto): CalendarEvent {
    const colorMap: Record<string, string> = {
      CONFIRMADA: '#6366f1',
      COMPLETADA: '#10b981',
      PENDIENTE: '#f59e0b',
      CANCELADA: '#ef4444',
      NO_ASISTIO: '#64748b',
      REPROGRAMADA: '#8b5cf6',
    };

    return {
      title: `${cita.nombre_paciente} ${cita.apellido_paciente}`,
      time: cita.hora_inicio ?? this.toTimePart(cita.fecha_inicio),
      color: colorMap[cita.estado_cita] ?? '#94a3b8',
      kind: 'cita',
      status: cita.estado ?? cita.estado_cita,
      cita,
    };
  }

  private mapBloqueoToEvent(bloqueo: BloqueoHorarioDto): CalendarEvent {
    const start = bloqueo.hora_inicio || this.toTimePart(bloqueo.fecha_inicio);
    const end = bloqueo.hora_fin || this.toTimePart(bloqueo.fecha_fin);

    return {
      title: bloqueo.motivo || bloqueo.motivo_bloqueo || 'Bloqueo horario',
      time: bloqueo.todo_el_dia ? 'Todo el dia' : `${start || '--:--'}-${end || '--:--'}`,
      color: '#334155',
      kind: 'bloqueo',
      status: bloqueo.tipo_bloqueo || 'BLOQUEADO',
      bloqueo,
    };
  }

  generateCalendar() {
    this.monthName = this.monthNames[this.currentMonth];
    this.calendarDays = [];

    const firstOfMonth = new Date(this.currentYear, this.currentMonth, 1);
    const startIndex = (firstOfMonth.getDay() + 6) % 7;
    const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(this.currentYear, this.currentMonth, 0).getDate();

    for (let i = startIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const day = new Date(this.currentYear, this.currentMonth - 1, dayNum);
      this.calendarDays.push(this.buildDay(day, false));
    }

    const eventsByDate = new Map<string, CalendarEvent[]>();

    for (const cita of this.citasMes) {
      const fecha = cita.fecha ?? this.toDatePart(cita.fecha_inicio);
      const list = eventsByDate.get(fecha) ?? [];
      list.push(this.mapCitaToEvent(cita));
      eventsByDate.set(fecha, list);
    }

    for (const bloqueo of this.bloqueosMes) {
      const fecha = bloqueo.fecha || this.toDatePart(bloqueo.fecha_inicio);
      if (!fecha) continue;
      const list = eventsByDate.get(fecha) ?? [];
      list.push(this.mapBloqueoToEvent(bloqueo));
      eventsByDate.set(fecha, list);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const day = new Date(this.currentYear, this.currentMonth, i);
      const isoDate = this.formatDateLocal(day);
      const events = [...(eventsByDate.get(isoDate) ?? [])].sort((a, b) => this.getSortTime(a).localeCompare(this.getSortTime(b)));
      this.calendarDays.push(this.buildDay(day, true, events));
    }

    while (this.calendarDays.length < 42) {
      const last = this.calendarDays[this.calendarDays.length - 1].date;
      const next = new Date(last);
      next.setDate(next.getDate() + 1);
      this.calendarDays.push(this.buildDay(next, false));
    }

    if (this.selectedDay) {
      const fullDate = this.selectedDay.fullDate;
      this.selectedDay = this.calendarDays.find(d => d.fullDate === fullDate) || null;
    }
  }

  buildDay(date: Date, inMonth: boolean, events: CalendarEvent[] = []): CalendarDay {
    const citas = events.filter(e => e.kind === 'cita').length;
    return {
      date,
      number: date.getDate(),
      inCurrentMonth: inMonth,
      isToday: this.isToday(date),
      fullDate: this.formatDateLocal(date),
      events,
      citas,
      colorCitas: this.getColorForDay(date, citas),
    };
  }

  private getSortTime(event: CalendarEvent): string {
    if (event.kind === 'cita') {
      return event.cita?.hora_inicio || '99:99';
    }
    return event.bloqueo?.hora_inicio || this.toTimePart(event.bloqueo?.fecha_inicio) || '99:99';
  }

  getColorForDay(date: Date, citas: number): string {
    if (!this.isDiaHabilitado(date)) return '#f8fafc';
    if (citas >= this.maxCitasPorDia) return '#ffe4e1';
    if (citas >= this.maxCitasPorDia / 2) return '#fcfcda';
    return '#d8f8e1';
  }

  private isDiaHabilitado(date: Date): boolean {
    if (!this.configuracionJornada) return true;
    const day = date.getDay();
    if (day === 6 && this.configuracionJornada.mostrar_sabados === false) return false;
    if (day === 0 && this.configuracionJornada.mostrar_domingos === false) return false;
    return true;
  }

  private calcularCapacidadJornada(config: ConfiguracionJornadaDto | null): number {
    if (!config?.hora_inicio || !config?.hora_fin) return 8;
    const inicio = this.toMinutes(config.hora_inicio);
    const fin = this.toMinutes(config.hora_fin);
    const intervalo = config.intervalo_minutos ?? config.intervalo ?? config.duracion_cita_default_min ?? 30;
    if (inicio === null || fin === null || fin <= inicio || !intervalo) return 8;
    return Math.max(1, Math.floor((fin - inicio) / intervalo));
  }

  prevMonth() {
    if (this.currentMonth === 0) {
      this.currentMonth = 11;
      this.currentYear--;
    } else {
      this.currentMonth--;
    }
    this.selectedDay = null;
    void this.loadAgendaForCurrentMonth();
  }

  nextMonth() {
    if (this.currentMonth === 11) {
      this.currentMonth = 0;
      this.currentYear++;
    } else {
      this.currentMonth++;
    }
    this.selectedDay = null;
    void this.loadAgendaForCurrentMonth();
  }

  goToday() {
    this.currentDate = new Date();
    this.currentMonth = this.currentDate.getMonth();
    this.currentYear = this.currentDate.getFullYear();
    this.selectedDay = null;
    void this.loadAgendaForCurrentMonth();
  }

  selectDay(day: CalendarDay) {
    this.selectedDay = day;
  }

  abrirAccionesEvento(ev: CalendarEvent, mouseEvent?: MouseEvent) {
    if (ev.kind === 'bloqueo') {
      this.editarBloqueo(ev);
      return;
    }
    void this.abrirQuickActions(ev, mouseEvent);
  }

  isToday(date: Date) {
    const today = new Date();
    return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  }

  formatDateLocal(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  bloquearHorario() {
    this.openBlockModal();
  }

  openBlockModal() {
    this.editingBlock = null;
    this.blockForm = {
      fecha: this.selectedDay?.fullDate ?? this.formatDateLocal(new Date()),
      allDay: true,
      horaInicio: this.toDisplayHour(this.configuracionJornada?.hora_inicio || '09:00'),
      horaFin: this.toDisplayHour(this.configuracionJornada?.hora_fin || '18:00'),
      motivo: '',
      repeat: 'none',
      createdAt: null,
    };
    this.blockErrors = {};
    this.showBlockModal = true;
  }

  closeBlockModal() {
    this.showBlockModal = false;
    this.editingBlock = null;
    this.selectingHourForBlock = null;
  }

  editarBloqueo(ev: CalendarEvent) {
    if (!ev.bloqueo) return;
    const bloqueo = ev.bloqueo;
    this.editingBlock = bloqueo;
    this.blockForm = {
      fecha: bloqueo.fecha || this.toDatePart(bloqueo.fecha_inicio),
      allDay: Boolean(bloqueo.todo_el_dia),
      horaInicio: this.toDisplayHour(bloqueo.hora_inicio || this.toTimePart(bloqueo.fecha_inicio)),
      horaFin: this.toDisplayHour(bloqueo.hora_fin || this.toTimePart(bloqueo.fecha_fin)),
      motivo: bloqueo.motivo || bloqueo.motivo_bloqueo || '',
      repeat: 'none',
      createdAt: null,
    };
    this.blockErrors = {};
    this.showBlockModal = true;
  }

  openBlockDatePicker() {
    this.activeDateField = 'inicio';
    this.blockDateMode = true;
    this.showDateModal = true;
  }

  openBlockHourModal(field: 'block-inicio' | 'block-fin') {
    this.selectingHourForBlock = field;
    this.selectingHourFor = null;
    this.showHourModal = true;
  }

  applyBlockChip(chip: string) {
    this.blockForm.motivo = chip;
  }

  get blockSummary(): string {
    if (!this.blockForm.fecha) return '-';
    const [y, m, d] = this.blockForm.fecha.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const days = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
    const label = `${days[date.getDay()]} ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
    const timeLabel = this.blockForm.allDay ? 'Todo el dia' : `${this.blockForm.horaInicio ?? '?'}-${this.blockForm.horaFin ?? '?'}`;
    const motivo = this.blockForm.motivo ? ` · ${this.blockForm.motivo}` : '';
    return `${label} · ${timeLabel}${motivo}`;
  }

  validateBlock(): boolean {
    this.blockErrors = {};
    if (!this.blockForm.fecha) {
      this.blockErrors.fecha = 'Elige una fecha para el bloqueo.';
    }
    if (!this.blockForm.allDay) {
      if (!this.blockForm.horaInicio || !this.blockForm.horaFin) {
        this.blockErrors.rango = 'Indica la hora de inicio y fin.';
      } else if (this.to24Hour(this.blockForm.horaInicio) >= this.to24Hour(this.blockForm.horaFin)) {
        this.blockErrors.rango = 'Hasta debe ser posterior a Desde.';
      }
    }
    return Object.keys(this.blockErrors).length === 0;
  }

  async saveBlock() {
    if (!this.validateBlock() || !this.blockForm.fecha) return;
    this.saving = true;
    this.errorMessage = '';

    try {
      const body = this.mapBlockFormToRequest();
      if (this.editingBlock?.id_bloqueo_horario) {
        await this.agendaApi.updateBloqueo(this.editingBlock.id_bloqueo_horario, body);
        this.successMessage = 'Bloqueo actualizado correctamente.';
      } else {
        await this.agendaApi.createBloqueo(body);
        this.successMessage = 'Bloqueo creado correctamente.';
      }
      this.closeBlockModal();
      await this.loadAgendaForCurrentMonth();
    } catch (err) {
      this.errorMessage = mapApiError(err).userMessage;
    } finally {
      this.saving = false;
    }
  }

  async eliminarBloqueo(ev: CalendarEvent) {
    const id = ev.bloqueo?.id_bloqueo_horario;
    if (!id) return;
    const confirmed = window.confirm('Se eliminara este bloqueo horario. Deseas continuar?');
    if (!confirmed) return;

    this.deletingBlockId = id;
    this.errorMessage = '';
    try {
      await this.agendaApi.deleteBloqueo(id);
      this.successMessage = 'Bloqueo eliminado correctamente.';
      await this.loadAgendaForCurrentMonth();
    } catch (err) {
      this.errorMessage = mapApiError(err).userMessage;
    } finally {
      this.deletingBlockId = null;
    }
  }

  openHourModal(field: 'inicio' | 'fin') {
    this.selectingHourFor = field;
    this.showHourModal = true;
  }

  closeHourModal() {
    this.showHourModal = false;
    this.selectingHourFor = null;
    this.selectingHourForBlock = null;
  }

  selectHour(hour: string) {
    if (this.selectingHourForBlock === 'block-inicio') {
      this.blockForm.horaInicio = hour;
      this.blockErrors.rango = undefined;
      this.closeHourModal();
      return;
    }
    if (this.selectingHourForBlock === 'block-fin') {
      this.blockForm.horaFin = hour;
      this.blockErrors.rango = undefined;
      this.closeHourModal();
      return;
    }
    this.closeHourModal();
  }

  @HostListener('window:resize')
  onWindowResize() {
    if (this.openPopover) {
      this.openPopover.dismiss();
      this.openPopover = null;
    }
  }

  async abrirQuickActions(ev: CalendarEvent, mouseEvent?: MouseEvent) {
    if (!ev.cita) return;

    if (window.innerWidth >= 768 && mouseEvent) {
      const anchor = (mouseEvent.currentTarget ?? mouseEvent.target) as HTMLElement;
      const rect = anchor.getBoundingClientRect();
      const width = 340;
      const margin = 24;
      const viewportWidth = window.innerWidth;
      const clampedLeft = Math.max(margin, Math.min(rect.left, viewportWidth - width - margin));
      const syntheticAnchor = {
        getBoundingClientRect: (): DOMRect => ({
          top: rect.top,
          left: clampedLeft,
          right: clampedLeft + rect.width,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
          x: clampedLeft,
          y: rect.top,
          toJSON() { return {}; },
        } as DOMRect),
      };

      const popover = await this.popoverCtrl.create({
        component: CqaPopoverComponent,
        event: { target: syntheticAnchor } as unknown as Event,
        componentProps: { citaActiva: ev.cita },
        cssClass: 'cqa-popover',
        showBackdrop: false,
        dismissOnSelect: false,
        side: 'bottom',
        alignment: 'start',
      });

      this.openPopover = popover;
      await popover.present();
      const { data } = await popover.onWillDismiss<{ action: CqaAction }>();
      this.openPopover = null;
      if (data?.action) this.handlePopoverAction(ev.cita, data.action);
      return;
    }

    this.citaActiva = ev.cita;
    requestAnimationFrame(() => { this.showQuickActions = true; });
  }

  private handlePopoverAction(cita: CitaDto, action: CqaAction) {
    this.citaActiva = cita;
    switch (action) {
      case 'verDetalle': this.accionVerDetalle(); break;
      case 'paciente': this.accionAbrirPaciente(); break;
      case 'reprogramar': this.accionReprogramar(); break;
      case 'completada': this.confirmarCambioEstado('COMPLETADA'); break;
      case 'noAsistio': this.confirmarCambioEstado('NO_ASISTIO'); break;
      case 'cancelar': this.confirmarCambioEstado('CANCELADA'); break;
      case 'eliminar': this.confirmarEliminarCita(); break;
      case 'crearSesion': this.accionCrearSesion(); break;
    }
  }

  cerrarQuickActions() {
    this.showQuickActions = false;
    setTimeout(() => { this.citaActiva = null; }, 320);
  }

  pedirConfirmacion(config: ConfirmDialogConfig, fn: () => void) {
    this.cqaConfirmConfig = config;
    this.cqaConfirmFn = fn;
    this.showCqaConfirm = true;
  }

  onCqaConfirmado() {
    this.showCqaConfirm = false;
    this.cqaConfirmFn?.();
    this.cqaConfirmFn = null;
    this.cqaConfirmConfig = null;
  }

  onCqaCancelado() {
    this.showCqaConfirm = false;
    this.cqaConfirmFn = null;
    this.cqaConfirmConfig = null;
  }
  confirmarCambioEstado(estado: EstadoCita) {
    if (!this.citaActiva) return;
    const nombre = `${this.citaActiva.nombre_paciente} ${this.citaActiva.apellido_paciente}`;
    const configs: Partial<Record<EstadoCita, ConfirmDialogConfig>> = {
      COMPLETADA: {
        title: 'Marcar como completada',
        message: 'La cita fue realizada con',
        subject: nombre,
        confirmLabel: 'Si, completada',
        cancelLabel: 'Volver',
        icon: 'checkmark-circle-outline',
        variant: 'primary',
      },
      NO_ASISTIO: {
        title: 'Registrar inasistencia',
        message: 'El paciente no se presento a la cita con',
        subject: nombre,
        confirmLabel: 'Confirmar',
        cancelLabel: 'Volver',
        variant: 'danger',
        icon: 'person-remove-outline',
      },
      CANCELADA: {
        title: 'Cancelar cita',
        message: 'Se cancelara la cita de',
        subject: nombre,
        confirmLabel: 'Cancelar cita',
        cancelLabel: 'Volver',
        variant: 'danger',
        icon: 'close-circle-outline',
      },
    };
    const config = configs[estado];
    if (config) {
      this.pedirConfirmacion(config, () => { void this.persistirCambioEstado(estado); });
      return;
    }
    void this.persistirCambioEstado(estado);
  }

  confirmarEliminarCita() {
    if (!this.citaActiva) return;
    const nombre = `${this.citaActiva.nombre_paciente} ${this.citaActiva.apellido_paciente}`;
    this.pedirConfirmacion(
      {
        title: 'Eliminar cita',
        message: 'Se eliminara definitivamente la cita de',
        subject: nombre,
        confirmLabel: 'Eliminar cita',
        cancelLabel: 'Volver',
        variant: 'danger',
        icon: 'trash-outline',
      },
      () => { void this.eliminarCitaActiva(); }
    );
  }

  accionVerDetalle() {
    if (!this.citaActiva) return;
    this.router.navigate(['/dashboard/citas', this.citaActiva.id_cita]);
  }

  accionAbrirPaciente() {
    if (!this.citaActiva) return;
    this.router.navigate(['/dashboard/pacientes', this.citaActiva.id_paciente]);
  }

  accionReprogramar() {
    if (!this.citaActiva) return;
    this.apptPrefill = {
      fecha: this.citaActiva.fecha,
      horaInicio: this.citaActiva.hora_inicio,
      horaFin: this.citaActiva.hora_fin,
    };
    this.apptShowBanner = true;
    this.apptContextLabel = 'Reprogramando cita';
    this.cerrarQuickActions();
    document.body.classList.add('modal-open');
    this.showNewAppointmentPanel = true;
  }

  accionCrearSesion() {
    this.router.navigate(['/dashboard/sesiones']);
  }

  private async persistirCambioEstado(estado: EstadoCita) {
    if (!this.citaActiva) return;
    try {
      await this.citasSvc.cambiarEstado(this.citaActiva.id_cita, estado);
      this.successMessage = 'Estado de cita actualizado.';
      this.cerrarQuickActions();
      await this.loadAgendaForCurrentMonth();
    } catch (err) {
      this.errorMessage = mapApiError(err).userMessage;
    }
  }

  private async eliminarCitaActiva() {
    if (!this.citaActiva) return;
    try {
      await this.citasSvc.delete(this.citaActiva.id_cita);
      this.successMessage = 'Cita eliminada correctamente.';
      this.cerrarQuickActions();
      await this.loadAgendaForCurrentMonth();
    } catch (err) {
      this.errorMessage = mapApiError(err).userMessage;
    }
  }

  nuevaCita() {
    const fecha = this.selectedDay?.fullDate ?? this.formatDateLocal(new Date());
    this.apptPrefill = { fecha };
    this.apptShowBanner = !!this.selectedDay;

    if (this.selectedDay) {
      const [y, m, d] = fecha.split('-').map(Number);
      const days = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
      this.apptContextLabel = `${days[new Date(y, m - 1, d).getDay()]} ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
    } else {
      this.apptContextLabel = '';
    }

    document.body.classList.add('modal-open');
    this.showNewAppointmentPanel = true;
  }

  closeNewAppointmentPanel() {
    this.showNewAppointmentPanel = false;
    document.body.classList.remove('modal-open');
    this.resetPanelTransform();
    this.dragStartY = 0;
    this.dragCurrentY = 0;
    this.isDragging = false;
  }

  async onCitaGuardadaDesdeAgenda(data: CitaFormData) {
    this.saving = true;
    this.errorMessage = '';

    try {
      const body: CitaUpsertRequest = {
        id_paciente: data.id_paciente,
        fecha_inicio: data.fecha_inicio,
        fecha_fin: data.fecha_fin,
        motivo: data.motivo?.trim() || undefined,
        notas_internas: data.notas_internas?.trim() || null,
        observaciones: data.observaciones?.trim() || null,
        monto: data.monto,
      };

      if (this.citaActiva?.id_cita) {
        await this.citasSvc.update(this.citaActiva.id_cita, body);
      } else {
        await this.citasSvc.create(body);
      }

      this.successMessage = 'Cita guardada correctamente.';
      this.citaActiva = null;
      this.apptPrefill = {};
      this.apptShowBanner = false;
      this.closeNewAppointmentPanel();
      await this.loadAgendaForCurrentMonth();
    } catch (err) {
      this.errorMessage = mapApiError(err).userMessage;
    } finally {
      this.saving = false;
    }
  }

  cerrarModales() {
    this.selectedDay = null;
    this.showNewAppointmentPanel = false;
    this.showDateModal = false;
    this.showHourModal = false;
    this.showBuscarPacienteModal = false;
    this.showQuickActions = false;
    this.showCqaConfirm = false;
    this.showBlockModal = false;
    this.showSolicitudModal = false;
    this.citaActiva = null;
    this.solicitudSeleccionada = null;
    this.cqaConfirmConfig = null;
    this.cqaConfirmFn = null;
    document.body.classList.remove('modal-open');
    if (this.openPopover) {
      this.openPopover.dismiss();
      this.openPopover = null;
    }
  }

  openDatePicker(field: 'inicio' | 'fin') {
    this.activeDateField = field;
    this.showDateModal = true;
    setTimeout(() => {
      const datetime = document.querySelector('ion-datetime') as any;
      if (datetime) this.applyCalendarColors(datetime);
    }, 150);
  }

  applyCalendarColors(datetimeEl: HTMLElement) {
    const shadow = datetimeEl.shadowRoot;
    if (!shadow) return;
    this.calendarDays.forEach(day => {
      if (!day.inCurrentMonth) return;
      const month = this.currentMonth + 1;
      const selector = `button.calendar-day[data-day="${day.number}"][data-month="${month}"][data-year="${this.currentYear}"]`;
      const dayEl = shadow.querySelector(selector) as HTMLElement;
      if (dayEl) {
        dayEl.style.setProperty('--day-bg-color', day.colorCitas);
        dayEl.style.borderRadius = '50%';
        dayEl.style.background = day.colorCitas;
      }
    });
  }

  closeDateModal() {
    this.showDateModal = false;
    this.activeDateField = null;
    this.blockDateMode = false;
  }

  selectDate(event: any) {
    const value = event.detail.value;
    if (this.blockDateMode) {
      this.blockForm.fecha = value?.split('T')[0] ?? value;
      this.blockErrors.fecha = undefined;
      this.closeDateModal();
      return;
    }
    this.closeDateModal();
  }
  private isMobile(): boolean {
    return window.innerWidth <= 600;
  }

  private getPanelElement(): HTMLElement | null {
    return document.querySelector('.new-appointment-panel');
  }

  startDrag(event: TouchEvent) {
    if (!this.isMobile() || !this.showNewAppointmentPanel) return;
    this.dragStartY = event.touches[0].clientY;
    this.dragCurrentY = this.dragStartY;
    this.isDragging = true;
  }

  onDrag(event: TouchEvent) {
    if (!this.isMobile() || !this.isDragging) return;
    this.dragCurrentY = event.touches[0].clientY;
    const diff = this.dragCurrentY - this.dragStartY;
    if (diff <= 0) return;
    const panel = this.getPanelElement();
    if (panel) panel.style.transform = `translate(-50%, ${diff}px)`;
  }

  endDrag(_event: TouchEvent) {
    if (!this.isMobile() || !this.isDragging) return;
    const diff = this.dragCurrentY - this.dragStartY;
    const panel = this.getPanelElement();
    this.isDragging = false;
    if (diff > 120) {
      this.closeNewAppointmentPanel();
    } else if (panel) {
      panel.style.transform = '';
    }
    this.dragStartY = 0;
    this.dragCurrentY = 0;
  }

  private resetPanelTransform() {
    const panel = this.getPanelElement();
    if (panel) panel.style.transform = '';
  }

  openBuscarPacienteModal(modo: 'seleccionar' | 'toolbar' = 'toolbar') {
    this.buscarModo = modo;
    this.buscarBusqueda = '';
    this.buscarFiltrados = [...this.pacientes];
    this.showBuscarPacienteModal = true;
  }

  closeBuscarPacienteModal() {
    this.showBuscarPacienteModal = false;
  }

  filtrarBusqueda() {
    const q = this.buscarBusqueda.toLowerCase().trim();
    this.buscarFiltrados = q
      ? this.pacientes.filter(p => p.nombre.toLowerCase().includes(q))
      : [...this.pacientes];
  }

  verPaciente(paciente: { id: number; nombre: string }) {
    this.pendingNavUrl = `/dashboard/pacientes/${paciente.id}`;
    this.closeBuscarPacienteModal();
  }

  onBuscarPacienteModalDismissed() {
    this.closeBuscarPacienteModal();
    if (this.pendingNavUrl) {
      const url = this.pendingNavUrl;
      this.pendingNavUrl = null;
      this.router.navigateByUrl(url);
    }
  }

  seleccionarPacienteDesdeBusqueda(paciente: { id: number; nombre: string }) {
    this.selectedPaciente = paciente;
    this.closeBuscarPacienteModal();
  }

  nuevaCitaConPaciente(paciente: { id: number; nombre: string }) {
    this.selectedPaciente = paciente;
    this.apptPrefill = { fecha: this.selectedDay?.fullDate ?? this.formatDateLocal(new Date()) };
    this.closeBuscarPacienteModal();
    this.nuevaCita();
  }

  modalEnterAnimation(baseEl: HTMLElement) {
    const root = baseEl.shadowRoot || baseEl;
    const backdropAnimation = createAnimation()
      .addElement(root.querySelector('ion-backdrop')!)
      .fromTo('opacity', '0', '0.45');
    const wrapperAnimation = createAnimation()
      .addElement(root.querySelector('.ion-overlay-wrapper')!)
      .keyframes([
        { offset: 0, opacity: '0', transform: 'scale(0.9)' },
        { offset: 1, opacity: '1', transform: 'scale(1)' },
      ])
      .duration(200)
      .easing('ease-out');
    return createAnimation().addAnimation([backdropAnimation, wrapperAnimation]);
  }

  private mapBlockFormToRequest(): BloqueoHorarioUpsertRequest {
    const horaInicio = this.blockForm.allDay ? '00:00:00' : `${this.to24Hour(this.blockForm.horaInicio)}:00`;
    const horaFin = this.blockForm.allDay ? '23:59:00' : `${this.to24Hour(this.blockForm.horaFin)}:00`;
    return {
      fecha: this.blockForm.fecha!,
      hora_inicio: horaInicio,
      hora_fin: horaFin,
      motivo: this.blockForm.motivo.trim() || undefined,
      tipo_bloqueo: 'PERSONAL',
    };
  }

  private buildHourOptions(config?: ConfiguracionJornadaDto): string[] {
    const intervalo = config?.intervalo_minutos ?? config?.intervalo ?? 30;
    const start = this.hourToMinutes(this.normalizeHour(config?.hora_inicio ?? '08:00'));
    const end = this.hourToMinutes(this.normalizeHour(config?.hora_fin ?? '18:00'));
    const options: string[] = [];
    for (let current = start; current <= end; current += intervalo || 30) {
      options.push(this.toDisplayHour(this.minutesToHour(current)));
    }
    return options;
  }

  private to24Hour(value: string | null | undefined): string {
    if (!value) return '';
    const trimmed = value.trim();
    const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return this.normalizeHour(trimmed);
    let hh = Number(match[1]);
    const mm = match[2];
    const suffix = match[3].toUpperCase();
    if (suffix === 'AM') {
      hh = hh === 12 ? 0 : hh;
    } else if (hh !== 12) {
      hh += 12;
    }
    return `${String(hh).padStart(2, '0')}:${mm}`;
  }

  private toDisplayHour(value: string | null | undefined): string {
    const normalized = this.normalizeHour(value);
    if (!normalized) return '';
    let [hh, mm] = normalized.split(':').map(Number);
    const suffix = hh >= 12 ? 'PM' : 'AM';
    hh = hh % 12 || 12;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} ${suffix}`;
  }

  private normalizeHour(value: string | null | undefined): string {
    if (!value) return '';
    const raw = String(value);
    return raw.length >= 5 ? raw.substring(0, 5) : raw;
  }

  private hourToMinutes(hour: string): number {
    const [hh, mm] = hour.split(':').map(Number);
    return (hh * 60) + mm;
  }

  private toMinutes(value: string | null | undefined): number | null {
    const normalized = this.normalizeHour(value);
    if (!normalized || !normalized.includes(':')) return null;
    return this.hourToMinutes(normalized);
  }

  private minutesToHour(minutes: number): string {
    const hh = Math.floor(minutes / 60);
    const mm = minutes % 60;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }

  private toDatePart(value?: string): string {
    if (!value) return '';
    return String(value).substring(0, 10);
  }

  private toTimePart(value?: string): string {
    if (!value) return '';
    return this.normalizeHour(String(value).substring(11, 19));
  }
}
