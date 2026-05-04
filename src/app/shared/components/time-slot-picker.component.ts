import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CitaDto, toDatePart, toTimePart } from '../../pages/citas/models/cita.model';
import { ConfiguracionAgendaDto } from '../models/configuracion.models';

export interface TimeSlotSelection {
  horaInicio: string;
  horaFin: string;
}

interface TimeSlotOption extends TimeSlotSelection {
  key: string;
  occupied: boolean;
  available: boolean;
}

interface NormalizedAgendaConfig {
  start: string;
  end: string;
  duration: number;
  buffer: number;
  allowOverlap: boolean;
}

@Component({
  selector: 'app-time-slot-picker',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './time-slot-picker.component.html',
  styleUrls: ['./time-slot-picker.component.scss'],
})
export class TimeSlotPickerComponent implements OnChanges {
  @Input() fecha = '';
  @Input() configuracionAgenda: ConfiguracionAgendaDto | null = null;
  @Input() citasDelDia: CitaDto[] = [];
  @Input() horaInicio = '';
  @Input() horaFin = '';
  @Input() citaIdExcluir: number | null | undefined = null;
  @Input() loading = false;
  @Input() error = '';
  @Input() disabled = false;

  @Output() slotSeleccionado = new EventEmitter<TimeSlotSelection>();

  showOccupied = false;
  slots: TimeSlotOption[] = [];
  selectedKey = '';

  private lastEmittedKey = '';

  get availableSlots(): TimeSlotOption[] {
    return this.slots.filter(slot => slot.available);
  }

  get visibleSlots(): TimeSlotOption[] {
    return this.showOccupied ? this.slots : this.availableSlots;
  }

  get nextAvailable(): TimeSlotOption | null {
    return this.availableSlots[0] ?? null;
  }

  get hasOccupiedSlots(): boolean {
    return this.slots.some(slot => slot.occupied);
  }

  get emptyMessage(): string {
    if (!this.fecha) return 'Selecciona una fecha para ver horarios disponibles.';
    if (this.error) return this.error;
    return 'No hay disponibilidad para este dia.';
  }

  ngOnChanges(changes: SimpleChanges): void {
    const shouldRebuild = Boolean(
      changes['fecha'] ||
      changes['configuracionAgenda'] ||
      changes['citasDelDia'] ||
      changes['citaIdExcluir'] ||
      changes['loading']
    );

    if (shouldRebuild) {
      this.rebuildSlots();
    } else if (changes['horaInicio'] || changes['horaFin']) {
      this.selectedKey = this.toKey(this.normalizeHour(this.horaInicio), this.normalizeHour(this.horaFin));
    }
  }

  selectSlot(slot: TimeSlotOption): void {
    if (this.disabled || !slot.available) return;
    this.selectAvailableSlot(slot, true);
  }

  private rebuildSlots(): void {
    if (this.loading) {
      this.slots = [];
      this.selectedKey = '';
      return;
    }

    const config = this.normalizeConfig(this.configuracionAgenda);
    const start = this.toMinutes(config.start);
    const end = this.toMinutes(config.end);

    if (!this.fecha || start === null || end === null || end <= start || config.duration <= 0) {
      this.slots = [];
      this.selectedKey = '';
      return;
    }

    const step = Math.max(config.duration + config.buffer, config.duration);
    const options: TimeSlotOption[] = [];

    for (let cursor = start; cursor + config.duration <= end; cursor += step) {
      const slotStart = cursor;
      const slotEnd = cursor + config.duration;
      const occupied = !config.allowOverlap && this.hasConflict(slotStart, slotEnd, config.buffer);
      const horaInicio = this.toHour(slotStart);
      const horaFin = this.toHour(slotEnd);

      options.push({
        horaInicio,
        horaFin,
        key: this.toKey(horaInicio, horaFin),
        occupied,
        available: !occupied,
      });
    }

    this.slots = options;
    this.syncSelection();
  }

  private syncSelection(): void {
    const inputKey = this.toKey(this.normalizeHour(this.horaInicio), this.normalizeHour(this.horaFin));
    const current = this.slots.find(slot => slot.key === inputKey && slot.available);

    if (current) {
      this.selectedKey = current.key;
      this.lastEmittedKey = current.key;
      return;
    }

    const firstAvailable = this.availableSlots[0];
    if (firstAvailable) {
      this.selectAvailableSlot(firstAvailable, true, true);
      return;
    }

    this.selectedKey = '';
    this.lastEmittedKey = '';
  }

  private selectAvailableSlot(slot: TimeSlotOption, emit: boolean, asyncEmit = false): void {
    this.selectedKey = slot.key;
    if (!emit || this.lastEmittedKey === slot.key) return;

    this.lastEmittedKey = slot.key;
    const selection = {
      horaInicio: slot.horaInicio,
      horaFin: slot.horaFin,
    };

    if (asyncEmit) {
      queueMicrotask(() => this.slotSeleccionado.emit(selection));
      return;
    }

    this.slotSeleccionado.emit(selection);
  }

  private hasConflict(slotStart: number, slotEnd: number, buffer: number): boolean {
    return this.citasDelDia.some(cita => {
      if (cita.id_cita === this.citaIdExcluir) return false;
      if (cita.activo === false || cita.estado_cita === 'CANCELADA') return false;

      const citaDate = toDatePart(cita.fecha_inicio);
      if (citaDate && citaDate !== this.fecha) return false;

      const citaStart = this.toMinutes(toTimePart(cita.fecha_inicio) || cita.hora_inicio || '');
      const citaEnd = this.toMinutes(toTimePart(cita.fecha_fin) || cita.hora_fin || '');
      if (citaStart === null || citaEnd === null || citaEnd <= citaStart) return false;

      return slotStart < citaEnd + buffer && slotEnd > citaStart - buffer;
    });
  }

  private normalizeConfig(config: ConfiguracionAgendaDto | null): NormalizedAgendaConfig {
    return {
      start: this.normalizeHour(config?.hora_inicio_jornada ?? config?.hora_inicio ?? '09:00'),
      end: this.normalizeHour(config?.hora_fin_jornada ?? config?.hora_fin ?? '18:00'),
      duration: this.normalizePositiveNumber(config?.duracion_cita_default_min, 60),
      buffer: this.normalizeNonNegativeNumber(config?.buffer_citas_min, 0),
      allowOverlap: config?.citas_superpuestas === true,
    };
  }

  private normalizeHour(hour: string | null | undefined): string {
    if (!hour) return '';
    return String(hour).length >= 5 ? String(hour).substring(0, 5) : String(hour);
  }

  private normalizePositiveNumber(value: unknown, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private normalizeNonNegativeNumber(value: unknown, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  }

  private toMinutes(hour: string): number | null {
    const match = /^(\d{1,2}):(\d{2})$/.exec(this.normalizeHour(hour));
    if (!match) return null;

    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return hours * 60 + minutes;
  }

  private toHour(totalMinutes: number): string {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  private toKey(start: string, end: string): string {
    return start && end ? `${start}-${end}` : '';
  }
}
