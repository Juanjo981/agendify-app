import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { of, throwError } from 'rxjs';
import { AuthService } from 'src/app/services/auth';
import { ConfiguracionApiService } from 'src/app/services/configuracion-api.service';
import { CurrencyPreferenceService } from 'src/app/services/currency-preference.service';
import { PerfilApiService } from 'src/app/services/perfil-api.service';
import { SessionService } from 'src/app/services/session.service';
import { MiPerfilResponse } from 'src/app/shared/models/perfil.models';
import { PerfilPage } from './perfil.page.integrated';

describe('PerfilPage — Perfil profesional', () => {
  let component: PerfilPage;
  let fixture: ComponentFixture<PerfilPage>;
  let perfilApi: jasmine.SpyObj<PerfilApiService>;
  let toastCtrl: jasmine.SpyObj<ToastController>;
  let auth: { getCurrentUser: jasmine.Spy };
  let session: jasmine.SpyObj<SessionService>;

  const miPerfil: MiPerfilResponse = {
    idUsuario: 1,
    nombreCompleto: 'Juan Jose',
    correoElectronico: 'correo@ejemplo.com',
    usuario: 'juanjo',
    telefono: '3921234567',
    domicilio: 'Nevada 114',
    especialidad: 'Psicología clínica',
    cedulaProfesional: '12345678',
    nombreConsultorio: 'Consultorio Álvarez',
    telefonoConsultorio: '3927654321',
    direccionConsultorio: 'Centro, Ocotlán',
    descripcionProfesional: 'Atención psicológica para adultos',
  };

  beforeEach(async () => {
    perfilApi = jasmine.createSpyObj('PerfilApiService', [
      'obtenerMiPerfil',
      'getMiPerfil',
      'actualizarMiPerfil',
      'getProfesionalActual',
      'updateProfesionalActual',
      'changePassword',
      'isValidMiPerfilResponse',
    ]);
    perfilApi.obtenerMiPerfil.and.returnValue(of(miPerfil));
    perfilApi.actualizarMiPerfil.and.returnValue(of(miPerfil));
    perfilApi.isValidMiPerfilResponse.and.callFake((p: MiPerfilResponse | null | undefined) =>
      !!(p && (p.nombreCompleto || p.correoElectronico || p.usuario)),
    );

    const configuracionApi = jasmine.createSpyObj('ConfiguracionApiService', [
      'getAgenda',
      'getSistema',
      'getRecordatorios',
      'saveAgenda',
      'saveSistema',
      'createRecordatorio',
      'setActivoRecordatorio',
    ]);
    configuracionApi.getAgenda.and.resolveTo(null);
    configuracionApi.getSistema.and.resolveTo(null);
    configuracionApi.getRecordatorios.and.resolveTo([]);

    toastCtrl = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrl.create.and.resolveTo({ present: jasmine.createSpy('present') } as never);
    auth = { getCurrentUser: jasmine.createSpy('getCurrentUser').and.resolveTo(null) };
    session = jasmine.createSpyObj('SessionService', ['patchFromMiPerfil']);

    await TestBed.configureTestingModule({
      imports: [PerfilPage, IonicModule.forRoot(), ReactiveFormsModule],
      providers: [
        { provide: PerfilApiService, useValue: perfilApi },
        { provide: ConfiguracionApiService, useValue: configuracionApi },
        { provide: AuthService, useValue: auth },
        { provide: SessionService, useValue: session },
        { provide: ToastController, useValue: toastCtrl },
        { provide: CurrencyPreferenceService, useValue: { setCurrencyCode: () => undefined } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PerfilPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('GET carga los 4 campos profesionales', () => {
    expect(component.perfilProfesionalForm.get('nombreConsultorio')?.value).toBe('Consultorio Álvarez');
    expect(component.perfilProfesionalForm.get('telefonoConsultorio')?.value).toBe('3927654321');
    expect(component.perfilProfesionalForm.get('direccionConsultorio')?.value).toBe('Centro, Ocotlán');
    expect(component.perfilProfesionalForm.get('descripcionProfesional')?.value)
      .toBe('Atención psicológica para adultos');
  });

  it('vacíos muestran Sin registrar', () => {
    expect(component.displayValue('')).toBe('Sin registrar');
    expect(component.displayValue(null)).toBe('Sin registrar');
  });

  it('Editar conserva valores cargados', () => {
    component.toggleEditar('profesional');
    expect(component.editarProfesional).toBeTrue();
    expect(component.perfilProfesionalForm.get('nombreConsultorio')?.value).toBe('Consultorio Álvarez');
  });

  it('Guardar profesional envía un solo PUT combinado', async () => {
    const saved: MiPerfilResponse = {
      ...miPerfil,
      nombreConsultorio: 'Nueva Clínica',
      telefonoConsultorio: '111',
      direccionConsultorio: 'Otra calle',
      descripcionProfesional: 'Nueva desc',
    };
    perfilApi.actualizarMiPerfil.and.returnValue(of(saved));

    component.perfilProfesionalForm.patchValue({
      nombreConsultorio: 'Nueva Clínica',
      telefonoConsultorio: '111',
      direccionConsultorio: 'Otra calle',
      descripcionProfesional: 'Nueva desc',
    });

    await component.guardarCambios();

    expect(perfilApi.actualizarMiPerfil).toHaveBeenCalledTimes(1);
    expect(perfilApi.updateProfesionalActual).not.toHaveBeenCalled();

    const payload = perfilApi.actualizarMiPerfil.calls.mostRecent().args[0];
    expect(payload.nombreConsultorio).toBe('Nueva Clínica');
    expect(payload.telefonoConsultorio).toBe('111');
    expect(payload.direccionConsultorio).toBe('Otra calle');
    expect(payload.descripcionProfesional).toBe('Nueva desc');
    expect(payload.nombreCompleto).toBe('Juan Jose');
    expect(payload.cedulaProfesional).toBe('12345678');

    expect(component.perfilProfesionalForm.get('nombreConsultorio')?.value).toBe('Nueva Clínica');
    expect(component.getInitialProfessionalData().nombreConsultorio).toBe('Nueva Clínica');
    expect(component.editarProfesional).toBeFalse();
    expect(session.patchFromMiPerfil).toHaveBeenCalled();
  });

  it('permite limpiar un campo profesional existente', async () => {
    const saved: MiPerfilResponse = {
      ...miPerfil,
      descripcionProfesional: '',
    };
    perfilApi.actualizarMiPerfil.and.returnValue(of(saved));

    component.perfilProfesionalForm.patchValue({ descripcionProfesional: '' });
    await component.guardarCambios();

    const payload = perfilApi.actualizarMiPerfil.calls.mostRecent().args[0];
    expect(payload.descripcionProfesional).toBe('');
    expect(component.perfilProfesionalForm.get('descripcionProfesional')?.value).toBe('');
    expect(component.displayValue(component.perfilProfesionalForm.get('descripcionProfesional')?.value))
      .toBe('Sin registrar');
  });

  it('Cancelar restaura últimos datos guardados sin PUT', () => {
    component.editarProfesional = true;
    component.perfilProfesionalForm.patchValue({ nombreConsultorio: 'Temporal' });
    component.toggleEditar('profesional');

    expect(component.editarProfesional).toBeFalse();
    expect(component.perfilProfesionalForm.get('nombreConsultorio')?.value).toBe('Consultorio Álvarez');
    expect(perfilApi.actualizarMiPerfil).not.toHaveBeenCalled();
  });

  it('error conserva valores escritos y modo edición', async () => {
    component.editarProfesional = true;
    component.perfilProfesionalForm.patchValue({ nombreConsultorio: 'Borrador Clínica' });
    perfilApi.actualizarMiPerfil.and.returnValue(throwError(() => ({ status: 500 })));

    await component.guardarCambios();

    expect(component.editarProfesional).toBeTrue();
    expect(component.perfilProfesionalForm.get('nombreConsultorio')?.value).toBe('Borrador Clínica');
    const toast = toastCtrl.create.calls.mostRecent().args[0] as { message?: string; color?: string };
    expect(toast.color).toBe('danger');
    expect(toast.message).toContain('perfil profesional');
  });

  it('Información personal sigue guardando en el mismo PUT', async () => {
    const saved: MiPerfilResponse = {
      ...miPerfil,
      domicilio: 'Calle Nueva',
    };
    perfilApi.actualizarMiPerfil.and.returnValue(of(saved));

    component.informacionPersonalForm.patchValue({ domicilio: 'Calle Nueva' });
    await component.guardarCambios();

    expect(perfilApi.actualizarMiPerfil).toHaveBeenCalledTimes(1);
    const payload = perfilApi.actualizarMiPerfil.calls.mostRecent().args[0];
    expect(payload.domicilio).toBe('Calle Nueva');
    expect(payload.nombreConsultorio).toBe('Consultorio Álvarez');
  });

  it('un error de carga termina el loading', fakeAsync(() => {
    perfilApi.obtenerMiPerfil.and.returnValue(throwError(() => ({ status: 500 })));
    const errorFixture = TestBed.createComponent(PerfilPage);
    const errorComponent = errorFixture.componentInstance;
    errorFixture.detectChanges();
    tick();

    expect(errorComponent.loadingProfile).toBeFalse();
    expect(errorComponent.loadError).toBeTrue();
  }));
});
