import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule, ModalController } from '@ionic/angular';
import {
  RecetaActionsMenuComponent,
} from './receta-actions-menu.component';
import { RecetaResumen } from 'src/app/shared/models/recetas.models';

describe('RecetaActionsMenuComponent', () => {
  let fixture: ComponentFixture<RecetaActionsMenuComponent>;
  let component: RecetaActionsMenuComponent;
  let modalCtrl: jasmine.SpyObj<ModalController>;

  const recetaEmitida: RecetaResumen = {
    id_receta: 10,
    nombre: 'Copia de Receta — Anyela Alfaro Flores — 2026-07-25',
    id_paciente: 1,
    paciente_nombre: 'Anyela',
    fecha_emision: '2026-07-25',
    diagnostico: null,
    estado: 'EMITIDA',
    version_actual: 1,
    tiene_pdf: true,
    cantidad_medicamentos: 1,
    created_at: null,
    updated_at: null,
    id_receta_origen: null,
  };

  beforeEach(async () => {
    modalCtrl = jasmine.createSpyObj('ModalController', ['dismiss']);
    modalCtrl.dismiss.and.resolveTo(true);

    await TestBed.configureTestingModule({
      imports: [RecetaActionsMenuComponent, IonicModule],
      providers: [
        { provide: ModalController, useValue: modalCtrl },
      ],
    })
      .overrideProvider(ModalController, { useValue: modalCtrl })
      .compileComponents();

    fixture = TestBed.createComponent(RecetaActionsMenuComponent);
    component = fixture.componentInstance;
    component.receta = recetaEmitida;
    component.puedeAbrirPdf = true;
    component.variant = 'fixed';
    fixture.detectChanges();
  });

  it('renderiza título truncable y acciones compactas en fixed', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.ram__title')?.textContent).toContain('Copia de Receta');
    expect(el.querySelector('.ram--fixed')).toBeTruthy();
    expect(el.textContent).toContain('Ver');
    expect(el.textContent).toContain('Editar');
    expect(el.textContent).toContain('Abrir PDF');
    expect(el.textContent).toContain('Imprimir');
    expect(el.textContent).toContain('Descargar PDF');
    expect(el.textContent).toContain('Guardar como copia');
    expect(el.textContent).not.toContain('Cancelar');
  });

  it('en variante sheet muestra Cancelar', () => {
    component.variant = 'sheet';
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.ram--sheet')).toBeTruthy();
    expect(el.textContent).toContain('Cancelar');
  });

  it('oculta PDF y copia según estado/permisos', () => {
    component.receta = { ...recetaEmitida, estado: 'BORRADOR', tiene_pdf: false };
    component.puedeAbrirPdf = false;
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Editar');
    expect(el.textContent).not.toContain('Abrir PDF');
    expect(el.textContent).not.toContain('Guardar como copia');
  });

  it('al seleccionar Ver en fixed emite closed con action', async () => {
    const closedSpy = jasmine.createSpy('closed');
    component.closed.subscribe(closedSpy);
    await component.select('ver');
    expect(closedSpy).toHaveBeenCalledOnceWith('ver');
    expect(modalCtrl.dismiss).not.toHaveBeenCalled();
  });

  it('Cancelar en sheet cierra sin action', async () => {
    component.variant = 'sheet';
    fixture.detectChanges();
    await component.cancel();
    expect(modalCtrl.dismiss).toHaveBeenCalledOnceWith(undefined);
  });

  it('expone role=menu y menuitem', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[role="menu"]')).toBeTruthy();
    expect(el.querySelectorAll('[role="menuitem"]').length).toBeGreaterThan(0);
  });
});
