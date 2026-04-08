import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { buildQueryParams } from 'src/app/shared/utils/query-params.utils';
import { PageResponse } from 'src/app/shared/models/page.model';
import { NotificacionDto } from '../pages/dashboard/dashboard.models';

interface NotificacionesUnreadCountResponse {
  count?: number | null;
  unreadCount?: number | null;
  noLeidas?: number | null;
  notificacionesNoLeidas?: number | null;
}

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

  async getUnreadCount(): Promise<number> {
    const response = await firstValueFrom(
      this.http.get<number | NotificacionesUnreadCountResponse>(`${this.base}/no-leidas/count`)
    );

    if (typeof response === 'number') {
      return response;
    }

    return (
      response.count ??
      response.unreadCount ??
      response.noLeidas ??
      response.notificacionesNoLeidas ??
      0
    );
  }

  async markAsRead(id: number): Promise<void> {
    await firstValueFrom(this.http.patch<void>(`${this.base}/${id}/leida`, {}));
  }

  async markAllAsRead(): Promise<void> {
    await firstValueFrom(this.http.post<void>(`${this.base}/marcar-todas-leidas`, {}));
  }
}
