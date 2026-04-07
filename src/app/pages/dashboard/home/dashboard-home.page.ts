import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { DashboardApiService } from 'src/app/services/dashboard-api.service';
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
  imports: [CommonModule, IonicModule],
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

  constructor(
    private dashboardApi: DashboardApiService,
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

    return [
      {
        key: 'citas_hoy',
        label: 'Citas hoy',
        value: String(this.resumen.citas_hoy ?? 0),
        icon: 'today-outline',
        tone: 'primary',
        helper: 'Agenda activa del día',
      },
      {
        key: 'citas_pendientes',
        label: 'Pendientes',
        value: String(this.resumen.citas_pendientes ?? 0),
        icon: 'time-outline',
        tone: 'warning',
        helper: 'Citas por confirmar o atender',
      },
      {
        key: 'pacientes_activos',
        label: 'Pacientes activos',
        value: String(this.resumen.total_pacientes_activos ?? 0),
        icon: 'people-outline',
        tone: 'success',
        helper: `${this.resumen.total_pacientes ?? 0} pacientes totales`,
      },
      {
        key: 'sesiones',
        label: 'Sesiones registradas',
        value: String(this.resumen.total_sesiones ?? 0),
        icon: 'pulse-outline',
        tone: 'neutral',
        helper: this.formatCurrency(this.resumen.ingresos_totales ?? 0),
      },
    ];
  }

  get agendaItems(): DashboardAgendaCitaDto[] {
    return this.agendaHoy?.citas_del_dia ?? [];
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

  irACitas() {
    this.router.navigate(['/dashboard/citas']);
  }

  private async wrapResult<T>(promise: Promise<T>): Promise<{ ok: true; value: T } | { ok: false; error: unknown }> {
    try {
      return { ok: true, value: await promise };
    } catch (error) {
      return { ok: false, error };
    }
  }
}

