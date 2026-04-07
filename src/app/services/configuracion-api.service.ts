import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  ConfiguracionAgendaDto,
  ConfiguracionAgendaRequest,
  ConfiguracionRecordatorioDto,
  ConfiguracionRecordatorioRequest,
  ConfiguracionSistemaDto,
  ConfiguracionSistemaRequest,
} from '../shared/models/configuracion.models';

@Injectable({ providedIn: 'root' })
export class ConfiguracionApiService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getAgenda(): Promise<ConfiguracionAgendaDto> {
    return this.tryPaths(
      ['configuracion/agenda'],
      path => firstValueFrom(this.http.get<any>(`${this.baseUrl}/${path}`)).then(raw => this.normalizeAgenda(raw)),
    );
  }

  saveAgenda(body: ConfiguracionAgendaRequest): Promise<ConfiguracionAgendaDto> {
    return this.tryPaths(
      ['configuracion/agenda'],
      path => firstValueFrom(this.http.put<any>(`${this.baseUrl}/${path}`, body)).then(raw => this.normalizeAgenda(raw)),
    );
  }

  getSistema(): Promise<ConfiguracionSistemaDto> {
    return this.tryPaths(
      ['configuracion/sistema', 'configuracion-sistema'],
      path => firstValueFrom(this.http.get<any>(`${this.baseUrl}/${path}`)).then(raw => this.normalizeSistema(raw)),
    );
  }

  saveSistema(body: ConfiguracionSistemaRequest, currentId?: number | null): Promise<ConfiguracionSistemaDto> {
    return this.tryPaths(
      ['configuracion/sistema'],
      path => firstValueFrom(this.http.put<any>(`${this.baseUrl}/${path}`, body)).then(raw => this.normalizeSistema(raw)),
      { fallback: () => this.saveSistemaResource(body, currentId) },
    );
  }

  getRecordatorios(): Promise<ConfiguracionRecordatorioDto[]> {
    return this.tryPaths(
      ['configuracion/recordatorios', 'configuracion-recordatorios'],
      path => firstValueFrom(this.http.get<any>(`${this.baseUrl}/${path}`)).then(raw => this.normalizeRecordatorios(raw)),
    );
  }

  saveRecordatoriosUnificado(body: Record<string, unknown>): Promise<ConfiguracionRecordatorioDto[]> {
    return this.tryPaths(
      ['configuracion/recordatorios'],
      path => firstValueFrom(this.http.put<any>(`${this.baseUrl}/${path}`, body)).then(raw => this.normalizeRecordatorios(raw)),
    );
  }

  createRecordatorio(body: ConfiguracionRecordatorioRequest): Promise<ConfiguracionRecordatorioDto> {
    return firstValueFrom(
      this.http.post<any>(`${this.baseUrl}/configuracion-recordatorios`, body),
    ).then(raw => this.normalizeRecordatorio(raw));
  }

  updateRecordatorio(id: number, body: ConfiguracionRecordatorioRequest): Promise<ConfiguracionRecordatorioDto> {
    return firstValueFrom(
      this.http.put<any>(`${this.baseUrl}/configuracion-recordatorios/${id}`, body),
    ).then(raw => this.normalizeRecordatorio(raw));
  }

  setActivoRecordatorio(id: number, activo: boolean): Promise<ConfiguracionRecordatorioDto> {
    return firstValueFrom(
      this.http.patch<any>(`${this.baseUrl}/configuracion-recordatorios/${id}/activo`, { activo }),
    ).then(raw => this.normalizeRecordatorio(raw));
  }

  private async saveSistemaResource(
    body: ConfiguracionSistemaRequest,
    currentId?: number | null,
  ): Promise<ConfiguracionSistemaDto> {
    if (currentId) {
      return firstValueFrom(
        this.http.put<any>(`${this.baseUrl}/configuracion-sistema/${currentId}`, body),
      ).then(raw => this.normalizeSistema(raw));
    }

    return firstValueFrom(
      this.http.post<any>(`${this.baseUrl}/configuracion-sistema`, body),
    ).then(raw => this.normalizeSistema(raw));
  }

  private normalizeAgenda(raw: any): ConfiguracionAgendaDto {
    return {
      hora_inicio: this.normalizeTime(raw?.hora_inicio ?? raw?.hora_inicio_jornada),
      hora_fin: this.normalizeTime(raw?.hora_fin ?? raw?.hora_fin_jornada),
      hora_inicio_jornada: this.normalizeTime(raw?.hora_inicio_jornada ?? raw?.hora_inicio),
      hora_fin_jornada: this.normalizeTime(raw?.hora_fin_jornada ?? raw?.hora_fin),
      intervalo: this.normalizeNumber(raw?.intervalo),
      intervalo_minutos: this.normalizeNumber(raw?.intervalo_minutos ?? raw?.intervalo),
      intervalo_calendario_min: this.normalizeNumber(raw?.intervalo_calendario_min ?? raw?.intervalo_minutos ?? raw?.intervalo),
      duracion_cita_default_min: this.normalizeNumber(raw?.duracion_cita_default_min),
      buffer_citas_min: this.normalizeNumber(raw?.buffer_citas_min),
      citas_superpuestas: this.normalizeBoolean(raw?.citas_superpuestas),
      mostrar_sabados: this.normalizeBoolean(raw?.mostrar_sabados),
      mostrar_domingos: this.normalizeBoolean(raw?.mostrar_domingos),
      vista_default: raw?.vista_default ?? null,
    };
  }

  private normalizeSistema(raw: any): ConfiguracionSistemaDto {
    return {
      id_configuracion_sistema: this.normalizeNumber(raw?.id_configuracion_sistema),
      zona_horaria: raw?.zona_horaria ?? null,
      moneda: raw?.moneda ?? null,
      formato_hora: raw?.formato_hora ?? null,
      duracion_cita_default_min: this.normalizeNumber(raw?.duracion_cita_default_min),
      politica_cancelacion_horas: this.normalizeNumber(raw?.politica_cancelacion_horas),
      permite_confirmacion_publica: this.normalizeBoolean(raw?.permite_confirmacion_publica),
      idioma: raw?.idioma ?? null,
      tema: raw?.tema ?? null,
      tamano_interfaz: raw?.tamano_interfaz ?? null,
      animaciones: this.normalizeBoolean(raw?.animaciones),
      activo: this.normalizeBoolean(raw?.activo),
    };
  }

  private normalizeRecordatorios(raw: any): ConfiguracionRecordatorioDto[] {
    const items = Array.isArray(raw) ? raw : Array.isArray(raw?.recordatorios) ? raw.recordatorios : [];
    return items.map((item: any) => this.normalizeRecordatorio(item));
  }

  private normalizeRecordatorio(raw: any): ConfiguracionRecordatorioDto {
    return {
      id_configuracion_recordatorio: this.normalizeNumber(
        raw?.id_configuracion_recordatorio ?? raw?.id,
      ),
      canal: String(raw?.canal ?? '').toUpperCase(),
      anticipacion_minutos: Number(raw?.anticipacion_minutos ?? 0),
      mensaje_personalizado: raw?.mensaje_personalizado ?? null,
      activo: this.normalizeBoolean(raw?.activo),
    };
  }

  private normalizeTime(value: unknown): string | null {
    if (!value) return null;
    const stringValue = String(value);
    return stringValue.length >= 5 ? stringValue.substring(0, 5) : stringValue;
  }

  private normalizeNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private normalizeBoolean(value: unknown): boolean | null {
    if (value === null || value === undefined) return null;
    return Boolean(value);
  }

  private async tryPaths<T>(
    paths: string[],
    runner: (path: string) => Promise<T>,
    options?: { fallback?: () => Promise<T> },
  ): Promise<T> {
    let lastError: unknown;

    for (let index = 0; index < paths.length; index += 1) {
      try {
        return await runner(paths[index]);
      } catch (error) {
        lastError = error;
        if (!this.isFallbackError(error) || index === paths.length - 1) {
          break;
        }
      }
    }

    if (options?.fallback) {
      try {
        return await options.fallback();
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError;
  }

  private isFallbackError(error: unknown): boolean {
    return error instanceof HttpErrorResponse && [404, 405].includes(error.status);
  }
}
