import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { buildQueryParams } from 'src/app/shared/utils/query-params.utils';
import { PageResponse } from 'src/app/shared/models/page.model';
import {
  PacienteDto,
  PacienteRequest,
  ResumenPacienteDto,
  AlertaPacienteDto,
  AlertaPacienteRequest,
  NotaClinicaDto,
  NotaClinicaRequest,
  SesionPacienteDto,
  HistorialPacienteResponse,
} from './models/paciente.model';

@Injectable({ providedIn: 'root' })
export class PacientesApiService {
  private readonly base = `${environment.apiUrl}/pacientes`;
  private readonly notasBase = `${environment.apiUrl}/notas-clinicas`;

  constructor(private http: HttpClient) {}

  // ── Pacientes CRUD ──────────────────────────────────────────────────────────

  getAll(params: {
    search?: string;
    activo?: boolean;
    page?: number;
    size?: number;
    sort?: string;
  } = {}): Promise<PageResponse<PacienteDto>> {
    const httpParams = buildQueryParams(params);
    return firstValueFrom(
      this.http.get<PageResponse<PacienteDto>>(this.base, { params: httpParams })
    );
  }

  getById(id: number): Promise<PacienteDto> {
    return firstValueFrom(
      this.http.get<PacienteDto>(`${this.base}/${id}`)
    );
  }

  create(body: PacienteRequest): Promise<PacienteDto> {
    return firstValueFrom(
      this.http.post<PacienteDto>(this.base, body)
    );
  }

  update(id: number, body: PacienteRequest): Promise<PacienteDto> {
    return firstValueFrom(
      this.http.put<PacienteDto>(`${this.base}/${id}`, body)
    );
  }

  setActivo(id: number, activo: boolean): Promise<PacienteDto> {
    return firstValueFrom(
      this.http.patch<PacienteDto>(`${this.base}/${id}/activo`, { activo })
    );
  }

  // ── Resumen ─────────────────────────────────────────────────────────────────

  getResumen(id: number): Promise<ResumenPacienteDto> {
    return firstValueFrom(
      this.http.get<ResumenPacienteDto>(`${this.base}/${id}/resumen`)
    );
  }

  // ── Alertas ─────────────────────────────────────────────────────────────────

  getAlertas(pacienteId: number): Promise<AlertaPacienteDto[]> {
    return firstValueFrom(
      this.http.get<AlertaPacienteDto[]>(`${this.base}/${pacienteId}/alertas`)
    );
  }

  createAlerta(pacienteId: number, body: AlertaPacienteRequest): Promise<AlertaPacienteDto> {
    return firstValueFrom(
      this.http.post<AlertaPacienteDto>(`${this.base}/${pacienteId}/alertas`, body)
    );
  }

  updateAlerta(pacienteId: number, alertaId: number, body: AlertaPacienteRequest): Promise<AlertaPacienteDto> {
    return firstValueFrom(
      this.http.put<AlertaPacienteDto>(`${this.base}/${pacienteId}/alertas/${alertaId}`, body)
    );
  }

  toggleAlerta(pacienteId: number, alertaId: number, activa: boolean): Promise<AlertaPacienteDto> {
    return firstValueFrom(
      this.http.patch<AlertaPacienteDto>(`${this.base}/${pacienteId}/alertas/${alertaId}/activa`, { activa })
    );
  }

  deleteAlerta(pacienteId: number, alertaId: number): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(`${this.base}/${pacienteId}/alertas/${alertaId}`)
    );
  }

  // ── Notas clínicas ──────────────────────────────────────────────────────────

  getNotasByPaciente(pacienteId: number, params: {
    page?: number;
    size?: number;
  } = {}): Promise<PageResponse<NotaClinicaDto>> {
    const httpParams = buildQueryParams(params);
    return firstValueFrom(
      this.http.get<PageResponse<NotaClinicaDto>>(
        `${this.base}/${pacienteId}/notas-clinicas`,
        { params: httpParams }
      )
    );
  }

  createNota(body: NotaClinicaRequest): Promise<NotaClinicaDto> {
    return firstValueFrom(
      this.http.post<NotaClinicaDto>(this.notasBase, body)
    );
  }

  updateNota(notaId: number, body: Partial<NotaClinicaRequest>): Promise<NotaClinicaDto> {
    return firstValueFrom(
      this.http.put<NotaClinicaDto>(`${this.notasBase}/${notaId}`, body)
    );
  }

  deleteNota(notaId: number): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(`${this.notasBase}/${notaId}`)
    );
  }

  // ── Sesiones del paciente ───────────────────────────────────────────────────

  getSesionesByPaciente(pacienteId: number, params: {
    page?: number;
    size?: number;
  } = {}): Promise<PageResponse<SesionPacienteDto>> {
    const httpParams = buildQueryParams(params);
    return firstValueFrom(
      this.http.get<PageResponse<SesionPacienteDto>>(
        `${this.base}/${pacienteId}/sesiones`,
        { params: httpParams }
      )
    );
  }

  // ── Historial ───────────────────────────────────────────────────────────────

  getHistorial(pacienteId: number, params: {
    tipo?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    page?: number;
    size?: number;
  } = {}): Promise<HistorialPacienteResponse> {
    const httpParams = buildQueryParams(params);
    return firstValueFrom(
      this.http.get<HistorialPacienteResponse>(
        `${this.base}/${pacienteId}/historial`,
        { params: httpParams }
      )
    );
  }
}
