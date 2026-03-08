import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import {
  FiltroEstadisticas,
  RangoFecha,
  EstadoCitaFiltro,
  MetodoPagoFiltro,
} from '../../models/filtros-estadisticas.model';
import { EstadisticasMockService } from '../../estadisticas.service.mock';

@Component({
  selector: 'app-filtros-estadisticas',
  templateUrl: './filtros-estadisticas.component.html',
  styleUrls: ['./filtros-estadisticas.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
})
export class FiltrosEstadisticasComponent implements OnInit {
  @Output() filtrosCambiados = new EventEmitter<FiltroEstadisticas>();

  filtros!: FiltroEstadisticas;

  rangos: Array<{ value: RangoFecha; label: string }> = [
    { value: 'hoy',           label: 'Hoy' },
    { value: 'semana',        label: 'Esta semana' },
    { value: 'mes',           label: 'Este mes' },
    { value: 'personalizado', label: 'Personalizado' },
  ];

  estadoOpts: Array<{ value: EstadoCitaFiltro; label: string }> = [
    { value: 'todos',       label: 'Todos los estados' },
    { value: 'Pendiente',   label: 'Pendiente' },
    { value: 'Confirmada',  label: 'Confirmada' },
    { value: 'Completada',  label: 'Completada' },
    { value: 'Cancelada',   label: 'Cancelada' },
    { value: 'No asistió',  label: 'No asistió' },
    { value: 'Pospuesta',   label: 'Pospuesta' },
  ];

  pagoOpts: Array<{ value: MetodoPagoFiltro; label: string }> = [
    { value: 'todos',         label: 'Todos los pagos' },
    { value: 'Efectivo',      label: 'Efectivo' },
    { value: 'Transferencia', label: 'Transferencia' },
    { value: 'Débito',        label: 'Débito' },
    { value: 'Crédito',       label: 'Crédito' },
  ];

  // Mock — replace with real data from backend
  profesionales: Array<{ id: string; nombre: string }> = [
    { id: '',  nombre: 'Todos los profesionales' },
    { id: '1', nombre: 'Dra. García' },
    { id: '2', nombre: 'Dr. Rodríguez' },
  ];

  constructor(private svc: EstadisticasMockService) {}

  ngOnInit() {
    this.filtros = this.svc.getFiltrosIniciales();
    this.emitir();
  }

  seleccionarRango(rango: RangoFecha) {
    this.filtros.rango = rango;
    const hoy = new Date();

    if (rango === 'hoy') {
      const iso = this.toIso(hoy);
      this.filtros.fechaDesde = iso;
      this.filtros.fechaHasta = iso;
    } else if (rango === 'semana') {
      const lunes = new Date(hoy);
      lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7));
      this.filtros.fechaDesde = this.toIso(lunes);
      this.filtros.fechaHasta = this.toIso(hoy);
    } else if (rango === 'mes') {
      this.filtros.fechaDesde = this.toIso(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
      this.filtros.fechaHasta = this.toIso(hoy);
    }
    // 'personalizado' → user sets dates manually via the inputs
    this.emitir();
  }

  emitir() {
    this.filtrosCambiados.emit({ ...this.filtros });
  }

  limpiar() {
    this.filtros = this.svc.getFiltrosIniciales();
    this.emitir();
  }

  get tieneActivos(): boolean {
    return (
      this.filtros.rango !== 'mes' ||
      !!this.filtros.profesional ||
      this.filtros.estadoCita !== 'todos' ||
      this.filtros.metodoPago !== 'todos'
    );
  }

  private toIso(d: Date): string {
    return d.toISOString().slice(0, 10);
  }
}
