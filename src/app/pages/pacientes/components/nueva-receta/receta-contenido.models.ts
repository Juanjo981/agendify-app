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

/**
 * Datos clínicos que consume la vista previa, en todos los modos (nueva, ver,
 * editar y copia). Se deriva siempre del formulario, es inmutable (el panel
 * asigna una referencia nueva) y llega listo para pintar: las fechas ya vienen
 * en dd/MM/yyyy, así que el HTML no formatea ni renombra nada.
 *
 * La apariencia (colores, logo, tipografía, secciones, firma, sello) NO viaja
 * aquí: es una entrada aparte de la vista previa.
 */
export interface RecetaPreviewData {
  nombreReceta: string;
  pacienteNombre: string;
  edad: string;
  fechaEmision: string;
  diagnostico: string;
  medicamentos: RecetaMedicamentoPreview[];
  indicaciones: string;
  proximaCitaFecha: string;
  proximaCitaHora: string;
}

export function createEmptyRecetaPreviewData(): RecetaPreviewData {
  return {
    nombreReceta: '',
    pacienteNombre: '',
    edad: '',
    fechaEmision: '',
    diagnostico: '',
    medicamentos: [],
    indicaciones: '',
    proximaCitaFecha: '',
    proximaCitaHora: '',
  };
}
