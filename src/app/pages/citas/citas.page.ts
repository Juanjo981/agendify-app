import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { CitaCardComponent } from './components/cita-card/cita-card.component';
import { CitaFiltrosComponent } from './components/cita-filtros/cita-filtros.component';
import {
  CitaFormData,
  CitaFormModalComponent,
} from '../../shared/components/cita-form-modal/cita-form-modal.component';
import { EstadoBadgeComponent } from './components/estado-badge/estado-badge.component';
import { PagoBadgeComponent } from './components/pago-badge/pago-badge.component';
import { CitasApiService } from './citas-api.service';
import {
  CitaDto,
  CitaUpsertRequest,
  FiltroCitas,
  toDatePart,
  toTimePart,
} from './models/cita.model';
import { mapApiError } from 'src/app/shared/utils/api-error.mapper';

@Component({
  selector: 'app-citas',
  templateUrl: './citas.page.html',
  styleUrls: ['./citas.page.scss'],
  standalone: true,
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    CitaCardComponent,
    CitaFiltrosComponent,
    CitaFormModalComponent,
    EstadoBadgeComponent,
    PagoBadgeComponent,
  ],
})
export class CitasPage implements OnInit, OnDestroy {
  citasFiltradas: CitaDto[] = [];
  showFormModal = false;
  citaEditando: CitaDto | null = null;

  totalCitas = 0;
  currentPage = 0;
  pageSize = 20;
  totalPages = 0;
  isLastPage = true;

  loading = false;
  loadingMore = false;
  saving = false;
  errorMessage = '';

  filtrosActuales: FiltroCitas = {
    busqueda: '',
    estado: 'todos',
    estado_pago: 'todos',
    fecha_desde: '',
    fecha_hasta: '',
    id_paciente: null,
  };

  constructor(
    private router: Router,
    private svc: CitasApiService
  ) {}

  ngOnInit() {
    this.aplicarFiltros(this.filtrosActuales);
  }

  aplicarFiltros(filtros: FiltroCitas) {
    this.filtrosActuales = { ...filtros };
    void this.cargar(true);
  }

  cargarMas() {
    if (this.isLastPage || this.loadingMore) return;
    this.currentPage++;
    void this.cargar(false);
  }

  verDetalle(cita: CitaDto) {
    this.router.navigate(['/dashboard/citas', cita.id_cita]);
  }

  abrirCrear() {
    this.citaEditando = null;
    this.showFormModal = true;
    document.body.classList.add('modal-open');
  }

  abrirEditar(cita: CitaDto) {
    if (!this.puedeEditar(cita)) return;
    this.citaEditando = cita;
    this.showFormModal = true;
    document.body.classList.add('modal-open');
  }

  cerrarModal() {
    this.showFormModal = false;
    document.body.classList.remove('modal-open');
  }

  async onGuardado(data: CitaFormData) {
    this.saving = true;
    this.errorMessage = '';

    try {
      const body = this.mapFormToRequest(data);
      if (this.citaEditando) {
        await this.svc.update(this.citaEditando.id_cita, body);
      } else {
        await this.svc.create(body);
      }

      this.cerrarModal();
      await this.cargar(true);
    } catch (err) {
      this.errorMessage = mapApiError(err).userMessage;
    } finally {
      this.saving = false;
    }
  }

  ngOnDestroy() {
    document.body.classList.remove('modal-open');
  }

  formatFecha(isoDateTime: string): string {
    const date = toDatePart(isoDateTime);
    if (!date) return '-';
    const [y, m, d] = date.split('-');
    return `${d}/${m}/${y}`;
  }

  formatHora(isoDateTime: string): string {
    return toTimePart(isoDateTime) || '-';
  }

  formatMonto(n: number): string {
    const safe = Number.isFinite(n) ? n : 0;
    return `€${safe.toFixed(2)}`;
  }

  puedeEditar(cita: CitaDto): boolean {
    return !['COMPLETADA', 'CANCELADA', 'NO_ASISTIO'].includes(cita.estado_cita);
  }

  private async cargar(reset: boolean) {
    if (reset) {
      this.currentPage = 0;
      this.loading = true;
      this.errorMessage = '';
    } else {
      this.loadingMore = true;
    }

    try {
      const page = await this.svc.getAll({
        search: this.filtrosActuales.busqueda.trim() || undefined,
        estado: this.filtrosActuales.estado === 'todos' ? undefined : this.filtrosActuales.estado,
        estadoPago: this.filtrosActuales.estado_pago === 'todos' ? undefined : this.filtrosActuales.estado_pago,
        pacienteId: this.filtrosActuales.id_paciente ?? undefined,
        fechaDesde: this.toBoundaryDateTime(this.filtrosActuales.fecha_desde, false),
        fechaHasta: this.toBoundaryDateTime(this.filtrosActuales.fecha_hasta, true),
        page: this.currentPage,
        size: this.pageSize,
        sort: 'fecha_inicio,desc',
      });

      if (reset) {
        this.citasFiltradas = page.content;
      } else {
        this.citasFiltradas = [...this.citasFiltradas, ...page.content];
      }

      this.totalCitas = page.total_elements;
      this.totalPages = page.total_pages;
      this.isLastPage = page.last;
    } catch (err) {
      if (reset) this.citasFiltradas = [];
      this.errorMessage = mapApiError(err).userMessage;
    } finally {
      this.loading = false;
      this.loadingMore = false;
    }
  }

  private mapFormToRequest(data: CitaFormData): CitaUpsertRequest {
    return {
      id_paciente: data.id_paciente,
      fecha_inicio: data.fecha_inicio,
      fecha_fin: data.fecha_fin,
      motivo: data.motivo?.trim() || undefined,
      notas_internas: data.notas_internas?.trim() || null,
      observaciones: data.observaciones?.trim() || null,
      monto: data.monto,
    };
  }

  private toBoundaryDateTime(dateIso: string, endOfDay: boolean): string | undefined {
    if (!dateIso) return undefined;
    return `${dateIso}T${endOfDay ? '23:59:59' : '00:00:00'}`;
  }
}
