import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { PermisosRecepcionista, PERMISO_LABEL } from '../shared/models/permisos.model';
import { RecepcionistaEquipoViewModel } from '../shared/models/equipo.model';

const PERMISOS_VACIOS: PermisosRecepcionista = {
  agenda: false,
  citas: false,
  pacientes: false,
  notasClinicas: false,
  configuracion: false,
};

@Injectable({ providedIn: 'root' })
export class EquipoApiService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  async getRecepcionistas(): Promise<RecepcionistaEquipoViewModel[]> {
    const response = await this.tryPaths<any>(
      ['recepcionistas', 'equipo'],
      path => firstValueFrom(this.http.get<any>(`${this.baseUrl}/${path}`)),
    );

    const rows = this.extractRows(response);
    const mapped = await Promise.all(
      rows.map(async (row: any) => this.toViewModel(row)),
    );

    return mapped;
  }

  async updateRecepcionistaPermisos(
    id: number,
    permisos: PermisosRecepcionista,
  ): Promise<RecepcionistaEquipoViewModel> {
    const body = this.toBackendPermisosPayload(permisos);

    const response = await this.tryPaths<any>(
      [`recepcionistas/${id}/permisos`, `equipo/${id}/permisos`],
      path => firstValueFrom(this.http.put<any>(`${this.baseUrl}/${path}`, body)),
      {
        fallback: async () => {
          await firstValueFrom(
            this.http.put<any>(`${this.baseUrl}/recepcionistas/${id}/permisos`, { permisos: body }),
          );
          return this.getRecepcionistaDetalle(id);
        },
      },
    );

    return this.toViewModel({
      ...(await this.getRecepcionistaBase(id).catch(() => ({ id }))),
      ...response,
      permisos: this.extractPermisosRecord(response) ?? body,
    });
  }

  async setRecepcionistaActivo(id: number, activo: boolean): Promise<RecepcionistaEquipoViewModel> {
    const response = await this.tryPaths<any>(
      [`recepcionistas/${id}/activo`, `equipo/${id}/activo`],
      path => firstValueFrom(this.http.patch<any>(`${this.baseUrl}/${path}`, { activo })),
      {
        fallback: async () => {
          await firstValueFrom(
            this.http.patch<any>(`${this.baseUrl}/recepcionistas/${id}`, { activo }),
          );
          return this.getRecepcionistaDetalle(id);
        },
      },
    );

    return this.toViewModel({
      ...(await this.getRecepcionistaBase(id).catch(() => ({ id }))),
      ...response,
    });
  }

  private async getRecepcionistaDetalle(id: number): Promise<any> {
    return this.tryPaths<any>(
      [`recepcionistas/${id}`, `equipo/${id}`],
      path => firstValueFrom(this.http.get<any>(`${this.baseUrl}/${path}`)),
    );
  }

  private async getRecepcionistaBase(id: number): Promise<any> {
    const detalle = await this.getRecepcionistaDetalle(id);
    const permisos = await this.getPermisos(id).catch(() => null);

    return {
      ...detalle,
      permisos: permisos ?? this.extractPermisosRecord(detalle),
    };
  }

  private async getPermisos(id: number): Promise<Record<string, boolean> | null> {
    const response = await this.tryPaths<any>(
      [`recepcionistas/${id}/permisos`, `equipo/${id}/permisos`],
      path => firstValueFrom(this.http.get<any>(`${this.baseUrl}/${path}`)),
      { allowNullWhenMissing: true },
    );

    return this.extractPermisosRecord(response);
  }

  private extractRows(response: any): any[] {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.content)) return response.content;
    if (Array.isArray(response?.recepcionistas)) return response.recepcionistas;
    if (Array.isArray(response?.items)) return response.items;
    return [];
  }

  private async toViewModel(row: any): Promise<RecepcionistaEquipoViewModel> {
    const id = this.resolveId(row);
    const permisosRecord = this.extractPermisosRecord(row) ?? await this.getPermisos(id).catch(() => null);
    const permisos = this.mapBackendPermisos(permisosRecord);
    const nombre = String(row?.nombre ?? row?.usuario?.nombre ?? '').trim();
    const apellido = String(row?.apellido ?? row?.usuario?.apellido ?? '').trim();

    return {
      id,
      nombre,
      apellido,
      nombreCompleto: [apellido, nombre].filter(Boolean).join(', ') || nombre || apellido,
      initials: this.buildInitials(nombre, apellido),
      email: String(row?.email ?? row?.usuario?.email ?? ''),
      activo: Boolean(row?.activo ?? row?.usuario?.activo ?? false),
      fechaVinculacion: this.formatFechaVinculacion(
        row?.created_at ??
        row?.fecha_vinculacion ??
        row?.fechaVinculacion ??
        row?.usuario?.created_at ??
        null,
      ),
      permisos,
      permisosActivosCount: this.countActivePermisos(permisos),
      permisosResumen: this.buildPermisosResumen(permisos),
    };
  }

  private resolveId(row: any): number {
    return Number(
      row?.id ??
      row?.id_recepcionista ??
      row?.id_usuario ??
      row?.usuario?.id ??
      row?.usuario?.id_usuario ??
      0,
    );
  }

  private extractPermisosRecord(source: any): Record<string, boolean> | null {
    if (!source) return null;
    if (source.permisos && typeof source.permisos === 'object' && !Array.isArray(source.permisos)) {
      return source.permisos as Record<string, boolean>;
    }
    if (typeof source === 'object' && !Array.isArray(source)) {
      const candidateEntries = Object.entries(source).filter(([, value]) => typeof value === 'boolean');
      const hasPermissionLikeKey = candidateEntries.some(([key]) =>
        key.includes('permiso') ||
        key.startsWith('puede_') ||
        ['agenda', 'citas', 'pacientes', 'notas_clinicas', 'configuracion'].includes(key),
      );
      if (hasPermissionLikeKey) {
        const permissions: Record<string, boolean> = {};
        for (const [key, value] of candidateEntries) {
          permissions[key] = value as boolean;
        }
        return permissions;
      }
    }
    return null;
  }

  private mapBackendPermisos(raw: Record<string, boolean> | null): PermisosRecepcionista {
    if (!raw) return { ...PERMISOS_VACIOS };

    return {
      agenda: this.hasAnyTrue(raw, [
        'agenda',
        'puede_ver_agenda',
        'puede_gestionar_agenda',
        'puede_ver_calendario',
      ]),
      citas: this.hasAnyTrue(raw, [
        'citas',
        'puede_ver_citas',
        'puede_crear_citas',
        'puede_editar_citas',
        'puede_cancelar_citas',
      ]),
      pacientes: this.hasAnyTrue(raw, [
        'pacientes',
        'puede_ver_pacientes',
        'puede_crear_pacientes',
        'puede_editar_pacientes',
      ]),
      notasClinicas: this.hasAnyTrue(raw, [
        'notas_clinicas',
        'notasClinicas',
        'puede_ver_notas_clinicas',
        'puede_gestionar_notas_clinicas',
        'puede_ver_sesiones',
      ]),
      configuracion: this.hasAnyTrue(raw, [
        'configuracion',
        'puede_ver_configuracion',
        'puede_gestionar_configuracion',
      ]),
    };
  }

  private toBackendPermisosPayload(permisos: PermisosRecepcionista): Record<string, boolean> {
    return {
      agenda: permisos.agenda,
      citas: permisos.citas,
      pacientes: permisos.pacientes,
      notas_clinicas: permisos.notasClinicas,
      configuracion: permisos.configuracion,
      puede_ver_agenda: permisos.agenda,
      puede_gestionar_agenda: permisos.agenda,
      puede_ver_citas: permisos.citas,
      puede_crear_citas: permisos.citas,
      puede_editar_citas: permisos.citas,
      puede_cancelar_citas: permisos.citas,
      puede_ver_pacientes: permisos.pacientes,
      puede_crear_pacientes: permisos.pacientes,
      puede_editar_pacientes: permisos.pacientes,
      puede_ver_notas_clinicas: permisos.notasClinicas,
      puede_gestionar_notas_clinicas: permisos.notasClinicas,
      puede_ver_configuracion: permisos.configuracion,
      puede_gestionar_configuracion: permisos.configuracion,
    };
  }

  private hasAnyTrue(raw: Record<string, boolean>, keys: string[]): boolean {
    return keys.some(key => raw[key] === true);
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
    return `${activos.slice(0, 2).join(', ')} +${activos.length - 2} más`;
  }

  private async tryPaths<T>(
    paths: string[],
    runner: (path: string) => Promise<T>,
    options?: { fallback?: () => Promise<T>; allowNullWhenMissing?: boolean },
  ): Promise<T> {
    let lastError: unknown;

    for (let index = 0; index < paths.length; index += 1) {
      try {
        return await runner(paths[index]);
      } catch (error) {
        lastError = error;
        if (!this.isFallbackError(error) || index === paths.length - 1) {
          break;
        }
      }
    }

    if (options?.fallback) {
      return options.fallback();
    }

    if (options?.allowNullWhenMissing && lastError instanceof HttpErrorResponse && lastError.status === 404) {
      return null as T;
    }

    throw lastError;
  }

  private isFallbackError(error: unknown): boolean {
    return error instanceof HttpErrorResponse && [404, 405].includes(error.status);
  }
}
