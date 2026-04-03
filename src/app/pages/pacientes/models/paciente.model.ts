// ─── Adjunto ─────────────────────────────────────────────────────────────────

export interface AdjuntoMeta {
  name: string;
  type: string;       // MIME type
  size: number;       // bytes
  previewUrl?: string; // object URL (images only)
}

// ─── Nota clínica ─────────────────────────────────────────────────────────────

export interface NotaDto {
  id_nota: number;
  fecha: string; // ISO date 'YYYY-MM-DD'
  contenido: string;
  adjunto?: AdjuntoMeta;
}

/**
 * Resumen ligero de cita embebido dentro de PacienteDto.
 * Para el modelo completo de cita véase pages/citas/models/cita.model.ts.
 */
export interface CitaResumenDto {
  id_cita: number;
  fecha: string;
  hora: string;
  tipo: string;
  estado: 'Confirmada' | 'Pendiente' | 'Cancelada';
  notas?: string;
}

// ─── Paciente ─────────────────────────────────────────────────────────────────

export interface PacienteDto {
  id_paciente: number;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  fecha_nacimiento: string; // 'YYYY-MM-DD'
  notas_generales: string;
  activo: boolean;
  direccion?: string;
  alertas?: string[];
  citas: CitaResumenDto[];
  notas: NotaDto[];
}

// ─── Sesión clínica ───────────────────────────────────────────────────────────

export interface SesionPaciente {
  id_sesion: number;
  id_paciente: number;
  fecha: string;        // 'YYYY-MM-DD'
  hora: string;         // 'HH:mm'
  duracion_min: number;
  tipo: string;
  resumen: string;
  adjunto?: AdjuntoMeta;
}

// ─── Historial de eventos ─────────────────────────────────────────────────────

export type HistorialTipoEvento =
  | 'cita_confirmada'
  | 'cita_completada'
  | 'cita_cancelada'
  | 'cita_pendiente'
  | 'cita_pospuesta'
  | 'no_asistio'
  | 'sesion_registrada'
  | 'pago_registrado'
  | 'pago_pendiente'
  | 'reprogramacion'
  | 'nota_agregada';

export interface HistorialEvento {
  id: string;
  fecha: string;        // 'YYYY-MM-DD'
  hora?: string;
  tipo: HistorialTipoEvento;
  descripcion: string;
  detalle?: string;
}
