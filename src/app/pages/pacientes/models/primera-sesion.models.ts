/**
 * Contratos de GET/PUT /api/pacientes/{id}/primera-sesion (snake_case).
 */

export type NivelInicialPrimeraSesion = 'BAJO' | 'MEDIO' | 'ALTO';

export const NIVELES_INICIALES: ReadonlyArray<{
  value: NivelInicialPrimeraSesion;
  label: string;
}> = [
  { value: 'BAJO', label: 'Bajo' },
  { value: 'MEDIO', label: 'Medio' },
  { value: 'ALTO', label: 'Alto' },
];

/** Metadata de UI (labels). No son valores mock. */
export const PRIMERA_SESION_CAMPOS = [
  { key: 'consentimiento_informado', label: 'Consentimiento informado' },
  { key: 'motivo_consulta', label: 'Motivo de consulta' },
  { key: 'antecedentes', label: 'Antecedentes' },
  { key: 'red_apoyo', label: 'Red de apoyo' },
  { key: 'riesgo_suicida', label: 'Riesgo suicida' },
  { key: 'consumo_sustancias', label: 'Consumo de sustancias' },
  { key: 'violencia', label: 'Violencia' },
  { key: 'enfermedades', label: 'Enfermedades' },
  { key: 'medicacion_actual', label: 'Medicación actual' },
  { key: 'firma_digital', label: 'Firma digital' },
] as const;

export type PrimeraSesionCampoKey = (typeof PRIMERA_SESION_CAMPOS)[number]['key'];

export const PRIMERA_SESION_TOTAL = PRIMERA_SESION_CAMPOS.length;

export interface ChecklistPrimeraSesionDto {
  id: number | null;
  id_paciente: number;
  id_profesional?: number | null;
  consentimiento_informado: boolean;
  motivo_consulta: boolean;
  antecedentes: boolean;
  red_apoyo: boolean;
  riesgo_suicida: boolean;
  consumo_sustancias: boolean;
  violencia: boolean;
  enfermedades: boolean;
  medicacion_actual: boolean;
  firma_digital: boolean;
  nivel_inicial: NivelInicialPrimeraSesion | string;
  completados: number;
  total: number;
  created_at?: string | null;
  updated_at?: string | null;
}

/** Body PUT — sin id_profesional ni completados. */
export interface ChecklistPrimeraSesionRequest {
  consentimiento_informado: boolean;
  motivo_consulta: boolean;
  antecedentes: boolean;
  red_apoyo: boolean;
  riesgo_suicida: boolean;
  consumo_sustancias: boolean;
  violencia: boolean;
  enfermedades: boolean;
  medicacion_actual: boolean;
  firma_digital: boolean;
  nivel_inicial: NivelInicialPrimeraSesion;
}

export function normalizeNivelInicial(
  value: string | null | undefined,
): NivelInicialPrimeraSesion {
  const upper = (value ?? '').trim().toUpperCase();
  if (upper === 'BAJO' || upper === 'MEDIO' || upper === 'ALTO') {
    return upper;
  }
  return 'BAJO';
}

export function contarCompletadosForm(
  values: Partial<Record<PrimeraSesionCampoKey, boolean | null | undefined>>,
): number {
  return PRIMERA_SESION_CAMPOS.reduce(
    (acc, campo) => acc + (values[campo.key] ? 1 : 0),
    0,
  );
}

export function toChecklistRequest(values: {
  consentimiento_informado: boolean;
  motivo_consulta: boolean;
  antecedentes: boolean;
  red_apoyo: boolean;
  riesgo_suicida: boolean;
  consumo_sustancias: boolean;
  violencia: boolean;
  enfermedades: boolean;
  medicacion_actual: boolean;
  firma_digital: boolean;
  nivel_inicial: NivelInicialPrimeraSesion | string;
}): ChecklistPrimeraSesionRequest {
  return {
    consentimiento_informado: !!values.consentimiento_informado,
    motivo_consulta: !!values.motivo_consulta,
    antecedentes: !!values.antecedentes,
    red_apoyo: !!values.red_apoyo,
    riesgo_suicida: !!values.riesgo_suicida,
    consumo_sustancias: !!values.consumo_sustancias,
    violencia: !!values.violencia,
    enfermedades: !!values.enfermedades,
    medicacion_actual: !!values.medicacion_actual,
    firma_digital: !!values.firma_digital,
    nivel_inicial: normalizeNivelInicial(values.nivel_inicial),
  };
}
