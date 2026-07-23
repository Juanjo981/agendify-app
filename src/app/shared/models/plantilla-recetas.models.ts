export const PLANTILLA_COLORES: ReadonlyArray<{ id: string; label: string; hex: string }> = [
  { id: 'azul', label: 'Azul', hex: '#2563EB' },
  { id: 'indigo', label: 'Índigo', hex: '#3B3F92' },
  { id: 'violeta', label: 'Violeta', hex: '#6D28D9' },
  { id: 'petroleo', label: 'Verde petróleo', hex: '#0F766E' },
  { id: 'grafito', label: 'Gris grafito', hex: '#334155' },
];

export function plantillaColorHex(colorId: string | null | undefined): string {
  return PLANTILLA_COLORES.find(c => c.id === colorId)?.hex ?? '#3B3F92';
}

/** Tipos y contratos API para plantilla de recetas del profesional. */

export type EstiloEncabezadoPlantilla = 'minimalista' | 'franja' | 'dividido';
export type TipografiaPlantilla = 'moderna' | 'clasica' | 'compacta';
export type SeparadorPlantilla = 'ninguno' | 'sutil' | 'color';
export type FormatoRecetaPlantilla = 'carta' | 'media-carta';
export type LayoutDistribucionPlantilla = 'clasica' | 'moderna' | 'compacta';
export type EspaciadoPlantilla = 'compacto' | 'normal' | 'amplio';
export type TamanoTextoPlantilla = 'pequeno' | 'mediano' | 'grande';
export type PrescriptionAssetType = 'logo' | 'sello' | 'firma';

/** @deprecated Prefer PrescriptionAssetType */
export type PlantillaAssetTipo = PrescriptionAssetType;

export type PrescriptionAssetUploadState =
  | 'idle'
  | 'selected'
  | 'requesting-url'
  | 'uploading'
  | 'registering'
  | 'success'
  | 'error'
  | 'deleting';

export const PRESCRIPTION_ASSET_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
] as const;

export type PrescriptionAssetMimeType = (typeof PRESCRIPTION_ASSET_MIME_TYPES)[number];

/** Límites en bytes: logo 3 MB; sello/firma 2 MB. */
export const PRESCRIPTION_ASSET_MAX_BYTES: Readonly<Record<PrescriptionAssetType, number>> = {
  logo: 3 * 1024 * 1024,
  sello: 2 * 1024 * 1024,
  firma: 2 * 1024 * 1024,
};

export interface PrescriptionAsset {
  archivoId: number;
  nombreOriginal: string;
  mimeType: string;
  downloadUrl: string;
  expiration: string;
}

/** Asset de plantilla con URL firmada temporal (no vive en configuracion). */
export interface PlantillaRecetaAsset {
  archivoId: number;
  tipo: PrescriptionAssetType;
  nombreOriginal: string;
  mimeType: string;
  downloadUrl: string;
  expiration: string;
}

export interface AssetUiState {
  current: PlantillaRecetaAsset | null;
  pendingFile: File | null;
  localPreviewUrl: string | null;
  removeRequested: boolean;
}

export function createEmptyAssetUiState(): AssetUiState {
  return {
    current: null,
    pendingFile: null,
    localPreviewUrl: null,
    removeRequested: false,
  };
}

export interface AssetUploadUrlRequest {
  nombreOriginal: string;
  mimeType: string;
  tamanoBytes: number;
}

export interface AssetUploadUrlResponse {
  uploadUrl: string;
  objectKey: string;
  bucketName: string;
  nombreStorage: string;
  expiration: string;
}

export interface AssetRegisterRequest {
  nombreOriginal: string;
  mimeType: string;
  tamanoBytes: number;
  /** Eco de la respuesta de upload-url; el frontend no construye la ruta. */
  objectKey: string;
  nombreStorage: string;
  bucketName: string;
}

export type AssetValidationErrorCode = 'format' | 'size';

export function isAllowedPrescriptionAssetMime(mime: string): mime is PrescriptionAssetMimeType {
  return (PRESCRIPTION_ASSET_MIME_TYPES as readonly string[]).includes(mime);
}

export function validatePrescriptionAssetFile(
  tipo: PrescriptionAssetType,
  file: Pick<File, 'type' | 'size'>,
): { ok: true } | { ok: false; code: AssetValidationErrorCode; message: string } {
  if (!isAllowedPrescriptionAssetMime(file.type)) {
    return {
      ok: false,
      code: 'format',
      message: 'Formato no permitido. Usa PNG, JPG o WEBP.',
    };
  }
  const max = PRESCRIPTION_ASSET_MAX_BYTES[tipo];
  if (file.size > max) {
    const mb = max / (1024 * 1024);
    return {
      ok: false,
      code: 'size',
      message: `Archivo demasiado grande. Máximo ${mb} MB para ${tipo}.`,
    };
  }
  return { ok: true };
}

