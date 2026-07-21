export type ActividadTone = 'primary' | 'success' | 'warning' | 'purple' | 'blue' | 'teal';

export interface ActividadRecienteItem {
  id: string;
  cuando: string;
  titulo: string;
  icono?: string;
  tone?: ActividadTone;
}
