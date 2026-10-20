import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { PlantillaRecetasApiService } from 'src/app/services/plantilla-recetas-api.service';
import { RecetasApiService } from 'src/app/services/recetas-api.service';
import {
  PlantillaRecetasConfigDto,
  PrescriptionProfessionalData,
  createDefaultPlantillaConfig,
  mergeProfesionalIntoConfig,
  normalizePlantillaConfig,
} from 'src/app/shared/models/plantilla-recetas.models';
import {
  RECETA_NOMBRE_MAX_LENGTH,
  RecetaDetalle,
  RecetaEstado,
  RecetaModalModo,
  RecetaVersionResumen,
  buildRecetaVersionHistorial,
  createInitialRecetasUiState,
  modoDesdeEstado,
} from 'src/app/shared/models/recetas.models';
import { PacienteDto } from '../../models/paciente.model';
import {
  RecetaContenidoDinamico,
  RecetaPreviewData,
  createEmptyRecetaContenido,
  createEmptyRecetaPreviewData,
} from './receta-contenido.models';
import { RecetaSheetPreviewComponent } from './receta-sheet-preview.component';
import { mapRecetaApiError } from 'src/app/shared/utils/api-error.mapper';
import {
  contenidoPreviewToFormModel,
  detalleToFormModel,
  formModelToContenidoPreview,
  toActualizarRecetaRequest,
  toCopiarRecetaRequest,
  toCrearRecetaRequest,
  toCrearVersionRecetaRequest,
} from 'src/app/shared/utils/receta-form.adapters';
import {
  formatDisplayDate,
  formatDisplayTime,
  formatLocalDate,
  todayLocalDate,
} from 'src/app/shared/utils/local-date.utils';
import {
  ConfirmDialogComponent,
  ConfirmDialogConfig,
} from 'src/app/shared/confirm-dialog/confirm-dialog.component';
import {
  RECETA_PDF_MESSAGES,
  openSignedPdfInNewTab,
} from 'src/app/shared/utils/receta-pdf-access.utils';

export type RecetaPdfAction = 'abrir' | 'imprimir' | 'descargar' | `version-${number}-abrir` | `version-${number}-descargar`;

export type NuevaRecetaVistaMovil = 'datos' | 'preview';

export interface RecetaPanelCambioEvent {
  detalle: RecetaDetalle;
  accion: 'creada' | 'actualizada' | 'emitida' | 'versionada' | 'copiada';
}

export type RecetaDialogoActivo =
  | 'ninguno'
  | 'decision_guardar'
  | 'copiar'
  | 'conflicto_version'
  | 'descartar_cambios';

@Component({
  selector: 'app-nueva-receta-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RecetaSheetPreviewComponent,
    ConfirmDialogComponent,
  ],
  templateUrl: './nueva-receta-panel.component.html',
  styleUrls: ['./nueva-receta-panel.component.scss'],
})
export class NuevaRecetaPanelComponent implements OnInit, OnChanges, OnDestroy {
  @Input() abierto = false;
  @Input() paciente: PacienteDto | null = null;
  /** Modo del panel. Por defecto CREAR. */
  @Input() modo: RecetaModalModo = 'CREAR';
  /** Si hay id, se carga el detalle al abrir. */
  @Input() idReceta: number | null = null;
  /** Acción diferida tras cargar detalle (p. ej. abrir diálogo de copia). */
  @Input() accionInicial: 'ninguna' | 'copiar' = 'ninguna';

  @Output() cerrado = new EventEmitter<void>();
  @Output() cambiosGuardados = new EventEmitter<RecetaPanelCambioEvent>();

  vistaMovil: NuevaRecetaVistaMovil = 'datos';

  cargandoPlantilla = false;
  cargandoDetalle = false;
  errorPlantilla = '';
  errorForm = '';
  fieldErrors: Record<string, boolean> = {};
  esPredeterminada = true;
  config: PlantillaRecetasConfigDto = createDefaultPlantillaConfig();
  /** Modelo editable del formulario: fechas en ISO (lo que viaja al backend). */
  contenido: RecetaContenidoDinamico = createEmptyRecetaContenido();
  /** Modelo de solo lectura de la vista previa: siempre una referencia nueva. */
  datosVistaPrevia: RecetaPreviewData = createEmptyRecetaPreviewData();
  /**
   * Clave de remount del hijo de vista previa. Se incrementa al terminar de
   * cargar una receta existente para recrear la hoja ya con datos (evita que
   * queden placeholders del primer render vacío).
   */
  previewMountKey = 0;
  /** Receta consultada tal como llegó del backend (base para restaurar). */
  recetaSeleccionada: RecetaDetalle | null = null;

  /**
   * Identidad y URLs firmadas resueltas en vivo (nunca se persisten). Se
   * reaplican sobre el snapshot cada vez que se vuelve a cargar el detalle.
   */
  private previewProfesional: PrescriptionProfessionalData | null = null;
  private previewLogoUrl: string | null = null;
  private previewFirmaUrl: string | null = null;
  private previewSelloUrl: string | null = null;

  /** Nombre interno de la receta (requerido por API; no es UI de preview). */
  nombreReceta = '';
  notasInternas = '';
  idPlantillaReceta: number | null = null;

  /** Estado persistido tras crear/cargar. */
  idRecetaActual: number | null = null;
  estadoActual: RecetaEstado | null = null;
  versionActual = 0;
  tienePdf = false;
  nombreArchivoActual: string | null = null;
  ultimaEmisionAt: string | null = null;

  /** Loading solo de la acción PDF activa (no bloquea Cerrar). */
  pdfActionLoading: RecetaPdfAction | null = null;

  historialExpandido = false;
  historialVersiones: RecetaVersionResumen[] = [];

  ui = createInitialRecetasUiState();
  formDirty = false;

  /**
   * Bloqueo explícito de reentrada para POST /versiones.
   * Se activa de inmediato (antes de await) para que un doble clic no dispare
   * dos requests concurrentes que el backend resuelve con 409.
   */
  readonly guardandoVersion = signal(false);

