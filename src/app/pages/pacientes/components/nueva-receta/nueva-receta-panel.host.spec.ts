import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { IonicModule, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { NuevaRecetaPanelComponent } from './nueva-receta-panel.component';
import { PlantillaRecetasApiService } from 'src/app/services/plantilla-recetas-api.service';
import { RecetasApiService } from 'src/app/services/recetas-api.service';
import { createDefaultPlantillaConfig } from 'src/app/shared/models/plantilla-recetas.models';
import { RecetaDetalle, RecetaModalModo } from 'src/app/shared/models/recetas.models';
import { PacienteDto } from '../../models/paciente.model';

/** Reproduce el uso real: el panel existe cerrado y luego se abre con un id. */
@Component({
  standalone: true,
  imports: [NuevaRecetaPanelComponent],
  template: `
    <app-nueva-receta-panel
      [abierto]="abierto"
      [paciente]="paciente"
      [modo]="modo"
      [idReceta]="idReceta"
      [accionInicial]="accion">
    </app-nueva-receta-panel>
  `,
})
class HostPacienteDetalleStubComponent {
  abierto = false;
  paciente: PacienteDto | null = null;
  modo: RecetaModalModo = 'CREAR';
  idReceta: number | null = null;
  accion: 'ninguna' | 'copiar' = 'ninguna';
}

describe('NuevaRecetaPanelComponent (integrado en la página)', () => {
  let fixture: ComponentFixture<HostPacienteDetalleStubComponent>;
  let host: HostPacienteDetalleStubComponent;
  let recetasApi: jasmine.SpyObj<RecetasApiService>;

  const paciente: PacienteDto = {
    id_paciente: 42,
    nombre: 'Anyela',
    apellido: 'Alfaro Flores',
    fecha_nacimiento: '1996-03-10',
  } as PacienteDto;

  const detalleEmitida = (): RecetaDetalle => ({
    id_receta: 50,
    id_profesional: 7,
    id_paciente: 42,
    id_plantilla_receta: 3,
    id_receta_origen: null,
    nombre: 'Receta — Anyela Alfaro Flores — 2026-07-25',
    fecha_emision: '2026-07-25',
    paciente_nombre: 'Anyela Alfaro Flores',
    paciente_fecha_nacimiento_snapshot: '1996-03-10',
    edad_texto: '30 años',
    diagnostico: null,
    indicaciones: null,
    proxima_cita_fecha: null,
    proxima_cita_hora: null,
    notas_internas: null,
    configuracion_plantilla_snapshot: createDefaultPlantillaConfig(),
    estado: 'EMITIDA',
    version_actual: 1,
    lock_version: 0,
    tiene_pdf: true,
    nombre_archivo: 'receta-50.pdf',
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
        nombre: 'Topiramato',
        dosis: '100 mg',
        frecuencia: 'cada 24h',
        duracion: 'sin suspender',
        indicaciones_adicionales: null,
        created_at: null,
        updated_at: null,
      },
    ],
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
    recetasApi.obtenerReceta.and.resolveTo(detalleEmitida());

    const plantillaApi = jasmine.createSpyObj('PlantillaRecetasApiService', [
      'obtenerVistaPrevia',
    ]);
    plantillaApi.obtenerVistaPrevia.and.resolveTo({
      configuracion: createDefaultPlantillaConfig(),
      esPredeterminada: true,
      idPlantillaReceta: 3,
      profesional: { nombreCompleto: 'Dra. Ana' },
    });

    const toastCtrl = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrl.create.and.resolveTo({
      present: jasmine.createSpy('present').and.resolveTo(),
    } as never);

    await TestBed.configureTestingModule({
      imports: [HostPacienteDetalleStubComponent, IonicModule.forRoot()],
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

    fixture = TestBed.createComponent(HostPacienteDetalleStubComponent);
    host = fixture.componentInstance;
    host.paciente = paciente;
    fixture.detectChanges();
  });

  it('al pulsar Ver, formulario y vista previa muestran los mismos datos', async () => {
    host.idReceta = 50;
    host.modo = 'VER_EMITIDA';
    host.abierto = true;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const sheet = el.querySelector('.rsp-sheet') as HTMLElement;
    const texto = sheet.textContent ?? '';

    expect(texto).toContain('Anyela Alfaro Flores');
    expect(texto).toContain('25/07/2026');
    expect(texto).toContain('30 años');
    expect(texto).toContain('Topiramato');
    expect(texto).not.toContain('Nombre del medicamento');
  });
});
