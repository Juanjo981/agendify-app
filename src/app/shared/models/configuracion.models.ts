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
  id_profesional?: number | null;
  notif_in_app?: boolean | null;
  alertas_sonoras?: boolean | null;
  avisos_citas_proximas?: boolean | null;
  avisos_pacientes_nuevos?: boolean | null;
  avisos_pagos_pendientes?: boolean | null;
  zona_horaria?: string | null;
  moneda?: string | null;
  formato_hora?: string | null;
  formato_fecha?: string | null;
  duracion_cita_default_min?: number | null;
  politica_cancelacion_horas?: number | null;
  permite_confirmacion_publica?: boolean | null;
  ocultar_datos_sensibles?: boolean | null;
  confirmar_eliminar_citas?: boolean | null;
  confirmar_eliminar_pacientes?: boolean | null;
  permitir_cancelacion?: boolean | null;
  permitir_reprogramacion?: boolean | null;
  recordatorio_profesional?: boolean | null;
  notif_paciente_confirma?: boolean | null;
  notif_paciente_cancela?: boolean | null;
  notif_paciente_reprograma?: boolean | null;
  idioma?: string | null;
  tema?: string | null;
  tamano_interfaz?: string | null;
  animaciones?: boolean | null;
  vista_previa_datos?: boolean | null;
  bloquear_cambios_criticos?: boolean | null;
}

export interface ConfiguracionSistemaRequest {
  notif_in_app: boolean;
  alertas_sonoras: boolean;
  avisos_citas_proximas: boolean;
  avisos_pacientes_nuevos: boolean;
  avisos_pagos_pendientes: boolean;
  zona_horaria: string;
  moneda: string;
  formato_hora: string;
  formato_fecha: string;
  duracion_cita_default_min: number;
  politica_cancelacion_horas: number;
  permite_confirmacion_publica: boolean;
  ocultar_datos_sensibles: boolean;
  confirmar_eliminar_citas: boolean;
  confirmar_eliminar_pacientes: boolean;
  permitir_cancelacion: boolean;
  permitir_reprogramacion: boolean;
  recordatorio_profesional: boolean;
  notif_paciente_confirma: boolean;
  notif_paciente_cancela: boolean;
  notif_paciente_reprograma: boolean;
  idioma: string;
  tema: string;
  tamano_interfaz: string;
  animaciones: boolean;
  vista_previa_datos: boolean;
  bloquear_cambios_criticos: boolean;
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
