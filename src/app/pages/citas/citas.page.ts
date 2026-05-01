import { Component, DestroyRef, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IonicModule, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { CitaCardComponent } from './components/cita-card/cita-card.component';
import { CitaFiltrosComponent } from './components/cita-filtros/cita-filtros.component';
import {
  CitaFormData,
  CitaFormModalComponent,
} from '../../shared/components/cita-form-modal/cita-form-modal.component';
import { EstadoBadgeComponent } from './components/estado-badge/estado-badge.component';
import { PagoBadgeComponent } from './components/pago-badge/pago-badge.component';
import { CitasApiService, CitasPageResponse } from './citas-api.service';
import {
  CitaDto,
  CitaUpsertRequest,
  FiltroCitas,
  EstadoPago,
  isEstadoPago,
  toDatePart,
  toTimePart,
} from './models/cita.model';
import { mapApiError } from 'src/app/shared/utils/api-error.mapper';
import { CitasRefreshService } from '../../shared/refresh/dashboard-module-refresh.services';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';

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
    PaginationComponent,
  ],
})
export class CitasPage implements OnInit, OnDestroy {
  private readonly destroyRef = inject(DestroyRef);
  @ViewChild('citasResults') private citasResults?: ElementRef<HTMLElement>;

  readonly pageSizeOptions = [10, 20, 50];
  citasFiltradas: CitaDto[] = [];
  showFormModal = false;
  citaEditando: CitaDto | null = null;

