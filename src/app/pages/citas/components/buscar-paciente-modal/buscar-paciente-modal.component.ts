import { Component, ElementRef, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { PacientesApiService } from '../../../pacientes/pacientes-api.service';
import { PacienteDto } from '../../../pacientes/models/paciente.model';
import { getAvatarColor as avatarColorUtil } from '../../../../shared/utils/avatar.utils';
import { mapApiError } from 'src/app/shared/utils/api-error.mapper';

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
  filtrados: PacienteDto[] = [];
  loading = false;
  errorMessage = '';

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private pacientesSvc: PacientesApiService,
    private el: ElementRef<HTMLElement>,
  ) {}

  async ngOnInit() {
    document.body.appendChild(this.el.nativeElement);
    await this.buscarPacientes();
  }

  ngOnDestroy() {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    const node = this.el.nativeElement;
    if (node.parentNode) {
      node.parentNode.removeChild(node);
    }
  }

  onBusquedaChange() {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      void this.buscarPacientes();
    }, 250);
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

  private async buscarPacientes() {
    this.loading = true;
    this.errorMessage = '';

    try {
      const page = await this.pacientesSvc.getAll({
        search: this.busqueda.trim() || undefined,
        activo: true,
        page: 0,
        size: 20,
        sort: 'apellido,asc',
      });
      this.filtrados = page.content;
    } catch (err) {
      this.filtrados = [];
      this.errorMessage = mapApiError(err).userMessage;
    } finally {
      this.loading = false;
    }
  }
}