  /**
   * Tras un 409 + “Seguir editando”: la UI conserva cambios locales pero la
   * base remota puede estar adelantada. El próximo guardado reabre el conflicto
   * en lugar de reenviar a ciegas (evita bucle de 409).
   */
  conflictoVersionPendiente = false;

  /** Overlays locales (decisión / copia / conflicto). */
  dialogoActivo: RecetaDialogoActivo = 'ninguno';

  copiaNombre = '';
  copiaFechaEmision = '';
  copiaNotasInternas = false;
  copiaNombreError = '';

  /** Id de la receta original al trabajar sobre una copia (solo UI). */
  idRecetaOrigen: number | null = null;

  /** Snapshot en memoria ante 409 (no localStorage). */
  formularioLocalBackup: {
    nombreReceta: string;
    notasInternas: string;
    contenido: RecetaContenidoDinamico;
  } | null = null;

  confirmConfig: ConfirmDialogConfig | null = null;
  private confirmCallback: (() => void) | null = null;
  /** Evita abrir dos confirmaciones de emisión en paralelo. */
  readonly confirmacionEmisionAbierta = signal(false);
  private emitFocusRestoreEl: HTMLElement | null = null;
  private bodyOverflowPrev = '';
  private initToken = 0;
  private modoAntesCopia: RecetaModalModo | null = null;

  /** Portal móvil (≤480px): el host se mueve bajo body para salir de ion-page. */
  private mobilePortalActive = false;
  private portalHomeParent: Node | null = null;
  private portalHomeNextSibling: ChildNode | null = null;

  private readonly hostEl = inject(ElementRef<HTMLElement>);
  private readonly plantillaApi = inject(PlantillaRecetasApiService);
  private readonly recetasApi = inject(RecetasApiService);
  private readonly router = inject(Router);
  private readonly toastCtrl = inject(ToastController);
  private readonly cdr = inject(ChangeDetectorRef);

  get tituloPanel(): string {
    switch (this.modo) {
      case 'CREAR':
        return 'Nueva receta';
      case 'EDITAR_BORRADOR':
        return 'Editar borrador';
      case 'VER_EMITIDA':
        return 'Receta emitida';
      case 'EDITAR_EMITIDA':
        return 'Editar receta emitida';
      case 'CREAR_COPIA':
        return 'Guardar como copia';
      case 'VER_ANULADA':
        return 'Receta anulada';
      default:
        return 'Receta';
    }
  }

  get etiquetaGuardarBorrador(): string {
    return this.modo === 'EDITAR_BORRADOR' ? 'Guardar cambios' : 'Guardar receta';
  }

  get camposEditables(): boolean {
    return (
      this.modo === 'CREAR' ||
      this.modo === 'EDITAR_BORRADOR' ||
      this.modo === 'EDITAR_EMITIDA'
    );
  }

  get puedeGuardarBorrador(): boolean {
    return this.modo === 'CREAR' || this.modo === 'EDITAR_BORRADOR';
  }

  get puedeGuardarEmitida(): boolean {
    return this.modo === 'EDITAR_EMITIDA' && this.estadoActual === 'EMITIDA';
  }

  get puedeCancelarEdicion(): boolean {
    return this.modo === 'EDITAR_EMITIDA' && !!this.recetaSeleccionada;
  }

  get puedeIniciarCopia(): boolean {
    return (
      !!this.idRecetaActual &&
      (this.estadoActual === 'EMITIDA' || this.estadoActual === 'ANULADA') &&
      (this.modo === 'VER_EMITIDA' ||
        this.modo === 'EDITAR_EMITIDA' ||
        this.modo === 'VER_ANULADA')
    );
  }

  get puedeEmitir(): boolean {
    return (
      !!this.idRecetaActual &&
      this.estadoActual === 'BORRADOR' &&
      (this.modo === 'EDITAR_BORRADOR' || this.modo === 'CREAR')
    );
  }

  get puedeAbrirPdf(): boolean {
    return (
      this.tienePdf &&
      this.versionActual >= 1 &&
      (this.estadoActual === 'EMITIDA' || this.estadoActual === 'ANULADA')
    );
  }

  get puedeVerHistorial(): boolean {
    return this.puedeAbrirPdf && this.versionActual >= 1;
  }

  get operacionEnCurso(): boolean {
    return (
      this.ui.guardando ||
      this.ui.creandoVersion ||
      this.guardandoVersion() ||
      this.ui.creandoCopia ||
      this.ui.emitiendo ||
      this.cargandoDetalle
    );
  }

  get pdfBusy(): boolean {
    return this.pdfActionLoading != null;
  }

  get generacionVersionMensaje(): string {
    return this.ui.creandoVersion ? 'Generando nueva versión…' : '';
  }

  ngOnInit(): void {
    // initToken > 0 ⇒ ngOnChanges ya inicializó en este mismo ciclo: no duplicar.
    if (this.abierto && this.initToken === 0) {
      this.syncBodyScrollLock(true);
      this.syncMobileBodyPortal(true);
      void this.inicializar();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['abierto']) {
      const abierto = !!changes['abierto'].currentValue;
      this.syncBodyScrollLock(abierto);
      this.syncMobileBodyPortal(abierto);
      if (abierto) {
        this.vistaMovil = 'datos';
        void this.inicializar();
      }
      return;
    }
    if (!this.abierto) return;

    // Un cambio de modo no debe recargar: al pasar a EDITAR se conservan los
    // datos ya cargados. Solo se reinicia si cambia la receta o el paciente.
    const otraReceta =
      !!changes['idReceta'] && changes['idReceta'].currentValue !== this.idRecetaActual;
    const otroPaciente =
      !!changes['paciente'] &&
      this.paciente?.id_paciente !== changes['paciente'].previousValue?.id_paciente;

    if (otraReceta || otroPaciente) {
      void this.inicializar();
    }
  }

