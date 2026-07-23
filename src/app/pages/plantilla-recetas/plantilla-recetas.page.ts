import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController, ToastController, ViewWillEnter } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { PerfilApiService } from 'src/app/services/perfil-api.service';
import { PlantillaRecetasApiService } from 'src/app/services/plantilla-recetas-api.service';
import {
  AssetRegisterRequest,
  PlantillaRecetaAsset,
  PlantillaRecetasConfigDto,
  PlantillaRecetasDto,
  PLANTILLA_RECETAS_CONFIG_VERSION,
  PrescriptionAssetType,
  PrescriptionAssetUploadState,
  createDefaultPlantillaConfig,
  createEmptyDatosVisualizacion,
  validatePrescriptionAssetFile,
} from 'src/app/shared/models/plantilla-recetas.models';
import { ConfirmDialogComponent, ConfirmDialogConfig } from 'src/app/shared/confirm-dialog/confirm-dialog.component';
import { mapApiError } from 'src/app/shared/utils/api-error.mapper';

interface AssetSlotUi {
  current: PlantillaRecetaAsset | null;
  pendingFile: File | null;
  localPreviewUrl: string | null;
  removeRequested: boolean;
  state: PrescriptionAssetUploadState;
  errorMessage: string | null;
  /** Metadata para reintentar registro si el PUT a R2 ya tuvo éxito. */
  pendingRegister: AssetRegisterRequest | null;
  /** Evita cargas duplicadas concurrentes. */
  busy: boolean;
}

type PlantillaTab = 'datos' | 'identidad' | 'distribucion' | 'pie';
type EstiloEncabezado = 'minimalista' | 'franja' | 'dividido';
type TipografiaPlantilla = 'moderna' | 'clasica' | 'compacta';
type SeparadorPlantilla = 'ninguno' | 'sutil' | 'color';
/** Extensible: agregar formatos futuros sin romper el modelo. */
type FormatoReceta = 'carta' | 'media-carta';
type LayoutDistribucion = 'clasica' | 'moderna' | 'compacta';
type EspaciadoPlantilla = 'compacto' | 'normal' | 'amplio';
type TamanoTextoPlantilla = 'pequeno' | 'mediano' | 'grande';
type SeccionContenidoKey =
  | 'fechaEmision'
  | 'datosPaciente'
  | 'edadPaciente'
  | 'diagnostico'
  | 'medicamentos'
  | 'indicaciones'
  | 'proximaCita'
  | 'firma'
  | 'sello'
  | 'avisoLegal';

interface PlantillaTabItem {
  id: PlantillaTab;
  label: string;
  icon: string;
  description: string;
}

/** Datos de solo lectura tomados de Mi perfil (no se editan ni guardan aquí). */
interface DatosProfesionalesPlantilla {
  nombre: string;
  especialidad: string;
  cedulaProfesional: string;
  telefonoProfesional: string;
  email: string;
  nombreConsultorio: string;
  telefonoConsultorio: string;
  direccionConsultorio: string;
}

interface VisibilidadDatosPlantilla {
  nombre: boolean;
  especialidad: boolean;
  cedulaProfesional: boolean;
  telefonoProfesional: boolean;
  email: boolean;
  nombreConsultorio: boolean;
  telefonoConsultorio: boolean;
  direccionConsultorio: boolean;
}

interface CampoProfesionalReadonly {
  key: keyof DatosProfesionalesPlantilla;
  label: string;
  showKey: keyof VisibilidadDatosPlantilla;
  showLabel: string;
}

interface ColorPlantillaOption {
  id: string;
  label: string;
  hex: string;
}

interface OpcionVisual<T extends string> {
  id: T;
  label: string;
  description: string;
}

interface IdentidadVisualPlantilla {
  mostrarLogo: boolean;
  logoUrl: string | null;
  colorId: string;
  encabezado: EstiloEncabezado;
  tipografia: TipografiaPlantilla;
  separador: SeparadorPlantilla;
}

interface SeccionesContenidoPlantilla {
  fechaEmision: boolean;
  datosPaciente: boolean;
  edadPaciente: boolean;
  diagnostico: boolean;
  medicamentos: boolean;
  indicaciones: boolean;
  proximaCita: boolean;
  firma: boolean;
  sello: boolean;
  avisoLegal: boolean;
}

interface EtiquetasPlantilla {
  paciente: string;
  diagnostico: string;
  medicamentos: string;
  indicaciones: string;
  proximaCita: string;
  firma: string;
  avisoLegal: string;
}

interface DistribucionPlantilla {
  formato: FormatoReceta;
  layout: LayoutDistribucion;
  secciones: SeccionesContenidoPlantilla;
  etiquetas: EtiquetasPlantilla;
  espaciado: EspaciadoPlantilla;
  tamanoTexto: TamanoTextoPlantilla;
}

interface SeccionContenidoOption {
  key: SeccionContenidoKey;
  label: string;
  essential?: boolean;
}

interface EtiquetaOption {
  key: keyof EtiquetasPlantilla;
  label: string;
  placeholder: string;
}

/** Firma visual + pie (sin validez legal certificada). */
interface PieFirmaPlantilla {
  firmaUrl: string | null;
  selloUrl: string | null;
  mostrarNombreBajoFirma: boolean;
  mostrarEspecialidadBajoFirma: boolean;
  mostrarCedulaBajoFirma: boolean;
  textoPie: string;
  mostrarTelefono: boolean;
  mostrarCorreo: boolean;
  mostrarDireccion: boolean;
  mostrarNumeroPagina: boolean;
  mostrarFechaGeneracion: boolean;
}

@Component({
  selector: 'app-plantilla-recetas',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, ConfirmDialogComponent],
  templateUrl: './plantilla-recetas.page.html',
  styleUrls: ['./plantilla-recetas.page.scss'],
})
export class PlantillaRecetasPage implements OnInit, OnDestroy, ViewWillEnter {
  @ViewChild('logoInput') logoInput!: ElementRef<HTMLInputElement>;
  @ViewChild('firmaInput') firmaInput!: ElementRef<HTMLInputElement>;
  @ViewChild('selloInput') selloInput!: ElementRef<HTMLInputElement>;

  activeTab: PlantillaTab = 'datos';
  cargandoDatos = false;
  guardando = false;
  restableciendo = false;
  esPlantillaPredeterminada = true;
  idPlantillaReceta: number | null = null;
  confirmConfig: ConfirmDialogConfig | null = null;

  private confirmCallback: (() => void) | null = null;
  private perfilBase: DatosProfesionalesPlantilla = this.createEmptyDatos();
  private cargaInicialHecha = false;
  private logoRefreshAttempted = false;
  private firmaRefreshAttempted = false;
  private selloRefreshAttempted = false;

  /** Estado de assets separado de la configuración serializable. */
  logoState: AssetSlotUi = this.createAssetSlot();
  selloState: AssetSlotUi = this.createAssetSlot();
  firmaState: AssetSlotUi = this.createAssetSlot();

  /** @deprecated Usar logoState / selloState / firmaState */
  get assetSlots(): Record<PrescriptionAssetType, AssetSlotUi> {
    return {
      logo: this.logoState,
      sello: this.selloState,
      firma: this.firmaState,
    };
  }

  readonly maxEtiquetaLength = 40;
  readonly maxTextoPieLength = 180;

  /** Solo lectura: sincronizado desde Mi perfil. */
  datos: DatosProfesionalesPlantilla = this.createEmptyDatos();
  /** Editable: flags de visibilidad en la receta. */
  mostrar: VisibilidadDatosPlantilla = this.createDefaultVisibilidad();

