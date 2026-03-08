import { Component, Input, Output, EventEmitter, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { SesionAdjunto } from '../../models/sesion.model';
import { ArchivoAdjuntoComponent } from '../archivo-adjunto/archivo-adjunto.component';

export interface SesionFormData {
  notas: string;
  adjunto?: SesionAdjunto;
}

@Component({
  selector: 'app-sesion-form',
  templateUrl: './sesion-form.component.html',
  styleUrls: ['./sesion-form.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, ArchivoAdjuntoComponent],
})
export class SesionFormComponent implements OnInit {
  @Input() citaId?: number;
  @Input() notasIniciales = '';
  @Input() adjuntoInicial?: SesionAdjunto;
  @Output() guardado = new EventEmitter<SesionFormData>();
  @Output() cancelado = new EventEmitter<void>();

  notas = '';
  adjunto: SesionAdjunto | undefined = undefined;
  notasError = '';

  ngOnInit() {
    this.notas = this.notasIniciales;
    this.adjunto = this.adjuntoInicial;
  }

  onArchivoSeleccionado(a: SesionAdjunto) {
    this.adjunto = a;
  }

  onArchivoEliminado() {
    this.adjunto = undefined;
  }

  validar(): boolean {
    this.notasError = '';
    if (!this.notas.trim() && !this.adjunto) {
      this.notasError = 'Escribe notas o adjunta un archivo para guardar la sesión.';
      return false;
    }
    return true;
  }

  guardar() {
    if (!this.validar()) return;
    this.guardado.emit({ notas: this.notas.trim(), adjunto: this.adjunto });
  }
}
