// ─── Paciente (alineado al backend PacienteDto) ──────────────────────────────

export interface PacienteDto {
  id_paciente:                   number;
  id_profesional?:               number;
  nombre:                        string;
  apellido:                      string;
  email:                         string;
  numero_telefono:               string;
  fecha_nacimiento:              string;   // 'YYYY-MM-DD'
  sexo?:                         string;
  direccion?:                    string;
  contacto_emergencia_nombre?:   string;
  contacto_emergencia_telefono?: string;
  notas_generales:               string;
  activo:                        boolean;
  created_at?:                   string;
  updated_at?:                   string;
  created_by?:                   string;
  updated_by?:                   string;
}

/**
 * Request body para POST / PUT /api/pacientes
 */
export interface PacienteRequest {
  nombre:                        string;
  apellido:                      string;
  email?:                        string;
  numero_telefono?:              string;
  fecha_nacimiento?:             string;
  sexo?:                         string;
  direccion?:                    string;
  contacto_emergencia_nombre?:   string;
  contacto_emergencia_telefono?: string;
  notas_generales?:              string;
}

// ─── Resumen del paciente (GET /api/pacientes/{id}/resumen) ───────────────────

export interface ResumenPacienteDto {
  id_paciente:            number;
  nombre:                 string;
  apellido:               string;
  email:                  string;
  numero_telefono:        string;
  fecha_nacimiento:       string;
  sexo:                   string;
  activo:                 boolean;
  notas_generales:        string;
  total_citas:            number;
  total_sesiones:         number;
  total_notas_clinicas:   number;
  total_alertas_activas:  number;
  fecha_proxima_cita?:    string;
  fecha_ultima_cita?:     string;
  fecha_ultima_sesion?:   string;
  created_at:             string;
  updated_at:             string;
}

// ─── Alerta del paciente ──────────────────────────────────────────────────────

export interface AlertaPacienteDto {
  id_alerta_paciente:  number;
  id_paciente:         number;
  tipo_alerta:         string;
  titulo:              string;
  descripcion?:        string;
  activa:              boolean;
  created_at:          string;
}

export interface AlertaPacienteRequest {
  tipo_alerta: string;
  titulo:      string;
  descripcion?: string;
  activa?:     boolean;
}

// ─── Nota clínica ─────────────────────────────────────────────────────────────

export interface NotaClinicaDto {
  id_nota_clinica:     number;
  id_paciente:         number;
  id_sesion?:          number | null;
  titulo:              string;
  contenido:           string;
  tipo_nota:           string;
  visible_en_resumen:  boolean;
  created_at:          string;
}

export interface NotaClinicaRequest {
  id_paciente:        number;
  id_sesion?:         number | null;
  titulo:             string;
  contenido:          string;
  tipo_nota:          string;
  visible_en_resumen: boolean;
}

// ─── Sesión clínica (sub-recurso del paciente) ────────────────────────────────

export interface SesionPacienteDto {
  id_sesion:          number;
  id_profesional:     number;
  id_paciente:        number;
  id_cita:            number;
  fecha_sesion:       string;
  tipo_sesion:        string;
  estatus:            string;
  resumen?:           string | null;
  nombre_paciente:    string;
  apellido_paciente:  string;
  created_at:         string;
  updated_at:         string;
}

// ─── Historial ────────────────────────────────────────────────────────────────

export interface HistorialPacienteResponse {
  id_paciente:           number;
  nombre:                string;
  apellido:              string;
  total_citas:           number;
  total_sesiones:        number;
  total_notas_clinicas:  number;
  total_alertas_activas: number;
  total_eventos:         number;
  eventos:               HistorialEventoApi[];
}

export interface HistorialEventoApi {
  tipo_evento:       string;
  fecha_evento:      string;
  titulo:            string;
  descripcion_corta: string;
  estado?:           string;
  id_referencia:     number;
  modulo:            string;
}

// ─── Tipos UI (para renderizar en la vista) ───────────────────────────────────

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
  | 'nota_agregada'
  | 'otro';

export interface HistorialEvento {
  id:          string;
  fecha:       string;        // 'YYYY-MM-DD'
  hora?:       string;
  tipo:        HistorialTipoEvento;
  descripcion: string;
  detalle?:    string;
}

/**
 * Convierte un evento del backend al modelo UI del historial.
 */
export function mapHistorialEventoApi(ev: HistorialEventoApi): HistorialEvento {
  const fechaParts = ev.fecha_evento?.split('T') ?? ['', ''];
  const fecha = fechaParts[0] ?? '';
  const hora  = fechaParts[1]?.substring(0, 5);

  const TIPO_MAP: Record<string, HistorialTipoEvento> = {
    CITA_CREADA:            'cita_pendiente',
    CITA_CONFIRMADA:        'cita_confirmada',
    CITA_COMPLETADA:        'cita_completada',
    CITA_CANCELADA:         'cita_cancelada',
    CITA_POSPUESTA:         'cita_pospuesta',
    CITA_NO_ASISTIO:        'no_asistio',
    NO_ASISTIO:             'no_asistio',
    SESION_REGISTRADA:      'sesion_registrada',
    SESION_CREADA:          'sesion_registrada',
    PAGO_REGISTRADO:        'pago_registrado',
    PAGO_PENDIENTE:         'pago_pendiente',
    REPROGRAMACION:         'reprogramacion',
    NOTA_AGREGADA:          'nota_agregada',
    NOTA_CREADA:            'nota_agregada',
    ESTADO_CAMBIADO:        mapEstadoCambiado(ev),
  };

  const tipo = TIPO_MAP[ev.tipo_evento] ?? TIPO_MAP[ev.estado ?? ''] ?? 'otro';

  return {
    id:          `${ev.modulo}-${ev.id_referencia}`,
    fecha,
    hora,
    tipo,
    descripcion: ev.titulo ?? ev.descripcion_corta ?? '',
    detalle:     ev.descripcion_corta,
  };
}

function mapEstadoCambiado(ev: HistorialEventoApi): HistorialTipoEvento {
  if (ev.modulo === 'CITA') {
    switch (ev.estado) {
      case 'CONFIRMADA':  return 'cita_confirmada';
      case 'COMPLETADA':  return 'cita_completada';
      case 'CANCELADA':   return 'cita_cancelada';
      case 'PENDIENTE':   return 'cita_pendiente';
      case 'POSPUESTA':   return 'cita_pospuesta';
      case 'NO_ASISTIO':  return 'no_asistio';
    }
  }
  return 'otro';
}

// ─── Legacy (deprecated — kept for backward compat during transition) ─────────

/** @deprecated Usar NotaClinicaDto */
export interface NotaDto {
  id_nota: number;
  fecha: string;
  contenido: string;
  adjunto?: AdjuntoMeta;
}

/** @deprecated Adjuntos se implementan en Fase 6 */
export interface AdjuntoMeta {
  name: string;
  type: string;
  size: number;
  previewUrl?: string;
}

/** @deprecated Usar SesionPacienteDto */
export interface SesionPaciente {
  id_sesion: number;
  id_paciente: number;
  fecha: string;
  hora: string;
  duracion_min: number;
  tipo: string;
  resumen: string;
  adjunto?: AdjuntoMeta;
}

/**
 * @deprecated Citas ya no se embeben en PacienteDto.
 * Usar endpoint de citas del paciente o resumen.
 */
export interface CitaResumenDto {
  id_cita: number;
  fecha: string;
  hora: string;
  tipo: string;
  estado: 'Confirmada' | 'Pendiente' | 'Cancelada';
  notas?: string;
}
