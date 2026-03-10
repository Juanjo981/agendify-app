import { CitaFormModalComponent, CitaFormContext, CitaFormData } from '../../shared/components/cita-form-modal/cita-form-modal.component';
import { ConfirmDialogComponent, ConfirmDialogConfig } from '../../shared/confirm-dialog/confirm-dialog.component';
import { CqaPopoverComponent, CqaAction } from './components/cqa-popover/cqa-popover.component';
import { Component, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, PopoverController, createAnimation } from '@ionic/angular';
import { Router } from '@angular/router';
import { PacientesMockService } from '../pacientes/pacientes.service.mock';
import { CitasMockService } from '../citas/citas.service.mock';
import { CitaDto, EstadoCita } from '../citas/models/cita.model';

interface CalendarEvent {
  title: string;
  time: string;
  color: string;
  status?: 'Confirmada' | 'Pendiente' | 'Cancelada';
  cita?: CitaDto;
}

interface CalendarDay {
  date: Date,
  number: number,
  inCurrentMonth: boolean,
  isToday: boolean,
  fullDate: string,
  events: CalendarEvent[],
  citas: number,
  colorCitas: string
}

@Component({
  selector: 'app-agenda',
  templateUrl: './agenda.page.html',
  imports: [IonicModule, CommonModule, FormsModule, CitaFormModalComponent, ConfirmDialogComponent, CqaPopoverComponent],
  standalone: true,
  styleUrls: ['./agenda.page.scss'],
})
export class AgendaPage implements OnDestroy {

  nombreUsuario = 'Juan José';
  showNewAppointmentPanel = false;

  currentDate = new Date();
  currentMonth = this.currentDate.getMonth();
  currentYear = this.currentDate.getFullYear();

  weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril',
    'Mayo', 'Junio', 'Julio', 'Agosto',
    'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Objeto de nueva cita
  newAppointment: any = {
    id_profesional: null,
    id_paciente: null,
    fecha_inicio: null,        // solo fecha (string ISO)
    fecha_fin: null,           // solo fecha
    hora_inicio: null,         // string: "11:00 AM"
    hora_fin: null,            // string
    tipo: null,
    estado: null,
    notas: ''
  };

  maxCitasPorDia = 8;


  // Datos de ejemplo
  profesionales = [{ id: 1, nombre: 'Dr. Pérez' }, { id: 2, nombre: 'Dra. López' }];
  pacientes: { id: number; nombre: string }[] = [];

  tiposCita = [{ id: 1, nombre: 'Consulta' }, { id: 2, nombre: 'Terapia' }];
  estadosCita = [{ id: 1, nombre: 'Pendiente' }, { id: 2, nombre: 'Confirmada' }];

  recommendedDate: Date = new Date();
  nextAvailableDate: Date = new Date(new Date().getTime() + 60 * 60 * 1000); // +1h

  calendarDays: CalendarDay[] = [];
  selectedDay: CalendarDay | null = null;

  dayName: string = '';
  fullDate: string = '';
  eventsToday: number = 0;

  showDateModal = false;
  activeDateField: 'inicio' | 'fin' | null = null;

  monthName = '';
  showHourModal = false;

  horas: string[] = [
    '08:00 AM', '08:30 AM',
    '09:00 AM', '09:30 AM',
    '10:00 AM', '10:30 AM',
    '11:00 AM', '11:30 AM',
    '12:00 PM', '12:30 PM',
    '01:00 PM', '01:30 PM',
    '02:00 PM', '02:30 PM',
    '03:00 PM', '03:30 PM',
    '04:00 PM', '04:30 PM',
    '05:00 PM', '05:30 PM',
    '06:00 PM'
  ];
  selectedHour: string | null = null;
  selectingHourFor: 'inicio' | 'fin' | null = null;

