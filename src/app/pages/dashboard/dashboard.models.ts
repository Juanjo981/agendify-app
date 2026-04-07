import { EstadoCita } from '../citas/models/cita.model';

export interface DashboardResumenDto {
  total_pacientes: number;
  total_pacientes_activos: number;
  total_citas: number;
  citas_hoy: number;
  citas_pendientes: number;
  citas_confirmadas: number;
  total_sesiones: number;
  ingresos_totales: number;
}

export interface DashboardAgendaCitaDto {
  id_cita: number;
  fecha_inicio: string;
  fecha_fin: string;
  estado_cita: EstadoCita;
  motivo?: string | null;
  paciente_nombre: string;
  paciente_apellido: string;
}

export interface DashboardAgendaHoyDto {
  fecha_hoy: string;
  total_citas_hoy: number;
  citas_pendientes_hoy: number;
  citas_confirmadas_hoy: number;
  citas_completadas_hoy: number;
  citas_canceladas_hoy: number;
  proxima_cita?: DashboardAgendaCitaDto | null;
  citas_del_dia: DashboardAgendaCitaDto[];
}

export interface DashboardConsolidadoDto {
  resumen: DashboardResumenDto;
  agenda_hoy: DashboardAgendaHoyDto;
  solicitudes_pendientes_count: number;
  notificaciones_pendientes_count: number;
}

export interface NotificacionDto {
  id_notificacion: number;
  id_paciente?: number | null;
  id_cita?: number | null;
  canal: string;
  tipo_notificacion: string;
  destinatario?: string | null;
  asunto?: string | null;
  mensaje_resumen?: string | null;
  fecha_programada?: string | null;
  estado_envio?: string | null;
  created_at: string;
}

export interface DashboardCardItem {
  key: string;
  label: string;
  value: string;
  icon: string;
  tone: 'primary' | 'success' | 'warning' | 'neutral';
  helper?: string;
}
