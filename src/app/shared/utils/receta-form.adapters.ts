/**
 * Adaptadores formulario ↔ requests/responses de recetas.
 * No envían flags de UI, Files ni URLs de preview.
 */

import {
  ActualizarRecetaRequest,
  CopiarRecetaRequest,
  CrearRecetaRequest,
  RecetaDetalle,
  RecetaFormModel,
  RecetaMedicamentoFormItem,
  RecetaMedicamentoRequest,
  createEmptyRecetaFormModel,
} from '../models/recetas.models';
import { RecetaContenidoDinamico } from '../../pages/pacientes/components/nueva-receta/receta-contenido.models';
import { formatLocalDate, formatLocalTime } from './local-date.utils';
import { PlantillaRecetasConfigDto } from '../models/plantilla-recetas.models';

function cleanText(value: string | null | undefined): string | null {
  if (value == null) return null;
  const t = String(value).trim();
  return t.length ? t : null;
}

function mapMedicamentosToRequest(
  items: RecetaMedicamentoFormItem[] | undefined,
): RecetaMedicamentoRequest[] {
  const list = (items ?? [])
    .map((m, index) => {
      const nombre = (m.nombre ?? '').trim();
      if (!nombre) return null;
      const req: RecetaMedicamentoRequest = {
        nombre,
        dosis: cleanText(m.dosis),
        frecuencia: cleanText(m.frecuencia),
        duracion: cleanText(m.duracion),
        indicaciones_adicionales: cleanText(m.indicaciones_adicionales),
        orden: m.orden && m.orden > 0 ? m.orden : index + 1,
      };
      if (m.id_receta_medicamento != null && m.id_receta_medicamento > 0) {
        req.id_receta_medicamento = m.id_receta_medicamento;
      }
      return req;
    })
    .filter((m): m is RecetaMedicamentoRequest => m != null);

  return list;
}

function basePayloadFromForm(form: RecetaFormModel): Omit<ActualizarRecetaRequest, never> {
  const fecha = formatLocalDate(form.fecha_emision);
  if (!fecha) {
    throw new Error('fecha_emision es requerida (YYYY-MM-DD)');
  }
  const nombre = (form.nombre ?? '').trim();
  if (!nombre) {
    throw new Error('nombre es requerido');
  }

  return {
    nombre,
    id_plantilla_receta: form.id_plantilla_receta ?? null,
    fecha_emision: fecha,
    paciente_nombre: cleanText(form.paciente_nombre),
    paciente_fecha_nacimiento_snapshot: formatLocalDate(form.paciente_fecha_nacimiento_snapshot),
    edad_texto: cleanText(form.edad_texto),
    diagnostico: cleanText(form.diagnostico),
    indicaciones: cleanText(form.indicaciones),
    proxima_cita_fecha: formatLocalDate(form.proxima_cita_fecha),
    proxima_cita_hora: formatLocalTime(form.proxima_cita_hora),
    notas_internas: cleanText(form.notas_internas),
    configuracion_plantilla_snapshot: form.configuracion_plantilla_snapshot ?? null,
    medicamentos: mapMedicamentosToRequest(form.medicamentos),
  };
}

/** Formulario → POST /api/recetas (sin id_profesional, estado ni versión). */
export function toCrearRecetaRequest(
  form: RecetaFormModel,
  idPaciente: number,
): CrearRecetaRequest {
  if (!idPaciente || idPaciente <= 0) {
    throw new Error('id_paciente es requerido');
  }
  const base = basePayloadFromForm(form);
  return {
    id_paciente: idPaciente,
    ...base,
  };
}

/** Formulario → PUT borrador / POST nueva versión. */
export function toActualizarRecetaRequest(form: RecetaFormModel): ActualizarRecetaRequest {
  return basePayloadFromForm(form);
}

export function toCopiarRecetaRequest(input: {
  nombre: string;
  fechaEmision?: string | null;
  copiarNotasInternas?: boolean;
  idPlantillaReceta?: number | null;
  configuracionPlantillaSnapshot?: PlantillaRecetasConfigDto | null;
}): CopiarRecetaRequest {
  const nombre = (input.nombre ?? '').trim();
  if (!nombre) {
    throw new Error('nombre es requerido para copiar');
  }
  return {
    nombre,
    fecha_emision: formatLocalDate(input.fechaEmision) ?? undefined,
    copiar_notas_internas: input.copiarNotasInternas ?? false,
    id_plantilla_receta: input.idPlantillaReceta ?? null,
    configuracion_plantilla_snapshot: input.configuracionPlantillaSnapshot ?? null,
  };
}

