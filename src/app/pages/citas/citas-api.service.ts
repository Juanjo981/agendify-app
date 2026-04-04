import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { buildQueryParams } from 'src/app/shared/utils/query-params.utils';
import { PageResponse } from 'src/app/shared/models/page.model';
import {
  CitaDto,
  CitaPagoRequest,
  CitaUpsertRequest,
  CitasListParams,
  DisponibilidadResponse,
  DisponibilidadSlot,
  EstadoCita,
  withLegacyCitaFields,
} from './models/cita.model';

@Injectable({ providedIn: 'root' })
export class CitasApiService {
  private readonly base = `${environment.apiUrl}/citas`;

  constructor(private http: HttpClient) {}

  getAll(params: CitasListParams = {}): Promise<PageResponse<CitaDto>> {
    const query = buildQueryParams({
      search: params.search,
      estado: params.estado,
      estadoPago: params.estadoPago,
      estado_pago: params.estadoPago,
      pacienteId: params.pacienteId,
      fechaDesde: params.fechaDesde,
      fechaHasta: params.fechaHasta,
      activo: params.activo,
      page: params.page,
      size: params.size,
      sort: params.sort ?? 'fecha_inicio,desc',
    });

    return firstValueFrom(
      this.http.get<PageResponse<CitaDto>>(this.base, { params: query })
    ).then(page => this.normalizePage(page));
  }

  getById(id: number): Promise<CitaDto> {
    return firstValueFrom(
      this.http.get<CitaDto>(`${this.base}/${id}`)
    ).then(cita => this.normalizeCita(cita));
  }

  create(body: CitaUpsertRequest): Promise<CitaDto> {
    return firstValueFrom(
      this.http.post<CitaDto>(this.base, body)
    ).then(cita => this.normalizeCita(cita));
  }

  update(id: number, body: CitaUpsertRequest): Promise<CitaDto> {
    return firstValueFrom(
      this.http.put<CitaDto>(`${this.base}/${id}`, body)
    ).then(cita => this.normalizeCita(cita));
  }

  delete(id: number): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(`${this.base}/${id}`)
    );
  }

  confirmar(id: number): Promise<CitaDto> {
    return firstValueFrom(
      this.http.patch<CitaDto>(`${this.base}/${id}/confirmar`, {})
    ).then(cita => this.normalizeCita(cita));
  }

  cancelar(id: number): Promise<CitaDto> {
    return firstValueFrom(
      this.http.patch<CitaDto>(`${this.base}/${id}/cancelar`, {})
    ).then(cita => this.normalizeCita(cita));
  }

  completar(id: number): Promise<CitaDto> {
    return firstValueFrom(
      this.http.patch<CitaDto>(`${this.base}/${id}/completar`, {})
    ).then(cita => this.normalizeCita(cita));
  }

  noAsistio(id: number): Promise<CitaDto> {
    return firstValueFrom(
      this.http.patch<CitaDto>(`${this.base}/${id}/no-asistio`, {})
    ).then(cita => this.normalizeCita(cita));
  }

  cambiarEstado(id: number, estado: EstadoCita): Promise<CitaDto> {
    switch (estado) {
      case 'CONFIRMADA':
        return this.confirmar(id);
      case 'CANCELADA':
        return this.cancelar(id);
      case 'COMPLETADA':
        return this.completar(id);
      case 'NO_ASISTIO':
        return this.noAsistio(id);
      default:
        return firstValueFrom(
          this.http.patch<CitaDto>(`${this.base}/${id}/estado`, { estado })
        ).then(cita => this.normalizeCita(cita));
    }
  }

  updatePago(id: number, body: CitaPagoRequest): Promise<CitaDto> {
    return firstValueFrom(
      this.http.patch<CitaDto>(`${this.base}/${id}/pago`, body)
    ).then(cita => this.normalizeCita(cita));
  }

  getDisponibilidad(params: {
    fecha: string;
    duracionMinutos?: number;
    citaIdExcluir?: number;
  }): Promise<DisponibilidadResponse> {
    const query = buildQueryParams({
      fecha: params.fecha,
      duracionMinutos: params.duracionMinutos,
      duracion_min: params.duracionMinutos,
      citaIdExcluir: params.citaIdExcluir,
      cita_id_excluir: params.citaIdExcluir,
    });

    return firstValueFrom(
      this.http.get<any>(`${this.base}/disponibilidad`, { params: query })
    ).then(raw => this.normalizeDisponibilidad(raw));
  }

  private normalizePage(page: PageResponse<CitaDto>): PageResponse<CitaDto> {
    return {
      ...page,
      content: (page.content ?? []).map(cita => this.normalizeCita(cita)),
    };
  }

  private normalizeCita(cita: CitaDto): CitaDto {
    return withLegacyCitaFields(cita);
  }

  private normalizeDisponibilidad(raw: any): DisponibilidadResponse {
    const rawSlots = Array.isArray(raw?.slots)
      ? raw.slots
      : Array.isArray(raw?.slots_disponibles)
        ? raw.slots_disponibles
        : [];

    const slots = rawSlots
      .map((slot: any) => this.normalizeSlot(slot))
      .filter((slot: DisponibilidadSlot) => !!slot.hora_inicio && !!slot.hora_fin);

    return {
      fecha: raw?.fecha ?? '',
      duracion_minutos: Number(
        raw?.duracion_minutos ?? raw?.duracion_solicitada_min ?? raw?.duracionMinutos ?? 0
      ),
      total_slots: Number(raw?.total_slots ?? raw?.total ?? slots.length),
      slots,
    };
  }

  private normalizeSlot(slot: any): DisponibilidadSlot {
    return {
      hora_inicio: this.normalizeTime(slot?.hora_inicio ?? slot?.inicio ?? slot?.start ?? ''),
      hora_fin: this.normalizeTime(slot?.hora_fin ?? slot?.fin ?? slot?.end ?? ''),
    };
  }

  private normalizeTime(raw: string): string {
    if (!raw) return '';
    const value = String(raw);
    return value.length >= 5 ? value.substring(0, 5) : value;
  }
}