  ngOnDestroy(): void {
    this.syncBodyScrollLock(false);
    this.syncMobileBodyPortal(false);
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.syncMobileBodyPortal(this.abierto);
  }

  setVistaMovil(vista: NuevaRecetaVistaMovil): void {
    this.vistaMovil = vista;
  }

  /** Se invoca en cada (ngModelChange) del formulario. */
  marcarDirty(): void {
    if (this.camposEditables) {
      this.formDirty = true;
    }
    this.sincronizarVistaPrevia();
  }

  /** Fuerza a Angular a recrear el hijo cuando cambia previewMountKey. */
  trackPreviewMount(_index: number, key: number): number {
    return key;
  }

  cerrar(): void {
    if (this.operacionEnCurso) return;
    if (this.formDirty && this.camposEditables) {
      this.dialogoActivo = 'descartar_cambios';
      return;
    }
    this.cerrarForzado();
  }

  cerrarForzado(): void {
    this.dialogoActivo = 'ninguno';
    this.formularioLocalBackup = null;
    this.confirmConfig = null;
    this.confirmCallback = null;
    this.confirmacionEmisionAbierta.set(false);
    this.emitFocusRestoreEl = null;
    this.syncBodyScrollLock(false);
    this.cerrado.emit();
  }

  confirmarDescartarCambios(): void {
    this.formDirty = false;
    this.cerrarForzado();
  }

  cancelarDialogo(): void {
    if (this.dialogoActivo === 'copiar' && this.modo === 'CREAR_COPIA') {
      this.modo =
        this.modoAntesCopia ??
        (this.estadoActual === 'ANULADA' ? 'VER_ANULADA' : 'VER_EMITIDA');
      this.modoAntesCopia = null;
    }
    this.dialogoActivo = 'ninguno';
  }

  irAPlantilla(): void {
    this.cerrarForzado();
    void this.router.navigateByUrl('/dashboard/plantilla-recetas');
  }

  agregarMedicamento(): void {
    if (!this.camposEditables) return;
    this.contenido.medicamentos = [
      ...this.contenido.medicamentos,
      { nombre: '', dosis: '', frecuencia: '', duracion: '' },
    ];
    this.marcarDirty();
  }

  quitarMedicamento(index: number): void {
    if (!this.camposEditables) return;
    if (this.contenido.medicamentos.length <= 1) {
      this.contenido.medicamentos = [{ nombre: '', dosis: '', frecuencia: '', duracion: '' }];
      this.marcarDirty();
      return;
    }
    this.contenido.medicamentos = this.contenido.medicamentos.filter((_, i) => i !== index);
    this.marcarDirty();
  }

  trackMed(index: number): number {
    return index;
  }

  pasarAEditarEmitida(): void {
    if (this.estadoActual !== 'EMITIDA') return;
    this.modo = 'EDITAR_EMITIDA';
  }

  /** Descarta la edición y restaura la receta consultada (formulario y vista previa). */
  cancelarEdicion(): void {
    if (this.operacionEnCurso) return;
    const receta = this.recetaSeleccionada;
    if (!receta) return;
    this.dialogoActivo = 'ninguno';
    this.fieldErrors = {};
    this.errorForm = '';
    this.formularioLocalBackup = null;
    this.conflictoVersionPendiente = false;
    this.applyDetalle(receta, true);
    this.modo = modoDesdeEstado(receta.estado, false);
  }

  /** Guardar en modo EDITAR_EMITIDA → diálogo versión vs copia. */
  solicitarGuardarEmitida(): void {
    if (!this.puedeGuardarEmitida || this.operacionEnCurso) return;
    if (!this.validarFormulario()) return;
    this.dialogoActivo = 'decision_guardar';
  }

  /** Única vía de entrada desde el diálogo de decisión (type=button + click). */
  elegirGuardarNuevaVersion(): void {
    void this.guardarNuevaVersion();
  }

  elegirGuardarComoCopia(): void {
    this.dialogoActivo = 'ninguno';
    this.abrirDialogoCopia();
  }

  abrirDialogoCopia(): void {
    if (!this.idRecetaActual || this.operacionEnCurso) return;
    if (
      this.estadoActual !== 'EMITIDA' &&
      this.estadoActual !== 'ANULADA'
    ) {
      return;
    }
    const base = (this.nombreReceta || '').trim() || 'receta';
    this.copiaNombre = `Copia de ${base}`.slice(0, RECETA_NOMBRE_MAX_LENGTH);
    this.copiaFechaEmision = todayLocalDate();
    this.copiaNotasInternas = false;
    this.copiaNombreError = '';
    if (this.modo !== 'CREAR_COPIA') {
      this.modoAntesCopia = this.modo;
    }
    this.modo = 'CREAR_COPIA';
    this.dialogoActivo = 'copiar';
  }

  async guardarBorrador(): Promise<void> {
    if (!this.puedeGuardarBorrador || this.operacionEnCurso) return;
    if (!this.validarFormulario()) return;
    if (!this.paciente?.id_paciente) {
      this.errorForm = 'No hay paciente seleccionado.';
      return;
    }

    this.ui.guardando = true;
    this.ui.error = null;
    this.errorForm = '';

    try {
      const form = this.buildFormModel();
      let detalle: RecetaDetalle;
      let accion: RecetaPanelCambioEvent['accion'];

      if (this.idRecetaActual) {
        detalle = await this.recetasApi.actualizarBorrador(
          this.idRecetaActual,
          toActualizarRecetaRequest(form),
        );
        accion = 'actualizada';
      } else {
        detalle = await this.recetasApi.crearReceta(
          toCrearRecetaRequest(form, this.paciente.id_paciente),
        );
        accion = 'creada';
      }

      this.applyDetalle(detalle, false);
      this.modo = 'EDITAR_BORRADOR';
      this.formDirty = false;
      this.cambiosGuardados.emit({ detalle, accion });
      await this.presentToast('Borrador guardado.');
    } catch (err) {
      const mapped = mapRecetaApiError(err);
      this.ui.error = mapped.userMessage;
      this.errorForm = mapped.userMessage || 'No fue posible guardar la receta.';
      await this.presentToast(this.errorForm);
    } finally {
      this.ui.guardando = false;
    }
  }

