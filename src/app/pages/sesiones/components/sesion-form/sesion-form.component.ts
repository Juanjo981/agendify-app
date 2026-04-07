import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { SesionArchivoLocal } from '../../models/sesion.model';
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
  @Input() saving = false;
  @Input() errorMessage = '';
  @Output() guardado = new EventEmitter<SesionFormData>();
  @Output() cancelado = new EventEmitter<void>();

  fechaSesion = '';
  tipoSesion = 'INDIVIDUAL';
  resumen = '';
  adjunto: SesionArchivoLocal | undefined = undefined;
  fechaError = '';
  resumenError = '';

  ngOnInit() {
    this.fechaSesion = this.fechaSesionInicial;
    this.tipoSesion = this.tipoSesionInicial || 'INDIVIDUAL';
    this.resumen = this.resumenInicial;
    this.adjunto = this.adjuntoInicial;
  }

  onArchivoSeleccionado(adjunto: SesionArchivoLocal) {
    this.adjunto = adjunto;
  }

  onArchivoEliminado() {
    this.adjunto = undefined;
  }

  validar(): boolean {
    this.fechaError = '';
    this.resumenError = '';

    if (!this.fechaSesion.trim()) {
      this.fechaError = 'Indica la fecha y hora de la sesión.';
      return false;
    }

    if (!this.resumen.trim() && !this.adjunto) {
      this.resumenError = 'Escribe un resumen o adjunta un archivo para guardar la sesión.';
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
