import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { normalizeApiBaseUrl } from 'src/environments/api-url';
import {
  ChecklistPrimeraSesionDto,
  ChecklistPrimeraSesionRequest,
} from '../pages/pacientes/models/primera-sesion.models';

/**
 * Checklist de primera sesión (admisión).
 * GET/PUT /api/pacientes/{id}/primera-sesion
 */
@Injectable({ providedIn: 'root' })
export class PrimeraSesionService {
  private readonly apiRoot = normalizeApiBaseUrl(environment.apiUrl);
  private readonly base = `${this.apiRoot}/pacientes`;

  constructor(private readonly http: HttpClient) {}

  /**
   * Un paciente que todavía no tiene sesiones puede responder sin body (204)
   * o con `null` (200). Ambos casos representan ausencia de primera sesión.
   */
  obtenerChecklist(idPaciente: number): Observable<ChecklistPrimeraSesionDto | null> {
    return this.http
      .get<ChecklistPrimeraSesionDto | null>(
        `${this.base}/${idPaciente}/primera-sesion`,
      )
      // HttpClient puede entregar una cadena vacía si el 200 no incluye body.
      .pipe(map(dto => dto || null));
  }

  guardarChecklist(
    idPaciente: number,
    request: ChecklistPrimeraSesionRequest,
  ): Observable<ChecklistPrimeraSesionDto> {
    return this.http.put<ChecklistPrimeraSesionDto>(
      `${this.base}/${idPaciente}/primera-sesion`,
      request,
    );
  }
}
