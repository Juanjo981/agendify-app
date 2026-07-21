import { Component, Input } from '@angular/core';
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
  @Input() subtitle = 'Timeline visual · datos de ejemplo';
  @Input() items: ActividadRecienteItem[] = [];
}