  async guardarNuevaVersion(): Promise<void> {
    // Reentrada: un clic / doble clic / reintento paralelo → una sola cadena.
    if (this.guardandoVersion()) {
      return;
    }
    if (!this.idRecetaActual || this.estadoActual !== 'EMITIDA') {
      return;
    }
    if (this.ui.guardando || this.ui.creandoCopia || this.ui.emitiendo || this.cargandoDetalle) {
      return;
    }
    if (!this.validarFormulario()) {
      return;
    }

    // Tras 409 + “Seguir editando”: no reenviar con base obsoleta; reabrir conflicto.
    if (this.conflictoVersionPendiente) {
      this.guardarBackupLocal();
      this.dialogoActivo = 'conflicto_version';
      return;
    }

    // Claim síncrono ANTES de cualquier await / cierre de diálogo.
    this.guardandoVersion.set(true);
    this.ui.creandoVersion = true;
    this.dialogoActivo = 'ninguno';
    this.ui.error = null;
    this.errorForm = '';
    this.guardarBackupLocal();

    const recetaId = this.idRecetaActual;

    try {
      const receta = this.recetaSeleccionada;
      if (!receta) {
        throw new Error('No existe una receta seleccionada');
      }

      const form = this.buildFormModel();
      // operation_id una sola vez por intento; base/lock desde el detalle (sin ++).
      const request = toCrearVersionRecetaRequest(form, receta);

      const detalle = await this.recetasApi.crearNuevaVersion(recetaId, request);

      // Solo actualizar badge/estado con la respuesta real (sin incremento optimista).
      this.applyDetalle(detalle, false);
      this.modo = 'VER_EMITIDA';
      this.formDirty = false;
      this.formularioLocalBackup = null;
      this.conflictoVersionPendiente = false;
      this.cargarHistorialLocal();
      this.historialExpandido = true;
      this.cambiosGuardados.emit({ detalle, accion: 'versionada' });
      await this.presentToast('Nueva versión creada correctamente');
    } catch (err) {
      const mapped = mapRecetaApiError(err);
      if (mapped.status === 409) {
        // Conserva formulario + backup; no limpia cambios locales.
        this.dialogoActivo = 'conflicto_version';
        this.errorForm = mapped.userMessage;
        this.conflictoVersionPendiente = true;
      } else {
        this.errorForm = mapped.userMessage || 'No fue posible guardar la versión.';
        await this.presentToast(this.errorForm);
      }
    } finally {
      this.ui.creandoVersion = false;
      this.guardandoVersion.set(false);
    }
  }

  async confirmarCrearCopia(): Promise<void> {
    if (!this.idRecetaActual || this.operacionEnCurso) return;
    if (!this.validarNombreCopia()) return;

    const idOrigen = this.idRecetaActual;
    this.ui.creandoCopia = true;
    this.errorForm = '';
    this.copiaNombreError = '';

    try {
      // 1) Copia desde entidad del backend (sin PDF ni object keys).
      const copia = await this.recetasApi.guardarComoCopia(
        idOrigen,
        toCopiarRecetaRequest({
          nombre: this.copiaNombre,
          fechaEmision: this.copiaFechaEmision || todayLocalDate(),
          copiarNotasInternas: this.copiaNotasInternas,
          idPlantillaReceta: this.idPlantillaReceta,
          configuracionPlantillaSnapshot: this.config,
        }),
      );

      // 2) Aplicar cambios locales del formulario a la copia (borrador).
      const formLocal = this.buildFormModel();
      formLocal.nombre = this.copiaNombre.trim();
      formLocal.fecha_emision =
        formatLocalDate(this.copiaFechaEmision) || formLocal.fecha_emision;
      if (!this.copiaNotasInternas) {
        formLocal.notas_internas = '';
      }

      const detalle = await this.recetasApi.actualizarBorrador(
        copia.id_receta,
        toActualizarRecetaRequest(formLocal),
      );

      this.dialogoActivo = 'ninguno';
      this.applyDetalle(detalle, false);
      this.idRecetaOrigen = detalle.id_receta_origen ?? idOrigen;
      this.modo = 'EDITAR_BORRADOR';
      this.formDirty = false;
      this.cambiosGuardados.emit({ detalle, accion: 'copiada' });
      await this.presentToast('Copia creada como borrador.');
    } catch (err) {
      const mapped = mapRecetaApiError(err);
      this.copiaNombreError = mapped.userMessage || 'No fue posible crear la copia.';
      await this.presentToast(this.copiaNombreError);
    } finally {
      this.ui.creandoCopia = false;
    }
  }

  async recargarTrasConflicto(): Promise<void> {
    if (!this.idRecetaActual) return;
    this.dialogoActivo = 'ninguno';
    this.cargandoDetalle = true;
    try {
      const detalle = await this.recetasApi.obtenerReceta(this.idRecetaActual);
      this.applyDetalle(detalle, true);
      this.modo = modoDesdeEstado(detalle.estado, false);
      this.formularioLocalBackup = null;
      this.conflictoVersionPendiente = false;
      this.cargarHistorialLocal();
      await this.presentToast('Receta recargada.');
    } catch (err) {
      await this.presentToast(mapRecetaApiError(err).userMessage);
    } finally {
      this.cargandoDetalle = false;
    }
  }

  conservarEdicionTrasConflicto(): void {
    this.dialogoActivo = 'ninguno';
    this.modo = 'EDITAR_EMITIDA';
    this.conflictoVersionPendiente = true;
    // Conserva formularioLocalBackup / formDirty; no reenvía; no actualiza base.
  }

