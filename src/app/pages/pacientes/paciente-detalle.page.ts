import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { PacientesMockService } from './pacientes.service.mock';
import { PacienteDto, CitaDto, NotaDto, AdjuntoMeta, SesionPaciente, HistorialEvento, HistorialTipoEvento } from './pacientes.mock';
import { ConfirmDialogComponent, ConfirmDialogConfig } from '../../shared/confirm-dialog/confirm-dialog.component';
import { PacienteSubmenuComponent, SeccionPaciente } from './components/paciente-submenu/paciente-submenu.component';

@Component({
  selector: 'app-paciente-detalle',
  templateUrl: './paciente-detalle.page.html',
  styleUrls: ['./paciente-detalle.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, ConfirmDialogComponent, PacienteSubmenuComponent],
})
export class PacienteDetallePage implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  paciente: PacienteDto | null = null;

  // ─── Secciones ─────────────────────────────────────────────────────────────
  seccionActiva: SeccionPaciente = 'informacion';

  // ─── Sesiones ───────────────────────────────────────────────────────────────
  sesionesData: SesionPaciente[] = [];

  // ─── Citas filter ──────────────────────────────────────────────────────────
  filtroCitas: 'todos' | 'Confirmada' | 'Pendiente' | 'Cancelada' = 'todos';

  // ─── Edit modal ────────────────────────────────────────────────────────────
  showEditarModal = false;
  formPaciente: any = {};
  formErrores: Record<string, string> = {};

  // ─── Confirm dialog ────────────────────────────────────────────────────────
  confirmConfig: ConfirmDialogConfig | null = null;
  private confirmCallback: (() => void) | null = null;

  // ─── Add nota modal ────────────────────────────────────────────────────────
  showNotaModal = false;
  nuevaNotaTexto = '';
  notaError = '';
  notaAdjunto: AdjuntoMeta | null = null;
  private notaFile: File | null = null;
  notaEditandoId: number | null = null;

  readonly ALLOWED_MIME = new Set([
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg', 'image/png', 'image/webp',
  ]);
  readonly ALLOWED_EXT = ['.txt', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.webp'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private svc: PacientesMockService,
  ) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.paciente = this.svc.getById(id) ?? null;
    this.sesionesData = this.svc.getSesiones(id);
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

  setSeccion(sec: SeccionPaciente) {
    this.seccionActiva = sec;
  }

  // ─── Historial ─────────────────────────────────────────────────────────────
  get historialEventos(): HistorialEvento[] {
    if (!this.paciente) return [];
    const eventos: HistorialEvento[] = [];

    for (const cita of this.paciente.citas) {
      const tipo: HistorialTipoEvento =
        cita.estado === 'Confirmada' ? 'cita_confirmada'
        : cita.estado === 'Cancelada' ? 'cita_cancelada'
        : 'cita_pendiente';
      eventos.push({
        id: `cita-${cita.id_cita}`,
        fecha: cita.fecha,
        hora: cita.hora,
        tipo,
        descripcion: cita.tipo,
        detalle: cita.notas,
      });
    }

    for (const ses of this.sesionesData) {
      eventos.push({
        id: `sesion-${ses.id_sesion}`,
        fecha: ses.fecha,
        hora: ses.hora,
        tipo: 'sesion_registrada',
        descripcion: ses.tipo,
        detalle: ses.resumen,
      });
    }

    for (const nota of this.paciente.notas) {
      eventos.push({
        id: `nota-${nota.id_nota}`,
        fecha: nota.fecha,
        tipo: 'nota_agregada',
        descripcion: 'Nota clínica registrada',
        detalle: nota.contenido,
      });
    }

    return eventos.sort((a, b) => {
      const d = b.fecha.localeCompare(a.fecha);
      if (d !== 0) return d;
      return (b.hora ?? '').localeCompare(a.hora ?? '');
    });
  }

  getEventoIcon(tipo: HistorialTipoEvento): string {
    const map: Record<HistorialTipoEvento, string> = {
      cita_confirmada:  'checkmark-circle-outline',
      cita_completada:  'checkmark-done-circle-outline',
      cita_cancelada:   'close-circle-outline',
      cita_pendiente:   'time-outline',
      cita_pospuesta:   'arrow-forward-circle-outline',
      no_asistio:       'person-remove-outline',
      sesion_registrada:'pulse-outline',
      pago_registrado:  'card-outline',
      pago_pendiente:   'wallet-outline',
      reprogramacion:   'calendar-outline',
      nota_agregada:    'document-text-outline',
    };
    return map[tipo] ?? 'ellipse-outline';
  }

  getEventoLabel(tipo: HistorialTipoEvento): string {
    const map: Record<HistorialTipoEvento, string> = {
      cita_confirmada:  'Cita confirmada',
      cita_completada:  'Cita completada',
      cita_cancelada:   'Cita cancelada',
      cita_pendiente:   'Cita pendiente',
      cita_pospuesta:   'Cita pospuesta',
      no_asistio:       'No asistió',
      sesion_registrada:'Sesión registrada',
      pago_registrado:  'Pago registrado',
      pago_pendiente:   'Pago pendiente',
      reprogramacion:   'Reprogramación',
      nota_agregada:    'Nota clínica',
    };
    return map[tipo] ?? tipo;
  }

  getEventoColorClass(tipo: HistorialTipoEvento): string {
    const map: Record<HistorialTipoEvento, string> = {
      cita_confirmada:  'ev--green',
      cita_completada:  'ev--green',
      cita_cancelada:   'ev--red',
      cita_pendiente:   'ev--yellow',
      cita_pospuesta:   'ev--yellow',
      no_asistio:       'ev--red',
      sesion_registrada:'ev--purple',
      pago_registrado:  'ev--blue',
      pago_pendiente:   'ev--yellow',
      reprogramacion:   'ev--blue',
      nota_agregada:    'ev--slate',
    };
    return map[tipo] ?? 'ev--slate';
  }

  // ─── Editar ────────────────────────────────────────────────────────────────
  abrirEditarModal() {
    if (!this.paciente) return;
    this.formPaciente = { ...this.paciente };
    this.formErrores = {};
    this.showEditarModal = true;
  }

  cerrarEditarModal() {
    if (this.editFormHasChanges()) {
      this.openConfirm(
        {
          title: 'Descartar cambios',
          message: 'Tienes cambios sin guardar. ¿Deseas salir sin guardar?',
          confirmLabel: 'Salir sin guardar',
          cancelLabel: 'Seguir editando',
          variant: 'danger',
          icon: 'alert-circle-outline',
        },
        () => { this.showEditarModal = false; }
      );
      return;
    }
    this.showEditarModal = false;
  }

  private editFormHasChanges(): boolean {
    if (!this.paciente) return false;
    const fields = ['nombre', 'apellido', 'email', 'telefono', 'fecha_nacimiento', 'notas_generales', 'activo'] as const;
    return fields.some(k => this.formPaciente[k] !== (this.paciente as any)[k]);
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
    this.openConfirm(
      {
        title: 'Guardar cambios',
        message: '¿Deseas guardar los cambios realizados en este paciente?',
        confirmLabel: 'Guardar cambios',
        icon: 'checkmark-circle-outline',
        variant: 'primary',
      },
      () => {
        this.svc.update({ ...this.paciente!, ...this.formPaciente });
        this.paciente = this.svc.getById(this.paciente!.id_paciente) ?? null;
        this.showEditarModal = false;
      }
    );
  }

  // ─── Notas ─────────────────────────────────────────────────────────────────
  abrirNotaModal(nota?: NotaDto) {
    this.nuevaNotaTexto = nota?.contenido ?? '';
    this.notaError = '';
    this.notaAdjunto = nota?.adjunto ? { ...nota.adjunto } : null;
    this.notaFile = null;
    this.notaEditandoId = nota?.id_nota ?? null;
    this.showNotaModal = true;
  }

  cerrarNotaModal() {
    if (this.nuevaNotaTexto.trim() || this.notaFile) {
      this.openConfirm(
        {
          title: 'Descartar nota',
          message: 'Tienes cambios sin guardar. ¿Deseas salir sin guardar?',
          confirmLabel: 'Salir sin guardar',
          cancelLabel: 'Seguir editando',
          variant: 'danger',
          icon: 'alert-circle-outline',
        },
        () => this.resetNotaModal()
      );
      return;
    }
    this.resetNotaModal();
  }

  private resetNotaModal() {
    if (this.notaAdjunto?.previewUrl && this.notaFile) {
      URL.revokeObjectURL(this.notaAdjunto.previewUrl);
    }
    this.showNotaModal = false;
    this.nuevaNotaTexto = '';
    this.notaError = '';
    this.notaAdjunto = null;
    this.notaFile = null;
    this.notaEditandoId = null;
  }

  // ─── File handling ───────────────────────────────────────────────────────
  triggerFilePicker() {
    this.fileInput?.nativeElement.click();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!this.ALLOWED_MIME.has(file.type) && !this.ALLOWED_EXT.includes(ext)) {
      this.notaError = `Formato no permitido. Usa: ${this.ALLOWED_EXT.join(', ')}`;
      input.value = '';
      return;
    }
    this.notaError = '';

    // Revoke previous preview to avoid memory leak
    if (this.notaAdjunto?.previewUrl && this.notaFile) {
      URL.revokeObjectURL(this.notaAdjunto.previewUrl);
    }

    const isImage = file.type.startsWith('image/');
    this.notaFile = file;
    this.notaAdjunto = {
      name: file.name,
      type: file.type,
      size: file.size,
      previewUrl: isImage ? URL.createObjectURL(file) : undefined,
    };
    input.value = '';
  }

  quitarAdjunto() {
    if (this.notaAdjunto?.previewUrl && this.notaFile) {
      URL.revokeObjectURL(this.notaAdjunto.previewUrl);
    }
    this.notaAdjunto = null;
    this.notaFile = null;
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  getFileIcon(type: string): string {
    if (type.startsWith('image/')) return 'image-outline';
    if (type === 'text/plain') return 'document-text-outline';
    return 'document-outline';
  }

  verAdjunto(adjunto: AdjuntoMeta) {
    if (adjunto.previewUrl) {
      window.open(adjunto.previewUrl, '_blank');
    } else {
      console.log('[Agendify] Adjunto (mock):', adjunto);
    }
  }

  get notaModalHasContent(): boolean {
    return !!(this.nuevaNotaTexto.trim() || this.notaFile);
  }

  guardarNota() {
    const texto = this.nuevaNotaTexto.trim();
    if (!texto && !this.notaAdjunto) {
      this.notaError = 'Escribe algo o adjunta un archivo.';
      return;
    }
    if (!this.paciente) return;

    const nota: NotaDto = {
      id_nota: this.notaEditandoId ?? Date.now(),
      fecha: new Date().toISOString().split('T')[0],
      contenido: texto,
      ...(this.notaAdjunto ? { adjunto: { ...this.notaAdjunto } } : {}),
    };

    if (this.notaEditandoId !== null) {
      this.svc.updateNota(this.paciente.id_paciente, nota);
    } else {
      this.svc.addNota(this.paciente.id_paciente, nota);
    }
    this.paciente = this.svc.getById(this.paciente.id_paciente) ?? null;
    // Don't revoke previewUrl — it lives in the nota object now
    this.notaFile = null;
    this.showNotaModal = false;
    this.nuevaNotaTexto = '';
    this.notaError = '';
    this.notaAdjunto = null;
    this.notaEditandoId = null;
  }

  eliminarNota(nota: NotaDto) {
    if (!this.paciente) return;
    this.svc.deleteNota(this.paciente.id_paciente, nota.id_nota);
    this.paciente = this.svc.getById(this.paciente.id_paciente) ?? null;
  }

  irANuevaCita() {
    this.router.navigate(['/dashboard/agenda']);
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
