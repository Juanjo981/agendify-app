import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { PacientesMockService } from './pacientes.service.mock';
import { PacienteDto, CitaDto, NotaDto } from './pacientes.mock';

@Component({
  selector: 'app-paciente-detalle',
  templateUrl: './paciente-detalle.page.html',
  styleUrls: ['./paciente-detalle.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
})
export class PacienteDetallePage implements OnInit {
  paciente: PacienteDto | null = null;

  // ─── Tabs ──────────────────────────────────────────────────────────────────
  tabActiva: 'datos' | 'citas' | 'notas' = 'datos';

  // ─── Citas filter ──────────────────────────────────────────────────────────
  filtroCitas: 'todos' | 'Confirmada' | 'Pendiente' | 'Cancelada' = 'todos';

  // ─── Edit modal ────────────────────────────────────────────────────────────
  showEditarModal = false;
  formPaciente: any = {};
  formErrores: Record<string, string> = {};

  // ─── Add nota modal ────────────────────────────────────────────────────────
  showNotaModal = false;
  nuevaNotaTexto = '';
  notaError = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private svc: PacientesMockService,
  ) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.paciente = this.svc.getById(id) ?? null;
  }

  volver() {
    this.router.navigate(['/dashboard/pacientes']);
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────
  calcularEdad(fecha: string): number {
    const hoy = new Date();
    const nac = new Date(fecha);
    let edad = hoy.getFullYear() - nac.getFullYear();
    if (hoy.getMonth() < nac.getMonth() || (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate())) edad--;
    return edad;
  }

  getIniciales(): string {
    if (!this.paciente) return '';
    return `${this.paciente.nombre.charAt(0)}${this.paciente.apellido.charAt(0)}`.toUpperCase();
  }

  getAvatarColor(): string {
    if (!this.paciente) return '#6366f1';
    const colors = ['#6366f1', '#8b5cf6', '#3b82f6', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444'];
    return colors[this.paciente.nombre.charCodeAt(0) % colors.length];
  }

  formatFecha(iso: string): string {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  get citasFiltradas(): CitaDto[] {
    if (!this.paciente) return [];
    if (this.filtroCitas === 'todos') return this.paciente.citas;
    return this.paciente.citas.filter(c => c.estado === this.filtroCitas);
  }

  get estadoCount() {
    const citas = this.paciente?.citas ?? [];
    return {
      confirmadas: citas.filter(c => c.estado === 'Confirmada').length,
      pendientes: citas.filter(c => c.estado === 'Pendiente').length,
      canceladas: citas.filter(c => c.estado === 'Cancelada').length,
    };
  }

  setTab(tab: 'datos' | 'citas' | 'notas') {
    this.tabActiva = tab;
  }

  // ─── Editar ────────────────────────────────────────────────────────────────
  abrirEditarModal() {
    if (!this.paciente) return;
    this.formPaciente = { ...this.paciente };
    this.formErrores = {};
    this.showEditarModal = true;
  }

  cerrarEditarModal() {
    this.showEditarModal = false;
  }

  validarForm(): boolean {
    this.formErrores = {};
    if (!this.formPaciente.nombre?.trim()) this.formErrores['nombre'] = 'El nombre es requerido';
    if (!this.formPaciente.apellido?.trim()) this.formErrores['apellido'] = 'El apellido es requerido';
    if (!this.formPaciente.email?.trim()) {
      this.formErrores['email'] = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.formPaciente.email)) {
      this.formErrores['email'] = 'Formato de email inválido';
    }
    return Object.keys(this.formErrores).length === 0;
  }

  guardarEdicion() {
    if (!this.validarForm() || !this.paciente) return;
    this.svc.update({ ...this.paciente, ...this.formPaciente });
    this.paciente = this.svc.getById(this.paciente.id_paciente) ?? null;
    this.showEditarModal = false;
  }

  // ─── Notas ─────────────────────────────────────────────────────────────────
  abrirNotaModal() {
    this.nuevaNotaTexto = '';
    this.notaError = '';
    this.showNotaModal = true;
  }

  cerrarNotaModal() {
    this.showNotaModal = false;
  }

  guardarNota() {
    if (!this.nuevaNotaTexto.trim()) {
      this.notaError = 'La nota no puede estar vacía';
      return;
    }
    if (!this.paciente) return;
    const nota: NotaDto = {
      id_nota: Date.now(),
      fecha: new Date().toISOString().split('T')[0],
      contenido: this.nuevaNotaTexto.trim(),
    };
    this.svc.addNota(this.paciente.id_paciente, nota);
    this.paciente = this.svc.getById(this.paciente.id_paciente) ?? null;
    this.showNotaModal = false;
  }

  eliminarNota(nota: NotaDto) {
    if (!this.paciente) return;
    this.svc.deleteNota(this.paciente.id_paciente, nota.id_nota);
    this.paciente = this.svc.getById(this.paciente.id_paciente) ?? null;
  }

  irANuevaCita() {
    this.router.navigate(['/dashboard/agenda']);
  }
}
