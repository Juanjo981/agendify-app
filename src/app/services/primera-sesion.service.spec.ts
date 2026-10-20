import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from 'src/environments/environment';
import { PrimeraSesionService } from './primera-sesion.service';
import { ChecklistPrimeraSesionRequest } from '../pages/pacientes/models/primera-sesion.models';

describe('PrimeraSesionService', () => {
  let service: PrimeraSesionService;
  let http: HttpTestingController;
  const base = `${environment.apiUrl}/pacientes`;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(PrimeraSesionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('obtenerChecklist llama GET /primera-sesion', () => {
    service.obtenerChecklist(3).subscribe(res => {
      expect(res).not.toBeNull();
      if (!res) return;
      expect(res.id_paciente).toBe(3);
      expect(res.completados).toBe(0);
    });
    const req = http.expectOne(`${base}/3/primera-sesion`);
    expect(req.request.method).toBe('GET');
    req.flush({
      id: null,
      id_paciente: 3,
      consentimiento_informado: false,
      motivo_consulta: false,
      antecedentes: false,
      red_apoyo: false,
      riesgo_suicida: false,
      consumo_sustancias: false,
      violencia: false,
      enfermedades: false,
      medicacion_actual: false,
      firma_digital: false,
      nivel_inicial: 'BAJO',
      completados: 0,
      total: 10,
    });
  });

  it('obtenerChecklist acepta 204 sin body como ausencia de primera sesión', () => {
    service.obtenerChecklist(3).subscribe(res => expect(res).toBeNull());
    const req = http.expectOne(`${base}/3/primera-sesion`);
    req.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('obtenerChecklist acepta body null como ausencia de primera sesión', () => {
    service.obtenerChecklist(3).subscribe(res => expect(res).toBeNull());
    const req = http.expectOne(`${base}/3/primera-sesion`);
    req.flush(null);
  });

  it('obtenerChecklist acepta body vacío como ausencia de primera sesión', () => {
    service.obtenerChecklist(3).subscribe(res => expect(res).toBeNull());
    const req = http.expectOne(`${base}/3/primera-sesion`);
    req.flush('');
  });

  it('guardarChecklist llama PUT con payload snake_case y nivel BAJO|MEDIO|ALTO', () => {
    const body: ChecklistPrimeraSesionRequest = {
      consentimiento_informado: true,
      motivo_consulta: true,
      antecedentes: false,
      red_apoyo: false,
      riesgo_suicida: false,
      consumo_sustancias: false,
      violencia: false,
      enfermedades: false,
      medicacion_actual: false,
      firma_digital: false,
      nivel_inicial: 'MEDIO',
    };
    service.guardarChecklist(3, body).subscribe(res => {
      expect(res.completados).toBe(2);
      expect(res.nivel_inicial).toBe('MEDIO');
    });
    const req = http.expectOne(`${base}/3/primera-sesion`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    expect(req.request.body.nivel_inicial).toBe('MEDIO');
    req.flush({ ...body, id: 1, id_paciente: 3, completados: 2, total: 10 });
  });
});
