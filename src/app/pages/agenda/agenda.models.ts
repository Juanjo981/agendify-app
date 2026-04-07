import { CitaDto } from '../citas/models/cita.model';

export interface BloqueoHorarioDto {
  id_bloqueo_horario: number;
  fecha?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  hora_inicio?: string;
  hora_fin?: string;
  motivo?: string | null;
  motivo_bloqueo?: string | null;
  tipo_bloqueo?: string | null;
  todo_el_dia?: boolean;
  activo?: boolean;
}

export interface ConfiguracionJornadaDto {
  hora_inicio: string;
  hora_fin: string;
  duracion_cita_default_min?: number;
  intervalo_minutos?: number;
  intervalo?: number;
  permite_confirmacion_publica?: boolean;
  mostrar_sabados?: boolean;
  mostrar_domingos?: boolean;
}

export interface AgendaResponseDto {
  citas: CitaDto[];
  bloqueos: BloqueoHorarioDto[];
  configuracion_jornada?: ConfiguracionJornadaDto | null;
}

export interface BloqueoHorarioUpsertRequest {
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  motivo?: string;
  tipo_bloqueo?: string;
}
