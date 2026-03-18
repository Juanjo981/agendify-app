import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { IonicModule, NavController, Platform } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { AuthService } from 'src/app/services/auth';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AuthorizationService } from 'src/app/auth/authorization.service';
import { HasPermissionDirective } from 'src/app/auth/has-permission.directive';
import { ConfirmDialogComponent, ConfirmDialogConfig } from 'src/app/shared/confirm-dialog/confirm-dialog.component';
import { SolicitudReprogramacionService } from '../citas/solicitud-reprogramacion.service.mock';
import { SolicitudReprogramacion } from 'src/app/shared/models/solicitud-reprogramacion.model';
import { SolicitudReprogramacionModalComponent } from 'src/app/shared/components/solicitud-reprogramacion-modal/solicitud-reprogramacion-modal.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule, HasPermissionDirective, ConfirmDialogComponent, SolicitudReprogramacionModalComponent],
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage implements OnInit, OnDestroy {
  nombreUsuario = '';
  menuAbierto: boolean = false;
  mostrarBotonMenu: boolean = false;
  isMobile: boolean = false;          // true when viewport < 1025px
  sidebarWidth = 220;
  private resizing = false;
  private minSidebarWidth = 160;
  private maxSidebarWidth = 320;
  sidebarContraido = false;
  notificacionesAbiertas = false;
  menuInferiorAbierto = false;

  // ─── Solicitudes de reprogramación ────────────────────────────────────────
  solicitudSeleccionada: SolicitudReprogramacion | null = null;
  showSolicitudModal = false;

  notificaciones: {
    tipo: 'agenda' | 'equipo' | 'sistema' | 'reprogramar';
    icono: string;
    titulo: string;
    descripcion: string;
    tiempo: string;
    leida: boolean;
    solicitudId?: number;
  }[] = [
    {
      tipo: 'agenda',
      icono: 'calendar-outline',
      titulo: 'Cita próxima',
      descripcion: 'Tienes una cita con Carlos Méndez hoy a las 4:00 PM.',
      tiempo: 'Hace 10 min',
      leida: false,
    },
    {
      tipo: 'agenda',
      icono: 'calendar-outline',
      titulo: 'Nueva cita registrada',
      descripcion: 'Se agendó una consulta para María López el 15 de marzo.',
      tiempo: 'Hace 1 hora',
      leida: false,
    },
    {
      tipo: 'agenda',
      icono: 'refresh-outline',
      titulo: 'Cita reprogramada',
      descripcion: 'La cita de Pedro García fue movida al 18 de marzo a las 11:00 AM.',
      tiempo: 'Ayer',
      leida: false,
    },
    {
      tipo: 'equipo',
      icono: 'people-outline',
      titulo: 'Recepcionista vinculado',
      descripcion: 'Laura Torres se unió al consultorio como recepcionista.',
      tiempo: 'Hace 2 días',
      leida: true,
    },
    {
      tipo: 'sistema',
      icono: 'settings-outline',
      titulo: 'Configuración actualizada',
      descripcion: 'Los horarios del consultorio fueron actualizados correctamente.',
      tiempo: 'Hace 3 días',
      leida: true,
    },
  ];

  


  // ── Logout confirmation dialog state ──────────────────────────────────────
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
    private platform: Platform,
    private router: Router,
    public authSvc: AuthorizationService,
    private solicitudSvc: SolicitudReprogramacionService,
  ) { }

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

  cantidadSinLeer(): number {
    return this.notificaciones.filter(n => !n.leida).length;
  }

  marcarLeida(index: number) {
    this.notificaciones[index].leida = true;
  }

  totalNotificaciones() {
    return this.cantidadSinLeer();
  }

  toggleNotificaciones() {
    this.notificacionesAbiertas = !this.notificacionesAbiertas;
    this.menuAbierto = false;
  }

  cerrarNotificaciones() {
    this.notificacionesAbiertas = false;
  }

  verTodasNotificaciones() {
    this.notificacionesAbiertas = false;
    this.navCtrl.navigateForward('dashboard/actividad');
  }

  // ─── Responsive: actualiza isMobile al redimensionar el viewport ────────
  @HostListener('window:resize')
  onWindowResize() {
    this.isMobile = window.innerWidth < 1025;
    this.mostrarBotonMenu = this.isMobile;
    // Cierra el menú inferior si el usuario amplía la ventana a desktop
    if (!this.isMobile) {
      this.menuInferiorAbierto = false;
    }
  }

  toggleSidebar() {
    this.sidebarContraido = !this.sidebarContraido;

    // Cambia el ancho del sidebar con alguna lógica (tú ya tienes sidebarWidth)
    this.sidebarWidth = this.sidebarContraido ? 72 : 220;
  }

  private routerSub?: Subscription;

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
    // Redirigir si no ha iniciado sesión
    if (!this.authService.isLoggedIn()) {
      this.navCtrl.navigateRoot('/login');
      return;
    }

    this.nombreUsuario = this.authService.getNombre();

    // Estado inicial basado en el ancho actual
    this.isMobile = window.innerWidth < 1025;
    this.mostrarBotonMenu = this.isMobile;

    // Prepend solicitudes pendientes al panel de notificaciones
    this.cargarSolicitudesEnNotificaciones();
  }

  ngOnDestroy() {
    this.routerSub?.unsubscribe();
    // HostListener se limpia automáticamente por Angular, nada extra necesario
  }

  toggleMenu() {
    this.menuAbierto = !this.menuAbierto;
    this.notificacionesAbiertas = false;
  }

  // ─── Solicitudes de reprogramación ───────────────────────────────────────

  private cargarSolicitudesEnNotificaciones(): void {
    const solicitudes = this.solicitudSvc.getPendientes();
    const nuevas = solicitudes.map(s => ({
      tipo:       'reprogramar' as const,
      icono:      'swap-horizontal-outline',
      titulo:     'Solicitud de reprogramación',
      descripcion: `${s.pacienteNombre} quiere cambiar su cita del ${this.formatFechaCita(s.fechaCita)} • ${s.horaCita}`,
      tiempo:     this.tiempoRelativo(s.fechaSolicitud),
      leida:      false,
      solicitudId: s.idSolicitud,
    }));
    // Solicitudes always appear first, before regular notifications
    this.notificaciones = [...nuevas, ...this.notificaciones];
  }

  abrirSolicitud(solicitudId: number): void {
    const s = this.solicitudSvc.getById(solicitudId);
    if (!s) return;
    this.solicitudSeleccionada = s;
    this.showSolicitudModal = true;
    this.notificacionesAbiertas = false;
  }

  onSolicitudAceptada(): void {
    if (!this.solicitudSeleccionada) return;
    this.solicitudSvc.aceptar(this.solicitudSeleccionada.idSolicitud);
    this.eliminarNotificacionSolicitud(this.solicitudSeleccionada.idSolicitud);
    this.showSolicitudModal = false;
    this.solicitudSeleccionada = null;
    // Open the agenda so the professional can adjust the appointment
    this.router.navigate(['/dashboard/agenda']);
  }

  onSolicitudRechazada(motivo: string): void {
    if (!this.solicitudSeleccionada) return;
    this.solicitudSvc.rechazar(this.solicitudSeleccionada.idSolicitud);
    this.eliminarNotificacionSolicitud(this.solicitudSeleccionada.idSolicitud);
    this.showSolicitudModal = false;
    this.solicitudSeleccionada = null;
  }

  onVerAgendaDesdeModal(): void {
    this.showSolicitudModal = false;
    this.solicitudSeleccionada = null;
    this.router.navigate(['/dashboard/agenda']);
  }

  cerrarSolicitudModal(): void {
    this.showSolicitudModal = false;
    this.solicitudSeleccionada = null;
  }

  private eliminarNotificacionSolicitud(solicitudId: number): void {
    this.notificaciones = this.notificaciones.filter(n => n.solicitudId !== solicitudId);
  }

  private tiempoRelativo(isoDate: string): string {
    const diff = Date.now() - new Date(isoDate).getTime();
    const mins  = Math.floor(diff / 60000);
    if (mins < 60)  return `Hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Hace ${hours}h`;
    const days = Math.floor(hours / 24);
    return `Hace ${days} día${days > 1 ? 's' : ''}`;
  }

  private formatFechaCita(fecha: string): string {
    const d = new Date(fecha + 'T00:00');
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
  }

  cerrarMenuUsuario() {
    this.menuAbierto = false;
  }

  irAAgenda() {
    if (this.router.url.startsWith('/dashboard/agenda')) {
      document.querySelector('ion-content')?.scrollToTop(300);
    } else {
      this.router.navigate(['/dashboard/agenda']);
    }
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
}
