import {
  Component, Input, Output, EventEmitter, OnDestroy, OnChanges, SimpleChanges,
  ViewChild, ElementRef, ApplicationRef, EnvironmentInjector,
  Injector, ComponentRef, createComponent, forwardRef, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { AgfDatePanelComponent } from './agf-date-panel.component';
import { AgfPickerRegistryService } from '../agf-picker-registry.service';

const PANEL_W = 280;
const PANEL_H = 340;

/**
 * agf-date-picker
 * ──────────────────────────────────────────────────────────────────────────────
 * Branded date-picker for all date fields OUTSIDE of Nueva Cita.
 * Implements ControlValueAccessor so it works with [(ngModel)].
 *
 * Inputs  : label, placeholder, min, max, allowPast, hasError, errorMsg
 * Outputs : change — mirrors a native (change) event for (change)="fn()" bindings
 *
 * Usage:
 *   <agf-date-picker [(ngModel)]="model" (ngModelChange)="onChanged()"></agf-date-picker>
 *   <agf-date-picker [(ngModel)]="model" (change)="onChanged()"></agf-date-picker>
 */
@Component({
  selector:    'agf-date-picker',
  standalone:  true,
  imports:     [CommonModule, IonicModule],
  templateUrl: './agf-date-picker.component.html',
  styleUrls:   ['./agf-date-picker.component.scss'],
  providers: [{
    provide:     NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => AgfDatePickerComponent),
    multi:       true,
  }],
})
export class AgfDatePickerComponent implements ControlValueAccessor, OnChanges, OnDestroy {
  @Input() label       = '';
  @Input() placeholder = 'Seleccionar fecha';
  @Input() min         = '';
  @Input() max         = '';
  /** Allow past dates to be selected (true = enabled). Default: true. */
  @Input() allowPast   = true;
  @Input() hasError    = false;
  @Input() errorMsg    = '';

  /** Emitted when the user picks a date — same signature as a native (change) event. */
  @Output() change = new EventEmitter<string>();

  @ViewChild('trigger') triggerRef!: ElementRef<HTMLButtonElement>;

  value      = '';
  isOpen     = false;
  isDisabled = false;

  private _onChange:  (v: string) => void = () => {};
  private _onTouched: ()          => void = () => {};
  private panelRef:   ComponentRef<AgfDatePanelComponent> | null = null;
  private wrapperEl:  HTMLElement | null                         = null;

  private readonly onOutsideClick = (e: MouseEvent) => {
    const t = e.target as Node;
    if (!this.triggerRef?.nativeElement.contains(t) && !this.wrapperEl?.contains(t)) {
      this.close();
    }
  };
  private readonly onScrollClose = (e: Event) => {
    // Ignore scrolls that originate inside the floating panel.
    if (this.wrapperEl?.contains(e.target as Node)) return;
    this.close();
  };

  constructor(
    private appRef:      ApplicationRef,
    private envInjector: EnvironmentInjector,
    private injector:    Injector,
    private cdr:         ChangeDetectorRef,
    private registry:    AgfPickerRegistryService,
  ) {}

  // ── Display ──────────────────────────────────────────────────────────────────
  get displayLabel(): string {
    if (!this.value) return '';
    const [y, m, d] = this.value.split('-').map(Number);
    if (!y || !m || !d) return this.value;
    const date = new Date(y, m - 1, d);
    const dow  = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][date.getDay()];
    return `${dow} ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
  }

  // ── Interaction ───────────────────────────────────────────────────────────────
  toggle(e: MouseEvent): void {
    e.stopPropagation();
    this._onTouched();
    this.isOpen ? this.close() : this.openPanel();
  }

  // ── If min/max change while the panel is open, keep panel in sync ─────────────
  ngOnChanges(c: SimpleChanges): void {
    if (this.isOpen && this.panelRef) {
      if (c['min'])   this.panelRef.setInput('min',   this.min);
      if (c['max'])   this.panelRef.setInput('max',   this.max);
      if (c['value']) this.panelRef.setInput('value', this.value);
    }
  }

  // ── Panel lifecycle ───────────────────────────────────────────────────────────
  private openPanel(): void {
    const rect   = this.triggerRef.nativeElement.getBoundingClientRect();
    const spaceB = window.innerHeight - rect.bottom;
    const top    = spaceB >= PANEL_H + 8
      ? rect.bottom + 6
      : Math.max(4, rect.top - PANEL_H - 6);
    const left   = Math.min(Math.max(4, rect.left), window.innerWidth - PANEL_W - 4);

    this.panelRef = createComponent(AgfDatePanelComponent, {
      environmentInjector: this.envInjector,
      elementInjector:     this.injector,
    });

    this.panelRef.setInput('value',     this.value);
    this.panelRef.setInput('min',       this.min);
    this.panelRef.setInput('max',       this.max);
    this.panelRef.setInput('allowPast', this.allowPast);

    this.panelRef.instance.valueChange.subscribe((iso: string) => {
      this.value = iso;
      this._onChange(iso);
      this.change.emit(iso);
      this.cdr.markForCheck();
      this.close();
    });

    const wrapper = document.createElement('div');
    wrapper.className = 'agf-dp-floating';
    Object.assign(wrapper.style, {
      position: 'fixed',
      top:      `${top}px`,
      left:     `${left}px`,
      width:    `${PANEL_W}px`,
      zIndex:   '99999',
    });
    wrapper.appendChild(this.panelRef.location.nativeElement);
    document.body.appendChild(wrapper);
    this.wrapperEl = wrapper;

    this.appRef.attachView(this.panelRef.hostView);
    this.isOpen = true;

    // Notify the registry — closes any other open picker first
    this.registry.open(this);

    // Small delay so this click doesn't immediately fire onOutsideClick
    setTimeout(() => {
      document.addEventListener('click',  this.onOutsideClick);
      document.addEventListener('scroll', this.onScrollClose, { capture: true });
    }, 60);
  }

  close(): void {
    if (!this.isOpen) return;
    document.removeEventListener('click',  this.onOutsideClick);
    document.removeEventListener('scroll', this.onScrollClose, { capture: true });
    this.registry.dismiss(this);

    if (this.panelRef) {
      this.appRef.detachView(this.panelRef.hostView);
      this.panelRef.destroy();
      this.panelRef = null;
    }
    if (this.wrapperEl?.parentNode) {
      this.wrapperEl.parentNode.removeChild(this.wrapperEl);
      this.wrapperEl = null;
    }
    this.isOpen = false;
  }

  ngOnDestroy(): void { this.close(); }

  // ── ControlValueAccessor ──────────────────────────────────────────────────────
  writeValue(v: string): void                 { this.value = v || ''; this.cdr.markForCheck(); }
  registerOnChange(fn: (v: string) => void): void { this._onChange  = fn; }
  registerOnTouched(fn: () => void): void         { this._onTouched = fn; }
  setDisabledState(d: boolean): void              { this.isDisabled  = d; }
}
