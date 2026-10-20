import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import {
  PlantillaRecetasConfigDto,
  createDefaultPlantillaConfig,
  plantillaColorHex,
} from 'src/app/shared/models/plantilla-recetas.models';
import { RecetaMedicamentoPreview, RecetaPreviewData } from './receta-contenido.models';

/** Textos de relleno: solo se usan cuando el dato real está vacío. */
export const RECETA_PREVIEW_PLACEHOLDERS = {
  paciente: 'Nombre del paciente',
  fecha: 'Fecha de emisión',
  edad: 'Edad del paciente',
  medicamento: 'Nombre del medicamento',
  medicamentoDetalle: 'Dosis · Frecuencia · Duración',
  proximaCitaFecha: 'Fecha',
  proximaCitaHora: 'Hora',
} as const;

interface MedicamentoVista {
  nombre: string;
  detalle: string;
}

/**
 * Hoja de vista previa.
 *
 * Importante: no usa @if/@for nativos ni getters/computed para el contenido
 * clínico. En Angular 20 + webpack, las vistas embebidas de control flow se
 * quedaban congeladas con los placeholders del primer render (cuando el input
 * aún estaba vacío tras abrir una receta existente), aunque el mismo método
 * fuera de esos bloques ya devolvía los datos reales.
 *
 * Aquí los textos se materializan en campos planos en ngOnChanges y el HTML
 * solo hace interpolación + *ngIf/*ngFor clásicos.
 */
@Component({
  selector: 'app-receta-sheet-preview',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './receta-sheet-preview.component.html',
  styleUrls: ['./receta-sheet-preview.component.scss'],
})
export class RecetaSheetPreviewComponent implements OnChanges {
  /** Apariencia: plantilla vigente (receta nueva) o snapshot guardado (emitida). */
  @Input() config: PlantillaRecetasConfigDto | null = null;
  /** Datos clínicos de la receta, ya formateados para mostrar. */
  @Input() datos: RecetaPreviewData | null = null;

  readonly placeholders = RECETA_PREVIEW_PLACEHOLDERS;

  cfg: PlantillaRecetasConfigDto = createDefaultPlantillaConfig();
  colorPrincipal = plantillaColorHex(this.cfg.identidad.color_id);

  pacienteTexto: string = this.placeholders.paciente;
  fechaTexto: string = this.placeholders.fecha;
  edadTexto: string = this.placeholders.edad;
  diagnosticoTexto = '';
  indicacionesTexto = '';
  proximaCitaFechaTexto: string = this.placeholders.proximaCitaFecha;
  proximaCitaHoraTexto: string = this.placeholders.proximaCitaHora;
  medicamentosVista: MedicamentoVista[] = [];
  etiquetaHoja = 'Vista previa de receta';

  previewNombre = '';
  previewEspecialidad = '';
  previewCedula = '';
  previewTelProf = '';
  previewEmail = '';
  previewConsultorio = '';
  previewDirConsultorio = '';
  previewTelConsultorio = '';
  tieneIzquierda = false;
  tieneDerecha = false;
  mostrarSeparador = false;

