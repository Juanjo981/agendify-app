export interface EvalChecklistItem {
  id: string;
  label: string;
  checked?: boolean;
}

export type EvalRiskLevel = 'bajo' | 'medio' | 'alto';

export interface EvalRiskOption {
  value: EvalRiskLevel;
  label: string;
}
