import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { IonicModule, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { NuevaRecetaPanelComponent } from './nueva-receta-panel.component';
import { PlantillaRecetasApiService } from 'src/app/services/plantilla-recetas-api.service';
import { RecetasApiService } from 'src/app/services/recetas-api.service';
import { createDefaultPlantillaConfig } from 'src/app/shared/models/plantilla-recetas.models';
import { RecetaDetalle } from 'src/app/shared/models/recetas.models';
import { PacienteDto } from '../../models/paciente.model';

describe('NuevaRecetaPanelComponent', () => {
  let fixture: ComponentFixture<NuevaRecetaPanelComponent>;
  let component: NuevaRecetaPanelComponent;
  let recetasApi: jasmine.SpyObj<RecetasApiService>;
  let plantillaApi: jasmine.SpyObj<PlantillaRecetasApiService>;
  let toastCtrl: jasmine.SpyObj<ToastController>;

  const paciente: PacienteDto = {
    id_paciente: 42,
    nombre: 'Juan',
    apellido: 'Pérez',
    fecha_nacimiento: '1990-01-15',
  } as PacienteDto;

  const detalleBorrador = (overrides: Partial<RecetaDetalle> = {}): RecetaDetalle => ({
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
    proxima_cita_fecha: null,
    proxima_cita_hora: null,
    notas_internas: null,
    configuracion_plantilla_snapshot: createDefaultPlantillaConfig(),
    estado: 'BORRADOR',
    version_actual: 0,
    tiene_pdf: false,
    nombre_archivo: null,
    created_at: null,
    updated_at: null,
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
    ...overrides,
  });

  beforeEach(async () => {
    recetasApi = jasmine.createSpyObj('RecetasApiService', [
      'crearReceta',
      'actualizarBorrador',
      'emitirReceta',
      'obtenerReceta',
      'crearNuevaVersion',
      'guardarComoCopia',
      'obtenerPdfUrl',
      'obtenerPdfVersionUrl',
      'listarRecetasPaciente',
    ]);
    plantillaApi = jasmine.createSpyObj('PlantillaRecetasApiService', ['obtenerVistaPrevia']);
    plantillaApi.obtenerVistaPrevia.and.resolveTo({
      configuracion: createDefaultPlantillaConfig(),
      esPredeterminada: true,
      idPlantillaReceta: 3,
      profesional: {
        nombreCompleto: 'Dra. Ana',
      },
    });

    toastCtrl = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrl.create.and.resolveTo({
      present: jasmine.createSpy('present').and.resolveTo(),
    } as never);

    await TestBed.configureTestingModule({
      imports: [NuevaRecetaPanelComponent, IonicModule.forRoot()],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: RecetasApiService, useValue: recetasApi },
        { provide: PlantillaRecetasApiService, useValue: plantillaApi },
        { provide: ToastController, useValue: toastCtrl },
        { provide: Router, useValue: { navigateByUrl: jasmine.createSpy('navigateByUrl') } },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(NuevaRecetaPanelComponent);
    component = fixture.componentInstance;
    component.paciente = paciente;
  });

  function openPanel(modo: typeof component.modo = 'CREAR', id: number | null = null): void {
    component.modo = modo;
    component.idReceta = id;
    component.abierto = true;
    fixture.detectChanges();
  }

  async function openPanelAndWait(
    modo: typeof component.modo = 'CREAR',
    id: number | null = null,
  ): Promise<void> {
    openPanel(modo, id);
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('1. crea nueva receta al guardar', async () => {
    await openPanelAndWait();
    component.contenido.diagnostico = 'Cefalea';
    component.nombreReceta = 'Receta test';
    component.contenido.fechaEmision = '2026-07-21';

    const created = detalleBorrador({ id_receta: 77, nombre: 'Receta test' });
    recetasApi.crearReceta.and.resolveTo(created);

    const emitSpy = spyOn(component.cambiosGuardados, 'emit');
    await component.guardarBorrador();

    expect(recetasApi.crearReceta).toHaveBeenCalled();
    const payload = recetasApi.crearReceta.calls.mostRecent().args[0];
    expect(payload.id_paciente).toBe(42);
    expect(payload.nombre).toBe('Receta test');
    expect((payload as { id_profesional?: number }).id_profesional).toBeUndefined();
    expect(component.idRecetaActual).toBe(77);
    expect(component.modo).toBe('EDITAR_BORRADOR');
    expect(emitSpy).toHaveBeenCalled();
  });

  it('2. Guardar receta persiste como borrador', async () => {
    await openPanelAndWait();
    component.contenido.diagnostico = 'Dx';
    component.nombreReceta = 'Borrador';
    component.contenido.fechaEmision = '2026-07-21';
    recetasApi.crearReceta.and.resolveTo(detalleBorrador());

    await component.guardarBorrador();

    expect(component.estadoActual).toBe('BORRADOR');
    expect(component.versionActual).toBe(0);
    expect(recetasApi.emitirReceta).not.toHaveBeenCalled();
  });

  it('3. actualiza el mismo borrador sin crear de nuevo', async () => {
    recetasApi.obtenerReceta.and.resolveTo(detalleBorrador());
    await openPanelAndWait('EDITAR_BORRADOR', 50);

    component.contenido.diagnostico = 'Actualizado';
    component.formDirty = true;
    recetasApi.actualizarBorrador.and.resolveTo(
      detalleBorrador({ diagnostico: 'Actualizado' }),
    );

    await component.guardarBorrador();

    expect(recetasApi.crearReceta).not.toHaveBeenCalled();
    expect(recetasApi.actualizarBorrador).toHaveBeenCalledWith(50, jasmine.any(Object));
  });

  it('4. evita doble creación mientras guarda', async () => {
    await openPanelAndWait();
    component.contenido.diagnostico = 'Dx';
    component.nombreReceta = 'X';
    component.contenido.fechaEmision = '2026-07-21';

    let resolveCreate!: (v: RecetaDetalle) => void;
    recetasApi.crearReceta.and.returnValue(
      new Promise<RecetaDetalle>(resolve => {
        resolveCreate = resolve;
      }),
    );

    const p1 = component.guardarBorrador();
    const p2 = component.guardarBorrador();
    expect(recetasApi.crearReceta).toHaveBeenCalledTimes(1);
    resolveCreate(detalleBorrador());
    await Promise.all([p1, p2]);
  });

  it('5. marca formulario inválido sin contenido clínico', async () => {
    await openPanelAndWait();
    component.nombreReceta = '';
    component.contenido.fechaEmision = '';
    component.contenido.diagnostico = '';
    component.contenido.indicaciones = '';
    component.contenido.medicamentos = [{ nombre: '', dosis: '', frecuencia: '', duracion: '' }];

    await component.guardarBorrador();

    expect(recetasApi.crearReceta).not.toHaveBeenCalled();
    expect(
      component.fieldErrors['nombre'] ||
        component.fieldErrors['contenido'] ||
        component.fieldErrors['fechaEmision'],
    ).toBeTrue();
  });

  it('6. emite borrador tras confirmación', async () => {
    recetasApi.obtenerReceta.and.resolveTo(detalleBorrador());
    await openPanelAndWait('EDITAR_BORRADOR', 50);

    component.solicitarEmitir();
    expect(component.confirmConfig?.title).toBe('Emitir receta');

    recetasApi.emitirReceta.and.resolveTo(
      detalleBorrador({ estado: 'EMITIDA', version_actual: 1, tiene_pdf: true }),
    );
    component.onConfirmDialogConfirmed();
    await fixture.whenStable();

    expect(recetasApi.emitirReceta).toHaveBeenCalledWith(50);
    expect(component.modo).toBe('VER_EMITIDA');
    expect(component.estadoActual).toBe('EMITIDA');
    expect(component.versionActual).toBe(1);
  });

  it('7. guarda cambios pendientes antes de emitir', async () => {
    recetasApi.obtenerReceta.and.resolveTo(detalleBorrador());
    await openPanelAndWait('EDITAR_BORRADOR', 50);

    component.formDirty = true;
    component.contenido.diagnostico = 'Nuevo dx';
    recetasApi.actualizarBorrador.and.resolveTo(detalleBorrador({ diagnostico: 'Nuevo dx' }));
    recetasApi.emitirReceta.and.resolveTo(
      detalleBorrador({ estado: 'EMITIDA', version_actual: 1, tiene_pdf: true }),
    );

    component.solicitarEmitir();
    component.onConfirmDialogConfirmed();
    await fixture.whenStable();

    expect(recetasApi.actualizarBorrador).toHaveBeenCalled();
    expect(recetasApi.emitirReceta).toHaveBeenCalled();
  });

  it('8. cancelar confirmación no emite', async () => {
    recetasApi.obtenerReceta.and.resolveTo(detalleBorrador());
    await openPanelAndWait('EDITAR_BORRADOR', 50);

    component.solicitarEmitir();
    component.onConfirmDialogCancelled();

    expect(recetasApi.emitirReceta).not.toHaveBeenCalled();
    expect(component.confirmConfig).toBeNull();
  });

  it('9. muestra estado visual BORRADOR / EMITIDA', async () => {
    recetasApi.obtenerReceta.and.resolveTo(detalleBorrador());
    await openPanelAndWait('EDITAR_BORRADOR', 50);
    expect(component.estadoActual).toBe('BORRADOR');
    expect(component.versionActual).toBe(0);

    recetasApi.emitirReceta.and.resolveTo(
      detalleBorrador({ estado: 'EMITIDA', version_actual: 1, tiene_pdf: true }),
    );
    component.solicitarEmitir();
    component.onConfirmDialogConfirmed();
    await fixture.whenStable();

    expect(component.estadoActual).toBe('EMITIDA');
    expect(component.versionActual).toBe(1);
    expect(component.puedeAbrirPdf).toBeTrue();
  });

  it('13. consulta detalle al abrir con id', async () => {
    recetasApi.obtenerReceta.and.resolveTo(
      detalleBorrador({ estado: 'EMITIDA', version_actual: 1, tiene_pdf: true }),
    );
    await openPanelAndWait('VER_EMITIDA', 50);

    expect(recetasApi.obtenerReceta).toHaveBeenCalledWith(50);
    expect(component.contenido.diagnostico).toBe('Gripe');
    expect(component.contenido.medicamentos[0].nombre).toBe('Ibuprofeno');
    expect(component.camposEditables).toBeFalse();
  });

  it('14. abre modo correcto según estado', async () => {
    recetasApi.obtenerReceta.and.resolveTo(detalleBorrador({ estado: 'ANULADA' }));
    await openPanelAndWait('VER_ANULADA', 50);
    expect(component.camposEditables).toBeFalse();
    expect(component.tituloPanel).toContain('anulada');
  });

  it('16. maneja errores de guardado', async () => {
    await openPanelAndWait();
    component.contenido.diagnostico = 'Dx';
    component.nombreReceta = 'X';
    component.contenido.fechaEmision = '2026-07-21';
    recetasApi.crearReceta.and.rejectWith(
      new HttpErrorResponse({
        status: 422,
        error: { code: 'BUSINESS_ERROR', message: 'No fue posible guardar la receta.' },
      }),
    );

    await component.guardarBorrador();

    expect(component.errorForm).toContain('guardar');
    expect(component.ui.guardando).toBeFalse();
  });

  it('17. conserva tabs y footer (estructura responsive)', async () => {
    await openPanelAndWait();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.nrp-tabs')).toBeTruthy();
    expect(el.querySelector('.nrp-footer')).toBeTruthy();
    expect(el.querySelector('.nrp-form-col')).toBeTruthy();
    expect(el.querySelector('.nrp-preview-col')).toBeTruthy();
  });

  it('abre PDF actual con estrategia popup-safe (inline)', async () => {
    recetasApi.obtenerReceta.and.resolveTo(
      detalleBorrador({ estado: 'EMITIDA', version_actual: 1, tiene_pdf: true }),
    );
    await openPanelAndWait('VER_EMITIDA', 50);

    const fakeWin = {
      location: { href: '' },
      close: jasmine.createSpy('close'),
      opener: {},
    };
    spyOn(window, 'open').and.returnValue(fakeWin as unknown as Window);
    recetasApi.obtenerPdfUrl.and.resolveTo({
      url: 'https://signed.example/current',
      expires_at: '2026-07-21T12:00:00Z',
      filename: 'r.pdf',
      content_type: 'application/pdf',
      disposition: 'inline',
      version: 1,
    });

    component.abrirPdfActual();
    await fixture.whenStable();

    expect(recetasApi.obtenerPdfUrl).toHaveBeenCalledWith(50, 'inline');
    expect(fakeWin.location.href).toBe('https://signed.example/current');
    expect(JSON.stringify(localStorage)).not.toContain('signed.example');
  });

  it('descarga con disposition attachment', async () => {
    recetasApi.obtenerReceta.and.resolveTo(
      detalleBorrador({ estado: 'EMITIDA', version_actual: 2, tiene_pdf: true }),
    );
    await openPanelAndWait('VER_EMITIDA', 50);

    spyOn(window, 'open').and.returnValue({
      location: { href: '' },
      close: jasmine.createSpy('close'),
      opener: null,
    } as unknown as Window);
    recetasApi.obtenerPdfUrl.and.resolveTo({
      url: 'https://signed.example/dl',
      expires_at: '2026-07-21T12:00:00Z',
      filename: 'r.pdf',
      content_type: 'application/pdf',
      disposition: 'attachment',
      version: 2,
    });

    component.descargarPdfActual();
    await fixture.whenStable();
    expect(recetasApi.obtenerPdfUrl).toHaveBeenCalledWith(50, 'attachment');
  });

  it('historial expandido y abre versión histórica', async () => {
    recetasApi.obtenerReceta.and.resolveTo(
      detalleBorrador({
        estado: 'EMITIDA',
        version_actual: 2,
        tiene_pdf: true,
        nombre_archivo: 'receta-50.pdf',
      }),
    );
    await openPanelAndWait('VER_EMITIDA', 50);

    component.toggleHistorial();
    expect(component.historialExpandido).toBeTrue();
    expect(component.historialVersiones.length).toBe(2);
    expect(component.historialVersiones[0].es_actual).toBeTrue();

    spyOn(window, 'open').and.returnValue({
      location: { href: '' },
      close: jasmine.createSpy('close'),
      opener: null,
    } as unknown as Window);
    recetasApi.obtenerPdfVersionUrl.and.resolveTo({
      url: 'https://signed.example/v1',
      expires_at: '2026-07-21T12:00:00Z',
      filename: 'r-v1.pdf',
      content_type: 'application/pdf',
      disposition: 'inline',
      version: 1,
    });

    component.abrirPdfVersion(component.historialVersiones[1]);
    await fixture.whenStable();
    expect(recetasApi.obtenerPdfVersionUrl).toHaveBeenCalledWith(50, 1, 'inline');
  });

  it('receta sin PDF muestra mensaje y no llama API', async () => {
    await openPanelAndWait();
    component.tienePdf = false;
    component.versionActual = 0;
    component.abrirPdfActual();
    await fixture.whenStable();
    expect(recetasApi.obtenerPdfUrl).not.toHaveBeenCalled();
  });

  it('editar borrador guarda sin PDF ni crearNuevaVersion', async () => {
    recetasApi.obtenerReceta.and.resolveTo(detalleBorrador());
    await openPanelAndWait('EDITAR_BORRADOR', 50);
    component.contenido.diagnostico = 'Actualizado';
    recetasApi.actualizarBorrador.and.resolveTo(
      detalleBorrador({ diagnostico: 'Actualizado' }),
    );

    await component.guardarBorrador();

    expect(recetasApi.actualizarBorrador).toHaveBeenCalled();
    expect(recetasApi.crearNuevaVersion).not.toHaveBeenCalled();
    expect(component.estadoActual).toBe('BORRADOR');
    expect(component.versionActual).toBe(0);
    expect(component.etiquetaGuardarBorrador).toBe('Guardar cambios');
  });

  it('editar emitida muestra aviso y abre diálogo de decisión', async () => {
    recetasApi.obtenerReceta.and.resolveTo(
      detalleBorrador({ estado: 'EMITIDA', version_actual: 1, tiene_pdf: true }),
    );
    await openPanelAndWait('EDITAR_EMITIDA', 50);
    fixture.detectChanges();

    expect(component.puedeGuardarEmitida).toBeTrue();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('ya fue emitida');

    component.solicitarGuardarEmitida();
    expect(component.dialogoActivo).toBe('decision_guardar');

    component.cancelarDialogo();
    expect(component.dialogoActivo).toBe('ninguno');
    expect(recetasApi.crearNuevaVersion).not.toHaveBeenCalled();
  });

  it('guardar nueva versión actualiza versionActual e historial', async () => {
    recetasApi.obtenerReceta.and.resolveTo(
      detalleBorrador({ estado: 'EMITIDA', version_actual: 1, tiene_pdf: true }),
    );
    await openPanelAndWait('EDITAR_EMITIDA', 50);

    recetasApi.crearNuevaVersion.and.resolveTo(
      detalleBorrador({
        estado: 'EMITIDA',
        version_actual: 2,
        tiene_pdf: true,
        nombre_archivo: 'receta-v2.pdf',
      }),
    );

    component.solicitarGuardarEmitida();
    component.elegirGuardarNuevaVersion();
    await fixture.whenStable();

    expect(recetasApi.actualizarBorrador).not.toHaveBeenCalled();
    expect(recetasApi.crearNuevaVersion).toHaveBeenCalledWith(50, jasmine.any(Object));
    expect(component.versionActual).toBe(2);
    expect(component.modo).toBe('VER_EMITIDA');
    expect(component.historialVersiones[0].es_actual).toBeTrue();
    expect(component.historialVersiones[0].numero_version).toBe(2);
  });

  it('maneja conflicto 409 sin sobrescribir automáticamente', async () => {
    recetasApi.obtenerReceta.and.resolveTo(
      detalleBorrador({ estado: 'EMITIDA', version_actual: 1, tiene_pdf: true }),
    );
    await openPanelAndWait('EDITAR_EMITIDA', 50);
    component.contenido.diagnostico = 'Cambio local';
    component.formDirty = true;

    recetasApi.crearNuevaVersion.and.rejectWith(
      new HttpErrorResponse({
        status: 409,
        error: {
          code: 'CONFLICT',
          message: 'La versión de la receta cambió mientras se procesaba.',
        },
      }),
    );

    await component.guardarNuevaVersion();

    expect(component.dialogoActivo).toBe('conflicto_version');
    expect(component.formularioLocalBackup).toBeTruthy();
    expect(component.contenido.diagnostico).toBe('Cambio local');
    expect(JSON.stringify(localStorage)).not.toContain('Cambio local');
  });

  it('guardar como copia exige nombre, crea borrador v0 y abre edición', async () => {
    recetasApi.obtenerReceta.and.resolveTo(
      detalleBorrador({ estado: 'EMITIDA', version_actual: 1, tiene_pdf: true, nombre: 'Original' }),
    );
    await openPanelAndWait('VER_EMITIDA', 50);

    component.abrirDialogoCopia();
    expect(component.modo).toBe('CREAR_COPIA');
    expect(component.copiaNombre).toContain('Copia de Original');

    component.copiaNombre = '   ';
    await component.confirmarCrearCopia();
    expect(recetasApi.guardarComoCopia).not.toHaveBeenCalled();
    expect(component.copiaNombreError).toContain('obligatorio');

    component.copiaNombre = 'Mi copia renombrada';
    const copia = detalleBorrador({
      id_receta: 99,
      nombre: 'Mi copia renombrada',
      estado: 'BORRADOR',
      version_actual: 0,
      tiene_pdf: false,
      id_receta_origen: 50,
    });
    recetasApi.guardarComoCopia.and.resolveTo(copia);
    recetasApi.actualizarBorrador.and.resolveTo(copia);

    const emitSpy = spyOn(component.cambiosGuardados, 'emit');
    await component.confirmarCrearCopia();

    expect(recetasApi.guardarComoCopia).toHaveBeenCalledWith(
      50,
      jasmine.objectContaining({ nombre: 'Mi copia renombrada' }),
    );
    const copyBody = recetasApi.guardarComoCopia.calls.mostRecent().args[1] as unknown as Record<string, unknown>;
    expect(copyBody['id_receta_origen']).toBeUndefined();
    expect(copyBody['estado']).toBeUndefined();
    expect(copyBody['version_actual']).toBeUndefined();
    expect(copyBody['url']).toBeUndefined();

    expect(component.idRecetaActual).toBe(99);
    expect(component.estadoActual).toBe('BORRADOR');
    expect(component.versionActual).toBe(0);
    expect(component.modo).toBe('EDITAR_BORRADOR');
    expect(emitSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({ accion: 'copiada' }),
    );
  });

  it('confirma cambios dirty al cerrar y no bloquea tabs internas', async () => {
    await openPanelAndWait();
    component.formDirty = true;
    component.cerrar();
    expect(component.dialogoActivo).toBe('descartar_cambios');
    expect(component.abierto).toBeTrue();

    component.cancelarDialogo();
    component.setVistaMovil('preview');
    expect(component.vistaMovil).toBe('preview');
    expect(component.dialogoActivo).toBe('ninguno');
  });

  it('conserva estructura responsive con overlays', async () => {
    recetasApi.obtenerReceta.and.resolveTo(
      detalleBorrador({ estado: 'EMITIDA', version_actual: 1, tiene_pdf: true }),
    );
    await openPanelAndWait('EDITAR_EMITIDA', 50);
    component.solicitarGuardarEmitida();
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.nrp-overlay')).toBeTruthy();
    expect(el.querySelector('.nrp-sheet')).toBeTruthy();
    expect(el.querySelector('.nrp-footer')).toBeTruthy();
  });
});

describe('listado recetas helpers (paciente detalle wiring)', () => {
  it('modoDesdeEstado mapea estados', async () => {
    const { modoDesdeEstado } = await import('src/app/shared/models/recetas.models');
    expect(modoDesdeEstado('BORRADOR')).toBe('EDITAR_BORRADOR');
    expect(modoDesdeEstado('EMITIDA')).toBe('VER_EMITIDA');
    expect(modoDesdeEstado('EMITIDA', true)).toBe('EDITAR_EMITIDA');
    expect(modoDesdeEstado('ANULADA')).toBe('VER_ANULADA');
  });
});
