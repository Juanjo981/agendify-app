import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

export interface ConfirmDialogConfig {
  title: string;
  /** Plain text message shown below the title */
  message: string;
  /** Optional bolded subject (e.g. patient name) appended after message */
  subject?: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** 'primary' (default) or 'danger' controls icon tint and confirm button color */
  variant?: 'primary' | 'danger';
  /** Ionicon name. Defaults based on variant. */
  icon?: string;
}

@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class ConfirmDialogComponent {
  @Input() config: ConfirmDialogConfig | null = null;
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  get resolvedIcon(): string {
    if (this.config?.icon) return this.config.icon;
    return this.config?.variant === 'danger' ? 'warning-outline' : 'help-circle-outline';
  }
}