export function isLikelySignedUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.includes('x-amz-signature=') ||
    lower.includes('x-amz-credential=') ||
    lower.includes('signature=') ||
    lower.includes('x-goog-signature=')
  );
}

export interface VisibilidadProfesionalPlantillaDto {
  nombre: boolean;
  especialidad: boolean;
  cedula_profesional: boolean;
  telefono_profesional: boolean;
  email: boolean;
  nombre_consultorio: boolean;
  telefono_consultorio: boolean;
  direccion_consultorio: boolean;
}

/**
 * @deprecated No persistir valores. Fuente de verdad: Mi perfil.
 * Se envía vacío en el PUT por compatibilidad con el backend.
 */
export interface DatosVisualizacionPlantillaDto {
  nombre: string;
  especialidad: string;
  cedula_profesional: string;
  telefono_profesional: string;
  email: string;
  nombre_consultorio: string;
  telefono_consultorio: string;
  direccion_consultorio: string;
}

/** Datos profesionales vivos (siempre desde Mi perfil). */
export interface PrescriptionProfessionalData {
  nombreCompleto?: string;
  especialidad?: string;
  cedulaProfesional?: string;
  correoElectronico?: string;
  telefono?: string;
  nombreConsultorio?: string;
  telefonoConsultorio?: string;
  direccionConsultorio?: string;
  descripcionProfesional?: string;
}

/** Flags de visibilidad + apariencia (sin datos del profesional). */
export interface PrescriptionTemplateConfig {
  mostrarNombreProfesional: boolean;
  mostrarEspecialidad: boolean;
  mostrarCedulaProfesional: boolean;
  mostrarCorreoProfesional: boolean;
  mostrarTelefonoProfesional: boolean;
  mostrarNombreConsultorio: boolean;
  mostrarTelefonoConsultorio: boolean;
  mostrarDireccionConsultorio: boolean;
  colorPrincipal: string;
  estiloEncabezado: string;
}

export interface PrescriptionTemplatePreview {
  profesional: PrescriptionProfessionalData;
  configuracion: PlantillaRecetasConfigDto;
  esPredeterminada?: boolean;
  idPlantillaReceta?: number | null;
  logo?: PlantillaRecetaAsset | null;
  sello?: PlantillaRecetaAsset | null;
  firma?: PlantillaRecetaAsset | null;
}

export function createEmptyDatosVisualizacion(): DatosVisualizacionPlantillaDto {
  return {
    nombre: '',
    especialidad: '',
    cedula_profesional: '',
    telefono_profesional: '',
    email: '',
    nombre_consultorio: '',
    telefono_consultorio: '',
    direccion_consultorio: '',
  };
}

/** Mezcla perfil → config solo para render de preview (nunca para guardar). */
export function mergeProfesionalIntoConfig(
  config: PlantillaRecetasConfigDto,
  profesional: PrescriptionProfessionalData,
): PlantillaRecetasConfigDto {
  return {
    ...config,
    datos_visualizacion: {
      nombre: (profesional.nombreCompleto ?? '').trim(),
      especialidad: (profesional.especialidad ?? '').trim(),
      cedula_profesional: (profesional.cedulaProfesional ?? '').trim(),
      telefono_profesional: (profesional.telefono ?? '').trim(),
      email: (profesional.correoElectronico ?? '').trim(),
      nombre_consultorio: (profesional.nombreConsultorio ?? '').trim(),
      telefono_consultorio: (profesional.telefonoConsultorio ?? '').trim(),
      direccion_consultorio: (profesional.direccionConsultorio ?? '').trim(),
    },
  };
}

export interface IdentidadVisualPlantillaDto {
  mostrar_logo: boolean;
  logo_url: string | null;
  color_id: string;
  encabezado: EstiloEncabezadoPlantilla;
  tipografia: TipografiaPlantilla;
  separador: SeparadorPlantilla;
}

export interface SeccionesContenidoPlantillaDto {
  fecha_emision: boolean;
  datos_paciente: boolean;
  edad_paciente: boolean;
  diagnostico: boolean;
  medicamentos: boolean;
  indicaciones: boolean;
  proxima_cita: boolean;
  firma: boolean;
  sello: boolean;
  aviso_legal: boolean;
}

export interface EtiquetasPlantillaDto {
  paciente: string;
  diagnostico: string;
  medicamentos: string;
  indicaciones: string;
  proxima_cita: string;
  firma: string;
  aviso_legal: string;
}

