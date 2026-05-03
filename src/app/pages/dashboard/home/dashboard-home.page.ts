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
  DashboardResumenDto,
} from '../dashboard.models';
import { mapApiError } from 'src/app/shared/utils/api-error.mapper';
import { formatFecha } from 'src/app/shared/utils/date.utils';

interface HomeQuickAction {
  label: string;
  helper: string;
  icon: string;
  action: () => void;
  primary?: boolean;
}

interface HomeStatusItem {
  label: string;
  value: string;
  helper: string;
  tone: 'primary' | 'success' | 'warning' | 'neutral';
}

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

  get agendaItems(): DashboardAgendaCitaDto[] {
    return this.agendaHoy?.citas_del_dia ?? [];
  }

  get agendaPreview(): DashboardAgendaCitaDto[] {
    return this.agendaItems.slice(0, 6);
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

  get todayStatus(): { title: string; description: string } {
    if (this.agendaLoading || this.resumenLoading) {
      return {
        title: 'Estamos preparando tu día.',
        description: 'Actualizando agenda, pendientes y señales operativas.',
      };
    }

    const citasHoy = this.resumen?.citas_hoy ?? 0;
    const pendientes = this.agendaHoy?.citas_pendientes_hoy ?? this.resumen?.citas_pendientes ?? 0;
    const proxima = this.proximaCita;

    if (!citasHoy) {
      return {
        title: 'Agenda despejada.',
        description: 'Buen momento para programar nuevas citas o revisar expedientes pendientes.',
      };
    }

    if (proxima) {
      return {
        title: `Tu próxima atención es a las ${this.formatTime(proxima.fecha_inicio)}.`,
        description: `${citasHoy} citas hoy y ${pendientes} pendientes por atender.`,
      };
    }

    return {
      title: 'Tu agenda de hoy está activa.',
      description: `${citasHoy} citas previstas y ${pendientes} pendientes por resolver.`,
    };
  }

  get nextActionTitle(): string {
    if (this.agendaLoading) return 'Calculando prioridad';
    if (this.proximaCita) return 'Atiende lo que sigue';
    return 'Crea la siguiente prioridad';
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

  get primaryQuickActions(): HomeQuickAction[] {
    return [
      {
        label: 'Nueva cita',
        helper: 'Programa en segundos',
        icon: 'add-circle-outline',
        action: () => this.abrirNuevaCita(),
        primary: true,
      },
      {
        label: 'Agenda',
        helper: 'Revisa el calendario',
        icon: 'calendar-outline',
        action: () => this.irAAgenda(),
      },
      {
        label: 'Pacientes',
        helper: 'Expedientes y seguimiento',
        icon: 'people-outline',
        action: () => this.irAPacientes(),
      },
    ];
  }

  get consultorioStats(): HomeStatusItem[] {
    const citasHoy = this.agendaHoy?.total_citas_hoy ?? this.resumen?.citas_hoy ?? 0;
    const pendientes = this.agendaHoy?.citas_pendientes_hoy ?? this.resumen?.citas_pendientes ?? 0;
    const completadas = this.agendaHoy?.citas_completadas_hoy ?? 0;
    const pacientesActivos = this.resumen?.total_pacientes_activos ?? 0;

    return [
      {
        label: 'Citas hoy',
        value: String(citasHoy),
        helper: citasHoy > 0 ? 'Carga operativa del día' : 'Sin actividad agendada',
        tone: citasHoy > 0 ? 'primary' : 'neutral',
      },
      {
        label: 'Pendientes',
        value: String(this.confirmacionesPendientes),
        helper: pendientes > 0 ? 'Requieren revisión' : 'Todo en orden',
        tone: pendientes > 0 ? 'warning' : 'success',
      },
      {
        label: 'Completadas',
        value: String(completadas),
        helper: completadas > 0 ? 'Atenciones cerradas hoy' : 'Aún sin cierres',
        tone: completadas > 0 ? 'success' : 'neutral',
      },
      {
        label: 'Pacientes activos',
        value: String(pacientesActivos),
        helper: 'Base actual de seguimiento',
        tone: 'neutral',
      },
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
