import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { SesionesMockService } from './sesiones.service.mock';
import { SesionDto } from './models/sesion.model';
import { AgfDatePickerComponent } from '../../shared/components/agf-date-picker/agf-date-picker.component';

interface FiltrosSesiones {
  busqueda: string;
  fecha_desde: string;
  fecha_hasta: string;
  con_adjunto: 'todos' | 'con' | 'sin';
}

@Component({
  selector: 'app-sesiones',
  templateUrl: './sesiones.page.html',
  styleUrls: ['./sesiones.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, AgfDatePickerComponent],
})
export class SesionesPage implements OnInit {
  sesionesFiltradas: SesionDto[] = [];

  filtros: FiltrosSesiones = {
    busqueda: '',
    fecha_desde: '',
    fecha_hasta: '',
    con_adjunto: 'todos',
  };

  constructor(private svc: SesionesMockService, private router: Router) {}

  ngOnInit() { this.filtrar(); }

  get totalSesiones(): number { return this.svc.getAllSesiones().length; }

  filtrar() {
    let r = this.svc.getAllSesiones();
    const q = this.filtros.busqueda.trim().toLowerCase();
    if (q) {
      r = r.filter(s =>
        s.nombre_paciente.toLowerCase().includes(q) ||
        s.apellido_paciente.toLowerCase().includes(q) ||
        s.notas.toLowerCase().includes(q)
      );
    }
    if (this.filtros.fecha_desde) r = r.filter(s => s.fecha_cita >= this.filtros.fecha_desde);
    if (this.filtros.fecha_hasta) r = r.filter(s => s.fecha_cita <= this.filtros.fecha_hasta);
    if (this.filtros.con_adjunto === 'con') r = r.filter(s => !!s.adjunto);
    if (this.filtros.con_adjunto === 'sin') r = r.filter(s => !s.adjunto);
    this.sesionesFiltradas = r;
  }

  limpiarFiltros() {
    this.filtros = { busqueda: '', fecha_desde: '', fecha_hasta: '', con_adjunto: 'todos' };
    this.filtrar();
  }

  get tieneActivos(): boolean {
    return !!(
      this.filtros.busqueda ||
      this.filtros.fecha_desde ||
      this.filtros.fecha_hasta ||
      this.filtros.con_adjunto !== 'todos'
    );
  }

  verDetalle(s: SesionDto) {
    this.router.navigate(['/dashboard/sesiones', s.id_sesion]);
  }

  formatFecha(iso: string): string {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  formatCreacion(iso: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  resumenNotas(notas: string): string {
    return notas.length > 90 ? notas.slice(0, 87) + '…' : notas;
  }

  getIniciales(s: SesionDto): string {
    return `${s.apellido_paciente.charAt(0)}${s.nombre_paciente.charAt(0)}`.toUpperCase();
  }

  getAvatarColor(nombre: string): string {
    const colors = ['#6366f1', '#8b5cf6', '#3b82f6', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444'];
    return colors[nombre.charCodeAt(0) % colors.length];
  }

  getFileIcon(type: string): string {
    if (type.startsWith('image/')) return 'image-outline';
    if (type === 'application/pdf') return 'document-outline';
    return 'document-text-outline';
  }
}
