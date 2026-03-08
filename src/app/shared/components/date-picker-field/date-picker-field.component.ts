import {
  Component, Input, Output, EventEmitter, OnDestroy,
  ViewChild, ElementRef, ApplicationRef, EnvironmentInjector,
  Injector, ComponentRef, createComponent,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { MiniCalendarComponent } from '../mini-calendar/mini-calendar.component';

const PANEL_W  = 290;
const PANEL_H  = 350; // approx panel height for smart positioning

@Component({
  selector: 'app-date-picker-field',
  templateUrl: './date-picker-field.component.html',
  styleUrls: ['./date-picker-field.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class DatePickerFieldComponent implements OnDestroy {
  @Input() value    = '';
  @Input() label    = 'Fecha *';
  @Input() placeholder = 'Seleccionar fecha';
  @Input() hasError = false;
  @Input() errorMsg = '';

  @Output() valueChange = new EventEmitter<string>();

  @ViewChild('trigger') triggerRef!: ElementRef<HTMLButtonElement>;

  isOpen = false;

  private calRef: ComponentRef<MiniCalendarComponent> | null = null;
  private wrapperEl: HTMLElement | null = null;

  private readonly outsideClick = (e: MouseEvent) => {
    const target = e.target as Node;
    if (
      !this.triggerRef.nativeElement.contains(target) &&
      !this.wrapperEl?.contains(target)
    ) {
      this.close();
    }
  };

  private readonly onScroll = () => this.close();

  constructor(
    private appRef: ApplicationRef,
    private envInjector: EnvironmentInjector,
    private injector: Injector,
  ) {}

  /** Human-readable label for the trigger button */
  get displayLabel(): string {
    if (!this.value) return '';
    const [y, m, d] = this.value.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const dow = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][date.getDay()];
    return `${dow} ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
  }

  toggle(event: MouseEvent) {
    event.stopPropagation();
    this.isOpen ? this.close() : this.openPanel();
  }

  private openPanel() {
    const rect   = this.triggerRef.nativeElement.getBoundingClientRect();
    const spaceB = window.innerHeight - rect.bottom;
    const top    = spaceB >= PANEL_H + 8
      ? rect.bottom + 6
      : Math.max(4, rect.top - PANEL_H - 6);
    const left   = Math.min(Math.max(4, rect.left), window.innerWidth - PANEL_W - 4);

    // Create MiniCalendarComponent dynamically — appended to <body> so it
    // escapes any ancestor stacking context (backdrop-filter / transform).
    this.calRef = createComponent(MiniCalendarComponent, {
      environmentInjector: this.envInjector,
      elementInjector: this.injector,
    });

    this.calRef.setInput('value', this.value);

    // Subscribe to calendar output
    this.calRef.instance.valueChange.subscribe((date: string) => {
      this.valueChange.emit(date);
      this.close();
    });

    // Build wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'dpf-floating-panel';
    Object.assign(wrapper.style, {
      position: 'fixed',
      top:      `${top}px`,
      left:     `${left}px`,
      width:    `${PANEL_W}px`,
      zIndex:   '99999',
    });
    wrapper.appendChild(this.calRef.location.nativeElement);
    document.body.appendChild(wrapper);
    this.wrapperEl = wrapper;

    // Attach to Angular change detection
    this.appRef.attachView(this.calRef.hostView);

    this.isOpen = true;

    // Listeners — small delay so the current click doesn't immediately close
    setTimeout(() => {
      document.addEventListener('click', this.outsideClick);
      document.addEventListener('scroll', this.onScroll, { capture: true });
    }, 50);
  }

  close() {
    if (!this.isOpen) return;

    document.removeEventListener('click', this.outsideClick);
    document.removeEventListener('scroll', this.onScroll, { capture: true });

    if (this.calRef) {
      this.appRef.detachView(this.calRef.hostView);
      this.calRef.destroy();
      this.calRef = null;
    }

    if (this.wrapperEl?.parentNode) {
      this.wrapperEl.parentNode.removeChild(this.wrapperEl);
      this.wrapperEl = null;
    }

    this.isOpen = false;
  }

  ngOnDestroy() {
    this.close();
  }
}
