import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { ActividadRecienteTimelineComponent } from './actividad-reciente-timeline.component';

describe('ActividadRecienteTimelineComponent', () => {
  let fixture: ComponentFixture<ActividadRecienteTimelineComponent>;
  let component: ActividadRecienteTimelineComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActividadRecienteTimelineComponent, IonicModule],
    }).compileComponents();
    fixture = TestBed.createComponent(ActividadRecienteTimelineComponent);
    component = fixture.componentInstance;
  });

  it('muestra skeleton en loading sin items', () => {
    component.loading = true;
    component.items = [];
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.art__skeleton')).toBeTruthy();
    expect(el.textContent).not.toContain('datos de ejemplo');
  });

  it('muestra error y permite reintentar', () => {
    const spy = jasmine.createSpy('retry');
    component.error = 'No se pudo cargar';
    component.loading = false;
    component.retry.subscribe(spy);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('No se pudo cargar');
    el.querySelector<HTMLButtonElement>('.art__retry')?.click();
    expect(spy).toHaveBeenCalled();
  });

  it('muestra vacío sin mocks', () => {
    component.loading = false;
    component.error = null;
    component.items = [];
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Aún no hay actividad reciente');
    expect(el.textContent?.toLowerCase()).not.toContain('placeholder');
    expect(el.textContent?.toLowerCase()).not.toContain('datos de ejemplo');
  });

  it('renderiza items reales y Ver más', () => {
    const loadSpy = jasmine.createSpy('loadMore');
    component.items = [
      { id: '1', cuando: 'Hoy', titulo: 'Sesión registrada', icono: 'checkmark-circle-outline', tone: 'success' },
    ];
    component.hasMore = true;
    component.loadMore.subscribe(loadSpy);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Sesión registrada');
    expect(el.textContent).toContain('Ver más');
    el.querySelector<HTMLButtonElement>('.art__more-btn')?.click();
    expect(loadSpy).toHaveBeenCalled();
  });

  it('subtitle por defecto no menciona datos de ejemplo', () => {
    fixture.detectChanges();
    expect(component.subtitle.toLowerCase()).not.toContain('datos de ejemplo');
    expect(fixture.nativeElement.textContent.toLowerCase()).not.toContain('datos de ejemplo');
  });
});
