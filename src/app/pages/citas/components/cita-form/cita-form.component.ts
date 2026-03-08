import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { CitaDto, EstadoCita } from '../../models/cita.model';
import { PacienteDto } from '../../../pacientes/pacientes.mock';
import { BuscarPacienteModalComponent } from '../buscar-paciente-modal/buscar-paciente-modal.component';
import { CitasMockService } from '../../citas.service.mock';

export type CitaFormData = Omit<CitaDto, 'id_cita' | 'tiene_sesion'>;

@Component({
  selector: 'app-cita-form',
  templateUrl: './cita-form.component.html',
  styleUrls: ['./cita-form.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, BuscarPacienteModalComponent],
})
export class CitaFormComponent implements OnInit {
  @Input() cita: CitaDto | null = null;
  @Output() guardado = new EventEmitter<CitaFormData>();
  @Output() cancelado = new EventEmitter<void>();

  get modo(): 'crear' | 'editar' { return this.cita ? 'editar' : 'crear'; }
  get titulo(): string { return this.modo === 'crear' ? 'Nueva cita' : 'Editar cita'; }

  form: CitaFormData = this.emptyForm();
  errores: Record<string, string> = {};

  pacienteSeleccionado: PacienteDto | null = null;
  mostrarBuscador = false;

  slotSugerido: { hora_inicio: string; hora_fin: string } | null = null;
  hayConflicto = false;

  readonly estadoOpts: EstadoCita[] = ['Pendiente', 'Confirmada', 'Completada', 'Cancelada', 'No asistió', 'Pospuesta'];

  constructor(private citasService: CitasMockService) {}

  get mostrarSugerencia(): boolean {
    if (this.modo !== 'crear' || !this.form.fecha) return false;
    return !this.form.hora_inicio || !this.form.hora_fin || this.hayConflicto;
  }

  ngOnInit() {
    if (this.cita) {
      const { id_cita, tiene_sesion, ...rest } = this.cita;
      this.form = { ...rest };
    }
  }

  private emptyForm(): CitaFormData {
    return {
      id_paciente: 0,
      nombre_paciente: '',
      apellido_paciente: '',
      fecha: '',
      hora_inicio: '',
      hora_fin: '',
      duracion: 60,
      motivo: '',
      notas_rapidas: '',
      estado: 'Pendiente',
      estado_pago: 'Pendiente',
      metodo_pago: '',
      monto: 0,
      monto_pagado: 0,
    };
  }

  onPacienteSeleccionado(p: PacienteDto) {
    this.pacienteSeleccionado = p;
    this.form.id_paciente = p.id_paciente;
    this.form.nombre_paciente = p.nombre;
    this.form.apellido_paciente = p.apellido;
    this.mostrarBuscador = false;
    delete this.errores['paciente'];
  }

  iniciales(p: PacienteDto): string {
    return `${p.apellido.charAt(0)}${p.nombre.charAt(0)}`.toUpperCase();
  }

  getAvatarColor(nombre: string): string {
    const colors = ['#6366f1', '#8b5cf6', '#3b82f6', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444'];
    return colors[nombre.charCodeAt(0) % colors.length];
  }

  actualizarDuracion() {
    if (!this.form.hora_inicio || !this.form.hora_fin) return;
    const [h1, m1] = this.form.hora_inicio.split(':').map(Number);
    const [h2, m2] = this.form.hora_fin.split(':').map(Number);
    const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (diff > 0) this.form.duracion = diff;
  }

  onFechaChange() {
    this.calcularSiguienteSlot();
    if (this.form.hora_inicio && this.form.hora_fin) {
      this.detectarConflicto();
    }
    delete this.errores['fecha'];
  }

  onHoraChange() {
    this.actualizarDuracion();
    if (this.form.fecha && this.form.hora_inicio && this.form.hora_fin) {
      this.detectarConflicto();
    }
  }

  private toMin(t: string): number {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  }

  private toTime(min: number): string {
    return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
  }

  calcularSiguienteSlot() {
    this.slotSugerido = null;
    if (!this.form.fecha) return;

    const citasDelDia = this.citasService.getCitas()
      .filter(c => c.fecha === this.form.fecha && c.estado !== 'Cancelada');

    const duracion = this.form.duracion > 0 ? this.form.duracion : 60;
    const inicioJornada = 8 * 60;
    const finJornada = 20 * 60;

    const ocupados = citasDelDia
      .map(c => ({ inicio: this.toMin(c.hora_inicio), fin: this.toMin(c.hora_fin) }))
      .sort((a, b) => a.inicio - b.inicio);

    let cursor = inicioJornada;
    for (const bloque of ocupados) {
      if (cursor + duracion <= bloque.inicio) {
        this.slotSugerido = { hora_inicio: this.toTime(cursor), hora_fin: this.toTime(cursor + duracion) };
        return;
      }
      if (bloque.fin > cursor) cursor = bloque.fin;
    }

    if (cursor + duracion <= finJornada) {
      this.slotSugerido = { hora_inicio: this.toTime(cursor), hora_fin: this.toTime(cursor + duracion) };
    }
  }

  detectarConflicto() {
    this.hayConflicto = false;
    if (!this.form.fecha || !this.form.hora_inicio || !this.form.hora_fin) return;

    const nuevoInicio = this.toMin(this.form.hora_inicio);
    const nuevoFin = this.toMin(this.form.hora_fin);

    this.hayConflicto = this.citasService.getCitas()
      .filter(c => c.fecha === this.form.fecha && c.estado !== 'Cancelada')
      .some(c => nuevoInicio < this.toMin(c.hora_fin) && nuevoFin > this.toMin(c.hora_inicio));
  }

  usarSugerencia() {
    if (!this.slotSugerido) return;
    this.form.hora_inicio = this.slotSugerido.hora_inicio;
    this.form.hora_fin = this.slotSugerido.hora_fin;
    this.hayConflicto = false;
    this.actualizarDuracion();
    delete this.errores['hora_inicio'];
    delete this.errores['hora_fin'];
  }

  validar(): boolean {
    this.errores = {};
    if (!this.pacienteSeleccionado && this.modo === 'crear') {
      this.errores['paciente'] = 'Selecciona un paciente';
    }
    if (!this.form.fecha) this.errores['fecha'] = 'Fecha requerida';
    if (!this.form.hora_inicio) this.errores['hora_inicio'] = 'Hora inicio requerida';
    if (!this.form.hora_fin) this.errores['hora_fin'] = 'Hora fin requerida';
    if (this.form.hora_inicio && this.form.hora_fin && this.form.hora_fin <= this.form.hora_inicio) {
      this.errores['hora_fin'] = 'Debe ser posterior a la hora inicio';
    }
    if (!this.form.motivo.trim()) this.errores['motivo'] = 'Motivo requerido';
    return Object.keys(this.errores).length === 0;
  }

  guardar() {
    if (!this.validar()) return;
    this.guardado.emit({ ...this.form });
  }
}

