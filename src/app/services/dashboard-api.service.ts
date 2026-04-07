import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  DashboardAgendaHoyDto,
  DashboardConsolidadoDto,
  DashboardResumenDto,
} from '../pages/dashboard/dashboard.models';

@Injectable({ providedIn: 'root' })
export class DashboardApiService {
  private readonly base = `${environment.apiUrl}/dashboard`;

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
