import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { normalizeApiBaseUrl } from 'src/environments/api-url';
import { PageResponse } from '../shared/models/page.model';
import {
  ActualizarRecetaRequest,
  CopiarRecetaRequest,
  CrearRecetaRequest,
  CrearVersionRecetaRequest,
  ListarRecetasPacienteParams,
  RecetaDetalle,
  RecetaPdfDisposition,
  RecetaPdfUrlResponse,
  RecetaResumen,
} from '../shared/models/recetas.models';
import { buildQueryParams } from '../shared/utils/query-params.utils';
import { stripForbiddenRecetaPayloadFields } from '../shared/utils/receta-form.adapters';

/**
 * Cliente HTTP del módulo de recetas médicas.
 * Auth Bearer vía interceptor. No construye URLs de R2 ni persiste URLs firmadas.
 */
@Injectable({ providedIn: 'root' })
export class RecetasApiService {
  private readonly http = inject(HttpClient);
  private readonly apiRoot = normalizeApiBaseUrl(environment.apiUrl);
  private readonly recetasBase = `${this.apiRoot}/recetas`;
  private readonly pacientesBase = `${this.apiRoot}/pacientes`;

  /** POST /api/recetas → 201 BORRADOR */
  crearReceta(request: CrearRecetaRequest): Promise<RecetaDetalle> {
    const body = stripForbiddenRecetaPayloadFields({ ...request } as Record<string, unknown>);
    return firstValueFrom(
      this.http.post<RecetaDetalle>(this.recetasBase, body),
    );
  }

  /** GET /api/recetas/{idReceta} */
  obtenerReceta(idReceta: number): Promise<RecetaDetalle> {
    return firstValueFrom(
      this.http.get<RecetaDetalle>(`${this.recetasBase}/${idReceta}`),
    );
  }

  /**
   * GET /api/pacientes/{idPaciente}/recetas
   * Query real del backend: estado?, page, size, sort.
   * (No hay filtros texto/fecha en el controller actual.)
   */
  listarRecetasPaciente(
    idPaciente: number,
    params: ListarRecetasPacienteParams = {},
  ): Promise<PageResponse<RecetaResumen>> {
    return firstValueFrom(
      this.http.get<PageResponse<RecetaResumen>>(
        `${this.pacientesBase}/${idPaciente}/recetas`,
        {
          params: buildQueryParams({
            page: params.page,
            size: params.size,
            sort: params.sort,
            estado: params.estado,
          }),
        },
      ),
    );
  }

  /** PUT /api/recetas/{idReceta} — solo BORRADOR */
  actualizarBorrador(
    idReceta: number,
    request: ActualizarRecetaRequest,
  ): Promise<RecetaDetalle> {
    const body = stripForbiddenRecetaPayloadFields({ ...request } as Record<string, unknown>);
    return firstValueFrom(
      this.http.put<RecetaDetalle>(`${this.recetasBase}/${idReceta}`, body),
    );
  }

  /** POST /api/recetas/{idReceta}/emitir */
  emitirReceta(idReceta: number): Promise<RecetaDetalle> {
    return firstValueFrom(
      this.http.post<RecetaDetalle>(`${this.recetasBase}/${idReceta}/emitir`, null),
    );
  }

  /** POST /api/recetas/{idReceta}/versiones — EMITIDA → nueva versión PDF */
  crearNuevaVersion(
    idReceta: number,
    request: CrearVersionRecetaRequest,
  ): Promise<RecetaDetalle> {
    // Conserva lock_version: 0 y numero_version_base; stripForbidden no los elimina.
    const body = stripForbiddenRecetaPayloadFields({ ...request } as Record<string, unknown>);
    return firstValueFrom(
      this.http.post<RecetaDetalle>(`${this.recetasBase}/${idReceta}/versiones`, body),
    );
  }

  /** POST /api/recetas/{idReceta}/copias → 201 BORRADOR */
  guardarComoCopia(
    idReceta: number,
    request: CopiarRecetaRequest,
  ): Promise<RecetaDetalle> {
    const body = stripForbiddenRecetaPayloadFields({ ...request } as Record<string, unknown>);
    return firstValueFrom(
      this.http.post<RecetaDetalle>(`${this.recetasBase}/${idReceta}/copias`, body),
    );
  }

  /** POST /api/recetas/{idReceta}/anular */
  anularReceta(idReceta: number): Promise<RecetaDetalle> {
    return firstValueFrom(
      this.http.post<RecetaDetalle>(`${this.recetasBase}/${idReceta}/anular`, null),
    );
  }

  /** DELETE /api/recetas/{idReceta} — soft delete ELIMINADA */
  eliminarReceta(idReceta: number): Promise<RecetaDetalle> {
    return firstValueFrom(
      this.http.delete<RecetaDetalle>(`${this.recetasBase}/${idReceta}`),
    );
  }

  /**
   * GET /api/recetas/{idReceta}/pdf-url
   * La URL es temporal: no guardar en localStorage ni en el modelo de receta.
   */
  obtenerPdfUrl(
    idReceta: number,
    disposition: RecetaPdfDisposition = 'inline',
  ): Promise<RecetaPdfUrlResponse> {
    return firstValueFrom(
      this.http.get<RecetaPdfUrlResponse>(`${this.recetasBase}/${idReceta}/pdf-url`, {
        params: buildQueryParams({ disposition }),
      }),
    );
  }

  /**
   * GET /api/recetas/{idReceta}/versiones/{numeroVersion}/pdf-url
   * No hay endpoint de listado de versiones en el backend actual.
   */
  obtenerPdfVersionUrl(
    idReceta: number,
    numeroVersion: number,
    disposition: RecetaPdfDisposition = 'inline',
  ): Promise<RecetaPdfUrlResponse> {
    return firstValueFrom(
      this.http.get<RecetaPdfUrlResponse>(
        `${this.recetasBase}/${idReceta}/versiones/${numeroVersion}/pdf-url`,
        { params: buildQueryParams({ disposition }) },
      ),
    );
  }
}
