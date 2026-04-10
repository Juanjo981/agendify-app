import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { DashboardApiService } from 'src/app/services/dashboard-api.service';
import { CitasApiService } from '../../citas/citas-api.service';
import {
  CitaFormData,
} from 'src/app/shared/components/cita-form-modal/cita-form-modal.component';
import { CitaFormPanelComponent } from 'src/app/shared/components/cita-form-panel/cita-form-panel.component';
import { CitaUpsertRequest } from '../../citas/models/cita.model';
import {
  DashboardAgendaCitaDto,
  DashboardAgendaHoyDto,
  DashboardCardItem,
  DashboardResumenDto,
} from '../dashboard.models';
import { mapApiError } from 'src/app/shared/utils/api-error.mapper';
import { formatFecha } from 'src/app/shared/utils/date.utils';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule, IonicModule, CitaFormPanelComponent],
  templateUrl: './dashboard-home.page.html',
  styleUrls: ['./dashboard-home.page.scss'],
})
export class DashboardHomePage implements OnInit {
  resumen: DashboardResumenDto | null = null;
  agendaHoy: DashboardAgendaHoyDto | null = null;

  resumenLoading = false;
  agendaLoading = false;
  resumenError = '';
  agendaError = '';
  showCreateCitaModal = false;
  citaSaving = false;
  citaError = '';

  constructor(
    private dashboardApi: DashboardApiService,
    private citasApi: CitasApiService,
    private router: Router,
  ) {}

  ngOnInit() {
    void this.cargarDashboard();
  }

  async cargarDashboard(event?: CustomEvent) {
    this.resumenLoading = true;
    this.agendaLoading = true;
    this.resumenError = '';
    this.agendaError = '';

    const [resumenResult, agendaResult] = await Promise.all([
      this.wrapResult(this.dashboardApi.getResumen()),
      this.wrapResult(this.dashboardApi.getAgendaHoy()),
    ]);

    if (resumenResult.ok) {
      this.resumen = resumenResult.value;
    } else {
      this.resumen = null;
      this.resumenError = mapApiError(resumenResult.error).userMessage;
    }

    if (agendaResult.ok) {
      this.agendaHoy = agendaResult.value;
    } else {
      this.agendaHoy = null;
      this.agendaError = mapApiError(agendaResult.error).userMessage;
    }

    this.resumenLoading = false;
    this.agendaLoading = false;
    event?.detail?.complete?.();
  }

  get cards(): DashboardCardItem[] {
    if (!this.resumen) return [];

    const proxima = this.proximaCita;
    const pendientesOperacion = this.agendaHoy?.citas_pendientes_hoy ?? this.resumen.citas_pendientes ?? 0;

    return [
      {
        key: 'citas_hoy',
        label: 'Citas hoy',
        value: String(this.resumen.citas_hoy ?? 0),
        icon: 'today-outline',
        tone: 'primary',
        helper: this.resumen.citas_hoy > 0 ? 'Vista operativa del día' : 'Sin actividad agendada',
      },
      {
        key: 'proxima_cita',
        label: 'Próxima cita',
        value: proxima ? this.formatTime(proxima.fecha_inicio) : 'Sin citas',
        icon: 'alarm-outline',
        tone: 'accent',
        helper: proxima ? this.formatPatientName(proxima) : 'No hay próximos turnos hoy',
      },
      {
        key: 'pendientes_operacion',
        label: 'Pendientes por atender',
        value: String(pendientesOperacion),
        icon: 'hourglass-outline',
        tone: 'warning',
        helper: pendientesOperacion > 0 ? 'Turnos que siguen abiertos hoy' : 'Día operativo en orden',
      },
      {
        key: 'ingresos',
        label: 'Ingresos acumulados',
        value: this.formatCurrency(this.resumen.ingresos_totales ?? 0),
        icon: 'wallet-outline',
        tone: 'success',
        helper: `${this.resumen.total_pacientes_activos ?? 0} pacientes activos`,
      },
    ];
  }

  get agendaItems(): DashboardAgendaCitaDto[] {
    return this.agendaHoy?.citas_del_dia ?? [];
  }

  get proximaCita(): DashboardAgendaCitaDto | null {
    return this.agendaHoy?.proxima_cita ?? this.agendaItems[0] ?? null;
  }

  get fechaHero(): string {
    return formatFecha(new Date().toISOString().slice(0, 10));
  }