  solicitarEmitir(): void {
    if (!this.puedeEmitir || this.operacionEnCurso || this.confirmacionEmisionAbierta()) {
      return;
    }

    this.emitFocusRestoreEl =
      (document.activeElement as HTMLElement | null) ??
      (document.getElementById('nrp-emitir-btn') as HTMLElement | null);
    this.confirmacionEmisionAbierta.set(true);

    this.openConfirm(
      {
        title: 'Emitir receta',
        message:
          'Se generará el PDF definitivo de esta receta. Los cambios posteriores crearán una nueva versión y la versión actual se conservará.',
        confirmLabel: 'Emitir receta',
        cancelLabel: 'Cancelar',
        variant: 'primary',
        icon: 'document-text-outline',
      },
      () => {
        void this.emitirReceta();
      },
    );
  }

  onConfirmDialogConfirmed(): void {
    const cb = this.confirmCallback;
    this.cerrarConfirmacion();
    cb?.();
  }

  onConfirmDialogCancelled(): void {
    this.cerrarConfirmacion();
  }

  /** Abrir PDF vigente (inline). */
  abrirPdfActual(): void {
    void this.solicitarYAbrirPdf('abrir', 'inline');
  }

  /** Misma URL inline; el usuario imprime desde el visor nativo. */
  imprimirPdfActual(): void {
    void this.solicitarYAbrirPdf('imprimir', 'inline');
  }

  descargarPdfActual(): void {
    void this.solicitarYAbrirPdf('descargar', 'attachment');
  }

  toggleHistorial(): void {
    this.historialExpandido = !this.historialExpandido;
    if (this.historialExpandido && this.historialVersiones.length === 0) {
      this.cargarHistorialLocal();
    }
  }

  etiquetaTipoVersion(tipo: RecetaVersionResumen['tipo_guardado']): string {
    return tipo === 'CREACION' ? 'Creación' : 'Actualización';
  }

  abrirPdfVersion(version: RecetaVersionResumen): void {
    void this.solicitarYAbrirPdfVersion(version.numero_version, 'abrir', 'inline');
  }

  descargarPdfVersion(version: RecetaVersionResumen): void {
    void this.solicitarYAbrirPdfVersion(version.numero_version, 'descargar', 'attachment');
  }

  private cargarHistorialLocal(): void {
    // Sin GET /versiones en backend: se deriva de version_actual + pdf-url por número.
    this.historialVersiones = buildRecetaVersionHistorial({
      versionActual: this.versionActual,
      nombreArchivoActual: this.nombreArchivoActual,
      fechaActual: this.ultimaEmisionAt,
    });
  }

  private async solicitarYAbrirPdf(
    action: RecetaPdfAction,
    disposition: 'inline' | 'attachment',
  ): Promise<void> {
    if (!this.idRecetaActual || !this.puedeAbrirPdf || this.pdfBusy || this.operacionEnCurso) {
      if (!this.puedeAbrirPdf) {
        await this.presentToast(RECETA_PDF_MESSAGES.noPdf);
      }
      return;
    }

    const idReceta = this.idRecetaActual;
    this.pdfActionLoading = action;
    this.ui.generandoUrl = true;

    try {
      const result = await openSignedPdfInNewTab(async () => {
        const res = await this.recetasApi.obtenerPdfUrl(idReceta, disposition);
        return res?.url;
      });
      if (!result.ok) {
        await this.presentToast(result.userMessage);
      }
    } catch (err) {
      const mapped = mapRecetaApiError(err);
      await this.presentToast(mapped.userMessage || RECETA_PDF_MESSAGES.generic);
    } finally {
      this.pdfActionLoading = null;
      this.ui.generandoUrl = false;
    }
  }

  private async solicitarYAbrirPdfVersion(
    numeroVersion: number,
    kind: 'abrir' | 'descargar',
    disposition: 'inline' | 'attachment',
  ): Promise<void> {
    if (!this.idRecetaActual || !this.puedeAbrirPdf || this.pdfBusy || this.operacionEnCurso) return;

    const idReceta = this.idRecetaActual;
    const action: RecetaPdfAction = `version-${numeroVersion}-${kind}`;
    this.pdfActionLoading = action;
    this.ui.generandoUrl = true;

    try {
      const result = await openSignedPdfInNewTab(async () => {
        const res = await this.recetasApi.obtenerPdfVersionUrl(
          idReceta,
          numeroVersion,
          disposition,
        );
        return res?.url;
      });
      if (!result.ok) {
        await this.presentToast(result.userMessage);
      }
    } catch (err) {
      const mapped = mapRecetaApiError(err);
      await this.presentToast(mapped.userMessage || RECETA_PDF_MESSAGES.generic);
    } finally {
      this.pdfActionLoading = null;
      this.ui.generandoUrl = false;
    }
  }

  private async emitirReceta(): Promise<void> {
    if (!this.idRecetaActual || this.operacionEnCurso) return;

    this.ui.emitiendo = true;
    this.errorForm = '';

    try {
      if (this.formDirty && this.puedeGuardarBorrador) {
        if (!this.validarFormulario()) {
          this.ui.emitiendo = false;
          return;
        }
        const form = this.buildFormModel();
        const actualizado = await this.recetasApi.actualizarBorrador(
          this.idRecetaActual,
          toActualizarRecetaRequest(form),
        );
        this.applyDetalle(actualizado, false);
        this.formDirty = false;
      }

      const detalle = await this.recetasApi.emitirReceta(this.idRecetaActual);
      this.applyDetalle(detalle, false);
      this.modo = 'VER_EMITIDA';
      this.cambiosGuardados.emit({ detalle, accion: 'emitida' });
      await this.presentToast('Receta emitida correctamente.');
    } catch (err) {
      const mapped = mapRecetaApiError(err);
      this.errorForm = mapped.userMessage || 'No fue posible emitir la receta.';
      await this.presentToast(this.errorForm);
    } finally {
      this.ui.emitiendo = false;
    }
  }

  private openConfirm(config: ConfirmDialogConfig, onConfirm: () => void): void {
    this.confirmConfig = config;
    this.confirmCallback = onConfirm;
  }

