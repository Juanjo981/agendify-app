/** Contenido clínico dinámico de una receta (no forma parte de la plantilla). */
export interface RecetaMedicamentoPreview {
  nombre: string;
  dosis: string;
  frecuencia: string;
  duracion: string;
}

export interface RecetaContenidoDinamico {
  pacienteNombre: string;
  fechaEmision: string;
  edad: string | null;
  diagnostico: string;
  medicamentos: RecetaMedicamentoPreview[];
  indicaciones: string;
  proximaCitaFecha: string;
  proximaCitaHora: string;
}

export function createEmptyRecetaContenido(): RecetaContenidoDinamico {
  return {
    pacienteNombre: '',
    fechaEmision: '',
    edad: null,
    diagnostico: '',
    medicamentos: [{ nombre: '', dosis: '', frecuencia: '', duracion: '' }],
    indicaciones: '',
    proximaCitaFecha: '',
    proximaCitaHora: '',
  };
}
