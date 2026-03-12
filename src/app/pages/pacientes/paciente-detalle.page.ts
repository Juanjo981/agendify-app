import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AlertController, IonicModule } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { PacientesMockService } from './pacientes.service.mock';
import { PacienteDto, CitaDto, NotaDto, AdjuntoMeta, SesionPaciente, HistorialEvento, HistorialTipoEvento } from './pacientes.mock';
import { ConfirmDialogComponent, ConfirmDialogConfig } from '../../shared/confirm-dialog/confirm-dialog.component';
import { PacienteSubmenuComponent, SeccionPaciente } from './components/paciente-submenu/paciente-submenu.component';
import html2pdf from 'html2pdf.js';

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
  // ─── Export ───────────────────────────────────────────────────────────
  exportandoPDF = false;
  // ─── Edit modal ────────────────────────────────────────────────────────────
  showEditarModal = false;
  formPaciente: any = {};
  formErrores: Record<string, string> = {};

  // ─── Alertas clínicas (edit modal) ──────────────────────────────────────
  alertasEditForm: string[] = [];
  alertaEditInput = '';

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
    private alertCtrl: AlertController,
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
  // ─── Exportar PDF ────────────────────────────────────────────────────
  async exportarHistorialPDF() {
    if (!this.paciente || this.exportandoPDF) return;
    this.exportandoPDF = true;

    const p = this.paciente;
    const eventos = this.historialEventos;
    const edad = p.fecha_nacimiento ? this.calcularEdad(p.fecha_nacimiento) : null;
    const fechaNac = p.fecha_nacimiento ? this.formatFecha(p.fecha_nacimiento) : '—';
    const nombreArchivo = `historial-${(p.nombre + '-' + p.apellido).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '')}.pdf`;
    const fechaGeneracion = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });

    const alertasHTML = p.alertas && p.alertas.length > 0
      ? `<div class="pdf-section">
          <div class="pdf-section-title">Alertas cl\u00ednicas</div>
          <ul class="pdf-alerts">${p.alertas.map(a => `<li>&#9888;&#xFE0E; ${a}</li>`).join('')}</ul>
        </div>`
      : '';

    const eventosHTML = eventos.map(ev => {
      const label = this.getEventoLabel(ev.tipo);
      const colorMap: Record<string, string> = {
        ev__green:  '#059669', ev__red:    '#dc2626',
        ev__yellow: '#d97706', ev__purple: '#7c3aed',
        ev__blue:   '#0369a1', ev__slate:  '#475569',
      };
      const cssClass = this.getEventoColorClass(ev.tipo).replace('ev--', 'ev__');
      const color = colorMap[cssClass] ?? '#475569';
      return `
        <div class="pdf-event">
          <div class="pdf-event-dot" style="background:${color}"></div>
          <div class="pdf-event-body">
            <div class="pdf-event-header">
              <span class="pdf-event-label" style="color:${color}">${label}</span>
              <span class="pdf-event-date">${this.formatFecha(ev.fecha)}${ev.hora ? ' &middot; ' + ev.hora : ''}</span>
            </div>
            <p class="pdf-event-desc">${ev.descripcion}</p>
            ${ev.detalle ? `<p class="pdf-event-detail">${ev.detalle}</p>` : ''}
          </div>
        </div>`;
    }).join('');

    const html = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; padding: 32px 40px; max-width: 700px; margin: 0 auto;">

        <!-- Header -->
        <div class="pdf-header">
          <div class="pdf-logo">Agendify</div>
          <div class="pdf-header-meta">
            <span>Historial cl\u00ednico</span>
            <span>${fechaGeneracion}</span>
          </div>
        </div>

        <hr class="pdf-divider" />

        <!-- Informaci\u00f3n del paciente -->
        <div class="pdf-section">
          <div class="pdf-section-title">Informaci\u00f3n del paciente</div>
          <div class="pdf-patient-grid">
            <div class="pdf-data-item"><span class="pdf-label">Nombre completo</span><span class="pdf-value">${p.nombre} ${p.apellido}</span></div>
            ${edad !== null ? `<div class="pdf-data-item"><span class="pdf-label">Edad</span><span class="pdf-value">${edad} a\u00f1os</span></div>` : ''}
            <div class="pdf-data-item"><span class="pdf-label">Email</span><span class="pdf-value">${p.email}</span></div>
            ${p.telefono ? `<div class="pdf-data-item"><span class="pdf-label">Tel\u00e9fono</span><span class="pdf-value">${p.telefono}</span></div>` : ''}
            ${p.fecha_nacimiento ? `<div class="pdf-data-item"><span class="pdf-label">Fecha de nacimiento</span><span class="pdf-value">${fechaNac}</span></div>` : ''}
            ${p.notas_generales ? `<div class="pdf-data-item pdf-data-item--full"><span class="pdf-label">Notas generales</span><span class="pdf-value">${p.notas_generales}</span></div>` : ''}
          </div>
        </div>

        ${alertasHTML}

        <hr class="pdf-divider" />

        <!-- Historial -->
        <div class="pdf-section">
          <div class="pdf-section-title">Historial cronol\u00f3gico
            <span class="pdf-count">${eventos.length} evento${eventos.length !== 1 ? 's' : ''}</span>
          </div>
          ${eventos.length > 0 ? `<div class="pdf-events">${eventosHTML}</div>` : '<p class="pdf-empty">Sin eventos registrados.</p>'}
        </div>

        <!-- Footer -->
        <div class="pdf-footer">
          Generado por Agendify &middot; ${fechaGeneracion}
        </div>

        <style>
          * { box-sizing: border-box; }
          .pdf-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 16px; }
          .pdf-logo { font-size: 22px; font-weight: 800; color: #3b3f92; letter-spacing: -0.5px; }
          .pdf-header-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; font-size: 11px; color: #64748b; }
          .pdf-divider { border: none; border-top: 1px solid #e2e8f0; margin: 18px 0; }
          .pdf-section { margin-bottom: 22px; }
          .pdf-section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.7px; color: #3b3f92; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
          .pdf-count { font-size: 11px; font-weight: 500; background: #ede9fe; color: #5b21b6; padding: 2px 8px; border-radius: 999px; text-transform: none; letter-spacing: 0; }
          .pdf-patient-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 20px; }
          .pdf-data-item { display: flex; flex-direction: column; gap: 2px; }
          .pdf-data-item--full { grid-column: 1 / -1; }
          .pdf-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; color: #94a3b8; }
          .pdf-value { font-size: 13px; color: #0f172a; }
          .pdf-alerts { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 6px; }
          .pdf-alerts li { font-size: 12.5px; color: #92400e; background: #fef3c7; border: 1px solid #fde68a; padding: 6px 10px; border-radius: 6px; }
          .pdf-events { display: flex; flex-direction: column; gap: 12px; }
          .pdf-event { display: flex; gap: 12px; align-items: flex-start; }
          .pdf-event-dot { width: 10px; height: 10px; border-radius: 50%; margin-top: 4px; flex-shrink: 0; }
          .pdf-event-body { flex: 1; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; }
          .pdf-event-header { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; margin-bottom: 2px; }
          .pdf-event-label { font-size: 12px; font-weight: 700; }
          .pdf-event-date { font-size: 11px; color: #64748b; white-space: nowrap; }
          .pdf-event-desc { font-size: 12.5px; color: #334155; margin: 0 0 2px; }
          .pdf-event-detail { font-size: 11.5px; color: #64748b; margin: 2px 0 0; }
          .pdf-empty { font-size: 13px; color: #94a3b8; font-style: italic; }
          .pdf-footer { margin-top: 32px; font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 12px; }
        </style>
      </div>`;

    const element = document.createElement('div');
    element.innerHTML = html;
    document.body.appendChild(element);

    try {
      await html2pdf()
        .set({
          margin: [8, 10, 8, 10],
          filename: nombreArchivo,
          image: { type: 'jpeg', quality: 0.96 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(element)
        .save();
    } finally {
      document.body.removeChild(element);
      this.exportandoPDF = false;
    }
  }
  // ─── Editar ────────────────────────────────────────────────────────────────
  abrirEditarModal() {
    if (!this.paciente) return;
    this.formPaciente = { ...this.paciente };
    this.formErrores = {};
    this.alertasEditForm = [...(this.paciente.alertas ?? [])];
    this.alertaEditInput = '';
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
    const fieldsChanged = fields.some(k => this.formPaciente[k] !== (this.paciente as any)[k]);
    const alertasChanged = JSON.stringify(this.alertasEditForm) !== JSON.stringify(this.paciente.alertas ?? []);
    return fieldsChanged || alertasChanged;
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
        this.svc.update({ ...this.paciente!, ...this.formPaciente, alertas: [...this.alertasEditForm] });
        this.paciente = this.svc.getById(this.paciente!.id_paciente) ?? null;
        this.showEditarModal = false;
      }
    );
  }

  agregarAlertaEditar() {
    const t = this.alertaEditInput.trim();
    if (!t) return;
    this.alertasEditForm = [...this.alertasEditForm, t];
    this.alertaEditInput = '';
  }

  eliminarAlertaEditar(i: number) {
    this.alertasEditForm = this.alertasEditForm.filter((_, idx) => idx !== i);
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

  async verAdjunto(adjunto: AdjuntoMeta) {
    if (adjunto.previewUrl) {
      window.open(adjunto.previewUrl, '_blank');
    } else {
      const alert = await this.alertCtrl.create({
        header: 'Vista previa',
        message: `Vista previa no disponible para <strong>${adjunto.name}</strong>.<br><br>Este formato requiere una aplicación externa. Usa el botón de descarga para obtener el archivo.`,
        buttons: [{ text: 'Entendido', role: 'cancel' }],
        cssClass: 'agendify-alert',
      });
      await alert.present();
    }
  }

  async descargarAdjunto(adjunto: AdjuntoMeta) {
    if (adjunto.previewUrl) {
      const link = document.createElement('a');
      link.href = adjunto.previewUrl;
      link.download = adjunto.name;
      link.click();
    } else {
      const alert = await this.alertCtrl.create({
        header: 'Descarga simulada',
        message: `En producción, el archivo <strong>${adjunto.name}</strong> se descargaría desde el servidor. Esta es una vista de demostración.`,
        buttons: [{ text: 'Entendido', role: 'cancel' }],
        cssClass: 'agendify-alert',
      });
      await alert.present();
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
