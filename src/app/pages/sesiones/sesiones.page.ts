import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { getAvatarColor as avatarColorUtil } from '../../shared/utils/avatar.utils';
import { formatFecha as formatFechaUtil } from '../../shared/utils/date.utils';
import { AgfDatePickerComponent } from '../../shared/components/agf-date-picker/agf-date-picker.component';
import { mapApiError } from 'src/app/shared/utils/api-error.mapper';
import { AdjuntosServiceApi } from 'src/app/services/adjuntos.service.api';
import { SesionesApiService } from './sesiones-api.service';
import { ArchivoAdjuntoDto, SesionDto, getSessionSummary } from './models/sesion.model';

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
  sesiones: SesionDto[] = [];
  sesionesFiltradas: SesionDto[] = [];
  totalSesiones = 0;
  loading = false;
  errorMessage = '';
  cargandoAdjuntos = false;
  private readonly adjuntosPorSesion = new Map<number, ArchivoAdjuntoDto | null>();

  filtros: FiltrosSesiones = {
    busqueda: '',
    fecha_desde: '',
    fecha_hasta: '',
    con_adjunto: 'todos',
  };

  constructor(
    private sesionesApi: SesionesApiService,
    private adjuntosApi: AdjuntosServiceApi,
    private router: Router,
  ) {}

  ngOnInit() {
    void this.cargarSesiones();
  }

  async cargarSesiones() {
    this.loading = true;
    this.errorMessage = '';

    try {
      const page = await this.sesionesApi.getAll({
        fechaDesde: this.filtros.fecha_desde ? `${this.filtros.fecha_desde}T00:00:00` : undefined,
        fechaHasta: this.filtros.fecha_hasta ? `${this.filtros.fecha_hasta}T23:59:59` : undefined,
        size: 50,
        sort: 'fecha_sesion,desc',
      });

      this.sesiones = page.content ?? [];
      this.totalSesiones = page.total_elements ?? this.sesiones.length;
      await this.cargarResumenAdjuntos(this.sesiones);
      this.aplicarFiltrosLocales();
    } catch (err) {
      this.sesiones = [];
      this.sesionesFiltradas = [];
      this.totalSesiones = 0;
      this.errorMessage = mapApiError(err).userMessage;
    } finally {
      this.loading = false;
    }
  }

  aplicarFiltrosLocales() {
    let resultado = [...this.sesiones];
    const query = this.filtros.busqueda.trim().toLowerCase();

    if (query) {
      resultado = resultado.filter(sesion => {
        const paciente = `${sesion.nombre_paciente} ${sesion.apellido_paciente}`.toLowerCase();
        const resumen = getSessionSummary(sesion).toLowerCase();
        const tipo = (sesion.tipo_sesion ?? '').toLowerCase();
        return paciente.includes(query) || resumen.includes(query) || tipo.includes(query);
      });
    }

    if (this.filtros.con_adjunto === 'con') {
      resultado = resultado.filter(sesion => this.hasAdjunto(sesion.id_sesion));
    }

    if (this.filtros.con_adjunto === 'sin') {
      resultado = resultado.filter(sesion => !this.hasAdjunto(sesion.id_sesion));
    }

    this.sesionesFiltradas = resultado;
  }

  onDateFiltersChanged() {
    void this.cargarSesiones();
  }

  limpiarFiltros() {
    this.filtros = { busqueda: '', fecha_desde: '', fecha_hasta: '', con_adjunto: 'todos' };
    void this.cargarSesiones();
  }

  get tieneActivos(): boolean {
    return !!(
      this.filtros.busqueda ||
      this.filtros.fecha_desde ||
      this.filtros.fecha_hasta ||
      this.filtros.con_adjunto !== 'todos'
    );
  }

  verDetalle(sesion: SesionDto) {
    this.router.navigate(['/dashboard/sesiones', sesion.id_sesion]);
  }

  formatFecha(iso: string): string {
    return formatFechaUtil(iso);
  }

  formatCreacion(iso: string): string {
    if (!iso) return '-';
    const date = new Date(iso);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  resumenNotas(resumen: string): string {
    return resumen.length > 90 ? `${resumen.slice(0, 87)}...` : resumen;
  }

  getIniciales(sesion: SesionDto): string {
    return `${sesion.apellido_paciente.charAt(0)}${sesion.nombre_paciente.charAt(0)}`.toUpperCase();
  }

  getAvatarColor(nombre: string): string {
    return avatarColorUtil(nombre);
  }

  getResumen(sesion: SesionDto): string {
    return getSessionSummary(sesion);
  }

  getAdjuntoPrincipal(sesionId: number): ArchivoAdjuntoDto | null {
    return this.adjuntosPorSesion.get(sesionId) ?? null;
  }

  hasAdjunto(sesionId: number): boolean {
    return !!this.getAdjuntoPrincipal(sesionId);
  }

  getFileIcon(mimeType?: string | null): string {
    if (!mimeType) return 'attach-outline';
    if (mimeType.startsWith('image/')) return 'image-outline';
    if (mimeType === 'application/pdf') return 'document-outline';
    return 'document-text-outline';
  }

  private async cargarResumenAdjuntos(sesiones: SesionDto[]) {
    this.cargandoAdjuntos = true;

    const resultados = await Promise.all(
      sesiones.map(async sesion => {
        try {
          const page = await this.adjuntosApi.getBySesionId(sesion.id_sesion, { size: 1 });
          return [sesion.id_sesion, page.content?.[0] ?? null] as const;
        } catch {
          return [sesion.id_sesion, null] as const;
        }
      })
    );

    this.adjuntosPorSesion.clear();
    resultados.forEach(([sesionId, archivo]) => {
      this.adjuntosPorSesion.set(sesionId, archivo);
    });

    this.cargandoAdjuntos = false;
  }
}
