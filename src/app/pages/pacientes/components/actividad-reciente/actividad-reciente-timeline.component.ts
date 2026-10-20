import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ActividadRecienteItem } from './actividad-reciente.models';

@Component({
  selector: 'app-actividad-reciente-timeline',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './actividad-reciente-timeline.component.html',
  styleUrls: ['./actividad-reciente-timeline.component.scss'],
})
export class ActividadRecienteTimelineComponent {
  @Input() title = 'Actividad reciente';
  @Input() subtitle = 'Últimos movimientos del expediente';
  @Input() items: ActividadRecienteItem[] = [];
  @Input() loading = false;
  @Input() loadingMore = false;
  @Input() error: string | null = null;
  @Input() hasMore = false;

  @Output() readonly retry = new EventEmitter<void>();
  @Output() readonly loadMore = new EventEmitter<void>();
}
