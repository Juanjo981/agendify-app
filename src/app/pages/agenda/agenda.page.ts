import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, createAnimation } from '@ionic/angular';

interface CalendarEvent {
  title: string;
  time: string;
  color: string;
  status?: 'Confirmada' | 'Pendiente' | 'Cancelada';
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
  imports: [IonicModule, CommonModule, FormsModule],
  standalone: true,
  styleUrls: ['./agenda.page.scss'],
})
export class AgendaPage {

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
  pacientes = [
    { id: 1, nombre: 'Juan Pérez' },
    { id: 2, nombre: 'Ana López' },
    { id: 3, nombre: 'Carlos Medina' },
    { id: 4, nombre: 'María Torres' },
    { id: 5, nombre: 'Luis Hernández' },
    { id: 6, nombre: 'Fernanda Ruiz' },
    { id: 7, nombre: 'Jorge Sánchez' },
    { id: 8, nombre: 'Daniela Romero' },
    { id: 9, nombre: 'Miguel Castro' },
    { id: 10, nombre: 'Sofía Navarro' },
    { id: 11, nombre: 'Adrián Delgado' },
    { id: 12, nombre: 'Gabriela Morales' },
    { id: 13, nombre: 'Ricardo Vega' },
    { id: 14, nombre: 'Paola Reyes' },
    { id: 15, nombre: 'Héctor Silva' },
    { id: 16, nombre: 'Claudia Flores' },
    { id: 17, nombre: 'Roberto Aguilar' },
    { id: 18, nombre: 'Elena Carrillo' },
    { id: 19, nombre: 'Diego Ortiz' },
    { id: 20, nombre: 'Valeria Campos' }
  ];

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

  constructor() {
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

    // Días del mes actual
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(this.currentYear, this.currentMonth, i);
      this.calendarDays.push(
        this.buildDay(d, true, Math.random() > 0.7 ? this.exampleEvents : [])
      );
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

  verCita(ev: CalendarEvent) {
    console.log('📄 Ver detalle de cita:', ev);
  }

  // ----------------------------------------
  // ACCIONES (Nueva cita)
  // ----------------------------------------
  nuevaCita() {
    const start = new Date();
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    this.newAppointment.fecha_inicio = start.toISOString();
    this.newAppointment.fecha_fin = end.toISOString();

    this.recommendedDate = start;
    this.nextAvailableDate = end;

    this.showNewAppointmentPanel = true;
  }

  closeNewAppointmentPanel() {
    this.showNewAppointmentPanel = false;
    this.resetPanelTransform();
    this.dragStartY = 0;
    this.dragCurrentY = 0;
    this.isDragging = false;
  }

  saveAppointment() {
    console.log('Nueva cita:', this.newAppointment);
    this.closeNewAppointmentPanel();
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

  verPaciente(p: any) {
    console.log('Ver paciente', p);
    // TODO: navegar a PacienteDetallePage
  }

  seleccionarPacienteDesdeBusqueda(p: any) {
    this.selectedPaciente = p;
    this.newAppointment.id_paciente = p.id;
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
