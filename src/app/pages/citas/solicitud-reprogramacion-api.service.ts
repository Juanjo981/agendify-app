import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { SolicitudReprogramacion } from 'src/app/shared/models/solicitud-reprogramacion.model';
import { buildQueryParams } from 'src/app/shared/utils/query-params.utils';
import { PageResponse } from 'src/app/shared/models/page.model';

interface SolicitudReprogramacionDto {
  id_solicitud?: number;
  id_solicitud_reprogramacion?: number;
  id_cita: number;
  paciente_nombre?: string | null;
  fecha_cita?: string | null;
  hora_cita?: string | null;
  mensaje_paciente?: string | null;
  fecha_hora_sugerida?: string | null;
  motivo?: string | null;
  fecha_solicitada?: string | null;
  hora_inicio_solicitada?: string | null;
  hora_fin_solicitada?: string | null;
  estado?: string | null;
  estado_solicitud?: string | null;
  fecha_solicitud?: string | null;
  created_at?: string | null;
}

interface AprobarSolicitudResponse {
  solicitud?: SolicitudReprogramacionDto | null;
}

type SolicitudListResponse = SolicitudReprogramacionDto[] | PageResponse<SolicitudReprogramacionDto>;

@Injectable({ providedIn: 'root' })
export class SolicitudReprogramacionApiService {
  private readonly base = `${environment.apiUrl}/solicitudes-reprogramacion`;
  private readonly cacheByCita = new Map<number, SolicitudReprogramacion>();
  private readonly cacheBySolicitud = new Map<number, SolicitudReprogramacion>();

  constructor(private http: HttpClient) {}

  getByCita(idCita: number): SolicitudReprogramacion | undefined {
    const solicitud = this.cacheByCita.get(idCita);
    return solicitud?.estado === 'PENDIENTE' ? solicitud : undefined;
  }

  getById(idSolicitud: number): SolicitudReprogramacion | undefined {
    return this.cacheBySolicitud.get(idSolicitud);
  }

  clearCache(): void {
    this.cacheByCita.clear();
    this.cacheBySolicitud.clear();
  }

  async preloadPendientes(citaIds: number[]): Promise<void> {
    const ids = [...new Set(citaIds.filter(id => Number.isFinite(id) && id > 0))];
    this.clearCache();

    if (ids.length === 0) {
      this.clearCache();
      return;
    }

    try {
      const solicitudes = await this.list({ estado: 'PENDIENTE', size: 500 });
      const idsSet = new Set(ids);

      this.clearCache();
      for (const solicitud of solicitudes) {
        if (idsSet.has(solicitud.id_cita) && solicitud.estado === 'PENDIENTE') {
          this.storeSolicitud(solicitud);
        }
      }
    } catch {
      this.clearCache();
    }
  }

  async ensureLoaded(idSolicitud: number): Promise<SolicitudReprogramacion | null> {
    const cached = this.getById(idSolicitud);
    if (cached) {
      return cached;
    }

    const solicitudes = await this.list({ size: 500 });
    const found = solicitudes.find(item => item.id_solicitud === idSolicitud) ?? null;
    if (found) {
      this.storeSolicitud(found);
    }
    return found;
  }

  async aprobar(idSolicitud: number): Promise<SolicitudReprogramacion | null> {
    const response = await firstValueFrom(
      this.http.patch<AprobarSolicitudResponse>(
        `${this.base}/${idSolicitud}/aceptar`,
        {},
      )
    );

    const mapped = response?.solicitud ? this.mapSolicitud(response.solicitud) : null;
    if (mapped) {
      this.storeSolicitud(mapped);
    } else {
      this.removeCachedSolicitudById(idSolicitud);
    }
    return mapped;
  }

  async rechazar(idSolicitud: number, motivo?: string): Promise<SolicitudReprogramacion> {
    const response = await firstValueFrom(
      this.http.patch<SolicitudReprogramacionDto>(
        `${this.base}/${idSolicitud}/rechazar`,
        motivo?.trim() ? { motivoRechazo: motivo.trim() } : {},
      )
    );

    const mapped = this.mapSolicitud(response);
    this.storeSolicitud(mapped);
    return mapped;
  }

  private async list(params: {
    estado?: string;
    page?: number;
    size?: number;
    sort?: string;
  } = {}): Promise<SolicitudReprogramacion[]> {
    const query = buildQueryParams({
      estado: params.estado,
      page: params.page,
      size: params.size ?? 500,
      sort: params.sort ?? 'fecha_solicitud,desc',
    });

    const response = await firstValueFrom(
      this.http.get<SolicitudListResponse>(this.base, { params: query })
    );

    const items = Array.isArray(response) ? response : (response.content ?? []);
    return items.map(item => this.mapSolicitud(item));
  }

  private mapSolicitud(dto: SolicitudReprogramacionDto): SolicitudReprogramacion {
    const fecha = dto.fecha_cita ?? dto.fecha_solicitada ?? '';
    const hora = this.normalizeTime(dto.hora_cita ?? dto.hora_inicio_solicitada);
    const fechaHoraSugerida =
      dto.fecha_hora_sugerida ??
      (dto.fecha_solicitada && dto.hora_inicio_solicitada
        ? `${dto.fecha_solicitada}T${this.normalizeTime(dto.hora_inicio_solicitada)}`
        : undefined);

    return {
      id_solicitud: dto.id_solicitud ?? dto.id_solicitud_reprogramacion ?? 0,
      id_cita: dto.id_cita,
      paciente_nombre: dto.paciente_nombre ?? 'Paciente',
      fecha_cita: fecha,
      hora_cita: hora,
      mensaje_paciente: dto.mensaje_paciente ?? dto.motivo ?? '',
      fecha_hora_sugerida: fechaHoraSugerida,
      estado: this.mapEstado(dto.estado_solicitud ?? dto.estado),
      fecha_solicitud: dto.fecha_solicitud ?? dto.created_at ?? new Date().toISOString(),
    };
  }

  private storeSolicitud(solicitud: SolicitudReprogramacion): void {
    this.cacheBySolicitud.set(solicitud.id_solicitud, solicitud);
    if (solicitud.estado === 'PENDIENTE') {
      this.cacheByCita.set(solicitud.id_cita, solicitud);
      return;
    }

    this.cacheByCita.delete(solicitud.id_cita);
  }

  private removeCachedSolicitudById(idSolicitud: number): void {
    const cached = this.cacheBySolicitud.get(idSolicitud);
    if (cached) {
      this.cacheByCita.delete(cached.id_cita);
    }
    this.cacheBySolicitud.delete(idSolicitud);
  }

  private mapEstado(raw?: string | null): SolicitudReprogramacion['estado'] {
    switch (String(raw ?? '').toUpperCase()) {
      case 'ACEPTADA':
      case 'APROBADA':
        return 'ACEPTADA';
      case 'RECHAZADA':
        return 'RECHAZADA';
      default:
        return 'PENDIENTE';
    }
  }

  private normalizeTime(value?: string | null): string {
    if (!value) return '';
    return String(value).slice(0, 5);
  }
}
