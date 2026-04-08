import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { buildQueryParams } from 'src/app/shared/utils/query-params.utils';
import { PageResponse } from 'src/app/shared/models/page.model';
import {
  ArchivoAdjuntoCreateRequest,
  ArchivoAdjuntoDownloadUrlResponse,
  ArchivoAdjuntoDto,
  ArchivoAdjuntoUploadUrlRequest,
  ArchivoAdjuntoUploadUrlResponse,
  SesionArchivoLocal,
  SesionEntidadTipo,
  getFileExtension,
} from '../pages/sesiones/models/sesion.model';

@Injectable({ providedIn: 'root' })
export class AdjuntosServiceApi {
  private readonly base = `${environment.apiUrl}/archivos-adjuntos`;

  constructor(private http: HttpClient) {}

  getByEntidad(
    entidadTipo: SesionEntidadTipo,
    entidadId: number,
    params: {
      page?: number;
      size?: number;
      activo?: boolean;
      search?: string;
      sort?: string;
    } = {}
  ): Promise<PageResponse<ArchivoAdjuntoDto>> {
    const query = buildQueryParams({
      entidadTipo,
      entidadId,
      activo: params.activo ?? true,
      search: params.search,
      page: params.page,
      size: params.size,
      sort: params.sort ?? 'created_at,desc',
    });

    return firstValueFrom(
      this.http.get<PageResponse<ArchivoAdjuntoDto>>(this.base, { params: query })
    );
  }

  getBySesionId(sesionId: number, params: { page?: number; size?: number; sort?: string } = {}): Promise<PageResponse<ArchivoAdjuntoDto>> {
    const query = buildQueryParams({
      page: params.page,
      size: params.size,
      sort: params.sort ?? 'created_at,desc',
    });

    return firstValueFrom(
      this.http.get<PageResponse<ArchivoAdjuntoDto>>(
        `${environment.apiUrl}/sesiones/${sesionId}/archivos-adjuntos`,
        { params: query }
      )
    );
  }

  getByNotaClinicaId(
    notaClinicaId: number,
    params: { page?: number; size?: number; sort?: string } = {}
  ): Promise<PageResponse<ArchivoAdjuntoDto>> {
    const query = buildQueryParams({
      page: params.page,
      size: params.size,
      sort: params.sort ?? 'created_at,desc',
    });

    return firstValueFrom(
      this.http.get<PageResponse<ArchivoAdjuntoDto>>(
        `${environment.apiUrl}/notas-clinicas/${notaClinicaId}/archivos-adjuntos`,
        { params: query }
      )
    );
  }

  async uploadToEntidad(
    entidadTipo: SesionEntidadTipo,
    entidadId: number,
    archivo: SesionArchivoLocal
  ): Promise<ArchivoAdjuntoDto> {
    const signedUrl = await this.requestUploadUrl({
      nombre_original: archivo.name,
      mime_type: archivo.type || 'application/octet-stream',
      entidad_tipo: entidadTipo,
      entidad_id: entidadId,
      tamano_bytes: archivo.size,
    });

    await this.uploadBinary(signedUrl.upload_url, archivo.file, archivo.type);

    const metadata: ArchivoAdjuntoCreateRequest = {
      entidad_tipo: entidadTipo,
      entidad_id: entidadId,
      nombre_original: archivo.name,
      nombre_storage: signedUrl.nombre_storage,
      mime_type: archivo.type || 'application/octet-stream',
      extension: getFileExtension(archivo.name),
      tamano_bytes: archivo.size,
      bucket_name: signedUrl.bucket_name,
      object_key: signedUrl.object_key,
      checksum_sha256: '',
    };

    return this.registerMetadata(metadata);
  }

  requestUploadUrl(body: ArchivoAdjuntoUploadUrlRequest): Promise<ArchivoAdjuntoUploadUrlResponse> {
    return firstValueFrom(
      this.http.post<ArchivoAdjuntoUploadUrlResponse>(`${this.base}/upload-url`, body)
    );
  }

  uploadBinary(uploadUrl: string, file: File, mimeType?: string): Promise<void> {
    return firstValueFrom(
      this.http.put(uploadUrl, file, {
        headers: new HttpHeaders({
          'Content-Type': mimeType || 'application/octet-stream',
        }),
        responseType: 'text',
      })
    ).then(() => undefined);
  }

  registerMetadata(body: ArchivoAdjuntoCreateRequest): Promise<ArchivoAdjuntoDto> {
    return firstValueFrom(this.http.post<ArchivoAdjuntoDto>(this.base, body));
  }

  getDownloadUrl(idArchivoAdjunto: number): Promise<ArchivoAdjuntoDownloadUrlResponse> {
    return firstValueFrom(
      this.http.get<ArchivoAdjuntoDownloadUrlResponse>(`${this.base}/${idArchivoAdjunto}/download-url`)
    );
  }

  delete(idArchivoAdjunto: number): Promise<ArchivoAdjuntoDto> {
    return firstValueFrom(this.http.delete<ArchivoAdjuntoDto>(`${this.base}/${idArchivoAdjunto}`));
  }
}
