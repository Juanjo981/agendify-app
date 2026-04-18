import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IonicModule, ToastController } from '@ionic/angular';
import { AgfDatePickerComponent } from '../../shared/components/agf-date-picker/agf-date-picker.component';
import { ActivatedRoute, Router } from '@angular/router';
import { PacientesApiService } from './pacientes-api.service';
import { AdjuntosServiceApi } from 'src/app/services/adjuntos.service.api';
import {
  PacienteDto, PacienteRequest, ResumenPacienteDto,
  ALERTA_TIPO_OPTIONS, AlertaPacienteDto, AlertaPacienteRequest,
  NOTA_CLINICA_TIPO_OPTIONS,
  NotaClinicaDto, NotaClinicaFormState, NotaClinicaRequest, NotaClinicaViewModel,
  SesionPacienteDto,
  HistorialPacienteResponse, HistorialEvento, HistorialTipoEvento,
  PACIENTE_SEXO_OPTIONS, SexoPaciente, isSexoPaciente, normalizeAlertaPacienteTipo, normalizeSexoPaciente,
  mapHistorialEventoApi,
} from './models/paciente.model';
import { ArchivoAdjuntoDto } from '../sesiones/models/sesion.model';
import { getAvatarColor as avatarColorUtil } from '../../shared/utils/avatar.utils';
import { formatFecha as formatFechaUtil } from '../../shared/utils/date.utils';
import { ConfirmDialogComponent, ConfirmDialogConfig } from '../../shared/confirm-dialog/confirm-dialog.component';
import { PacienteSubmenuComponent, SeccionPaciente } from './components/paciente-submenu/paciente-submenu.component';
import { mapApiError } from '../../shared/utils/api-error.mapper';
import html2pdf from 'html2pdf.js';
import { PacienteDetailRefreshService } from '../../shared/refresh/dashboard-module-refresh.services';

