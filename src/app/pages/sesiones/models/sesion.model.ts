export type SesionEstatus = 'ABIERTA' | 'CERRADA' | 'CANCELADA' | string;
export type SesionEntidadTipo = 'SESION' | 'PACIENTE' | 'CITA' | 'NOTA_CLINICA';

export interface SesionDto {
  id_sesion: number;
  id_profesional: number;
  id_paciente: number;
  id_cita: number;
  fecha_sesion: string;
  tipo_sesion?: string | null;
  estatus: SesionEstatus;
  resumen?: string | null;
  created_at: string;
  updated_at: string;
  nombre_paciente: string;
  apellido_paciente: string;
}

export interface SesionCreateRequest {
  id_cita: number;
  fecha_sesion?: string;
  tipo_sesion?: string | null;
  resumen?: string | null;
}

export interface SesionUpdateRequest {
  fecha_sesion?: string;
  tipo_sesion?: string | null;
  resumen?: string | null;
}

export interface SesionListParams {
  pacienteId?: number;
  citaId?: number;
  estatus?: string;
  tipoSesion?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface ArchivoAdjuntoDto {
  id_archivo_adjunto: number;
  entidad_tipo: SesionEntidadTipo;
  entidad_id: number;
  nombre_original: string;
  nombre_storage: string;
  mime_type?: string | null;
  extension?: string | null;
  tamano_bytes?: number | null;
  bucket_name: string;
  object_key: string;
  checksum_sha256?: string | null;
  activo?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ArchivoAdjuntoUploadUrlRequest {
  nombre_original: string;
  mime_type: string;
  entidad_tipo: SesionEntidadTipo;
  entidad_id: number;
  tamano_bytes?: number;
}

export interface ArchivoAdjuntoUploadUrlResponse {
  upload_url: string;
  object_key: string;
  bucket_name: string;
  nombre_storage: string;
  expiration: string;
}

export interface ArchivoAdjuntoCreateRequest {
  entidad_tipo: SesionEntidadTipo;
  entidad_id: number;
  nombre_original: string;
  nombre_storage: string;
  mime_type?: string;
  extension?: string;
  tamano_bytes?: number;
  bucket_name: string;
  object_key: string;
  checksum_sha256?: string;
}

export interface ArchivoAdjuntoDownloadUrlResponse {
  download_url: string;
  nombre_original: string;
  mime_type?: string | null;
  expiration: string;
}

export interface SesionArchivoLocal {
  file: File;
  name: string;
  type: string;
  size: number;
  previewUrl?: string;
}

export function getSessionSummary(sesion: Pick<SesionDto, 'resumen'>): string {
  return sesion.resumen?.trim() || '';
}

export function hasTerminalStatus(sesion: Pick<SesionDto, 'estatus'>): boolean {
  return ['CERRADA', 'CANCELADA'].includes(sesion.estatus);
}

export function getFileExtension(fileName: string): string {
  const extension = fileName.split('.').pop()?.trim().toLowerCase();
  return extension || '';
}
