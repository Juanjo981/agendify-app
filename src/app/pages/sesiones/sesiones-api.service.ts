import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { buildQueryParams } from 'src/app/shared/utils/query-params.utils';
import { PageResponse } from 'src/app/shared/models/page.model';
import {
  SesionCreateRequest,
  SesionDto,
  SesionListParams,
  SesionUpdateRequest,
} from './models/sesion.model';

@Injectable({ providedIn: 'root' })
export class SesionesApiService {
  private readonly base = `${environment.apiUrl}/sesiones`;
  private readonly citasBase = `${environment.apiUrl}/citas`;

  constructor(private http: HttpClient) {}

  getAll(params: SesionListParams = {}): Promise<PageResponse<SesionDto>> {
    const query = buildQueryParams({
      pacienteId: params.pacienteId,
      citaId: params.citaId,
      estatus: params.estatus,
      tipoSesion: params.tipoSesion,
      fechaDesde: params.fechaDesde,
      fechaHasta: params.fechaHasta,
      page: params.page,
      size: params.size,
      sort: params.sort ?? 'fecha_sesion,desc',
    });

    return firstValueFrom(
      this.http.get<PageResponse<SesionDto>>(this.base, { params: query })
    );
  }

  getById(id: number): Promise<SesionDto> {
    return firstValueFrom(this.http.get<SesionDto>(`${this.base}/${id}`));
  }

  create(body: SesionCreateRequest): Promise<SesionDto> {
    return firstValueFrom(this.http.post<SesionDto>(this.base, body));
  }

  update(id: number, body: SesionUpdateRequest): Promise<SesionDto> {
    return firstValueFrom(this.http.put<SesionDto>(`${this.base}/${id}`, body));
  }

  getByCitaId(citaId: number): Promise<SesionDto> {
    return firstValueFrom(this.http.get<SesionDto>(`${this.citasBase}/${citaId}/sesion`));
  }
}
