import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { PacientesApiService } from './pacientes-api.service';
import {
  PacienteDto,
  PacienteRequest,
  PACIENTE_SEXO_OPTIONS,
  SexoPaciente,
  isSexoPaciente,
  normalizeSexoPaciente,
} from './models/paciente.model';
import { getAvatarColor as avatarColorUtil } from '../../shared/utils/avatar.utils';
import { formatFecha as formatFechaUtil } from '../../shared/utils/date.utils';
import { ConfirmDialogComponent, ConfirmDialogConfig } from '../../shared/confirm-dialog/confirm-dialog.component';
import { AgfDatePickerComponent } from '../../shared/components/agf-date-picker/agf-date-picker.component';
import { mapApiError } from '../../shared/utils/api-error.mapper';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { PageResponse } from '../../shared/models/page.model';

@Component({
  selector: 'app-pacientes',
  templateUrl: './pacientes.page.html',
  styleUrls: ['./pacientes.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, ConfirmDialogComponent, AgfDatePickerComponent, PaginationComponent],
})
export class PacientesPage implements OnInit {
  @ViewChild('pacientesTable') private pacientesTable?: ElementRef<HTMLElement>;

  readonly birthDateMaxYear = new Date().getFullYear();
  readonly sexoOptions = PACIENTE_SEXO_OPTIONS;

  pacientesFiltrados: PacienteDto[] = [];
  totalPacientes = 0;
  busqueda = '';
  filtroActivo: 'todos' | 'activos' | 'inactivos' = 'todos';
  ordenamiento: 'az' | 'za' | 'recientes' | 'antiguos' = 'az';

  currentPage = 0;
  pageSize = 10;
  readonly pageSizeOptions = [10, 20, 50];
  totalPages = 0;

  /** Igual que Citas: el contador usa totales del API cuando vienen explícitos. */
  private hasReliableServerPagination = false;

  loading = false;
  errorMessage = '';
  saving = false;

  showFormModal = false;
  modoModal: 'crear' | 'editar' = 'crear';
  pacienteEditando: PacienteDto | null = null;
  formPaciente = this.emptyForm();
  formErrores: Record<string, string> = {};

  confirmConfig: ConfirmDialogConfig | null = null;
  private confirmCallback: (() => void) | null = null;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private router: Router, private svc: PacientesApiService) {}

  ngOnInit() {
    void this.cargar();
  }

  get currentPageDisplay(): number {
    return this.currentPage + 1;
  }

  /** Total mostrado en el footer `app-pagination` y en el contador (misma lógica que Citas). */
  get summaryTotalPacientes(): number {
    if (this.hasReliableServerPagination) {
      return this.totalPacientes;
    }
    return Array.isArray(this.pacientesFiltrados) ? this.pacientesFiltrados.length : 0;
  }

  get currentRangeStart(): number {
    if (this.summaryTotalPacientes === 0) return 0;
    if (!this.hasReliableServerPagination) return 1;
    return this.currentPage * this.pageSize + 1;
  }

  get currentRangeEnd(): number {
    if (this.summaryTotalPacientes === 0) return 0;
    const visibleItems = Array.isArray(this.pacientesFiltrados) ? this.pacientesFiltrados.length : 0;
    if (!this.hasReliableServerPagination) return visibleItems;
    return Math.min(this.currentRangeStart + visibleItems - 1, this.summaryTotalPacientes);
  }

  get pacientesSummaryLabel(): string {
    return this.summaryTotalPacientes === 1 ? 'paciente' : 'pacientes';
  }

  get shouldShowPagination(): boolean {
    return !this.loading && !this.errorMessage && this.summaryTotalPacientes > 0;
  }

  emptyForm() {
    return {
      nombre: '', apellido: '', email: '', numero_telefono: '',
      fecha_nacimiento: '', notas_generales: '', sexo: '' as SexoPaciente | '',
      direccion: '', contacto_emergencia_nombre: '', contacto_emergencia_telefono: '',
    };
  }

  calcularEdad(fecha: string): number {
    const hoy = new Date();
    const nac = new Date(fecha);
    let edad = hoy.getFullYear() - nac.getFullYear();
    if (hoy.getMonth() < nac.getMonth() || (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate())) edad--;
    return edad;
  }

  getIniciales(nombre: string, apellido: string): string {
    return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();
  }

  getAvatarColor(nombre: string): string {
    return avatarColorUtil(nombre);
  }

  formatFecha(iso: string): string {
    if (!iso) return '—';
    return formatFechaUtil(iso);
  }

  private getSortParam(): string {
    switch (this.ordenamiento) {
      case 'az':        return 'apellido,asc';
      case 'za':        return 'apellido,desc';
      case 'recientes': return 'fecha_nacimiento,desc';
      case 'antiguos':  return 'fecha_nacimiento,asc';
      default:          return 'apellido,asc';
    }
  }

  async cargar(page = 0, options: { scrollToTable?: boolean } = {}) {
    const targetPage = Math.max(page, 0);
    this.loading = true;
    this.errorMessage = '';

    try {
      const activo = this.filtroActivo === 'activos' ? true
                   : this.filtroActivo === 'inactivos' ? false
                   : undefined;

      const response = await this.svc.getAll({
        search: this.busqueda.trim() || undefined,
        activo,
        page: targetPage,
        size: this.pageSize,
        sort: this.getSortParam(),
      });

      const content = Array.isArray(response.content) ? response.content : [];
      const requestedPageSize = this.pageSize;

      const totalElements = this.resolveTotalElements(response, content.length, requestedPageSize);
      /** Totales inferidos (última página, `last`, etc.) también alimentan el mismo pie que Citas. */
      this.hasReliableServerPagination = totalElements > 0;

      const totalPagesFromApi = this.readPagedInt(response, 'total_pages', 'totalPages');
      let totalPages =
        totalPagesFromApi != null && totalPagesFromApi >= 0
          ? totalPagesFromApi
          : totalElements > 0
            ? Math.max(Math.ceil(totalElements / requestedPageSize), 1)
            : 0;

      const responsePage = this.readPagedInt(response, 'number', 'pageNumber') ?? targetPage;
      const responsePageClamped =
        totalPages > 0 ? Math.min(Math.max(responsePage, 0), totalPages - 1) : responsePage;

      if (totalPages > 0 && targetPage >= totalPages && content.length === 0) {
        await this.cargar(totalPages - 1, options);
        return;
      }

      /** Si el backend ignora `size` y devuelve más filas, limitar en cliente para coincidir con la página solicitada. */
      const pacientesVisibles =
        content.length > requestedPageSize ? content.slice(0, requestedPageSize) : content;

      if (totalPages === 0 && pacientesVisibles.length > 0) {
        totalPages = Math.max(Math.ceil(Math.max(totalElements, pacientesVisibles.length) / requestedPageSize), 1);
      }

      this.pacientesFiltrados = pacientesVisibles;
      this.totalPacientes = totalElements;
      this.totalPages = totalPages;
      this.currentPage = responsePageClamped;
      /** El tamaño de página lo decide la UI; no sobrescribir con `response.size` (el API a veces ignora `size` y devuelve otro valor). */
      this.pageSize = requestedPageSize;

      if (options.scrollToTable) {
        setTimeout(() => this.scrollToTable(), 0);
      }
    } catch (err) {
      this.pacientesFiltrados = [];
      this.totalPacientes = 0;
      this.totalPages = 0;
      this.currentPage = 0;
      this.hasReliableServerPagination = false;
      this.errorMessage = mapApiError(err).userMessage;
    } finally {
      this.loading = false;
    }
  }

  onPaginationPageChange(page: number) {
    if (page === this.currentPage || page < 0 || this.loading) return;
    if (this.totalPages > 0 && page >= this.totalPages) return;
    void this.cargar(page, { scrollToTable: true });
  }

  onPaginationPageSizeChange(nextSize: number) {
    if (!Number.isFinite(nextSize) || nextSize <= 0 || nextSize === this.pageSize) return;
    this.pageSize = nextSize;
    void this.cargar(0, { scrollToTable: true });
  }

  /**
   * Total de registros: nunca usar `content.length` como total (solo cuenta la página actual).
   * Acepta números como string (p.ej. `"49"`).
   * Si solo falta el total pero sabemos que es la última página, se puede derivar con índice × tamaño + filas.
   */
  private resolveTotalElements(
    response: PageResponse<PacienteDto>,
    contentLength: number,
    pageSize: number,
  ): number {
    const direct = this.readTotalElementsDirect(response);
    if (direct != null && direct >= 0) return direct;

    const totalPagesVal = this.readPagedInt(response, 'total_pages', 'totalPages');
    const pageIndex = this.readPagedInt(response, 'number', 'pageNumber') ?? 0;

    if (response.last === false && pageSize > 0 && contentLength > 0) {
      return pageIndex * pageSize + contentLength + 1;
    }

    if (response.last === true && pageSize > 0 && pageIndex >= 0) {
      return pageIndex * pageSize + contentLength;
    }

    if (
      response.last === undefined &&
      totalPagesVal != null &&
      totalPagesVal > 0 &&
      pageSize > 0
    ) {
      if (pageIndex === totalPagesVal - 1) {
        return (totalPagesVal - 1) * pageSize + contentLength;
      }
      if (pageIndex < totalPagesVal - 1 && contentLength > 0) {
        return pageIndex * pageSize + contentLength + 1;
      }
    }

    if (pageIndex === 0 && contentLength > 0 && response.last !== false) {
      return contentLength;
    }

    return 0;
  }

  /** Intenta varios nombres habituales del total (Spring y APIs alternativas). */
  private readTotalElementsDirect(response: PageResponse<PacienteDto>): number | null {
    const r = response as unknown as Record<string, unknown>;
    for (const key of ['total_elements', 'totalElements', 'total', 'total_records', 'totalRecords']) {
      const v = this.parsePagedScalar(r[key]);
      if (v != null && v >= 0) return v;
    }
    return null;
  }

  private parsePagedScalar(raw: unknown): number | null {
    if (raw === null || raw === undefined) return null;
    if (typeof raw === 'number' && Number.isFinite(raw)) return Math.trunc(raw);
    if (typeof raw === 'string' && raw.trim() !== '') {
      const n = Number(raw.trim().replace(',', '.'));
      if (Number.isFinite(n)) return Math.trunc(n);
    }
    return null;
  }

  private readPagedInt(
    response: PageResponse<PacienteDto>,
    snakeKey: string,
    camelKey: string,
  ): number | null {
    const r = response as unknown as Record<string, unknown>;
    return this.parsePagedScalar(r[snakeKey] ?? r[camelKey]);
  }

  onBusquedaChange() {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => void this.cargar(), 350);
  }

  clearBusqueda() {
    this.busqueda = '';
    void this.cargar();
  }

  setFiltroActivo(v: 'todos' | 'activos' | 'inactivos') {
    this.filtroActivo = v;
    void this.cargar();
  }

  onOrdenamientoChange() {
    void this.cargar();
  }

  abrirCrearModal() {
    this.modoModal = 'crear';
    this.formPaciente = this.emptyForm();
    this.formErrores = {};
    this.pacienteEditando = null;
    this.showFormModal = true;
  }

  abrirEditarModal(p: PacienteDto, ev?: Event) {
    ev?.stopPropagation();
    this.modoModal = 'editar';
    this.pacienteEditando = p;
    this.formPaciente = {
      nombre: p.nombre, apellido: p.apellido, email: p.email,
      numero_telefono: p.numero_telefono ?? '', fecha_nacimiento: p.fecha_nacimiento ?? '',
      notas_generales: p.notas_generales ?? '', sexo: normalizeSexoPaciente(p.sexo),
      direccion: p.direccion ?? '',
      contacto_emergencia_nombre: p.contacto_emergencia_nombre ?? '',
      contacto_emergencia_telefono: p.contacto_emergencia_telefono ?? '',
    };
    this.formErrores = {};
    this.showFormModal = true;
  }

  cerrarFormModal() {
    if (this.formHasChanges()) {
      this.openConfirm(
        {
          title: 'Descartar cambios',
          message: 'Tienes cambios sin guardar. ¿Deseas salir sin guardar?',
          confirmLabel: 'Salir sin guardar',
          cancelLabel: 'Seguir editando',
          variant: 'danger',
          icon: 'alert-circle-outline',
        },
        () => {
          this.showFormModal = false;
          this.pacienteEditando = null;
        }
      );
      return;
    }
    this.showFormModal = false;
    this.pacienteEditando = null;
  }

  private formHasChanges(): boolean {
    if (this.modoModal === 'crear') {
      const empty = this.emptyForm();
      return Object.keys(empty).some(key => {
        const currentValue = this.formPaciente[key as keyof typeof empty];
        const initialValue = empty[key as keyof typeof empty];
        return currentValue !== initialValue;
      });
    }
    if (!this.pacienteEditando) return false;
    const p = this.pacienteEditando;
    return this.formPaciente.nombre !== p.nombre
      || this.formPaciente.apellido !== p.apellido
      || this.formPaciente.email !== p.email
      || this.formPaciente.numero_telefono !== (p.numero_telefono ?? '')
      || this.formPaciente.fecha_nacimiento !== (p.fecha_nacimiento ?? '')
      || this.formPaciente.notas_generales !== (p.notas_generales ?? '')
      || this.formPaciente.sexo !== normalizeSexoPaciente(p.sexo)
      || this.formPaciente.direccion !== (p.direccion ?? '')
      || this.formPaciente.contacto_emergencia_nombre !== (p.contacto_emergencia_nombre ?? '')
      || this.formPaciente.contacto_emergencia_telefono !== (p.contacto_emergencia_telefono ?? '');
  }

  validarForm(): boolean {
    this.formErrores = {};
    if (!this.formPaciente.nombre.trim()) this.formErrores['nombre'] = 'El nombre es requerido';
    if (!this.formPaciente.apellido.trim()) this.formErrores['apellido'] = 'El apellido es requerido';
    if (this.formPaciente.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.formPaciente.email)) {
      this.formErrores['email'] = 'Formato de email inválido';
    }
    if (this.formPaciente.sexo && !isSexoPaciente(this.formPaciente.sexo)) {
      this.formErrores['sexo'] = 'Selecciona una opción válida';
    }
    return Object.keys(this.formErrores).length === 0;
  }

  guardarPaciente() {
    if (!this.validarForm()) return;
    const esCrear = this.modoModal === 'crear';
    this.openConfirm(
      {
        title: esCrear ? 'Guardar paciente' : 'Guardar cambios',
        message: esCrear
          ? '¿Deseas guardar este nuevo paciente?'
          : '¿Deseas guardar los cambios realizados en este paciente?',
        confirmLabel: esCrear ? 'Sí, guardar' : 'Guardar cambios',
        icon: 'checkmark-circle-outline',
        variant: 'primary',
      },
      () => void this.ejecutarGuardar()
    );
  }

  private async ejecutarGuardar() {
    this.saving = true;
    this.formErrores = {};
    const body: PacienteRequest = {
      nombre: this.formPaciente.nombre.trim(),
      apellido: this.formPaciente.apellido.trim(),
      email: this.formPaciente.email.trim() || undefined,
      numero_telefono: this.formPaciente.numero_telefono.trim() || undefined,
      fecha_nacimiento: this.formPaciente.fecha_nacimiento || undefined,
      notas_generales: this.formPaciente.notas_generales.trim() || undefined,
      sexo: this.formPaciente.sexo || undefined,
      direccion: this.formPaciente.direccion.trim() || undefined,
      contacto_emergencia_nombre: this.formPaciente.contacto_emergencia_nombre.trim() || undefined,
      contacto_emergencia_telefono: this.formPaciente.contacto_emergencia_telefono.trim() || undefined,
    };

    try {
      if (this.modoModal === 'crear') {
        await this.svc.create(body);
      } else if (this.pacienteEditando) {
        await this.svc.update(this.pacienteEditando.id_paciente, body);
      }
      this.showFormModal = false;
      this.pacienteEditando = null;
      await this.cargar(this.currentPage);
    } catch (err) {
      const mapped = mapApiError(err);
      if (mapped.fieldErrors) {
        for (const [k, v] of Object.entries(mapped.fieldErrors)) {
          this.formErrores[k] = v;
        }
      }
      if (!mapped.fieldErrors || Object.keys(mapped.fieldErrors).length === 0) {
        this.formErrores['_general'] = mapped.userMessage;
      }
    } finally {
      this.saving = false;
    }
  }

  toggleActivo(p: PacienteDto, ev?: Event) {
    ev?.stopPropagation();
    const nuevoEstado = !p.activo;
    this.openConfirm(
      {
        title: nuevoEstado ? 'Activar paciente' : 'Desactivar paciente',
        message: nuevoEstado
          ? `¿Deseas activar a ${p.nombre} ${p.apellido}?`
          : `¿Deseas desactivar a ${p.nombre} ${p.apellido}? El paciente no aparecerá en las búsquedas activas.`,
        confirmLabel: nuevoEstado ? 'Sí, activar' : 'Sí, desactivar',
        variant: nuevoEstado ? 'primary' : 'danger',
        icon: nuevoEstado ? 'checkmark-circle-outline' : 'close-circle-outline',
      },
      () => {
        void (async () => {
          try {
            await this.svc.setActivo(p.id_paciente, nuevoEstado);
            await this.cargar(this.currentPage);
          } catch (err) {
            this.errorMessage = mapApiError(err).userMessage;
          }
        })();
      }
    );
  }

  verPaciente(p: PacienteDto) {
    void this.router.navigate(['/dashboard/pacientes', p.id_paciente]);
  }

  private openConfirm(config: ConfirmDialogConfig, onConfirm: () => void) {
    this.confirmConfig = config;
    this.confirmCallback = onConfirm;
  }

  onConfirmDialogConfirmed() {
    this.confirmCallback?.();
    this.confirmConfig = null;
    this.confirmCallback = null;
  }

  onConfirmDialogCancelled() {
    this.confirmConfig = null;
    this.confirmCallback = null;
  }

  private scrollToTable() {
    this.pacientesTable?.nativeElement.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }
}

