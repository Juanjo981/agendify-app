import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from 'src/environments/environment';
import { PacienteResumenService } from './paciente-resumen.service';
import { PacienteResumenIndicadoresDto } from '../pages/pacientes/models/paciente-resumen.models';

describe('PacienteResumenService', () => {
  let service: PacienteResumenService;
  let http: HttpTestingController;
  const base = `${environment.apiUrl}/pacientes`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(PacienteResumenService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('obtenerIndicadores llama GET /resumen/indicadores', async () => {
    const promise = service.obtenerIndicadores(7);
    const req = http.expectOne(`${base}/7/resumen/indicadores`);
    expect(req.request.method).toBe('GET');
    req.flush({ id_paciente: 7, puntaje_general: 80 } as PacienteResumenIndicadoresDto);
    const result = await promise;
    expect(result.id_paciente).toBe(7);
    expect(result.puntaje_general).toBe(80);
  });

  it('obtenerActividad llama GET /resumen/actividad con page y size', async () => {
    const promise = service.obtenerActividad(7, 1, 20);
    const req = http.expectOne(
      r => r.url === `${base}/7/resumen/actividad` && r.params.get('page') === '1' && r.params.get('size') === '20',
    );
    expect(req.request.method).toBe('GET');
    req.flush({
      content: [{ id: 'e1', tipo: 'SESION_REGISTRADA', titulo: 'Sesión', fecha_hora: '2026-07-28T10:00:00' }],
      total_elements: 1,
      total_pages: 1,
      number: 1,
      size: 20,
      first: false,
      last: true,
      empty: false,
      number_of_elements: 1,
    });
    const page = await promise;
    expect(page.content.length).toBe(1);
    expect(page.last).toBeTrue();
  });
});