  // Eventos de prueba
  exampleEvents: CalendarEvent[] = [
    { title: 'Cita con Ana', time: '09:00 AM', color: '#ef4444', status: 'Confirmada' },
    { title: 'Terapia Luis', time: '11:00 AM', color: '#3b82f6', status: 'Confirmada' },
    { title: 'Evaluación María', time: '02:00 PM', color: '#facc15', status: 'Pendiente' },
    { title: 'Seguimiento Carlos', time: '04:00 PM', color: '#22c55e', status: 'Confirmada' },




  ];

  // ---- Drag para cerrar en móvil ----
  private dragStartY = 0;
  private dragCurrentY = 0;
  private isDragging = false;

  constructor(private pacientesSvc: PacientesMockService, private router: Router, private citasSvc: CitasMockService, private popoverCtrl: PopoverController) {
    this.pacientes = this.pacientesSvc.getAll().map(p => ({
      id: p.id_paciente,
      nombre: `${p.nombre} ${p.apellido}`,
    }));
    this.generateCalendar();
    this.updateHeaderInfo();
  }


  showPacienteModal = false;
  pacientesFiltrados = [...this.pacientes];
  busquedaPaciente = '';

  // --- Buscar Paciente (modal desde toolbar) ---
  showBuscarPacienteModal = false;
  buscarModo: 'seleccionar' | 'toolbar' = 'toolbar';
  buscarBusqueda = '';
  buscarFiltrados: { id: number; nombre: string }[] = [];

  selectedPaciente: any = null;

  // ─── Nueva cita — prefill context for CitaFormModalComponent ─────────────
  apptPrefill: CitaFormContext = {};
  apptShowBanner = false;
  apptContextLabel = '';
  // ─── Quick Actions Sheet ────────────────────────────────────────────────────
  citaActiva: CitaDto | null = null;
  showQuickActions = false;
  private openPopover: HTMLIonPopoverElement | null = null;

  // ─── Confirm dialog (inline over the QA sheet) ───────────────────────────
  showCqaConfirm = false;
  cqaConfirmConfig: ConfirmDialogConfig | null = null;
  private cqaConfirmFn: (() => void) | null = null;

  readonly estadoClaseMap: Record<string, string> = {
    'Confirmada': 'cqa-estado--confirmada',
    'Completada': 'cqa-estado--completada',
    'Pendiente':  'cqa-estado--pendiente',
    'Cancelada':  'cqa-estado--cancelada',
    'No asistió': 'cqa-estado--no-asistio',
    'Pospuesta':  'cqa-estado--pospuesta',
  };
  // ─────────────────────────────────────────────────────────────────────────────

  // ─── Map CitaDto → CalendarEvent ───────────────────────────────────────────────────
  private mapCitaToEvent(c: CitaDto): CalendarEvent {
    const colorMap: Record<string, string> = {
      'Confirmada': '#6366f1',
      'Completada': '#10b981',
      'Pendiente':  '#f59e0b',
      'Cancelada':  '#ef4444',
      'No asistió': '#64748b',
      'Pospuesta':  '#8b5cf6',
    };
    return {
      title: `${c.nombre_paciente} ${c.apellido_paciente}`,
      time: c.hora_inicio,
      color: colorMap[c.estado] ?? '#94a3b8',
      status: c.estado as any,
      cita: c,
    };
  }

  getColorForDay(citas: number): string {
    if (citas >= this.maxCitasPorDia) {
      return '#ffe4e1'; // lleno
    } else if (citas >= this.maxCitasPorDia / 2) {
      return '#fcfcda'; // medio
    } else {
      return '#d8f8e1'; // bajo
    }
  }


  openHourModal(field: 'inicio' | 'fin') {
  this.selectingHourFor = field;
  this.showHourModal = true;
}


  closeHourModal() {
    this.showHourModal = false;
  }

