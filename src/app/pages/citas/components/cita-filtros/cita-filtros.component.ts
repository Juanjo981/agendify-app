import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AgfDatePickerComponent } from '../../../../shared/components/agf-date-picker/agf-date-picker.component';
import { FiltroCitas, EstadoCita, EstadoPago } from '../../models/cita.model';

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
  };

  estadoOpts: Array<{ value: EstadoCita | 'todos'; label: string }> = [
    { value: 'todos',       label: 'Todos los estados' },
    { value: 'Pendiente',   label: 'Pendiente' },
    { value: 'Confirmada',  label: 'Confirmada' },
    { value: 'Completada',  label: 'Completada' },
    { value: 'Cancelada',   label: 'Cancelada' },
    { value: 'No asistió',  label: 'No asistió' },
    { value: 'Pospuesta',   label: 'Pospuesta' },
  ];

  pagoOpts: Array<{ value: EstadoPago | 'todos'; label: string }> = [
    { value: 'todos',     label: 'Todos los pagos' },
    { value: 'Pendiente', label: 'Pendiente' },
    { value: 'Parcial',   label: 'Parcial' },
    { value: 'Pagado',    label: 'Pagado' },
  ];

  ngOnInit() { this.emitir(); }

  emitir() { this.filtrosCambiados.emit({ ...this.filtros }); }

  limpiar() {
    this.filtros = { busqueda: '', estado: 'todos', estado_pago: 'todos', fecha_desde: '', fecha_hasta: '' };
    this.emitir();
  }

  get tieneActivos(): boolean {
    return !!(
      this.filtros.busqueda ||
      this.filtros.estado !== 'todos' ||
      this.filtros.estado_pago !== 'todos' ||
      this.filtros.fecha_desde ||
      this.filtros.fecha_hasta
    );
  }
}
