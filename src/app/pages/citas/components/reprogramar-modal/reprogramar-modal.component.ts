import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';import { AgfDatePickerComponent } from '../../../../shared/components/agf-date-picker/agf-date-picker.component';
import { AgfTimePickerComponent } from '../../../../shared/components/agf-time-picker/agf-time-picker.component';import { CitaDto } from '../../models/cita.model';

export interface ReprogramarData {
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
}

@Component({
  selector: 'app-reprogramar-modal',
  templateUrl: './reprogramar-modal.component.html',
  styleUrls: ['./reprogramar-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, AgfDatePickerComponent, AgfTimePickerComponent],
})
export class ReprogramarModalComponent implements OnInit {
  @Input({ required: true }) cita!: CitaDto;
  @Output() confirmado = new EventEmitter<ReprogramarData>();
  @Output() cancelado = new EventEmitter<void>();

  fecha = '';
  hora_inicio = '';
  hora_fin = '';
  errores: Record<string, string> = {};

  ngOnInit() {
    this.fecha = this.cita.fecha;
    this.hora_inicio = this.cita.hora_inicio;
    this.hora_fin = this.cita.hora_fin;
  }

  get duracionPreview(): number {
    if (!this.hora_inicio || !this.hora_fin) return 0;
    const [h1, m1] = this.hora_inicio.split(':').map(Number);
    const [h2, m2] = this.hora_fin.split(':').map(Number);
    return (h2 * 60 + m2) - (h1 * 60 + m1);
  }

  validar(): boolean {
    this.errores = {};
    if (!this.fecha) this.errores['fecha'] = 'La fecha es requerida';
    if (!this.hora_inicio) this.errores['hora_inicio'] = 'La hora de inicio es requerida';
    if (!this.hora_fin) this.errores['hora_fin'] = 'La hora de fin es requerida';
    if (this.hora_inicio && this.hora_fin && this.hora_fin <= this.hora_inicio) {
      this.errores['hora_fin'] = 'Debe ser posterior a la hora de inicio';
    }
    return Object.keys(this.errores).length === 0;
  }

  confirmar() {
    if (!this.validar()) return;
    this.confirmado.emit({ fecha: this.fecha, hora_inicio: this.hora_inicio, hora_fin: this.hora_fin });
  }
}
