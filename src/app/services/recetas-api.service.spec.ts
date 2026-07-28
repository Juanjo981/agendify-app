import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { environment } from 'src/environments/environment';
import { RecetasApiService } from './recetas-api.service';
import {
  CrearRecetaRequest,
  RecetaDetalle,
  RecetaFormModel,
  RecetaResumen,
} from '../shared/models/recetas.models';
import { PageResponse } from '../shared/models/page.model';
import {
  detalleToFormModel,
  stripForbiddenRecetaPayloadFields,
  toCrearRecetaRequest,
  toActualizarRecetaRequest,
} from '../shared/utils/receta-form.adapters';
import { formatLocalDate, formatLocalTime, todayLocalDate } from '../shared/utils/local-date.utils';
import { mapRecetaApiError } from '../shared/utils/api-error.mapper';

describe('formatLocalDate / formatLocalTime', () => {
  it('formatea Date local como YYYY-MM-DD sin toISOString', () => {
    const d = new Date(2026, 6, 21, 23, 30, 0); // 21 jul local
    expect(formatLocalDate(d)).toBe('2026-07-21');
    expect(formatLocalDate(d)).not.toContain('T');
  });

  it('conserva YYYY-MM-DD de string y HH:mm', () => {
    expect(formatLocalDate('2026-07-21')).toBe('2026-07-21');
    expect(formatLocalDate('2026-07-21T15:00:00Z')).toBe('2026-07-21');
    expect(formatLocalTime('9:05')).toBe('09:05');
    expect(formatLocalTime('09:05:30')).toBe('09:05');
    expect(formatLocalTime('09:05:30', true)).toBe('09:05:30');
  });

  it('todayLocalDate usa calendario local', () => {
    expect(todayLocalDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('receta-form.adapters', () => {
  const formBase: RecetaFormModel = {
    nombre: 'Receta prueba',
    id_plantilla_receta: 3,
    fecha_emision: '2026-07-21',
    paciente_nombre: 'Juan Pérez',
    paciente_fecha_nacimiento_snapshot: '1990-01-15',
    edad_texto: '36 años',
    diagnostico: 'Gripe',
    indicaciones: 'Reposo',
    proxima_cita_fecha: '2026-08-01',
    proxima_cita_hora: '10:30',
    notas_internas: 'Privado',
    medicamentos: [
      {
        id_receta_medicamento: 9,
        nombre: 'Paracetamol',
        dosis: '500 mg',
        frecuencia: 'c/8h',
        duracion: '5 días',
        indicaciones_adicionales: 'Con comida',
        orden: 1,
      },
    ],
    configuracion_plantilla_snapshot: null,
  };

  it('toCrearRecetaRequest arma payload correcto sin id_profesional/estado/versión', () => {
    const req = toCrearRecetaRequest(formBase, 42);
    expect(req.id_paciente).toBe(42);
    expect(req.nombre).toBe('Receta prueba');
    expect(req.fecha_emision).toBe('2026-07-21');
    expect(req.proxima_cita_hora).toBe('10:30');
    expect(req.medicamentos?.[0].nombre).toBe('Paracetamol');
    expect(req.medicamentos?.[0].id_receta_medicamento).toBe(9);

    const json = JSON.stringify(req);
    expect(json).not.toContain('id_profesional');
    expect(json).not.toContain('idProfesional');
    expect(json).not.toContain('"estado"');
    expect(json).not.toContain('version_actual');
    expect(json).not.toContain('tiene_pdf');
  });

  it('toActualizarRecetaRequest no incluye id_paciente', () => {
    const req = toActualizarRecetaRequest(formBase);
    expect((req as CrearRecetaRequest).id_paciente).toBeUndefined();
    expect(req.nombre).toBe('Receta prueba');
  });

  it('detalleToFormModel convierte detalle a formulario', () => {
    const detalle = sampleDetalle();
    const form = detalleToFormModel(detalle);
    expect(form.nombre).toBe(detalle.nombre);
    expect(form.fecha_emision).toBe('2026-07-21');
    expect(form.medicamentos.length).toBe(1);
    expect(form.medicamentos[0].nombre).toBe('Ibuprofeno');
    expect(form.medicamentos[0].id_receta_medicamento).toBe(1);
  });

  it('stripForbiddenRecetaPayloadFields elimina claves prohibidas', () => {
    const cleaned = stripForbiddenRecetaPayloadFields({
      nombre: 'X',
      id_profesional: 1,
      estado: 'EMITIDA',
      version_actual: 2,
      url: 'https://signed.example/pdf',
      r2_object_key: 'a/b.pdf',
    });
    expect(cleaned.nombre).toBe('X');
    expect(cleaned.id_profesional).toBeUndefined();
    expect(cleaned.estado).toBeUndefined();
    expect(cleaned.version_actual).toBeUndefined();
    expect(cleaned.url).toBeUndefined();
    expect(cleaned.r2_object_key).toBeUndefined();
  });
});

describe('mapRecetaApiError', () => {
  it('mapea 404 RECETA_NOT_FOUND', () => {
    const err = new HttpErrorResponse({
      status: 404,
      error: { code: 'RECETA_NOT_FOUND', message: 'No encontrada' },
    });
    const mapped = mapRecetaApiError(err);
    expect(mapped.status).toBe(404);
    expect(mapped.code).toBe('RECETA_NOT_FOUND');
    expect(mapped.userMessage).toContain('No encontrada');
  });

  it('mapea 409 con mensaje de emitida', () => {
    const err = new HttpErrorResponse({
      status: 409,
      error: { code: 'CONFLICT', message: 'La receta ya está emitida' },
    });
    const mapped = mapRecetaApiError(err);
    expect(mapped.status).toBe(409);
    expect(mapped.userMessage.toLowerCase()).toContain('emitida');
  });

  it('mapea 422 con mensaje útil', () => {
    const err = new HttpErrorResponse({
      status: 422,
      error: {},
    });
    const mapped = mapRecetaApiError(err);
    expect(mapped.status).toBe(422);
    expect(mapped.userMessage).toContain('receta');
  });
});

describe('RecetasApiService', () => {
  let service: RecetasApiService;
  let httpMock: HttpTestingController;
  const base = `${environment.apiUrl}/recetas`;
  const pacientesBase = `${environment.apiUrl}/pacientes`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [RecetasApiService],
    });
    service = TestBed.inject(RecetasApiService);
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('1. crearReceta envía payload correcto', async () => {
    const request: CrearRecetaRequest = {
      id_paciente: 42,
      nombre: 'Receta A',
      fecha_emision: '2026-07-21',
      diagnostico: 'Cefalea',
      medicamentos: [{ nombre: 'Paracetamol', dosis: '500 mg', orden: 1 }],
    };

    const promise = service.crearReceta(request);
    const req = httpMock.expectOne(base);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.id_paciente).toBe(42);
    expect(req.request.body.nombre).toBe('Receta A');
    expect(req.request.body.fecha_emision).toBe('2026-07-21');
    expect(req.request.body.medicamentos[0].nombre).toBe('Paracetamol');

    req.flush(sampleDetalle(), { status: 201, statusText: 'Created' });
    const result = await promise;
    expect(result.id_receta).toBe(50);
  });

  it('2. no envía id_profesional al crear', async () => {
    const dirty = {
      id_paciente: 1,
      nombre: 'X',
      fecha_emision: '2026-07-21',
      diagnostico: 'Y',
      id_profesional: 99,
      idProfesional: 99,
    } as CrearRecetaRequest & { id_profesional: number; idProfesional: number };

    const promise = service.crearReceta(dirty);
    const req = httpMock.expectOne(base);
    expect(req.request.body.id_profesional).toBeUndefined();
    expect(req.request.body.idProfesional).toBeUndefined();
    expect(JSON.stringify(req.request.body)).not.toContain('id_profesional');
    expect(JSON.stringify(req.request.body)).not.toContain('idProfesional');
    req.flush(sampleDetalle(), { status: 201, statusText: 'Created' });
    await promise;
  });

  it('3. no envía estado ni versión al crear', async () => {
    const dirty = {
      id_paciente: 1,
      nombre: 'X',
      fecha_emision: '2026-07-21',
      diagnostico: 'Y',
      estado: 'EMITIDA',
      version_actual: 3,
    } as CrearRecetaRequest & { estado: string; version_actual: number };

    const promise = service.crearReceta(dirty);
    const req = httpMock.expectOne(base);
    expect(req.request.body.estado).toBeUndefined();
    expect(req.request.body.version_actual).toBeUndefined();
    req.flush(sampleDetalle(), { status: 201, statusText: 'Created' });
    await promise;
  });

  it('4. obtenerReceta consulta GET /recetas/{id}', async () => {
    const promise = service.obtenerReceta(50);
    const req = httpMock.expectOne(`${base}/50`);
    expect(req.request.method).toBe('GET');
    req.flush(sampleDetalle());
    const result = await promise;
    expect(result.id_receta).toBe(50);
  });

  it('5. listarRecetasPaciente usa page/size/estado', async () => {
    const promise = service.listarRecetasPaciente(42, {
      page: 1,
      size: 10,
      estado: 'EMITIDA',
    });
    const req = httpMock.expectOne(
      r =>
        r.url === `${pacientesBase}/42/recetas` &&
        r.params.get('page') === '1' &&
        r.params.get('size') === '10' &&
        r.params.get('estado') === 'EMITIDA',
    );
    expect(req.request.method).toBe('GET');

    const page: PageResponse<RecetaResumen> = {
      content: [
        {
          id_receta: 50,
          nombre: 'Receta A',
          id_paciente: 42,
          paciente_nombre: 'Juan',
          fecha_emision: '2026-07-21',
          diagnostico: 'Gripe',
          estado: 'EMITIDA',
          version_actual: 1,
          tiene_pdf: true,
          cantidad_medicamentos: 1,
          created_at: null,
          updated_at: null,
          id_receta_origen: null,
        },
      ],
      total_elements: 1,
      total_pages: 1,
      number: 1,
      size: 10,
      first: false,
      last: true,
      empty: false,
      number_of_elements: 1,
    };
    req.flush(page);
    const result = await promise;
    expect(result.content.length).toBe(1);
    expect(result.total_elements).toBe(1);
  });

  it('6. actualizarBorrador hace PUT', async () => {
    const promise = service.actualizarBorrador(50, {
      nombre: 'Editada',
      fecha_emision: '2026-07-22',
      diagnostico: 'Migraña',
    });
    const req = httpMock.expectOne(`${base}/50`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.nombre).toBe('Editada');
    expect(req.request.body.estado).toBeUndefined();
    req.flush({ ...sampleDetalle(), nombre: 'Editada' });
    const result = await promise;
    expect(result.nombre).toBe('Editada');
  });

  it('7. emitirReceta hace POST /emitir', async () => {
    const promise = service.emitirReceta(50);
    const req = httpMock.expectOne(`${base}/50/emitir`);
    expect(req.request.method).toBe('POST');
    req.flush({ ...sampleDetalle(), estado: 'EMITIDA', version_actual: 1, tiene_pdf: true });
    const result = await promise;
    expect(result.estado).toBe('EMITIDA');
  });

  it('8. crearNuevaVersion hace POST /versiones', async () => {
    const promise = service.crearNuevaVersion(50, {
      nombre: 'V2',
      fecha_emision: '2026-07-23',
      diagnostico: 'Control',
    });
    const req = httpMock.expectOne(`${base}/50/versiones`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.nombre).toBe('V2');
    expect(req.request.body.version_actual).toBeUndefined();
    req.flush({ ...sampleDetalle(), version_actual: 2 });
    const result = await promise;
    expect(result.version_actual).toBe(2);
  });

  it('9. guardarComoCopia hace POST /copias', async () => {
    const promise = service.guardarComoCopia(50, {
      nombre: 'Copia',
      fecha_emision: '2026-07-24',
      copiar_notas_internas: false,
    });
    const req = httpMock.expectOne(`${base}/50/copias`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.nombre).toBe('Copia');
    expect(req.request.body.copiar_notas_internas).toBe(false);
    req.flush({ ...sampleDetalle(), id_receta: 51, estado: 'BORRADOR', version_actual: 0 }, {
      status: 201,
      statusText: 'Created',
    });
    const result = await promise;
    expect(result.id_receta).toBe(51);
  });

  it('10. obtenerPdfUrl pide disposition=inline por defecto', async () => {
    const promise = service.obtenerPdfUrl(50);
    const req = httpMock.expectOne(
      r => r.url === `${base}/50/pdf-url` && r.params.get('disposition') === 'inline',
    );
    expect(req.request.method).toBe('GET');
    req.flush({
      url: 'https://r2.example/signed?X-Amz-Signature=abc',
      expires_at: '2026-07-21T12:00:00Z',
      filename: 'receta-50.pdf',
      content_type: 'application/pdf',
      disposition: 'inline',
      version: 1,
    });
    const result = await promise;
    expect(result.url).toContain('signed');
    expect(result.disposition).toBe('inline');
  });

  it('11. obtenerPdfUrl / versión con attachment', async () => {
    const promiseActual = service.obtenerPdfUrl(50, 'attachment');
    const reqActual = httpMock.expectOne(
      r => r.url === `${base}/50/pdf-url` && r.params.get('disposition') === 'attachment',
    );
    reqActual.flush({
      url: 'https://r2.example/signed-att',
      expires_at: '2026-07-21T12:00:00Z',
      filename: 'receta-50.pdf',
      content_type: 'application/pdf',
      disposition: 'attachment',
      version: 1,
    });
    expect((await promiseActual).disposition).toBe('attachment');

    const promiseVersion = service.obtenerPdfVersionUrl(50, 2, 'attachment');
    const reqVersion = httpMock.expectOne(
      r =>
        r.url === `${base}/50/versiones/2/pdf-url` &&
        r.params.get('disposition') === 'attachment',
    );
    reqVersion.flush({
      url: 'https://r2.example/signed-v2',
      expires_at: '2026-07-21T12:00:00Z',
      filename: 'receta-50-v2.pdf',
      content_type: 'application/pdf',
      disposition: 'attachment',
      version: 2,
    });
    expect((await promiseVersion).version).toBe(2);
  });

  it('12. fechas clínicas no usan toISOString en adapters', () => {
    const form: RecetaFormModel = {
      ...formFromDetalle(),
      fecha_emision: formatLocalDate(new Date(2026, 6, 21, 23, 0, 0))!,
      proxima_cita_hora: '08:15',
    };
    const req = toCrearRecetaRequest(form, 1);
    expect(req.fecha_emision).toBe('2026-07-21');
    expect(req.proxima_cita_hora).toBe('08:15');
  });

  it('13. detalle → formulario vía servicio + adapter', async () => {
    const promise = service.obtenerReceta(50);
    httpMock.expectOne(`${base}/50`).flush(sampleDetalle());
    const detalle = await promise;
    const form = detalleToFormModel(detalle);
    expect(form.paciente_nombre).toBe('Juan Pérez');
    expect(form.diagnostico).toBe('Gripe');
  });

  it('14. propaga errores 404, 409 y 422', async () => {
    const p404 = service.obtenerReceta(999);
    httpMock.expectOne(`${base}/999`).flush(
      { code: 'RECETA_NOT_FOUND', message: 'La receta no fue encontrada' },
      { status: 404, statusText: 'Not Found' },
    );
    try {
      await p404;
      fail('expected 404 reject');
    } catch (e) {
      const mapped = mapRecetaApiError(e);
      expect(mapped.status).toBe(404);
      expect(mapped.code).toBe('RECETA_NOT_FOUND');
    }

    const p409 = service.emitirReceta(50);
    httpMock.expectOne(`${base}/50/emitir`).flush(
      { code: 'CONFLICT', message: 'La receta ya está emitida' },
      { status: 409, statusText: 'Conflict' },
    );
    try {
      await p409;
      fail('expected 409 reject');
    } catch (e) {
      expect(mapRecetaApiError(e).status).toBe(409);
    }

    const p422 = service.actualizarBorrador(50, {
      nombre: 'X',
      fecha_emision: '2026-07-21',
    });
    httpMock.expectOne(`${base}/50`).flush(
      { code: 'BUSINESS_ERROR', message: 'Solo borradores' },
      { status: 422, statusText: 'Unprocessable' },
    );
    try {
      await p422;
      fail('expected 422 reject');
    } catch (e) {
      expect(mapRecetaApiError(e).status).toBe(422);
    }
  });

  it('15. no guarda URLs firmadas en almacenamiento persistente', async () => {
    const promise = service.obtenerPdfUrl(50, 'inline');
    httpMock.expectOne(r => r.url === `${base}/50/pdf-url`).flush({
      url: 'https://r2.example/signed-secret-token',
      expires_at: '2026-07-21T12:00:00Z',
      filename: 'receta.pdf',
      content_type: 'application/pdf',
      disposition: 'inline',
      version: 1,
    });
    const pdf = await promise;
    expect(pdf.url).toContain('signed');

    const ls = JSON.stringify(localStorage);
    const ss = JSON.stringify(sessionStorage);
    expect(ls).not.toContain('signed-secret-token');
    expect(ss).not.toContain('signed-secret-token');
    expect(ls).not.toContain(pdf.url);
    expect(ss).not.toContain(pdf.url);
  });
});

function sampleDetalle(): RecetaDetalle {
  return {
    id_receta: 50,
    id_profesional: 7,
    id_paciente: 42,
    id_plantilla_receta: 3,
    id_receta_origen: null,
    nombre: 'Receta A',
    fecha_emision: '2026-07-21',
    paciente_nombre: 'Juan Pérez',
    paciente_fecha_nacimiento_snapshot: '1990-01-15',
    edad_texto: '36 años',
    diagnostico: 'Gripe',
    indicaciones: 'Reposo',
    proxima_cita_fecha: '2026-08-01',
    proxima_cita_hora: '10:30:00',
    notas_internas: null,
    configuracion_plantilla_snapshot: null,
    estado: 'BORRADOR',
    version_actual: 0,
    tiene_pdf: false,
    nombre_archivo: null,
    created_at: '2026-07-21T10:00:00',
    updated_at: '2026-07-21T10:00:00',
    emitida_at: null,
    ultima_emision_at: null,
    anulada_at: null,
    eliminada_at: null,
    medicamentos: [
      {
        id_receta_medicamento: 1,
        orden: 1,
        nombre: 'Ibuprofeno',
        dosis: '400 mg',
        frecuencia: 'c/8h',
        duracion: '3 días',
        indicaciones_adicionales: null,
        created_at: null,
        updated_at: null,
      },
    ],
  };
}

function formFromDetalle(): RecetaFormModel {
  return detalleToFormModel(sampleDetalle());
}
