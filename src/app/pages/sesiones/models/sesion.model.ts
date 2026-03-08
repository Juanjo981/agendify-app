export interface SesionAdjunto {
  name: string;
  type: string;        // MIME type
  size: number;        // bytes
  previewUrl?: string; // object URL for images
}

export interface SesionDto {
  id_sesion: number;
  id_cita: number;
  id_paciente: number;
  nombre_paciente: string;
  apellido_paciente: string;
  fecha_cita: string;       // 'YYYY-MM-DD'
  notas: string;
  adjunto?: SesionAdjunto;
  fecha_creacion: string;   // ISO datetime
}
