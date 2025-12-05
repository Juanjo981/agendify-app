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

  // 📌 Información del calendario
  currentDate = new Date();
  currentMonth = this.currentDate.getMonth();
  currentYear = this.currentDate.getFullYear();

  // 🔤 Meses en español
  monthNames = [
    "Enero", "Febrero", "Marzo", "Abril",
    "Mayo", "Junio", "Julio", "Agosto",
    "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  // 👉 Vista actual: mes / semana / día
  currentView: 'month' | 'week' | 'day' = 'month';

  // Semana en español, desde lunes
  weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  calendarDays: CalendarDay[] = [];
  selectedDay: CalendarDay | null = null;

  monthName = '';

  // Eventos demo
  exampleEvents: CalendarEvent[] = [
    { title: 'Cita con Ana', time: '09:00 AM', color: '#ef4444', status: 'Confirmada' },
    { title: 'Terapia Luis', time: '11:00 AM', color: '#3b82f6', status: 'Confirmada' },
    { title: 'Evaluación María', time: '02:00 PM', color: '#facc15', status: 'Pendiente' },
    { title: 'Seguimiento Carlos', time: '04:00 PM', color: '#22c55e', status: 'Confirmada' },
  ];

  constructor() {
    this.generateCalendar();
  }

  // -------------------------------------------------------
  // 📅 GENERAR CALENDARIO
  // -------------------------------------------------------
  generateCalendar() {
    this.monthName = this.monthNames[this.currentMonth];

    this.calendarDays = [];

    const firstOfMonth = new Date(this.currentYear, this.currentMonth, 1);
    const rawStart = firstOfMonth.getDay(); // domingo = 0
    const startIndex = (rawStart + 6) % 7; // lunes = 0

    const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(this.currentYear, this.currentMonth, 0).getDate();

    // 🗓 Días del mes anterior
    for (let i = startIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const d = new Date(this.currentYear, this.currentMonth - 1, dayNum);
      this.calendarDays.push({
        date: d,
        number: dayNum,
        inCurrentMonth: false,
        isToday: this.isToday(d),
        fullDate: this.formatDateLocal(d),
        events: [],
      });
    }

    // 🗓 Días del mes actual
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(this.currentYear, this.currentMonth, i);
      this.calendarDays.push({
        date: d,
        number: i,
        inCurrentMonth: true,
        isToday: this.isToday(d),
        fullDate: this.formatDateLocal(d),
        events: Math.random() > 0.7 ? this.exampleEvents : [],
      });
    }

    // 🗓 Completar hasta 42 días
    while (this.calendarDays.length < 42) {
      const last = this.calendarDays[this.calendarDays.length - 1].date;
      const next = new Date(last);
      next.setDate(next.getDate() + 1);
      this.calendarDays.push({
        date: next,
        number: next.getDate(),
        inCurrentMonth: false,
        isToday: this.isToday(next),
        fullDate: this.formatDateLocal(next),
        events: [],
      });
    }
  }

  // -------------------------------------------------------
  // 🔄 VISTAS (Mes / Semana / Día)
  // -------------------------------------------------------
  setView(view: 'month' | 'week' | 'day') {
    this.currentView = view;
  }

  // -------------------------------------------------------
  // ⬅️➡️ CAMBIO DE MESES
  // -------------------------------------------------------
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

  // -------------------------------------------------------
  // ✔ SELECCIONAR DÍA
  // -------------------------------------------------------
  selectDay(day: CalendarDay) {
    this.selectedDay = day;
  }

  // -------------------------------------------------------
  // 🟢 Funciones auxiliares
  // -------------------------------------------------------
  isToday(d: Date) {
    const today = new Date();
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  }

  verCita(ev: CalendarEvent) {
    console.log("Abrir detalle de la cita:", ev);
    // Aquí luego abres un modal, o navegas a /cita/:id, etc
  }

  formatDateLocal(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
