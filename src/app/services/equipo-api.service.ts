import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { normalizeApiBaseUrl } from 'src/environments/api-url';
import { PermisosRecepcionista, PERMISO_LABEL } from '../shared/models/permisos.model';
import {
  PermisosRecepcionistaDto,
  RecepcionistaDto,
  RecepcionistaEquipoViewModel,
} from '../shared/models/equipo.model';

const PERMISOS_VACIOS: PermisosRecepcionista = {
  agenda: false,
  citas: false,
  pacientes: false,
  sesiones: false,
  estadisticas: false,
  configuracion: false,
};

interface PermisosUpdateDto {
  permisos: Array<{ permiso_clave: string; permitido: boolean }>;
}

const PERMISO_KEY_TO_CLAVE: Record<keyof PermisosRecepcionista, string> = {
  agenda: 'AGENDA',
  citas: 'CITAS',
  pacientes: 'PACIENTES',
  sesiones: 'SESIONES',
  estadisticas: 'ESTADISTICAS',
  configuracion: 'CONFIGURACION',
};

const PERMISO_CLAVE_TO_KEY: Record<string, keyof PermisosRecepcionista> = {
  AGENDA: 'agenda',
  CITAS: 'citas',
  PACIENTES: 'pacientes',
  SESIONES: 'sesiones',
  ESTADISTICAS: 'estadisticas',
  CONFIGURACION: 'configuracion',
};

export function isValidRecepcionistaId(id: unknown): id is number {
  return typeof id === 'number' && Number.isInteger(id) && id > 0;
}

export class InvalidRecepcionistaIdError extends Error {
  constructor(id: unknown) {
    super('No se pudo identificar al recepcionista. Recarga la lista e inténtalo de nuevo.');
    this.name = 'InvalidRecepcionistaIdError';
    (this as { receivedId?: unknown }).receivedId = id;
  }
}

@Injectable({ providedIn: 'root' })
export class EquipoApiService {
  private readonly apiRoot = normalizeApiBaseUrl(environment.apiUrl);
  private readonly baseUrl = `${this.apiRoot}/recepcionistas`;

  constructor(private http: HttpClient) {}

  async getRecepcionistas(): Promise<RecepcionistaEquipoViewModel[]> {
    const rows = await firstValueFrom(this.http.get<RecepcionistaDto[]>(this.baseUrl));
    const validRows = (rows ?? []).filter(row => {
      if (this.resolveId(row) !== null) return true;
      this.debug('Recepcionista descartado por ID inválido', row);
      return false;
    });
    return Promise.all(validRows.map(async row => this.toViewModel(row, this.resolveEmbeddedPermisos(row))));
  }

  async updateRecepcionistaPermisos(
    id: number,
    permisos: PermisosRecepcionista,
  ): Promise<RecepcionistaEquipoViewModel> {
    this.assertValidId(id);
    this.debug('PUT permisos', { id });
    await firstValueFrom(
      this.http.put<unknown>(`${this.baseUrl}/${id}/permisos`, this.toPermisosDto(permisos)),
    );

    return this.getRecepcionistaBase(id);
  }

  async setRecepcionistaActivo(id: number, activo: boolean): Promise<RecepcionistaEquipoViewModel> {
    this.assertValidId(id);
    await firstValueFrom(this.http.patch<void>(`${this.baseUrl}/${id}/activo`, { activo }));
    return this.getRecepcionistaBase(id);
  }

  private async getRecepcionistaBase(id: number): Promise<RecepcionistaEquipoViewModel> {
    const detalleRaw = await firstValueFrom(this.http.get<RecepcionistaDto>(`${this.baseUrl}/${id}`));
    const detalle = { ...detalleRaw, id: this.resolveId(detalleRaw) ?? id };
    const embeddedPermisos = this.resolveEmbeddedPermisos(detalle);

    if (embeddedPermisos) {
      return this.toViewModel(detalle, embeddedPermisos);
    }

    const permisosDto = await firstValueFrom(
      this.http.get<PermisosRecepcionistaDto>(`${this.baseUrl}/${id}/permisos`)
    );

    return this.toViewModel(detalle, permisosDto);
  }

  private async toViewModel(
    row: RecepcionistaDto,
    permisosDto?: PermisosRecepcionistaDto,
  ): Promise<RecepcionistaEquipoViewModel> {
    const id = this.resolveId(row);
    if (id === null) {
      this.debug('Respuesta de recepcionista sin ID válido', row);
      throw new InvalidRecepcionistaIdError(row?.id);
    }
    const permisosRaw = permisosDto ?? await firstValueFrom(
      this.http.get<PermisosRecepcionistaDto>(`${this.baseUrl}/${id}/permisos`),
    );
    const permisos = this.mapBackendPermisos(permisosRaw);
    const nombre = String(row?.nombre ?? '').trim();
    const apellido = String(row?.apellido ?? '').trim();
    const permisosActivosCount =
      row?.permisos_activos_count ??
      row?.permisosActivosCount ??
      this.countActivePermisos(permisos);
    const permisosResumen =
      String(row?.permisos_resumen ?? row?.permisosResumen ?? '').trim() ||
      this.buildPermisosResumen(permisos);

    return {
      id,
      nombre,
      apellido,
      nombreCompleto: [apellido, nombre].filter(Boolean).join(', ') || nombre || apellido,
      initials: this.buildInitials(nombre, apellido),
      email: String(row?.email ?? ''),
      activo: Boolean(row?.activo),
      fechaVinculacion: this.formatFechaVinculacion(row?.fecha_vinculacion ?? null),
      permisos,
      permisosActivosCount,
      permisosResumen,
    };
  }

