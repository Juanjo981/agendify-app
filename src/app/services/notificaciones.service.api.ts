import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { buildQueryParams } from 'src/app/shared/utils/query-params.utils';
import { PageResponse } from 'src/app/shared/models/page.model';
import { NotificacionDto } from '../pages/dashboard/dashboard.models';

@Injectable({ providedIn: 'root' })
export class NotificacionesApiService {
  private readonly base = `${environment.apiUrl}/notificaciones`;

  constructor(private http: HttpClient) {}

  getAll(params: {
    pacienteId?: number;
    citaId?: number;
    canal?: string;
    estadoEnvio?: string;
    tipoNotificacion?: string;
    search?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    page?: number;
    size?: number;
    sort?: string;
  } = {}): Promise<PageResponse<NotificacionDto>> {
    const query = buildQueryParams({
      pacienteId: params.pacienteId,
      citaId: params.citaId,
      canal: params.canal,
      estadoEnvio: params.estadoEnvio,
      tipoNotificacion: params.tipoNotificacion,
      search: params.search,
      fechaDesde: params.fechaDesde,
      fechaHasta: params.fechaHasta,
      page: params.page,
      size: params.size,
      sort: params.sort ?? 'created_at,desc',
    });

    return firstValueFrom(
      this.http.get<PageResponse<NotificacionDto>>(this.base, { params: query })
    );
  }
}