  selectHour(h: string) {
    // Block modal hour fields
    if (this.selectingHourForBlock === 'block-inicio') {
      this.blockForm.horaInicio = h;
      this.blockErrors.rango = undefined;
      this.selectingHourForBlock = null;
      this.showHourModal = false;
      return;
    }
    if (this.selectingHourForBlock === 'block-fin') {
      this.blockForm.horaFin = h;
      this.blockErrors.rango = undefined;
      this.selectingHourForBlock = null;
      this.showHourModal = false;
      return;
    }
    // Nueva cita hour fields
    if (this.selectingHourFor === 'inicio') {
      this.newAppointment.hora_inicio = h;
    } else if (this.selectingHourFor === 'fin') {
      this.newAppointment.hora_fin = h;
    }
    this.selectingHourFor = null;
    this.showHourModal = false;
  }

  // Encabezado (Hoy ...)
  updateHeaderInfo() {
    const today = new Date();
    const weekNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    this.dayName = weekNames[today.getDay()];

    const day = today.getDate();
    const month = this.monthNames[today.getMonth()];
    const year = today.getFullYear();
    this.fullDate = `${day} de ${month} de ${year}`;

    const todayStr = this.formatDateLocal(today);
    const todayCalendarDay = this.calendarDays.find(d => d.fullDate === todayStr);
    this.eventsToday = todayCalendarDay?.events.length || 0;
  }

  // ----------------------------------------
  // GENERAR CALENDARIO MENSUAL
  // ----------------------------------------
  generateCalendar() {
    this.monthName = this.monthNames[this.currentMonth];
    this.calendarDays = [];

    const firstOfMonth = new Date(this.currentYear, this.currentMonth, 1);
    const rawStart = firstOfMonth.getDay();
    const startIndex = (rawStart + 6) % 7;

    const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(this.currentYear, this.currentMonth, 0).getDate();

    // Días del mes anterior (relleno)
    for (let i = startIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const d = new Date(this.currentYear, this.currentMonth - 1, dayNum);
      this.calendarDays.push(this.buildDay(d, false));
    }

    // Build date → citas map
    const citasByDate = new Map<string, CitaDto[]>();
    for (const c of this.citasSvc.getCitas()) {
      const list = citasByDate.get(c.fecha) ?? [];
      list.push(c);
      citasByDate.set(c.fecha, list);
    }

    // Días del mes actual
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(this.currentYear, this.currentMonth, i);
      const isoDate = this.formatDateLocal(d);
      const citasDelDia = citasByDate.get(isoDate) ?? [];
      const events = citasDelDia.map(c => this.mapCitaToEvent(c));
      this.calendarDays.push(this.buildDay(d, true, events));
    }

    // Relleno hasta completar 42 días (6 filas)
    while (this.calendarDays.length < 42) {
      const last = this.calendarDays[this.calendarDays.length - 1].date;
      const next = new Date(last);
      next.setDate(next.getDate() + 1);
      this.calendarDays.push(this.buildDay(next, false));
    }

