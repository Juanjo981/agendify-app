import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DestroyRef, inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { EstadoBadgeComponent } from '../components/estado-badge/estado-badge.component';
import { PagoBadgeComponent } from '../components/pago-badge/pago-badge.component';
import {
  CitaFormData,
  CitaFormModalComponent,
} from '../../../shared/components/cita-form-modal/cita-form-modal.component';
import {
  ReprogramarData,
  ReprogramarModalComponent,
} from '../components/reprogramar-modal/reprogramar-modal.component';
import { ConfirmDialogComponent, ConfirmDialogConfig } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { CitasApiService } from '../citas-api.service';
import {
  CitaDto,
  CitaUpsertRequest,
  EstadoCita,
  EstadoPago,
  TipoPago,
  TIPO_PAGO_VALUES,
  durationInMinutes,
  estadoPagoToLabel,
  isTipoPago,
  normalizeTipoPagoValue,
  resolveTipoPagoCita,
  tipoPagoToLabel,
  toDatePart,
  toIsoDateTime,
  toTimePart,
} from '../models/cita.model';
import { mapApiError } from 'src/app/shared/utils/api-error.mapper';
import { InAppNotifyService } from 'src/app/services/in-app-notify.service';
import { CurrencyPreferenceService } from 'src/app/services/currency-preference.service';
import { SesionesApiService } from '../../sesiones/sesiones-api.service';
import { AgendaRefreshService, CitasRefreshService } from '../../../shared/refresh/dashboard-module-refresh.services';

function optionalTipoPagoValidator(control: AbstractControl): ValidationErrors | null {
  const raw = control.value;
  if (raw === null || raw === undefined || raw === '') return null;
  return isTipoPago(raw) ? null : { tipoPagoInvalido: true };
}

