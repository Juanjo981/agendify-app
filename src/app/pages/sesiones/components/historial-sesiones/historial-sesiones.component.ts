import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { SesionesMockService } from '../../sesiones.service.mock';
import { SesionDto } from '../../models/sesion.model';

@Component({
  selector: 'app-historial-sesiones',
  templateUrl: './historial-sesiones.component.html',
  styleUrls: ['./historial-sesiones.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class HistorialSesionesComponent implements OnChanges {
  @Input({ required: true }) idPaciente!: number;

  sesiones: SesionDto[] = [];

  constructor(private svc: SesionesMockService, private router: Router) {}

  ngOnChanges() {
    this.sesiones = this.svc.getSesionesByPaciente(this.idPaciente);
  }

  verSesion(s: SesionDto) {
    this.router.navigate(['/dashboard/sesiones', s.id_sesion]);
  }

  formatFecha(iso: string): string {
    if (!iso) return '—';
    const [, m, d] = iso.split('-');
    const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    return `${parseInt(d)} ${meses[parseInt(m) - 1]}`;
  }

  formatCreacion(iso: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  get resumenNotas(): (s: SesionDto) => string {
    return (s) => s.notas.length > 100 ? s.notas.slice(0, 97) + '…' : s.notas;
  }
}
