import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { IonicModule, ToastController } from '@ionic/angular';
import { PrimeraSesionChecklistComponent } from './primera-sesion-checklist.component';
import { environment } from 'src/environments/environment';
import { PRIMERA_SESION_TOTAL } from '../../models/primera-sesion.models';

describe('PrimeraSesionChecklistComponent', () => {
  let fixture: ComponentFixture<PrimeraSesionChecklistComponent>;
  let component: PrimeraSesionChecklistComponent;
  let http: HttpTestingController;
  let toastCtrl: jasmine.SpyObj<ToastController>;
  const url = `${environment.apiUrl}/pacientes/3/primera-sesion`;

  const emptyDto = {
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
  };

  beforeEach(async () => {
    toastCtrl = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrl.create.and.resolveTo({ present: jasmine.createSpy('present') } as never);

    await TestBed.configureTestingModule({
      imports: [PrimeraSesionChecklistComponent, IonicModule, HttpClientTestingModule],
      providers: [{ provide: ToastController, useValue: toastCtrl }],
    }).compileComponents();

    fixture = TestBed.createComponent(PrimeraSesionChecklistComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.componentRef.setInput('idPaciente', 3);
  });

  afterEach(() => {
    http.verify();
  });

  function flushLoad(dto: Record<string, unknown> = emptyDto): void {
    fixture.detectChanges();
    const req = http.expectOne(url);
    expect(req.request.method).toBe('GET');
    req.flush(dto);
    fixture.detectChanges();
  }

  it('carga checklist vacío desde backend', fakeAsync(() => {
    flushLoad();
    tick();
    expect(component.loaded()).toBeTrue();
    expect(component.completedCount).toBe(0);
    expect(component.form.controls.nivel_inicial.value).toBe('BAJO');
    expect(fixture.nativeElement.textContent).not.toContain('no se guarda');
  }));

  it('carga parcialmente completado y actualiza contador', fakeAsync(() => {
    flushLoad({
      ...emptyDto,
      consentimiento_informado: true,
      motivo_consulta: true,
      antecedentes: true,
      red_apoyo: true,
      completados: 4,
      nivel_inicial: 'MEDIO',
    });
    tick();
    expect(component.completedCount).toBe(4);
    expect(component.form.controls.nivel_inicial.value).toBe('MEDIO');
    expect(fixture.nativeElement.textContent).toContain(`4/${PRIMERA_SESION_TOTAL}`);
  }));

  it('trata 204 sin body como paciente sin primera sesión', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(url).flush(null, { status: 204, statusText: 'No Content' });
    fixture.detectChanges();
    tick();

    expect(component.loaded()).toBeTrue();
    expect(component.hasPrimeraSesion()).toBeFalse();
    expect(component.error()).toBe('');
    expect(component.completedCount).toBe(0);
    expect(fixture.nativeElement.textContent).not.toContain('Consentimiento informado');
    expect(fixture.nativeElement.textContent).not.toContain('Invalid Date');
  }));

  it('trata body null como paciente sin primera sesión', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(url).flush(null);
    fixture.detectChanges();
    tick();

    expect(component.loaded()).toBeTrue();
    expect(component.hasPrimeraSesion()).toBeFalse();
    expect(component.error()).toBe('');
    expect(fixture.nativeElement.textContent).not.toContain('Reintentar');
    expect(toastCtrl.create).not.toHaveBeenCalled();
  }));

  it('trata body vacío como paciente sin primera sesión', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(url).flush('');
    fixture.detectChanges();
    tick();

    expect(component.loaded()).toBeTrue();
    expect(component.hasPrimeraSesion()).toBeFalse();
    expect(component.error()).toBe('');
  }));

  it('contador reactivo al marcar casillas sin request', fakeAsync(() => {
    flushLoad();
    tick();
    component.onItemToggle('consentimiento_informado', true);
    component.onItemToggle('firma_digital', true);
    expect(component.completedCount).toBe(2);
    http.expectNone(url);
  }));

  it('selección única de nivel BAJO/MEDIO/ALTO', fakeAsync(() => {
    flushLoad();
    tick();
    component.onRiskChange('ALTO');
    expect(component.form.controls.nivel_inicial.value).toBe('ALTO');
    component.onRiskChange('BAJO');
    expect(component.form.controls.nivel_inicial.value).toBe('BAJO');
  }));

  it('guarda con PUT único y bloquea doble clic', fakeAsync(() => {
    flushLoad();
    tick();
    component.onItemToggle('consentimiento_informado', true);
    expect(component.form.dirty).toBeTrue();

    void component.guardar();
    void component.guardar();
    const puts = http.match(r => r.url === url && r.method === 'PUT');
    expect(puts.length).toBe(1);
    expect(puts[0].request.body.consentimiento_informado).toBeTrue();
    expect(puts[0].request.body.nivel_inicial).toBe('BAJO');

    puts[0].flush({
      ...emptyDto,
      id: 9,
      consentimiento_informado: true,
      completados: 1,
      nivel_inicial: 'BAJO',
    });
    tick();
    expect(component.form.dirty).toBeFalse();
    expect(component.completedCount).toBe(1);
    expect(toastCtrl.create).toHaveBeenCalled();
  }));

  it('error de carga muestra reintento sin checklist falso', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(url).flush({ message: 'fallo' }, { status: 500, statusText: 'Error' });
    fixture.detectChanges();
    tick();
    expect(component.error()).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Reintentar');
    expect(fixture.nativeElement.textContent).not.toContain('Consentimiento informado');
  }));

  it('no contiene texto provisional ni mocks', fakeAsync(() => {
    flushLoad();
    tick();
    const text = (fixture.nativeElement.textContent as string).toLowerCase();
    expect(text).not.toContain('no se guarda');
    expect(text).not.toContain('datos de ejemplo');
    expect(text).not.toContain('placeholder');
    expect(text).toContain('checklist inicial de admisión');
  }));

  it('emite dirtyChange al editar y limpia al guardar', fakeAsync(() => {
    const dirtySpy = jasmine.createSpy('dirty');
    component.dirtyChange.subscribe(dirtySpy);
    flushLoad();
    tick();
    dirtySpy.calls.reset();
    component.onItemToggle('violencia', true);
    expect(dirtySpy).toHaveBeenCalledWith(true);

    void component.guardar();
    const put = http.expectOne(r => r.url === url && r.method === 'PUT');
    put.flush({
      ...emptyDto,
      id: 1,
      violencia: true,
      completados: 1,
    });
    tick();
    expect(dirtySpy).toHaveBeenCalledWith(false);
  }));
});