  private resolveId(row: RecepcionistaDto | null | undefined): number | null {
    const raw = row as unknown as Record<string, unknown> | null | undefined;
    for (const candidate of [raw?.['id'], raw?.['id_recepcionista'], raw?.['recepcionista_id'], raw?.['idRecepcionista']]) {
      if (candidate === null || candidate === undefined || candidate === '') continue;
      const parsed = Number(candidate);
      if (isValidRecepcionistaId(parsed)) return parsed;
    }
    return null;
  }

  private assertValidId(id: unknown): asserts id is number {
    if (!isValidRecepcionistaId(id)) {
      this.debug('ID de recepcionista inválido, request cancelado', { id });
      throw new InvalidRecepcionistaIdError(id);
    }
  }

  private debug(message: string, data?: unknown): void {
    if (!environment.production) {
      console.debug(`[EquipoApi] ${message}`, data);
    }
  }

  private mapBackendPermisos(input: unknown): PermisosRecepcionista {
    if (!input) return { ...PERMISOS_VACIOS };

    const list = Array.isArray(input)
      ? input
      : Array.isArray((input as { permisos?: unknown }).permisos)
        ? (input as { permisos: unknown[] }).permisos
        : null;

    if (list) {
      const result = { ...PERMISOS_VACIOS };
      for (const item of list as Array<{ permiso_clave?: string; permitido?: boolean }>) {
        const key = PERMISO_CLAVE_TO_KEY[String(item?.permiso_clave ?? '').toUpperCase()];
        if (key) result[key] = item?.permitido === true;
      }
      return result;
    }

    const raw = input as PermisosRecepcionistaDto;
    return {
      agenda:
        raw.agenda === true ||
        raw.puede_ver_agenda === true ||
        raw.puede_gestionar_agenda === true,
      citas:
        raw.citas === true ||
        raw.puede_crear_citas === true ||
        raw.puede_ver_citas === true ||
        raw.puede_editar_citas === true ||
        raw.puede_cancelar_citas === true,
      pacientes:
        raw.pacientes === true ||
        raw.puede_ver_pacientes === true ||
        raw.puede_crear_pacientes === true ||
        raw.puede_editar_pacientes === true,
      sesiones:
        raw.sesiones === true ||
        raw.notas_clinicas === true ||
        raw.puede_ver_notas_clinicas === true ||
        raw.puede_crear_notas_clinicas === true ||
        raw.puede_editar_notas_clinicas === true,
      estadisticas: raw.estadisticas === true || raw.notas_clinicas === true,
      configuracion:
        raw.configuracion === true ||
        raw.puede_ver_configuracion === true ||
        raw.puede_editar_configuracion === true,
    };
  }

  private toPermisosDto(permisos: PermisosRecepcionista): PermisosUpdateDto {
    return {
      permisos: (Object.keys(PERMISO_KEY_TO_CLAVE) as Array<keyof PermisosRecepcionista>).map(key => ({
        permiso_clave: PERMISO_KEY_TO_CLAVE[key],
        permitido: permisos[key] === true,
      })),
    };
  }

  private buildInitials(nombre: string, apellido: string): string {
    const first = nombre.trim().charAt(0);
    const last = apellido.trim().charAt(0);
    return `${first}${last}`.toUpperCase() || 'R';
  }

  private formatFechaVinculacion(value: string | null): string {
    if (!value) return 'Sin fecha';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(date);
  }

  private countActivePermisos(permisos: PermisosRecepcionista): number {
    return Object.values(permisos).filter(Boolean).length;
  }

  private buildPermisosResumen(permisos: PermisosRecepcionista): string {
    const activos = (Object.keys(permisos) as Array<keyof PermisosRecepcionista>)
      .filter(key => permisos[key])
      .map(key => PERMISO_LABEL[key]);

    if (activos.length === 0) return 'Sin permisos';
    if (activos.length <= 3) return activos.join(', ');
    return `${activos.slice(0, 2).join(', ')} +${activos.length - 2} mas`;
  }

  private resolveEmbeddedPermisos(row: RecepcionistaDto): PermisosRecepcionistaDto | undefined {
    const raw = row?.permisos;
    if (!raw || typeof raw !== 'object') {
      return undefined;
    }

    return raw as PermisosRecepcionistaDto;
  }
}
