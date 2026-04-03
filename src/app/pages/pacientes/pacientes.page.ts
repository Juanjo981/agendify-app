import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { PacientesMockService } from './pacientes.service.mock';
import { PacienteDto } from './models/paciente.model';
import { getAvatarColor as avatarColorUtil } from '../../shared/utils/avatar.utils';
import { formatFecha as formatFechaUtil } from '../../shared/utils/date.utils';
import { ConfirmDialogComponent, ConfirmDialogConfig } from '../../shared/confirm-dialog/confirm-dialog.component';
import { AgfDatePickerComponent } from '../../shared/components/agf-date-picker/agf-date-picker.component';

@Component({
  selector: 'app-pacientes',
  templateUrl: './pacientes.page.html',
  styleUrls: ['./pacientes.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, ConfirmDialogComponent, AgfDatePickerComponent],
})
export class PacientesPage implements OnInit {
  // ─── Data & filters ────────────────────────────────────────────────────────
  pacientesFiltrados: PacienteDto[] = [];
  busqueda = '';
  filtroCitas: 'todos' | 'con-citas' | 'sin-citas' = 'todos';
  ordenamiento: 'az' | 'za' | 'recientes' | 'antiguos' = 'az';

  // ─── Form modal ────────────────────────────────────────────────────────────
  showFormModal = false;
  modoModal: 'crear' | 'editar' = 'crear';
  pacienteEditando: PacienteDto | null = null;
  formPaciente = this.emptyForm();
  formErrores: Record<string, string> = {};

  // ─── Alertas clínicas ──────────────────────────────────────────────────────
  alertasForm: string[] = [];
  alertaInput = '';

  // ─── Confirm dialog ────────────────────────────────────────────────────────
  confirmConfig: ConfirmDialogConfig | null = null;
  private confirmCallback: (() => void) | null = null;
  private pacienteAEliminar: PacienteDto | null = null;

  constructor(private router: Router, private svc: PacientesMockService) {}

  ngOnInit() {
    this.filtrar();
  }

  get totalPacientes(): number {
    return this.svc.getAll().length;
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────
  emptyForm() {
    return { nombre: '', apellido: '', email: '', telefono: '', fecha_nacimiento: '', notas_generales: '', activo: true };
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

  ultimaCita(p: PacienteDto): string {
    if (!p.citas.length) return '';
    return [...p.citas].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0].fecha;
  }

  formatFecha(iso: string): string {
    return formatFechaUtil(iso);
  }

  // ─── Filter & sort ─────────────────────────────────────────────────────────
  filtrar() {
    let r = [...this.svc.getAll()];
    if (this.busqueda.trim()) {
      const q = this.busqueda.toLowerCase();
      r = r.filter(p =>
        p.nombre.toLowerCase().includes(q) ||
        p.apellido.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.telefono.includes(q)
      );
    }
    if (this.filtroCitas === 'con-citas') r = r.filter(p => p.citas.length > 0);
    if (this.filtroCitas === 'sin-citas') r = r.filter(p => p.citas.length === 0);
    switch (this.ordenamiento) {
      case 'az': r.sort((a, b) => a.apellido.localeCompare(b.apellido)); break;
      case 'za': r.sort((a, b) => b.apellido.localeCompare(a.apellido)); break;
      case 'recientes': r.sort((a, b) => new Date(b.fecha_nacimiento).getTime() - new Date(a.fecha_nacimiento).getTime()); break;
      case 'antiguos': r.sort((a, b) => new Date(a.fecha_nacimiento).getTime() - new Date(b.fecha_nacimiento).getTime()); break;
    }
    this.pacientesFiltrados = r;
  }

  setFiltroCitas(v: 'todos' | 'con-citas' | 'sin-citas') {
    this.filtroCitas = v;
    this.filtrar();
  }

  clearBusqueda() {
    this.busqueda = '';
    this.filtrar();
  }

  // ─── CRUD ──────────────────────────────────────────────────────────────────
  abrirCrearModal() {
    this.modoModal = 'crear';
    this.formPaciente = this.emptyForm();
    this.formErrores = {};
    this.pacienteEditando = null;
    this.alertasForm = [];
    this.alertaInput = '';
    this.showFormModal = true;
  }

  abrirEditarModal(p: PacienteDto, ev?: Event) {
    ev?.stopPropagation();
    this.modoModal = 'editar';
    this.pacienteEditando = p;
    this.formPaciente = { nombre: p.nombre, apellido: p.apellido, email: p.email, telefono: p.telefono, fecha_nacimiento: p.fecha_nacimiento, notas_generales: p.notas_generales, activo: p.activo };
    this.formErrores = {};
    this.alertasForm = [...(p.alertas ?? [])];
    this.alertaInput = '';
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

  agregarAlerta() {
    const t = this.alertaInput.trim();
    if (!t) return;
    this.alertasForm = [...this.alertasForm, t];
    this.alertaInput = '';
  }

  eliminarAlerta(i: number) {
    this.alertasForm = this.alertasForm.filter((_, idx) => idx !== i);
  }

  private formHasChanges(): boolean {
    if (this.modoModal === 'crear') {
      const empty = this.emptyForm();
      const baseChanged = Object.keys(empty).some(k => (this.formPaciente as any)[k] !== (empty as any)[k]);
      return baseChanged || this.alertasForm.length > 0;
    }
    if (!this.pacienteEditando) return false;
    const fields = ['nombre', 'apellido', 'email', 'telefono', 'fecha_nacimiento', 'notas_generales', 'activo'] as const;
    const fieldsChanged = fields.some(k => this.formPaciente[k] !== (this.pacienteEditando as any)[k]);
    const alertasChanged = JSON.stringify(this.alertasForm) !== JSON.stringify(this.pacienteEditando.alertas ?? []);
    return fieldsChanged || alertasChanged;
  }

  validarForm(): boolean {
    this.formErrores = {};
    if (!this.formPaciente.nombre.trim()) this.formErrores['nombre'] = 'El nombre es requerido';
    if (!this.formPaciente.apellido.trim()) this.formErrores['apellido'] = 'El apellido es requerido';
    if (!this.formPaciente.email.trim()) {
      this.formErrores['email'] = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.formPaciente.email)) {
      this.formErrores['email'] = 'Formato de email inválido';
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

  private ejecutarGuardar() {
    if (this.modoModal === 'crear') {
      this.svc.create({ id_paciente: Date.now(), ...this.formPaciente, alertas: [...this.alertasForm], citas: [], notas: [] });
    } else if (this.pacienteEditando) {
      this.svc.update({ ...this.pacienteEditando, ...this.formPaciente, alertas: [...this.alertasForm] });
    }
    this.filtrar();
    this.showFormModal = false;
    this.pacienteEditando = null;
  }

  confirmarEliminar(p: PacienteDto, ev?: Event) {
    ev?.stopPropagation();
    this.pacienteAEliminar = p;
    this.openConfirm(
      {
        title: 'Eliminar paciente',
        message: 'Esta acción no se puede deshacer. ¿Deseas eliminar a ',
        subject: `${p.nombre} ${p.apellido}?`,
        confirmLabel: 'Sí, eliminar',
        variant: 'danger',
        icon: 'person-remove-outline',
      },
      () => {
        if (!this.pacienteAEliminar) return;
        this.svc.delete(this.pacienteAEliminar.id_paciente);
        this.filtrar();
        this.pacienteAEliminar = null;
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
