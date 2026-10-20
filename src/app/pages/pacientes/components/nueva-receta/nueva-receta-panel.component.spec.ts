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

  /** La plantilla por defecto trae la sección de diagnóstico apagada. */
  const configConDiagnostico = () => {
    const config = createDefaultPlantillaConfig();
    config.distribucion.secciones.diagnostico = true;
    config.distribucion.secciones.sello = true;
    return config;
  };

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
    lock_version: 0,
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
        nombreCompleto: 'Juan José Alvarez Martinez',
        especialidad: 'Psicólogo',
        cedulaProfesional: '12345678',
        correoElectronico: 'juan@agendify.test',
        telefono: '555-0100',
        nombreConsultorio: 'Consultorio Norte',
        telefonoConsultorio: '555-0200',
        direccionConsultorio: 'Calle 1',
        descripcionProfesional: '',
      },
      logo: {
        archivoId: 1,
        tipo: 'logo',
        downloadUrl: 'https://cdn.test/logo.png',
        nombreOriginal: 'logo.png',
        mimeType: 'image/png',
        expiration: '',
      },
      firma: {
        archivoId: 2,
        tipo: 'firma',
        downloadUrl: 'https://cdn.test/firma.png',
        nombreOriginal: 'firma.png',
        mimeType: 'image/png',
        expiration: '',
      },
      sello: {
        archivoId: 3,
        tipo: 'sello',
        downloadUrl: 'https://cdn.test/sello.png',
        nombreOriginal: 'sello.png',
        mimeType: 'image/png',
        expiration: '',
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
    expect(component.confirmacionEmisionAbierta()).toBeTrue();
    fixture.detectChanges();

    const dialog = document.body.querySelector('.cfd-dialog');
    expect(dialog).toBeTruthy();
    expect(document.body.contains(dialog)).toBeTrue();

    recetasApi.emitirReceta.and.resolveTo(
      detalleBorrador({ estado: 'EMITIDA', version_actual: 1, lock_version: 0, tiene_pdf: true }),
    );
    component.onConfirmDialogConfirmed();
    await fixture.whenStable();

    expect(recetasApi.emitirReceta).toHaveBeenCalledWith(50);
    expect(recetasApi.emitirReceta).toHaveBeenCalledTimes(1);
    expect(component.modo).toBe('VER_EMITIDA');
    expect(component.estadoActual).toBe('EMITIDA');
    expect(component.versionActual).toBe(1);
    expect(component.confirmacionEmisionAbierta()).toBeFalse();
    expect(component.abierto).toBeTrue();
  });

  it('confirmación de emisión queda por encima del panel (portal a body)', async () => {
    recetasApi.obtenerReceta.and.resolveTo(detalleBorrador());
    await openPanelAndWait('EDITAR_BORRADOR', 50);

    component.solicitarEmitir();
    fixture.detectChanges();
    await fixture.whenStable();

    const confirmHost = document.body.querySelector('app-confirm-dialog');
    const backdrop = document.body.querySelector('.cfd-backdrop') as HTMLElement | null;
    const dialog = document.body.querySelector('.cfd-dialog') as HTMLElement | null;
    const panel = fixture.nativeElement.querySelector('.nrp-panel') as HTMLElement | null;

    expect(confirmHost?.parentElement).toBe(document.body);
    expect(backdrop).toBeTruthy();
    expect(dialog).toBeTruthy();
    expect(panel).toBeTruthy();
    expect(component.abierto).toBeTrue();
    // No queda atrapada dentro del panel / overflow del host de receta.
    expect(panel!.contains(backdrop!)).toBeFalse();
    expect(panel!.contains(dialog!)).toBeFalse();
  });

  it('no abre una segunda confirmación de emisión mientras la primera está abierta', async () => {
    recetasApi.obtenerReceta.and.resolveTo(detalleBorrador());
    await openPanelAndWait('EDITAR_BORRADOR', 50);

    component.solicitarEmitir();
    const firstConfig = component.confirmConfig;
    component.solicitarEmitir();
    expect(component.confirmConfig).toBe(firstConfig);
    expect(component.confirmacionEmisionAbierta()).toBeTrue();
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

  it('8. cancelar confirmación no emite y mantiene el panel abierto', async () => {
    recetasApi.obtenerReceta.and.resolveTo(detalleBorrador());
    await openPanelAndWait('EDITAR_BORRADOR', 50);
    component.contenido.diagnostico = 'Dx local';

    component.solicitarEmitir();
    expect(component.confirmacionEmisionAbierta()).toBeTrue();
    component.onConfirmDialogCancelled();

    expect(recetasApi.emitirReceta).not.toHaveBeenCalled();
    expect(component.confirmConfig).toBeNull();
    expect(component.confirmacionEmisionAbierta()).toBeFalse();
    expect(component.abierto).toBeTrue();
    expect(component.contenido.diagnostico).toBe('Dx local');
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

  async function abrirConInputs(
    modo: typeof component.modo,
    id: number | null,
  ): Promise<void> {
    fixture.componentRef.setInput('paciente', paciente);
    fixture.componentRef.setInput('modo', modo);
    fixture.componentRef.setInput('idReceta', id);
    fixture.componentRef.setInput('abierto', true);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function textoVistaPrevia(): string {
    const preview: HTMLElement = fixture.nativeElement.querySelector('.nrp-preview-col');
    return preview.textContent ?? '';
  }

  it('VER: la vista previa muestra los datos reales de la receta', async () => {
    recetasApi.obtenerReceta.and.resolveTo(
      detalleBorrador({
        estado: 'EMITIDA',
        version_actual: 1,
        tiene_pdf: true,
        configuracion_plantilla_snapshot: configConDiagnostico(),
      }),
    );

    await abrirConInputs('VER_EMITIDA', 50);

    const texto = textoVistaPrevia();
    expect(texto).toContain('Juan Pérez');
    expect(texto).toContain('36 años');
    expect(texto).toContain('21/07/2026');
    expect(texto).toContain('Gripe');
    expect(texto).toContain('Reposo');
    expect(texto).toContain('Ibuprofeno');
    expect(texto).toContain('400 mg');
    expect(texto).toContain('c/8h');
    expect(texto).toContain('3 días');
    expect(texto).not.toContain('Nombre del paciente');
    expect(texto).not.toContain('Edad del paciente');
    expect(texto).not.toContain('Fecha de emisión');
    // Layout del snapshot + identidad/recursos en vivo (como Nueva receta).
    expect(component.config.distribucion.secciones.diagnostico).toBeTrue();
    expect(component.config.datos_visualizacion.nombre).toBe('Juan José Alvarez Martinez');
    expect(component.config.identidad.logo_url).toBe('https://cdn.test/logo.png');
    expect(component.config.pie.firma_url).toBe('https://cdn.test/firma.png');
    expect(component.config.pie.sello_url).toBe('https://cdn.test/sello.png');
    expect(texto).toContain('Juan José Alvarez Martinez');
    expect(texto).toContain('Psicólogo');
    expect(fixture.nativeElement.querySelector('.rsp-sign-media img')?.getAttribute('src')).toBe(
      'https://cdn.test/firma.png',
    );
    expect(fixture.nativeElement.querySelector('.rsp-seal img')?.getAttribute('src')).toBe(
      'https://cdn.test/sello.png',
    );
    // Pie: fecha de emisión, no la del día de hoy.
    expect(texto).toContain('21 jul 2026');
  });

  it('VER: enriquece identidad sin reemplazar el layout del snapshot', async () => {
    const snapshot = configConDiagnostico();
    snapshot.identidad.tipografia = 'compacta';
    snapshot.identidad.color_id = 'verde';
    snapshot.pie.mostrar_fecha_generacion = true;

    recetasApi.obtenerReceta.and.resolveTo(
      detalleBorrador({
        estado: 'EMITIDA',
        version_actual: 1,
        tiene_pdf: true,
        configuracion_plantilla_snapshot: snapshot,
      }),
    );

    await abrirConInputs('VER_EMITIDA', 50);

    expect(plantillaApi.obtenerVistaPrevia).toHaveBeenCalled();
    expect(component.config.identidad.tipografia).toBe('compacta');
    expect(component.config.identidad.color_id).toBe('verde');
    expect(component.config.distribucion.secciones.diagnostico).toBeTrue();
    expect(component.config.datos_visualizacion.nombre).toContain('Juan José');
    expect(component.config.identidad.logo_url).toContain('logo.png');
  });

  it('EDITAR: la vista previa sigue los cambios del formulario y se restaura al cancelar', async () => {
    recetasApi.obtenerReceta.and.resolveTo(
      detalleBorrador({
        estado: 'EMITIDA',
        version_actual: 1,
        tiene_pdf: true,
        configuracion_plantilla_snapshot: configConDiagnostico(),
      }),
    );
    await abrirConInputs('VER_EMITIDA', 50);

    component.pasarAEditarEmitida();
    fixture.detectChanges();
    expect(textoVistaPrevia()).toContain('Gripe');

    const previaAntes = component.datosVistaPrevia;
    component.contenido.diagnostico = 'Faringitis';
    component.contenido.medicamentos[0].nombre = 'Amoxicilina';
    component.marcarDirty();
    fixture.detectChanges();

    expect(component.datosVistaPrevia).not.toBe(previaAntes);
    expect(textoVistaPrevia()).toContain('Faringitis');
    expect(textoVistaPrevia()).toContain('Amoxicilina');

    component.cancelarEdicion();
    fixture.detectChanges();

    expect(component.modo).toBe('VER_EMITIDA');
    expect(component.contenido.diagnostico).toBe('Gripe');
    expect(textoVistaPrevia()).toContain('Gripe');
    expect(textoVistaPrevia()).not.toContain('Faringitis');
  });

  it('abrir otra receta no deja datos de la anterior', async () => {
    recetasApi.obtenerReceta.and.resolveTo(detalleBorrador());
    await abrirConInputs('EDITAR_BORRADOR', 50);
    expect(textoVistaPrevia()).toContain('Ibuprofeno');

    recetasApi.obtenerReceta.and.resolveTo(
      detalleBorrador({
        id_receta: 51,
        nombre: 'Receta B',
        diagnostico: 'Dermatitis',
        indicaciones: 'Evitar sol',
        fecha_emision: '2026-07-25',
        medicamentos: [
          {
            id_receta_medicamento: 9,
            orden: 1,
            nombre: 'Loratadina',
            dosis: '10 mg',
            frecuencia: 'c/24h',
            duracion: '7 días',
            indicaciones_adicionales: null,
            created_at: null,
            updated_at: null,
          },
        ],
      }),
    );
    fixture.componentRef.setInput('idReceta', 51);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const texto = textoVistaPrevia();
    expect(texto).toContain('Loratadina');
    expect(texto).toContain('25/07/2026');
    expect(texto).toContain('Evitar sol');
    expect(texto).not.toContain('Ibuprofeno');
    expect(texto).not.toContain('Reposo');
  });

  it('cambiar de modo no vuelve a consultar el detalle', async () => {
    recetasApi.obtenerReceta.and.resolveTo(
      detalleBorrador({ estado: 'EMITIDA', version_actual: 1, tiene_pdf: true }),
    );
    await abrirConInputs('VER_EMITIDA', 50);
    expect(recetasApi.obtenerReceta).toHaveBeenCalledTimes(1);

    fixture.componentRef.setInput('modo', 'EDITAR_EMITIDA');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(recetasApi.obtenerReceta).toHaveBeenCalledTimes(1);
    expect(textoVistaPrevia()).toContain('Ibuprofeno');
  });

  it('una plantilla que responde tarde no pisa la receta ya cargada', async () => {
    const configTardia = createDefaultPlantillaConfig();
    configTardia.identidad.tipografia = 'clasica';
    let resolverPlantilla: () => void = () => undefined;
    const plantillaLenta = new Promise(resolve => {
      resolverPlantilla = () =>
        resolve({
          configuracion: configTardia,
          esPredeterminada: true,
          idPlantillaReceta: 9,
          profesional: {
            nombreCompleto: 'Dra. Ana',
            especialidad: '',
            cedulaProfesional: '',
            correoElectronico: '',
            telefono: '',
            nombreConsultorio: '',
            telefonoConsultorio: '',
            direccionConsultorio: '',
            descripcionProfesional: '',
          },
          logo: null,
          firma: null,
          sello: null,
        });
    });
    plantillaApi.obtenerVistaPrevia.and.returnValue(plantillaLenta as never);

    // Apertura 1: receta nueva, la plantilla queda en vuelo.
    await abrirConInputs('CREAR', null);

    // Apertura 2: receta existente con su propio snapshot.
    const snapshot = configConDiagnostico();
    recetasApi.obtenerReceta.and.resolveTo(
      detalleBorrador({ estado: 'EMITIDA', version_actual: 1, configuracion_plantilla_snapshot: snapshot }),
    );
    fixture.componentRef.setInput('modo', 'VER_EMITIDA');
    fixture.componentRef.setInput('idReceta', 50);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    resolverPlantilla();
    await fixture.whenStable();
    fixture.detectChanges();

    // Conserva el snapshot (diagnóstico activo) y no la plantilla tardía (tipografía clásica).
    expect(component.config.distribucion.secciones.diagnostico).toBeTrue();
    expect(component.config.identidad.tipografia).toBe('moderna');
    expect(textoVistaPrevia()).toContain('Ibuprofeno');
    expect(textoVistaPrevia()).toContain('Juan Pérez');
  });

  it('un snapshot parcial (esquema viejo) no congela la vista previa', async () => {
    // Reproduce el bug real: un snapshot guardado sin todas las claves del
    // esquema actual rompía el render de la hoja a mitad de refresco y la
    // dejaba con placeholders aunque el formulario cargara bien.
    const snapshotParcial = {
      identidad: { color_id: 'azul' },
      distribucion: { secciones: { diagnostico: true } },
    } as unknown as ReturnType<typeof createDefaultPlantillaConfig>;

    recetasApi.obtenerReceta.and.resolveTo(
      detalleBorrador({
        estado: 'EMITIDA',
        version_actual: 1,
        tiene_pdf: true,
        configuracion_plantilla_snapshot: snapshotParcial,
      }),
    );

    await abrirConInputs('VER_EMITIDA', 50);

    const texto = textoVistaPrevia();
    expect(texto).toContain('Juan Pérez');
    expect(texto).toContain('36 años');
    expect(texto).toContain('21/07/2026');
    expect(texto).toContain('Gripe');
    expect(texto).toContain('Ibuprofeno');
    expect(texto).not.toContain('Nombre del paciente');
    // La normalización rellenó las claves ausentes con la config por defecto.
    expect(component.config.distribucion.etiquetas.paciente).toBe('Paciente');
    expect(component.config.identidad.color_id).toBe('azul');
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
      detalleBorrador({ estado: 'EMITIDA', version_actual: 1, lock_version: 0, tiene_pdf: true }),
    );
    await openPanelAndWait('EDITAR_EMITIDA', 50);

    recetasApi.crearNuevaVersion.and.resolveTo(
      detalleBorrador({
        estado: 'EMITIDA',
        version_actual: 2,
        lock_version: 1,
        tiene_pdf: true,
        nombre_archivo: 'receta-v2.pdf',
      }),
    );

    component.solicitarGuardarEmitida();
    component.elegirGuardarNuevaVersion();
    await fixture.whenStable();

    expect(recetasApi.actualizarBorrador).not.toHaveBeenCalled();
    expect(recetasApi.crearNuevaVersion).toHaveBeenCalledTimes(1);
    const [id, body] = recetasApi.crearNuevaVersion.calls.mostRecent().args;
    expect(id).toBe(50);
    expect(body.lock_version).toBe(0);
    expect(body.numero_version_base).toBe(1);
    expect(body.operation_id).toBeTruthy();
    expect('version_actual' in body).toBeFalse();
    expect(component.versionActual).toBe(2);
    expect(component.recetaSeleccionada?.lock_version).toBe(1);
    expect(component.modo).toBe('VER_EMITIDA');
    expect(component.historialVersiones[0].es_actual).toBeTrue();
    expect(component.historialVersiones[0].numero_version).toBe(2);
    expect(component.guardandoVersion()).toBeFalse();
  });

  it('un clic en guardar nueva versión dispara exactamente un POST', async () => {
    recetasApi.obtenerReceta.and.resolveTo(
      detalleBorrador({ estado: 'EMITIDA', version_actual: 1, tiene_pdf: true }),
    );
    await openPanelAndWait('EDITAR_EMITIDA', 50);

    let resolvePost!: (value: RecetaDetalle) => void;
    recetasApi.crearNuevaVersion.and.returnValue(
      new Promise<RecetaDetalle>(resolve => {
        resolvePost = resolve;
      }),
    );

    component.solicitarGuardarEmitida();
    fixture.detectChanges();
    const option: HTMLButtonElement | null = fixture.nativeElement.querySelector(
      '.nrp-sheet__option',
    );
    expect(option).toBeTruthy();
    expect(option!.type).toBe('button');

    const pending = component.guardarNuevaVersion();
    await Promise.resolve();

    expect(recetasApi.crearNuevaVersion).toHaveBeenCalledTimes(1);
    expect(component.guardandoVersion()).toBeTrue();
    fixture.detectChanges();
    const optionWhileSaving: HTMLButtonElement | null = fixture.nativeElement.querySelector(
      '.nrp-sheet__option',
    );
    // El diálogo de decisión ya se cerró; el footer muestra Guardando…
    expect(optionWhileSaving).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Guardando…');

    resolvePost(
      detalleBorrador({
        estado: 'EMITIDA',
        version_actual: 2,
        tiene_pdf: true,
      }),
    );
    await pending;
    expect(component.guardandoVersion()).toBeFalse();
    expect(component.versionActual).toBe(2);
  });

  it('doble clic rápido en guardar nueva versión dispara un solo POST', async () => {
    recetasApi.obtenerReceta.and.resolveTo(
      detalleBorrador({ estado: 'EMITIDA', version_actual: 1, tiene_pdf: true }),
    );
    await openPanelAndWait('EDITAR_EMITIDA', 50);

    let resolvePost!: (value: RecetaDetalle) => void;
    recetasApi.crearNuevaVersion.and.returnValue(
      new Promise<RecetaDetalle>(resolve => {
        resolvePost = resolve;
      }),
    );

    void component.guardarNuevaVersion();
    void component.guardarNuevaVersion();
    await Promise.resolve();

    expect(recetasApi.crearNuevaVersion).toHaveBeenCalledTimes(1);

    resolvePost(
      detalleBorrador({
        estado: 'EMITIDA',
        version_actual: 2,
        tiene_pdf: true,
      }),
    );
    await fixture.whenStable();
    expect(component.versionActual).toBe(2);
  });

  it('opción de nueva versión es type=button sin ngSubmit duplicado', async () => {
    recetasApi.obtenerReceta.and.resolveTo(
      detalleBorrador({ estado: 'EMITIDA', version_actual: 1, tiene_pdf: true }),
    );
    await openPanelAndWait('EDITAR_EMITIDA', 50);
    component.solicitarGuardarEmitida();
    fixture.detectChanges();

    const option: HTMLButtonElement | null = fixture.nativeElement.querySelector(
      '.nrp-sheet__option',
    );
    expect(option).toBeTruthy();
    expect(option!.type).toBe('button');
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
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
    expect(component.conflictoVersionPendiente).toBeTrue();
    expect(component.versionActual).toBe(1);
    expect(JSON.stringify(localStorage)).not.toContain('Cambio local');
  });

  it('Recargar tras 409 obtiene versión vigente y reemplaza formulario', async () => {
    recetasApi.obtenerReceta.and.resolveTo(
      detalleBorrador({ estado: 'EMITIDA', version_actual: 1, tiene_pdf: true, diagnostico: 'Local' }),
    );
    await openPanelAndWait('EDITAR_EMITIDA', 50);
    component.contenido.diagnostico = 'Cambio local';
    component.formDirty = true;
    component.conflictoVersionPendiente = true;
    component.dialogoActivo = 'conflicto_version';

    recetasApi.obtenerReceta.and.resolveTo(
      detalleBorrador({
        estado: 'EMITIDA',
        version_actual: 2,
        tiene_pdf: true,
        diagnostico: 'Remoto vigente',
      }),
    );

    await component.recargarTrasConflicto();

    expect(component.dialogoActivo).toBe('ninguno');
    expect(component.conflictoVersionPendiente).toBeFalse();
    expect(component.versionActual).toBe(2);
    expect(component.contenido.diagnostico).toBe('Remoto vigente');
    expect(component.formularioLocalBackup).toBeNull();
  });

  it('Seguir editando tras 409 cierra conflicto y conserva cambios locales', async () => {
    recetasApi.obtenerReceta.and.resolveTo(
      detalleBorrador({ estado: 'EMITIDA', version_actual: 1, tiene_pdf: true }),
    );
    await openPanelAndWait('EDITAR_EMITIDA', 50);
    component.contenido.diagnostico = 'Cambio local';
    component.formDirty = true;
    component.dialogoActivo = 'conflicto_version';
    component.conflictoVersionPendiente = true;
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Seguir editando');

    component.conservarEdicionTrasConflicto();
    fixture.detectChanges();

    expect(component.dialogoActivo).toBe('ninguno');
    expect(component.modo).toBe('EDITAR_EMITIDA');
    expect(component.contenido.diagnostico).toBe('Cambio local');
    expect(component.conflictoVersionPendiente).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('versión anterior');
    // No reenvía automáticamente
    expect(recetasApi.crearNuevaVersion).not.toHaveBeenCalled();

    // Reintento sin recargar: reabre conflicto, sin segundo POST
    await component.guardarNuevaVersion();
    expect(component.dialogoActivo).toBe('conflicto_version');
    expect(recetasApi.crearNuevaVersion).not.toHaveBeenCalled();
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