  readonly camposProfesionales: CampoProfesionalReadonly[] = [
    { key: 'nombre', label: 'Nombre completo', showKey: 'nombre', showLabel: 'Mostrar en receta' },
    { key: 'especialidad', label: 'Especialidad', showKey: 'especialidad', showLabel: 'Mostrar en receta' },
    { key: 'cedulaProfesional', label: 'Cédula profesional', showKey: 'cedulaProfesional', showLabel: 'Mostrar en receta' },
    { key: 'email', label: 'Correo electrónico', showKey: 'email', showLabel: 'Mostrar en receta' },
    { key: 'telefonoProfesional', label: 'Teléfono', showKey: 'telefonoProfesional', showLabel: 'Mostrar en receta' },
    { key: 'nombreConsultorio', label: 'Nombre del consultorio', showKey: 'nombreConsultorio', showLabel: 'Mostrar en receta' },
    { key: 'telefonoConsultorio', label: 'Teléfono del consultorio', showKey: 'telefonoConsultorio', showLabel: 'Mostrar en receta' },
    { key: 'direccionConsultorio', label: 'Dirección del consultorio', showKey: 'direccionConsultorio', showLabel: 'Mostrar en receta' },
  ];
  identidad: IdentidadVisualPlantilla = this.createDefaultIdentidad();
  distribucion: DistribucionPlantilla = this.createDefaultDistribucion();
  pie: PieFirmaPlantilla = this.createDefaultPie();

  readonly colores: ColorPlantillaOption[] = [
    { id: 'azul', label: 'Azul', hex: '#2563EB' },
    { id: 'indigo', label: 'Índigo', hex: '#3B3F92' },
    { id: 'violeta', label: 'Violeta', hex: '#6D28D9' },
    { id: 'petroleo', label: 'Verde petróleo', hex: '#0F766E' },
    { id: 'grafito', label: 'Gris grafito', hex: '#334155' },
  ];

  readonly encabezados: OpcionVisual<EstiloEncabezado>[] = [
    { id: 'minimalista', label: 'Minimalista', description: 'Encabezado limpio y sobrio' },
    { id: 'franja', label: 'Franja superior', description: 'Barra con color principal' },
    { id: 'dividido', label: 'Encabezado dividido', description: 'Bloques laterales contrastados' },
  ];

  readonly tipografias: OpcionVisual<TipografiaPlantilla>[] = [
    { id: 'moderna', label: 'Moderna', description: 'Inter, clara y actual' },
    { id: 'clasica', label: 'Clásica', description: 'Serif del sistema' },
    { id: 'compacta', label: 'Compacta', description: 'Inter con menor espaciado' },
  ];

  readonly separadores: OpcionVisual<SeparadorPlantilla>[] = [
    { id: 'ninguno', label: 'Sin separador', description: 'Sin línea entre secciones' },
    { id: 'sutil', label: 'Línea sutil', description: 'Separador gris discreto' },
    { id: 'color', label: 'Línea con color principal', description: 'Separador con acento' },
  ];

  readonly formatos: OpcionVisual<FormatoReceta>[] = [
    { id: 'carta', label: 'Carta', description: 'Hoja completa tamaño carta' },
    { id: 'media-carta', label: 'Media carta', description: 'Formato más corto para recetas breves' },
  ];

  readonly layouts: OpcionVisual<LayoutDistribucion>[] = [
    { id: 'clasica', label: 'Clásica', description: 'Estructura tradicional vertical' },
    { id: 'moderna', label: 'Moderna', description: 'Bloques claros con acento' },
    { id: 'compacta', label: 'Compacta', description: 'Más contenido en menos espacio' },
  ];

  readonly espaciados: OpcionVisual<EspaciadoPlantilla>[] = [
    { id: 'compacto', label: 'Compacto', description: 'Menos aire entre bloques' },
    { id: 'normal', label: 'Normal', description: 'Equilibrio recomendado' },
    { id: 'amplio', label: 'Amplio', description: 'Mayor separación visual' },
  ];

  readonly tamanosTexto: OpcionVisual<TamanoTextoPlantilla>[] = [
    { id: 'pequeno', label: 'Pequeño', description: 'Más denso, aún legible' },
    { id: 'mediano', label: 'Mediano', description: 'Tamaño estándar de impresión' },
    { id: 'grande', label: 'Grande', description: 'Mayor claridad de lectura' },
  ];

  readonly seccionesContenido: SeccionContenidoOption[] = [
    { key: 'fechaEmision', label: 'Fecha de emisión' },
    { key: 'datosPaciente', label: 'Datos del paciente' },
    { key: 'edadPaciente', label: 'Edad del paciente' },
    { key: 'diagnostico', label: 'Diagnóstico' },
    { key: 'medicamentos', label: 'Medicamentos', essential: true },
    { key: 'indicaciones', label: 'Indicaciones generales', essential: true },
    { key: 'proximaCita', label: 'Próxima cita' },
    { key: 'firma', label: 'Firma profesional' },
    { key: 'sello', label: 'Sello' },
    { key: 'avisoLegal', label: 'Aviso o nota legal' },
  ];

  readonly etiquetasEditables: EtiquetaOption[] = [
    { key: 'paciente', label: 'Etiqueta de paciente', placeholder: 'Paciente' },
    { key: 'diagnostico', label: 'Etiqueta de diagnóstico', placeholder: 'Diagnóstico' },
    { key: 'medicamentos', label: 'Etiqueta de medicamentos', placeholder: 'Medicamentos' },
    { key: 'indicaciones', label: 'Etiqueta de indicaciones', placeholder: 'Indicaciones' },
    { key: 'proximaCita', label: 'Etiqueta de próxima cita', placeholder: 'Próxima cita' },
    { key: 'firma', label: 'Etiqueta de firma', placeholder: 'Firma del profesional' },
    { key: 'avisoLegal', label: 'Etiqueta de aviso legal', placeholder: 'Aviso legal' },
  ];

  readonly tabs: PlantillaTabItem[] = [
    {
      id: 'datos',
      label: 'Datos profesionales',
      icon: 'person-outline',
      description: 'Estos datos se obtienen automáticamente de tu perfil.',
    },
    {
      id: 'identidad',
      label: 'Identidad visual',
      icon: 'color-palette-outline',
      description: 'Logo, colores y tipografía de la receta.',
    },
    {
      id: 'distribucion',
      label: 'Distribución',
      icon: 'grid-outline',
      description: 'Orden y espaciado de las secciones de la hoja.',
    },
    {
      id: 'pie',
      label: 'Firma y pie de página',
      icon: 'create-outline',
      description: 'Firma visual, sello y datos al pie de la receta.',
    },
  ];

  private datosOriginales: DatosProfesionalesPlantilla = this.createEmptyDatos();
  private mostrarOriginal: VisibilidadDatosPlantilla = this.createDefaultVisibilidad();
  private identidadOriginal: IdentidadVisualPlantilla = this.createDefaultIdentidad();
  private distribucionOriginal: DistribucionPlantilla = this.createDefaultDistribucion();
  private pieOriginal: PieFirmaPlantilla = this.createDefaultPie();

  constructor(
    private navCtrl: NavController,
    private perfilApi: PerfilApiService,
    private plantillaApi: PlantillaRecetasApiService,
    private toastCtrl: ToastController,
  ) {}

  ngOnInit(): void {
    void this.cargarInicial();
  }

  ionViewWillEnter(): void {
    if (!this.cargaInicialHecha || this.cargandoDatos) {
      return;
    }
    // Al volver de Mi perfil: refrescar valores sin pisar la config visual no guardada.
    void this.refrescarDatosProfesionales();
  }

