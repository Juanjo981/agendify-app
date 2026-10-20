import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { normalizeApiBaseUrl } from 'src/environments/api-url';
import {
  DashboardAgendaHoyDto,
  DashboardConsolidadoDto,
  DashboardResumenDto,
} from '../pages/dashboard/dashboard.models';

@Injectable({ providedIn: 'root' })
export class DashboardApiService {
  private readonly apiRoot = normalizeApiBaseUrl(environment.apiUrl);
  private readonly base = `${this.apiRoot}/dashboard`;

  constructor(private http: HttpClient) {}

  getResumen(): Promise<DashboardResumenDto> {
    return firstValueFrom(this.http.get<DashboardResumenDto>(`${this.base}/resumen`));
  }

  getAgendaHoy(): Promise<DashboardAgendaHoyDto> {
    return firstValueFrom(this.http.get<DashboardAgendaHoyDto>(`${this.base}/agenda-hoy`));
  }

  getConsolidado(): Promise<DashboardConsolidadoDto> {
    return firstValueFrom(this.http.get<DashboardConsolidadoDto>(`${this.base}/consolidado`));
  }
}
