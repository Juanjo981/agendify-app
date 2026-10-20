import {
  AfterViewChecked,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
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

/**
 * Diálogo de confirmación global.
 * Se teleporta a document.body al abrirse para no quedar atrapado en stacking
 * contexts de modales padres (p. ej. panel de receta con z-index 9k–20k).
 */
@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class ConfirmDialogComponent implements OnChanges, AfterViewChecked, OnDestroy {
  @Input() config: ConfirmDialogConfig | null = null;
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  @ViewChild('confirmBtn') private confirmBtn?: ElementRef<HTMLButtonElement>;

  private readonly hostEl = inject(ElementRef<HTMLElement>);
  private portalActive = false;
  private homeParent: Node | null = null;
  private homeNextSibling: ChildNode | null = null;
  private needsFocus = false;

  get resolvedIcon(): string {
    if (this.config?.icon) return this.config.icon;
    return this.config?.variant === 'danger' ? 'warning-outline' : 'help-circle-outline';
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['config']) return;
    if (this.config) {
      this.attachToBody();
      this.needsFocus = true;
    } else {
      this.detachFromBody();
    }
  }

  ngAfterViewChecked(): void {
    if (!this.needsFocus || !this.config) return;
    this.needsFocus = false;
    queueMicrotask(() => this.confirmBtn?.nativeElement?.focus());
  }

  ngOnDestroy(): void {
    this.detachFromBody();
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscape(event: Event): void {
    if (!this.config) return;
    event.preventDefault();
    event.stopPropagation();
    this.cancelled.emit();
  }

  onConfirm(): void {
    this.confirmed.emit();
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  /** Monta el host bajo body para competir en el stacking context global. */
  private attachToBody(): void {
    const host = this.hostEl.nativeElement;
    if (host.parentElement === document.body) {
      this.portalActive = true;
      return;
    }
    this.homeParent = host.parentNode;
    this.homeNextSibling = host.nextSibling;
    document.body.appendChild(host);
    this.portalActive = true;
  }

  private detachFromBody(): void {
    if (!this.portalActive) return;
    const host = this.hostEl.nativeElement;
    if (this.homeParent?.isConnected && host.parentElement === document.body) {
      this.homeParent.insertBefore(host, this.homeNextSibling);
    }
    this.homeParent = null;
    this.homeNextSibling = null;
    this.portalActive = false;
  }
}