@Component({
  selector: 'app-paciente-detalle',
  templateUrl: './paciente-detalle.page.html',
  styleUrls: ['./paciente-detalle.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, ConfirmDialogComponent, PacienteSubmenuComponent, AgfDatePickerComponent],
})
export class PacienteDetallePage implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private static readonly MAX_NOTA_ADJUNTO_BYTES = 2 * 1024 * 1024;
  private static readonly LOADING_VISUAL_DELAY_MS = 180;
  private initialLoaderTimer?: ReturnType<typeof setTimeout>;
  readonly sexoOptions = PACIENTE_SEXO_OPTIONS;
  readonly alertaTipoOptions = ALERTA_TIPO_OPTIONS;
  readonly notaTipoOptions = NOTA_CLINICA_TIPO_OPTIONS;
  readonly skeletonCards = [0, 1, 2, 3];
  readonly skeletonLines = [0, 1, 2];
  paciente: PacienteDto | null = null;
  resumen: ResumenPacienteDto | null = null;

  // ─── Loading / error ───────────────────────────────────────────────────────
  loading = true;
  showInitialLoader = false;
  refreshingInformacion = false;
  errorMessage = '';
  saving = false;
  sectionTransitionKey = 0;

  // ─── Secciones ─────────────────────────────────────────────────────────────
  seccionActiva: SeccionPaciente = 'informacion';

  // ─── Alertas ───────────────────────────────────────────────────────────────
  alertas: AlertaPacienteDto[] = [];
  loadingAlertas = false;
  alertasLoaded = false;
  showAlertaForm = false;
  alertaForm = { tipo_alerta: normalizeAlertaPacienteTipo(), titulo: '', descripcion: '' };
  alertaEditandoId: number | null = null;
  alertaErrores: Record<string, string> = {};

  // ─── Notas clínicas ────────────────────────────────────────────────────────
  notas: NotaClinicaViewModel[] = [];
  loadingNotas = false;
  notasLoaded = false;
  totalNotas = 0;
  notasPage = 0;
  notasIsLastPage = true;

  showNotaModal = false;
  notaForm = this.emptyNotaForm();
  notaEditandoId: number | null = null;
  notaAdjuntosModal: ArchivoAdjuntoDto[] = [];
  notaError = '';

  // ─── Sesiones ──────────────────────────────────────────────────────────────
  sesiones: SesionPacienteDto[] = [];
  loadingSesiones = false;
  sesionesLoaded = false;
  totalSesiones = 0;
  sesionesPage = 0;
  sesionesIsLastPage = true;

  // ─── Historial ─────────────────────────────────────────────────────────────
  historial: HistorialPacienteResponse | null = null;
  historialEventos: HistorialEvento[] = [];
  loadingHistorial = false;
  historialLoaded = false;
  histBusqueda = '';
  histFiltroTipo: 'todos' | 'citas' | 'sesiones' | 'notas' | 'alertas' = 'todos';
  exportandoPDF = false;

  // ─── Edit modal ────────────────────────────────────────────────────────────
  showEditarModal = false;
  formPaciente = this.emptyForm();
  formErrores: Record<string, string> = {};
  showNotasGeneralesModal = false;
  notasGeneralesDraft = '';
  notasGeneralesError = '';
  savingNotasGenerales = false;

  // ─── Confirm dialog ────────────────────────────────────────────────────────
  confirmConfig: ConfirmDialogConfig | null = null;
  private confirmCallback: (() => void) | null = null;
  private pacienteId = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private svc: PacientesApiService,
    private adjuntosApi: AdjuntosServiceApi,
    private refresh: PacienteDetailRefreshService,
    private toastCtrl: ToastController,
  ) {
    this.destroyRef.onDestroy(() => this.clearInitialLoaderTimer());
  }

  async ngOnInit() {
    this.bindRefreshStreams();

    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(async params => {
        const id = Number(params.get('id'));
        if (!id || Number.isNaN(id)) return;
        this.pacienteId = id;
        this.notasLoaded = false;
        this.sesionesLoaded = false;
        this.historialLoaded = false;
        this.alertasLoaded = false;
        await this.cargarInformacionPaciente();
        if (this.seccionActiva !== 'informacion') {
          this.refresh.enterSection(this.seccionActiva);
        }
      });
  }

  async cargarPaciente(id: number) {
    const showShellLoader = !this.paciente || this.paciente.id_paciente !== id;
    if (showShellLoader) {
      this.loading = true;
      this.showInitialLoader = false;
      this.paciente = null;
      this.resumen = null;
      this.startInitialLoaderDelay();
    } else {
      this.refreshingInformacion = true;
    }
    this.errorMessage = '';
    try {
      const [paciente, resumen] = await Promise.all([
        this.svc.getById(id),
        this.svc.getResumen(id),
      ]);
      this.paciente = paciente;
      this.resumen = resumen;
      await this.cargarAlertas();
    } catch (err) {
      const mapped = mapApiError(err);
      this.errorMessage = mapped.userMessage;
    } finally {
      if (showShellLoader) {
        this.clearInitialLoaderTimer();
        this.showInitialLoader = false;
        this.loading = false;
      } else {
        this.refreshingInformacion = false;
      }
    }
  }

  volver() {
    this.router.navigate(['/dashboard/pacientes']);
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────
  emptyForm() {
    return {
      nombre: '', apellido: '', email: '', numero_telefono: '',
      fecha_nacimiento: '', notas_generales: '', sexo: '' as SexoPaciente | '',
      direccion: '', contacto_emergencia_nombre: '', contacto_emergencia_telefono: '',
    };
  }

  emptyNotaForm(): NotaClinicaFormState {
    return {
      id_paciente: this.paciente?.id_paciente ?? 0,
      titulo: '',
      contenido: '',
      tipo_nota: 'GENERAL',
      visible_en_resumen: false,
    };
  }

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
    return avatarColorUtil(this.paciente.nombre);
  }

  formatFecha(iso: string): string {
    return formatFechaUtil(iso);
  }

  formatFileSize(bytes?: number | null): string {
    const value = Number(bytes || 0);
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }

  getFileIcon(type?: string | null): string {
    if (!type) return 'attach-outline';
    if (type.startsWith('image/')) return 'image-outline';
    if (type === 'application/pdf') return 'document-outline';
    return 'document-text-outline';
  }

  get notasGeneralesResumen(): string {
    return (this.paciente?.notas_generales ?? '').trim();
  }

  get hasNotasGenerales(): boolean {
    return this.notasGeneralesResumen.length > 0;
  }

  editNotasGenerales() {
    if (!this.paciente) return;
    this.notasGeneralesDraft = this.paciente.notas_generales ?? '';
    this.notasGeneralesError = '';
    this.showNotasGeneralesModal = true;
  }

  cerrarNotasGeneralesModal() {
    if (this.savingNotasGenerales) return;
    this.showNotasGeneralesModal = false;
    this.notasGeneralesError = '';
  }

  async guardarNotasGenerales() {
    if (!this.paciente || this.savingNotasGenerales) return;
    this.savingNotasGenerales = true;
    this.notasGeneralesError = '';

    try {
      const pacienteActualizado = await this.svc.update(
        this.paciente.id_paciente,
        this.buildPacienteUpdateRequest({
          notas_generales: this.notasGeneralesDraft.trim() || undefined,
        }),
      );

      this.paciente = pacienteActualizado;
      if (this.resumen) {
        this.resumen = {
          ...this.resumen,
          notas_generales: pacienteActualizado.notas_generales ?? '',
          updated_at: pacienteActualizado.updated_at ?? this.resumen.updated_at,
        };
      }

      this.showNotasGeneralesModal = false;
    } catch (err) {
      const mapped = mapApiError(err);
      this.notasGeneralesError = mapped.fieldErrors?.['notas_generales'] ?? mapped.userMessage;
    } finally {
      this.savingNotasGenerales = false;
    }
  }

  async copiarNotasGenerales() {
    const contenido = this.notasGeneralesDraft.trim();
    if (!contenido) return;

    try {
      await navigator.clipboard.writeText(contenido);
      await this.presentToast('Notas copiadas');
    } catch {
      await this.presentToast('No fue posible copiar las notas.');
    }
  }

  async exportarNotasGeneralesTxt() {
    const contenido = this.notasGeneralesDraft.trim();
    if (!contenido) return;

    const nombrePaciente = [this.paciente?.nombre, this.paciente?.apellido]
      .filter(Boolean)
      .join('-')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');

    const fileName = `notas-generales-${nombrePaciente || 'paciente'}.txt`;
    const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(objectUrl);

    await this.presentToast('Archivo exportado');
  }

  get notaTieneAdjuntoExistente(): boolean {
    return this.notaAdjuntosModal.length > 0;
  }

  get notaTieneAdjuntoPendiente(): boolean {
    return !!this.notaForm.adjunto;
  }

  get puedeSeleccionarAdjuntoNota(): boolean {
    return !this.notaTieneAdjuntoExistente && !this.notaTieneAdjuntoPendiente;
  }

  // ─── Section switching with lazy load ──────────────────────────────────────
  setSeccion(sec: SeccionPaciente) {
    if (this.seccionActiva === sec) return;
    this.seccionActiva = sec;
    this.sectionTransitionKey++;
    this.refresh.enterSection(sec);
  }

  // ─── Alertas ───────────────────────────────────────────────────────────────
  async cargarAlertas() {
    if (!this.paciente) return;
    this.loadingAlertas = true;
    try {
      this.alertas = await this.svc.getAlertas(this.paciente.id_paciente);
      this.alertasLoaded = true;
    } catch { /* silent */ } finally {
      this.loadingAlertas = false;
    }
  }

  abrirAlertaForm(alerta?: AlertaPacienteDto) {
    this.alertaForm = {
      tipo_alerta: normalizeAlertaPacienteTipo(alerta?.tipo_alerta),
      titulo: alerta?.titulo ?? '',
      descripcion: alerta?.descripcion ?? '',
    };
    this.alertaErrores = {};
    this.alertaEditandoId = alerta?.id_alerta_paciente ?? null;
    this.showAlertaForm = true;
  }

  cerrarAlertaForm() {
    this.showAlertaForm = false;
    this.alertaEditandoId = null;
    this.alertaErrores = {};
  }

  get canGuardarAlerta(): boolean {
    return !!this.alertaForm.titulo.trim() && !!this.alertaForm.descripcion.trim() && !this.alertaErrores['tipo_alerta'];
  }

  onAlertaDescripcionChange(value: string) {
    this.alertaForm.descripcion = value;
    if (value.trim()) {
      delete this.alertaErrores['descripcion'];
    }
  }

  onAlertaTipoChange(value: string) {
    this.alertaForm.tipo_alerta = normalizeAlertaPacienteTipo(value);
    delete this.alertaErrores['tipo_alerta'];
  }

  private validarAlertaForm(): boolean {
    this.alertaErrores = {};

    if (!this.alertaTipoOptions.some(option => option.value === this.alertaForm.tipo_alerta)) {
      this.alertaErrores['tipo_alerta'] = 'Selecciona un tipo de alerta válido';
    }

    if (!this.alertaForm.descripcion.trim()) {
      this.alertaErrores['descripcion'] = 'La descripción es obligatoria';
    }

    return Object.keys(this.alertaErrores).length === 0;
  }

  async guardarAlerta() {
    if (!this.paciente || !this.alertaForm.titulo.trim() || !this.validarAlertaForm()) return;
    this.saving = true;
    try {
      const body: AlertaPacienteRequest = {
        tipo_alerta: this.alertaForm.tipo_alerta,
        titulo: this.alertaForm.titulo.trim(),
        descripcion: this.alertaForm.descripcion.trim(),
      };
      if (this.alertaEditandoId) {
        await this.svc.updateAlerta(this.paciente.id_paciente, this.alertaEditandoId, body);
      } else {
        await this.svc.createAlerta(this.paciente.id_paciente, body);
      }
      this.showAlertaForm = false;
      this.alertaEditandoId = null;
      this.refresh.requestRefresh('informacion');
      if (this.seccionActiva === 'historial') {
        this.refresh.requestRefresh('historial');
      }
    } catch (err) {
      const mapped = mapApiError(err);
      if (mapped.fieldErrors?.['tipo_alerta']) {
        this.alertaErrores['tipo_alerta'] = 'Selecciona un tipo de alerta válido';
      }
      if (mapped.fieldErrors?.['descripcion']) {
        this.alertaErrores['descripcion'] = mapped.fieldErrors['descripcion'];
      }
      this.errorMessage = mapped.userMessage;
    } finally {
      this.saving = false;
    }
  }

  async toggleAlerta(alerta: AlertaPacienteDto) {
    if (!this.paciente) return;
    try {
      await this.svc.toggleAlerta(this.paciente.id_paciente, alerta.id_alerta_paciente, !alerta.activa);
      this.refresh.requestRefresh('informacion');
      if (this.seccionActiva === 'historial') {
        this.refresh.requestRefresh('historial');
      }
    } catch (err) {
      const mapped = mapApiError(err);
      this.errorMessage = mapped.userMessage;
    }
  }

  confirmarEliminarAlerta(alerta: AlertaPacienteDto) {
    this.openConfirm(
      {
        title: 'Eliminar alerta',
        message: `¿Deseas eliminar la alerta "${alerta.titulo}"?`,
        confirmLabel: 'Eliminar',
        variant: 'danger',
        icon: 'trash-outline',
      },
      async () => {
        try {
          await this.svc.deleteAlerta(this.paciente!.id_paciente, alerta.id_alerta_paciente);
          this.refresh.requestRefresh('informacion');
          if (this.seccionActiva === 'historial') {
            this.refresh.requestRefresh('historial');
          }
        } catch (err) {
          const mapped = mapApiError(err);
          this.errorMessage = mapped.userMessage;
        }
      }
    );
  }

  // ─── Notas clínicas ───────────────────────────────────────────────────────
  async cargarNotas(reset = true) {
    if (!this.paciente) return;
    if (reset) {
      this.notasPage = 0;
      this.loadingNotas = true;
    }
    try {
      const page = await this.svc.getNotasByPaciente(this.paciente.id_paciente, {
        page: this.notasPage,
        size: 20,
      });
      const notasPage = page.content.map(nota => this.createNotaViewModel(nota));
      if (reset) {
        this.notas = notasPage;
      } else {
        this.notas = [...this.notas, ...notasPage];
      }
      this.totalNotas = page.total_elements;
      this.notasIsLastPage = page.last;
      this.notasLoaded = true;
      await this.cargarAdjuntosNotas(notasPage);
    } catch { /* silent */ } finally {
      this.loadingNotas = false;
    }
  }

  cargarMasNotas() {
    if (this.notasIsLastPage) return;
    this.notasPage++;
    this.cargarNotas(false);
  }

  abrirNotaModal(nota?: NotaClinicaViewModel) {
    this.notaForm = {
      id_paciente: nota?.id_paciente ?? this.paciente?.id_paciente ?? 0,
      id_sesion: nota?.id_sesion ?? null,
      titulo: nota?.titulo ?? '',
      contenido: nota?.contenido ?? '',
      tipo_nota: nota?.tipo_nota ?? 'GENERAL',
      visible_en_resumen: nota?.visible_en_resumen ?? false,
    };
    this.notaEditandoId = nota?.id_nota_clinica ?? null;
    this.notaAdjuntosModal = [...(nota?.adjuntos ?? [])];
    this.notaError = '';
    this.showNotaModal = true;
  }

  cerrarNotaModal() {
    if (this.notaForm.titulo.trim() || this.notaForm.contenido.trim() || this.notaForm.adjunto) {
      this.openConfirm(
        {
          title: 'Descartar nota',
          message: 'Tienes cambios sin guardar. ¿Deseas salir sin guardar?',
          confirmLabel: 'Salir sin guardar',
          cancelLabel: 'Seguir editando',
          variant: 'danger',
          icon: 'alert-circle-outline',
        },
        () => { this.resetNotaModal(); }
      );
      return;
    }
    this.resetNotaModal();
  }

  async guardarNota() {
    if (!this.paciente) return;
    if (!this.notaForm.contenido.trim()) {
      this.notaError = 'El contenido es requerido.';
      return;
    }
    if (this.notaTieneAdjuntoExistente && this.notaForm.adjunto) {
      this.notaError = 'Esta nota ya tiene un archivo adjunto. Elimina el actual para subir otro.';
      return;
    }
    this.saving = true;
    try {
      let notaGuardada: NotaClinicaDto;
      if (this.notaEditandoId) {
        notaGuardada = await this.svc.updateNota(this.notaEditandoId, {
          id_paciente: this.paciente.id_paciente,
          id_sesion: this.notaForm.id_sesion ?? null,
          titulo: this.notaForm.titulo.trim(),
          contenido: this.notaForm.contenido.trim(),
          tipo_nota: this.notaForm.tipo_nota,
          visible_en_resumen: this.notaForm.visible_en_resumen,
        });
      } else {
        notaGuardada = await this.svc.createNota({
          id_paciente: this.paciente.id_paciente,
          id_sesion: this.notaForm.id_sesion ?? null,
          titulo: this.notaForm.titulo.trim(),
          contenido: this.notaForm.contenido.trim(),
          tipo_nota: this.notaForm.tipo_nota,
          visible_en_resumen: this.notaForm.visible_en_resumen,
        });
      }

      if (this.notaForm.adjunto) {
        try {
          await this.adjuntosApi.uploadToEntidad('NOTA_CLINICA', notaGuardada.id_nota_clinica, this.notaForm.adjunto);
        } catch (err) {
          const mapped = mapApiError(err);
          this.notaEditandoId = notaGuardada.id_nota_clinica;
          this.notaAdjuntosModal = await this.obtenerAdjuntosNota(notaGuardada.id_nota_clinica);
          this.notaError = `La nota se guardó, pero no se pudo subir el adjunto. ${mapped.userMessage}`;
          await this.cargarNotas();
          return;
        }
      }

      this.resetNotaModal();
      this.refresh.requestRefresh('notas');
      if (this.seccionActiva === 'informacion') {
        this.refresh.requestRefresh('informacion');
      }
      if (this.seccionActiva === 'historial') {
        this.refresh.requestRefresh('historial');
      }
    } catch (err) {
      const mapped = mapApiError(err);
      this.notaError = mapped.userMessage;
    } finally {
      this.saving = false;
    }
  }

  confirmarEliminarNota(nota: NotaClinicaDto) {
    this.openConfirm(
      {
        title: 'Eliminar nota',
        message: '¿Deseas eliminar esta nota clínica?',
        confirmLabel: 'Eliminar',
        variant: 'danger',
        icon: 'trash-outline',
      },
      async () => {
        try {
          await this.svc.deleteNota(nota.id_nota_clinica);
          this.refresh.requestRefresh('notas');
          if (this.seccionActiva === 'informacion') {
            this.refresh.requestRefresh('informacion');
          }
          if (this.seccionActiva === 'historial') {
            this.refresh.requestRefresh('historial');
          }
        } catch (err) {
          const mapped = mapApiError(err);
          this.errorMessage = mapped.userMessage;
        }
      }
    );
  }

  onNotaAdjuntoSeleccionado(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (this.notaTieneAdjuntoExistente) {
      this.notaError = 'Esta nota ya tiene un archivo adjunto. Elimina el actual para subir otro.';
      input.value = '';
      return;
    }

    if (file.size > PacienteDetallePage.MAX_NOTA_ADJUNTO_BYTES) {
      this.notaError = 'El archivo supera el tamaño máximo permitido de 2 MB.';
      input.value = '';
      return;
    }

    this.removerAdjuntoPendiente();
    const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
    this.notaForm.adjunto = {
      file,
      name: file.name,
      type: file.type,
      size: file.size,
      previewUrl,
    };
    this.notaError = '';
    input.value = '';
  }

  removerAdjuntoPendiente() {
    if (this.notaForm.adjunto?.previewUrl) {
      URL.revokeObjectURL(this.notaForm.adjunto.previewUrl);
    }
    this.notaForm.adjunto = undefined;
    this.notaError = '';
  }

  async verAdjunto(adjunto: ArchivoAdjuntoDto) {
    try {
      const response = await this.adjuntosApi.getDownloadUrl(adjunto.id_archivo_adjunto);
      window.open(response.download_url, '_blank', 'noopener');
    } catch (err) {
      this.notaError = mapApiError(err).userMessage;
    }
  }

  async descargarAdjunto(adjunto: ArchivoAdjuntoDto) {
    try {
      const response = await this.adjuntosApi.getDownloadUrl(adjunto.id_archivo_adjunto);
      const link = document.createElement('a');
      link.href = response.download_url;
      link.download = response.nombre_original || adjunto.nombre_original;
      link.target = '_blank';
      link.rel = 'noopener';
      link.click();
    } catch (err) {
      this.notaError = mapApiError(err).userMessage;
    }
  }

  eliminarAdjuntoNota(nota: NotaClinicaViewModel, adjunto: ArchivoAdjuntoDto) {
    this.openConfirm(
      {
        title: 'Eliminar adjunto',
        message: `Se marcará como inactivo "${adjunto.nombre_original}".`,
        confirmLabel: 'Eliminar',
        variant: 'danger',
        icon: 'trash-outline',
      },
      async () => {
        try {
          await this.adjuntosApi.delete(adjunto.id_archivo_adjunto);
          const adjuntosActualizados = await this.obtenerAdjuntosNota(nota.id_nota_clinica);
          this.actualizarAdjuntosNota(nota.id_nota_clinica, adjuntosActualizados);
          if (this.notaEditandoId === nota.id_nota_clinica) {
            this.notaAdjuntosModal = [...adjuntosActualizados];
            this.notaError = '';
          }
        } catch (err) {
          this.notaError = mapApiError(err).userMessage;
        }
      }
    );
  }

  eliminarAdjuntoNotaModal(adjunto: ArchivoAdjuntoDto) {
    if (!this.notaEditandoId) return;

    this.eliminarAdjuntoNota(
      {
        ...this.createNotaViewModel({
          id_nota_clinica: this.notaEditandoId,
          id_paciente: this.paciente?.id_paciente ?? this.notaForm.id_paciente,
          id_sesion: this.notaForm.id_sesion ?? null,
          titulo: this.notaForm.titulo,
          contenido: this.notaForm.contenido,
          tipo_nota: this.notaForm.tipo_nota,
          visible_en_resumen: this.notaForm.visible_en_resumen,
          created_at: '',
        }),
        adjuntos: [...this.notaAdjuntosModal],
      },
      adjunto
    );
  }

  // ─── Sesiones ──────────────────────────────────────────────────────────────
  async cargarSesiones(reset = true) {
    if (!this.paciente) return;
    if (reset) {
      this.sesionesPage = 0;
      this.loadingSesiones = true;
    }
    try {
      const page = await this.svc.getSesionesByPaciente(this.paciente.id_paciente, {
        page: this.sesionesPage,
        size: 20,
      });
      if (reset) {
        this.sesiones = page.content;
      } else {
        this.sesiones = [...this.sesiones, ...page.content];
      }
      this.totalSesiones = page.total_elements;
      this.sesionesIsLastPage = page.last;
      this.sesionesLoaded = true;
    } catch { /* silent */ } finally {
      this.loadingSesiones = false;
    }
  }

  cargarMasSesiones() {
    if (this.sesionesIsLastPage) return;
    this.sesionesPage++;
    this.cargarSesiones(false);
  }

  // ─── Historial ─────────────────────────────────────────────────────────────
  async cargarHistorial() {
    if (!this.paciente) return;
    this.loadingHistorial = true;
    try {
      this.historial = await this.svc.getHistorial(this.paciente.id_paciente);
      this.historialEventos = this.historial.eventos.map(mapHistorialEventoApi);
      this.historialLoaded = true;
    } catch { /* silent */ } finally {
      this.loadingHistorial = false;
    }
  }

  get historialFiltrado(): HistorialEvento[] {
    let eventos = [...this.historialEventos];
    if (this.histFiltroTipo === 'citas') {
      eventos = eventos.filter(ev => ev.tipo === 'CITA');
    } else if (this.histFiltroTipo === 'sesiones') {
      eventos = eventos.filter(ev => ev.tipo === 'SESION');
    } else if (this.histFiltroTipo === 'notas') {
      eventos = eventos.filter(ev => ev.tipo === 'NOTA');
    } else if (this.histFiltroTipo === 'alertas') {
      eventos = eventos.filter(ev => ev.tipo === 'ALERTA');
    }
    const q = this.histBusqueda.trim().toLowerCase();
    if (q) {
      eventos = eventos.filter(ev =>
        ev.descripcion.toLowerCase().includes(q) ||
        (ev.detalle ?? '').toLowerCase().includes(q) ||
        this.getEventoLabel(ev.tipo).toLowerCase().includes(q)
      );
    }
    return eventos;
  }

  getEventoIcon(tipo: HistorialTipoEvento): string {
    const map: Record<string, string> = {
      CITA:   'calendar-outline',
      SESION: 'pulse-outline',
      NOTA:   'document-text-outline',
      ALERTA: 'warning-outline',
      OTRO:   'ellipse-outline',
    };
    return map[tipo] ?? 'ellipse-outline';
  }

  getEventoLabel(tipo: HistorialTipoEvento): string {
    const map: Record<string, string> = {
      CITA:   'CITA',
      SESION: 'SESION',
      NOTA:   'NOTA',
      ALERTA: 'ALERTA',
      OTRO:   'OTRO',
    };
    return map[tipo] ?? tipo;
  }

  getEventoColorClass(tipo: HistorialTipoEvento): string {
    const map: Record<string, string> = {
      CITA:   'ev--blue',
      SESION: 'ev--purple',
      NOTA:   'ev--slate',
      ALERTA: 'ev--yellow',
      OTRO:   'ev--slate',
    };
    return map[tipo] ?? 'ev--slate';
  }

  // ─── Exportar PDF ──────────────────────────────────────────────────────────
  async exportarHistorialPDF() {
    if (!this.paciente || this.exportandoPDF) return;
    this.exportandoPDF = true;

    const p = this.paciente;
    const eventos = this.historialFiltrado;
    const edad = p.fecha_nacimiento ? this.calcularEdad(p.fecha_nacimiento) : null;
    const fechaNac = p.fecha_nacimiento ? this.formatFecha(p.fecha_nacimiento) : '—';
    const nombreArchivo = `historial-${(p.nombre + '-' + p.apellido).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '')}.pdf`;
    const fechaGeneracion = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });

    const alertasActivas = this.alertas.filter(a => a.activa);
    const alertasHTML = alertasActivas.length > 0
      ? `<div class="pdf-section">
          <div class="pdf-section-title">Alertas cl\u00ednicas</div>
          <ul class="pdf-alerts">${alertasActivas.map(a => `<li>&#9888;&#xFE0E; ${a.titulo}${a.descripcion ? ': ' + a.descripcion : ''}</li>`).join('')}</ul>
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
        <div class="pdf-header">
          <div class="pdf-logo">Agendify</div>
          <div class="pdf-header-meta">
            <span>Historial cl\u00ednico</span>
            <span>${fechaGeneracion}</span>
          </div>
        </div>
        <hr class="pdf-divider" />
        <div class="pdf-section">
          <div class="pdf-section-title">Informaci\u00f3n del paciente</div>
          <div class="pdf-patient-grid">
            <div class="pdf-data-item"><span class="pdf-label">Nombre completo</span><span class="pdf-value">${p.nombre} ${p.apellido}</span></div>
            ${edad !== null ? `<div class="pdf-data-item"><span class="pdf-label">Edad</span><span class="pdf-value">${edad} a\u00f1os</span></div>` : ''}
            ${p.email ? `<div class="pdf-data-item"><span class="pdf-label">Email</span><span class="pdf-value">${p.email}</span></div>` : ''}
            ${p.numero_telefono ? `<div class="pdf-data-item"><span class="pdf-label">Tel\u00e9fono</span><span class="pdf-value">${p.numero_telefono}</span></div>` : ''}
            ${p.fecha_nacimiento ? `<div class="pdf-data-item"><span class="pdf-label">Fecha de nacimiento</span><span class="pdf-value">${fechaNac}</span></div>` : ''}
            ${p.notas_generales ? `<div class="pdf-data-item pdf-data-item--full"><span class="pdf-label">Notas generales</span><span class="pdf-value">${p.notas_generales}</span></div>` : ''}
          </div>
        </div>
        ${alertasHTML}
        <hr class="pdf-divider" />
        <div class="pdf-section">
          <div class="pdf-section-title">Historial cronol\u00f3gico
            <span class="pdf-count">${eventos.length} evento${eventos.length !== 1 ? 's' : ''}</span>
          </div>
          ${eventos.length > 0 ? `<div class="pdf-events">${eventosHTML}</div>` : '<p class="pdf-empty">Sin eventos registrados.</p>'}
        </div>
        <div class="pdf-footer">Generado por Agendify &middot; ${fechaGeneracion}</div>
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

  // ─── Editar paciente ───────────────────────────────────────────────────────
  abrirEditarModal() {
    if (!this.paciente) return;
    this.formPaciente = {
      nombre: this.paciente.nombre,
      apellido: this.paciente.apellido,
      email: this.paciente.email ?? '',
      numero_telefono: this.paciente.numero_telefono ?? '',
      fecha_nacimiento: this.paciente.fecha_nacimiento ?? '',
      notas_generales: this.paciente.notas_generales ?? '',
      sexo: normalizeSexoPaciente(this.paciente.sexo),
      direccion: this.paciente.direccion ?? '',
      contacto_emergencia_nombre: this.paciente.contacto_emergencia_nombre ?? '',
      contacto_emergencia_telefono: this.paciente.contacto_emergencia_telefono ?? '',
    };
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
    const p = this.paciente;
    return this.formPaciente.nombre !== p.nombre
      || this.formPaciente.apellido !== p.apellido
      || this.formPaciente.email !== (p.email ?? '')
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
    if (!this.formPaciente.nombre?.trim()) this.formErrores['nombre'] = 'El nombre es requerido';
    if (!this.formPaciente.apellido?.trim()) this.formErrores['apellido'] = 'El apellido es requerido';
    if (this.formPaciente.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.formPaciente.email)) {
      this.formErrores['email'] = 'Formato de email inválido';
    }
    if (this.formPaciente.sexo && !isSexoPaciente(this.formPaciente.sexo)) {
      this.formErrores['sexo'] = 'Selecciona una opción válida';
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
      () => this.ejecutarGuardarEdicion()
    );
  }

  private async ejecutarGuardarEdicion() {
    if (!this.paciente) return;
    this.saving = true;
    this.formErrores = {};
    const body = this.buildPacienteUpdateRequest({
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
    });

    try {
      this.paciente = await this.svc.update(this.paciente.id_paciente, body);
      this.resumen = await this.svc.getResumen(this.paciente.id_paciente);
      this.showEditarModal = false;
      this.refresh.requestRefresh('informacion');
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

  private buildPacienteUpdateRequest(overrides: Partial<PacienteRequest> = {}): PacienteRequest {
    if (!this.paciente) {
      return {
        nombre: overrides.nombre ?? '',
        apellido: overrides.apellido ?? '',
        ...overrides,
      };
    }

    const hasOverride = <K extends keyof PacienteRequest>(key: K) =>
      Object.prototype.hasOwnProperty.call(overrides, key);

    return {
      nombre: hasOverride('nombre') ? overrides.nombre ?? '' : this.paciente.nombre.trim(),
      apellido: hasOverride('apellido') ? overrides.apellido ?? '' : this.paciente.apellido.trim(),
      email: hasOverride('email') ? overrides.email : this.paciente.email?.trim() || undefined,
      numero_telefono: hasOverride('numero_telefono') ? overrides.numero_telefono : this.paciente.numero_telefono?.trim() || undefined,
      fecha_nacimiento: hasOverride('fecha_nacimiento') ? overrides.fecha_nacimiento : this.paciente.fecha_nacimiento || undefined,
      notas_generales: hasOverride('notas_generales') ? overrides.notas_generales : this.paciente.notas_generales?.trim() || undefined,
      sexo: hasOverride('sexo') ? overrides.sexo : normalizeSexoPaciente(this.paciente.sexo) || undefined,
      direccion: hasOverride('direccion') ? overrides.direccion : this.paciente.direccion?.trim() || undefined,
      contacto_emergencia_nombre: hasOverride('contacto_emergencia_nombre') ? overrides.contacto_emergencia_nombre : this.paciente.contacto_emergencia_nombre?.trim() || undefined,
      contacto_emergencia_telefono: hasOverride('contacto_emergencia_telefono') ? overrides.contacto_emergencia_telefono : this.paciente.contacto_emergencia_telefono?.trim() || undefined,
    };
  }

  private async presentToast(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 1800,
      position: 'bottom',
      color: 'dark',
    });
    await toast.present();
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

  private createNotaViewModel(nota: NotaClinicaDto): NotaClinicaViewModel {
    return {
      ...nota,
      adjuntos: nota.adjuntos ?? [],
      adjuntosLoading: false,
    };
  }

  private async cargarAdjuntosNotas(notas: NotaClinicaViewModel[]) {
    if (!notas.length) return;

    notas.forEach(nota => { nota.adjuntosLoading = true; });

    const adjuntosPorNota = await Promise.all(
      notas.map(async nota => ({
        notaId: nota.id_nota_clinica,
        adjuntos: await this.obtenerAdjuntosNota(nota.id_nota_clinica),
      }))
    );

    adjuntosPorNota.forEach(({ notaId, adjuntos }) => {
      this.actualizarAdjuntosNota(notaId, adjuntos);
    });
  }

  private async obtenerAdjuntosNota(notaId: number): Promise<ArchivoAdjuntoDto[]> {
    try {
      const page = await this.adjuntosApi.getByNotaClinicaId(notaId, { size: 50 });
      return page.content ?? [];
    } catch {
      return [];
    }
  }

  private actualizarAdjuntosNota(notaId: number, adjuntos: ArchivoAdjuntoDto[]) {
    this.notas = this.notas.map(nota =>
      nota.id_nota_clinica === notaId
        ? { ...nota, adjuntos, adjuntosLoading: false }
        : nota
    );
  }

  private resetNotaModal() {
    this.removerAdjuntoPendiente();
    this.showNotaModal = false;
    this.notaEditandoId = null;
    this.notaAdjuntosModal = [];
    this.notaError = '';
    this.notaForm = this.emptyNotaForm();
  }

  private bindRefreshStreams() {
    this.refresh.watchSection('informacion')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => {
        if (event.reason === 'request') {
          void this.cargarInformacionPaciente();
        }
      });

    this.refresh.watchSection('notas')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => {
        if (event.reason === 'request' || !this.notasLoaded) {
          void this.cargarNotas();
        }
      });

    this.refresh.watchSection('sesiones')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => {
        if (event.reason === 'request' || !this.sesionesLoaded) {
          void this.cargarSesiones();
        }
      });

    this.refresh.watchSection('historial')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => {
        if (event.reason === 'request' || !this.historialLoaded) {
          void this.cargarHistorial();
        }
      });
  }

  private async cargarInformacionPaciente() {
    if (!this.pacienteId) return;
    await this.cargarPaciente(this.pacienteId);
  }

  private startInitialLoaderDelay() {
    this.clearInitialLoaderTimer();
    this.initialLoaderTimer = setTimeout(() => {
      if (this.loading && !this.paciente) {
        this.showInitialLoader = true;
      }
    }, PacienteDetallePage.LOADING_VISUAL_DELAY_MS);
  }

  private clearInitialLoaderTimer() {
    if (this.initialLoaderTimer) {
      clearTimeout(this.initialLoaderTimer);
      this.initialLoaderTimer = undefined;
    }
  }
}

