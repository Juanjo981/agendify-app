import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AgfDatePickerComponent } from '../../../../shared/components/agf-date-picker/agf-date-picker.component';
import { EstadoCita, EstadoPago, FiltroCitas, isEstadoPago } from '../../models/cita.model';

@Component({
  selector: 'app-cita-filtros',
  templateUrl: './cita-filtros.component.html',
  styleUrls: ['./cita-filtros.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, AgfDatePickerComponent],
})
export class CitaFiltrosComponent implements OnInit {
  @Output() filtrosCambiados = new EventEmitter<FiltroCitas>();

  filtros: FiltroCitas = {
    busqueda: '',
    estado: 'todos',
    estado_pago: 'todos',
    fecha_desde: '',
    fecha_hasta: '',
    id_paciente: null,
  };

  estadoOpts: Array<{ value: EstadoCita | 'todos'; label: string }> = [
    { value: 'todos', label: 'Todos los estados' },
    { value: 'PENDIENTE', label: 'Pendiente' },
    { value: 'CONFIRMADA', label: 'Confirmada' },
    { value: 'COMPLETADA', label: 'Completada' },
    { value: 'CANCELADA', label: 'Cancelada' },
    { value: 'NO_ASISTIO', label: 'No asistió' },
    { value: 'REPROGRAMADA', label: 'Reprogramada' },
  ];

  pagoOpts: Array<{ value: EstadoPago | 'todos'; label: string }> = [
    { value: 'todos', label: 'Todos los pagos' },
    { value: 'PENDIENTE', label: 'Pendiente' },
    { value: 'PARCIAL', label: 'Parcial' },
    { value: 'PAGADO', label: 'Pagado' },
    { value: 'NO_APLICA', label: 'No aplica' },
    { value: 'REEMBOLSADO', label: 'Reembolsado' },
  ];

  ngOnInit() {
    this.emitir();
  }

  emitir() {
    this.filtrosCambiados.emit({
      ...this.filtros,
      estado_pago: this.normalizeEstadoPagoFilter(this.filtros.estado_pago),
    });
  }

  onEstadoPagoChange(value: EstadoPago | 'todos' | string | null | undefined) {
    this.filtros.estado_pago = this.normalizeEstadoPagoFilter(value);
    this.emitir();
  }

  limpiar() {
    this.filtros = {
      busqueda: '',
      estado: 'todos',
      estado_pago: 'todos',
      fecha_desde: '',
      fecha_hasta: '',
      id_paciente: null,
    };
    this.emitir();
  }

  get tieneActivos(): boolean {
    return !!(
      this.filtros.busqueda ||
      this.filtros.estado !== 'todos' ||
      this.filtros.estado_pago !== 'todos' ||
      this.filtros.fecha_desde ||
      this.filtros.fecha_hasta ||
      this.filtros.id_paciente
    );
  }

  private normalizeEstadoPagoFilter(value: EstadoPago | 'todos' | string | null | undefined): EstadoPago | 'todos' {
    if (value === 'todos' || value === '' || value == null) return 'todos';
    return isEstadoPago(value) ? value : 'todos';
  }
}
