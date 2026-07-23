import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, firstValueFrom, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import {
  ActualizarMiPerfilRequest,
  ChangePasswordRequest,
  MiPerfilResponse,
  ProfesionalPerfilDto,
  ProfesionalPerfilUpdateRequest,
  UsuarioPerfilDto,
} from '../shared/models/perfil.models';

@Injectable({ providedIn: 'root' })
export class PerfilApiService {
  private readonly baseUrl = environment.apiUrl;
  /** URL final: `{apiUrl}/usuarios/me` → p.ej. http://localhost:8080/api/usuarios/me */
  private readonly usuarioMeUrl = `${this.baseUrl}/usuarios/me`;
  private readonly passwordUrl = `${this.usuarioMeUrl}/password`;
  private readonly profesionalMeUrl = `${this.baseUrl}/profesionales/me`;
  private readonly profesionalPerfilUrl = `${this.profesionalMeUrl}/perfil`;
  private readonly codigoVinculacionUrl = `${this.baseUrl}/codigos-vinculacion/me`;
  private readonly regenerarCodigoUrl = `${this.baseUrl}/codigos-vinculacion/regenerar`;

  constructor(private http: HttpClient) {}

  /**
   * Perfil combinado del usuario autenticado.
   * Llama exactamente GET /api/usuarios/me y normaliza flat/anidado.
   */
  obtenerMiPerfil(): Observable<MiPerfilResponse> {
    return this.http.get<unknown>(this.usuarioMeUrl).pipe(
      map(raw => this.normalizeMiPerfil(raw)),
    );
  }

  async getUsuarioActual(): Promise<UsuarioPerfilDto> {
    const perfil = await firstValueFrom(this.obtenerMiPerfil());
    return this.toUsuarioPerfilDto(perfil);
  }

  /** @deprecated Preferir obtenerMiPerfil() */
  async getMiPerfil(): Promise<MiPerfilResponse> {
    return firstValueFrom(this.obtenerMiPerfil());
  }

  /**
   * Actualiza el perfil del usuario autenticado.
   * PUT /api/usuarios/me — sin ID en la URL ni en el body.
   * Si el body de respuesta está vacío/inválido, hace GET de respaldo (un solo PUT).
   */
  actualizarMiPerfil(payload: ActualizarMiPerfilRequest): Observable<MiPerfilResponse> {
    const body = this.sanitizeActualizarPayload(payload);
    return this.http.put<unknown>(this.usuarioMeUrl, body).pipe(
      switchMap(raw => {
        if (this.isEmptyOrInvalidProfileBody(raw)) {
          return this.obtenerMiPerfil();
        }
        return of(this.normalizeMiPerfil(raw));
      }),
    );
  }

  /** @deprecated Usar actualizarMiPerfil */
  async updateUsuarioActual(payload: ActualizarMiPerfilRequest): Promise<UsuarioPerfilDto> {
    const saved = await firstValueFrom(this.actualizarMiPerfil(payload));
    return this.toUsuarioPerfilDto(saved);
  }

  async getProfesionalActual(): Promise<ProfesionalPerfilDto | null> {
    const raw = await firstValueFrom(this.http.get<unknown>(this.profesionalMeUrl));
    return this.normalizeProfesional(raw);
  }

  async updateProfesionalActual(body: ProfesionalPerfilUpdateRequest): Promise<ProfesionalPerfilDto | null> {
    const raw = await firstValueFrom(this.http.put<unknown>(this.profesionalPerfilUrl, body));
    return this.normalizeProfesional(raw);
  }

  async getCodigoVinculacion(): Promise<string | null> {
    const raw = await firstValueFrom(this.http.get<unknown>(this.codigoVinculacionUrl));
    return this.normalizeCodigo(raw);
  }

  async regenerarCodigoVinculacion(): Promise<string | null> {
    const raw = await firstValueFrom(this.http.post<unknown>(this.regenerarCodigoUrl, {}));
    return this.normalizeCodigo(raw);
  }

