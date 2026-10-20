import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { normalizeApiBaseUrl } from 'src/environments/api-url';
import { buildQueryParams } from 'src/app/shared/utils/query-params.utils';
import { PageResponse } from 'src/app/shared/models/page.model';
import {
  PacienteActividadEventoDto,
  PacienteResumenIndicadoresDto,
} from '../pages/pacientes/models/paciente-resumen.models';

/**
 * Endpoints reales de la pestaña Resumen del detalle de paciente.
 * GET /api/pacientes/{id}/resumen/indicadores
 * GET /api/pacientes/{id}/resumen/actividad
 */
@Injectable({ providedIn: 'root' })
export class PacienteResumenService {
  private readonly apiRoot = normalizeApiBaseUrl(environment.apiUrl);
  private readonly base = `${this.apiRoot}/pacientes`;

  constructor(private readonly http: HttpClient) {}

  obtenerIndicadores(idPaciente: number): Promise<PacienteResumenIndicadoresDto> {
    return firstValueFrom(
      this.http.get<PacienteResumenIndicadoresDto>(
        `${this.base}/${idPaciente}/resumen/indicadores`,
      ),
    );
  }

  obtenerActividad(
    idPaciente: number,
    page = 0,
    size = 20,
  ): Promise<PageResponse<PacienteActividadEventoDto>> {
    const params = buildQueryParams({ page, size });
    return firstValueFrom(
      this.http.get<PageResponse<PacienteActividadEventoDto>>(
        `${this.base}/${idPaciente}/resumen/actividad`,
        { params },
      ),
    );
  }
}