  private cerrarConfirmacion(): void {
    this.confirmConfig = null;
    this.confirmCallback = null;
    this.confirmacionEmisionAbierta.set(false);
    const restore = this.emitFocusRestoreEl;
    this.emitFocusRestoreEl = null;
    queueMicrotask(() => restore?.focus?.());
  }

  private validarFormulario(): boolean {
    this.fieldErrors = {};
    this.errorForm = '';

    const nombre = (this.nombreReceta || '').trim();
    const fecha = formatLocalDate(this.contenido.fechaEmision);
    const hayMed = (this.contenido.medicamentos ?? []).some(m => (m.nombre || '').trim());
    const hayDx = !!(this.contenido.diagnostico || '').trim();
    const hayInd = !!(this.contenido.indicaciones || '').trim();

    if (!nombre) {
      this.fieldErrors['nombre'] = true;
    } else if (nombre.length > RECETA_NOMBRE_MAX_LENGTH) {
      this.fieldErrors['nombre'] = true;
      this.errorForm = `El nombre no puede exceder ${RECETA_NOMBRE_MAX_LENGTH} caracteres.`;
    }
    if (!fecha) {
      this.fieldErrors['fechaEmision'] = true;
    }
    if (!hayMed && !hayDx && !hayInd) {
      this.fieldErrors['contenido'] = true;
      this.errorForm =
        'Debe agregar al menos un medicamento, o indicar diagnóstico o indicaciones.';
    }
    if (this.fieldErrors['nombre'] || this.fieldErrors['fechaEmision']) {
      this.errorForm = this.errorForm || 'Revisa los campos marcados.';
    }

    return Object.keys(this.fieldErrors).length === 0;
  }

  private buildFormModel() {
    const nombre =
      (this.nombreReceta || '').trim() ||
      this.nombreRecetaPorDefecto();

    return contenidoPreviewToFormModel(this.contenido, {
      nombre,
      id_plantilla_receta: this.idPlantillaReceta,
      notas_internas: this.notasInternas,
      paciente_fecha_nacimiento_snapshot: formatLocalDate(this.paciente?.fecha_nacimiento),
      configuracion_plantilla_snapshot: this.config,
    });
  }

  private nombreRecetaPorDefecto(): string {
    const pac = this.contenido.pacienteNombre?.trim() || 'paciente';
    const fecha = formatLocalDate(this.contenido.fechaEmision) || todayLocalDate();
    return `Receta — ${pac} — ${fecha}`;
  }

  private validarNombreCopia(): boolean {
    this.copiaNombreError = '';
    const nombre = (this.copiaNombre || '').trim();
    if (!nombre) {
      this.copiaNombreError = 'El nombre de la nueva receta es obligatorio.';
      return false;
    }
    if (nombre.length > RECETA_NOMBRE_MAX_LENGTH) {
      this.copiaNombreError = `El nombre no puede exceder ${RECETA_NOMBRE_MAX_LENGTH} caracteres.`;
      return false;
    }
    this.copiaNombre = nombre;
    return true;
  }

  private guardarBackupLocal(): void {
    this.formularioLocalBackup = {
      nombreReceta: this.nombreReceta,
      notasInternas: this.notasInternas,
      contenido: {
        ...this.contenido,
        medicamentos: this.contenido.medicamentos.map(m => ({ ...m })),
      },
    };
  }

  /**
   * ÚNICO mapper de la vista previa, para todos los modos (nueva, ver, editar y
   * copia). Siempre lee el modelo del formulario (`contenido`), nunca el DTO del
   * backend: la receta consultada primero se vuelca al formulario y de ahí sale
   * la vista previa, así que no hay dos fuentes de verdad que puedan divergir.
   * Aquí se centralizan los cambios de nombre y de formato de fecha.
   */
  private construirDatosVistaPrevia(): RecetaPreviewData {
    return {
      nombreReceta: (this.nombreReceta ?? '').trim(),
      pacienteNombre: (this.contenido.pacienteNombre ?? '').trim(),
      edad: (this.contenido.edad ?? '').trim(),
      fechaEmision: formatDisplayDate(this.contenido.fechaEmision),
      diagnostico: (this.contenido.diagnostico ?? '').trim(),
      medicamentos: (this.contenido.medicamentos ?? []).map(med => ({
        nombre: (med.nombre ?? '').trim(),
        dosis: (med.dosis ?? '').trim(),
        frecuencia: (med.frecuencia ?? '').trim(),
        duracion: (med.duracion ?? '').trim(),
      })),
      indicaciones: (this.contenido.indicaciones ?? '').trim(),
      proximaCitaFecha: formatDisplayDate(this.contenido.proximaCitaFecha),
      proximaCitaHora: formatDisplayTime(this.contenido.proximaCitaHora),
    };
  }

  /**
   * Regenera el modelo de vista previa desde el formulario.
   * @param remount Si true, destruye y recrea el componente hijo (usar tras
   *   cargar una receta existente para no heredar el primer render vacío).
   */
  private sincronizarVistaPrevia(remount = false): void {
    this.datosVistaPrevia = this.construirDatosVistaPrevia();
    if (remount) {
      this.previewMountKey += 1;
    }
    this.cdr.markForCheck();
  }

  private resolverEdadTexto(
    edad: string | null | undefined,
    fechaNacimiento?: string | null,
  ): string {
    const texto = (edad ?? '').trim();
    if (texto) return texto;
    const iso = formatLocalDate(fechaNacimiento);
    if (!iso) return '';
    const anios = this.calcularEdad(iso);
    return anios === null ? '' : `${anios} años`;
  }

