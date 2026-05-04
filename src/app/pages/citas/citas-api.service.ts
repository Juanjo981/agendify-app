import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { normalizeApiBaseUrl } from 'src/environments/api-url';
import { buildQueryParams } from 'src/app/shared/utils/query-params.utils';
import { PageResponse } from 'src/app/shared/models/page.model';
import {
  CitaDto,
  CitaPagoRequest,
  CitaUpsertRequest,
  CitasListParams,
  DisponibilidadResponse,
  DisponibilidadSlot,
  EstadoPago,
  EstadoCita,
  withLegacyCitaFields,
} from './models/cita.model';

export interface CitasPageResponse<T> extends PageResponse<T> {
  _meta?: {
    hasReliableTotalElements: boolean;
    hasReliableTotalPages: boolean;
    hasReliablePageNumber: boolean;
    hasReliablePageSize: boolean;
  };
}

/**
 * Cliente REST de citas (colección `/api/citas`).
 *
 * Contrato: solo **GET** y **POST** sobre la raíz `{apiUrl}/citas`.
 * Actualización: **PUT** `{apiUrl}/citas/{id}`. Pago: **PATCH** `{apiUrl}/citas/{id}/pago`.
 * No usar PATCH/PUT/DELETE sobre la colección sin `id`.
 *
 * `environment.apiUrl` debe ser la base del API **con** `/api` (ej. `http://localhost:8080/api`),
 * sin barra final; esta clase usa `${apiUrl}/citas`, no `${apiUrl}/api/citas`.
 */
@Injectable({ providedIn: 'root' })
export class CitasApiService {
  private readonly base = `${normalizeApiBaseUrl(environment.apiUrl)}/citas`;

  constructor(private http: HttpClient) {}

  /** URL de un recurso cita: `{base}/{id}/{subpath}`. Valida `id` para evitar rutas inválidas. */
  private urlCita(id: number, subpath?: string): string {
    if (!Number.isFinite(id) || id <= 0) {
      throw new RangeError(`CitasApiService: id de cita inválido (${id})`);
    }
    const tail = subpath?.replace(/^\/+/, '').replace(/\/+$/, '');
    return tail ? `${this.base}/${id}/${tail}` : `${this.base}/${id}`;
  }

  getAll(params: CitasListParams = {}): Promise<CitasPageResponse<CitaDto>> {
    const estadoPago = this.normalizeEstadoPagoParam(params.estadoPago);

    const query = buildQueryParams({
      search: params.search,
      estado: params.estado,
      estado_pago: estadoPago,
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
      this.http.get<CitaDto>(this.urlCita(id))
    ).then(cita => this.normalizeCita(cita));
  }

  create(body: CitaUpsertRequest): Promise<CitaDto> {
    return firstValueFrom(
      this.http.post<CitaDto>(this.base, body)
    ).then(cita => this.normalizeCita(cita));
  }

  update(id: number, body: CitaUpsertRequest): Promise<CitaDto> {
    return firstValueFrom(
      this.http.put<CitaDto>(this.urlCita(id), body)
    ).then(cita => this.normalizeCita(cita));
  }

  delete(id: number): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(this.urlCita(id))
    );
  }

  confirmar(id: number): Promise<CitaDto> {
    return firstValueFrom(
      this.http.patch<CitaDto>(this.urlCita(id, 'confirmar'), {})
    ).then(cita => this.normalizeCita(cita));
  }

  cancelar(id: number): Promise<CitaDto> {
    return firstValueFrom(
      this.http.patch<CitaDto>(this.urlCita(id, 'cancelar'), {})
    ).then(cita => this.normalizeCita(cita));
  }

  completar(id: number): Promise<CitaDto> {
    return firstValueFrom(
      this.http.patch<CitaDto>(this.urlCita(id, 'completar'), {})
    ).then(cita => this.normalizeCita(cita));
  }

  noAsistio(id: number): Promise<CitaDto> {
    return firstValueFrom(
      this.http.patch<CitaDto>(this.urlCita(id, 'no-asistio'), {})
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
          this.http.patch<CitaDto>(this.urlCita(id, 'estado'), { estado })
        ).then(cita => this.normalizeCita(cita));
    }
  }

  updatePago(id: number, body: CitaPagoRequest): Promise<CitaDto> {
    return firstValueFrom(
      this.http.patch<CitaDto>(this.urlCita(id, 'pago'), body)
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

  private normalizePage(page: any): CitasPageResponse<CitaDto> {
    const content = this.extractContent(page).map(cita => this.normalizeCita(cita));
    const size = this.normalizePositiveNumber(
      page?.size ?? page?.page_size ?? page?.pageSize ?? page?.pageable?.page_size,
      content.length > 0 ? content.length : 10,
    );
    const totalElementsRaw = page?.total_elements ?? page?.totalElements ?? page?.total ?? page?.count;
    const totalPagesRaw = page?.total_pages ?? page?.totalPages;
    const pageNumberRaw = page?.number ?? page?.page ?? page?.page_number ?? page?.pageNumber ?? page?.pageable?.page_number;
    const first = typeof page?.first === 'boolean'
      ? page.first
      : this.normalizeNonNegativeNumber(pageNumberRaw, 0) <= 0;
    const totalElements = this.normalizeNonNegativeNumber(totalElementsRaw, content.length);
    const totalPages = this.normalizeNonNegativeNumber(
      totalPagesRaw,
      totalElements > 0 ? Math.max(1, Math.ceil(totalElements / size)) : 0,
    );
    const number = this.normalizeNonNegativeNumber(pageNumberRaw, 0);

    return {
      ...page,
      content,
      total_elements: totalElements,
      total_pages: totalPages,
      number,
      size,
      first,
      last: typeof page?.last === 'boolean'
        ? page.last
        : totalPages <= 1 || number >= Math.max(totalPages - 1, 0),
      empty: typeof page?.empty === 'boolean' ? page.empty : content.length === 0,
      number_of_elements: this.normalizeNonNegativeNumber(
        page?.number_of_elements ?? page?.numberOfElements,
        content.length,
      ),
      _meta: {
        hasReliableTotalElements: this.isNonNegativeNumber(totalElementsRaw),
        hasReliableTotalPages: this.isNonNegativeNumber(totalPagesRaw),
        hasReliablePageNumber: this.isNonNegativeNumber(pageNumberRaw),
        hasReliablePageSize: this.isPositiveNumber(
          page?.size ?? page?.page_size ?? page?.pageSize ?? page?.pageable?.page_size,
        ),
      },
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

  private extractContent(page: any): CitaDto[] {
    if (Array.isArray(page?.content)) return page.content;
    if (Array.isArray(page?.items)) return page.items;
    if (Array.isArray(page?.data)) return page.data;
    if (Array.isArray(page)) return page;
    return [];
  }

  private normalizeNonNegativeNumber(value: unknown, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  }

  private normalizePositiveNumber(value: unknown, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private isNonNegativeNumber(value: unknown): boolean {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0;
  }

  private isPositiveNumber(value: unknown): boolean {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0;
  }

  private normalizeEstadoPagoParam(value: unknown): EstadoPago | undefined {
    return this.isEstadoPago(value) ? value : undefined;
  }

  private isEstadoPago(value: unknown): value is EstadoPago {
    return value === 'PENDIENTE'
      || value === 'PARCIAL'
      || value === 'PAGADO'
      || value === 'NO_APLICA'
      || value === 'REEMBOLSADO';
  }
}
