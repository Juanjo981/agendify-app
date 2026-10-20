import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import {
  EquipoApiService,
  InvalidRecepcionistaIdError,
  isValidRecepcionistaId,
} from './equipo-api.service';

const tick = () => new Promise(resolve => setTimeout(resolve));
const PERMISOS = { agenda: true, citas: false, pacientes: false, sesiones: false, estadisticas: false, configuracion: false };

describe('EquipoApiService - permisos', () => {
  let service: EquipoApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(EquipoApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('valida IDs', () => {
    for (const bad of [0, -1, NaN, null, undefined, 1.5, '3']) {
      expect(isValidRecepcionistaId(bad)).toBeFalse();
    }
    expect(isValidRecepcionistaId(7)).toBeTrue();
  });

  it('no dispara request con id inválido', async () => {
    for (const bad of [0, -2, NaN, null as unknown as number, undefined as unknown as number]) {
      await expectAsync(service.updateRecepcionistaPermisos(bad, PERMISOS))
        .toBeRejectedWithError(InvalidRecepcionistaIdError);
    }
    http.expectNone(() => true);
  });

  it('dispara PUT con id válido y payload {permisos:[{permiso_clave,permitido}]}', async () => {
    const promise = service.updateRecepcionistaPermisos(5, PERMISOS);
    const put = http.expectOne(r => r.method === 'PUT' && r.url.endsWith('/recepcionistas/5/permisos'));
    expect(put.request.body).toEqual({
      permisos: [
        { permiso_clave: 'AGENDA', permitido: true },
        { permiso_clave: 'CITAS', permitido: false },
        { permiso_clave: 'PACIENTES', permitido: false },
        { permiso_clave: 'SESIONES', permitido: false },
        { permiso_clave: 'ESTADISTICAS', permitido: false },
        { permiso_clave: 'CONFIGURACION', permitido: false },
      ],
    });
    put.flush({});
    await tick();
    // el detalle no trae id: se conserva el ID usado en el PUT
    http.expectOne(r => r.method === 'GET' && r.url.endsWith('/recepcionistas/5'))
      .flush({ nombre: 'Ana', apellido: 'Lopez', email: 'a@a.com', activo: true, permisos: { agenda: true } });
    const result = await promise;
    expect(result.id).toBe(5);
  });

  it('alta y luego edición usa el ID devuelto por el backend', async () => {
    const listPromise = service.getRecepcionistas();
    http.expectOne(r => r.method === 'GET' && r.url.endsWith('/recepcionistas')).flush([
      { id_recepcionista: 42, nombre: 'Nuevo', apellido: 'R', email: 'n@r.com', activo: true, permisos: {} },
      { id: 0, nombre: 'Malo', apellido: 'X', email: 'x@x.com', activo: true, permisos: {} },
    ]);
    const list = await listPromise;
    expect(list.length).toBe(1);
    expect(list[0].id).toBe(42);

    const promise = service.updateRecepcionistaPermisos(list[0].id, PERMISOS);
    http.expectOne(r => r.method === 'PUT' && r.url.endsWith('/recepcionistas/42/permisos')).flush({});
    await tick();
    http.expectOne(r => r.method === 'GET' && r.url.endsWith('/recepcionistas/42'))
      .flush({ id: 42, nombre: 'Nuevo', apellido: 'R', email: 'n@r.com', activo: true, permisos: {} });
    expect((await promise).id).toBe(42);
  });
});
