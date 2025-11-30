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

  notificaciones: string[] = [
    'Cita nueva agendada',
    'Paciente Juan canceló su cita',
    'Recordatorio enviado',
    'Archivo subido por Ana',
    'Confirmación de pago recibida',
    'Cita reprogramada por Laura'
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

  ngOnInit() {
    // Redirigir si no ha iniciado sesión
    if (!this.authService.isLoggedIn()) {
      this.navCtrl.navigateRoot('/login');
      return;
    }

    this.nombreUsuario = this.authService.getNombre();

    // Mostrar botón menú si el ancho es menor a 768px (móvil)
    this.mostrarBotonMenu = this.platform.width() < 768;
  }

  toggleMenu() {
    this.menuAbierto = !this.menuAbierto;
    this.notificacionesAbiertas = false;
  }

  irAMiPerfil() {
    this.menuAbierto = false;
    this.navCtrl.navigateForward('/perfil');
  }

  irAConfiguracion() {
    this.menuAbierto = false;
    this.navCtrl.navigateForward('/configuracion');
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