  totalCitas = 0;
  currentPage = 0;
  pageSize = 10;
  totalPages = 0;
  private hasReliableServerPagination = false;

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
    private svc: CitasApiService,
    private refresh: CitasRefreshService,
    private toastCtrl: ToastController,
  ) {}

  ngOnInit() {
    this.refresh.watchSection('list')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        void this.cargar(true);
      });
  }

  ionViewWillEnter() {
    this.refresh.enterSection('list');
  }

  get shouldShowPagination(): boolean {
    return !this.loading && !this.errorMessage && this.totalCitas > 0;
  }

  get summaryTotalCitas(): number {
    if (this.hasReliableServerPagination) {
      return this.totalCitas;
    }
    return Array.isArray(this.citasFiltradas) ? this.citasFiltradas.length : 0;
  }

  get currentRangeStart(): number {
    if (this.summaryTotalCitas === 0) return 0;
    if (!this.hasReliableServerPagination) return 1;
    const page = this.safePageNumber(this.currentPage);
    const size = this.safePageSize(this.pageSize);
    return page * size + 1;
  }

  get currentRangeEnd(): number {
    if (this.summaryTotalCitas === 0) return 0;
    const visibleItems = Array.isArray(this.citasFiltradas) ? this.citasFiltradas.length : 0;
    if (!this.hasReliableServerPagination) return visibleItems;
    return Math.min(this.currentRangeStart + visibleItems - 1, this.summaryTotalCitas);
  }

  get citasSummaryLabel(): string {
    return this.summaryTotalCitas === 1 ? 'cita' : 'citas';
  }

  aplicarFiltros(filtros: FiltroCitas) {
    this.filtrosActuales = { ...filtros };
    void this.cargar(true);
  }

  onPaginationPageChange(page: number) {
    if (page === this.currentPage || page < 0 || page >= this.totalPages || this.loading) return;
    void this.cargar(false, page, { scrollToResults: true });
  }

  onPaginationPageSizeChange(nextSize: number) {
    if (!Number.isFinite(nextSize) || nextSize <= 0 || nextSize === this.pageSize) return;
    this.pageSize = nextSize;
    void this.cargar(true, 0, { scrollToResults: true });
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

  async onEditarClick(cita: CitaDto, event?: Event) {
    event?.stopPropagation();
    if (!this.puedeEditar(cita)) {
      await this.presentToast('Esta cita no se puede editar por su estado actual.', 'danger');
      return;
    }
    this.abrirEditar(cita);
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
        await this.updateCita(this.citaEditando.id_cita, body);
      } else {
        await this.createCita(body);
      }

      this.cerrarModal();
      this.refresh.requestRefresh('list');
    } catch (err) {
      const mapped = mapApiError(err);
      this.errorMessage = mapped.userMessage;
      console.error('[Citas][guardar] Error al guardar cita', err);
      await this.presentToast(mapped.userMessage, 'danger');
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

  private async cargar(
    reset: boolean,
    pageOverride?: number,
    options: { scrollToResults?: boolean } = {},
  ) {
    const targetPage = Math.max(pageOverride ?? (reset ? 0 : this.currentPage), 0);

    if (reset) {
      this.loading = true;
      this.errorMessage = '';
    }
    this.loadingMore = !reset;

    try {
      const page = await this.svc.getAll({
        search: this.filtrosActuales.busqueda.trim() || undefined,
        estado: this.filtrosActuales.estado === 'todos' ? undefined : this.filtrosActuales.estado,
        estadoPago: this.resolveEstadoPagoFilterParam(),
        pacienteId: this.filtrosActuales.id_paciente ?? undefined,
        fechaDesde: this.toBoundaryDateTime(this.filtrosActuales.fecha_desde, false),
        fechaHasta: this.toBoundaryDateTime(this.filtrosActuales.fecha_hasta, true),
        page: targetPage,
        size: this.pageSize,
        sort: 'fecha_inicio,desc',
      });

      if (page.total_pages > 0 && targetPage >= page.total_pages && page.content.length === 0) {
        await this.cargar(false, page.total_pages - 1, options);
        return;
      }

      this.citasFiltradas = page.content;
      this.hasReliableServerPagination = this.hasReliablePaginationTotals(page);
      this.totalCitas = Number(page.total_elements ?? 0);
      this.totalPages = Number(page.total_pages ?? 0);
      this.currentPage = this.resolvePageNumber(page);
      this.pageSize = this.resolvePageSize(page);

      if (options.scrollToResults) {
        setTimeout(() => this.scrollToResults(), 0);
      }
    } catch (err) {
      this.citasFiltradas = [];
      this.hasReliableServerPagination = false;
      this.totalCitas = 0;
      this.totalPages = 0;
      this.currentPage = 0;
      this.errorMessage = mapApiError(err).userMessage;
    } finally {
      this.loading = false;
      this.loadingMore = false;
    }
  }

  private mapFormToRequest(data: CitaFormData): CitaUpsertRequest {
    const fechaInicio = this.normalizeLocalDateTime(data.fecha_inicio);
    const fechaFin = this.normalizeLocalDateTime(data.fecha_fin);

    if (!data.id_paciente) {
      throw new Error('id_paciente es obligatorio para guardar la cita.');
    }

    if (!this.isValidLocalDateTime(fechaInicio) || !this.isValidLocalDateTime(fechaFin)) {
      throw new Error('Las fechas de la cita no tienen un formato LocalDateTime valido.');
    }

    return {
      id_paciente: data.id_paciente,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      motivo: data.motivo?.trim() || undefined,
      notas_internas: data.notas_internas?.trim() || null,
      monto: data.monto,
    };
  }

  private async createCita(body: CitaUpsertRequest): Promise<void> {
    console.log('[Citas][create] Payload', body);
    const response = await this.svc.create(body);
    console.log('[Citas][create] Response', response);
  }

  private async updateCita(id: number, body: CitaUpsertRequest): Promise<void> {
    console.log('[Citas][update] Payload', { id, ...body });
    const response = await this.svc.update(id, body);
    console.log('[Citas][update] Response', response);
  }

  private normalizeLocalDateTime(value: string): string {
    if (!value) return '';
    const trimmed = value.trim();
    return trimmed.length === 16 ? `${trimmed}:00` : trimmed;
  }

  private isValidLocalDateTime(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(value);
  }

  private async presentToast(message: string, color: 'success' | 'danger' = 'success') {
    const toast = await this.toastCtrl.create({
      message,
      color,
      duration: 2600,
      position: 'top',
    });
    await toast.present();
  }

  private toBoundaryDateTime(dateIso: string, endOfDay: boolean): string | undefined {
    if (!dateIso) return undefined;
    return `${dateIso}T${endOfDay ? '23:59:59' : '00:00:00'}`;
  }

  private scrollToResults() {
    this.citasResults?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private resolvePageNumber(page: {
    number?: number | null;
    pageable?: { page_number?: number | null };
  }): number {
    return this.safePageNumber(page.number ?? page.pageable?.page_number ?? 0);
  }

  private resolvePageSize(page: {
    size?: number | null;
    pageable?: { page_size?: number | null };
  }): number {
    return this.safePageSize(page.size ?? page.pageable?.page_size ?? this.pageSize);
  }

  private safePageNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }

  private safePageSize(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 10;
  }

  private hasReliablePaginationTotals(page: CitasPageResponse<CitaDto>): boolean {
    return Boolean(page._meta?.hasReliableTotalElements);
  }

  private resolveEstadoPagoFilterParam(): EstadoPago | undefined {
    const selected = this.filtrosActuales.estado_pago;
    if (selected === 'todos' || selected == null) {
      return undefined;
    }
    return isEstadoPago(selected) ? selected : undefined;
  }
}
