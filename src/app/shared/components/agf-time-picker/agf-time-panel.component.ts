import {
  Component, Input, Output, EventEmitter,
  OnInit, OnChanges, SimpleChanges, AfterViewInit,
  ViewChild, ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector:    'agf-time-panel',
  standalone:  true,
  imports:     [CommonModule],
  templateUrl: './agf-time-panel.component.html',
  styleUrls:   ['./agf-time-panel.component.scss'],
})
export class AgfTimePanelComponent implements OnInit, OnChanges, AfterViewInit {
  @Input() value = '';    // HH:mm
  @Input() step  = 5;     // minute step (1, 5, 10, 15…)

  @Output() valueChange = new EventEmitter<string>();

  @ViewChild('hoursScroll') hoursScrollRef!: ElementRef<HTMLDivElement>;
  @ViewChild('minsScroll')  minsScrollRef!:  ElementRef<HTMLDivElement>;

  selectedHour   = 9;
  selectedMinute = 0;
  hours:   number[] = [];
  minutes: number[] = [];

  ngOnInit(): void {
    this.buildLists();
    this.parseValue();
  }

  ngOnChanges(c: SimpleChanges): void {
    if (c['value'] && !c['value'].firstChange) { this.parseValue(); }
    if (c['step']  && !c['step'].firstChange)  { this.buildLists(); }
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.scrollToSelected(), 0);
  }

  selectHour(h: number): void {
    this.selectedHour = h;
    this.emit();
  }

  selectMinute(m: number): void {
    this.selectedMinute = m;
    this.emit();
  }

  pad(n: number): string { return String(n).padStart(2, '0'); }

  // ─────────────────────────────────────────────────────────────────────────
  private buildLists(): void {
    this.hours   = Array.from({ length: 24 }, (_, i) => i);
    const slots  = Math.floor(60 / this.step);
    this.minutes = Array.from({ length: slots }, (_, i) => i * this.step);
  }

  private parseValue(): void {
    if (!this.value) return;
    const [h, m] = this.value.split(':').map(Number);
    this.selectedHour   = isNaN(h) ? 9 : Math.max(0, Math.min(23, h));
    const raw           = isNaN(m) ? 0 : m;
    this.selectedMinute = Math.round(raw / this.step) * this.step % 60;
  }

  private emit(): void {
    this.valueChange.emit(`${this.pad(this.selectedHour)}:${this.pad(this.selectedMinute)}`);
  }

  private scrollToSelected(): void {
    const scrollTo = (ref: ElementRef<HTMLDivElement> | undefined, value: number, list: number[]) => {
      if (!ref?.nativeElement) return;
      const idx = list.indexOf(value);
      if (idx < 0) return;
      const ITEM_H = 38; // px — must match CSS .atp-item height
      ref.nativeElement.scrollTop = Math.max(0, idx * ITEM_H - ITEM_H * 2);
    };
    scrollTo(this.hoursScrollRef, this.selectedHour,   this.hours);
    scrollTo(this.minsScrollRef,  this.selectedMinute, this.minutes);
  }
}
