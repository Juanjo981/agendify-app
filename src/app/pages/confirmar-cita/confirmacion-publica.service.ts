import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface CitaGestionPublicaResponseDto {
  fecha_inicio: string;
  fecha_fin: string;
  estado_cita: string;
  paciente_nombre: string;
  profesional_nombre: string;
  profesional_especialidad?: string | null;
  nombre_consulta?: string | null;
  motivo?: string | null;
  fecha_expiracion_token?: string | null;
  puede_confirmar: boolean;
  puede_cancelar: boolean;
  puede_solicitar_reprogramacion: boolean;
  token_valido: boolean;
  accion_realizada?: string | null;
  fecha_accion?: string | null;
  confirmado_por_paciente?: boolean | null;
  fecha_confirmacion?: string | null;
}

export interface SolicitudReprogramacionPublicaRequest {
  fecha_solicitada: string;
  hora_inicio_solicitada: string;
  hora_fin_solicitada: string;
  motivo: string;
}

export interface DisponibilidadPublicaSlotDto {
  hora_inicio: string;
  hora_fin: string;
}

export interface DisponibilidadPublicaResponseDto {
  fecha: string;
  duracion_minutos: number;
  total_slots: number;
  slots: DisponibilidadPublicaSlotDto[];
}

@Injectable({ providedIn: 'root' })
export class ConfirmacionPublicaService {
  private readonly publicBase = `${environment.apiUrl.replace(/\/api\/?$/, '')}/public/citas/gestion`;

  constructor(private http: HttpClient) {}

  getByToken(token: string): Promise<CitaGestionPublicaResponseDto> {
    return firstValueFrom(
      this.http.get<CitaGestionPublicaResponseDto>(`${this.publicBase}/${encodeURIComponent(token)}`)
    );
  }

  confirmar(token: string): Promise<CitaGestionPublicaResponseDto> {
    return firstValueFrom(
      this.http.patch<CitaGestionPublicaResponseDto>(`${this.publicBase}/${encodeURIComponent(token)}/confirmar`, {})
    );
  }

  cancelar(token: string): Promise<CitaGestionPublicaResponseDto> {
    return firstValueFrom(
      this.http.patch<CitaGestionPublicaResponseDto>(`${this.publicBase}/${encodeURIComponent(token)}/cancelar`, {})
    );
  }

  solicitarReprogramacion(token: string, body: SolicitudReprogramacionPublicaRequest): Promise<unknown> {
    return firstValueFrom(
      this.http.post(`${this.publicBase}/${encodeURIComponent(token)}/solicitudes-reprogramacion`, body)
    );
  }

  getDisponibilidad(token: string, params: {
    fecha: string;
    duracionMinutos?: number;
  }): Promise<DisponibilidadPublicaResponseDto> {
    return firstValueFrom(
      this.http.get<DisponibilidadPublicaResponseDto>(
        `${this.publicBase}/${encodeURIComponent(token)}/disponibilidad`,
        {
          params: {
            fecha: params.fecha,
            ...(params.duracionMinutos ? { duracionMinutos: String(params.duracionMinutos) } : {}),
          },
        },
      )
    );
  }
}