  get accionesBloqueadas(): boolean {
    return this.cargandoDatos || this.guardando || this.restableciendo || this.isAnyAssetBusy();
  }

  isAnyAssetBusy(): boolean {
    return (['logo', 'firma', 'sello'] as const).some(tipo => this.slotOf(tipo).busy);
  }

  /** Cambios de assets o eliminación diferida (los File no están en un FormGroup). */
  get hayCambiosPendientes(): boolean {
    return this.existenAssetsPendientes();
  }

  assetStatusLabel(tipo: PrescriptionAssetType): string {
    const slot = this.slotOf(tipo);
    switch (slot.state) {
      case 'selected':
        return 'Cambio pendiente';
      case 'requesting-url':
        return 'Generando URL…';
      case 'uploading':
        return 'Subiendo a almacenamiento…';
      case 'registering':
        return 'Registrando archivo…';
      case 'deleting':
        return 'Eliminando…';
      case 'success':
        return 'Listo';
      case 'error':
        return slot.errorMessage || 'Error';
      default:
        if (slot.removeRequested) return 'Cambio pendiente';
        return '';
    }
  }

  tieneCambioAssetPendiente(tipo: PrescriptionAssetType): boolean {
    const slot = this.slotOf(tipo);
    return !!slot.pendingFile || slot.removeRequested || slot.state === 'selected';
  }

  /** Solo abre el selector; nunca sube al instante. */
  primaryAssetActionLabel(tipo: PrescriptionAssetType): string {
    if (this.assetPreviewSrc(tipo) || this.slotOf(tipo).current) {
      return 'Cambiar imagen';
    }
    return tipo === 'firma'
      ? 'Seleccionar firma'
      : tipo === 'sello'
        ? 'Seleccionar sello'
        : 'Seleccionar imagen';
  }

  /**
   * Fuente única de preview: local pendiente → asset del backend → null.
   * No usa configuracion.identidad.logo_url ni pie.*_url.
   */
  assetPreviewSrc(tipo: PrescriptionAssetType): string | null {
    const slot = this.slotOf(tipo);
    if (slot.removeRequested) return null;
    return slot.localPreviewUrl ?? slot.current?.downloadUrl ?? null;
  }

  get logoPreviewSrc(): string | null {
    return this.assetPreviewSrc('logo');
  }

  get selloPreviewSrc(): string | null {
    return this.assetPreviewSrc('sello');
  }

  get firmaPreviewSrc(): string | null {
    return this.assetPreviewSrc('firma');
  }

  private slotOf(tipo: PrescriptionAssetType): AssetSlotUi {
    if (tipo === 'logo') return this.logoState;
    if (tipo === 'sello') return this.selloState;
    return this.firmaState;
  }

  private existenAssetsPendientes(): boolean {
    return (['logo', 'sello', 'firma'] as const).some(tipo => {
      const slot = this.slotOf(tipo);
      return !!slot.pendingFile || !!slot.pendingRegister || slot.removeRequested;
    });
  }

  /** Campos relevantes faltantes para advertencia suave. */
  get datosFaltantes(): string[] {
    const faltantes: string[] = [];
    if (!this.clean(this.datos.cedulaProfesional)) {
      faltantes.push('Cédula profesional');
    }
    if (!this.clean(this.datos.direccionConsultorio)) {
      faltantes.push('Dirección del consultorio');
    }
    return faltantes;
  }

  get tieneDatosFaltantes(): boolean {
    return this.datosFaltantes.length > 0;
  }

  displayValue(value: string | null | undefined): string {
    const text = this.clean(value);
    return text || 'Sin registrar';
  }

  hasValue(value: string | null | undefined): boolean {
    return !!this.clean(value);
  }

  ngOnDestroy(): void {
    this.revokeAllLocalPreviews();
  }

  get activeTabMeta(): PlantillaTabItem {
    return this.tabs.find(tab => tab.id === this.activeTab) ?? this.tabs[0];
  }

  get colorPrincipal(): string {
    return this.colores.find(c => c.id === this.identidad.colorId)?.hex ?? this.colores[1].hex;
  }

  get colorPrincipalLabel(): string {
    return this.colores.find(c => c.id === this.identidad.colorId)?.label ?? 'Índigo';
  }

  get previewNombre(): string {
    return this.visibleText(this.mostrar.nombre, this.datos.nombre);
  }

  get previewEspecialidad(): string {
    return this.visibleText(this.mostrar.especialidad, this.datos.especialidad);
  }

  get previewCedula(): string {
    const value = this.clean(this.datos.cedulaProfesional);
    if (!this.mostrar.cedulaProfesional || !value) return '';
    return `Céd. Prof. ${value}`;
  }

  get previewTelefonoProfesional(): string {
    return this.visibleText(this.mostrar.telefonoProfesional, this.datos.telefonoProfesional);
  }

  get previewEmail(): string {
    return this.visibleText(this.mostrar.email, this.datos.email);
  }

  get previewConsultorio(): string {
    return this.visibleText(this.mostrar.nombreConsultorio, this.datos.nombreConsultorio);
  }

  get previewTelefonoConsultorio(): string {
    return this.visibleText(this.mostrar.telefonoConsultorio, this.datos.telefonoConsultorio);
  }

  get previewDireccionConsultorio(): string {
    return this.visibleText(this.mostrar.direccionConsultorio, this.datos.direccionConsultorio);
  }

  get tieneDatosIzquierda(): boolean {
    return !!(
      this.previewNombre ||
      this.previewEspecialidad ||
      this.previewCedula ||
      this.previewTelefonoProfesional ||
      this.previewEmail ||
      this.identidad.mostrarLogo
    );
  }

  get tieneDatosDerecha(): boolean {
    return !!(
      this.previewConsultorio ||
      this.previewDireccionConsultorio ||
      this.previewTelefonoConsultorio
    );
  }

  get mostrarSeparadorEncabezado(): boolean {
    if (this.identidad.separador === 'ninguno') return false;
    return this.tieneDatosIzquierda || this.tieneDatosDerecha;
  }

  get etiquetaPaciente(): string {
    return this.etiquetaSegura(this.distribucion.etiquetas.paciente, 'Paciente');
  }

  get etiquetaDiagnostico(): string {
    return this.etiquetaSegura(this.distribucion.etiquetas.diagnostico, 'Diagnóstico');
  }

  get etiquetaMedicamentos(): string {
    return this.etiquetaSegura(this.distribucion.etiquetas.medicamentos, 'Medicamentos');
  }

  get etiquetaIndicaciones(): string {
    return this.etiquetaSegura(this.distribucion.etiquetas.indicaciones, 'Indicaciones');
  }

  get etiquetaProximaCita(): string {
    return this.etiquetaSegura(this.distribucion.etiquetas.proximaCita, 'Próxima cita');
  }

  get etiquetaFirma(): string {
    return this.etiquetaSegura(this.distribucion.etiquetas.firma, 'Firma del profesional');
  }

  get etiquetaAvisoLegal(): string {
    return this.etiquetaSegura(this.distribucion.etiquetas.avisoLegal, 'Aviso legal');
  }

  get previewTextoPie(): string {
    return this.sanitizeTextoPie(this.pie.textoPie);
  }

  get previewFirmaNombre(): string {
    if (!this.pie.mostrarNombreBajoFirma) return '';
    return this.clean(this.datos.nombre);
  }

  get previewFirmaEspecialidad(): string {
    if (!this.pie.mostrarEspecialidadBajoFirma) return '';
    return this.clean(this.datos.especialidad);
  }

