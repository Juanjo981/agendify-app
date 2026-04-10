import { ArchivoAdjuntoDto, SesionArchivoLocal } from '../../sesiones/models/sesion.model';
// ─── Paciente (alineado al backend PacienteDto) ──────────────────────────────

export const PACIENTE_SEXO_OPTIONS = [
  { label: 'Masculino', value: 'MASCULINO' },
  { label: 'Femenino', value: 'FEMENINO' },
  { label: 'No binario', value: 'NO_BINARIO' },
  { label: 'Prefiero no decir', value: 'PREFIERO_NO_DECIR' },
  { label: 'Otro', value: 'OTRO' },
] as const;

export type SexoPaciente = (typeof PACIENTE_SEXO_OPTIONS)[number]['value'];

const PACIENTE_SEXO_VALUES = new Set<string>(PACIENTE_SEXO_OPTIONS.map(option => option.value));

export function normalizeSexoPaciente(value?: string | null): SexoPaciente | '' {
  if (!value) return '';

  const trimmed = value.trim();
  if (!trimmed) return '';
  if (PACIENTE_SEXO_VALUES.has(trimmed)) return trimmed as SexoPaciente;

  const normalized = trimmed
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();

  switch (normalized) {
    case 'MASCULINO':
      return 'MASCULINO';
    case 'FEMENINO':
      return 'FEMENINO';
    case 'NO_BINARIO':
    case 'NOBINARIO':
      return 'NO_BINARIO';
    case 'PREFIERO_NO_DECIR':
    case 'PREFIERO_NODECIR':
      return 'PREFIERO_NO_DECIR';
    case 'OTRO':
      return 'OTRO';
    default:
      return '';
  }
}

export function isSexoPaciente(value?: string | null): value is SexoPaciente {
  return !!value && PACIENTE_SEXO_VALUES.has(value);
}

