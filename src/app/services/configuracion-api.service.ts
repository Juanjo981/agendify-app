import { HttpClient } from '@angular/common/http';
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
  private readonly agendaUrl = `${this.baseUrl}/configuracion/agenda`;
  private readonly sistemaCollectionUrl = `${this.baseUrl}/configuracion-sistema`;
  private readonly recordatoriosUrl = `${this.baseUrl}/configuracion-recordatorios`;

  constructor(private http: HttpClient) {}

  getAgenda(): Promise<ConfiguracionAgendaDto> {
    return firstValueFrom(this.http.get<any>(this.agendaUrl)).then(raw => this.normalizeAgenda(raw));
  }

  saveAgenda(body: ConfiguracionAgendaRequest): Promise<ConfiguracionAgendaDto> {
    return firstValueFrom(this.http.put<any>(this.agendaUrl, body)).then(raw => this.normalizeAgenda(raw));
  }

  getSistema(): Promise<ConfiguracionSistemaDto> {
    return firstValueFrom(this.http.get<any>(this.sistemaCollectionUrl)).then(raw => this.normalizeSistema(raw));
  }

  saveSistema(body: ConfiguracionSistemaRequest, currentId?: number | null): Promise<ConfiguracionSistemaDto> {
    if (currentId) {
      return firstValueFrom(
        this.http.put<any>(`${this.sistemaCollectionUrl}/${currentId}`, body),
      ).then(raw => this.normalizeSistema(raw));
    }

    return firstValueFrom(
      this.http.post<any>(this.sistemaCollectionUrl, body),
    ).then(raw => this.normalizeSistema(raw));
  }

  getRecordatorios(): Promise<ConfiguracionRecordatorioDto[]> {
    return firstValueFrom(this.http.get<any>(this.recordatoriosUrl)).then(raw => this.normalizeRecordatorios(raw));
  }

  createRecordatorio(body: ConfiguracionRecordatorioRequest): Promise<ConfiguracionRecordatorioDto> {
    return firstValueFrom(
      this.http.post<any>(this.recordatoriosUrl, body),
    ).then(raw => this.normalizeRecordatorio(raw));
  }

  updateRecordatorio(id: number, body: ConfiguracionRecordatorioRequest): Promise<ConfiguracionRecordatorioDto> {
    return firstValueFrom(
      this.http.put<any>(`${this.recordatoriosUrl}/${id}`, body),
    ).then(raw => this.normalizeRecordatorio(raw));
  }

  setActivoRecordatorio(id: number, activo: boolean): Promise<ConfiguracionRecordatorioDto> {
    return firstValueFrom(
      this.http.patch<any>(`${this.recordatoriosUrl}/${id}/activo`, { activo }),
    ).then(raw => this.normalizeRecordatorio(raw));
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
      id_profesional: this.normalizeNumber(raw?.id_profesional),
      notif_in_app: this.normalizeBoolean(raw?.notif_in_app),
      alertas_sonoras: this.normalizeBoolean(raw?.alertas_sonoras),
      avisos_citas_proximas: this.normalizeBoolean(raw?.avisos_citas_proximas),
      avisos_pacientes_nuevos: this.normalizeBoolean(raw?.avisos_pacientes_nuevos),
      avisos_pagos_pendientes: this.normalizeBoolean(raw?.avisos_pagos_pendientes),
      zona_horaria: raw?.zona_horaria ?? null,
      moneda: raw?.moneda ?? null,
      formato_hora: raw?.formato_hora ?? null,
      formato_fecha: raw?.formato_fecha ?? null,
      duracion_cita_default_min: this.normalizeNumber(raw?.duracion_cita_default_min),
      politica_cancelacion_horas: this.normalizeNumber(raw?.politica_cancelacion_horas),
      permite_confirmacion_publica: this.normalizeBoolean(raw?.permite_confirmacion_publica),
      ocultar_datos_sensibles: this.normalizeBoolean(raw?.ocultar_datos_sensibles),
      confirmar_eliminar_citas: this.normalizeBoolean(raw?.confirmar_eliminar_citas),
      confirmar_eliminar_pacientes: this.normalizeBoolean(raw?.confirmar_eliminar_pacientes),
      permitir_cancelacion: this.normalizeBoolean(raw?.permitir_cancelacion),
      permitir_reprogramacion: this.normalizeBoolean(raw?.permitir_reprogramacion),
      recordatorio_profesional: this.normalizeBoolean(raw?.recordatorio_profesional),
      notif_paciente_confirma: this.normalizeBoolean(raw?.notif_paciente_confirma),
      notif_paciente_cancela: this.normalizeBoolean(raw?.notif_paciente_cancela),
      notif_paciente_reprograma: this.normalizeBoolean(raw?.notif_paciente_reprograma),
      idioma: raw?.idioma ?? null,
      tema: raw?.tema ?? null,
      tamano_interfaz: raw?.tamano_interfaz ?? null,
      animaciones: this.normalizeBoolean(raw?.animaciones),
      vista_previa_datos: this.normalizeBoolean(raw?.vista_previa_datos),
      bloquear_cambios_criticos: this.normalizeBoolean(raw?.bloquear_cambios_criticos),
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
}
