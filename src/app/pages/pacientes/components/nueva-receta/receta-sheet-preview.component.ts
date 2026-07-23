import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import {
  PlantillaRecetasConfigDto,
  createDefaultPlantillaConfig,
  plantillaColorHex,
} from 'src/app/shared/models/plantilla-recetas.models';
import { RecetaContenidoDinamico } from './receta-contenido.models';

@Component({
  selector: 'app-receta-sheet-preview',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './receta-sheet-preview.component.html',
  styleUrls: ['./receta-sheet-preview.component.scss'],
})
export class RecetaSheetPreviewComponent {
  @Input() config: PlantillaRecetasConfigDto | null = null;
  @Input() contenido: RecetaContenidoDinamico | null = null;

  get cfg(): PlantillaRecetasConfigDto {
    return this.config ?? createDefaultPlantillaConfig();
  }

  get colorPrincipal(): string {
    return plantillaColorHex(this.cfg.identidad.color_id);
  }

  get datos() {
    return this.cfg.datos_visualizacion;
  }

  get vis() {
    return this.cfg.visibilidad;
  }

  get dist() {
    return this.cfg.distribucion;
  }

  get pie() {
    return this.cfg.pie;
  }

  get dyn(): RecetaContenidoDinamico {
    return (
      this.contenido ?? {
        pacienteNombre: '',
        fechaEmision: '',
        edad: null,
        diagnostico: '',
        medicamentos: [],
        indicaciones: '',
        proximaCitaFecha: '',
        proximaCitaHora: '',
      }
    );
  }

  text(enabled: boolean, value: string | null | undefined): string {
    if (!enabled) return '';
    const v = (value ?? '').trim();
    if (!v || v === 'null' || v === 'undefined') return '';
    return v;
  }

  get previewNombre(): string {
    return this.text(this.vis.nombre, this.datos.nombre);
  }

  get previewEspecialidad(): string {
    return this.text(this.vis.especialidad, this.datos.especialidad);
  }

  get previewCedula(): string {
    const value = this.text(this.vis.cedula_profesional, this.datos.cedula_profesional);
    return value ? `Céd. Prof. ${value}` : '';
  }

  get previewTelProf(): string {
    return this.text(this.vis.telefono_profesional, this.datos.telefono_profesional);
  }

  get previewEmail(): string {
    return this.text(this.vis.email, this.datos.email);
  }

  get previewConsultorio(): string {
    return this.text(this.vis.nombre_consultorio, this.datos.nombre_consultorio);
  }

  get previewDirConsultorio(): string {
    return this.text(this.vis.direccion_consultorio, this.datos.direccion_consultorio);
  }

  get previewTelConsultorio(): string {
    return this.text(this.vis.telefono_consultorio, this.datos.telefono_consultorio);
  }

  get tieneIzquierda(): boolean {
    return !!(
      this.previewNombre ||
      this.previewEspecialidad ||
      this.previewCedula ||
      this.previewTelProf ||
      this.previewEmail ||
      this.cfg.identidad.mostrar_logo
    );
  }

  get tieneDerecha(): boolean {
    return !!(this.previewConsultorio || this.previewDirConsultorio || this.previewTelConsultorio);
  }

  get mostrarSeparador(): boolean {
    if (this.cfg.identidad.separador === 'ninguno') return false;
    return this.tieneIzquierda || this.tieneDerecha;
  }

  etiqueta(key: keyof PlantillaRecetasConfigDto['distribucion']['etiquetas'], fallback: string): string {
    const value = (this.dist.etiquetas[key] ?? '').trim();
    return value || fallback;
  }

  get medicamentosVisibles() {
    const list = this.dyn.medicamentos.filter(m => (m.nombre || m.dosis || m.frecuencia || m.duracion).trim());
    return list.length > 0
      ? list
      : [{ nombre: 'Nombre del medicamento', dosis: '', frecuencia: '', duracion: '' }];
  }

  get previewFirmaNombre(): string {
    return this.pie.mostrar_nombre_bajo_firma ? this.text(true, this.datos.nombre) : '';
  }

  get previewFirmaEspecialidad(): string {
    return this.pie.mostrar_especialidad_bajo_firma ? this.text(true, this.datos.especialidad) : '';
  }

  get previewFirmaCedula(): string {
    if (!this.pie.mostrar_cedula_bajo_firma) return '';
    const value = this.text(true, this.datos.cedula_profesional);
    return value ? `Céd. Prof. ${value}` : '';
  }

  get previewPieTelefono(): string {
    if (!this.pie.mostrar_telefono) return '';
    return this.text(true, this.datos.telefono_consultorio) || this.text(true, this.datos.telefono_profesional);
  }

  get previewPieCorreo(): string {
    return this.pie.mostrar_correo ? this.text(true, this.datos.email) : '';
  }

  get previewPieDireccion(): string {
    return this.pie.mostrar_direccion ? this.text(true, this.datos.direccion_consultorio) : '';
  }

  get previewFechaGeneracion(): string {
    if (!this.pie.mostrar_fecha_generacion) return '';
    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date());
  }

  get tieneBloquePie(): boolean {
    return !!(
      this.dist.secciones.firma ||
      this.dist.secciones.sello ||
      (this.dist.secciones.aviso_legal && this.pie.texto_pie.trim()) ||
      this.previewPieTelefono ||
      this.previewPieCorreo ||
      this.previewPieDireccion ||
      this.pie.mostrar_numero_pagina ||
      this.previewFechaGeneracion
    );
  }
}
