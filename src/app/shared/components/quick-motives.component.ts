import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-quick-motives',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './quick-motives.component.html',
  styleUrls: ['./quick-motives.component.scss'],
})
export class QuickMotivesComponent {
  @Input() motivos: string[] = [];
  @Input() motivoSeleccionado = '';

  @Output() motivoSeleccionadoChange = new EventEmitter<string>();

  get motivosVisibles(): string[] {
    const vistos = new Set<string>();

    return this.motivos
      .map(motivo => motivo.trim())
      .filter(motivo => {
        const key = motivo.toLocaleLowerCase();
        if (!motivo || vistos.has(key)) return false;
        vistos.add(key);
        return true;
      })
      .slice(0, 7);
  }

  get shouldShow(): boolean {
    return this.motivosVisibles.length > 0;
  }

  seleccionar(motivo: string): void {
    this.motivoSeleccionadoChange.emit(motivo);
  }

  isSelected(motivo: string): boolean {
    return motivo.trim().toLocaleLowerCase() === this.motivoSeleccionado.trim().toLocaleLowerCase();
  }
}