  /**
   * Vuelca la receta consultada en el MISMO formulario que usa "Nueva receta" y
   * después regenera la vista previa desde ese formulario. El orden importa:
   * primero el formulario completo (incluidos medicamentos), luego la apariencia
   * y al final la vista previa.
   */
  private applyDetalle(detalle: RecetaDetalle, resetDirty = true): void {
    this.recetaSeleccionada = detalle;
    this.idRecetaActual = detalle.id_receta;
    this.idReceta = detalle.id_receta;
    this.estadoActual = detalle.estado;
    this.versionActual = detalle.version_actual ?? 0;
    this.tienePdf = !!detalle.tiene_pdf;
    this.nombreArchivoActual = detalle.nombre_archivo ?? null;
    this.ultimaEmisionAt = detalle.ultima_emision_at ?? detalle.emitida_at ?? null;
    this.idRecetaOrigen = detalle.id_receta_origen ?? null;
    this.historialExpandido = false;
    this.historialVersiones = [];
    this.nombreReceta = detalle.nombre ?? '';
    this.notasInternas = detalle.notas_internas ?? '';
    this.idPlantillaReceta = detalle.id_plantilla_receta ?? null;

    if (detalle.configuracion_plantilla_snapshot) {
      this.esPredeterminada = false;
    }

    // 1) Backend → formulario (mismos adaptadores que el resto del panel).
    const form = detalleToFormModel(detalle);
    this.contenido = formModelToContenidoPreview(form);
    // La edad resuelta (o derivada del nacimiento) queda en el formulario, que es
    // el origen de la vista previa: el usuario ve exactamente lo mismo en ambos.
    this.contenido.edad =
      this.resolverEdadTexto(
        form.edad_texto,
        form.paciente_fecha_nacimiento_snapshot ?? this.paciente?.fecha_nacimiento,
      ) || null;

    // 2) Apariencia: una receta emitida conserva su snapshot; nunca se sustituye
    //    automáticamente por la plantilla vigente del profesional. El snapshot
    //    viene crudo del backend (puede ser parcial o de un esquema anterior),
    //    así que SIEMPRE se normaliza. Luego se reaplican identidad y URLs
    //    firmadas cacheadas (si ya se resolvieron) sin otra ida al servidor.
    if (detalle.configuracion_plantilla_snapshot) {
      this.config = this.aplicarIdentidadYRecursosLocales(
        normalizePlantillaConfig(detalle.configuracion_plantilla_snapshot),
      );
    }

    // 3) Vista previa desde el formulario ya completo + remount del hijo.
    this.sincronizarVistaPrevia(true);

    if (resetDirty) this.formDirty = false;
  }

  private syncBodyScrollLock(lock: boolean): void {
    if (typeof document === 'undefined') return;
    if (lock) {
      this.bodyOverflowPrev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = this.bodyOverflowPrev;
      this.bodyOverflowPrev = '';
    }
  }

  /**
   * En ≤480px el panel vive dentro de ion-page (containing block + scroll del
   * layout de Pacientes). Se teleporta el host a document.body —mismo patrón
   * que buscar-paciente-modal— para cubrir el viewport por encima de la
   * cabecera «← Pacientes» y del scrollbar del contenedor padre.
   * Tablet/escritorio no se alteran.
   */
  private syncMobileBodyPortal(abierto: boolean): void {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;

    const mobile = window.matchMedia('(max-width: 480px)').matches;
    const host = this.hostEl.nativeElement;
    const shouldPortal = abierto && mobile;

    if (shouldPortal && !this.mobilePortalActive) {
      this.portalHomeParent = host.parentNode;
      this.portalHomeNextSibling = host.nextSibling;
      host.classList.add('receta-medica-mobile-overlay');
      document.body.classList.add('receta-medica-overlay-open');
      document.body.appendChild(host);
      this.mobilePortalActive = true;
      return;
    }

    if (!shouldPortal && this.mobilePortalActive) {
      host.classList.remove('receta-medica-mobile-overlay');
      document.body.classList.remove('receta-medica-overlay-open');
      const parent = this.portalHomeParent;
      const next = this.portalHomeNextSibling;
      if (parent) {
        if (next && next.parentNode === parent) {
          parent.insertBefore(host, next);
        } else {
          parent.appendChild(host);
        }
      }
      this.portalHomeParent = null;
      this.portalHomeNextSibling = null;
      this.mobilePortalActive = false;
    }
  }

  private async inicializar(): Promise<void> {
    const token = ++this.initToken;
    this.cargandoDetalle = true;
    this.errorForm = '';
    this.fieldErrors = {};
    this.ui = createInitialRecetasUiState();
    this.formDirty = false;
    this.confirmConfig = null;
    this.dialogoActivo = 'ninguno';
    this.formularioLocalBackup = null;

    this.limpiarDatosReceta();
    this.idRecetaActual = this.idReceta;

    try {
      if (this.idReceta) {
        await this.cargarDetalle(this.idReceta, token);
        if (token !== this.initToken) return;
        if (this.accionInicial === 'copiar') {
          this.abrirDialogoCopia();
        }
      } else {
        this.seedContenidoDesdePaciente();
        await this.cargarPlantilla(true, token);
        if (token !== this.initToken) return;
      }
    } finally {
      if (token === this.initToken) {
        this.cargandoDetalle = false;
        // Sincronización final: ya están cargados formulario, apariencia y modo.
        this.sincronizarVistaPrevia();
      }
    }
  }

  /** Evita que queden datos de la receta anterior mientras carga la nueva. */
  private limpiarDatosReceta(): void {
    this.recetaSeleccionada = null;
    this.idRecetaActual = null;
    this.estadoActual = null;
    this.versionActual = 0;
    this.tienePdf = false;
    this.nombreArchivoActual = null;
    this.ultimaEmisionAt = null;
    this.idRecetaOrigen = null;
    this.nombreReceta = '';
    this.notasInternas = '';
    this.historialExpandido = false;
    this.historialVersiones = [];
    this.pdfActionLoading = null;
    this.modoAntesCopia = null;
    this.copiaNombreError = '';
    this.conflictoVersionPendiente = false;
    this.guardandoVersion.set(false);
    this.contenido = createEmptyRecetaContenido();
    this.datosVistaPrevia = createEmptyRecetaPreviewData();
    this.previewProfesional = null;
    this.previewLogoUrl = null;
    this.previewFirmaUrl = null;
    this.previewSelloUrl = null;
    this.cdr.markForCheck();
  }

