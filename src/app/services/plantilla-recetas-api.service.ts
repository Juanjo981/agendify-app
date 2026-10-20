import { HttpClient, HttpErrorResponse, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { normalizeApiBaseUrl } from 'src/environments/api-url';
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
  normalizePlantillaConfig,
} from '../shared/models/plantilla-recetas.models';
import { PerfilApiService } from './perfil-api.service';
import { MiPerfilResponse } from '../shared/models/perfil.models';

@Injectable({ providedIn: 'root' })
export class PlantillaRecetasApiService {
  private readonly apiRoot = normalizeApiBaseUrl(environment.apiUrl);
  private readonly baseUrl = `${this.apiRoot}/profesionales/me/plantilla-recetas`;

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
    return normalizePlantillaConfig(raw);
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