  previewFirmaNombre = '';
  previewFirmaEspecialidad = '';
  previewFirmaCedula = '';
  previewPieTelefono = '';
  previewPieCorreo = '';
  previewPieDireccion = '';
  previewFechaGeneracion = '';
  tieneBloquePie = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config'] || changes['datos']) {
      this.recalcular();
    }
  }

  etiqueta(
    key: keyof PlantillaRecetasConfigDto['distribucion']['etiquetas'],
    fallback: string,
  ): string {
    return (this.cfg.distribucion.etiquetas[key] ?? '').trim() || fallback;
  }

  trackMed(_index: number, med: MedicamentoVista): string {
    return `${med.nombre}|${med.detalle}`;
  }

  private recalcular(): void {
    this.cfg = this.config ?? createDefaultPlantillaConfig();
    this.colorPrincipal = plantillaColorHex(this.cfg.identidad.color_id);

    const d = this.datos;
    this.pacienteTexto = d?.pacienteNombre?.trim() || this.placeholders.paciente;
    this.fechaTexto = d?.fechaEmision?.trim() || this.placeholders.fecha;
    this.edadTexto = d?.edad?.trim() || this.placeholders.edad;
    this.diagnosticoTexto = d?.diagnostico?.trim() ?? '';
    this.indicacionesTexto = d?.indicaciones?.trim() ?? '';
    this.proximaCitaFechaTexto =
      d?.proximaCitaFecha?.trim() || this.placeholders.proximaCitaFecha;
    this.proximaCitaHoraTexto =
      d?.proximaCitaHora?.trim() || this.placeholders.proximaCitaHora;

    const medsRaw = (d?.medicamentos ?? []).filter(med =>
      [med?.nombre, med?.dosis, med?.frecuencia, med?.duracion].some(
        valor => !!(valor ?? '').trim(),
      ),
    );
    this.medicamentosVista = medsRaw.map(med => ({
      nombre: this.nombreMedicamento(med),
      detalle: this.detalleMedicamento(med),
    }));

    const nombreReceta = d?.nombreReceta?.trim();
    this.etiquetaHoja = nombreReceta
      ? `Vista previa de receta: ${nombreReceta}`
      : 'Vista previa de receta';

    const vis = this.cfg.visibilidad;
    const datosPlantilla = this.cfg.datos_visualizacion;
    this.previewNombre = this.text(vis.nombre, datosPlantilla.nombre);
    this.previewEspecialidad = this.text(vis.especialidad, datosPlantilla.especialidad);
    const cedula = this.text(vis.cedula_profesional, datosPlantilla.cedula_profesional);
    this.previewCedula = cedula ? `Céd. Prof. ${cedula}` : '';
    this.previewTelProf = this.text(vis.telefono_profesional, datosPlantilla.telefono_profesional);
    this.previewEmail = this.text(vis.email, datosPlantilla.email);
    this.previewConsultorio = this.text(vis.nombre_consultorio, datosPlantilla.nombre_consultorio);
    this.previewDirConsultorio = this.text(
      vis.direccion_consultorio,
      datosPlantilla.direccion_consultorio,
    );
    this.previewTelConsultorio = this.text(
      vis.telefono_consultorio,
      datosPlantilla.telefono_consultorio,
    );

    this.tieneIzquierda = !!(
      this.previewNombre ||
      this.previewEspecialidad ||
      this.previewCedula ||
      this.previewTelProf ||
      this.previewEmail ||
      this.cfg.identidad.mostrar_logo
    );
    this.tieneDerecha = !!(
      this.previewConsultorio ||
      this.previewDirConsultorio ||
      this.previewTelConsultorio
    );
    this.mostrarSeparador =
      this.cfg.identidad.separador !== 'ninguno' &&
      (this.tieneIzquierda || this.tieneDerecha);

    const pie = this.cfg.pie;
    this.previewFirmaNombre = pie.mostrar_nombre_bajo_firma
      ? this.text(true, datosPlantilla.nombre)
      : '';
    this.previewFirmaEspecialidad = pie.mostrar_especialidad_bajo_firma
      ? this.text(true, datosPlantilla.especialidad)
      : '';
    if (pie.mostrar_cedula_bajo_firma) {
      const firmaCedula = this.text(true, datosPlantilla.cedula_profesional);
      this.previewFirmaCedula = firmaCedula ? `Céd. Prof. ${firmaCedula}` : '';
    } else {
      this.previewFirmaCedula = '';
    }
    this.previewPieTelefono = pie.mostrar_telefono
      ? this.text(true, datosPlantilla.telefono_consultorio) ||
        this.text(true, datosPlantilla.telefono_profesional)
      : '';
    this.previewPieCorreo = pie.mostrar_correo ? this.text(true, datosPlantilla.email) : '';
    this.previewPieDireccion = pie.mostrar_direccion
      ? this.text(true, datosPlantilla.direccion_consultorio)
      : '';
    this.previewFechaGeneracion = pie.mostrar_fecha_generacion
      ? this.formatearFechaPie(d?.fechaEmision)
      : '';

    const dist = this.cfg.distribucion;
    this.tieneBloquePie = !!(
      dist.secciones.firma ||
      dist.secciones.sello ||
      (dist.secciones.aviso_legal && pie.texto_pie.trim()) ||
      this.previewPieTelefono ||
      this.previewPieCorreo ||
      this.previewPieDireccion ||
      pie.mostrar_numero_pagina ||
      this.previewFechaGeneracion
    );
  }

  private nombreMedicamento(med: RecetaMedicamentoPreview): string {
    return (med?.nombre ?? '').trim() || this.placeholders.medicamento;
  }

  private detalleMedicamento(med: RecetaMedicamentoPreview): string {
    const partes = [med?.dosis, med?.frecuencia, med?.duracion]
      .map(valor => (valor ?? '').trim())
      .filter(valor => !!valor);
    return partes.length > 0 ? partes.join(' · ') : this.placeholders.medicamentoDetalle;
  }

  /** Pie: fecha de emisión de la receta, nunca la fecha actual del navegador. */
  private formatearFechaPie(fechaEmision: string | null | undefined): string {
    const raw = (fechaEmision ?? '').trim();
    if (!raw) return '';

    // Ya viene como dd/MM/yyyy desde el mapper del formulario.
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw);
    if (match) {
      const day = Number(match[1]);
      const month = Number(match[2]);
      const year = Number(match[3]);
      const date = new Date(year, month - 1, day, 12, 0, 0);
      if (!Number.isNaN(date.getTime())) {
        return new Intl.DateTimeFormat('es-MX', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }).format(date);
      }
    }

    return raw;
  }

  private text(enabled: boolean, value: string | null | undefined): string {
    if (!enabled) return '';
    const v = (value ?? '').trim();
    if (!v || v === 'null' || v === 'undefined') return '';
    return v;
  }
}