  private async cargarDetalle(id: number, token = this.initToken): Promise<void> {
    this.cargandoPlantilla = true;
    this.errorPlantilla = '';
    try {
      const detalle = await this.recetasApi.obtenerReceta(id);
      // Una respuesta tardía no debe escribir sobre una apertura más reciente.
      if (token !== this.initToken) return;
      this.applyDetalle(detalle);

      if (detalle.configuracion_plantilla_snapshot) {
        // El snapshot solo guarda flags/layout: datos_visualizacion y *_url van
        // vacíos por diseño. Igual que Nueva receta / PDF, se enriquecen en vivo
        // con Mi perfil + URLs firmadas de la plantilla, sin reemplazar el snapshot.
        await this.enriquecerSnapshotConIdentidadYRecursos(token);
      } else {
        await this.cargarPlantilla(false, token);
      }
    } catch (error) {
      if (token !== this.initToken) return;
      this.errorForm = mapRecetaApiError(error).userMessage;
      this.config = createDefaultPlantillaConfig();
      this.seedContenidoDesdePaciente();
      this.cargandoPlantilla = false;
    }
  }

  /**
   * Reaplica identidad y URLs firmadas cacheadas sobre una config base (snapshot
   * o plantilla). No hace HTTP.
   */
  private aplicarIdentidadYRecursosLocales(
    base: PlantillaRecetasConfigDto,
  ): PlantillaRecetasConfigDto {
    const conPerfil = this.previewProfesional
      ? mergeProfesionalIntoConfig(base, this.previewProfesional)
      : base;
    return {
      ...conPerfil,
      identidad: {
        ...conPerfil.identidad,
        logo_url: this.previewLogoUrl ?? conPerfil.identidad.logo_url,
      },
      pie: {
        ...conPerfil.pie,
        firma_url: this.previewFirmaUrl ?? conPerfil.pie.firma_url,
        sello_url: this.previewSelloUrl ?? conPerfil.pie.sello_url,
      },
    };
  }

  /**
   * Sobre el snapshot ya aplicado: inyecta identidad profesional (Mi perfil) y
   * URLs firmadas vigentes de logo/firma/sello. No sustituye colores, tipografía,
   * distribución ni visibilidad del snapshot.
   */
  private async enriquecerSnapshotConIdentidadYRecursos(token = this.initToken): Promise<void> {
    this.cargandoPlantilla = true;
    this.errorPlantilla = '';
    try {
      const preview = await this.plantillaApi.obtenerVistaPrevia();
      if (token !== this.initToken) return;

      this.previewProfesional = preview.profesional;
      this.previewLogoUrl =
        preview.logo?.downloadUrl ?? preview.configuracion.identidad.logo_url ?? null;
      this.previewFirmaUrl =
        preview.firma?.downloadUrl ?? preview.configuracion.pie.firma_url ?? null;
      this.previewSelloUrl =
        preview.sello?.downloadUrl ?? preview.configuracion.pie.sello_url ?? null;

      this.config = this.aplicarIdentidadYRecursosLocales(this.config);

      if (this.idPlantillaReceta == null) {
        this.idPlantillaReceta = preview.idPlantillaReceta ?? null;
      }
      // Con snapshot la plantilla visual ya no es la predeterminada "en blanco".
      this.esPredeterminada = false;
    } catch (error) {
      if (token !== this.initToken) return;
      // Sin enriquecimiento: se conserva el snapshot (layout) aunque falte identidad.
      this.errorPlantilla = mapRecetaApiError(error).userMessage;
    } finally {
      if (token === this.initToken) {
        this.cargandoPlantilla = false;
        this.sincronizarVistaPrevia(true);
      }
    }
  }

  private async cargarPlantilla(setLoading = true, token = this.initToken): Promise<void> {
    if (setLoading) this.cargandoPlantilla = true;
    this.errorPlantilla = '';
    try {
      const preview = await this.plantillaApi.obtenerVistaPrevia();
      if (token !== this.initToken) return;
      this.esPredeterminada = preview.esPredeterminada ?? true;
      this.config = preview.configuracion;
      this.idPlantillaReceta = preview.idPlantillaReceta ?? null;
    } catch (error) {
      if (token !== this.initToken) return;
      this.config = createDefaultPlantillaConfig();
      this.esPredeterminada = true;
      this.idPlantillaReceta = null;
      this.errorPlantilla = mapRecetaApiError(error).userMessage;
    } finally {
      if (token === this.initToken) {
        this.cargandoPlantilla = false;
        // La apariencia cambió: la vista previa necesita una referencia nueva.
        this.sincronizarVistaPrevia();
      }
    }
  }

  private seedContenidoDesdePaciente(): void {
    const p = this.paciente;
    let edad: string | null = null;
    if (p?.fecha_nacimiento) {
      const years = this.calcularEdad(p.fecha_nacimiento);
      if (years !== null) edad = `${years} años`;
    }

    this.contenido = {
      ...createEmptyRecetaContenido(),
      pacienteNombre: p ? `${p.nombre} ${p.apellido}`.trim() : '',
      fechaEmision: todayLocalDate(),
      edad,
      medicamentos: [{ nombre: '', dosis: '', frecuencia: '', duracion: '' }],
    };
    this.nombreReceta = this.nombreRecetaPorDefecto();
    this.sincronizarVistaPrevia();
  }

  private calcularEdad(fechaNacimiento: string): number | null {
    const nac = new Date(fechaNacimiento.includes('T') ? fechaNacimiento : `${fechaNacimiento}T12:00:00`);
    if (Number.isNaN(nac.getTime())) return null;
    const hoy = new Date();
    let edad = hoy.getFullYear() - nac.getFullYear();
    if (
      hoy.getMonth() < nac.getMonth() ||
      (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate())
    ) {
      edad--;
    }
    return edad >= 0 ? edad : null;
  }

  private async presentToast(message: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 1800,
      position: 'bottom',
      color: 'dark',
    });
    await toast.present();
  }
}