  changePassword(body: ChangePasswordRequest): Promise<void> {
    return firstValueFrom(this.http.put<void>(this.passwordUrl, {
      password_actual: body.password_actual,
      password_nueva: body.password_nueva,
    }));
  }

  /** True cuando el 200 no trae un perfil usable (body vacío o sin identidad). */
  isValidMiPerfilResponse(perfil: MiPerfilResponse | null | undefined): boolean {
    if (!perfil) return false;
    return !!(
      perfil.nombreCompleto?.trim() ||
      perfil.correoElectronico?.trim() ||
      perfil.usuario?.trim()
    );
  }

  private sanitizeActualizarPayload(payload: ActualizarMiPerfilRequest): ActualizarMiPerfilRequest {
    const trimOrEmpty = (value?: string | null): string => (value ?? '').trim();

    return {
      nombreCompleto: trimOrEmpty(payload.nombreCompleto),
      correoElectronico: trimOrEmpty(payload.correoElectronico),
      usuario: trimOrEmpty(payload.usuario),
      telefono: trimOrEmpty(payload.telefono),
      domicilio: trimOrEmpty(payload.domicilio),
      especialidad: trimOrEmpty(payload.especialidad),
      cedulaProfesional: trimOrEmpty(payload.cedulaProfesional),
      nombreConsultorio: trimOrEmpty(payload.nombreConsultorio),
      telefonoConsultorio: trimOrEmpty(payload.telefonoConsultorio),
      direccionConsultorio: trimOrEmpty(payload.direccionConsultorio),
      descripcionProfesional: trimOrEmpty(payload.descripcionProfesional),
    };
  }

  private isEmptyOrInvalidProfileBody(raw: unknown): boolean {
    if (raw === null || raw === undefined) return true;
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      return !trimmed || trimmed === '{}' || trimmed === 'null';
    }
    if (typeof raw !== 'object' || Array.isArray(raw)) return true;

    const root = raw as Record<string, unknown>;
    if (Object.keys(root).length === 0) return true;