@Component({
  selector: 'app-detalle-cita',
  templateUrl: './detalle-cita.page.html',
  styleUrls: ['./detalle-cita.page.scss'],
  standalone: true,
  imports: [
    IonicModule,
    CommonModule,
    ReactiveFormsModule,
    EstadoBadgeComponent,
    PagoBadgeComponent,
    CitaFormModalComponent,
    ReprogramarModalComponent,
    ConfirmDialogComponent,
  ],
})
export class DetalleCitaPage implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);

  readonly tipoPagoOptions = TIPO_PAGO_VALUES;
  cita: CitaDto | null = null;
  citaId = 0;
  sesionRelacionadaId: number | null = null;

  loading = false;
  saving = false;
  errorMessage = '';
  sesionActionLoading = false;

  showEditarModal = false;
  showReprogramarModal = false;
  showPagoForm = false;
  /** Aviso in-place: cita no editable por estado (p. ej. cancelada) */
  showNoEditarModal = false;

  readonly pagoFormGroup = this.fb.group({
    estado_pago: this.fb.nonNullable.control<EstadoPago>('PENDIENTE', Validators.required),
    monto: this.fb.nonNullable.control<number>(0),
    tipoPago: this.fb.control<TipoPago | null>(null, optionalTipoPagoValidator),
  });
  pagoError = '';

  confirmConfig: ConfirmDialogConfig | null = null;
  private confirmCallback: (() => void) | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private citasSvc: CitasApiService,
    private sesionesSvc: SesionesApiService,
    private citasRefresh: CitasRefreshService,
    private agendaRefresh: AgendaRefreshService,
    private inAppNotify: InAppNotifyService,
    private currencyPreference: CurrencyPreferenceService,
  ) {}

  ngOnInit() {
    this.citasRefresh.watchSection('detail')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.citaId) {
          void this.recargar();
        }
      });

    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        this.citaId = Number(params.get('id'));
        if (this.citaId) {
          this.citasRefresh.enterSection('detail');
        }
      });
  }

  ionViewWillEnter() {
    if (this.citaId) {
      this.citasRefresh.enterSection('detail');
    }
  }

  volver() {
    this.router.navigate(['/dashboard/citas']);
  }

  formatFecha(isoDateTime: string): string {
    const date = toDatePart(isoDateTime);
    if (!date) return '-';
    const [y, m, d] = date.split('-');
    return `${d}/${m}/${y}`;
  }

  formatHora(isoDateTime: string): string {
    return toTimePart(isoDateTime) || '-';
  }

  formatMonto(n: number): string {
    return this.currencyPreference.format(Number(n || 0), {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  /** Etiqueta de campo sin símbolo fijo (ISO dinámico). */
  get etiquetaMonto(): string {
    return `Monto (${this.currencyPreference.currencyCode()})`;
  }

  getTipoPagoLabel(tipoPago: TipoPago | null | undefined): string {
    return tipoPagoToLabel(normalizeTipoPagoValue(tipoPago));
  }

  getTipoPagoIcon(tipoPago: TipoPago | null | undefined): string {
    switch (normalizeTipoPagoValue(tipoPago)) {
      case 'EFECTIVO':
        return 'cash-outline';
      case 'TRANSFERENCIA':
        return 'swap-horizontal-outline';
      case 'TARJETA':
        return 'card-outline';
      case 'OTRO':
        return 'ellipsis-horizontal-outline';
      default:
        return 'wallet-outline';
    }
  }

  get iniciales(): string {
    if (!this.cita) return '';
    return `${this.cita.apellido_paciente.charAt(0)}${this.cita.nombre_paciente.charAt(0)}`.toUpperCase();
  }

  get duracionLabel(): string {
    if (!this.cita) return '-';
    const mins = durationInMinutes(this.cita.fecha_inicio, this.cita.fecha_fin);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h <= 0) return `${m} min`;
    return m === 0 ? `${h} h` : `${h} h ${m} min`;
  }

  get puedeEditar(): boolean {
    if (!this.cita) return false;
    return !['COMPLETADA', 'CANCELADA'].includes(this.cita.estado_cita);
  }

  get puedeReprogramar(): boolean {
    if (!this.cita) return false;
    return ['PENDIENTE', 'CONFIRMADA'].includes(this.cita.estado_cita);
  }

  get puedeCancelar(): boolean {
    if (!this.cita) return false;
    return ['PENDIENTE', 'CONFIRMADA', 'REPROGRAMADA'].includes(this.cita.estado_cita);
  }

  get puedeConfirmar(): boolean {
    if (!this.cita) return false;
    return ['PENDIENTE', 'REPROGRAMADA'].includes(this.cita.estado_cita);
  }

  get puedeCompletar(): boolean {
    if (!this.cita) return false;
    return this.cita.estado_cita === 'CONFIRMADA';
  }

  get puedeMarcarNoAsistio(): boolean {
    if (!this.cita) return false;
    return ['PENDIENTE', 'CONFIRMADA'].includes(this.cita.estado_cita);
  }

  get puedeGestionarSesion(): boolean {
    if (!this.cita) return false;
    return this.cita.estado_cita === 'COMPLETADA';
  }

  get sesionButtonLabel(): string {
    return this.sesionRelacionadaId ? 'Ver sesión' : 'Crear sesión';
  }

  /** Tipo de pago unificado para badges y resumen (varias claves API). */
  get tipoPagoResumen(): TipoPago | null {
    return this.cita ? resolveTipoPagoCita(this.cita) : null;
  }

  /** Hay datos de pago cargados: mostrar "Editar pago" en lugar de "Registrar". */
  get esEdicionPago(): boolean {
    if (!this.cita) return false;
    const monto = Number(this.cita.monto ?? 0);
    return this.cita.estado_pago !== 'PENDIENTE' || monto > 0;
  }

  get tituloFormularioPago(): string {
    return this.esEdicionPago ? 'Editar pago' : 'Registrar pago';
  }

  cerrarAvisoNoEditar(): void {
    this.showNoEditarModal = false;
  }

  onEditarCita() {
    console.log('[DetalleCita] onEditarCita triggered', { citaId: this.cita?.id_cita });

    if (!this.cita) {
      this.errorMessage = 'No se pudo abrir edición: la cita no está cargada.';
      console.error('[DetalleCita] Intento de editar sin cita cargada.');
      return;
    }

    if (!this.puedeEditar) {
      this.showNoEditarModal = true;
      return;
    }

    this.errorMessage = '';
    this.showEditarModal = true;
  }

  cambiarEstado(estado: EstadoCita, title: string) {
    this.openConfirm(
      {
        title,
        message: `¿Confirmas cambiar el estado de la cita a "${estado}"?`,
        confirmLabel: 'Confirmar',
        variant: 'primary',
        icon: 'checkmark-circle-outline',
      },
      () => {
        void this.ejecutarCambioEstado(estado);
      }
    );
  }

  async onCitaEditada(data: CitaFormData) {
    if (!this.cita) return;
    this.saving = true;
    this.errorMessage = '';
    try {
      const body = this.mapToUpsertRequest(data);
      this.cita = await this.citasSvc.update(this.cita.id_cita, body);
      this.showEditarModal = false;
      await this.cargarSesionRelacionada();
      this.citasRefresh.requestRefresh('list');
      this.citasRefresh.requestRefresh('detail');
      this.agendaRefresh.requestRefresh('agenda');
      void this.inAppNotify.success('Cita actualizada correctamente.');
    } catch (err) {
      this.errorMessage = mapApiError(err).userMessage;
    } finally {
      this.saving = false;
    }
  }

  async onReprogramado(data: ReprogramarData) {
    if (!this.cita) return;
    this.saving = true;
    this.errorMessage = '';
    try {
      const body: CitaUpsertRequest = {
        id_paciente: this.cita.id_paciente,
        fecha_inicio: toIsoDateTime(data.fecha, data.hora_inicio),
        fecha_fin: toIsoDateTime(data.fecha, data.hora_fin),
        motivo: this.cita.motivo,
        notas_internas: this.cita.notas_internas ?? null,
        observaciones: this.cita.observaciones ?? null,
        monto: this.cita.monto,
      };
      const tipoPagoActual = normalizeTipoPagoValue(
        this.cita.tipoPago ?? this.cita.tipo_pago ?? this.cita.metodo_pago
      );
      if (tipoPagoActual) {
        body.tipoPago = tipoPagoActual;
      }
      this.cita = await this.citasSvc.update(this.cita.id_cita, body);
      this.showReprogramarModal = false;
      await this.cargarSesionRelacionada();
      this.citasRefresh.requestRefresh('list');
      this.citasRefresh.requestRefresh('detail');
      this.agendaRefresh.requestRefresh('agenda');
      void this.inAppNotify.success('Cita reprogramada correctamente.');
    } catch (err) {
      this.errorMessage = mapApiError(err).userMessage;
    } finally {
      this.saving = false;
    }
  }

  abrirPagoForm() {
    if (!this.cita) return;
    const tipoInicial = resolveTipoPagoCita(this.cita);
    this.pagoFormGroup.patchValue({
      estado_pago: this.cita.estado_pago,
      monto: Number(this.cita.monto || 0),
      tipoPago: tipoInicial,
    });
    this.pagoFormGroup.markAsPristine();
    this.pagoError = '';
    this.showPagoForm = true;
  }

  labelTipoPagoOption(value: TipoPago): string {
    return tipoPagoToLabel(value);
  }

  async guardarPago() {
    if (!this.cita) return;
    this.pagoFormGroup.markAllAsTouched();
    if (this.pagoFormGroup.invalid) {
      if (this.pagoFormGroup.get('tipoPago')?.hasError('tipoPagoInvalido')) {
        this.pagoError = 'El tipo de pago no es válido';
      } else if (this.pagoFormGroup.get('estado_pago')?.invalid) {
        this.pagoError = 'Selecciona un estado de pago';
      } else {
        this.pagoError = 'Revisa los datos del pago';
      }
      return;
    }

    this.pagoError = '';
    this.saving = true;
    this.errorMessage = '';
    try {
      const { estado_pago, monto, tipoPago } = this.pagoFormGroup.getRawValue();
      const tipoNorm = normalizeTipoPagoValue(tipoPago);
      const updated = await this.citasSvc.updatePago(this.cita.id_cita, {
        estado_pago,
        monto: Number(monto || 0),
        tipoPago: tipoNorm,
      });
      const tipoFromApi = resolveTipoPagoCita(updated);
      const tipoFinal = tipoFromApi ?? tipoNorm ?? null;
      this.cita = { ...updated, tipoPago: tipoFinal, tipo_pago: tipoFinal };
      this.showPagoForm = false;
      this.citasRefresh.requestRefresh('list');
      this.citasRefresh.requestRefresh('detail');
      this.agendaRefresh.requestRefresh('agenda');
      const tipoTxt = tipoFinal ? ` · ${tipoPagoToLabel(tipoFinal)}` : '';
      void this.inAppNotify.success(
        `Pago actualizado · ${estadoPagoToLabel(this.cita.estado_pago)} · ${this.formatMonto(this.cita.monto)}${tipoTxt}`,
      );
    } catch (err) {
      this.pagoError = mapApiError(err).userMessage;
    } finally {
      this.saving = false;
    }
  }

  async resolverSesion() {
    if (!this.cita || !this.puedeGestionarSesion || this.sesionActionLoading) return;

    this.sesionActionLoading = true;
    this.errorMessage = '';

    try {
      if (this.sesionRelacionadaId) {
        this.router.navigate(['/dashboard/sesiones', this.sesionRelacionadaId]);
        return;
      }

      const sesion = await this.sesionesSvc.create({ id_cita: this.cita.id_cita });
      this.sesionRelacionadaId = sesion.id_sesion;
      this.cita = { ...this.cita, tiene_sesion: true };
      this.router.navigate(['/dashboard/sesiones', sesion.id_sesion]);
    } catch (err) {
      const apiError = mapApiError(err);

      if (apiError.status === 409) {
        try {
          const sesionExistente = await this.sesionesSvc.getByCitaId(this.cita.id_cita);
          this.sesionRelacionadaId = sesionExistente.id_sesion;
          this.cita = { ...this.cita, tiene_sesion: true };
          this.router.navigate(['/dashboard/sesiones', sesionExistente.id_sesion]);
          return;
        } catch (lookupErr) {
          this.errorMessage = mapApiError(lookupErr).userMessage;
          return;
        }
      }

      this.errorMessage = apiError.userMessage;
    } finally {
      this.sesionActionLoading = false;
    }
  }

  private async recargar() {
    this.loading = true;
    this.errorMessage = '';
    try {
      this.cita = await this.citasSvc.getById(this.citaId);
      await this.cargarSesionRelacionada();
    } catch (err) {
      this.cita = null;
      this.errorMessage = mapApiError(err).userMessage;
    } finally {
      this.loading = false;
    }
  }

  private async ejecutarCambioEstado(estado: EstadoCita) {
    if (!this.cita) return;
    this.saving = true;
    this.errorMessage = '';
    try {
      this.cita = await this.citasSvc.cambiarEstado(this.cita.id_cita, estado);
      await this.cargarSesionRelacionada();
      this.citasRefresh.requestRefresh('list');
      this.citasRefresh.requestRefresh('detail');
      this.agendaRefresh.requestRefresh('agenda');
      void this.inAppNotify.success('Estado de la cita actualizado.', {
        throttleKey: `cita-estado-${this.cita.id_cita}`,
        throttleMs: 45_000,
      });
    } catch (err) {
      this.errorMessage = mapApiError(err).userMessage;
    } finally {
      this.saving = false;
    }
  }

  private async cargarSesionRelacionada(): Promise<void> {
    if (!this.cita) {
      this.sesionRelacionadaId = null;
      return;
    }

    if (!this.cita.tiene_sesion && this.cita.estado_cita !== 'COMPLETADA') {
      this.sesionRelacionadaId = null;
      return;
    }

    try {
      const sesion = await this.sesionesSvc.getByCitaId(this.cita.id_cita);
      this.sesionRelacionadaId = sesion.id_sesion;
      this.cita = { ...this.cita, tiene_sesion: true };
    } catch (err) {
      const apiError = mapApiError(err);
      if (apiError.status === 404) {
        this.sesionRelacionadaId = null;
        this.cita = { ...this.cita, tiene_sesion: false };
        return;
      }

      this.errorMessage = apiError.userMessage;
    }
  }

  private mapToUpsertRequest(data: CitaFormData): CitaUpsertRequest {
    const body: CitaUpsertRequest = {
      id_paciente: data.id_paciente,
      fecha_inicio: data.fecha_inicio,
      fecha_fin: data.fecha_fin,
      motivo: data.motivo?.trim() || undefined,
      notas_internas: data.notas_internas?.trim() || null,
      observaciones: data.observaciones?.trim() || null,
      monto: Number(data.monto || 0),
    };

    if (data.tipoPago) {
      body.tipoPago = data.tipoPago;
    }

    return body;
  }

  private openConfirm(config: ConfirmDialogConfig, onConfirm: () => void) {
    this.confirmConfig = config;
    this.confirmCallback = onConfirm;
  }

  onConfirmConfirmed() {
    this.confirmCallback?.();
    this.confirmConfig = null;
    this.confirmCallback = null;
  }

  onConfirmCancelled() {
    this.confirmConfig = null;
    this.confirmCallback = null;
  }
}

