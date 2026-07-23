import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule, NavController, ToastController } from '@ionic/angular';
import { of } from 'rxjs';
import { PerfilApiService } from 'src/app/services/perfil-api.service';
import { PlantillaRecetasApiService } from 'src/app/services/plantilla-recetas-api.service';
import {
  createDefaultPlantillaConfig,
  createEmptyDatosVisualizacion,
} from 'src/app/shared/models/plantilla-recetas.models';
import { PlantillaRecetasPage } from './plantilla-recetas.page';

describe('PlantillaRecetasPage — datos desde Mi perfil', () => {
  let component: PlantillaRecetasPage;
  let fixture: ComponentFixture<PlantillaRecetasPage>;
  let plantillaApi: jasmine.SpyObj<PlantillaRecetasApiService>;
  let perfilApi: jasmine.SpyObj<PerfilApiService>;
  let navCtrl: jasmine.SpyObj<NavController>;

  const miPerfil = {
    idUsuario: 1,
    nombreCompleto: 'Juan Jose Alvarez',
    correoElectronico: 'juan@ejemplo.com',
    usuario: 'juanjo',
    telefono: '3921234567',
    domicilio: 'Nevada',
    especialidad: 'Psicología clínica',
    cedulaProfesional: '12345678',
    nombreConsultorio: 'Consultorio Álvarez',
    telefonoConsultorio: '3927654321',
    direccionConsultorio: 'Centro',
  };

  beforeEach(async () => {
    plantillaApi = jasmine.createSpyObj('PlantillaRecetasApiService', [
      'getMiPlantilla',
      'saveMiPlantilla',
      'resetMiPlantilla',
      'obtenerVistaPrevia',
      'mapPerfilToProfessional',
      'getAssetUploadUrl',
      'putAssetToR2',
      'registerAsset',
      'deleteAsset',
      'getAssetDownloadUrl',
    ]);
    plantillaApi.getMiPlantilla.and.resolveTo({
      id_plantilla_receta: 1,
      id_profesional: 1,
      es_predeterminada: false,
      configuracion: createDefaultPlantillaConfig(),
    });
    plantillaApi.mapPerfilToProfessional.and.callFake((p: typeof miPerfil) => ({
      nombreCompleto: p.nombreCompleto,
      especialidad: p.especialidad,
      cedulaProfesional: p.cedulaProfesional,
      correoElectronico: p.correoElectronico,
      telefono: p.telefono,
      nombreConsultorio: p.nombreConsultorio,
      telefonoConsultorio: p.telefonoConsultorio,
      direccionConsultorio: p.direccionConsultorio,
    }));
    plantillaApi.saveMiPlantilla.and.callFake(async (config) => ({
      id_plantilla_receta: 1,
      id_profesional: 1,
      es_predeterminada: false,
      configuracion: config,
    }));
    plantillaApi.getAssetDownloadUrl.and.rejectWith(new Error('ASSET_NOT_FOUND'));

    perfilApi = jasmine.createSpyObj('PerfilApiService', ['obtenerMiPerfil']);
    perfilApi.obtenerMiPerfil.and.returnValue(of(miPerfil));

    navCtrl = jasmine.createSpyObj('NavController', ['back', 'navigateForward']);
    const toastCtrl = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrl.create.and.resolveTo({ present: jasmine.createSpy('present') } as never);

    await TestBed.configureTestingModule({
      imports: [PlantillaRecetasPage, IonicModule.forRoot()],
      providers: [
        { provide: PlantillaRecetasApiService, useValue: plantillaApi },
        { provide: PerfilApiService, useValue: perfilApi },
        { provide: NavController, useValue: navCtrl },
        { provide: ToastController, useValue: toastCtrl },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PlantillaRecetasPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('carga datos profesionales de solo lectura desde el perfil', () => {
    expect(component.datos.nombre).toBe('Juan Jose Alvarez');
    expect(component.datos.cedulaProfesional).toBe('12345678');
    expect(component.datos.especialidad).toBe('Psicología clínica');
    expect(component.datos.nombreConsultorio).toBe('Consultorio Álvarez');
  });

  it('no renderiza inputs editables de nombre/cédula/especialidad', () => {
    component.activeTab = 'datos';
    fixture.detectChanges();
    const inputs = fixture.nativeElement.querySelectorAll('.ptr-datos ion-input');
    expect(inputs.length).toBe(0);
  });

  it('muestra Sin registrar cuando falta un valor', () => {
    expect(component.displayValue('')).toBe('Sin registrar');
    expect(component.displayValue(null)).toBe('Sin registrar');
  });

  it('Completar en Mi perfil navega a /dashboard/perfil', () => {
    component.irAMiPerfil();
    expect(navCtrl.navigateForward).toHaveBeenCalledWith('/dashboard/perfil');
  });

  it('el payload de guardado no incluye datos profesionales', async () => {
    component.mostrar.email = true;
    await component.guardarPlantilla();

    expect(plantillaApi.saveMiPlantilla).toHaveBeenCalledTimes(1);
    const config = plantillaApi.saveMiPlantilla.calls.mostRecent().args[0];
    expect(config.datos_visualizacion).toEqual(createEmptyDatosVisualizacion());
    expect(config.visibilidad.email).toBeTrue();
    expect(config.visibilidad.cedula_profesional).toBeTrue();
  });

  it('los switches de visibilidad se conservan al guardar', async () => {
    component.mostrar.nombre = false;
    component.mostrar.cedulaProfesional = true;
    await component.guardarPlantilla();
    const config = plantillaApi.saveMiPlantilla.calls.mostRecent().args[0];
    expect(config.visibilidad.nombre).toBeFalse();
    expect(config.visibilidad.cedula_profesional).toBeTrue();
  });

  it('ionViewWillEnter refresca el perfil sin cache antiguo', async () => {
    component['cargaInicialHecha'] = true;
    perfilApi.obtenerMiPerfil.and.returnValue(of({
      ...miPerfil,
      cedulaProfesional: '99999999',
      especialidad: 'Nueva especialidad',
    }));

    component.ionViewWillEnter();
    await fixture.whenStable();

    expect(component.datos.cedulaProfesional).toBe('99999999');
    expect(component.datos.especialidad).toBe('Nueva especialidad');
  });

  it('preview respeta flags de visibilidad', () => {
    component.mostrar.nombre = false;
    expect(component.previewNombre).toBe('');
    component.mostrar.nombre = true;
    expect(component.previewNombre).toBe('Juan Jose Alvarez');
  });
});

describe('PlantillaRecetasPage — guardado unificado de assets', () => {
  let component: PlantillaRecetasPage;
  let fixture: ComponentFixture<PlantillaRecetasPage>;
  let plantillaApi: jasmine.SpyObj<PlantillaRecetasApiService>;
  let toastPresent: jasmine.Spy;
  let toastCreate: jasmine.Spy;

  const miPerfil = {
    nombreCompleto: 'Ana',
    correoElectronico: 'a@b.com',
    usuario: 'ana',
    especialidad: 'Clínica',
    cedulaProfesional: '1',
  };

  function makeFile(name: string, type: string, size: number): File {
    return new File([new Uint8Array(Math.max(size, 1))], name, { type });
  }

  beforeEach(async () => {
    spyOn(URL, 'createObjectURL').and.returnValue('blob:local-preview');
    spyOn(URL, 'revokeObjectURL');

    plantillaApi = jasmine.createSpyObj('PlantillaRecetasApiService', [
      'getMiPlantilla',
      'saveMiPlantilla',
      'resetMiPlantilla',
      'mapPerfilToProfessional',
      'getAssetUploadUrl',
      'putAssetToR2',
      'registerAsset',
      'deleteAsset',
      'getAssetDownloadUrl',
    ]);
    plantillaApi.getMiPlantilla.and.resolveTo({
      id_plantilla_receta: 7,
      id_profesional: 1,
      es_predeterminada: false,
      configuracion: createDefaultPlantillaConfig(),
      logo: null,
      sello: null,
      firma: null,
    });
    plantillaApi.mapPerfilToProfessional.and.returnValue({
      nombreCompleto: 'Ana',
      especialidad: 'Clínica',
      cedulaProfesional: '1',
      correoElectronico: 'a@b.com',
    });
    plantillaApi.saveMiPlantilla.and.callFake(async (config) => ({
      id_plantilla_receta: 7,
      id_profesional: 1,
      es_predeterminada: false,
      configuracion: config,
      logo: null,
      sello: null,
      firma: null,
    }));

    const perfilApi = jasmine.createSpyObj('PerfilApiService', ['obtenerMiPerfil']);
    perfilApi.obtenerMiPerfil.and.returnValue(of(miPerfil));

    toastPresent = jasmine.createSpy('present');
    toastCreate = jasmine.createSpy('create').and.resolveTo({ present: toastPresent } as never);
    const toastCtrl = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrl.create = toastCreate;

    await TestBed.configureTestingModule({
      imports: [PlantillaRecetasPage, IonicModule.forRoot()],
      providers: [
        { provide: PlantillaRecetasApiService, useValue: plantillaApi },
        { provide: PerfilApiService, useValue: perfilApi },
        { provide: NavController, useValue: jasmine.createSpyObj('NavController', ['back', 'navigateForward']) },
        { provide: ToastController, useValue: toastCtrl },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PlantillaRecetasPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('seleccionar logo no ejecuta requests de upload', async () => {
    const file = makeFile('logo.png', 'image/png', 100);
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [file] });
    await component.onAssetFileSelected('logo', { target: input } as unknown as Event);

    expect(plantillaApi.getAssetUploadUrl).not.toHaveBeenCalled();
    expect(plantillaApi.putAssetToR2).not.toHaveBeenCalled();
    expect(plantillaApi.registerAsset).not.toHaveBeenCalled();
    expect(component.logoPreviewSrc).toBe('blob:local-preview');
    expect(component.assetStatusLabel('logo')).toBe('Cambio pendiente');
  });

  it('el botón Subir imagen ya no existe en el template', () => {
    component.activeTab = 'identidad';
    fixture.detectChanges();
    const html = fixture.nativeElement.textContent as string;
    expect(html).not.toContain('Subir imagen');
    expect(html).not.toContain('Pendiente de subir');
  });

  it('primaryAction nunca dice Subir imagen como acción de upload', async () => {
    const file = makeFile('logo.png', 'image/png', 10);
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [file] });
    await component.onAssetFileSelected('logo', { target: input } as unknown as Event);
    expect(component.primaryAssetActionLabel('logo')).toBe('Cambiar imagen');
  });

  it('Guardar con pendingFile: upload-url → PUT → register → config → GET', async () => {
    const file = makeFile('logo.png', 'image/png', 20);
    component.logoState.pendingFile = file;
    component.logoState.localPreviewUrl = 'blob:local-preview';
    component.logoState.state = 'selected';
    component.idPlantillaReceta = 7;

    plantillaApi.getAssetUploadUrl.and.resolveTo({
      uploadUrl: 'https://r2/u',
      objectKey: 'k',
      bucketName: 'b',
      nombreStorage: 'n',
      expiration: '2099-01-01T00:00:00Z',
    });
    plantillaApi.putAssetToR2.and.resolveTo();
    plantillaApi.registerAsset.and.resolveTo({
      archivoId: 5,
      tipo: 'logo',
      nombreOriginal: 'logo.png',
      mimeType: 'image/png',
      downloadUrl: 'https://cdn/new-logo',
      expiration: '2099-01-01T00:00:00Z',
    });
    plantillaApi.getMiPlantilla.and.resolveTo({
      id_plantilla_receta: 7,
      id_profesional: 1,
      es_predeterminada: false,
      configuracion: createDefaultPlantillaConfig(),
      logo: {
        archivoId: 5,
        tipo: 'logo',
        nombreOriginal: 'logo.png',
        mimeType: 'image/png',
        downloadUrl: 'https://cdn/new-logo',
        expiration: '2099-01-01T00:00:00Z',
      },
    });

    toastCreate.calls.reset();
    await component.guardarPlantilla();

    expect(plantillaApi.getAssetUploadUrl).toHaveBeenCalledWith(7, 'logo', jasmine.any(Object));
    expect(plantillaApi.putAssetToR2).toHaveBeenCalled();
    expect(plantillaApi.registerAsset).toHaveBeenCalled();
    expect(plantillaApi.saveMiPlantilla).toHaveBeenCalled();
    expect(plantillaApi.getMiPlantilla).toHaveBeenCalled();
    expect(component.logoState.pendingFile).toBeNull();
    expect(component.logoPreviewSrc).toBe('https://cdn/new-logo');

    const successCall = toastCreate.calls.allArgs().find(
      (args: unknown[]) => (args[0] as { color?: string; message?: string })?.color === 'success',
    );
    expect(successCall).toBeTruthy();
    expect((successCall![0] as { message: string }).message).toContain('Plantilla guardada');
  });

  it('no muestra éxito si register falla; mantiene pendingFile', async () => {
    const file = makeFile('logo.png', 'image/png', 10);
    component.logoState.pendingFile = file;
    component.logoState.state = 'selected';
    component.idPlantillaReceta = 7;

    plantillaApi.getAssetUploadUrl.and.resolveTo({
      uploadUrl: 'https://r2/u',
      objectKey: 'k',
      bucketName: 'b',
      nombreStorage: 'n',
      expiration: '2099-01-01T00:00:00Z',
    });
    plantillaApi.putAssetToR2.and.resolveTo();
    plantillaApi.registerAsset.and.rejectWith(new Error('REGISTER_FAILED'));
    plantillaApi.saveMiPlantilla.calls.reset();
    toastCreate.calls.reset();

    await component.guardarPlantilla();

    expect(plantillaApi.saveMiPlantilla).not.toHaveBeenCalled();
    expect(component.logoState.pendingFile).toBe(file);
    expect(component.logoState.pendingRegister).not.toBeNull();
    const successCall = toastCreate.calls.allArgs().find(
      (args: unknown[]) => (args[0] as { color?: string })?.color === 'success',
    );
    expect(successCall).toBeUndefined();
  });

  it('eliminar pendiente solo ejecuta DELETE al guardar', async () => {
    component.idPlantillaReceta = 7;
    component.logoState.current = {
      archivoId: 1,
      tipo: 'logo',
      nombreOriginal: 'logo.png',
      mimeType: 'image/png',
      downloadUrl: 'https://cdn/old',
      expiration: '2099-01-01T00:00:00Z',
    };
    component['marcarEliminacionAsset']('logo');
    expect(component.logoState.removeRequested).toBeTrue();
    expect(component.logoPreviewSrc).toBeNull();
    expect(plantillaApi.deleteAsset).not.toHaveBeenCalled();

    plantillaApi.deleteAsset.and.resolveTo();
    plantillaApi.getMiPlantilla.and.resolveTo({
      id_plantilla_receta: 7,
      id_profesional: 1,
      es_predeterminada: false,
      configuracion: createDefaultPlantillaConfig(),
      logo: null,
    });

    await component.guardarPlantilla();
    expect(plantillaApi.deleteAsset).toHaveBeenCalledWith(7, 'logo');
    expect(component.logoState.current).toBeNull();
  });

  it('cancelar selección no sube nada', async () => {
    const file = makeFile('logo.png', 'image/png', 10);
    component.logoState.current = {
      archivoId: 1,
      tipo: 'logo',
      nombreOriginal: 'old.png',
      mimeType: 'image/png',
      downloadUrl: 'https://cdn/saved',
      expiration: '2099-01-01T00:00:00Z',
    };
    component.logoState.pendingFile = file;
    component.logoState.localPreviewUrl = 'blob:pending';
    component.cancelarAssetChanges('logo');

    expect(component.logoPreviewSrc).toBe('https://cdn/saved');
    expect(plantillaApi.getAssetUploadUrl).not.toHaveBeenCalled();
    expect(plantillaApi.deleteAsset).not.toHaveBeenCalled();
  });

  it('el switch Mostrar no elimina el asset', () => {
    component.logoState.current = {
      archivoId: 1,
      tipo: 'logo',
      nombreOriginal: 'logo.png',
      mimeType: 'image/png',
      downloadUrl: 'https://cdn/logo',
      expiration: '2099-01-01T00:00:00Z',
    };
    component.identidad.mostrarLogo = false;
    expect(component.logoState.current?.downloadUrl).toBe('https://cdn/logo');
    expect(plantillaApi.deleteAsset).not.toHaveBeenCalled();
  });

  it('sello y firma comparten el flujo de Guardar', async () => {
    component.idPlantillaReceta = 7;
    component.selloState.pendingFile = makeFile('sello.png', 'image/png', 10);
    component.selloState.state = 'selected';
    component.firmaState.pendingFile = makeFile('firma.png', 'image/png', 10);
    component.firmaState.state = 'selected';

    plantillaApi.getAssetUploadUrl.and.resolveTo({
      uploadUrl: 'https://r2/u',
      objectKey: 'k',
      bucketName: 'b',
      nombreStorage: 'n',
      expiration: '2099-01-01T00:00:00Z',
    });
    plantillaApi.putAssetToR2.and.resolveTo();
    plantillaApi.registerAsset.and.callFake(async (_id, tipo) => ({
      archivoId: tipo === 'sello' ? 2 : 3,
      tipo,
      nombreOriginal: `${tipo}.png`,
      mimeType: 'image/png',
      downloadUrl: `https://cdn/${tipo}`,
      expiration: '2099-01-01T00:00:00Z',
    }));
    plantillaApi.getMiPlantilla.and.resolveTo({
      id_plantilla_receta: 7,
      id_profesional: 1,
      es_predeterminada: false,
      configuracion: createDefaultPlantillaConfig(),
      sello: {
        archivoId: 2,
        tipo: 'sello',
        nombreOriginal: 'sello.png',
        mimeType: 'image/png',
        downloadUrl: 'https://cdn/sello',
        expiration: '2099-01-01T00:00:00Z',
      },
      firma: {
        archivoId: 3,
        tipo: 'firma',
        nombreOriginal: 'firma.png',
        mimeType: 'image/png',
        downloadUrl: 'https://cdn/firma',
        expiration: '2099-01-01T00:00:00Z',
      },
    });

    await component.guardarPlantilla();
    expect(plantillaApi.registerAsset).toHaveBeenCalledTimes(2);
    expect(component.selloPreviewSrc).toBe('https://cdn/sello');
    expect(component.firmaPreviewSrc).toBe('https://cdn/firma');
  });

  it('respuesta con logo llena logoState aunque logo_url sea null', async () => {
    const config = createDefaultPlantillaConfig();
    config.identidad.logo_url = null;
    plantillaApi.getMiPlantilla.and.resolveTo({
      id_plantilla_receta: 7,
      id_profesional: 1,
      es_predeterminada: false,
      configuracion: config,
      logo: {
        archivoId: 6,
        tipo: 'logo',
        nombreOriginal: 'logo.png',
        mimeType: 'image/png',
        downloadUrl: 'https://cdn/from-asset',
        expiration: '2099-01-01T00:00:00Z',
      },
    });
    await component['cargarInicial']();
    expect(component.logoPreviewSrc).toBe('https://cdn/from-asset');
  });

  it('no se guarda downloadUrl en configuracion', async () => {
    component.logoState.current = {
      archivoId: 6,
      tipo: 'logo',
      nombreOriginal: 'logo.png',
      mimeType: 'image/png',
      downloadUrl: 'https://cdn/signed?sig=1',
      expiration: '2099-01-01T00:00:00Z',
    };
    await component.guardarPlantilla();
    const config = plantillaApi.saveMiPlantilla.calls.mostRecent().args[0];
    expect(config.identidad.logo_url).toBeNull();
  });
});
