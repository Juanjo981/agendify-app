import { HttpClientTestingModule, HttpTestingController, TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { environment } from 'src/environments/environment';
import { PerfilApiService } from './perfil-api.service';
import { PlantillaRecetasApiService } from './plantilla-recetas-api.service';
import {
  createDefaultPlantillaConfig,
  createEmptyDatosVisualizacion,
  validatePrescriptionAssetFile,
  PRESCRIPTION_ASSET_MAX_BYTES,
} from '../shared/models/plantilla-recetas.models';

describe('validatePrescriptionAssetFile', () => {
  it('solo acepta tipos permitidos', () => {
    expect(validatePrescriptionAssetFile('logo', { type: 'image/png', size: 10 }).ok).toBeTrue();
    expect(validatePrescriptionAssetFile('logo', { type: 'image/jpeg', size: 10 }).ok).toBeTrue();
    expect(validatePrescriptionAssetFile('logo', { type: 'image/webp', size: 10 }).ok).toBeTrue();
    const bad = validatePrescriptionAssetFile('logo', { type: 'image/gif', size: 10 });
    expect(bad.ok).toBeFalse();
    if (!bad.ok) {
      expect(bad.code).toBe('format');
      expect(bad.message).toContain('Formato no permitido');
    }
  });

  it('valida tamaños máximos', () => {
    const overLogo = validatePrescriptionAssetFile('logo', {
      type: 'image/png',
      size: PRESCRIPTION_ASSET_MAX_BYTES.logo + 1,
    });
    expect(overLogo.ok).toBeFalse();
    if (!overLogo.ok) expect(overLogo.code).toBe('size');

    const overSello = validatePrescriptionAssetFile('sello', {
      type: 'image/png',
      size: PRESCRIPTION_ASSET_MAX_BYTES.sello + 1,
    });
    expect(overSello.ok).toBeFalse();

    const okFirma = validatePrescriptionAssetFile('firma', {
      type: 'image/png',
      size: PRESCRIPTION_ASSET_MAX_BYTES.firma,
    });
    expect(okFirma.ok).toBeTrue();
  });
});

describe('PlantillaRecetasApiService — assets R2', () => {
  let service: PlantillaRecetasApiService;
  let httpMock: HttpTestingController;
  let perfilApi: jasmine.SpyObj<PerfilApiService>;

  const plantillaId = 12;
  const base = `${environment.apiUrl}/profesionales/me/plantilla-recetas`;
  const r2Url = 'https://bucket.r2.cloudflarestorage.com/plantillas/12/logo';

  beforeEach(() => {
    perfilApi = jasmine.createSpyObj('PerfilApiService', ['obtenerMiPerfil']);
    perfilApi.obtenerMiPerfil.and.returnValue(of({
      nombreCompleto: 'Ana',
      correoElectronico: 'a@b.com',
      usuario: 'ana',
    }));

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        PlantillaRecetasApiService,
        { provide: PerfilApiService, useValue: perfilApi },
      ],
    });
    service = TestBed.inject(PlantillaRecetasApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('PUT sanitiza datos_visualizacion vacíos', async () => {
    const config = createDefaultPlantillaConfig();
    config.datos_visualizacion.nombre = 'NO DEBE GUARDARSE';
    config.visibilidad.email = true;

    const promise = service.saveMiPlantilla(config);
    const req = httpMock.expectOne(base);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.configuracion.datos_visualizacion).toEqual(createEmptyDatosVisualizacion());
    expect(JSON.stringify(req.request.body)).not.toContain('NO DEBE GUARDARSE');

    req.flush({
      id_plantilla_receta: 1,
      es_predeterminada: false,
      configuracion: req.request.body.configuracion,
    });
    await promise;
  });

  it('solicita URL al endpoint correcto sin idProfesional ni carpeta paciente', async () => {
    const promise = service.getAssetUploadUrl(plantillaId, 'logo', {
      nombreOriginal: 'logo.png',
      mimeType: 'image/png',
      tamanoBytes: 100,
    });

    const req = httpMock.expectOne(`${base}/${plantillaId}/assets/logo/upload-url`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      nombre_original: 'logo.png',
      mime_type: 'image/png',
      tamano_bytes: 100,
    });
    expect(JSON.stringify(req.request.body)).not.toContain('idProfesional');
    expect(JSON.stringify(req.request.body)).not.toContain('id_profesional');
    expect(JSON.stringify(req.request.body)).not.toContain('pacientes');
    expect(JSON.stringify(req.request.url)).not.toContain('pacientes');

    req.flush({
      upload_url: r2Url,
      object_key: 'plantillas/12/logo-uuid.png',
      bucket_name: 'agendify',
      nombre_storage: 'logo-uuid.png',
      expiration: '2099-01-01T00:00:00Z',
    });

    const mapped = await promise;
    expect(mapped.uploadUrl).toBe(r2Url);
    expect(mapped.objectKey).toContain('plantillas/');
    expect(mapped.objectKey).not.toContain('pacientes');
  });

  it('hace PUT directo a R2 con Content-Type exacto', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'logo.png', { type: 'image/png' });
    const promise = service.putAssetToR2(r2Url, file, 'image/png');

    const req = httpMock.expectOne(r2Url);
    expect(req.request.method).toBe('PUT');
    expect(req.request.headers.get('Content-Type')).toBe('image/png');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush('', { status: 204, statusText: 'No Content' });
    await promise;
  });

  it('no envía Authorization en el PUT a R2 (headers del request de prueba)', async () => {
    const file = new File(['x'], 'a.png', { type: 'image/png' });
    const promise = service.putAssetToR2(r2Url, file, 'image/png');
    const req = httpMock.expectOne(r2Url);
    expect(req.request.headers.get('Authorization')).toBeNull();
    req.flush('ok', { status: 200, statusText: 'OK' });
    await promise;
  });

  it('registra metadata después de subir', async () => {
    const promise = service.registerAsset(plantillaId, 'sello', {
      nombreOriginal: 'sello.webp',
      mimeType: 'image/webp',
      tamanoBytes: 50,
      objectKey: 'plantillas/12/sello-uuid.webp',
      nombreStorage: 'sello-uuid.webp',
      bucketName: 'agendify',
    });

    const req = httpMock.expectOne(`${base}/${plantillaId}/assets/sello/register`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.object_key).toBe('plantillas/12/sello-uuid.webp');
    expect(req.request.body).not.toEqual(jasmine.objectContaining({ id_profesional: jasmine.anything() }));

    req.flush({
      archivo_id: 9,
      tipo: 'sello',
      nombre_original: 'sello.webp',
      mime_type: 'image/webp',
      download_url: 'https://cdn.example/sello?sig=1',
      expiration: '2099-01-01T00:00:00Z',
    });

    const asset = await promise;
    expect(asset.archivoId).toBe(9);
    expect(asset.downloadUrl).toContain('https://');
    expect(asset.tipo).toBe('sello');
  });

  it('flujo uploadAndRegister: upload-url → PUT → register', async () => {
    const file = new File([new Uint8Array([1])], 'firma.png', { type: 'image/png' });
    const uploadUrl = 'https://bucket.r2.cloudflarestorage.com/upload-firma';

    const promise = service.uploadAndRegisterAsset(plantillaId, 'firma', file);

    const urlReq = httpMock.expectOne(`${base}/${plantillaId}/assets/firma/upload-url`);
    expect(urlReq.request.method).toBe('POST');
    urlReq.flush({
      upload_url: uploadUrl,
      object_key: 'plantillas/12/firma-uuid.png',
      bucket_name: 'agendify',
      nombre_storage: 'firma-uuid.png',
      expiration: '2099-01-01T00:00:00Z',
    });

    let putReq: TestRequest | null = null;
    for (let i = 0; i < 20 && !putReq; i++) {
      await Promise.resolve();
      const matched = httpMock.match(
        (req) => req.method === 'PUT' && req.url.includes('upload-firma'),
      );
      if (matched.length === 1) {
        putReq = matched[0];
      }
    }
    expect(putReq).withContext('PUT a R2 no llegó').not.toBeNull();
    expect(putReq!.request.headers.get('Content-Type')).toBe('image/png');
    expect(putReq!.request.headers.has('Authorization')).toBeFalse();
    putReq!.flush('', { status: 200, statusText: 'OK' });

    let regReq: TestRequest | null = null;
    for (let i = 0; i < 20 && !regReq; i++) {
      await Promise.resolve();
      const matched = httpMock.match(
        (req) => req.method === 'POST' && req.url.includes('/assets/firma/register'),
      );
      if (matched.length === 1) {
        regReq = matched[0];
      }
    }
    expect(regReq).withContext('register no llegó').not.toBeNull();
    expect(regReq!.request.body.object_key).toBe('plantillas/12/firma-uuid.png');
    regReq!.flush({
      archivo_id: 3,
      tipo: 'firma',
      nombre_original: 'firma.png',
      mime_type: 'image/png',
      download_url: 'https://cdn.example/firma',
      expiration: '2099-01-01T00:00:00Z',
    });

    const result = await promise;
    expect(result.asset.archivoId).toBe(3);
    expect(result.asset.tipo).toBe('firma');
    expect(result.registerRequest.objectKey).toBe('plantillas/12/firma-uuid.png');
  });

  it('deleteAsset llama al backend (no a R2)', async () => {
    const promise = service.deleteAsset(plantillaId, 'logo');
    const req = httpMock.expectOne(`${base}/${plantillaId}/assets/logo`);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.url).not.toContain('r2.cloudflarestorage.com');
    req.flush(null);
    await promise;
  });

  it('getAssetDownloadUrl mapea camelCase', async () => {
    const promise = service.getAssetDownloadUrl(plantillaId, 'logo');
    const req = httpMock.expectOne(`${base}/${plantillaId}/assets/logo/download-url`);
    req.flush({
      archivo_id: 1,
      tipo: 'logo',
      nombre_original: 'logo.png',
      mime_type: 'image/png',
      download_url: 'https://cdn.example/logo',
      expiration: '2099-01-01T00:00:00Z',
    });
    const asset = await promise;
    expect(asset.downloadUrl).toBe('https://cdn.example/logo');
    expect(asset.archivoId).toBe(1);
    expect(asset.tipo).toBe('logo');
  });

  it('GET mapea response.logo.downloadUrl (ignora logo_url null)', async () => {
    const promise = service.getMiPlantilla();
    const req = httpMock.expectOne(base);
    req.flush({
      id_plantilla_receta: 12,
      id_profesional: 5,
      es_predeterminada: false,
      configuracion: {
        ...createDefaultPlantillaConfig(),
        identidad: {
          ...createDefaultPlantillaConfig().identidad,
          logo_url: null,
          mostrar_logo: true,
        },
      },
      logo: {
        archivoId: 6,
        tipo: 'logo',
        nombreOriginal: 'logo.png',
        mimeType: 'image/png',
        downloadUrl: 'https://r2.example/logo-dl',
        expiration: '2099-01-01T00:00:00Z',
      },
      sello: null,
      firma: null,
    });

    const plantilla = await promise;
    expect(plantilla.configuracion.identidad.logo_url).toBeNull();
    expect(plantilla.logo?.downloadUrl).toBe('https://r2.example/logo-dl');
    expect(plantilla.logo?.archivoId).toBe(6);
  });

  it('PUT sanitiza logo_url/firma_url/sello_url a null', async () => {
    const config = createDefaultPlantillaConfig();
    config.identidad.logo_url = 'https://should-not-persist';
    config.pie.firma_url = 'https://should-not-persist';
    config.pie.sello_url = 'https://should-not-persist';

    const promise = service.saveMiPlantilla(config);
    const req = httpMock.expectOne(base);
    expect(req.request.body.configuracion.identidad.logo_url).toBeNull();
    expect(req.request.body.configuracion.pie.firma_url).toBeNull();
    expect(req.request.body.configuracion.pie.sello_url).toBeNull();
    req.flush({
      id_plantilla_receta: 1,
      es_predeterminada: false,
      configuracion: req.request.body.configuracion,
      logo: null,
      sello: null,
      firma: null,
    });
    await promise;
  });
});