    // Mantener seleccionado el mismo día si existe
    if (this.selectedDay) {
      const fd = this.selectedDay.fullDate;
      this.selectedDay = this.calendarDays.find(d => d.fullDate === fd) || null;
    }
  }

  // Crear objeto día
  buildDay(date: Date, inMonth: boolean, events: CalendarEvent[] = []): CalendarDay {

    const citas = events.length || 0;

    return {
      date,
      number: date.getDate(),
      inCurrentMonth: inMonth,
      isToday: this.isToday(date),
      fullDate: this.formatDateLocal(date),
      events,
      citas,
      colorCitas: this.getColorForDay(citas) // 👈 color dinámico
    };
  }

  // ----------------------------------------
  // NAVEGACIÓN ENTRE MESES
  // ----------------------------------------
  prevMonth() {
    if (this.currentMonth === 0) {
      this.currentMonth = 11;
      this.currentYear--;
    } else {
      this.currentMonth--;
    }
    this.selectedDay = null;
    this.generateCalendar();
  }

  nextMonth() {
    if (this.currentMonth === 11) {
      this.currentMonth = 0;
      this.currentYear++;
    } else {
      this.currentMonth++;
    }
    this.selectedDay = null;
    this.generateCalendar();
  }

  goToday() {
    this.currentDate = new Date();
    this.currentMonth = this.currentDate.getMonth();
    this.currentYear = this.currentDate.getFullYear();
    this.selectedDay = null;
    this.generateCalendar();
  }

  // ----------------------------------------
  // SELECCIÓN DE DÍA
  // ----------------------------------------
  selectDay(day: CalendarDay) {
    this.selectedDay = day;
  }

  // ----------------------------------------
  // UTILIDADES
  // ----------------------------------------
  isToday(d: Date) {
    const today = new Date();
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  }

  formatDateLocal(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  // ----------------------------------------
  // ACCIONES (botones superiores)
  // ----------------------------------------
  buscarPaciente() {
    console.log('🔍 Buscar paciente');
  }

  bloquearHorario() {
    this.openBlockModal();
  }

  // ----------------------------------------
  // BLOQUEAR HORARIO
  // ----------------------------------------
  showBlockModal = false;

  blockForm: {
    fecha: string | null;
    allDay: boolean;
    horaInicio: string | null;
    horaFin: string | null;
    motivo: string;
    repeat: 'none' | 'daily' | 'weekly' | 'monthly';
    createdAt: string | null;
  } = {
    fecha: null,
    allDay: true,
    horaInicio: null,
    horaFin: null,
    motivo: '',
    repeat: 'none',
    createdAt: null,
  };

  blockErrors: { fecha?: string; rango?: string } = {};

  // Selector de hora para bloqueo reutiliza the existing hour modal
  // We extend selectingHourFor to accept block-specific fields
  selectingHourForBlock: 'block-inicio' | 'block-fin' | null = null;

  readonly blockChips = [
    'Comida', 'Vacaciones', 'Reunión', 'Urgencia', 'Capacitación', 'Personal'
  ];

  readonly repeatOptions: { value: 'none' | 'daily' | 'weekly' | 'monthly'; label: string }[] = [
    { value: 'none',    label: 'No repetir'  },
    { value: 'daily',   label: 'Diario'      },
    { value: 'weekly',  label: 'Semanal'     },
    { value: 'monthly', label: 'Mensual'     },
  ];

  openBlockModal() {
    const today = this.formatDateLocal(new Date());
    this.blockForm = {
      fecha: today,
      allDay: true,
      horaInicio: null,
      horaFin: null,
      motivo: '',
      repeat: 'none',
      createdAt: null,
    };
    this.blockErrors = {};
    this.showBlockModal = true;
  }

  closeBlockModal() {
    this.showBlockModal = false;
    this.selectingHourForBlock = null;
  }

  openBlockDatePicker() {
    this.activeDateField = 'inicio'; // reuse modal, we intercept via blockDateMode
    this.blockDateMode = true;
    this.showDateModal = true;
  }

  blockDateMode = false;

  openBlockHourModal(field: 'block-inicio' | 'block-fin') {
    this.selectingHourForBlock = field;
    this.selectingHourFor = null; // ensure regular modal doesn’t interfere
    this.showHourModal = true;
  }

  applyBlockChip(chip: string) {
    this.blockForm.motivo = chip;
  }

  get blockSummary(): string {
    if (!this.blockForm.fecha) return '—';

    const [y, m, d] = this.blockForm.fecha.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const weekNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const dow = weekNames[dateObj.getDay()];
    const label = `${dow} ${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}/${y}`;

    const timeLabel = this.blockForm.allDay
      ? 'Todo el día'
      : `${this.blockForm.horaInicio ?? '?'} – ${this.blockForm.horaFin ?? '?'}`;

    const motivo = this.blockForm.motivo ? ` — ${this.blockForm.motivo}` : '';
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
      } else if (this.blockForm.horaInicio >= this.blockForm.horaFin) {
        this.blockErrors.rango = '“Hasta” debe ser posterior a “Desde”.';
      }
    }
    return Object.keys(this.blockErrors).length === 0;
  }

  saveBlock() {
    if (!this.validateBlock()) return;
    const bloqueo = {
      ...this.blockForm,
      createdAt: new Date().toISOString(),
    };
    console.log('Bloqueo creado', bloqueo);
    this.closeBlockModal();
  }

  // Kept for backward compat — delegates to quick actions
  verCita(ev: CalendarEvent) {
    this.abrirQuickActions(ev);
  }

  // ─── Quick Actions ───────────────────────────────────────────────────────

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
      // Capture the real button rect synchronously (before any await).
      const anchor = (mouseEvent.currentTarget ?? mouseEvent.target) as HTMLElement;
      const rect = anchor.getBoundingClientRect();

      // Clamp horizontal position so the 340px popover never overflows the
      // viewport edges (left or right) and keeps a 24px safe margin.
      const POPOVER_W = 340;
      const MARGIN    = 24;
      const vw        = window.innerWidth;
      const clampedLeft = Math.max(MARGIN, Math.min(rect.left, vw - POPOVER_W - MARGIN));

      // Synthetic anchor: same vertical position as the real button but with
      // the clamped horizontal position, so Ionic anchors correctly to it.
      const syntheticAnchor = {
        getBoundingClientRect: (): DOMRect => ({
          top:    rect.top,
          left:   clampedLeft,
          right:  clampedLeft + rect.width,
          bottom: rect.bottom,
          width:  rect.width,
          height: rect.height,
          x:      clampedLeft,
          y:      rect.top,
          toJSON() { return {}; },
        } as DOMRect),
      };

      // ── Desktop: Ionic PopoverController anchored to the synthetic element ──
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

    // ── Mobile: bottom sheet ──────────────────────────────────────────────────
    this.citaActiva = ev.cita;
    requestAnimationFrame(() => { this.showQuickActions = true; });
  }

  private handlePopoverAction(cita: CitaDto, action: CqaAction) {
    this.citaActiva = cita;
    switch (action) {
      case 'verDetalle':  this.accionVerDetalle(); break;
      case 'paciente':    this.accionAbrirPaciente(); break;
      case 'reprogramar': this.accionReprogramar(); break;
      case 'completada':  this.confirmarCambioEstado('Completada'); break;
      case 'noAsistio':   this.confirmarCambioEstado('No asistió'); break;
      case 'cancelar':    this.confirmarCambioEstado('Cancelada'); break;
      case 'crearSesion': this.accionCrearSesion(); break;
    }
  }

  cerrarQuickActions() {
    this.showQuickActions = false;
    // Keep citaActiva alive long enough for the close animation to finish
    // (mobile: 300ms slide-down; desktop: 200ms fade-out)
    setTimeout(() => { this.citaActiva = null; }, 320);
  }

  // ─── Inline confirm logic ────────────────────────────────────────────────

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

  /** Asks for confirmation before calling cambiarEstadoCita */
  confirmarCambioEstado(estado: EstadoCita) {
    if (!this.citaActiva) return;
    const nombre = `${this.citaActiva.nombre_paciente} ${this.citaActiva.apellido_paciente}`;
    const configs: Partial<Record<EstadoCita, ConfirmDialogConfig>> = {
      'Completada': {
        title: 'Marcar como completada',
        message: '¿La cita con este paciente fue realizada?',
        subject: nombre,
        confirmLabel: 'Sí, completada',
        cancelLabel: 'Volver',
        icon: 'checkmark-circle-outline',
        variant: 'primary',
      },
      'No asistió': {
        title: 'Registrar inasistencia',
        message: 'El paciente no se presentó a la cita con',
        subject: nombre,
        confirmLabel: 'Confirmar',
        cancelLabel: 'Volver',
        variant: 'danger',
        icon: 'person-remove-outline',
      },
      'Cancelada': {
        title: 'Cancelar cita',
        message: 'Se cancelará la cita de',
        subject: nombre,
        confirmLabel: 'Cancelar cita',
        cancelLabel: 'Volver',
        variant: 'danger',
        icon: 'close-circle-outline',
      },
    };
    const cfg = configs[estado];
    if (cfg) {
      this.pedirConfirmacion(cfg, () => this.cambiarEstadoCita(estado));
    } else {
      this.cambiarEstadoCita(estado);
    }
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
      fecha:      this.citaActiva.fecha,
      horaInicio: this.citaActiva.hora_inicio,
      horaFin:    this.citaActiva.hora_fin,
    };
    this.apptShowBanner = true;
    this.apptContextLabel = 'Reprogramando cita';
    this.cerrarQuickActions();
    document.body.classList.add('modal-open');
    this.showNewAppointmentPanel = true;
  }

  cambiarEstadoCita(estado: EstadoCita) {
    if (!this.citaActiva) return;
    this.citasSvc.updateCita({ ...this.citaActiva, estado });
    this.cerrarQuickActions();
    this.generateCalendar();
  }

  accionCrearSesion() {
    if (!this.citaActiva) return;
    // Navigate to sesiones with context — extend when sesiones module supports it
    this.router.navigate(['/dashboard/sesiones']);
  }

  // ────────────────────────────────────────────────────────
  // ACCIONES (Nueva cita)
  // ────────────────────────────────────────────────────────
  nuevaCita() {
    const fecha = this.selectedDay
      ? this.selectedDay.fullDate
      : this.formatDateLocal(new Date());

    this.apptPrefill = { fecha };
    this.apptShowBanner = !!this.selectedDay;
    if (this.selectedDay) {
      const [y, m, d] = fecha.split('-').map(Number);
      const dow = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][new Date(y, m - 1, d).getDay()];
      this.apptContextLabel = `${dow} ${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}/${y}`;
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

  onCitaGuardadaDesdeAgenda(_data: CitaFormData) {
    this.closeNewAppointmentPanel();
  }

  ngOnDestroy() {
    document.body.classList.remove('modal-open');
    this.openPopover?.dismiss();
    this.openPopover = null;
  }

  // ----------------------------------------
  // DATE PICKER MODAL
  // ----------------------------------------
  openDatePicker(field: 'inicio' | 'fin') {
    this.activeDateField = field;
    this.showDateModal = true;

    // Esperar a que el modal cree el ion-datetime
    setTimeout(() => {
      const datetime: any = document.querySelector('ion-datetime');
      if (datetime) {
        this.applyCalendarColors(datetime);
      }
    }, 150);
  }


  applyCalendarColors(datetimeEl: HTMLElement) {
    const shadow = datetimeEl.shadowRoot;
    if (!shadow) return;

    this.calendarDays.forEach(day => {
      if (!day.inCurrentMonth) return;

      // Mes real para ion-datetime (1–12)
      const realMonth = this.currentMonth + 1;

      const selector = `button.calendar-day[data-day="${day.number}"][data-month="${realMonth}"][data-year="${this.currentYear}"]`;

      const dayEl = shadow.querySelector(selector) as HTMLElement;

      console.log("Pintando:", selector, "=>", dayEl);

      if (dayEl) {
        dayEl.style.setProperty('--day-bg-color', day.colorCitas);
        dayEl.style.borderRadius = '50%';
        dayEl.style.background = day.colorCitas;
      }
    });
  }



  assignColorsToDays() {
    this.calendarDays.forEach(day => {
      const count = (day.events?.length || 0);

      if (count >= this.maxCitasPorDia) {
        day.colorCitas = '#fcb7af';       // rojo suave
      } else if (count >= this.maxCitasPorDia / 2) {
        day.colorCitas = '#fdf9c4';       // amarillo
      } else {
        day.colorCitas = '#d8f8e1';       // verde (incluye cero citas)
      }
    });
  }




  closeDateModal() {
    this.showDateModal = false;
    this.activeDateField = null;
  }

  selectDate(event: any) {
    const value = event.detail.value;

    if (this.blockDateMode) {
      this.blockForm.fecha = value?.split('T')[0] ?? value;
      this.blockErrors.fecha = undefined;
      this.blockDateMode = false;
      this.closeDateModal();
      return;
    }

    if (this.activeDateField === 'inicio') {
      this.newAppointment.fecha_inicio = value;
    }
    if (this.activeDateField === 'fin') {
      this.newAppointment.fecha_fin = value;
    }

    this.closeDateModal();
  }

  // ----------------------------------------
  // DRAG PARA CERRAR EN MÓVIL
  // ----------------------------------------
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

    // Solo permitimos arrastrar hacia abajo
    if (diff <= 0) return;

    const panel = this.getPanelElement();
    if (panel) {
      panel.style.transform = `translate(-50%, ${diff}px)`;
    }
  }

  endDrag(_event: TouchEvent) {
    if (!this.isMobile() || !this.isDragging) return;

    const diff = this.dragCurrentY - this.dragStartY;
    const panel = this.getPanelElement();

    this.isDragging = false;

    const threshold = 120; // px para cerrar

    if (diff > threshold) {
      // cerrar
      this.closeNewAppointmentPanel();
    } else {
      // regresar a su posición original (CSS se encarga)
      if (panel) {
        panel.style.transform = '';
      }
    }

    this.dragStartY = 0;
    this.dragCurrentY = 0;
  }

  private resetPanelTransform() {
    const panel = this.getPanelElement();
    if (panel) {
      panel.style.transform = '';
    }
  }

  usarFechaRecomendada() {
    const fecha = this.recommendedDate;

    this.newAppointment.fecha_inicio = fecha;
    this.newAppointment.hora_inicio = this.formatHour(fecha);
  }

  usarSiguienteDisponible() {
    const fecha = this.nextAvailableDate;

    this.newAppointment.fecha_fin = fecha;
    this.newAppointment.hora_fin = this.formatHour(fecha);
  }

  formatHour(date: Date): string {
    let h = date.getHours();
    let m = date.getMinutes();

    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;

    const mm = m.toString().padStart(2, '0');

    return `${h}:${mm} ${ampm}`;
  }

  openPacienteModal() {
    this.pacientesFiltrados = [...this.pacientes];
    this.busquedaPaciente = '';
    this.showPacienteModal = true;
  }

  closePacienteModal() {
    this.showPacienteModal = false;
  }

  filtrarPacientes() {
    const term = this.busquedaPaciente.toLowerCase();

    this.pacientesFiltrados = this.pacientes.filter(p =>
      p.nombre.toLowerCase().includes(term)
    );
  }

  selectPaciente(paciente: any) {
    this.selectedPaciente = paciente;
    this.newAppointment.id_paciente = paciente.id;
    this.closePacienteModal();
  }

  // ----------------------------------------
  // BUSCAR PACIENTE (modal toolbar)
  // ----------------------------------------
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

  private pendingNavUrl: string | null = null;

  verPaciente(p: any) {
    this.verPacienteDesdeAgenda(p);
  }

  verPacienteDesdeAgenda(paciente: { id: number; nombre: string }) {
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

  seleccionarPacienteDesdeBusqueda(p: any) {
    this.selectedPaciente = p;
    this.closeBuscarPacienteModal();
  }

  nuevaCitaConPaciente(p: any) {
    this.closeBuscarPacienteModal();
    this.selectedPaciente = p;
    this.newAppointment.id_paciente = p.id;
    this.nuevaCita();
  }

  modalEnterAnimation(baseEl: HTMLElement) {
    const root = baseEl.shadowRoot || baseEl;

    const backdropAnimation = createAnimation()
      .addElement(root.querySelector('ion-backdrop')!)
      .fromTo('opacity', '0', '0.45');

    const wrapper = root.querySelector('.ion-overlay-wrapper')!;
    const wrapperAnimation = createAnimation()
      .addElement(wrapper)
      .keyframes([
        { offset: 0, opacity: '0', transform: 'scale(0.9)' },
        { offset: 1, opacity: '1', transform: 'scale(1)' }
      ])
      .duration(200)
      .easing('ease-out');

    return createAnimation()
      .addAnimation([backdropAnimation, wrapperAnimation]);
  }



}
