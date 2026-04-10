import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { buildQueryParams } from 'src/app/shared/utils/query-params.utils';
import { PageResponse } from 'src/app/shared/models/page.model';
import {
  PacienteDto,
  NotaResumenPacienteDto,
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
      this.http.get<PacienteApiDto>(`${this.base}/${id}`)
    ).then(paciente => this.mapPacienteDto(paciente));
  }

  private mapPacienteDto(paciente: PacienteApiDto): PacienteDto {
    return {
      ...paciente,
      notas_visibles_resumen: this.resolveNotasVisiblesResumen(paciente),
    };
  }

  private resolveNotasVisiblesResumen(paciente: PacienteApiDto): NotaResumenPacienteDto[] {
    const candidates = [
      paciente.notas_visibles_resumen,
      paciente.notas_resumen,
      paciente.resumen_notas,
      paciente.notas_clinicas_visibles_resumen,
      paciente.notas_clinicas,
    ];

    const notas = candidates.find(Array.isArray) ?? [];

    return notas
      .filter((nota): nota is Record<string, unknown> => !!nota && typeof nota === 'object')
      .map(nota => ({
        id_nota_clinica: this.toNumberOrUndefined(nota['id_nota_clinica'] ?? nota['id_nota']),
        titulo: this.toStringOrNull(nota['titulo']),
        contenido: this.toStringOrNull(nota['contenido'] ?? nota['resumen'] ?? nota['descripcion']),
        tipo_nota: this.toStringOrNull(nota['tipo_nota']) ?? 'GENERAL',
        visible_en_resumen: this.toBooleanOrNull(nota['visible_en_resumen']),
        created_at: this.toStringOrNull(nota['created_at'] ?? nota['fecha_creacion'] ?? nota['fecha']),
      }))
      .filter(nota => nota.visible_en_resumen !== false && !!nota.contenido?.trim())
      .sort((a, b) => this.parseDateValue(b.created_at) - this.parseDateValue(a.created_at));
  }

  private toStringOrNull(value: unknown): string | null {
    return typeof value === 'string' ? value : null;
  }

  private toBooleanOrNull(value: unknown): boolean | null {
    return typeof value === 'boolean' ? value : null;
  }

  private toNumberOrUndefined(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
  }

  private parseDateValue(value?: string | null): number {
    if (!value) return 0;
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
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

type PacienteApiDto = PacienteDto & {
  notas_resumen?: unknown;
  resumen_notas?: unknown;
  notas_clinicas?: unknown;
  notas_clinicas_visibles_resumen?: unknown;
};
