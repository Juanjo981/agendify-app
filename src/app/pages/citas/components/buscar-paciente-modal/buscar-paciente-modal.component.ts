import { Component, Output, EventEmitter, OnInit, OnDestroy, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { PacientesApiService } from '../../../pacientes/pacientes-api.service';
import { PacienteDto } from '../../../pacientes/models/paciente.model';
import { getAvatarColor as avatarColorUtil } from '../../../../shared/utils/avatar.utils';

@Component({
  selector: 'app-buscar-paciente-modal',
  templateUrl: './buscar-paciente-modal.component.html',
  styleUrls: ['./buscar-paciente-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
})
export class BuscarPacienteModalComponent implements OnInit, OnDestroy {
  @Output() seleccionado = new EventEmitter<PacienteDto>();
  @Output() cerrado = new EventEmitter<void>();

  busqueda = '';
  todos: PacienteDto[] = [];
  filtrados: PacienteDto[] = [];

  constructor(
    private pacientesSvc: PacientesApiService,
    private el: ElementRef<HTMLElement>,
  ) {}

  async ngOnInit() {
    try {
      const page = await this.pacientesSvc.getAll({ activo: true, size: 500 });
      this.todos = page.content;
      this.filtrados = [...this.todos];
    } catch { /* silent */ }

    // Portal to <body> so position:fixed escapes any ancestor stacking context
    // (e.g. backdrop-filter / transform on .new-appointment-panel in Agenda).
    // Angular change detection and event bindings are unaffected by this move.
    document.body.appendChild(this.el.nativeElement);
  }

  ngOnDestroy() {
    const node = this.el.nativeElement;
    if (node.parentNode) {
      node.parentNode.removeChild(node);
    }
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
    return avatarColorUtil(nombre);
  }
}