/** RecetaDetalle → formulario editable. */
export function detalleToFormModel(detalle: RecetaDetalle): RecetaFormModel {
  const meds: RecetaMedicamentoFormItem[] =
    detalle.medicamentos?.length > 0
      ? detalle.medicamentos.map((m, i) => ({
          id_receta_medicamento: m.id_receta_medicamento,
          nombre: m.nombre ?? '',
          dosis: m.dosis ?? '',
          frecuencia: m.frecuencia ?? '',
          duracion: m.duracion ?? '',
          indicaciones_adicionales: m.indicaciones_adicionales ?? '',
          orden: m.orden ?? i + 1,
        }))
      : createEmptyRecetaFormModel().medicamentos;

  return {
    nombre: detalle.nombre ?? '',
    id_plantilla_receta: detalle.id_plantilla_receta ?? null,
    fecha_emision: formatLocalDate(detalle.fecha_emision) ?? '',
    paciente_nombre: detalle.paciente_nombre ?? '',
    paciente_fecha_nacimiento_snapshot: formatLocalDate(detalle.paciente_fecha_nacimiento_snapshot),
    edad_texto: detalle.edad_texto ?? null,
    diagnostico: detalle.diagnostico ?? '',
    indicaciones: detalle.indicaciones ?? '',
    proxima_cita_fecha: formatLocalDate(detalle.proxima_cita_fecha),
    proxima_cita_hora: formatLocalTime(detalle.proxima_cita_hora),
    notas_internas: detalle.notas_internas ?? '',
    medicamentos: meds,
    configuracion_plantilla_snapshot: detalle.configuracion_plantilla_snapshot ?? null,
  };
}

/** Compatibilidad con la preview local del modal (sin cambiar su diseño). */
export function formModelToContenidoPreview(form: RecetaFormModel): RecetaContenidoDinamico {
  return {
    pacienteNombre: form.paciente_nombre ?? '',
    fechaEmision: form.fecha_emision ?? '',
    edad: form.edad_texto,
    diagnostico: form.diagnostico ?? '',
    medicamentos: (form.medicamentos ?? []).map(m => ({
      nombre: m.nombre ?? '',
      dosis: m.dosis ?? '',
      frecuencia: m.frecuencia ?? '',
      duracion: m.duracion ?? '',
    })),
    indicaciones: form.indicaciones ?? '',
    proximaCitaFecha: form.proxima_cita_fecha ?? '',
    proximaCitaHora: form.proxima_cita_hora ?? '',
  };
}

export function contenidoPreviewToFormModel(
  contenido: RecetaContenidoDinamico,
  extras?: Partial<Pick<RecetaFormModel, 'nombre' | 'id_plantilla_receta' | 'notas_internas' | 'paciente_fecha_nacimiento_snapshot' | 'configuracion_plantilla_snapshot'>>,
): RecetaFormModel {
  const base = createEmptyRecetaFormModel();
  return {
    ...base,
    nombre: extras?.nombre ?? base.nombre,
    id_plantilla_receta: extras?.id_plantilla_receta ?? null,
    fecha_emision: formatLocalDate(contenido.fechaEmision) ?? base.fecha_emision,
    paciente_nombre: contenido.pacienteNombre ?? '',
    paciente_fecha_nacimiento_snapshot: extras?.paciente_fecha_nacimiento_snapshot ?? null,
    edad_texto: contenido.edad,
    diagnostico: contenido.diagnostico ?? '',
    indicaciones: contenido.indicaciones ?? '',
    proxima_cita_fecha: formatLocalDate(contenido.proximaCitaFecha),
    proxima_cita_hora: formatLocalTime(contenido.proximaCitaHora),
    notas_internas: extras?.notas_internas ?? '',
    medicamentos:
      contenido.medicamentos?.length > 0
        ? contenido.medicamentos.map((m, i) => ({
            nombre: m.nombre ?? '',
            dosis: m.dosis ?? '',
            frecuencia: m.frecuencia ?? '',
            duracion: m.duracion ?? '',
            indicaciones_adicionales: '',
            orden: i + 1,
          }))
        : base.medicamentos,
    configuracion_plantilla_snapshot: extras?.configuracion_plantilla_snapshot ?? null,
  };
}

/** Elimina claves prohibidas de un payload (defensa en profundidad). */
export function stripForbiddenRecetaPayloadFields<T extends Record<string, unknown>>(body: T): T {
  const forbidden = [
    'id_profesional',
    'idProfesional',
    'estado',
    'version_actual',
    'versionActual',
    'tiene_pdf',
    'r2_object_key',
    'r2_object_key_actual',
    'pdf_object_key',
    'object_key',
    'url',
    'download_url',
    'sha256',
    'pdf_hash_sha256',
    'created_at',
    'updated_at',
    'emitida_at',
    'created_by',
    'updated_by',
  ];
  const copy = { ...body };
  for (const key of forbidden) {
    delete copy[key];
  }
  return copy;
}
