import { HttpClient } from '@angular/common/http';
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
  private readonly usuarioMeUrl = `${this.baseUrl}/usuarios/me`;
  private readonly passwordUrl = `${this.usuarioMeUrl}/password`;
  private readonly profesionalMeUrl = `${this.baseUrl}/profesionales/me`;
  private readonly profesionalPerfilUrl = `${this.profesionalMeUrl}/perfil`;
  private readonly codigoVinculacionUrl = `${this.baseUrl}/codigos-vinculacion/me`;
  private readonly regenerarCodigoUrl = `${this.baseUrl}/codigos-vinculacion/regenerar`;

  constructor(private http: HttpClient) {}

  async getUsuarioActual(): Promise<UsuarioPerfilDto> {
    const raw = await firstValueFrom(this.http.get<any>(this.usuarioMeUrl));
    return this.normalizeUsuario(raw);
  }

  async getProfesionalActual(): Promise<ProfesionalPerfilDto | null> {
    const raw = await firstValueFrom(this.http.get<any>(this.profesionalMeUrl));
    return this.normalizeProfesional(raw);
  }

  async updateUsuarioActual(body: UsuarioPerfilUpdateRequest): Promise<UsuarioPerfilDto> {
    const raw = await firstValueFrom(this.http.put<any>(this.usuarioMeUrl, body));
    return this.normalizeUsuario(raw);
  }

  async updateProfesionalActual(body: ProfesionalPerfilUpdateRequest): Promise<ProfesionalPerfilDto | null> {
    const raw = await firstValueFrom(this.http.put<any>(this.profesionalPerfilUrl, body));
    return this.normalizeProfesional(raw);
  }

  async getCodigoVinculacion(): Promise<string | null> {
    const raw = await firstValueFrom(this.http.get<any>(this.codigoVinculacionUrl));
    return this.normalizeCodigo(raw);
  }

  async regenerarCodigoVinculacion(): Promise<string | null> {
    const raw = await firstValueFrom(this.http.post<any>(this.regenerarCodigoUrl, {}));
    return this.normalizeCodigo(raw);
  }

  changePassword(body: ChangePasswordRequest): Promise<void> {
    return firstValueFrom(this.http.put<void>(this.passwordUrl, {
      password_actual: body.password_actual,
      password_nueva: body.password_nueva,
    }));
  }

  private normalizeUsuario(raw: any): UsuarioPerfilDto {
    const base: AuthMeResponse | any = raw;
    return {
      id_usuario: Number(base?.id_usuario ?? 0),
      nombre: base?.nombre ?? '',
      apellido: base?.apellido ?? '',
      email: base?.email ?? '',
      username: base?.username ?? '',
      domicilio: base?.domicilio ?? null,
      numero_telefono: base?.numero_telefono ?? null,
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
      id_profesional: this.normalizeNumber(source?.id_profesional),
      especialidad: source?.especialidad ?? null,
      nombre_consulta: source?.nombre_consulta ?? null,
      tipo_servicio: source?.tipo_servicio ?? null,
      descripcion: source?.descripcion ?? null,
      codigo_vinculacion: source?.codigo_vinculacion ?? null,
      telefono_consultorio: source?.telefono_consultorio ?? null,
      direccion_consultorio: source?.direccion_consultorio ?? null,
    };
  }

  private normalizeCodigo(raw: any): string | null {
    if (!raw) return null;
    return raw?.codigo_vinculacion ?? null;
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
}
