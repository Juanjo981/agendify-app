import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { buildQueryParams } from 'src/app/shared/utils/query-params.utils';
import { withLegacyCitaFields } from '../citas/models/cita.model';
import {
  AgendaResponseDto,
  BloqueoHorarioDto,
  BloqueoHorarioUpsertRequest,
  ConfiguracionJornadaDto,
} from './agenda.models';

@Injectable({ providedIn: 'root' })
export class AgendaApiService {
  private readonly agendaBase = `${environment.apiUrl}/agenda`;
  private readonly bloqueosBase = `${environment.apiUrl}/bloqueos-horario`;
  private readonly configuracionAgendaBase = `${environment.apiUrl}/configuracion/agenda`;

  constructor(private http: HttpClient) {}

  getAgendaMes(mes: number, anio: number): Promise<AgendaResponseDto> {
    const query = buildQueryParams({ mes, anio });

    return firstValueFrom(
      this.http.get<any>(this.agendaBase, { params: query })
    ).then(raw => this.normalizeAgenda(raw));
  }

  getConfiguracionAgenda(): Promise<ConfiguracionJornadaDto> {
    return firstValueFrom(
      this.http.get<any>(this.configuracionAgendaBase)
    ).then(raw => this.normalizeConfiguracion(raw));
  }

  createBloqueo(body: BloqueoHorarioUpsertRequest): Promise<BloqueoHorarioDto> {
    return firstValueFrom(
      this.http.post<any>(this.bloqueosBase, body)
    ).then(raw => this.normalizeBloqueo(raw));
  }

  updateBloqueo(id: number, body: BloqueoHorarioUpsertRequest): Promise<BloqueoHorarioDto> {
    return firstValueFrom(
      this.http.put<any>(`${this.bloqueosBase}/${id}`, body)
    ).then(raw => this.normalizeBloqueo(raw));
  }

  deleteBloqueo(id: number): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(`${this.bloqueosBase}/${id}`)
    );
  }

  private normalizeAgenda(raw: any): AgendaResponseDto {
    return {
      citas: Array.isArray(raw?.citas)
        ? raw.citas.map((cita: any) => withLegacyCitaFields(cita))
        : [],
      bloqueos: Array.isArray(raw?.bloqueos)
        ? raw.bloqueos.map((bloqueo: any) => this.normalizeBloqueo(bloqueo))
        : [],
      configuracion_jornada: raw?.configuracion_jornada
        ? this.normalizeConfiguracion(raw.configuracion_jornada)
        : null,
    };
  }

  private normalizeBloqueo(raw: any): BloqueoHorarioDto {
    return {
      id_bloqueo_horario: Number(raw?.id_bloqueo_horario ?? raw?.id ?? 0),
      fecha: raw?.fecha ?? this.toDatePart(raw?.fecha_inicio),
      fecha_inicio: raw?.fecha_inicio ?? this.mergeDateAndTime(raw?.fecha, raw?.hora_inicio),
      fecha_fin: raw?.fecha_fin ?? this.mergeDateAndTime(raw?.fecha, raw?.hora_fin),
      hora_inicio: this.normalizeTime(raw?.hora_inicio ?? this.toTimePart(raw?.fecha_inicio)),
      hora_fin: this.normalizeTime(raw?.hora_fin ?? this.toTimePart(raw?.fecha_fin)),
      motivo: raw?.motivo ?? raw?.motivo_bloqueo ?? '',
      motivo_bloqueo: raw?.motivo_bloqueo ?? raw?.motivo ?? '',
      tipo_bloqueo: raw?.tipo_bloqueo ?? 'PERSONAL',
      todo_el_dia: Boolean(raw?.todo_el_dia),
      activo: raw?.activo,
    };
  }

  private normalizeConfiguracion(raw: any): ConfiguracionJornadaDto {
    return {
      hora_inicio: this.normalizeTime(raw?.hora_inicio ?? raw?.hora_inicio_jornada ?? '09:00'),
      hora_fin: this.normalizeTime(raw?.hora_fin ?? raw?.hora_fin_jornada ?? '18:00'),
      duracion_cita_default_min: Number(raw?.duracion_cita_default_min ?? raw?.duracion_cita_default ?? 60),
      intervalo_minutos: Number(raw?.intervalo_minutos ?? raw?.intervalo_calendario ?? raw?.intervalo ?? 30),
      intervalo: Number(raw?.intervalo ?? raw?.intervalo_calendario ?? raw?.intervalo_minutos ?? 30),
      permite_confirmacion_publica: Boolean(raw?.permite_confirmacion_publica),
      mostrar_sabados: raw?.mostrar_sabados ?? true,
      mostrar_domingos: raw?.mostrar_domingos ?? false,
    };
  }

  private toDatePart(isoDateTime?: string): string {
    if (!isoDateTime) return '';
    return String(isoDateTime).substring(0, 10);
  }

  private toTimePart(isoDateTime?: string): string {
    if (!isoDateTime) return '';
    return this.normalizeTime(String(isoDateTime).substring(11, 19));
  }

  private mergeDateAndTime(dateIso?: string, time?: string): string {
    if (!dateIso || !time) return '';
    const normalizedTime = this.normalizeTime(time);
    return `${dateIso}T${normalizedTime}:00`;
  }

  private normalizeTime(raw: string): string {
    if (!raw) return '';
    const value = String(raw);
    return value.length >= 5 ? value.substring(0, 5) : value;
  }
}