export interface PacienteDto {
  id_paciente:                   number;
  id_profesional?:               number;
  nombre:                        string;
  apellido:                      string;
  email:                         string;
  numero_telefono:               string;
  fecha_nacimiento:              string;   // 'YYYY-MM-DD'
  sexo?:                         SexoPaciente;
  direccion?:                    string;
  contacto_emergencia_nombre?:   string;
  contacto_emergencia_telefono?: string;
  notas_generales:               string;
  notas_visibles_resumen?:       NotaResumenPacienteDto[];
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
  sexo?:                         SexoPaciente;
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
  sexo:                   SexoPaciente | '';
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

export const ALERTA_TIPO_OPTIONS = [
  { label: 'Alergia', value: 'ALERGIA' },
  { label: 'Adeudo', value: 'ADEUDO' },
  { label: 'Restricción', value: 'RESTRICCION' },
  { label: 'Indicación', value: 'INDICACION' },
  { label: 'Otra', value: 'OTRA' },
] as const;

export type AlertaPacienteTipo = (typeof ALERTA_TIPO_OPTIONS)[number]['value'];

const ALERTA_TIPO_VALUES = new Set<string>(ALERTA_TIPO_OPTIONS.map(option => option.value));

export function isAlertaPacienteTipo(value?: string | null): value is AlertaPacienteTipo {
  return !!value && ALERTA_TIPO_VALUES.has(value);
}

export function normalizeAlertaPacienteTipo(value?: string | null): AlertaPacienteTipo {
  return isAlertaPacienteTipo(value) ? value : 'ALERGIA';
}

export interface AlertaPacienteDto {
  id_alerta_paciente:  number;
  id_paciente:         number;
  tipo_alerta:         AlertaPacienteTipo | string;
  titulo:              string;
  descripcion?:        string;
  activa:              boolean;
  created_at:          string;
}

export interface AlertaPacienteRequest {
  tipo_alerta: AlertaPacienteTipo;
  titulo:      string;
  descripcion?: string;
  activa?:     boolean;
}

// ─── Nota clínica ─────────────────────────────────────────────────────────────

export const NOTA_CLINICA_TIPO_OPTIONS = [
  { label: 'General', value: 'GENERAL' },
  { label: 'Diagnóstico', value: 'DIAGNOSTICO' },
  { label: 'Tratamiento', value: 'TRATAMIENTO' },
  { label: 'Seguimiento', value: 'SEGUIMIENTO' },
  { label: 'Receta médica', value: 'RECETA_MEDICA' },
  { label: 'Otro', value: 'OTRO' },
] as const;

export type NotaClinicaTipo = (typeof NOTA_CLINICA_TIPO_OPTIONS)[number]['value'];

export interface NotaResumenPacienteDto {
  id_nota_clinica?:    number;
  titulo?:             string | null;
  contenido?:          string | null;
  tipo_nota?:          NotaClinicaTipo | string | null;
  visible_en_resumen?: boolean | null;
  created_at?:         string | null;
}

export interface NotaClinicaDto {
  id_nota_clinica:     number;
  id_paciente:         number;
  id_sesion?:          number | null;
  titulo:              string;
  contenido:           string;
  tipo_nota:           NotaClinicaTipo | string;
  visible_en_resumen:  boolean;
  created_at:          string;
  adjuntos?:           ArchivoAdjuntoDto[];
}

export interface NotaClinicaViewModel extends NotaClinicaDto {
  adjuntos:          ArchivoAdjuntoDto[];
  adjuntosLoading?:  boolean;
}

export interface NotaClinicaRequest {
  id_paciente:        number;
  id_sesion?:         number | null;
  titulo:             string;
  contenido:          string;
  tipo_nota:          NotaClinicaTipo | string;
  visible_en_resumen: boolean;
}

export interface NotaClinicaFormState extends NotaClinicaRequest {
  adjunto?: SesionArchivoLocal;
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
  tipo?:             string;
  tipo_evento:       string;
  categoria?:        string;
  fecha_evento:      string;
  titulo:            string;
  descripcion_corta: string;
  estado?:           string;
  id_referencia:     number;
  modulo:            string;
}

// ─── Tipos UI (para renderizar en la vista) ───────────────────────────────────

export type HistorialTipoEvento =
  | 'CITA'
  | 'SESION'
  | 'NOTA'
  | 'ALERTA'
  | 'OTRO';

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

  return {
    id:          `${ev.modulo}-${ev.id_referencia}`,
    fecha,
    hora,
    tipo:        resolveHistorialType(ev),
    descripcion: ev.titulo ?? ev.descripcion_corta ?? '',
    detalle:     ev.descripcion_corta,
  };
}

export function resolveHistorialType(item: Pick<HistorialEventoApi, 'tipo' | 'tipo_evento' | 'categoria' | 'modulo'>): HistorialTipoEvento {
  const candidates = [item.tipo, item.tipo_evento, item.categoria, item.modulo];
  for (const candidate of candidates) {
    const resolved = mapHistorialTypeCandidate(candidate);
    if (resolved !== 'OTRO') return resolved;
  }
  return 'OTRO';
}

function mapHistorialTypeCandidate(value?: string | null): HistorialTipoEvento {
  const normalized = normalizeHistorialTypeValue(value);
  if (!normalized) return 'OTRO';

  if (normalized === 'CITA' || normalized === 'CITAS' || normalized.startsWith('CITA_')) {
    return 'CITA';
  }

  if (normalized === 'SESION' || normalized === 'SESIONES' || normalized.startsWith('SESION_')) {
    return 'SESION';
  }

  if (
    normalized === 'NOTA' ||
    normalized === 'NOTAS' ||
    normalized === 'NOTA_CLINICA' ||
    normalized === 'NOTAS_CLINICAS' ||
    normalized.startsWith('NOTA_') ||
    normalized.startsWith('NOTAS_')
  ) {
    return 'NOTA';
  }

  if (normalized === 'ALERTA' || normalized === 'ALERTAS' || normalized.startsWith('ALERTA_')) {
    return 'ALERTA';
  }

  return 'OTRO';
}

function normalizeHistorialTypeValue(value?: string | null): string {
  return (value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
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