    const normalized = this.normalizeMiPerfil(raw);
    return !this.isValidMiPerfilResponse(normalized);
  }

  /**
   * Normaliza respuestas flat o anidadas ({ usuario, profesional }) a MiPerfilResponse.
   * Importante: en respuesta flat, `usuario` es string (username), no un objeto.
   */
  private normalizeMiPerfil(raw: unknown): MiPerfilResponse {
    const root = (raw ?? {}) as Record<string, unknown>;

    const usuarioNested = this.asRecord(root['usuario']);
    const profesionalNested = this.asRecord(root['profesional']);

    const user = usuarioNested ?? root;
    const pro = profesionalNested ?? root;

    const nombre = this.asText(user['nombre'] ?? root['nombre']);
    const apellido = this.asText(user['apellido'] ?? root['apellido']);
    const nombreCompleto =
      this.asText(
        user['nombreCompleto'] ??
        user['nombre_completo'] ??
        root['nombreCompleto'] ??
        root['nombre_completo'],
      ) || `${nombre} ${apellido}`.trim();

    const usernameFlat =
      typeof root['usuario'] === 'string' || typeof root['usuario'] === 'number'
        ? this.asText(root['usuario'])
        : '';

    return {
      idUsuario: this.normalizeNumber(
        user['idUsuario'] ?? user['id_usuario'] ?? root['idUsuario'] ?? root['id_usuario'],
      ) ?? undefined,
      nombreCompleto,
      correoElectronico: this.asText(
        user['correoElectronico'] ??
        user['email'] ??
        user['correo'] ??
        root['correoElectronico'] ??
        root['email'] ??
        root['correo'],
      ),
      usuario: this.asText(
        (usuarioNested
          ? (user['usuario'] ?? user['username'])
          : (user['usuario'] ?? user['username'] ?? usernameFlat)) ??
        root['username'],
      ),
      telefono: this.asText(
        user['telefono'] ??
        user['numero_telefono'] ??
        user['numeroTelefono'] ??
        root['telefono'] ??
        root['numero_telefono'],
      ),
      domicilio: this.asText(user['domicilio'] ?? root['domicilio']),
      especialidad: this.asText(
        user['especialidad'] ??
        pro['especialidad'] ??
        root['especialidad'],
      ),
      cedulaProfesional: this.asText(
        user['cedulaProfesional'] ??
        user['cedula_profesional'] ??
        pro['cedulaProfesional'] ??
        pro['cedula_profesional'] ??
        root['cedulaProfesional'] ??
        root['cedula_profesional'],
      ),
      nombreConsultorio: this.asText(
        pro['nombreConsultorio'] ??
        pro['nombre_consulta'] ??
        pro['nombreComercial'] ??
        pro['nombre_comercial'] ??
        root['nombreConsultorio'] ??
        root['nombre_consulta'] ??
        root['nombreComercial'],
      ),
      telefonoConsultorio: this.asText(
        pro['telefonoConsultorio'] ??
        pro['telefono_consultorio'] ??
        root['telefonoConsultorio'] ??
        root['telefono_consultorio'],
      ),
      direccionConsultorio: this.asText(
        pro['direccionConsultorio'] ??
        pro['direccion_consultorio'] ??
        root['direccionConsultorio'] ??
        root['direccion_consultorio'],
      ),
      descripcionProfesional: this.asText(
        pro['descripcionProfesional'] ??
        pro['descripcion'] ??
        root['descripcionProfesional'] ??
        root['descripcion'],
      ),
    };
  }

  private toUsuarioPerfilDto(perfil: MiPerfilResponse): UsuarioPerfilDto {
    const [nombre, apellido] = this.splitFullName(perfil.nombreCompleto);
    return {
      id_usuario: perfil.idUsuario ?? 0,
      nombre,
      apellido,
      email: perfil.correoElectronico,
      username: perfil.usuario,
      domicilio: perfil.domicilio || null,
      numero_telefono: perfil.telefono || null,
      especialidad: perfil.especialidad || null,
      cedulaProfesional: perfil.cedulaProfesional || null,
    };
  }

  private splitFullName(fullName: string): [string, string] {
    const normalized = fullName.trim().replace(/\s+/g, ' ');
    if (!normalized) return ['', ''];
    const parts = normalized.split(' ');
    const nombre = parts.shift() ?? '';
    return [nombre, parts.join(' ')];
  }

  private normalizeProfesional(raw: unknown): ProfesionalPerfilDto | null {
    const root = (raw ?? {}) as Record<string, unknown>;
    const source = this.asRecord(root['profesional']) ?? root;
    if (!source || Object.keys(source).length === 0) return null;

    return {
      id_profesional: this.normalizeNumber(source['id_profesional'] ?? source['idProfesional']),
      especialidad: this.asText(source['especialidad']) || null,
      cedula_profesional: this.asText(
        source['cedula_profesional'] ?? source['cedulaProfesional'],
      ) || null,
      nombre_consulta: this.asText(
        source['nombre_consulta'] ?? source['nombreConsultorio'] ?? source['nombreComercial'],
      ) || null,
      tipo_servicio: this.asText(source['tipo_servicio'] ?? source['tipoServicio']) || null,
      descripcion: this.asText(
        source['descripcion'] ?? source['descripcionProfesional'],
      ) || null,
      codigo_vinculacion: this.asText(
        source['codigo_vinculacion'] ?? source['codigoVinculacion'],
      ) || null,
      telefono_consultorio: this.asText(
        source['telefono_consultorio'] ?? source['telefonoConsultorio'],
      ) || null,
      direccion_consultorio: this.asText(
        source['direccion_consultorio'] ?? source['direccionConsultorio'],
      ) || null,
    };
  }

  private normalizeCodigo(raw: unknown): string | null {
    if (!raw || typeof raw !== 'object') return null;
    const source = raw as Record<string, unknown>;
    return this.asText(source['codigo_vinculacion'] ?? source['codigoVinculacion']) || null;
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }
    return value as Record<string, unknown>;
  }

  private asText(value: unknown): string {
    if (value === null || value === undefined) return '';
    const text = String(value).trim();
    if (!text || text === 'null' || text === 'undefined') return '';
    return text;
  }

  private normalizeNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
