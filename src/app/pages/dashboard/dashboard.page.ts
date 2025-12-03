import { Component, OnInit } from '@angular/core';
import { IonicModule, NavController, AlertController, Platform } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { AuthService } from 'src/app/services/auth';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule],
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage implements OnInit {
  nombreUsuario = '';
  menuAbierto: boolean = false;
  mostrarBotonMenu: boolean = false;
  sidebarWidth = 220;
  private resizing = false;
  private minSidebarWidth = 160;
  private maxSidebarWidth = 320;
  sidebarContraido = false;
  notificacionesAbiertas = false;
  menuInferiorAbierto = false;

  // Tabs
  activeTab: 'messages' | 'events' | 'status' = 'messages';
  activeList: any[] = [];

  // Datos de prueba (puedes reemplazar después por backend)
  notificacionesMessages = [
    { text: 'Nuevo mensaje de Ana', fecha: 'Hace 2 min' },
    { text: 'Tu cita ha sido confirmada', fecha: 'Hace 10 min' },
    { text: 'Tu cita ha sido cancelada', fecha: 'Ayer' },
    
  ];

  notificacionesEvents = [
    { text: 'La sesión de Pedro comienza en 1 hora', fecha: 'Hoy 2:00 PM' },
    { text: 'Recordatorio: grupo semanal mañana', fecha: 'Ayer' },
  ];

  notificacionesStatus = [
    { text: 'Servidor sincronizado correctamente', fecha: 'Hace 5 min' },
    { text: 'Respaldo automático completado', fecha: 'Hoy 7:00 AM' },
  ];

  


  constructor(
    private navCtrl: NavController,
    private authService: AuthService,
    private alertCtrl: AlertController,
    private platform: Platform
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

  changeTab(tab: 'messages' | 'events' | 'status') {
    this.activeTab = tab;
    this.updateActiveList();
  }

  updateActiveList() {
    if (this.activeTab === 'messages') {
      this.activeList = this.notificacionesMessages;
    }
    else if (this.activeTab === 'events') {
      this.activeList = this.notificacionesEvents;
    }
    else {
      this.activeList = this.notificacionesStatus;
    }
  }

  totalNotificaciones() {
    return this.notificacionesMessages.length + this.notificacionesEvents.length + this.notificacionesStatus.length;
  }

  toggleNotificaciones() {
    this.notificacionesAbiertas = !this.notificacionesAbiertas;
    this.menuAbierto = false; // opcional: cierra el menú de usuario
  }

  verTodasNotificaciones() {
    this.notificacionesAbiertas = false;
    // Aquí navegas o abres una pantalla de historial si lo deseas
    console.log('Ver todas las notificaciones');
  }

  toggleSidebar() {
    this.sidebarContraido = !this.sidebarContraido;

    // Cambia el ancho del sidebar con alguna lógica (tú ya tienes sidebarWidth)
    this.sidebarWidth = this.sidebarContraido ? 72 : 220;
  }

  toggleMenuInferior() {
    this.menuInferiorAbierto = !this.menuInferiorAbierto;
  }

  ngOnInit() {
    // Redirigir si no ha iniciado sesión
    if (!this.authService.isLoggedIn()) {
      this.navCtrl.navigateRoot('/login');
      return;
    }

    this.nombreUsuario = this.authService.getNombre();

    // Mostrar botón menú si el ancho es menor a 768px (móvil)
    this.mostrarBotonMenu = this.platform.width() < 768;

    this.updateActiveList();
  }

  toggleMenu() {
    this.menuAbierto = !this.menuAbierto;
    this.notificacionesAbiertas = false;
  }

  irAMiPerfil() {
    this.menuAbierto = false;
    this.navCtrl.navigateForward('/dashboard/perfil');
  }

  irAConfiguracion() {
    this.menuAbierto = false;
    this.navCtrl.navigateForward('dashboard/configuracion');
  }

  cerrarSesion() {
    this.menuAbierto = false;
    localStorage.clear(); // o sessionStorage.clear()
    this.navCtrl.navigateRoot('/login');
  }

  async confirmarSalir() {
    const alert = await this.alertCtrl.create({
      header: '¿Estás seguro?',
      message: 'Agendify te espera pronto',
      cssClass: 'custom-alert',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'alert-cancel',
        },
        {
          text: 'Salir',
          handler: () => this.cerrarSesion(),
          cssClass: 'alert-exit',
        },
      ],
    });

    await alert.present();
  }
}
