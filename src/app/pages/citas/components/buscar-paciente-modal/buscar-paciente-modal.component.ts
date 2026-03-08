import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { PacientesMockService } from '../../../pacientes/pacientes.service.mock';
import { PacienteDto } from '../../../pacientes/pacientes.mock';

@Component({
  selector: 'app-buscar-paciente-modal',
  templateUrl: './buscar-paciente-modal.component.html',
  styleUrls: ['./buscar-paciente-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
})
export class BuscarPacienteModalComponent implements OnInit {
  @Output() seleccionado = new EventEmitter<PacienteDto>();
  @Output() cerrado = new EventEmitter<void>();

  busqueda = '';
  todos: PacienteDto[] = [];
  filtrados: PacienteDto[] = [];

  constructor(private pacientesSvc: PacientesMockService) {}

  ngOnInit() {
    this.todos = this.pacientesSvc.getAll().filter(p => p.activo);
    this.filtrados = [...this.todos];
  }

  filtrar() {
    const q = this.busqueda.trim().toLowerCase();
    this.filtrados = q
      ? this.todos.filter(p =>
          p.nombre.toLowerCase().includes(q) ||
          p.apellido.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q)
        )
      : [...this.todos];
  }

  elegir(p: PacienteDto) {
    this.seleccionado.emit(p);
  }

  iniciales(p: PacienteDto): string {
    return `${p.apellido.charAt(0)}${p.nombre.charAt(0)}`.toUpperCase();
  }

  getAvatarColor(nombre: string): string {
    const colors = ['#6366f1', '#8b5cf6', '#3b82f6', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444'];
    return colors[nombre.charCodeAt(0) % colors.length];
  }
}
