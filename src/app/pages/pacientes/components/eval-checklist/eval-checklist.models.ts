export type EvalRiskLevel = 'BAJO' | 'MEDIO' | 'ALTO';

export interface EvalRiskOption {
  value: EvalRiskLevel;
  label: string;
}

/** @deprecated Usar PRIMERA_SESION_CAMPOS; se mantiene por compatibilidad de imports. */
export interface EvalChecklistItem {
  id: string;
  label: string;
  checked?: boolean;
}