  get previewFirmaCedula(): string {
    if (!this.pie.mostrarCedulaBajoFirma) return '';
    const value = this.clean(this.datos.cedulaProfesional);
    return value ? `Céd. Prof. ${value}` : '';
  }

  get previewPieTelefono(): string {
    if (!this.pie.mostrarTelefono) return '';
    return this.clean(this.datos.telefonoConsultorio) || this.clean(this.datos.telefonoProfesional);
  }

  get previewPieCorreo(): string {
    if (!this.pie.mostrarCorreo) return '';
    return this.clean(this.datos.email);
  }

  get previewPieDireccion(): string {
    if (!this.pie.mostrarDireccion) return '';
    return this.clean(this.datos.direccionConsultorio);
  }

  get previewFechaGeneracion(): string {
    if (!this.pie.mostrarFechaGeneracion) return '';
    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date());
  }

  get tieneBloqueFirmaPie(): boolean {
    return !!(
      this.distribucion.secciones.firma ||
      this.distribucion.secciones.sello ||
      (this.distribucion.secciones.avisoLegal && this.previewTextoPie) ||
      this.tieneContactoPie ||
      this.tieneMetaPie
    );
  }

  get tieneDatosBajoFirma(): boolean {
    return !!(this.previewFirmaNombre || this.previewFirmaEspecialidad || this.previewFirmaCedula);
  }

  get tieneContactoPie(): boolean {
    return !!(this.previewPieTelefono || this.previewPieCorreo || this.previewPieDireccion);
  }

  get tieneMetaPie(): boolean {
    return !!(this.pie.mostrarNumeroPagina || this.previewFechaGeneracion);
  }

  setTab(tab: PlantillaTab): void {
    this.activeTab = tab;
  }

  onTextoPieChange(value: string | null | undefined): void {
    this.pie.textoPie = this.sanitizeTextoPie(value);
  }

  seleccionarFormato(formato: FormatoReceta): void {
    this.distribucion.formato = formato;
  }

  seleccionarLayout(layout: LayoutDistribucion): void {
    this.distribucion.layout = layout;
  }

  seleccionarEspaciado(espaciado: EspaciadoPlantilla): void {
    this.distribucion.espaciado = espaciado;
  }

  seleccionarTamanoTexto(tamano: TamanoTextoPlantilla): void {
    this.distribucion.tamanoTexto = tamano;
  }

  onEtiquetaChange(key: keyof EtiquetasPlantilla, value: string | null | undefined): void {
    this.distribucion.etiquetas[key] = this.sanitizeEtiqueta(value);
  }

  seleccionarColor(colorId: string): void {
    this.identidad.colorId = colorId;
  }

  seleccionarEncabezado(estilo: EstiloEncabezado): void {
    this.identidad.encabezado = estilo;
  }

  seleccionarTipografia(tipo: TipografiaPlantilla): void {
    this.identidad.tipografia = tipo;
  }

  seleccionarSeparador(tipo: SeparadorPlantilla): void {
    this.identidad.separador = tipo;
  }

  triggerLogoPicker(): void {
    this.openAssetPicker('logo');
  }

  triggerFirmaPicker(): void {
    this.openAssetPicker('firma');
  }

  triggerSelloPicker(): void {
    this.openAssetPicker('sello');
  }

  openAssetPicker(tipo: PrescriptionAssetType): void {
    if (this.accionesBloqueadas || this.slotOf(tipo).busy) return;
    const input =
      tipo === 'logo' ? this.logoInput : tipo === 'firma' ? this.firmaInput : this.selloInput;
    input?.nativeElement?.click();
  }

  onLogoSelected(event: Event): void {
    void this.onAssetFileSelected('logo', event);
  }

  onFirmaSelected(event: Event): void {
    void this.onAssetFileSelected('firma', event);
  }

  onSelloSelected(event: Event): void {
    void this.onAssetFileSelected('sello', event);
  }

  async onAssetFileSelected(tipo: PrescriptionAssetType, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.slotOf(tipo).busy || this.guardando) return;

    const validation = validatePrescriptionAssetFile(tipo, file);
    if (!validation.ok) {
      this.slotOf(tipo).state = 'error';
      this.slotOf(tipo).errorMessage = validation.message;
      await this.presentToast(validation.message, 'danger');
      return;
    }

    const applySelection = (): void => {
      const slot = this.slotOf(tipo);
      this.revokeBlobUrl(slot.localPreviewUrl);
      slot.localPreviewUrl = URL.createObjectURL(file);
      slot.pendingFile = file;
      slot.pendingRegister = null;
      slot.removeRequested = false;
      slot.state = 'selected';
      slot.errorMessage = null;
      // current se conserva hasta Guardar plantilla.
      if (tipo === 'logo') this.identidad.mostrarLogo = true;
      if (tipo === 'firma') this.distribucion.secciones.firma = true;
      if (tipo === 'sello') this.distribucion.secciones.sello = true;
    };

    if (this.slotOf(tipo).current) {
      this.openConfirm(
        {
          title: `Reemplazar ${tipo}`,
          message: `Ya existe un ${tipo}. El nuevo archivo se guardará al pulsar «Guardar plantilla».`,
          confirmLabel: 'Continuar',
          cancelLabel: 'Cancelar',
          variant: 'primary',
          icon: 'image-outline',
        },
        () => applySelection(),
      );
      return;
    }

    applySelection();
  }

  /** Tras registro exitoso durante Guardar: current = asset; revoca preview local. */
  private applyRegisteredAsset(tipo: PrescriptionAssetType, asset: PlantillaRecetaAsset): void {
    const slot = this.slotOf(tipo);
    this.revokeBlobUrl(slot.localPreviewUrl);
    slot.localPreviewUrl = null;
    slot.pendingFile = null;
    slot.pendingRegister = null;
    slot.removeRequested = false;
    slot.current = asset;
    slot.state = 'success';
    if (tipo === 'logo') this.logoRefreshAttempted = false;
    if (tipo === 'firma') this.firmaRefreshAttempted = false;
    if (tipo === 'sello') this.selloRefreshAttempted = false;
  }

  eliminarLogo(): void {
    this.solicitarEliminarAsset('logo');
  }

  eliminarFirma(): void {
    this.solicitarEliminarAsset('firma');
  }

  eliminarSello(): void {
    this.solicitarEliminarAsset('sello');
  }

  /** Cancela selección local / removeRequested y restaura asset guardado. */
  cancelarAssetChanges(tipo: PrescriptionAssetType): void {
    const slot = this.slotOf(tipo);
    this.revokeBlobUrl(slot.localPreviewUrl);
    slot.localPreviewUrl = null;
    slot.pendingFile = null;
    slot.pendingRegister = null;
    slot.removeRequested = false;
    slot.state = 'idle';
    slot.errorMessage = null;
    this.clearFileInput(tipo);
  }

  solicitarEliminarAsset(tipo: PrescriptionAssetType): void {
    const slot = this.slotOf(tipo);
    if (slot.busy || this.guardando) return;
    if (!slot.current && !slot.localPreviewUrl && !slot.pendingFile) {
      return;
    }

    this.openConfirm(
      {
        title: `Eliminar ${tipo}`,
        message: slot.current
          ? `¿Eliminar el ${tipo}? El cambio se aplicará al pulsar «Guardar plantilla».`
          : `¿Descartar la imagen seleccionada?`,
        confirmLabel: 'Eliminar',
        cancelLabel: 'Cancelar',
        variant: 'danger',
        icon: 'trash-outline',
      },
      () => {
        this.marcarEliminacionAsset(tipo);
      },
    );
  }

  /** Solo marca eliminación o limpia selección local; DELETE ocurre en Guardar. */
  private marcarEliminacionAsset(tipo: PrescriptionAssetType): void {
    const slot = this.slotOf(tipo);
    if (slot.busy) return;

    // Selección pendiente (aún no guardada): descartar y restaurar current.
    if (slot.pendingFile || slot.localPreviewUrl) {
      this.revokeBlobUrl(slot.localPreviewUrl);
      slot.localPreviewUrl = null;
      slot.pendingFile = null;
      slot.pendingRegister = null;
      slot.removeRequested = false;
      slot.state = 'idle';
      slot.errorMessage = null;
      this.clearFileInput(tipo);
      return;
    }

    if (!slot.current) return;

    // Asset guardado: diferir DELETE; ocultar preview.
    slot.removeRequested = true;
    slot.state = 'selected';
    slot.errorMessage = null;
  }

  volverAMiCuenta(): void {
    this.navCtrl.back();
  }

  irAMiPerfil(): void {
    this.navCtrl.navigateForward('/dashboard/perfil');
  }

  restablecer(): void {
    if (this.accionesBloqueadas) return;
    this.openConfirm(
      {
        title: 'Restablecer plantilla',
        message:
          '¿Quieres restablecer la plantilla predeterminada? Perderás la configuración personalizada actual.',
        confirmLabel: 'Restablecer',
        cancelLabel: 'Cancelar',
        variant: 'danger',
        icon: 'refresh-outline',
      },
      () => {
        void this.ejecutarRestablecer();
      }
    );
  }

  async guardarPlantilla(): Promise<void> {
    if (this.guardando || this.restableciendo || this.cargandoDatos) return;

    if (!this.validarConfiguracion()) {
      await this.presentToast('Revisa la configuración de la plantilla antes de guardar.', 'danger');
      return;
    }

    this.guardando = true;
    try {
      await this.procesarAssetsPendientes();

      if (this.existenAssetsPendientes()) {
        throw new Error('PENDING_ASSETS_REMAIN');
      }

      const config = this.buildConfigFromUi();
      await this.plantillaApi.saveMiPlantilla(config);

      // GET fresco: nuevas downloadUrl firmadas; no cache.
      const fresh = await this.plantillaApi.getMiPlantilla();
      this.applyPlantillaResponse(fresh);
      this.applyProfesionalToUi(this.perfilBase);
      this.limpiarEstadosPendientesTrasGuardado();
      this.snapshotEstadoActual();

      if (this.existenAssetsPendientes()) {
        throw new Error('PENDING_ASSETS_REMAIN');
      }

      await this.presentToast('Plantilla guardada correctamente.', 'success');
    } catch (error) {
      await this.presentToast(this.mensajeErrorGuardado(error), 'danger');
    } finally {
      this.guardando = false;
    }
  }

  /**
   * Eliminaciones y subidas pendientes (logo → sello → firma), en secuencia.
   * No muestra toast de éxito; eso ocurre solo al terminar Guardar plantilla.
   */
  private async procesarAssetsPendientes(): Promise<void> {
    const tipos: PrescriptionAssetType[] = ['logo', 'sello', 'firma'];
    const necesitaOps = tipos.some(tipo => {
      const slot = this.slotOf(tipo);
      return !!slot.pendingFile || !!slot.pendingRegister || (slot.removeRequested && !!slot.current);
    });
    if (!necesitaOps) return;

    const plantillaId = await this.ensurePlantillaId();

    for (const tipo of tipos) {
      await this.procesarOperacionAsset(plantillaId, tipo);
    }
  }

  private async procesarOperacionAsset(
    plantillaId: number,
    tipo: PrescriptionAssetType,
  ): Promise<void> {
    const slot = this.slotOf(tipo);

    // DELETE diferido (solo si no hay archivo nuevo que reemplace vía register).
    if (slot.removeRequested && slot.current && !slot.pendingFile && !slot.pendingRegister) {
      slot.busy = true;
      slot.state = 'deleting';
      slot.errorMessage = null;
      try {
        await this.plantillaApi.deleteAsset(plantillaId, tipo);
        slot.current = null;
        slot.removeRequested = false;
        slot.state = 'idle';
      } catch (error) {
        slot.state = 'error';
        slot.errorMessage = this.assetErrorMessage(error);
        throw this.wrapAssetSaveError(tipo, error);
      } finally {
        slot.busy = false;
      }
      return;
    }

    // Reintento de register tras PUT exitoso previo.
    if (slot.pendingRegister && !slot.pendingFile) {
      slot.busy = true;
      slot.state = 'registering';
      slot.errorMessage = null;
      try {
        const asset = await this.plantillaApi.registerAsset(
          plantillaId,
          tipo,
          slot.pendingRegister,
        );
        this.applyRegisteredAsset(tipo, asset);
        this.clearFileInput(tipo);
      } catch (error) {
        slot.state = 'error';
        slot.errorMessage = this.assetErrorMessage(error);
        throw this.wrapAssetSaveError(tipo, error);
      } finally {
        slot.busy = false;
      }
      return;
    }

    if (slot.pendingFile) {
      await this.subirAssetPendiente(plantillaId, tipo);
    }
  }

  /**
   * upload-url → PUT R2 → register. No construye objectKey; no envía idProfesional.
   */
  private async subirAssetPendiente(
    plantillaId: number,
    tipo: PrescriptionAssetType,
  ): Promise<PlantillaRecetaAsset> {
    const slot = this.slotOf(tipo);
    if (!slot.pendingFile) {
      throw new Error('PENDING_ASSETS_REMAIN');
    }

    slot.busy = true;
    slot.errorMessage = null;
    try {
      slot.state = 'requesting-url';
      let upload;
      try {
        upload = await this.plantillaApi.getAssetUploadUrl(plantillaId, tipo, {
          nombreOriginal: slot.pendingFile.name,
          mimeType: slot.pendingFile.type,
          tamanoBytes: slot.pendingFile.size,
        });
      } catch (error) {
        throw this.mapAssetError(error, 'UPLOAD_URL_UNAVAILABLE');
      }

      slot.state = 'uploading';
      try {
        await this.plantillaApi.putAssetToR2(
          upload.uploadUrl,
          slot.pendingFile,
          slot.pendingFile.type,
        );
      } catch {
        throw new Error('R2_UPLOAD_FAILED');
      }

      const registerRequest: AssetRegisterRequest = {
        nombreOriginal: slot.pendingFile.name,
        mimeType: slot.pendingFile.type,
        tamanoBytes: slot.pendingFile.size,
        objectKey: upload.objectKey,
        nombreStorage: upload.nombreStorage,
        bucketName: upload.bucketName,
      };
      slot.pendingRegister = registerRequest;

      slot.state = 'registering';
      let asset: PlantillaRecetaAsset;
      try {
        asset = await this.plantillaApi.registerAsset(plantillaId, tipo, registerRequest);
      } catch (error) {
        throw this.mapAssetError(error, 'REGISTER_FAILED');
      }

      this.applyRegisteredAsset(tipo, asset);
      this.clearFileInput(tipo);
      return asset;
    } catch (error) {
      slot.state = 'error';
      slot.errorMessage = this.assetErrorMessage(error);
      throw this.wrapAssetSaveError(tipo, error);
    } finally {
      slot.busy = false;
    }
  }

  private wrapAssetSaveError(tipo: PrescriptionAssetType, error: unknown): Error {
    const label = tipo === 'logo' ? 'logotipo' : tipo;
    const detail = this.assetErrorMessage(error);
    return new Error(`No fue posible guardar el ${label}. ${detail}`);
  }

  private mensajeErrorGuardado(error: unknown): string {
    if (error instanceof Error) {
      if (error.message === 'PENDING_ASSETS_REMAIN') {
        return 'Existen imágenes pendientes que no fueron procesadas. Inténtalo nuevamente.';
      }
      if (error.message.startsWith('No fue posible guardar')) {
        return error.message;
      }
    }
    return mapApiError(error).userMessage;
  }

  private limpiarEstadosPendientesTrasGuardado(): void {
    (['logo', 'sello', 'firma'] as const).forEach(tipo => {
      const slot = this.slotOf(tipo);
      this.revokeBlobUrl(slot.localPreviewUrl);
      slot.localPreviewUrl = null;
      slot.pendingFile = null;
      slot.pendingRegister = null;
      slot.removeRequested = false;
      slot.errorMessage = null;
      if (slot.state === 'success' || slot.state === 'selected' || slot.state === 'error') {
        slot.state = 'idle';
      }
    });
  }

  onConfirmConfirmed(): void {
    this.confirmCallback?.();
    this.confirmConfig = null;
    this.confirmCallback = null;
  }

  onConfirmCancelled(): void {
    this.confirmConfig = null;
    this.confirmCallback = null;
  }

  private openConfirm(config: ConfirmDialogConfig, onConfirm: () => void): void {
    this.confirmConfig = config;
    this.confirmCallback = onConfirm;
  }

  private async ejecutarRestablecer(): Promise<void> {
    if (this.guardando || this.restableciendo || this.cargandoDatos) return;
    this.restableciendo = true;
    try {
      // Descartar pendientes locales sin subir ni DELETE.
      (['logo', 'sello', 'firma'] as const).forEach(tipo => this.cancelarAssetChanges(tipo));

      const reset = await this.plantillaApi.resetMiPlantilla();
      this.applyPlantillaResponse(reset);
      this.applyProfesionalToUi(this.perfilBase);
      this.snapshotEstadoActual();
      this.activeTab = 'datos';
      await this.presentToast('Plantilla restablecida a la predeterminada.', 'success');
    } catch (error) {
      await this.presentToast(mapApiError(error).userMessage, 'danger');
    } finally {
      this.restableciendo = false;
    }
  }

  private async cargarInicial(): Promise<void> {
    this.cargandoDatos = true;
    this.logoRefreshAttempted = false;
    this.firmaRefreshAttempted = false;
    this.selloRefreshAttempted = false;
    try {
      const [plantilla, perfil] = await Promise.all([
        this.plantillaApi.getMiPlantilla(),
        firstValueFrom(this.perfilApi.obtenerMiPerfil()),
      ]);

      this.perfilBase = this.mapProfessionalToDatos(
        this.plantillaApi.mapPerfilToProfessional(perfil),
      );
      // applyPlantillaResponse asigna logo/sello/firma desde response.*; no usa logo_url.
      this.applyPlantillaResponse(plantilla);
      this.applyProfesionalToUi(this.perfilBase);
      this.snapshotEstadoActual();
      this.cargaInicialHecha = true;
    } catch (error) {
      this.datos = this.createEmptyDatos();
      this.perfilBase = this.createEmptyDatos();
      this.applyPlantillaResponse({
        id_plantilla_receta: null,
        id_profesional: null,
        es_predeterminada: true,
        configuracion: createDefaultPlantillaConfig(),
        logo: null,
        sello: null,
        firma: null,
      });
      this.snapshotEstadoActual();
      this.cargaInicialHecha = true;
      await this.presentToast(mapApiError(error).userMessage, 'danger');
    } finally {
      this.cargandoDatos = false;
    }
  }

  /** Refresca solo datos de Mi perfil (conserva switches y apariencia locales). */
  private async refrescarDatosProfesionales(): Promise<void> {
    try {
      const perfil = await firstValueFrom(this.perfilApi.obtenerMiPerfil());
      const mapped = this.plantillaApi.mapPerfilToProfessional(perfil);
      this.perfilBase = this.mapProfessionalToDatos(mapped);
      this.applyProfesionalToUi(this.perfilBase);
    } catch {
      // Silencioso: conservar últimos datos visibles
    }
  }

  private mapProfessionalToDatos(profesional: {
    nombreCompleto?: string;
    especialidad?: string;
    cedulaProfesional?: string;
    correoElectronico?: string;
    telefono?: string;
    nombreConsultorio?: string;
    telefonoConsultorio?: string;
    direccionConsultorio?: string;
  }): DatosProfesionalesPlantilla {
    return {
      nombre: this.clean(profesional.nombreCompleto),
      especialidad: this.clean(profesional.especialidad),
      cedulaProfesional: this.clean(profesional.cedulaProfesional),
      telefonoProfesional: this.clean(profesional.telefono),
      email: this.clean(profesional.correoElectronico),
      nombreConsultorio: this.clean(profesional.nombreConsultorio),
      telefonoConsultorio: this.clean(profesional.telefonoConsultorio),
      direccionConsultorio: this.clean(profesional.direccionConsultorio),
    };
  }

  private applyProfesionalToUi(perfil: DatosProfesionalesPlantilla): void {
    this.datos = { ...perfil };
  }

  /**
   * Aplica respuesta completa del backend: configuración + assets.
   * No usa configuracion.identidad.logo_url / pie.*_url para preview.
   */
  applyPlantillaResponse(response: PlantillaRecetasDto): void {
    this.idPlantillaReceta = response.id_plantilla_receta;
    this.esPlantillaPredeterminada = response.es_predeterminada;
    this.applyConfigToUi(response.configuracion);
    this.applyAssetFromResponse('logo', response.logo ?? null);
    this.applyAssetFromResponse('sello', response.sello ?? null);
    this.applyAssetFromResponse('firma', response.firma ?? null);
  }

  private applyAssetFromResponse(
    tipo: PrescriptionAssetType,
    asset: PlantillaRecetaAsset | null,
  ): void {
    const slot = this.slotOf(tipo);
    this.revokeBlobUrl(slot.localPreviewUrl);
    slot.current = asset;
    slot.pendingFile = null;
    slot.localPreviewUrl = null;
    slot.removeRequested = false;
    slot.pendingRegister = null;
    slot.errorMessage = null;
    slot.state = 'idle';
    slot.busy = false;
  }

  private async ensurePlantillaId(): Promise<number> {
    if (this.idPlantillaReceta) return this.idPlantillaReceta;
    // Crear plantilla sin pisar pendingFile / previews locales.
    const saved = await this.plantillaApi.saveMiPlantilla(this.buildConfigFromUi());
    this.idPlantillaReceta = saved.id_plantilla_receta;
    this.esPlantillaPredeterminada = saved.es_predeterminada;
    if (!this.idPlantillaReceta) {
      throw new Error('PLANTILLA_ID_REQUIRED');
    }
    return this.idPlantillaReceta;
  }

  /** Si la preview falla (URL expirada), recarga plantilla fresca una sola vez. */
  async onAssetPreviewError(tipo: PrescriptionAssetType): Promise<void> {
    const attempted =
      tipo === 'logo'
        ? this.logoRefreshAttempted
        : tipo === 'firma'
          ? this.firmaRefreshAttempted
          : this.selloRefreshAttempted;
    if (attempted || this.slotOf(tipo).busy) return;

    if (tipo === 'logo') this.logoRefreshAttempted = true;
    if (tipo === 'firma') this.firmaRefreshAttempted = true;
    if (tipo === 'sello') this.selloRefreshAttempted = true;

    await this.reloadTemplate();
  }

  async onLogoImageError(): Promise<void> {
    await this.onAssetPreviewError('logo');
  }

  private async reloadTemplate(): Promise<void> {
    try {
      const plantilla = await this.plantillaApi.getMiPlantilla();
      this.applyPlantillaResponse(plantilla);
      this.applyProfesionalToUi(this.perfilBase);
    } catch {
      // Conservar estado actual
    }
  }

  private mapAssetError(error: unknown, fallbackCode: string): Error {
    if (error instanceof Error) {
      if (
        error.message === 'UPLOAD_URL_UNAVAILABLE' ||
        error.message === 'R2_UPLOAD_FAILED' ||
        error.message === 'REGISTER_FAILED' ||
        error.message === 'SESSION_EXPIRED' ||
        error.message === 'ASSET_NOT_FOUND' ||
        error.message === 'PLANTILLA_ID_REQUIRED'
      ) {
        return error;
      }
    }
    const mapped = mapApiError(error);
    if (mapped.status === 401 || mapped.status === 403) {
      return new Error('SESSION_EXPIRED');
    }
    if (mapped.status === 404) {
      return new Error('ASSET_NOT_FOUND');
    }
    return new Error(fallbackCode);
  }

  private assetErrorMessage(error: unknown): string {
    const code = error instanceof Error ? error.message : '';
    switch (code) {
      case 'UPLOAD_URL_UNAVAILABLE':
        return 'No fue posible generar la URL de carga.';
      case 'R2_UPLOAD_FAILED':
        return 'Error al subir el archivo al almacenamiento.';
      case 'REGISTER_FAILED':
        return 'Error al registrar el archivo. Puedes reintentar el registro.';
      case 'SESSION_EXPIRED':
        return 'Sesión expirada. Inicia sesión nuevamente.';
      case 'ASSET_NOT_FOUND':
        return 'Archivo no encontrado.';
      case 'PLANTILLA_ID_REQUIRED':
        return 'No fue posible preparar la plantilla para subir archivos.';
      default:
        return mapApiError(error).userMessage || 'Ocurrió un error con el archivo.';
    }
  }

  private createAssetSlot(): AssetSlotUi {
    return {
      current: null,
      pendingFile: null,
      localPreviewUrl: null,
      removeRequested: false,
      state: 'idle',
      errorMessage: null,
      pendingRegister: null,
      busy: false,
    };
  }

  private clearFileInput(tipo: PrescriptionAssetType): void {
    const input =
      tipo === 'logo' ? this.logoInput : tipo === 'firma' ? this.firmaInput : this.selloInput;
    if (input?.nativeElement) {
      input.nativeElement.value = '';
    }
  }

  private revokeAllLocalPreviews(): void {
    (['logo', 'firma', 'sello'] as const).forEach(tipo => {
      const slot = this.slotOf(tipo);
      this.revokeBlobUrl(slot.localPreviewUrl);
      slot.localPreviewUrl = null;
    });
  }

  private validarConfiguracion(): boolean {
    this.distribucion.secciones.medicamentos = true;
    this.distribucion.secciones.indicaciones = true;

    if (!this.colores.some(c => c.id === this.identidad.colorId)) {
      return false;
    }

    const etiquetas = Object.values(this.distribucion.etiquetas);
    if (etiquetas.some(v => v.length > this.maxEtiquetaLength)) {
      return false;
    }

    if (this.sanitizeTextoPie(this.pie.textoPie).length > this.maxTextoPieLength) {
      return false;
    }

    return true;
  }

  private buildConfigFromUi(): PlantillaRecetasConfigDto {
    return {
      version: PLANTILLA_RECETAS_CONFIG_VERSION,
      visibilidad: {
        nombre: this.mostrar.nombre,
        especialidad: this.mostrar.especialidad,
        cedula_profesional: this.mostrar.cedulaProfesional,
        telefono_profesional: this.mostrar.telefonoProfesional,
        email: this.mostrar.email,
        nombre_consultorio: this.mostrar.nombreConsultorio,
        telefono_consultorio: this.mostrar.telefonoConsultorio,
        direccion_consultorio: this.mostrar.direccionConsultorio,
      },
      datos_visualizacion: createEmptyDatosVisualizacion(),
      identidad: {
        mostrar_logo: this.identidad.mostrarLogo,
        logo_url: null,
        color_id: this.identidad.colorId,
        encabezado: this.identidad.encabezado,
        tipografia: this.identidad.tipografia,
        separador: this.identidad.separador,
      },
      distribucion: {
        formato: this.distribucion.formato,
        layout: this.distribucion.layout,
        secciones: {
          fecha_emision: this.distribucion.secciones.fechaEmision,
          datos_paciente: this.distribucion.secciones.datosPaciente,
          edad_paciente: this.distribucion.secciones.edadPaciente,
          diagnostico: this.distribucion.secciones.diagnostico,
          medicamentos: true,
          indicaciones: true,
          proxima_cita: this.distribucion.secciones.proximaCita,
          firma: this.distribucion.secciones.firma,
          sello: this.distribucion.secciones.sello,
          aviso_legal: this.distribucion.secciones.avisoLegal,
        },
        etiquetas: {
          paciente: this.sanitizeEtiqueta(this.distribucion.etiquetas.paciente),
          diagnostico: this.sanitizeEtiqueta(this.distribucion.etiquetas.diagnostico),
          medicamentos: this.sanitizeEtiqueta(this.distribucion.etiquetas.medicamentos),
          indicaciones: this.sanitizeEtiqueta(this.distribucion.etiquetas.indicaciones),
          proxima_cita: this.sanitizeEtiqueta(this.distribucion.etiquetas.proximaCita),
          firma: this.sanitizeEtiqueta(this.distribucion.etiquetas.firma),
          aviso_legal: this.sanitizeEtiqueta(this.distribucion.etiquetas.avisoLegal),
        },
        espaciado: this.distribucion.espaciado,
        tamano_texto: this.distribucion.tamanoTexto,
      },
      pie: {
        firma_url: null,
        sello_url: null,
        mostrar_nombre_bajo_firma: this.pie.mostrarNombreBajoFirma,
        mostrar_especialidad_bajo_firma: this.pie.mostrarEspecialidadBajoFirma,
        mostrar_cedula_bajo_firma: this.pie.mostrarCedulaBajoFirma,
        texto_pie: this.sanitizeTextoPie(this.pie.textoPie),
        mostrar_telefono: this.pie.mostrarTelefono,
        mostrar_correo: this.pie.mostrarCorreo,
        mostrar_direccion: this.pie.mostrarDireccion,
        mostrar_numero_pagina: this.pie.mostrarNumeroPagina,
        mostrar_fecha_generacion: this.pie.mostrarFechaGeneracion,
      },
    };
  }

  /** No persiste blob ni URLs firmadas en configuracion. */
  // (logo/sello/firma viven en response.logo|sello|firma)

  private applyConfigToUi(config: PlantillaRecetasConfigDto): void {
    const safe = config ?? createDefaultPlantillaConfig();

    this.mostrar = {
      nombre: safe.visibilidad.nombre,
      especialidad: safe.visibilidad.especialidad,
      cedulaProfesional: safe.visibilidad.cedula_profesional,
      telefonoProfesional: safe.visibilidad.telefono_profesional,
      email: safe.visibilidad.email,
      nombreConsultorio: safe.visibilidad.nombre_consultorio,
      telefonoConsultorio: safe.visibilidad.telefono_consultorio,
      direccionConsultorio: safe.visibilidad.direccion_consultorio,
    };

    // Solo flags/estilo; preview de imagen viene de logoState (response.logo.downloadUrl).
    this.identidad = {
      mostrarLogo: safe.identidad.mostrar_logo,
      logoUrl: null,
      colorId: safe.identidad.color_id,
      encabezado: safe.identidad.encabezado,
      tipografia: safe.identidad.tipografia,
      separador: safe.identidad.separador,
    };

    this.distribucion = {
      formato: safe.distribucion.formato,
      layout: safe.distribucion.layout,
      secciones: {
        fechaEmision: safe.distribucion.secciones.fecha_emision,
        datosPaciente: safe.distribucion.secciones.datos_paciente,
        edadPaciente: safe.distribucion.secciones.edad_paciente,
        diagnostico: safe.distribucion.secciones.diagnostico,
        medicamentos: true,
        indicaciones: true,
        proximaCita: safe.distribucion.secciones.proxima_cita,
        firma: safe.distribucion.secciones.firma,
        sello: safe.distribucion.secciones.sello,
        avisoLegal: safe.distribucion.secciones.aviso_legal,
      },
      etiquetas: {
        paciente: safe.distribucion.etiquetas.paciente,
        diagnostico: safe.distribucion.etiquetas.diagnostico,
        medicamentos: safe.distribucion.etiquetas.medicamentos,
        indicaciones: safe.distribucion.etiquetas.indicaciones,
        proximaCita: safe.distribucion.etiquetas.proxima_cita,
        firma: safe.distribucion.etiquetas.firma,
        avisoLegal: safe.distribucion.etiquetas.aviso_legal,
      },
      espaciado: safe.distribucion.espaciado,
      tamanoTexto: safe.distribucion.tamano_texto,
    };

    this.pie = {
      firmaUrl: null,
      selloUrl: null,
      mostrarNombreBajoFirma: safe.pie.mostrar_nombre_bajo_firma,
      mostrarEspecialidadBajoFirma: safe.pie.mostrar_especialidad_bajo_firma,
      mostrarCedulaBajoFirma: safe.pie.mostrar_cedula_bajo_firma,
      textoPie: safe.pie.texto_pie,
      mostrarTelefono: safe.pie.mostrar_telefono,
      mostrarCorreo: safe.pie.mostrar_correo,
      mostrarDireccion: safe.pie.mostrar_direccion,
      mostrarNumeroPagina: safe.pie.mostrar_numero_pagina,
      mostrarFechaGeneracion: safe.pie.mostrar_fecha_generacion,
    };
  }

  private mergePerfilEnDatosVacios(perfil: DatosProfesionalesPlantilla): void {
    this.datos = {
      nombre: this.datos.nombre || perfil.nombre,
      especialidad: this.datos.especialidad || perfil.especialidad,
      cedulaProfesional: this.datos.cedulaProfesional || perfil.cedulaProfesional,
      telefonoProfesional: this.datos.telefonoProfesional || perfil.telefonoProfesional,
      email: this.datos.email || perfil.email,
      nombreConsultorio: this.datos.nombreConsultorio || perfil.nombreConsultorio,
      telefonoConsultorio: this.datos.telefonoConsultorio || perfil.telefonoConsultorio,
      direccionConsultorio: this.datos.direccionConsultorio || perfil.direccionConsultorio,
    };
  }

  private snapshotEstadoActual(): void {
    this.datosOriginales = { ...this.datos };
    this.mostrarOriginal = { ...this.mostrar };
    this.identidadOriginal = { ...this.identidad };
    this.distribucionOriginal = this.cloneDistribucion(this.distribucion);
    this.pieOriginal = { ...this.pie };
  }

  private toPersistableUrl(url: string | null | undefined): string | null {
    const value = this.clean(url);
    if (!value || value.startsWith('blob:')) return null;
    return value;
  }

  private async presentToast(message: string, color: 'success' | 'danger'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3200,
      color,
      position: 'top',
    });
    await toast.present();
  }

  private revokeBlobUrl(url: string | null | undefined): void {
    if (url?.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }

  private visibleText(enabled: boolean, value: string | null | undefined): string {
    if (!enabled) return '';
    return this.clean(value);
  }

  private clean(value: string | null | undefined): string {
    if (value === null || value === undefined) return '';
    const text = String(value).trim();
    if (!text || text === 'null' || text === 'undefined') return '';
    return text;
  }

  private createEmptyDatos(): DatosProfesionalesPlantilla {
    return {
      nombre: '',
      especialidad: '',
      cedulaProfesional: '',
      telefonoProfesional: '',
      email: '',
      nombreConsultorio: '',
      telefonoConsultorio: '',
      direccionConsultorio: '',
    };
  }

  private createDefaultVisibilidad(): VisibilidadDatosPlantilla {
    return {
      nombre: true,
      especialidad: true,
      cedulaProfesional: true,
      telefonoProfesional: true,
      email: false,
      nombreConsultorio: true,
      telefonoConsultorio: true,
      direccionConsultorio: true,
    };
  }

  private createDefaultIdentidad(): IdentidadVisualPlantilla {
    return {
      mostrarLogo: true,
      logoUrl: null,
      colorId: 'indigo',
      encabezado: 'minimalista',
      tipografia: 'moderna',
      separador: 'sutil',
    };
  }

  private createDefaultDistribucion(): DistribucionPlantilla {
    return {
      formato: 'carta',
      layout: 'clasica',
      secciones: {
        fechaEmision: true,
        datosPaciente: true,
        edadPaciente: true,
        diagnostico: false,
        medicamentos: true,
        indicaciones: true,
        proximaCita: false,
        firma: true,
        sello: false,
        avisoLegal: true,
      },
      etiquetas: {
        paciente: 'Paciente',
        diagnostico: 'Diagnóstico',
        medicamentos: 'Medicamentos',
        indicaciones: 'Indicaciones',
        proximaCita: 'Próxima cita',
        firma: 'Firma del profesional',
        avisoLegal: 'Aviso legal',
      },
      espaciado: 'normal',
      tamanoTexto: 'mediano',
    };
  }

  private cloneDistribucion(source: DistribucionPlantilla): DistribucionPlantilla {
    return {
      ...source,
      secciones: { ...source.secciones },
      etiquetas: { ...source.etiquetas },
    };
  }

  private createDefaultPie(): PieFirmaPlantilla {
    return {
      firmaUrl: null,
      selloUrl: null,
      mostrarNombreBajoFirma: true,
      mostrarEspecialidadBajoFirma: true,
      mostrarCedulaBajoFirma: true,
      textoPie: 'Esta receta es personal y no debe compartirse.',
      mostrarTelefono: true,
      mostrarCorreo: false,
      mostrarDireccion: true,
      mostrarNumeroPagina: false,
      mostrarFechaGeneracion: true,
    };
  }

  private clonePie(source: PieFirmaPlantilla): PieFirmaPlantilla {
    return {
      ...source,
      firmaUrl: null,
      selloUrl: null,
    };
  }

  private etiquetaSegura(value: string | null | undefined, fallback: string): string {
    const cleaned = this.sanitizeEtiqueta(value);
    return cleaned || fallback;
  }

  private sanitizeEtiqueta(value: string | null | undefined): string {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/<[^>]*>/g, '')
      .replace(/[<>&"'`]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, this.maxEtiquetaLength);
  }

  private sanitizeTextoPie(value: string | null | undefined): string {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/<[^>]*>/g, '')
      .replace(/[<>]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, this.maxTextoPieLength);
  }
}
