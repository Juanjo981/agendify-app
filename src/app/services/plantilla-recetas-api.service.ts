import { HttpClient, HttpErrorResponse, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  AssetRegisterRequest,
  AssetUploadUrlRequest,
  AssetUploadUrlResponse,
  PlantillaRecetaAsset,
  PlantillaRecetasConfigDto,
  PlantillaRecetasDto,
  PlantillaRecetasUpsertRequest,
  PrescriptionAsset,
  PrescriptionAssetType,
  PrescriptionProfessionalData,
  PrescriptionTemplatePreview,
  createDefaultPlantillaConfig,
  createEmptyDatosVisualizacion,
  mergeProfesionalIntoConfig,
} from '../shared/models/plantilla-recetas.models';
import { PerfilApiService } from './perfil-api.service';
import { MiPerfilResponse } from '../shared/models/perfil.models';

@Injectable({ providedIn: 'root' })
export class PlantillaRecetasApiService {
  private readonly baseUrl = `${environment.apiUrl}/profesionales/me/plantilla-recetas`;

  constructor(
    private http: HttpClient,
    private perfilApi: PerfilApiService,
  ) {}

  /**
   * Obtiene la plantilla del profesional autenticado.
   * Si el backend responde 404, retorna plantilla predeterminada (empty/default).
   */
  async getMiPlantilla(): Promise<PlantillaRecetasDto> {
    try {
      const raw = await firstValueFrom(this.http.get<unknown>(this.baseUrl));
      return this.normalizePlantilla(raw, false);
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 404) {
        return this.buildDefaultPlantilla();
      }
      throw error;
    }
  }

  async saveMiPlantilla(configuracion: PlantillaRecetasConfigDto): Promise<PlantillaRecetasDto> {
    const body: PlantillaRecetasUpsertRequest = {
      configuracion: this.sanitizeConfig(configuracion),
    };
    const raw = await firstValueFrom(this.http.put<unknown>(this.baseUrl, body));
    return this.normalizePlantilla(raw, false);
  }

  /**
   * Vista previa = configuración visual + datos actuales de Mi perfil.
   * No usa overrides guardados en la plantilla.
   */
  async obtenerVistaPrevia(): Promise<PrescriptionTemplatePreview> {
    const [plantilla, perfil] = await Promise.all([
      this.getMiPlantilla(),
      firstValueFrom(this.perfilApi.obtenerMiPerfil()),
    ]);
    const profesional = this.mapPerfilToProfessional(perfil);
    const configuracion = mergeProfesionalIntoConfig(plantilla.configuracion, profesional);
    // Solo para render en cliente: URLs firmadas temporales (nunca persistir).
    if (plantilla.logo?.downloadUrl) {
      configuracion.identidad.logo_url = plantilla.logo.downloadUrl;
    }
    if (plantilla.firma?.downloadUrl) {
      configuracion.pie.firma_url = plantilla.firma.downloadUrl;
    }
    if (plantilla.sello?.downloadUrl) {
      configuracion.pie.sello_url = plantilla.sello.downloadUrl;
    }
    return {
      profesional,
      configuracion,
      esPredeterminada: plantilla.es_predeterminada,
      idPlantillaReceta: plantilla.id_plantilla_receta,
      logo: plantilla.logo ?? null,
      sello: plantilla.sello ?? null,
      firma: plantilla.firma ?? null,
    };
  }

  mapPerfilToProfessional(perfil: MiPerfilResponse): PrescriptionProfessionalData {
    return {
      nombreCompleto: perfil.nombreCompleto ?? '',
      especialidad: perfil.especialidad ?? '',
      cedulaProfesional: perfil.cedulaProfesional ?? '',
      correoElectronico: perfil.correoElectronico ?? '',
      telefono: perfil.telefono ?? '',
      nombreConsultorio: perfil.nombreConsultorio ?? '',
      telefonoConsultorio: perfil.telefonoConsultorio ?? '',
      direccionConsultorio: perfil.direccionConsultorio ?? '',
      descripcionProfesional: perfil.descripcionProfesional ?? '',
    };
  }

  /** Elimina la plantilla personalizada y vuelve a la predeterminada. */
  async resetMiPlantilla(): Promise<PlantillaRecetasDto> {
    try {
      const raw = await firstValueFrom(this.http.delete<unknown>(this.baseUrl));
      if (raw) {
        return this.normalizePlantilla(raw, true);
      }
    } catch (error) {
      if (!(error instanceof HttpErrorResponse && error.status === 404)) {
        throw error;
      }
    }
    return this.buildDefaultPlantilla();
  }

  /**
   * Solicita URL prefirmada para subir un asset a R2.
   * El backend decide object_key / ruta final. No enviar idProfesional.
   */
  async getAssetUploadUrl(
    plantillaId: number,
    tipo: PrescriptionAssetType,
    request: AssetUploadUrlRequest,
  ): Promise<AssetUploadUrlResponse> {
    const body = {
      nombre_original: request.nombreOriginal,
      mime_type: request.mimeType,
      tamano_bytes: request.tamanoBytes,
    };
    const raw = await firstValueFrom(
      this.http.post<Record<string, unknown>>(this.assetEndpoint(plantillaId, tipo, 'upload-url'), body),
    );
    const mapped = this.mapUploadUrlResponse(raw);
    if (!mapped.uploadUrl) {
      throw new Error('UPLOAD_URL_UNAVAILABLE');
    }
    return mapped;
  }

  /**
   * PUT binario directo a R2. No debe llevar Authorization (interceptor lo excluye).
   */
  async putAssetToR2(uploadUrl: string, file: File, contentType: string): Promise<void> {
    let response: HttpResponse<string>;
    try {
      response = await firstValueFrom(
        this.http.put(uploadUrl, file, {
          headers: new HttpHeaders({ 'Content-Type': contentType }),
          observe: 'response',
          responseType: 'text',
        }),
      );
    } catch {
      throw new Error('R2_UPLOAD_FAILED');
    }
    if (response.status !== 200 && response.status !== 204) {
      throw new Error('R2_UPLOAD_FAILED');
    }
  }

  /**
   * Registra metadata del asset tras un PUT exitoso a R2.
   * Si esto falla después del PUT, puede quedar un objeto huérfano en R2.
   */
  async registerAsset(
    plantillaId: number,
    tipo: PrescriptionAssetType,
    request: AssetRegisterRequest,
  ): Promise<PlantillaRecetaAsset> {
    const body = {
      nombre_original: request.nombreOriginal,
      mime_type: request.mimeType,
      tamano_bytes: request.tamanoBytes,
      object_key: request.objectKey,
      nombre_storage: request.nombreStorage,
      bucket_name: request.bucketName,
    };
    try {
      const raw = await firstValueFrom(
        this.http.post<Record<string, unknown>>(this.assetEndpoint(plantillaId, tipo, 'register'), body),
      );
      const asset = this.mapPlantillaAsset(raw, tipo);
      if (!asset) {
        throw new Error('REGISTER_FAILED');
      }
      return asset;
    } catch (error) {
      if (error instanceof Error && error.message === 'REGISTER_FAILED') {
        throw error;
      }
      if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
        throw new Error('SESSION_EXPIRED');
      }
      throw new Error('REGISTER_FAILED');
    }
  }

  async deleteAsset(plantillaId: number, tipo: PrescriptionAssetType): Promise<void> {
    try {
      await firstValueFrom(this.http.delete(this.assetBase(plantillaId, tipo)));
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 404) {
        throw new Error('ASSET_NOT_FOUND');
      }
      if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
        throw new Error('SESSION_EXPIRED');
      }
      throw error;
    }
  }

  async getAssetDownloadUrl(
    plantillaId: number,
    tipo: PrescriptionAssetType,
  ): Promise<PlantillaRecetaAsset> {
    try {
      const raw = await firstValueFrom(
        this.http.get<Record<string, unknown>>(this.assetEndpoint(plantillaId, tipo, 'download-url')),
      );
      const asset = this.mapPlantillaAsset(raw, tipo);
      if (!asset) {
        throw new Error('ASSET_NOT_FOUND');
      }
      return asset;
    } catch (error) {
      if (error instanceof Error && error.message === 'ASSET_NOT_FOUND') {
        throw error;
      }
      if (error instanceof HttpErrorResponse && error.status === 404) {
        throw new Error('ASSET_NOT_FOUND');
      }
      if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
        throw new Error('SESSION_EXPIRED');
      }
      throw error;
    }
  }

  /**
   * Flujo completo: upload-url → PUT R2 → register.
   * No construye object_key; no usa carpeta de paciente; no envía idProfesional.
   */
  async uploadAndRegisterAsset(
    plantillaId: number,
    tipo: PrescriptionAssetType,
    file: File,
  ): Promise<{ asset: PlantillaRecetaAsset; registerRequest: AssetRegisterRequest }> {
    const upload = await this.getAssetUploadUrl(plantillaId, tipo, {
      nombreOriginal: file.name,
      mimeType: file.type || 'application/octet-stream',
      tamanoBytes: file.size,
    });

    await this.putAssetToR2(upload.uploadUrl, file, file.type || 'application/octet-stream');

    const registerRequest: AssetRegisterRequest = {
      nombreOriginal: file.name,
      mimeType: file.type || 'application/octet-stream',
      tamanoBytes: file.size,
      objectKey: upload.objectKey,
      nombreStorage: upload.nombreStorage,
      bucketName: upload.bucketName,
    };

    const asset = await this.registerAsset(plantillaId, tipo, registerRequest);
    return { asset, registerRequest };
  }

  private assetBase(plantillaId: number, tipo: PrescriptionAssetType): string {
    return `${this.baseUrl}/${plantillaId}/assets/${tipo}`;
  }

  private assetEndpoint(
    plantillaId: number,
    tipo: PrescriptionAssetType,
    action: 'upload-url' | 'register' | 'download-url',
  ): string {
    return `${this.assetBase(plantillaId, tipo)}/${action}`;
  }

  private mapUploadUrlResponse(raw: Record<string, unknown> | null | undefined): AssetUploadUrlResponse {
    const source = raw ?? {};
    return {
      uploadUrl: this.asString(source['uploadUrl'] ?? source['upload_url']),
      objectKey: this.asString(source['objectKey'] ?? source['object_key']),
      bucketName: this.asString(source['bucketName'] ?? source['bucket_name']),
      nombreStorage: this.asString(source['nombreStorage'] ?? source['nombre_storage']),
      expiration: this.asString(source['expiration'] ?? source['expires_at'] ?? source['expiresAt']),
    };
  }

  private mapPlantillaAsset(
    raw: unknown,
    fallbackTipo: PrescriptionAssetType,
  ): PlantillaRecetaAsset | null {
    if (!raw || typeof raw !== 'object') return null;
    const source = raw as Record<string, unknown>;
    const downloadUrl = this.asString(source['downloadUrl'] ?? source['download_url']);
    if (!downloadUrl) return null;

    const archivoId = Number(source['archivoId'] ?? source['archivo_id'] ?? source['id'] ?? 0);
    const tipoRaw = this.asString(source['tipo'] ?? fallbackTipo);
    const tipo: PrescriptionAssetType =
      tipoRaw === 'sello' || tipoRaw === 'firma' || tipoRaw === 'logo' ? tipoRaw : fallbackTipo;

    return {
      archivoId: Number.isFinite(archivoId) ? archivoId : 0,
      tipo,
      nombreOriginal: this.asString(source['nombreOriginal'] ?? source['nombre_original']),
      mimeType: this.asString(source['mimeType'] ?? source['mime_type']),
      downloadUrl,
      expiration: this.asString(source['expiration'] ?? source['expires_at'] ?? source['expiresAt']),
    };
  }

  private mapPrescriptionAsset(raw: Record<string, unknown> | null | undefined): PrescriptionAsset {
    const mapped = this.mapPlantillaAsset(raw, 'logo');
    return {
      archivoId: mapped?.archivoId ?? 0,
      nombreOriginal: mapped?.nombreOriginal ?? '',
      mimeType: mapped?.mimeType ?? '',
      downloadUrl: mapped?.downloadUrl ?? '',
      expiration: mapped?.expiration ?? '',
    };
  }

  private asString(value: unknown): string {
    if (value === null || value === undefined) return '';
    return String(value);
  }

  private buildDefaultPlantilla(): PlantillaRecetasDto {
    return {
      id_plantilla_receta: null,
      id_profesional: null,
      es_predeterminada: true,
      configuracion: createDefaultPlantillaConfig(),
      logo: null,
      sello: null,
      firma: null,
      created_at: null,
      updated_at: null,
    };
  }

  private normalizePlantilla(raw: unknown, forceDefaultFlag: boolean): PlantillaRecetasDto {
    const root = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const source = (root['plantilla'] && typeof root['plantilla'] === 'object'
      ? root['plantilla']
      : root) as Record<string, unknown>;
    const configRaw = source['configuracion'] ?? source['config'] ?? null;
    const configuracion = this.normalizeConfig(configRaw);

    return {
      id_plantilla_receta: this.normalizeNumber(source['id_plantilla_receta'] ?? source['id']),
      id_profesional: this.normalizeNumber(source['id_profesional']),
      es_predeterminada: forceDefaultFlag
        ? true
        : this.normalizeBoolean(source['es_predeterminada']) ?? !source['id_plantilla_receta'],
      configuracion,
      logo: this.mapPlantillaAsset(source['logo'], 'logo'),
      sello: this.mapPlantillaAsset(source['sello'], 'sello'),
      firma: this.mapPlantillaAsset(source['firma'], 'firma'),
      created_at: (source['created_at'] as string | null | undefined) ?? null,
      updated_at: (source['updated_at'] as string | null | undefined) ?? null,
    };
  }

  private normalizeConfig(raw: unknown): PlantillaRecetasConfigDto {
    const base = createDefaultPlantillaConfig();
    if (!raw || typeof raw !== 'object') return base;

    const data = raw as Record<string, unknown>;
    const vis = (data['visibilidad'] ?? {}) as Record<string, unknown>;
    const identidad = (data['identidad'] ?? {}) as Record<string, unknown>;
    const distribucion = (data['distribucion'] ?? {}) as Record<string, unknown>;
    const secciones = (distribucion['secciones'] ?? {}) as Record<string, unknown>;
    const etiquetas = (distribucion['etiquetas'] ?? {}) as Record<string, unknown>;
    const pie = (data['pie'] ?? {}) as Record<string, unknown>;

    return {
      version: this.normalizeNumber(data['version']) ?? base.version,
      visibilidad: {
        nombre: this.normalizeBoolean(vis['nombre']) ?? base.visibilidad.nombre,
        especialidad: this.normalizeBoolean(vis['especialidad']) ?? base.visibilidad.especialidad,
        cedula_profesional:
          this.normalizeBoolean(vis['cedula_profesional'] ?? vis['cedulaProfesional']) ??
          base.visibilidad.cedula_profesional,
        telefono_profesional:
          this.normalizeBoolean(vis['telefono_profesional'] ?? vis['telefonoProfesional']) ??
          base.visibilidad.telefono_profesional,
        email: this.normalizeBoolean(vis['email']) ?? base.visibilidad.email,
        nombre_consultorio:
          this.normalizeBoolean(vis['nombre_consultorio'] ?? vis['nombreConsultorio']) ??
          base.visibilidad.nombre_consultorio,
        telefono_consultorio:
          this.normalizeBoolean(vis['telefono_consultorio'] ?? vis['telefonoConsultorio']) ??
          base.visibilidad.telefono_consultorio,
        direccion_consultorio:
          this.normalizeBoolean(vis['direccion_consultorio'] ?? vis['direccionConsultorio']) ??
          base.visibilidad.direccion_consultorio,
      },
      datos_visualizacion: createEmptyDatosVisualizacion(),
      identidad: {
        mostrar_logo:
          this.normalizeBoolean(identidad['mostrar_logo'] ?? identidad['mostrarLogo']) ??
          base.identidad.mostrar_logo,
        logo_url: this.cleanUrl(identidad['logo_url'] ?? identidad['logoUrl']),
        color_id: this.cleanText(identidad['color_id'] ?? identidad['colorId']) || base.identidad.color_id,
        encabezado: this.asOneOf(
          identidad['encabezado'],
          ['minimalista', 'franja', 'dividido'] as const,
          base.identidad.encabezado
        ),
        tipografia: this.asOneOf(
          identidad['tipografia'],
          ['moderna', 'clasica', 'compacta'] as const,
          base.identidad.tipografia
        ),
        separador: this.asOneOf(
          identidad['separador'],
          ['ninguno', 'sutil', 'color'] as const,
          base.identidad.separador
        ),
      },
      distribucion: {
        formato: this.asOneOf(
          distribucion['formato'],
          ['carta', 'media-carta'] as const,
          base.distribucion.formato
        ),
        layout: this.asOneOf(
          distribucion['layout'],
          ['clasica', 'moderna', 'compacta'] as const,
          base.distribucion.layout
        ),
        secciones: {
          fecha_emision:
            this.normalizeBoolean(secciones['fecha_emision'] ?? secciones['fechaEmision']) ??
            base.distribucion.secciones.fecha_emision,
          datos_paciente:
            this.normalizeBoolean(secciones['datos_paciente'] ?? secciones['datosPaciente']) ??
            base.distribucion.secciones.datos_paciente,
          edad_paciente:
            this.normalizeBoolean(secciones['edad_paciente'] ?? secciones['edadPaciente']) ??
            base.distribucion.secciones.edad_paciente,
          diagnostico:
            this.normalizeBoolean(secciones['diagnostico']) ?? base.distribucion.secciones.diagnostico,
          medicamentos: true,
          indicaciones: true,
          proxima_cita:
            this.normalizeBoolean(secciones['proxima_cita'] ?? secciones['proximaCita']) ??
            base.distribucion.secciones.proxima_cita,
          firma: this.normalizeBoolean(secciones['firma']) ?? base.distribucion.secciones.firma,
          sello: this.normalizeBoolean(secciones['sello']) ?? base.distribucion.secciones.sello,
          aviso_legal:
            this.normalizeBoolean(secciones['aviso_legal'] ?? secciones['avisoLegal']) ??
            base.distribucion.secciones.aviso_legal,
        },
        etiquetas: {
          paciente: this.cleanText(etiquetas['paciente']).slice(0, 40) || base.distribucion.etiquetas.paciente,
          diagnostico:
            this.cleanText(etiquetas['diagnostico']).slice(0, 40) || base.distribucion.etiquetas.diagnostico,
          medicamentos:
            this.cleanText(etiquetas['medicamentos']).slice(0, 40) || base.distribucion.etiquetas.medicamentos,
          indicaciones:
            this.cleanText(etiquetas['indicaciones']).slice(0, 40) || base.distribucion.etiquetas.indicaciones,
          proxima_cita:
            this.cleanText(etiquetas['proxima_cita'] ?? etiquetas['proximaCita']).slice(0, 40) ||
            base.distribucion.etiquetas.proxima_cita,
          firma: this.cleanText(etiquetas['firma']).slice(0, 40) || base.distribucion.etiquetas.firma,
          aviso_legal:
            this.cleanText(etiquetas['aviso_legal'] ?? etiquetas['avisoLegal']).slice(0, 40) ||
            base.distribucion.etiquetas.aviso_legal,
        },
        espaciado: this.asOneOf(
          distribucion['espaciado'],
          ['compacto', 'normal', 'amplio'] as const,
          base.distribucion.espaciado
        ),
        tamano_texto: this.asOneOf(
          distribucion['tamano_texto'] ?? distribucion['tamanoTexto'],
          ['pequeno', 'mediano', 'grande'] as const,
          base.distribucion.tamano_texto
        ),
      },
      pie: {
        firma_url: this.cleanUrl(pie['firma_url'] ?? pie['firmaUrl']),
        sello_url: this.cleanUrl(pie['sello_url'] ?? pie['selloUrl']),
        mostrar_nombre_bajo_firma:
          this.normalizeBoolean(pie['mostrar_nombre_bajo_firma'] ?? pie['mostrarNombreBajoFirma']) ??
          base.pie.mostrar_nombre_bajo_firma,
        mostrar_especialidad_bajo_firma:
          this.normalizeBoolean(pie['mostrar_especialidad_bajo_firma'] ?? pie['mostrarEspecialidadBajoFirma']) ??
          base.pie.mostrar_especialidad_bajo_firma,
        mostrar_cedula_bajo_firma:
          this.normalizeBoolean(pie['mostrar_cedula_bajo_firma'] ?? pie['mostrarCedulaBajoFirma']) ??
          base.pie.mostrar_cedula_bajo_firma,
        texto_pie: this.cleanText(pie['texto_pie'] ?? pie['textoPie']).slice(0, 180) || base.pie.texto_pie,
        mostrar_telefono:
          this.normalizeBoolean(pie['mostrar_telefono'] ?? pie['mostrarTelefono']) ?? base.pie.mostrar_telefono,
        mostrar_correo:
          this.normalizeBoolean(pie['mostrar_correo'] ?? pie['mostrarCorreo']) ?? base.pie.mostrar_correo,
        mostrar_direccion:
          this.normalizeBoolean(pie['mostrar_direccion'] ?? pie['mostrarDireccion']) ?? base.pie.mostrar_direccion,
        mostrar_numero_pagina:
          this.normalizeBoolean(pie['mostrar_numero_pagina'] ?? pie['mostrarNumeroPagina']) ??
          base.pie.mostrar_numero_pagina,
        mostrar_fecha_generacion:
          this.normalizeBoolean(pie['mostrar_fecha_generacion'] ?? pie['mostrarFechaGeneracion']) ??
          base.pie.mostrar_fecha_generacion,
      },
    };
  }

  private sanitizeConfig(config: PlantillaRecetasConfigDto): PlantillaRecetasConfigDto {
    const normalized = this.normalizeConfig(config);
    normalized.distribucion.secciones.medicamentos = true;
    normalized.distribucion.secciones.indicaciones = true;
    // Nunca persistir datos profesionales: viven en Mi perfil.
    normalized.datos_visualizacion = createEmptyDatosVisualizacion();
    // URLs firmadas viven en response.logo/sello/firma; no en configuracion.
    normalized.identidad.logo_url = null;
    normalized.pie.firma_url = null;
    normalized.pie.sello_url = null;
    return normalized;
  }

  private asOneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
    return typeof value === 'string' && (allowed as readonly string[]).includes(value)
      ? (value as T)
      : fallback;
  }

  private cleanText(value: unknown): string {
    if (value === null || value === undefined) return '';
    const text = String(value).replace(/<[^>]*>/g, '').trim();
    if (!text || text === 'null' || text === 'undefined') return '';
    return text;
  }

  private cleanUrl(value: unknown): string | null {
    const text = this.cleanText(value);
    if (!text) return null;
    if (text.startsWith('blob:')) return null;
    return text;
  }

  private normalizeNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private normalizeBoolean(value: unknown): boolean | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'boolean') return value;
    if (value === 1 || value === '1' || value === 'true') return true;
    if (value === 0 || value === '0' || value === 'false') return false;
    return Boolean(value);
  }
}
