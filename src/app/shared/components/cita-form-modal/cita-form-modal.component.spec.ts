import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CitaFormModalComponent } from './cita-form-modal.component';
import { CitasApiService } from '../../../pages/citas/citas-api.service';
import { ConfiguracionApiService } from '../../../services/configuracion-api.service';
import { CurrencyPreferenceService } from '../../../services/currency-preference.service';

describe('CitaFormModalComponent default appointment cost', () => {
  let fixture: ComponentFixture<CitaFormModalComponent>;
  let component: CitaFormModalComponent;
  let citasService: jasmine.SpyObj<CitasApiService>;
  let configuracionService: jasmine.SpyObj<ConfiguracionApiService>;

  const emptyPage = {
    content: [],
    total_elements: 0,
    total_pages: 0,
    number: 0,
    size: 0,
    first: true,
    last: true,
    empty: true,
    number_of_elements: 0,
  };

  async function createComponent(
    config: Promise<{ costo_cita_predeterminado?: number | null }>,
    open = true,
  ) {
    citasService = jasmine.createSpyObj<CitasApiService>('CitasApiService', ['getAll']);
    citasService.getAll.and.resolveTo(emptyPage);
    configuracionService = jasmine.createSpyObj<ConfiguracionApiService>(
      'ConfiguracionApiService',
      ['getAgendaConCostoPredeterminado'],
    );
    configuracionService.getAgendaConCostoPredeterminado.and.returnValue(config);

    await TestBed.configureTestingModule({
      imports: [CitaFormModalComponent],
      providers: [
        { provide: CitasApiService, useValue: citasService },
        { provide: ConfiguracionApiService, useValue: configuracionService },
        {
          provide: CurrencyPreferenceService,
          useValue: { currencyCode: () => 'MXN' },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CitaFormModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('open', open);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('loads the configured default cost and renders the existing numeric amount control', async () => {
    await createComponent(Promise.resolve({ costo_cita_predeterminado: 725.5 }));

    const input = fixture.nativeElement.querySelector('input[type="number"]') as HTMLInputElement;
    expect(component.form.monto).toBe(725.5);
    expect(input.value).toBe('725.5');
    expect(input.min).toBe('0');
    expect(input.step).toBe('0.01');
    expect(fixture.nativeElement.textContent).toContain('Monto (MXN)');
  });

  it('keeps the existing zero fallback when no default cost is configured', async () => {
    await createComponent(Promise.resolve({ costo_cita_predeterminado: null }));

    expect(component.form.monto).toBe(0);
    expect((fixture.nativeElement.querySelector('input[type="number"]') as HTMLInputElement).value).toBe('0');
  });

  it('loads the default when a persistent agenda form is opened', async () => {
    await createComponent(Promise.resolve({ costo_cita_predeterminado: 610 }), false);
    expect(configuracionService.getAgendaConCostoPredeterminado).not.toHaveBeenCalled();

    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.form.monto).toBe(610);
    expect(configuracionService.getAgendaConCostoPredeterminado).toHaveBeenCalledTimes(1);
  });

  it('does not overwrite a manually edited amount while configuration is loading', async () => {
    let resolveConfig!: (value: { costo_cita_predeterminado: number }) => void;
    const config = new Promise<{ costo_cita_predeterminado: number }>(resolve => {
      resolveConfig = resolve;
    });
    await createComponent(config);

    component.onMontoChange(840);
    resolveConfig({ costo_cita_predeterminado: 725 });
    await fixture.whenStable();

    expect(component.form.monto).toBe(840);
  });

  it('submits the configured or edited amount without changing its numeric value', async () => {
    await createComponent(Promise.resolve({ costo_cita_predeterminado: 725.5 }));
    component.form.id_paciente = 7;
    component.form.nombre_paciente = 'Ana';
    component.form.apellido_paciente = 'Ejemplo';
    component.form.fecha = '2026-10-21';
    component.form.hora_inicio = '09:00';
    component.form.hora_fin = '10:00';
    component.form.motivo = 'Consulta';
    component.onMontoChange(900.25);
    const saved = jasmine.createSpy('saved');
    component.saved.subscribe(saved);

    component.guardar();

    expect(saved).toHaveBeenCalledOnceWith(jasmine.objectContaining({ monto: 900.25 }));
  });

  it('rejects a negative amount', async () => {
    await createComponent(Promise.resolve({ costo_cita_predeterminado: null }));
    component.form.monto = -0.01;

    component.guardar();

    expect(component.errores['monto']).toContain('igual o mayor a cero');
  });
});
