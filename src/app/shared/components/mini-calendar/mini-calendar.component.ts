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
import { IonicModule } from '@ionic/angular';
import { CitasApiService } from '../../../pages/citas/citas-api.service';
import { toDatePart } from '../../../pages/citas/models/cita.model';

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
  @Input() value = '';
  @Output() valueChange = new EventEmitter<string>();
  @Input() maxPerDay = 4;

  viewYear = 0;
  viewMonth = 0;
  weeks: MiniCalDay[][] = [];

  readonly weekDays = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
  readonly monthNames = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];

  get monthLabel(): string {
    return `${this.monthNames[this.viewMonth]} ${this.viewYear}`;
  }

  constructor(private citasSvc: CitasApiService) {}

  ngOnInit() {
    const base = this.value ? new Date(this.value + 'T00:00:00') : new Date();
    this.viewYear = base.getFullYear();
    this.viewMonth = base.getMonth();
    void this.buildCalendar();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['value'] && !changes['value'].firstChange && this.value) {
      const d = new Date(this.value + 'T00:00:00');
      if (d.getFullYear() !== this.viewYear || d.getMonth() !== this.viewMonth) {
        this.viewYear = d.getFullYear();
        this.viewMonth = d.getMonth();
      }
      void this.buildCalendar();
    }
  }

  prevMonth() {
    if (this.viewMonth === 0) {
      this.viewMonth = 11;
      this.viewYear--;
    } else {
      this.viewMonth--;
    }
    void this.buildCalendar();
  }

  nextMonth() {
    if (this.viewMonth === 11) {
      this.viewMonth = 0;
      this.viewYear++;
    } else {
      this.viewMonth++;
    }
    void this.buildCalendar();
  }

  selectDay(d: MiniCalDay) {
    if (!d.inMonth || d.isPast) return;
    this.valueChange.emit(d.iso);
  }

  private toIso(y: number, m0: number, d: number): string {
    return `${y}-${String(m0 + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  private async buildCalendar() {
    const today = new Date();
    const todayIso = this.toIso(today.getFullYear(), today.getMonth(), today.getDate());
    const countMap = await this.loadCountMap();

    const firstOfMonth = new Date(this.viewYear, this.viewMonth, 1);
    const startOffset = (firstOfMonth.getDay() + 6) % 7;
    const daysInMonth = new Date(this.viewYear, this.viewMonth + 1, 0).getDate();
    const daysInPrev = new Date(this.viewYear, this.viewMonth, 0).getDate();

    const cells: MiniCalDay[] = [];

    for (let i = startOffset - 1; i >= 0; i--) {
      const pd = daysInPrev - i;
      const pm = this.viewMonth === 0 ? 11 : this.viewMonth - 1;
      const py = this.viewMonth === 0 ? this.viewYear - 1 : this.viewYear;
      cells.push({
        iso: this.toIso(py, pm, pd),
        day: pd,
        inMonth: false,
        isToday: false,
        isPast: true,
        occupancy: 'none',
        count: 0,
        tooltip: '',
      });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const iso = this.toIso(this.viewYear, this.viewMonth, d);
      const isPast = iso < todayIso;
      const isToday = iso === todayIso;
      const count = countMap[iso] ?? 0;
      const ratio = count / this.maxPerDay;

      let occupancy: MiniCalDay['occupancy'] = 'none';
      if (count > 0) {
        if (ratio >= 0.8) occupancy = 'full';
        else if (ratio >= 0.4) occupancy = 'medium';
        else occupancy = 'low';
      }

      const tooltip = count === 0
        ? 'Sin citas'
        : `${count} de ${this.maxPerDay} espacios ocupados`;

      cells.push({
        iso,
        day: d,
        inMonth: true,
        isToday,
        isPast,
        occupancy,
        count,
        tooltip,
      });
    }

    let next = 1;
    while (cells.length % 7 !== 0) {
      const nm = this.viewMonth === 11 ? 0 : this.viewMonth + 1;
      const ny = this.viewMonth === 11 ? this.viewYear + 1 : this.viewYear;
      cells.push({
        iso: this.toIso(ny, nm, next),
        day: next++,
        inMonth: false,
        isToday: false,
        isPast: false,
        occupancy: 'none',
        count: 0,
        tooltip: '',
      });
    }

    this.weeks = [];
    for (let i = 0; i < cells.length; i += 7) {
      this.weeks.push(cells.slice(i, i + 7));
    }
  }

  private async loadCountMap(): Promise<Record<string, number>> {
    const firstIso = this.toIso(this.viewYear, this.viewMonth, 1);
    const lastDay = new Date(this.viewYear, this.viewMonth + 1, 0).getDate();
    const lastIso = this.toIso(this.viewYear, this.viewMonth, lastDay);

    const countMap: Record<string, number> = {};
    let page = 0;
    let isLast = false;

    try {
      while (!isLast && page < 5) {
        const response = await this.citasSvc.getAll({
          fechaDesde: `${firstIso}T00:00:00`,
          fechaHasta: `${lastIso}T23:59:59`,
          page,
          size: 200,
          sort: 'fecha_inicio,asc',
        });

        for (const cita of response.content) {
          if (cita.estado_cita === 'CANCELADA') continue;
          const date = toDatePart(cita.fecha_inicio);
          if (!date) continue;
          countMap[date] = (countMap[date] ?? 0) + 1;
        }

        isLast = response.last;
        page++;
      }
    } catch {
      return {};
    }

    return countMap;
  }
}
