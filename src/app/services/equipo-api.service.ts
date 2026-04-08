import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
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
  notasClinicas: false,
  configuracion: false,
};

@Injectable({ providedIn: 'root' })
export class EquipoApiService {
  private readonly baseUrl = `${environment.apiUrl}/recepcionistas`;

  constructor(private http: HttpClient) {}

  async getRecepcionistas(): Promise<RecepcionistaEquipoViewModel[]> {
    const rows = await firstValueFrom(this.http.get<RecepcionistaDto[]>(this.baseUrl));
    return Promise.all((rows ?? []).map(async row => this.toViewModel(row, this.resolveEmbeddedPermisos(row))));
  }

  async updateRecepcionistaPermisos(
    id: number,
    permisos: PermisosRecepcionista,
  ): Promise<RecepcionistaEquipoViewModel> {
    await firstValueFrom(
      this.http.put<PermisosRecepcionistaDto>(`${this.baseUrl}/${id}/permisos`, this.toPermisosDto(permisos)),
    );

    return this.getRecepcionistaBase(id);
  }

  async setRecepcionistaActivo(id: number, activo: boolean): Promise<RecepcionistaEquipoViewModel> {
    await firstValueFrom(this.http.patch<void>(`${this.baseUrl}/${id}/activo`, { activo }));
    return this.getRecepcionistaBase(id);
  }

  private async getRecepcionistaBase(id: number): Promise<RecepcionistaEquipoViewModel> {
    const detalle = await firstValueFrom(this.http.get<RecepcionistaDto>(`${this.baseUrl}/${id}`));
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
    const permisosRaw = permisosDto ?? await firstValueFrom(
      this.http.get<PermisosRecepcionistaDto>(`${this.baseUrl}/${row.id}/permisos`),
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
      id: Number(row?.id ?? 0),
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

  private mapBackendPermisos(raw: PermisosRecepcionistaDto | null | undefined): PermisosRecepcionista {
    if (!raw) return { ...PERMISOS_VACIOS };

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
      notasClinicas:
        raw.notas_clinicas === true ||
        raw.puede_ver_notas_clinicas === true ||
        raw.puede_crear_notas_clinicas === true ||
        raw.puede_editar_notas_clinicas === true,
      configuracion:
        raw.configuracion === true ||
        raw.puede_ver_configuracion === true ||
        raw.puede_editar_configuracion === true,
    };
  }

  private toPermisosDto(permisos: PermisosRecepcionista): PermisosRecepcionistaDto {
    return {
      agenda: permisos.agenda,
      citas: permisos.citas,
      pacientes: permisos.pacientes,
      notas_clinicas: permisos.notasClinicas,
      configuracion: permisos.configuracion,
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
