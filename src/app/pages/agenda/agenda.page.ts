import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

interface CalendarEvent {
  title: string;
  time: string;
  color: string;
  status?: 'Confirmada' | 'Pendiente' | 'Cancelada';
}

interface CalendarDay {
  date: Date;
  number: number;
  inCurrentMonth: boolean;
  isToday: boolean;
  fullDate: string;
  events: CalendarEvent[];
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

  currentDate = new Date();
  currentMonth = this.currentDate.getMonth();
  currentYear = this.currentDate.getFullYear();

  weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  monthNames = [
    "Enero", "Febrero", "Marzo", "Abril",
    "Mayo", "Junio", "Julio", "Agosto",
    "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  calendarDays: CalendarDay[] = [];
  selectedDay: CalendarDay | null = null;

  monthName = '';

  // Eventos de prueba
  exampleEvents: CalendarEvent[] = [
    { title: 'Cita con Ana', time: '09:00 AM', color: '#ef4444', status: 'Confirmada' },
    { title: 'Terapia Luis', time: '11:00 AM', color: '#3b82f6', status: 'Confirmada' },
    { title: 'Evaluación María', time: '02:00 PM', color: '#facc15', status: 'Pendiente' },
    { title: 'Seguimiento Carlos', time: '04:00 PM', color: '#22c55e', status: 'Confirmada' },
  ];

  constructor() {
    this.generateCalendar();
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
    return {
      date,
      number: date.getDate(),
      inCurrentMonth: inMonth,
      isToday: this.isToday(date),
      fullDate: this.formatDateLocal(date),
      events
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
  nuevaCita() {
    console.log("🟦 Crear nueva cita");
  }

  buscarPaciente() {
    console.log("🔍 Buscar paciente");
  }

  bloquearHorario() {
    console.log("⛔ Bloquear horario");
  }

  verCita(ev: CalendarEvent) {
    console.log("📄 Ver detalle de cita:", ev);
  }
}
