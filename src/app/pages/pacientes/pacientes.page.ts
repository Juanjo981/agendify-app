import { Component, OnInit } from '@angular/core';
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
import { mapApiError, MappedApiError } from '../../shared/utils/api-error.mapper';

@Component({
  selector: 'app-pacientes',
  templateUrl: './pacientes.page.html',
  styleUrls: ['./pacientes.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, ConfirmDialogComponent, AgfDatePickerComponent],
})
export class PacientesPage implements OnInit {
  readonly birthDateMaxYear = new Date().getFullYear();
  readonly sexoOptions = PACIENTE_SEXO_OPTIONS;

  // ─── Data & filters ────────────────────────────────────────────────────────
  pacientesFiltrados: PacienteDto[] = [];
  totalPacientes = 0;
  busqueda = '';
  filtroActivo: 'todos' | 'activos' | 'inactivos' = 'todos';
  ordenamiento: 'az' | 'za' | 'recientes' | 'antiguos' = 'az';

  // ─── Pagination ────────────────────────────────────────────────────────────
  currentPage = 0;
  pageSize = 20;
  totalPages = 0;
  isLastPage = true;

  // ─── Loading / error ───────────────────────────────────────────────────────
  loading = false;
  loadingMore = false;
  errorMessage = '';
  saving = false;

  // ─── Form modal ────────────────────────────────────────────────────────────
  showFormModal = false;
  modoModal: 'crear' | 'editar' = 'crear';
  pacienteEditando: PacienteDto | null = null;
  formPaciente = this.emptyForm();
  formErrores: Record<string, string> = {};

  // ─── Confirm dialog ────────────────────────────────────────────────────────
  confirmConfig: ConfirmDialogConfig | null = null;
  private confirmCallback: (() => void) | null = null;

  // ─── Search debounce ───────────────────────────────────────────────────────
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private router: Router, private svc: PacientesApiService) {}

  ngOnInit() {
    this.cargar();
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────
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

  // ─── Load data ─────────────────────────────────────────────────────────────
  async cargar(reset = true) {
    if (reset) {
      this.currentPage = 0;
      this.loading = true;
    } else {
      this.loadingMore = true;
    }
    this.errorMessage = '';

    try {
      const activo = this.filtroActivo === 'activos' ? true
                   : this.filtroActivo === 'inactivos' ? false
                   : undefined;

      const page = await this.svc.getAll({
        search: this.busqueda.trim() || undefined,
        activo,
        page: this.currentPage,
        size: this.pageSize,
        sort: this.getSortParam(),
      });

      if (reset) {
        this.pacientesFiltrados = page.content;
      } else {
        this.pacientesFiltrados = [...this.pacientesFiltrados, ...page.content];
      }
      this.totalPacientes = page.total_elements;
      this.totalPages = page.total_pages;
      this.isLastPage = page.last;
    } catch (err) {
      const mapped = mapApiError(err);
      this.errorMessage = mapped.userMessage;
    } finally {
      this.loading = false;
      this.loadingMore = false;
    }
  }

  cargarMas() {
    if (this.isLastPage || this.loadingMore) return;
    this.currentPage++;
    this.cargar(false);
  }

  // ─── Filter & sort ─────────────────────────────────────────────────────────
  onBusquedaChange() {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.cargar(), 350);
  }

  clearBusqueda() {
    this.busqueda = '';
    this.cargar();
  }

  setFiltroActivo(v: 'todos' | 'activos' | 'inactivos') {
    this.filtroActivo = v;
    this.cargar();
  }

  onOrdenamientoChange() {
    this.cargar();
  }

  // ─── CRUD ──────────────────────────────────────────────────────────────────
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
      return Object.keys(empty).some(k => (this.formPaciente as any)[k] !== (empty as any)[k]);
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
      () => this.ejecutarGuardar()
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
      await this.cargar();
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
      async () => {
        try {
          await this.svc.setActivo(p.id_paciente, nuevoEstado);
          await this.cargar();
        } catch (err) {
          const mapped = mapApiError(err);
          this.errorMessage = mapped.userMessage;
        }
      }
    );
  }

  verPaciente(p: PacienteDto) {
    this.router.navigate(['/dashboard/pacientes', p.id_paciente]);
  }

  // ─── Confirm dialog handlers ───────────────────────────────────────────────
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
}
