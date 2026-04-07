export interface ConfiguracionAgendaDto {
  hora_inicio?: string | null;
  hora_fin?: string | null;
  hora_inicio_jornada?: string | null;
  hora_fin_jornada?: string | null;
  intervalo?: number | null;
  intervalo_minutos?: number | null;
  intervalo_calendario_min?: number | null;
  duracion_cita_default_min?: number | null;
  buffer_citas_min?: number | null;
  citas_superpuestas?: boolean | null;
  mostrar_sabados?: boolean | null;
  mostrar_domingos?: boolean | null;
  vista_default?: string | null;
}

export interface ConfiguracionAgendaRequest {
  hora_inicio_jornada: string;
  hora_fin_jornada: string;
  intervalo_calendario_min: number;
  duracion_cita_default_min: number;
  buffer_citas_min: number;
  citas_superpuestas: boolean;
  mostrar_sabados: boolean;
  mostrar_domingos: boolean;
  vista_default: string;
}

export interface ConfiguracionSistemaDto {
  id_configuracion_sistema?: number | null;
  zona_horaria?: string | null;
  moneda?: string | null;
  formato_hora?: string | null;
  duracion_cita_default_min?: number | null;
  politica_cancelacion_horas?: number | null;
  permite_confirmacion_publica?: boolean | null;
  idioma?: string | null;
  tema?: string | null;
  tamano_interfaz?: string | null;
  animaciones?: boolean | null;
  activo?: boolean | null;
}

export interface ConfiguracionSistemaRequest {
  zona_horaria: string;
  moneda: string;
  formato_hora: string;
  duracion_cita_default_min: number;
  politica_cancelacion_horas: number;
  permite_confirmacion_publica: boolean;
  idioma?: string;
  tema?: string;
  tamano_interfaz?: string;
  animaciones?: boolean;
}

export interface ConfiguracionRecordatorioDto {
  id_configuracion_recordatorio?: number | null;
  canal: string;
  anticipacion_minutos: number;
  mensaje_personalizado?: string | null;
  activo?: boolean | null;
}

export interface ConfiguracionRecordatorioRequest {
  canal: string;
  anticipacion_minutos: number;
  mensaje_personalizado?: string | null;
  activo?: boolean;
}

