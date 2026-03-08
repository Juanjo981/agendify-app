import {
  Component, Input, Output, EventEmitter,
  OnInit, OnChanges, SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { CitasMockService } from '../../../pages/citas/citas.service.mock';

export interface MiniCalDay {
  iso: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  occupancy: 'none' | 'low' | 'medium' | 'full';
  count: number;
  tooltip: string;
}

@Component({
  selector: 'app-mini-calendar',
  templateUrl: './mini-calendar.component.html',
  styleUrls: ['./mini-calendar.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class MiniCalendarComponent implements OnInit, OnChanges {
  /** Currently selected ISO date (YYYY-MM-DD). Two-way bindable via [(value)]. */
  @Input() value = '';
  @Output() valueChange = new EventEmitter<string>();

  /** Maximum citas per day — used to compute occupancy ratios. */
  @Input() maxPerDay = 4;

  viewYear  = 0;
  viewMonth = 0;   // 0-based
  weeks: MiniCalDay[][] = [];

  readonly weekDays  = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  readonly monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];

  get monthLabel(): string {
    return `${this.monthNames[this.viewMonth]} ${this.viewYear}`;
  }

  constructor(private citasSvc: CitasMockService) {}

  ngOnInit() {
    const base = this.value ? new Date(this.value + 'T00:00:00') : new Date();
    this.viewYear  = base.getFullYear();
    this.viewMonth = base.getMonth();
    this.buildCalendar();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['value'] && !changes['value'].firstChange && this.value) {
      const d = new Date(this.value + 'T00:00:00');
      // Only jump the view if we're showing a different month
      if (d.getFullYear() !== this.viewYear || d.getMonth() !== this.viewMonth) {
        this.viewYear  = d.getFullYear();
        this.viewMonth = d.getMonth();
      }
      this.buildCalendar();
    }
  }

  prevMonth() {
    if (this.viewMonth === 0) { this.viewMonth = 11; this.viewYear--; }
    else { this.viewMonth--; }
    this.buildCalendar();
  }

  nextMonth() {
    if (this.viewMonth === 11) { this.viewMonth = 0; this.viewYear++; }
    else { this.viewMonth++; }
    this.buildCalendar();
  }

  selectDay(d: MiniCalDay) {
    if (!d.inMonth || d.isPast) return;
    this.valueChange.emit(d.iso);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private
  // ─────────────────────────────────────────────────────────────────────────
  private toIso(y: number, m0: number, d: number): string {
    return `${y}-${String(m0 + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  private buildCalendar() {
    const today = new Date();
    const todayIso = this.toIso(today.getFullYear(), today.getMonth(), today.getDate());

    // Build occupancy map from service
    const countMap: Record<string, number> = {};
    this.citasSvc.getCitas()
      .filter(c => c.estado !== 'Cancelada')
      .forEach(c => { countMap[c.fecha] = (countMap[c.fecha] ?? 0) + 1; });

    const firstOfMonth = new Date(this.viewYear, this.viewMonth, 1);
    const startOffset  = (firstOfMonth.getDay() + 6) % 7; // Mon=0
    const daysInMonth  = new Date(this.viewYear, this.viewMonth + 1, 0).getDate();
    const daysInPrev   = new Date(this.viewYear, this.viewMonth, 0).getDate();

    const cells: MiniCalDay[] = [];

    // Padding from previous month
    for (let i = startOffset - 1; i >= 0; i--) {
      const pd = daysInPrev - i;
      const pm = this.viewMonth === 0 ? 11 : this.viewMonth - 1;
      const py = this.viewMonth === 0 ? this.viewYear - 1 : this.viewYear;
      cells.push({
        iso: this.toIso(py, pm, pd), day: pd,
        inMonth: false, isToday: false, isPast: true, occupancy: 'none', count: 0, tooltip: '',
      });
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      const iso     = this.toIso(this.viewYear, this.viewMonth, d);
      const isPast  = iso < todayIso;
      const isToday = iso === todayIso;
      const count   = countMap[iso] ?? 0;
      const ratio   = count / this.maxPerDay;

      let occupancy: MiniCalDay['occupancy'] = 'none';
      if (count > 0) {
        if (ratio >= 0.8)       occupancy = 'full';
        else if (ratio >= 0.4)  occupancy = 'medium';
        else                    occupancy = 'low';
      }

      console.log({ fecha: iso, citasDia: count, capacidadDia: this.maxPerDay, ratio, occupancy });

      const tooltip = count === 0
        ? 'Sin citas'
        : `${count} de ${this.maxPerDay} espacio${this.maxPerDay !== 1 ? 's' : ''} ocupado${count !== 1 ? 's' : ''}`;

      cells.push({ iso, day: d, inMonth: true, isToday, isPast, occupancy, count, tooltip });
    }

    // Padding from next month (complete the last row)
    let next = 1;
    while (cells.length % 7 !== 0) {
      const nm = this.viewMonth === 11 ? 0 : this.viewMonth + 1;
      const ny = this.viewMonth === 11 ? this.viewYear + 1 : this.viewYear;
      cells.push({
        iso: this.toIso(ny, nm, next), day: next++,
        inMonth: false, isToday: false, isPast: false, occupancy: 'none', count: 0, tooltip: '',
      });
    }

    // Chunk into rows of 7
    this.weeks = [];
    for (let i = 0; i < cells.length; i += 7) {
      this.weeks.push(cells.slice(i, i + 7));
    }
  }
}
