import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { PacientesMockService } from './pacientes.service.mock';
import { PacienteDto } from './pacientes.mock';

@Component({
  selector: 'app-pacientes',
  templateUrl: './pacientes.page.html',
  styleUrls: ['./pacientes.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
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

  // ─── Delete modal ──────────────────────────────────────────────────────────
  showDeleteModal = false;
  pacienteAEliminar: PacienteDto | null = null;

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
    const colors = ['#6366f1', '#8b5cf6', '#3b82f6', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444'];
    return colors[nombre.charCodeAt(0) % colors.length];
  }

  ultimaCita(p: PacienteDto): string {
    if (!p.citas.length) return '';
    return [...p.citas].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0].fecha;
  }

  formatFecha(iso: string): string {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
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
    this.showFormModal = true;
  }

  abrirEditarModal(p: PacienteDto, ev?: Event) {
    ev?.stopPropagation();
    this.modoModal = 'editar';
    this.pacienteEditando = p;
    this.formPaciente = { nombre: p.nombre, apellido: p.apellido, email: p.email, telefono: p.telefono, fecha_nacimiento: p.fecha_nacimiento, notas_generales: p.notas_generales, activo: p.activo };
    this.formErrores = {};
    this.showFormModal = true;
  }

  cerrarFormModal() {
    this.showFormModal = false;
    this.pacienteEditando = null;
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
    if (this.modoModal === 'crear') {
      this.svc.create({ id_paciente: Date.now(), ...this.formPaciente, citas: [], notas: [] });
    } else if (this.pacienteEditando) {
      this.svc.update({ ...this.pacienteEditando, ...this.formPaciente });
    }
    this.filtrar();
    this.showFormModal = false;
  }

  confirmarEliminar(p: PacienteDto, ev?: Event) {
    ev?.stopPropagation();
    this.pacienteAEliminar = p;
    this.showDeleteModal = true;
  }

  cancelarEliminar() {
    this.showDeleteModal = false;
    this.pacienteAEliminar = null;
  }

  eliminarPaciente() {
    if (!this.pacienteAEliminar) return;
    this.svc.delete(this.pacienteAEliminar.id_paciente);
    this.filtrar();
    this.showDeleteModal = false;
    this.pacienteAEliminar = null;
  }

  verPaciente(p: PacienteDto) {
    this.router.navigate(['/dashboard/pacientes', p.id_paciente]);
  }
}
