import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ArchivoAdjuntoDto, SesionArchivoLocal } from '../../models/sesion.model';
import { ArchivoAdjuntoComponent } from '../archivo-adjunto/archivo-adjunto.component';

export interface SesionFormData {
  fecha_sesion: string;
  tipo_sesion: string;
  resumen: string;
  adjunto?: SesionArchivoLocal;
}

@Component({
  selector: 'app-sesion-form',
  templateUrl: './sesion-form.component.html',
  styleUrls: ['./sesion-form.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, ArchivoAdjuntoComponent],
})
export class SesionFormComponent implements OnInit {
  @Input() fechaSesionInicial = '';
  @Input() tipoSesionInicial = 'INDIVIDUAL';
  @Input() resumenInicial = '';
  @Input() adjuntoInicial?: SesionArchivoLocal;
  @Input() adjuntosExistentes: ArchivoAdjuntoDto[] = [];
  @Input() saving = false;
  @Input() errorMessage = '';
  @Output() guardado = new EventEmitter<SesionFormData>();
  @Output() verAdjuntoExistente = new EventEmitter<ArchivoAdjuntoDto>();
  @Output() cancelado = new EventEmitter<void>();

  fechaSesion = '';
  tipoSesion = 'INDIVIDUAL';
  resumen = '';
  adjunto: SesionArchivoLocal | undefined = undefined;
  fechaError = '';
  resumenError = '';
  adjuntoError = '';

  get uploadDisabled(): boolean {
    return this.adjuntosExistentes.length > 0;
  }

  ngOnInit() {
    this.fechaSesion = this.fechaSesionInicial;
    this.tipoSesion = this.tipoSesionInicial || 'INDIVIDUAL';
    this.resumen = this.resumenInicial;
    this.adjunto = this.adjuntoInicial;
  }

  onArchivoSeleccionado(adjunto: SesionArchivoLocal) {
    if (this.uploadDisabled) {
      this.adjuntoError = 'Esta sesión ya tiene un archivo adjunto. Elimina el actual para subir otro.';
      return;
    }
    this.adjunto = adjunto;
    this.adjuntoError = '';
  }

  onArchivoEliminado() {
    this.adjunto = undefined;
    this.adjuntoError = '';
  }

  onVerAdjuntoExistente(adjunto: ArchivoAdjuntoDto) {
    this.verAdjuntoExistente.emit(adjunto);
  }

  validar(): boolean {
    this.fechaError = '';
    this.resumenError = '';
    this.adjuntoError = '';

    if (!this.fechaSesion.trim()) {
      this.fechaError = 'Indica la fecha y hora de la sesión.';
      return false;
    }

    if (!this.resumen.trim() && !this.adjunto) {
      this.resumenError = 'Escribe un resumen o adjunta un archivo para guardar la sesión.';
      return false;
    }

    if (this.uploadDisabled && this.adjunto) {
      this.adjuntoError = 'Esta sesión ya tiene un archivo adjunto. Elimina el actual para subir otro.';
      return false;
    }

    return true;
  }

  guardar() {
    if (this.saving || !this.validar()) return;

    this.guardado.emit({
      fecha_sesion: this.fechaSesion,
      tipo_sesion: this.tipoSesion.trim() || 'INDIVIDUAL',
      resumen: this.resumen.trim(),
      adjunto: this.adjunto,
    });
  }
}