  get saludo(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buen día';
    if (hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
  }

  get heroSummary(): string {
    if (this.agendaLoading || this.resumenLoading) {
      return 'Actualizando la vista operativa del consultorio.';
    }

    const citasHoy = this.resumen?.citas_hoy ?? 0;
    const pendientes = this.agendaHoy?.citas_pendientes_hoy ?? this.resumen?.citas_pendientes ?? 0;
    const proxima = this.proximaCita;

    if (!citasHoy) {
      return 'No hay citas programadas hoy. Buen momento para revisar pendientes y preparar la semana.';
    }

    if (proxima) {
      return `${citasHoy} citas previstas hoy, ${pendientes} pendientes y próxima atención a las ${this.formatTime(proxima.fecha_inicio)}.`;
    }

    return `${citasHoy} citas previstas hoy y ${pendientes} siguen pendientes por atender.`;
  }

  get agendaHeadline(): string {
    const count = this.agendaItems.length;
    if (!count) return 'Sin citas programadas para hoy';
    return `${count} cita${count === 1 ? '' : 's'} en la agenda de hoy`;
  }

  get agendaCaption(): string {
    if (!this.agendaHoy) return 'Actividad prevista para la jornada actual';
    return `${this.formatDate(this.agendaHoy.fecha_hoy)} · seguimiento operativo del consultorio`;
  }

  get confirmacionesPendientes(): number {
    return this.agendaHoy?.citas_pendientes_hoy ?? this.resumen?.citas_pendientes ?? 0;
  }

  get pagosPendientes(): number {
    return this.agendaItems.filter(cita => cita.estado_cita === 'CONFIRMADA' || cita.estado_cita === 'PENDIENTE').length;
  }

  get quickActions(): Array<{ label: string; helper: string; icon: string; action: () => void; primary?: boolean }> {
    return [
      {
        label: 'Nueva cita',
        helper: 'Abrir el formulario real de alta',
        icon: 'add-circle-outline',
        action: () => this.abrirNuevaCita(),
        primary: true,
      },
      {
        label: 'Nuevo paciente',
        helper: 'Abrir pacientes y registrar expediente',
        icon: 'person-add-outline',
        action: () => this.irAPacientes(),
      },
      {
        label: 'Abrir agenda',
        helper: 'Revisar el calendario completo',
        icon: 'calendar-outline',
        action: () => this.irAAgenda(),
      },
      {
        label: 'Registrar sesión',
        helper: 'Entrar a sesiones clínicas',
        icon: 'pulse-outline',
        action: () => this.irASesiones(),
      },
    ];
  }

  get alertItems(): Array<{ label: string; value: string; helper: string; tone: 'warning' | 'success' | 'neutral' }> {
    return [
      {
        label: 'Pacientes por confirmar',
        value: String(this.confirmacionesPendientes),
        helper: this.confirmacionesPendientes > 0 ? 'Conviene revisar confirmación y asistencia' : 'Sin confirmaciones pendientes',
        tone: this.confirmacionesPendientes > 0 ? 'warning' : 'success',
      },
      {
        label: 'Pagos por revisar',
        value: String(this.pagosPendientes),
        helper: this.pagosPendientes > 0 ? 'Citas activas que pueden requerir seguimiento' : 'Sin pagos operativos urgentes',
        tone: this.pagosPendientes > 0 ? 'neutral' : 'success',
      },
      {
        label: 'Próxima atención',
        value: this.proximaCita ? this.formatTime(this.proximaCita.fecha_inicio) : 'Libre',
        helper: this.proximaCita ? this.formatPatientName(this.proximaCita) : 'No hay más citas inmediatas hoy',
        tone: this.proximaCita ? 'neutral' : 'success',
      },
    ];
  }

  get ritmoItems(): Array<{ label: string; value: number; tone: 'primary' | 'warning' | 'success' | 'danger' }> {
    return [
      { label: 'Confirmadas', value: this.agendaHoy?.citas_confirmadas_hoy ?? 0, tone: 'primary' },
      { label: 'Pendientes', value: this.agendaHoy?.citas_pendientes_hoy ?? 0, tone: 'warning' },
      { label: 'Completadas', value: this.agendaHoy?.citas_completadas_hoy ?? 0, tone: 'success' },
      { label: 'Canceladas', value: this.agendaHoy?.citas_canceladas_hoy ?? 0, tone: 'danger' },
    ];
  }

  formatDate(iso: string): string {
    if (!iso) return '-';
    const dateOnly = iso.includes('T') ? iso.split('T')[0] : iso;
    return formatFecha(dateOnly);
  }

  formatTime(iso: string): string {
    if (!iso) return '-';
    const date = new Date(iso);
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }

  formatPatientName(cita: DashboardAgendaCitaDto): string {
    return `${cita.paciente_apellido}, ${cita.paciente_nombre}`;
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 0,
    }).format(Number(value || 0));
  }

  getEstadoClass(estado: string): string {
    switch (estado) {
      case 'CONFIRMADA':
        return 'is-confirmada';
      case 'COMPLETADA':
        return 'is-completada';
      case 'CANCELADA':
        return 'is-cancelada';
      case 'NO_ASISTIO':
        return 'is-no-asistio';
      default:
        return 'is-pendiente';
    }
  }

  verCita(cita: DashboardAgendaCitaDto) {
    this.router.navigate(['/dashboard/citas', cita.id_cita]);
  }

  irAAgenda() {
    this.router.navigate(['/dashboard/agenda']);
  }

  abrirNuevaCita() {
    this.citaError = '';
    this.showCreateCitaModal = true;
  }

  cerrarNuevaCita() {
    this.showCreateCitaModal = false;
    this.citaSaving = false;
  }

  async onNuevaCitaGuardada(data: CitaFormData) {
    this.citaSaving = true;
    this.citaError = '';

    try {
      await this.citasApi.create(this.mapFormToRequest(data));
      this.cerrarNuevaCita();
      await this.cargarDashboard();
    } catch (error) {
      this.citaError = mapApiError(error).userMessage;
      this.citaSaving = false;
    }
  }

  irACitas() {
    this.router.navigate(['/dashboard/citas']);
  }

  irAPacientes() {
    this.router.navigate(['/dashboard/pacientes']);
  }

  irASesiones() {
    this.router.navigate(['/dashboard/sesiones']);
  }

  private mapFormToRequest(data: CitaFormData): CitaUpsertRequest {
    return {
      id_paciente: data.id_paciente,
      fecha_inicio: data.fecha_inicio,
      fecha_fin: data.fecha_fin,
      motivo: data.motivo?.trim() || undefined,
      notas_internas: data.notas_internas?.trim() || null,
      observaciones: data.observaciones?.trim() || null,
      monto: data.monto,
    };
  }

  private async wrapResult<T>(promise: Promise<T>): Promise<{ ok: true; value: T } | { ok: false; error: unknown }> {
    try {
      return { ok: true, value: await promise };
    } catch (error) {
      return { ok: false, error };
    }
  }
}
