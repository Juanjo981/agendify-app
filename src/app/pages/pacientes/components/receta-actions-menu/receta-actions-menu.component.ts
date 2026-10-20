import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { RecetaResumen } from 'src/app/shared/models/recetas.models';

export type RecetaMenuAction =
  | 'ver'
  | 'editar'
  | 'abrirPdf'
  | 'imprimir'
  | 'descargarPdf'
  | 'copiar';

/** sheet = modal móvil; fixed = portal position:fixed en escritorio. */
export type RecetaActionsMenuVariant = 'fixed' | 'sheet';

/**
 * Menú contextual de acciones de una receta.
 * - Escritorio: portal fixed bajo body (el padre posiciona el host).
 * - Móvil: ModalController sheet.
 */
@Component({
  selector: 'app-receta-actions-menu',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './receta-actions-menu.component.html',
  styleUrls: ['./receta-actions-menu.component.scss'],
})
export class RecetaActionsMenuComponent {
  @Input({ required: true }) receta!: RecetaResumen;
  @Input() variant: RecetaActionsMenuVariant = 'fixed';
  @Input() puedeAbrirPdf = false;

  /** Emite al elegir acción o cancelar (solo variant fixed). */
  @Output() readonly closed = new EventEmitter<RecetaMenuAction | null>();

  private readonly modalCtrl = inject(ModalController);

  get showEditar(): boolean {
    return this.receta.estado === 'BORRADOR' || this.receta.estado === 'EMITIDA';
  }

  get showCopia(): boolean {
    return this.receta.estado === 'EMITIDA' || this.receta.estado === 'ANULADA';
  }

  get isSheet(): boolean {
    return this.variant === 'sheet';
  }

  async select(action: RecetaMenuAction, event?: Event): Promise<void> {
    event?.stopPropagation();
    await this.dismiss(action);
  }

  async cancel(event?: Event): Promise<void> {
    event?.stopPropagation();
    await this.dismiss(null);
  }

  private async dismiss(action: RecetaMenuAction | null): Promise<void> {
    if (this.isSheet) {
      await this.modalCtrl.dismiss(action != null ? { action } : undefined);
      return;
    }
    this.closed.emit(action);
  }
}
