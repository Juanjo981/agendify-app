import {
  Component, Input, Output, EventEmitter,
  OnInit, OnChanges, SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

export interface AgfCalDay {
  iso: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  disabled: boolean;
}

@Component({
  selector: 'agf-date-panel',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './agf-date-panel.component.html',
  styleUrls: ['./agf-date-panel.component.scss'],
})
export class AgfDatePanelComponent implements OnInit, OnChanges {
  @Input() value     = '';
  @Input() min       = '';
  @Input() max       = '';
  @Input() allowPast = true;

  @Output() valueChange = new EventEmitter<string>();

  viewYear  = 0;
  viewMonth = 0;
  weeks: AgfCalDay[][] = [];

  readonly weekDays   = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
  readonly monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];

  get monthLabel(): string {
    return `${this.monthNames[this.viewMonth]} ${this.viewYear}`;
  }

  ngOnInit(): void {
    const base     = this.value ? new Date(this.value + 'T00:00:00') : new Date();
    this.viewYear  = base.getFullYear();
    this.viewMonth = base.getMonth();
    this.build();
  }

  ngOnChanges(c: SimpleChanges): void {
    if ((c['value'] || c['min'] || c['max']) && this.viewYear) {
      this.build();
    }
  }

  prevMonth(): void {
    if (this.viewMonth === 0) { this.viewMonth = 11; this.viewYear--; }
    else { this.viewMonth--; }
    this.build();
  }

  nextMonth(): void {
    if (this.viewMonth === 11) { this.viewMonth = 0; this.viewYear++; }
    else { this.viewMonth++; }
    this.build();
  }

  select(d: AgfCalDay): void {
    if (d.disabled || !d.inMonth) return;
    this.valueChange.emit(d.iso);
  }

  // ─────────────────────────────────────────────────────────────────────────
  private toIso(y: number, m0: number, d: number): string {
    return `${y}-${String(m0 + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  private build(): void {
    const today     = new Date();
    const todayIso  = this.toIso(today.getFullYear(), today.getMonth(), today.getDate());

    const first      = new Date(this.viewYear, this.viewMonth, 1);
    const startOff   = (first.getDay() + 6) % 7;   // Monday = 0
    const daysInMon  = new Date(this.viewYear, this.viewMonth + 1, 0).getDate();
    const daysInPrev = new Date(this.viewYear, this.viewMonth, 0).getDate();

    const cells: AgfCalDay[] = [];

    // Tail of previous month
    for (let i = startOff - 1; i >= 0; i--) {
      const pd = daysInPrev - i;
      const pm = this.viewMonth === 0 ? 11 : this.viewMonth - 1;
      const py = this.viewMonth === 0 ? this.viewYear - 1 : this.viewYear;
      cells.push({ iso: this.toIso(py, pm, pd), day: pd, inMonth: false, isToday: false, disabled: true });
    }

    // Current month
    for (let d = 1; d <= daysInMon; d++) {
      const iso      = this.toIso(this.viewYear, this.viewMonth, d);
      const belowMin = this.min ? iso < this.min : false;
      const aboveMax = this.max ? iso > this.max : false;
      const isPast   = iso < todayIso;
      cells.push({
        iso,
        day:      d,
        inMonth:  true,
        isToday:  iso === todayIso,
        disabled: belowMin || aboveMax || (isPast && !this.allowPast),
      });
    }

    // Head of next month
    const tail = (7 - (cells.length % 7)) % 7;
    for (let d = 1; d <= tail; d++) {
      const nm = this.viewMonth === 11 ? 0 : this.viewMonth + 1;
      const ny = this.viewMonth === 11 ? this.viewYear + 1 : this.viewYear;
      cells.push({ iso: this.toIso(ny, nm, d), day: d, inMonth: false, isToday: false, disabled: true });
    }

    this.weeks = [];
    for (let i = 0; i < cells.length; i += 7) {
      this.weeks.push(cells.slice(i, i + 7));
    }
  }
}
