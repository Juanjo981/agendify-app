import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { IonicModule, NavController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { AuthService } from 'src/app/services/auth';
import { Router, RouterModule } from '@angular/router';
import { AuthorizationService } from 'src/app/auth/authorization.service';
import { HasPermissionDirective } from 'src/app/auth/has-permission.directive';
import { ConfirmDialogComponent, ConfirmDialogConfig } from 'src/app/shared/confirm-dialog/confirm-dialog.component';
import { tiempoRelativo } from '../../shared/utils/date.utils';
import { DashboardApiService } from 'src/app/services/dashboard-api.service';
import { NotificacionesApiService } from 'src/app/services/notificaciones.service.api';
import { NotificacionDto } from './dashboard.models';
import { mapApiError } from 'src/app/shared/utils/api-error.mapper';

interface DashboardNotificationItem {
  id: number;
  tipo: 'agenda' | 'equipo' | 'sistema';
  icono: string;
  titulo: string;
  descripcion: string;
  tiempo: string;
  pendiente: boolean;
  idCita?: number | null;
  idPaciente?: number | null;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule, HasPermissionDirective, ConfirmDialogComponent],
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage implements OnInit, OnDestroy {
  nombreUsuario = '';
  menuAbierto = false;
  mostrarBotonMenu = false;
  isMobile = false;
  sidebarWidth = 220;
  private resizing = false;
  private minSidebarWidth = 160;
  private maxSidebarWidth = 320;
  sidebarContraido = false;
  notificacionesAbiertas = false;
  menuInferiorAbierto = false;

  notificaciones: DashboardNotificationItem[] = [];
  notificacionesLoading = false;
  notificacionesError = '';
  solicitudesPendientesCount = 0;
  notificacionesPendientesCount = 0;

  logoutConfirmAbierto = false;
  readonly logoutConfirmConfig: ConfirmDialogConfig = {
    title: 'Cerrar sesión',
    message: 'Se cerrará tu sesión actual en Agendify.',
    confirmLabel: 'Cerrar sesión',
    cancelLabel: 'Cancelar',
    variant: 'primary',
    icon: 'log-out-outline',
  };

  constructor(
    private navCtrl: NavController,
    private authService: AuthService,
    private router: Router,
    public authSvc: AuthorizationService,
    private dashboardApi: DashboardApiService,
    private notificacionesApi: NotificacionesApiService,
  ) {}

  startResizing(event: MouseEvent) {
    this.resizing = true;
    const mouseMove = (e: MouseEvent) => {
      const newWidth = e.clientX;
      if (newWidth >= this.minSidebarWidth && newWidth <= this.maxSidebarWidth) {
        this.sidebarWidth = newWidth;
      }
    };
    const stopResize = () => {
      this.resizing = false;
      document.removeEventListener('mousemove', mouseMove);
      document.removeEventListener('mouseup', stopResize);
    };
    document.addEventListener('mousemove', mouseMove);
    document.addEventListener('mouseup', stopResize);
  }

  cantidadPendientes(): number {
    return this.notificacionesPendientesCount;
  }

  totalNotificaciones() {
    return this.cantidadPendientes();
  }

  async toggleNotificaciones() {
    this.notificacionesAbiertas = !this.notificacionesAbiertas;
    this.menuAbierto = false;

    if (this.notificacionesAbiertas && this.notificaciones.length === 0 && !this.notificacionesLoading) {
      await this.cargarDatosHeader();
    }
  }

  cerrarNotificaciones() {
    this.notificacionesAbiertas = false;
  }

  verTodasNotificaciones() {
    this.notificacionesAbiertas = false;
    this.navCtrl.navigateForward('dashboard/actividad');
  }

  @HostListener('window:resize')
  onWindowResize() {
    this.isMobile = window.innerWidth < 1025;
    this.mostrarBotonMenu = this.isMobile;
    if (!this.isMobile) {
      this.menuInferiorAbierto = false;
    }
  }

  toggleSidebar() {
    this.sidebarContraido = !this.sidebarContraido;
    this.sidebarWidth = this.sidebarContraido ? 72 : 220;
  }

  toggleMenuInferior() {
    this.menuInferiorAbierto = !this.menuInferiorAbierto;
  }

  cerrarMenuInferior() {
    this.menuInferiorAbierto = false;
  }

  irA(ruta: string) {
    this.router.navigate([ruta]);
    this.cerrarMenuInferior();
  }

  ngOnInit() {
    if (!this.authService.isLoggedIn()) {
      this.navCtrl.navigateRoot('/login');
      return;
    }

    this.nombreUsuario = this.authService.getNombre();
    this.isMobile = window.innerWidth < 1025;
    this.mostrarBotonMenu = this.isMobile;
    void this.cargarDatosHeader();
  }

  ngOnDestroy() {
    // no-op
  }

  toggleMenu() {
    this.menuAbierto = !this.menuAbierto;
    this.notificacionesAbiertas = false;
  }

  async cargarDatosHeader() {
    this.notificacionesLoading = true;
    this.notificacionesError = '';

    const [consolidadoResult, notificacionesResult] = await Promise.all([
      this.wrapResult(this.dashboardApi.getConsolidado()),
      this.wrapResult(this.notificacionesApi.getAll({ size: 8, sort: 'created_at,desc' })),
    ]);

    if (consolidadoResult.ok) {
      this.solicitudesPendientesCount = consolidadoResult.value.solicitudes_pendientes_count ?? 0;
      this.notificacionesPendientesCount = consolidadoResult.value.notificaciones_pendientes_count ?? 0;
    }

    if (notificacionesResult.ok) {
      const content = notificacionesResult.value.content ?? [];
      this.notificaciones = content.map((item: NotificacionDto) => this.mapNotificacion(item));
      if (!consolidadoResult.ok) {
        this.notificacionesPendientesCount = this.notificaciones.filter(item => item.pendiente).length;
      }
    } else {
      this.notificacionesError = mapApiError(notificacionesResult.error).userMessage;
      if (!consolidadoResult.ok) {
        this.notificaciones = [];
      }
    }

    if (!consolidadoResult.ok && !this.notificacionesError) {
      this.notificacionesError = mapApiError(consolidadoResult.error).userMessage;
    }

    this.notificacionesLoading = false;
  }

  abrirNotificacion(item: DashboardNotificationItem) {
    this.notificacionesAbiertas = false;

    if (item.idCita) {
      this.router.navigate(['/dashboard/citas', item.idCita]);
      return;
    }

    if (item.idPaciente) {
      this.router.navigate(['/dashboard/pacientes', item.idPaciente]);
      return;
    }

    this.router.navigate(['/dashboard/actividad']);
  }

  cerrarMenuUsuario() {
    this.menuAbierto = false;
  }

  irAInicio() {
    this.router.navigate(['/dashboard/inicio']);
  }

  irAMiPerfil() {
    this.menuAbierto = false;
    this.navCtrl.navigateForward('/dashboard/perfil');
  }

  irAConfiguracion() {
    this.menuAbierto = false;
    this.navCtrl.navigateForward('dashboard/configuracion');
  }

  irAConsultorio() {
    this.menuAbierto = false;
    this.navCtrl.navigateForward('/dashboard/perfil');
  }

  irAEquipo() {
    this.menuAbierto = false;
    this.navCtrl.navigateForward('dashboard/configuracion', { queryParams: { tab: 'equipo' } });
  }

  irAAyuda() {
    this.menuAbierto = false;
    this.navCtrl.navigateForward('dashboard/soporte');
  }

  confirmarSalir() {
    this.menuAbierto = false;
    this.logoutConfirmAbierto = true;
  }

  cerrarSesion() {
    this.logoutConfirmAbierto = false;
    localStorage.clear();
    this.navCtrl.navigateRoot('/login');
  }

  cancelarLogout() {
    this.logoutConfirmAbierto = false;
  }

  private mapNotificacion(item: NotificacionDto): DashboardNotificationItem {
    const tipo = this.mapTipo(item.tipo_notificacion);
    const titulo = item.asunto?.trim() || this.getTipoLabel(item.tipo_notificacion);
    const descripcion = item.mensaje_resumen?.trim() || item.destinatario?.trim() || 'Notificación del sistema';

    return {
      id: item.id_notificacion,
      tipo,
      icono: this.getTipoIcon(item.tipo_notificacion),
      titulo,
      descripcion,
      tiempo: tiempoRelativo(item.created_at),
      pendiente: item.estado_envio === 'PENDIENTE',
      idCita: item.id_cita,
      idPaciente: item.id_paciente,
    };
  }

  private mapTipo(tipo: string): 'agenda' | 'equipo' | 'sistema' {
    if (['RECORDATORIO', 'CONFIRMACION_PACIENTE', 'CANCELACION_PACIENTE', 'SOLICITUD_REPROGRAMACION'].includes(tipo)) {
      return 'agenda';
    }

    if (tipo === 'VINCULACION_RECEPCIONISTA') {
      return 'equipo';
    }

    return 'sistema';
  }

  private getTipoIcon(tipo: string): string {
    switch (tipo) {
      case 'CONFIRMACION_PACIENTE':
        return 'checkmark-circle-outline';
      case 'CANCELACION_PACIENTE':
        return 'close-circle-outline';
      case 'SOLICITUD_REPROGRAMACION':
        return 'swap-horizontal-outline';
      case 'VINCULACION_RECEPCIONISTA':
        return 'people-outline';
      case 'RECORDATORIO':
        return 'calendar-outline';
      default:
        return 'notifications-outline';
    }
  }

  private getTipoLabel(tipo: string): string {
    switch (tipo) {
      case 'CONFIRMACION_PACIENTE':
        return 'Confirmación de paciente';
      case 'CANCELACION_PACIENTE':
        return 'Cancelación de paciente';
      case 'SOLICITUD_REPROGRAMACION':
        return 'Solicitud de reprogramación';
      case 'VINCULACION_RECEPCIONISTA':
        return 'Nuevo recepcionista vinculado';
      case 'RECORDATORIO':
        return 'Recordatorio';
      default:
        return 'Notificación';
    }
  }

  private async wrapResult<T>(promise: Promise<T>): Promise<{ ok: true; value: T } | { ok: false; error: unknown }> {
    try {
      return { ok: true, value: await promise };
    } catch (error) {
      return { ok: false, error };
    }
  }
}

