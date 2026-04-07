import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { SolicitudReprogramacion } from 'src/app/shared/models/solicitud-reprogramacion.model';

interface SolicitudReprogramacionDto {
  id_solicitud_reprogramacion: number;
  id_cita: number;
  paciente_nombre?: string | null;
  motivo?: string | null;
  fecha_solicitada?: string | null;
  hora_inicio_solicitada?: string | null;
  hora_fin_solicitada?: string | null;
  estado?: string | null;
  estado_solicitud?: string | null;
  created_at?: string | null;
}

interface AprobarSolicitudResponse {
  solicitud?: SolicitudReprogramacionDto | null;
}

@Injectable({ providedIn: 'root' })
export class SolicitudReprogramacionApiService {
  private readonly base = `${environment.apiUrl}/citas`;
  private readonly cache = new Map<number, SolicitudReprogramacion>();

  constructor(private http: HttpClient) {}

  getByCita(idCita: number): SolicitudReprogramacion | undefined {
    return this.cache.get(idCita);
  }

  clearCache(): void {
    this.cache.clear();
  }

  async preloadPendientes(citaIds: number[]): Promise<void> {
    const ids = [...new Set(citaIds.filter(id => Number.isFinite(id) && id > 0))];
    this.cache.clear();

    await Promise.all(ids.map(async idCita => {
      try {
        const response = await firstValueFrom(
          this.http.get<SolicitudReprogramacionDto[]>(`${this.base}/${idCita}/solicitudes-reprogramacion`)
        );
        const solicitud = (response ?? [])
          .map(item => this.mapSolicitud(item))
          .find(item => item.estado === 'PENDIENTE');

        if (solicitud) {
          this.cache.set(idCita, solicitud);
        }
      } catch {
        // Keep the agenda stable even if one cita has no readable sub-resource yet.
      }
    }));
  }

  async aprobar(idCita: number, idSolicitud: number): Promise<SolicitudReprogramacion | null> {
    const response = await firstValueFrom(
      this.http.patch<AprobarSolicitudResponse>(
        `${this.base}/${idCita}/solicitudes-reprogramacion/${idSolicitud}/aprobar`,
        {},
      )
    );

    this.cache.delete(idCita);
    return response?.solicitud ? this.mapSolicitud(response.solicitud) : null;
  }

  async rechazar(idCita: number, idSolicitud: number, motivo?: string): Promise<SolicitudReprogramacion> {
    const response = await firstValueFrom(
      this.http.patch<SolicitudReprogramacionDto>(
        `${this.base}/${idCita}/solicitudes-reprogramacion/${idSolicitud}/rechazar`,
        motivo?.trim() ? { motivo_rechazo: motivo.trim() } : {},
      )
    );

    this.cache.delete(idCita);
    return this.mapSolicitud(response);
  }

  private mapSolicitud(dto: SolicitudReprogramacionDto): SolicitudReprogramacion {
    const fecha = dto.fecha_solicitada ?? '';
    const hora = this.normalizeTime(dto.hora_inicio_solicitada);

    return {
      idSolicitud: dto.id_solicitud_reprogramacion,
      idCita: dto.id_cita,
      pacienteNombre: dto.paciente_nombre ?? 'Paciente',
      fechaCita: fecha,
      horaCita: hora,
      mensajePaciente: dto.motivo ?? '',
      fechaHoraSugerida: fecha && hora ? `${fecha}T${hora}` : undefined,
      estado: this.mapEstado(dto.estado_solicitud ?? dto.estado),
      fechaSolicitud: dto.created_at ?? new Date().toISOString(),
    };
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
