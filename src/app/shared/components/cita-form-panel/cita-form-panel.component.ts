import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import {
  CitaFormContext,
  CitaFormData,
  CitaFormModalComponent,
} from '../cita-form-modal/cita-form-modal.component';

@Component({
  selector: 'app-cita-form-panel',
  standalone: true,
  imports: [CommonModule, IonicModule, CitaFormModalComponent],
  templateUrl: './cita-form-panel.component.html',
  styleUrls: ['./cita-form-panel.component.scss'],
})
export class CitaFormPanelComponent implements OnChanges, OnDestroy {
  @Input() isOpen = false;
  @Input() context: 'citas' | 'agenda' = 'agenda';
  @Input() prefill: CitaFormContext = {};
  @Input() showContextBanner = false;
  @Input() contextDateLabel = '';
  @Input() saving = false;
  @Input() errorMessage = '';

  @Output() saved = new EventEmitter<CitaFormData>();
  @Output() cancelled = new EventEmitter<void>();

  private dragStartY = 0;
  private dragCurrentY = 0;
  private isDragging = false;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen']) {
      this.syncBodyClass();
      if (!this.isOpen) {
        this.resetPanelTransform();
        this.dragStartY = 0;
        this.dragCurrentY = 0;
        this.isDragging = false;
      }
    }
  }

  ngOnDestroy() {
    document.body.classList.remove('modal-open');
  }

  onSaved(data: CitaFormData) {
    this.saved.emit(data);
  }

  onCancelled() {
    this.cancelled.emit();
  }

  startDrag(event: TouchEvent) {
    if (!this.isMobile() || !this.isOpen) return;
    this.dragStartY = event.touches[0].clientY;
    this.dragCurrentY = this.dragStartY;
    this.isDragging = true;
  }

  onDrag(event: TouchEvent) {
    if (!this.isMobile() || !this.isDragging) return;
    this.dragCurrentY = event.touches[0].clientY;
    const diff = this.dragCurrentY - this.dragStartY;
    if (diff <= 0) return;
    const panel = this.getPanelElement();
    if (panel) panel.style.transform = `translate(-50%, ${diff}px)`;
  }

  endDrag() {
    if (!this.isMobile() || !this.isDragging) return;
    const diff = this.dragCurrentY - this.dragStartY;
    const panel = this.getPanelElement();
    this.isDragging = false;

    if (diff > 120) {
      this.cancelled.emit();
    } else if (panel) {
      panel.style.transform = '';
    }

    this.dragStartY = 0;
    this.dragCurrentY = 0;
  }

  private syncBodyClass() {
    document.body.classList.toggle('modal-open', this.isOpen);
  }

  private isMobile(): boolean {
    return window.innerWidth <= 600;
  }

  private getPanelElement(): HTMLElement | null {
    return document.querySelector('.new-appointment-panel');
  }

  private resetPanelTransform() {
    const panel = this.getPanelElement();
    if (panel) panel.style.transform = '';
  }
}