export interface DistribucionPlantillaDto {
  formato: FormatoRecetaPlantilla;
  layout: LayoutDistribucionPlantilla;
  secciones: SeccionesContenidoPlantillaDto;
  etiquetas: EtiquetasPlantillaDto;
  espaciado: EspaciadoPlantilla;
  tamano_texto: TamanoTextoPlantilla;
}

export interface PieFirmaPlantillaDto {
  firma_url: string | null;
  sello_url: string | null;
  mostrar_nombre_bajo_firma: boolean;
  mostrar_especialidad_bajo_firma: boolean;
  mostrar_cedula_bajo_firma: boolean;
  texto_pie: string;
  mostrar_telefono: boolean;
  mostrar_correo: boolean;
  mostrar_direccion: boolean;
  mostrar_numero_pagina: boolean;
  mostrar_fecha_generacion: boolean;
}

/** Payload JSONB / cuerpo de upsert. */
export interface PlantillaRecetasConfigDto {
  version: number;
  visibilidad: VisibilidadProfesionalPlantillaDto;
  datos_visualizacion: DatosVisualizacionPlantillaDto;
  identidad: IdentidadVisualPlantillaDto;
  distribucion: DistribucionPlantillaDto;
  pie: PieFirmaPlantillaDto;
}

export interface PlantillaRecetasDto {
  id_plantilla_receta: number | null;
  id_profesional: number | null;
  es_predeterminada: boolean;
  configuracion: PlantillaRecetasConfigDto;
  /** Assets con downloadUrl firmada; no usar configuracion.*.*_url para preview. */
  logo?: PlantillaRecetaAsset | null;
  sello?: PlantillaRecetaAsset | null;
  firma?: PlantillaRecetaAsset | null;
  created_at?: string | null;
  updated_at?: string | null;
}

/** Alias del contrato GET/PUT documentado. */
export type PlantillaRecetaResponse = PlantillaRecetasDto;
export type PlantillaRecetaConfiguracion = PlantillaRecetasConfigDto;

export interface PlantillaRecetasUpsertRequest {
  configuracion: PlantillaRecetasConfigDto;
}

/** @deprecated Usar AssetUploadUrlRequest (camelCase en UI/servicio). */
export interface PlantillaAssetUploadUrlRequest {
  tipo: PlantillaAssetTipo;
  nombre_original: string;
  mime_type: string;
  tamano_bytes: number;
}

/** @deprecated Usar AssetUploadUrlResponse. */
export interface PlantillaAssetUploadUrlResponse {
  tipo: PlantillaAssetTipo;
  upload_url: string;
  public_url: string;
  object_key: string;
  expires_at?: string | null;
}

export const PLANTILLA_RECETAS_CONFIG_VERSION = 1;

export function createDefaultPlantillaConfig(): PlantillaRecetasConfigDto {
  return {
    version: PLANTILLA_RECETAS_CONFIG_VERSION,
    visibilidad: {
      nombre: true,
      especialidad: true,
      cedula_profesional: true,
      telefono_profesional: true,
      email: false,
      nombre_consultorio: true,
      telefono_consultorio: true,
      direccion_consultorio: true,
    },
    datos_visualizacion: createEmptyDatosVisualizacion(),
    identidad: {
      mostrar_logo: true,
      logo_url: null,
      color_id: 'indigo',
      encabezado: 'minimalista',
      tipografia: 'moderna',
      separador: 'sutil',
    },
    distribucion: {
      formato: 'carta',
      layout: 'clasica',
      secciones: {
        fecha_emision: true,
        datos_paciente: true,
        edad_paciente: true,
        diagnostico: false,
        medicamentos: true,
        indicaciones: true,
        proxima_cita: false,
        firma: true,
        sello: false,
        aviso_legal: true,
      },
      etiquetas: {
        paciente: 'Paciente',
        diagnostico: 'Diagnóstico',
        medicamentos: 'Medicamentos',
        indicaciones: 'Indicaciones',
        proxima_cita: 'Próxima cita',
        firma: 'Firma del profesional',
        aviso_legal: 'Aviso legal',
      },
      espaciado: 'normal',
      tamano_texto: 'mediano',
    },
    pie: {
      firma_url: null,
      sello_url: null,
      mostrar_nombre_bajo_firma: true,
      mostrar_especialidad_bajo_firma: true,
      mostrar_cedula_bajo_firma: true,
      texto_pie: 'Esta receta es personal y no debe compartirse.',
      mostrar_telefono: true,
      mostrar_correo: false,
      mostrar_direccion: true,
      mostrar_numero_pagina: false,
      mostrar_fecha_generacion: true,
    },
  };
}
