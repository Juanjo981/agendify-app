import {
  Component, Input, Output, EventEmitter, OnDestroy, OnChanges, SimpleChanges,
  ViewChild, ElementRef, ApplicationRef, EnvironmentInjector,
  Injector, ComponentRef, createComponent, forwardRef, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { AgfTimePanelComponent } from './agf-time-panel.component';
import { AgfPickerRegistryService } from '../agf-picker-registry.service';

const PANEL_W = 184;
const PANEL_H = 290;

/**
 * agf-time-picker
 * ──────────────────────────────────────────────────────────────────────────────
 * Branded 24-hour time picker for all time fields OUTSIDE of Nueva Cita.
 * Implements ControlValueAccessor so it works with [(ngModel)].
 *
 * Inputs  : label, placeholder, step (minute granularity), hasError, errorMsg
 * Outputs : change — mirrors a native (change) event for (change)="fn()" bindings
 *
 * Usage:
 *   <agf-time-picker [(ngModel)]="model" (ngModelChange)="onChanged()"></agf-time-picker>
 *   <agf-time-picker [(ngModel)]="model" label="Hora inicio *"></agf-time-picker>
 */
@Component({
  selector:    'agf-time-picker',
  standalone:  true,
  imports:     [CommonModule, IonicModule],
  templateUrl: './agf-time-picker.component.html',
  styleUrls:   ['./agf-time-picker.component.scss'],
  providers: [{
    provide:     NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => AgfTimePickerComponent),
    multi:       true,
  }],
})
export class AgfTimePickerComponent implements ControlValueAccessor, OnChanges, OnDestroy {
  @Input() label          = '';
  @Input() placeholder    = '--:--';
  /** Minute granularity (5 = show 00, 05, 10 … 55). */
  @Input() step           = 5;
  @Input() hasError       = false;
  @Input() errorMsg       = '';
  /** Close the panel immediately after a valid time is emitted (default: false). */
  @Input() closeOnSelect  = false;

  /** Emitted on each time change — same as native (change) for (change)="fn()" bindings. */
  @Output() change = new EventEmitter<string>();

  @ViewChild('trigger') triggerRef!: ElementRef<HTMLButtonElement>;

  value      = '';
  isOpen     = false;
  isDisabled = false;

  private _onChange:  (v: string) => void = () => {};
  private _onTouched: ()          => void = () => {};
  private panelRef:   ComponentRef<AgfTimePanelComponent> | null = null;
  private wrapperEl:  HTMLElement | null                         = null;

  private readonly onOutsideClick = (e: MouseEvent) => {
    const t = e.target as Node;
    if (!this.triggerRef?.nativeElement.contains(t) && !this.wrapperEl?.contains(t)) {
      this.close();
    }
  };
  private readonly onScrollClose = (e: Event) => {
    // Ignore scrolls that originate inside the floating panel (hour/minute columns).
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

  // ── Interaction ───────────────────────────────────────────────────────────────
  toggle(e: MouseEvent): void {
    e.stopPropagation();
    this._onTouched();
    this.isOpen ? this.close() : this.openPanel();
  }

  ngOnChanges(c: SimpleChanges): void {
    if (this.isOpen && this.panelRef) {
      if (c['value']) this.panelRef.setInput('value', this.value);
      if (c['step'])  this.panelRef.setInput('step',  this.step);
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

    this.panelRef = createComponent(AgfTimePanelComponent, {
      environmentInjector: this.envInjector,
      elementInjector:     this.injector,
    });

    this.panelRef.setInput('value', this.value);
    this.panelRef.setInput('step',  this.step);

    this.panelRef.instance.valueChange.subscribe((t: string) => {
      this.value = t;
      this._onChange(t);
      this.change.emit(t);
      this.cdr.markForCheck();
      // closeOnSelect: close immediately (e.g. Nueva Cita); default keeps panel
      // open so the user can refine both hour and minute before dismissing.
      if (this.closeOnSelect) { this.close(); }
    });

    const wrapper = document.createElement('div');
    wrapper.className = 'agf-tp-floating';
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
  writeValue(v: string): void                      { this.value = v || ''; this.cdr.markForCheck(); }
  registerOnChange(fn: (v: string) => void): void  { this._onChange  = fn; }
  registerOnTouched(fn: () => void): void          { this._onTouched = fn; }
  setDisabledState(d: boolean): void               { this.isDisabled  = d; }
}
