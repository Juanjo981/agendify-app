import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { PerfilApiService } from './perfil-api.service';
import { ActualizarMiPerfilRequest } from '../shared/models/perfil.models';

describe('PerfilApiService', () => {
  let service: PerfilApiService;
  let httpMock: HttpTestingController;
  const meUrl = `${environment.apiUrl}/usuarios/me`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(PerfilApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('obtenerMiPerfil llama exactamente GET /usuarios/me sin ID', async () => {
    const promise = firstValueFrom(service.obtenerMiPerfil());

    const req = httpMock.expectOne(meUrl);
    expect(req.request.method).toBe('GET');
    expect(req.request.url.endsWith('/usuarios/me')).toBeTrue();

    req.flush({
      idUsuario: 1,
      nombreCompleto: 'Juan Jose',
      correoElectronico: 'a@b.com',
      usuario: 'juanjo',
      telefono: '392',
      domicilio: 'Nevada',
      especialidad: 'Psicología',
      cedulaProfesional: '012345',
      nombreConsultorio: 'Consultorio Álvarez',
      telefonoConsultorio: null,
      direccionConsultorio: undefined,
      descripcionProfesional: 'Atención adultos',
    });

    const perfil = await promise;
    expect(perfil.cedulaProfesional).toBe('012345');
    expect(perfil.nombreConsultorio).toBe('Consultorio Álvarez');
    expect(perfil.telefonoConsultorio).toBe('');
    expect(perfil.direccionConsultorio).toBe('');
    expect(perfil.descripcionProfesional).toBe('Atención adultos');
  });

  it('PUT llama exactamente /usuarios/me con payload limpio', async () => {
    const payload: ActualizarMiPerfilRequest = {
      nombreCompleto: '  Juan Jose Alvarez Martinez  ',
      correoElectronico: ' correo@ejemplo.com ',
      usuario: ' juanjo ',
      telefono: ' 3921234567 ',
      domicilio: ' Nevada 114 ',
      especialidad: ' Psicología clínica ',
      cedulaProfesional: ' 12345678 ',
    };

    const promise = firstValueFrom(service.actualizarMiPerfil(payload));

    const req = httpMock.expectOne(meUrl);
    expect(req.request.method).toBe('PUT');
    expect(req.request.url).toBe(meUrl);

    const body = req.request.body as Record<string, unknown>;
    expect(body['nombreCompleto']).toBe('Juan Jose Alvarez Martinez');
    expect(body['cedulaProfesional']).toBe('12345678');
    expect(Object.keys(body)).not.toContain('idUsuario');

    req.flush({
      idUsuario: 9,
      nombreCompleto: 'Juan Jose Alvarez Martinez',
      correoElectronico: 'correo@ejemplo.com',
      usuario: 'juanjo',
      telefono: '3921234567',
      domicilio: 'Nevada 114',
      especialidad: 'Psicología clínica',
      cedulaProfesional: '12345678',
    });

    const saved = await promise;
    expect(saved.cedulaProfesional).toBe('12345678');
    expect(saved.especialidad).toBe('Psicología clínica');
  });

  it('si PUT devuelve body vacío, hace GET de respaldo (sin segundo PUT)', async () => {
    const payload: ActualizarMiPerfilRequest = {
      nombreCompleto: 'Nuevo Nombre',
      correoElectronico: 'a@b.com',
      usuario: 'juanjo',
      telefono: '1',
      domicilio: 'X',
      especialidad: 'Y',
      cedulaProfesional: '9',
    };

    const promise = firstValueFrom(service.actualizarMiPerfil(payload));

    const putReq = httpMock.expectOne(meUrl);
    expect(putReq.request.method).toBe('PUT');
    putReq.flush({});

    const getReq = httpMock.expectOne(meUrl);
    expect(getReq.request.method).toBe('GET');
    getReq.flush({
      nombreCompleto: 'Nuevo Nombre',
      correoElectronico: 'a@b.com',
      usuario: 'juanjo',
      telefono: '1',
      domicilio: 'X',
      especialidad: 'Y',
      cedulaProfesional: '9',
    });

    const saved = await promise;
    expect(saved.nombreCompleto).toBe('Nuevo Nombre');
    expect(saved.cedulaProfesional).toBe('9');
  });

  it('normaliza respuesta anidada usuario + profesional', async () => {
    const promise = firstValueFrom(service.obtenerMiPerfil());
    const req = httpMock.expectOne(meUrl);
    req.flush({
      usuario: {
        id_usuario: 3,
        nombre: 'Ana',
        apellido: 'Pérez',
        email: 'ana@ejemplo.com',
        username: 'ana',
        numero_telefono: '111',
        domicilio: 'Calle 1',
      },
      profesional: {
        especialidad: 'Clínica',
        cedula_profesional: '00-11',
        nombre_consulta: 'Consulta Ana',
        telefono_consultorio: '222',
        direccion_consultorio: 'Centro',
        descripcion: 'Psicoterapia',
      },
    });

    const perfil = await promise;
    expect(perfil.nombreCompleto).toBe('Ana Pérez');
    expect(perfil.correoElectronico).toBe('ana@ejemplo.com');
    expect(perfil.usuario).toBe('ana');
    expect(perfil.especialidad).toBe('Clínica');
    expect(perfil.cedulaProfesional).toBe('00-11');
    expect(perfil.nombreConsultorio).toBe('Consulta Ana');
  });

  it('PUT incluye campos profesionales en el body', async () => {
    const payload: ActualizarMiPerfilRequest = {
      nombreCompleto: 'Juan',
      correoElectronico: 'a@b.com',
      usuario: 'juanjo',
      telefono: '1',
      domicilio: 'X',
      especialidad: 'Y',
      cedulaProfesional: '9',
      nombreConsultorio: 'Consultorio Álvarez',
      telefonoConsultorio: '392',
      direccionConsultorio: 'Centro',
      descripcionProfesional: 'Atención',
    };

    const promise = firstValueFrom(service.actualizarMiPerfil(payload));
    const req = httpMock.expectOne(meUrl);
    expect(req.request.method).toBe('PUT');
    const body = req.request.body as Record<string, unknown>;
    expect(body['nombreConsultorio']).toBe('Consultorio Álvarez');
    expect(body['telefonoConsultorio']).toBe('392');
    expect(body['direccionConsultorio']).toBe('Centro');
    expect(body['descripcionProfesional']).toBe('Atención');

    req.flush({
      idUsuario: 1,
      nombreCompleto: 'Juan',
      correoElectronico: 'a@b.com',
      usuario: 'juanjo',
      telefono: '1',
      domicilio: 'X',
      especialidad: 'Y',
      cedulaProfesional: '9',
      nombreConsultorio: 'Consultorio Álvarez',
      telefonoConsultorio: '392',
      direccionConsultorio: 'Centro',
      descripcionProfesional: 'Atención',
    });
    await promise;
  });
});
