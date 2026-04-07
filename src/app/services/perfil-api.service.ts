import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AuthMeResponse } from '../shared/models/auth.models';
import {
  ChangePasswordRequest,
  ProfesionalPerfilDto,
  ProfesionalPerfilUpdateRequest,
  UsuarioPerfilDto,
  UsuarioPerfilUpdateRequest,
} from '../shared/models/perfil.models';

@Injectable({ providedIn: 'root' })
export class PerfilApiService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getUsuarioActual(): Promise<UsuarioPerfilDto> {
    return this.tryPaths(
      ['usuarios/me', 'auth/me'],
      path => firstValueFrom(this.http.get<any>(`${this.baseUrl}/${path}`)).then(raw => this.normalizeUsuario(raw)),
    );
  }

  getProfesionalActual(profesionalId?: number | null): Promise<ProfesionalPerfilDto | null> {
    const dynamicPaths = ['profesionales/me'];
    if (profesionalId) {
      dynamicPaths.push(`profesionales/${profesionalId}`);
    }

    return this.tryPaths(
      dynamicPaths,
      path => firstValueFrom(this.http.get<any>(`${this.baseUrl}/${path}`)).then(raw => this.normalizeProfesional(raw)),
      { allowNullWhenMissing: true },
    );
  }

  updateUsuarioActual(body: UsuarioPerfilUpdateRequest, userId?: number | null): Promise<UsuarioPerfilDto> {
    return this.tryPaths(
      ['usuarios/me'],
      path => firstValueFrom(this.http.put<any>(`${this.baseUrl}/${path}`, body)).then(raw => this.normalizeUsuario(raw)),
      {
        fallback: () => {
          if (!userId) {
            throw new Error('No se encontró el id del usuario actual para actualizar el perfil.');
          }
          return firstValueFrom(
            this.http.put<any>(`${this.baseUrl}/usuarios/${userId}`, body),
          ).then(raw => this.normalizeUsuario(raw));
        },
      },
    );
  }

  updateProfesionalActual(
    body: ProfesionalPerfilUpdateRequest,
    profesionalId?: number | null,
  ): Promise<ProfesionalPerfilDto | null> {
    return this.tryPaths(
      ['profesionales/me/perfil'],
      path => firstValueFrom(this.http.put<any>(`${this.baseUrl}/${path}`, body)).then(raw => this.normalizeProfesional(raw)),
      {
        fallback: () => {
          if (!profesionalId) {
            throw new Error('No se encontró el id del perfil profesional actual para guardar cambios.');
          }
          return firstValueFrom(
            this.http.put<any>(`${this.baseUrl}/profesionales/${profesionalId}`, body),
          ).then(raw => this.normalizeProfesional(raw));
        },
      },
    );
  }

  getCodigoVinculacion(profesionalId?: number | null): Promise<string | null> {
    return this.tryPaths(
      ['profesionales/me/codigo-vinculacion', 'codigos-vinculacion/me'],
      path => firstValueFrom(this.http.get<any>(`${this.baseUrl}/${path}`)).then(raw => this.normalizeCodigo(raw)),
      {
        allowNullWhenMissing: true,
        fallback: async () => {
          const profesional = await this.getProfesionalActual(profesionalId);
          return profesional?.codigo_vinculacion ?? null;
        },
      },
    );
  }

  regenerarCodigoVinculacion(profesionalId?: number | null): Promise<string | null> {
    return this.tryPaths(
      ['profesionales/me/codigo-vinculacion/regenerar', 'codigos-vinculacion/regenerar'],
      path => firstValueFrom(this.http.post<any>(`${this.baseUrl}/${path}`, {})).then(raw => this.normalizeCodigo(raw)),
      {
        fallback: async () => {
          const profesional = await this.getProfesionalActual(profesionalId);
          return profesional?.codigo_vinculacion ?? null;
        },
      },
    );
  }

  changePassword(body: ChangePasswordRequest, userId?: number | null): Promise<void> {
    const payload = {
      password_actual: body.password_actual,
      password_nueva: body.password_nueva,
      current_password: body.password_actual,
      new_password: body.password_nueva,
      contrasena_actual: body.password_actual,
      contrasena_nueva: body.password_nueva,
    };

    return this.tryPaths(
      ['usuarios/me/password'],
      path => firstValueFrom(this.http.put<void>(`${this.baseUrl}/${path}`, payload)),
      {
        fallback: () => {
          if (!userId) {
            throw new Error('No se encontró el id del usuario actual para cambiar la contraseña.');
          }
          return firstValueFrom(this.http.put<void>(`${this.baseUrl}/usuarios/${userId}/password`, payload));
        },
      },
    );
  }

  private normalizeUsuario(raw: any): UsuarioPerfilDto {
    const base: AuthMeResponse | any = raw;
    return {
      id_usuario: Number(base?.id_usuario ?? base?.id ?? 0),
      nombre: base?.nombre ?? '',
      apellido: base?.apellido ?? '',
      email: base?.email ?? '',
      username: base?.username ?? base?.usuario ?? '',
      domicilio: base?.domicilio ?? null,
      numero_telefono: base?.numero_telefono ?? base?.telefono ?? null,
      fecha_nacimiento: base?.fecha_nacimiento ?? null,
      id_rol: this.normalizeNumber(base?.id_rol),
      activo: this.normalizeBoolean(base?.activo),
      bloqueado: this.normalizeBoolean(base?.bloqueado),
    };
  }

  private normalizeProfesional(raw: any): ProfesionalPerfilDto | null {
    const source = raw?.profesional ?? raw;
    if (!source) return null;

    return {
      id_profesional: this.normalizeNumber(source?.id_profesional ?? source?.id),
      especialidad: source?.especialidad ?? source?.profesional_especialidad ?? null,
      nombre_consulta: source?.nombre_consulta ?? null,
      tipo_servicio: source?.tipo_servicio ?? null,
      descripcion: source?.descripcion ?? source?.bio ?? null,
      codigo_vinculacion: source?.codigo_vinculacion ?? null,
      telefono_consultorio: source?.telefono_consultorio ?? source?.telefono ?? null,
      direccion_consultorio: source?.direccion_consultorio ?? source?.direccion ?? null,
    };
  }

  private normalizeCodigo(raw: any): string | null {
    if (!raw) return null;
    return raw?.codigo_vinculacion ?? raw?.codigo ?? raw?.value ?? null;
  }

  private normalizeNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private normalizeBoolean(value: unknown): boolean | null {
    if (value === null || value === undefined) return null;
    return Boolean(value);
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
