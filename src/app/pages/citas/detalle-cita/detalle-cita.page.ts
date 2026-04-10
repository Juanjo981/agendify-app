import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DestroyRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
  durationInMinutes,
  toDatePart,
  toIsoDateTime,
  toTimePart,
} from '../models/cita.model';
import { mapApiError } from 'src/app/shared/utils/api-error.mapper';
import { SesionesApiService } from '../../sesiones/sesiones-api.service';
import { AgendaRefreshService, CitasRefreshService } from '../../../shared/refresh/dashboard-module-refresh.services';

@Component({
  selector: 'app-detalle-cita',
  templateUrl: './detalle-cita.page.html',
  styleUrls: ['./detalle-cita.page.scss'],
  standalone: true,
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    EstadoBadgeComponent,
    PagoBadgeComponent,
    CitaFormModalComponent,
    ReprogramarModalComponent,
    ConfirmDialogComponent,
  ],
})
export class DetalleCitaPage implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
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

  pagoForm: { estado_pago: EstadoPago; monto: number } = {
    estado_pago: 'PENDIENTE',
    monto: 0,
  };
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
    return `€${Number(n || 0).toFixed(2)}`;
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
    return !['COMPLETADA', 'CANCELADA', 'NO_ASISTIO'].includes(this.cita.estado_cita);
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
      this.cita = await this.citasSvc.update(this.cita.id_cita, body);
      this.showReprogramarModal = false;
      await this.cargarSesionRelacionada();
      this.citasRefresh.requestRefresh('list');
      this.citasRefresh.requestRefresh('detail');
      this.agendaRefresh.requestRefresh('agenda');
    } catch (err) {
      this.errorMessage = mapApiError(err).userMessage;
    } finally {
      this.saving = false;
    }
  }

  abrirPagoForm() {
    if (!this.cita) return;
    this.pagoForm = {
      estado_pago: this.cita.estado_pago,
      monto: Number(this.cita.monto || 0),
    };
    this.pagoError = '';
    this.showPagoForm = true;
  }

  async guardarPago() {
    if (!this.cita) return;
    if (!this.pagoForm.estado_pago) {
      this.pagoError = 'Selecciona un estado de pago';
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    try {
      this.cita = await this.citasSvc.updatePago(this.cita.id_cita, {
        estado_pago: this.pagoForm.estado_pago,
        monto: Number(this.pagoForm.monto || 0),
      });
      this.showPagoForm = false;
      this.citasRefresh.requestRefresh('list');
      this.citasRefresh.requestRefresh('detail');
      this.agendaRefresh.requestRefresh('agenda');
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
    } catch (err) {
      this.errorMessage = mapApiError(err).userMessage;
    } finally {
      this.saving = false;
    }
  }

  private async cargarSesionRelacionada() {
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
    return {
      id_paciente: data.id_paciente,
      fecha_inicio: data.fecha_inicio,
      fecha_fin: data.fecha_fin,
      motivo: data.motivo?.trim() || undefined,
      notas_internas: data.notas_internas?.trim() || null,
      observaciones: data.observaciones?.trim() || null,
      monto: Number(data.monto || 0),
    };
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

