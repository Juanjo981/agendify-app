import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { SesionDto, getSessionSummary } from '../../models/sesion.model';

@Component({
  selector: 'app-historial-sesiones',
  templateUrl: './historial-sesiones.component.html',
  styleUrls: ['./historial-sesiones.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class HistorialSesionesComponent {
  @Input() sesiones: SesionDto[] = [];

  constructor(private router: Router) {}

  verSesion(sesion: SesionDto) {
    this.router.navigate(['/dashboard/sesiones', sesion.id_sesion]);
  }

  formatFecha(iso: string): string {
    if (!iso) return '-';
    const date = new Date(iso);
    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return `${date.getDate()} ${meses[date.getMonth()]}`;
  }

  formatCreacion(iso: string): string {
    if (!iso) return '-';
    const date = new Date(iso);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  resumenNotas(sesion: SesionDto): string {
    const resumen = getSessionSummary(sesion);
    return resumen.length > 100 ? `${resumen.slice(0, 97)}...` : resumen || 'Sin resumen clínico';
  }
}
