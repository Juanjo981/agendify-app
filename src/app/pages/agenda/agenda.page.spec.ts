import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { EMPTY } from 'rxjs';
import { AngularDelegate, PopoverController } from '@ionic/angular';
import { AgendaPage } from './agenda.page';
import { AgendaApiService } from './agenda-api.service';
import { PacientesApiService } from '../pacientes/pacientes-api.service';
import { CitasApiService } from '../citas/citas-api.service';
import { AgendaRefreshService, CitasRefreshService } from '../../shared/refresh/dashboard-module-refresh.services';
import { CurrencyPreferenceService } from 'src/app/services/currency-preference.service';

describe('AgendaPage block date range', () => {
  let fixture: ComponentFixture<AgendaPage>;
  let component: AgendaPage;
  let agendaApi: jasmine.SpyObj<AgendaApiService>;

  beforeEach(async () => {
    agendaApi = jasmine.createSpyObj<AgendaApiService>(
      'AgendaApiService',
      ['getAgendaMes', 'getConfiguracionAgenda', 'createBloqueo', 'updateBloqueo', 'deleteBloqueo'],
    );
    agendaApi.createBloqueo.and.callFake(async request => ({
      id_bloqueo_horario: Date.parse(`${request.fecha}T00:00:00`),
      fecha: request.fecha,
    }));
    agendaApi.getAgendaMes.and.resolveTo({ citas: [], bloqueos: [], configuracion_jornada: null });
    agendaApi.getConfiguracionAgenda.and.resolveTo({
      hora_inicio: '09:00',
      hora_fin: '18:00',
      intervalo_minutos: 30,
    });

    await TestBed.configureTestingModule({
      imports: [AgendaPage],
      providers: [
        provideHttpClient(),
        { provide: AgendaApiService, useValue: agendaApi },
        { provide: PacientesApiService, useValue: { getAll: async () => ({ content: [] }) } },
        { provide: CitasApiService, useValue: {} },
        {
          provide: AgendaRefreshService,
          useValue: { watchSection: () => EMPTY, enterSection: jasmine.createSpy(), requestRefresh: jasmine.createSpy() },
        },
        { provide: CitasRefreshService, useValue: { requestRefresh: jasmine.createSpy() } },
        { provide: CurrencyPreferenceService, useValue: { format: () => '$0.00' } },
        { provide: PopoverController, useValue: {} },
        { provide: AngularDelegate, useValue: {} },
      ],
    });
    TestBed.overrideComponent(AgendaPage, {
      set: {
        template: `
          <section>
            <div class="blk-segment">
              <button type="button" class="blk-date-mode-btn" [class.active]="dateMode === 'single'"
                (click)="setBlockDateMode('single')">Un día</button>
              <button type="button" class="blk-date-mode-btn" [class.active]="dateMode === 'range'"
                (click)="setBlockDateMode('range')">Rango de días</button>
            </div>
            <button id="block-single-date" *ngIf="dateMode === 'single'">Fecha</button>
            <div class="blk-date-range-row" *ngIf="dateMode === 'range'">
              <label for="block-start-date">Desde</label><button id="block-start-date">Desde</button>
              <label for="block-end-date">Hasta</label><button id="block-end-date">Hasta</button>
            </div>
            <div class="blk-repeat-grid">
              <button class="blk-repeat-btn" *ngFor="let option of repeatOptions"
                [disabled]="dateMode === 'range' && option.value !== 'none'">{{ option.label }}</button>
            </div>
            <p class="blk-helper" *ngIf="dateMode === 'range'">
              El rango ya define varios días; la repetición no aplica.
            </p>
          </section>
        `,
      },
    });
    await TestBed.compileComponents();

    fixture = TestBed.createComponent(AgendaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders the single-date mode by default and switches to the range date pickers', () => {
    expect(document.querySelector('#block-single-date')).toBeTruthy();
    expect(document.querySelector('#block-start-date')).toBeNull();

    const rangeMode = document.querySelectorAll('.blk-date-mode-btn')[1] as HTMLButtonElement;
    rangeMode.click();
    fixture.detectChanges();

    expect(document.querySelector('#block-single-date')).toBeNull();
    expect(document.querySelector('#block-start-date')).toBeTruthy();
    expect(document.querySelector('#block-end-date')).toBeTruthy();
  });

  it('validates required range dates and prevents an end date before the start date', () => {
    component.setBlockDateMode('range');
    component.blockForm.startDate = '2026-10-20';
    component.blockForm.endDate = '2026-10-19';
    fixture.detectChanges();

    expect(component.validateBlock()).toBeFalse();
    expect(component.blockErrors.endDate).toContain('no puede ser anterior');

    component.blockForm.endDate = '2026-10-20';
    expect(component.validateBlock()).toBeTrue();
  });

  it('allows only No repetir for a range and explains why recurrence is disabled', () => {
    component.blockForm.repeat = 'weekly';
    component.setBlockDateMode('range');
    fixture.detectChanges();

    const repeatButtons = document.querySelectorAll('.blk-repeat-btn') as NodeListOf<HTMLButtonElement>;
    expect(repeatButtons[0].disabled).toBeFalse();
    expect(repeatButtons.item(1).disabled).toBeTrue();
    expect(repeatButtons.item(2).disabled).toBeTrue();
    expect(repeatButtons.item(3).disabled).toBeTrue();
    expect(document.querySelector('.blk-helper')?.textContent).toContain('la repetición no aplica');
    expect(component.blockForm.repeat).toBe('none');
  });

  it('submits a single-date block using the existing backend payload', async () => {
    component.blockForm.singleDate = '2026-10-20';

    await component.saveBlock();

    expect(agendaApi.createBloqueo).toHaveBeenCalledOnceWith({
      fecha: '2026-10-20',
      hora_inicio: '00:00:00',
      hora_fin: '23:59:00',
      motivo: undefined,
      tipo_bloqueo: 'PERSONAL',
    });
  });

  it('submits one existing-contract payload per date in the selected range', async () => {
    component.setBlockDateMode('range');
    component.blockForm.startDate = '2026-10-20';
    component.blockForm.endDate = '2026-10-22';
    component.blockForm.allDay = false;
    component.blockForm.horaInicio = '09:00';
    component.blockForm.horaFin = '10:00';

    await component.saveBlock();

    expect(agendaApi.createBloqueo).toHaveBeenCalledTimes(3);
    expect(agendaApi.createBloqueo.calls.allArgs().map(([request]) => request)).toEqual([
      { fecha: '2026-10-20', hora_inicio: '09:00:00', hora_fin: '10:00:00', motivo: undefined, tipo_bloqueo: 'PERSONAL' },
      { fecha: '2026-10-21', hora_inicio: '09:00:00', hora_fin: '10:00:00', motivo: undefined, tipo_bloqueo: 'PERSONAL' },
      { fecha: '2026-10-22', hora_inicio: '09:00:00', hora_fin: '10:00:00', motivo: undefined, tipo_bloqueo: 'PERSONAL' },
    ]);
  });

  it('reports a partial range that cannot be rolled back when the created block has no usable id', async () => {
    agendaApi.createBloqueo.and.returnValues(
      Promise.resolve({ id_bloqueo_horario: 0, fecha: '2026-10-20' }),
      Promise.reject(new Error('Request failed')),
    );
    component.setBlockDateMode('range');
    component.blockForm.startDate = '2026-10-20';
    component.blockForm.endDate = '2026-10-21';
    component.showBlockModal = true;

    await component.saveBlock();

    expect(agendaApi.deleteBloqueo).not.toHaveBeenCalled();
    expect(component.blockErrorMessage).toContain('no se pudieron revertir 1');
    expect(component.showBlockModal).toBeTrue();
  });
});
