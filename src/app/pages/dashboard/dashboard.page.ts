import { Component } from '@angular/core';
import { IonicModule, NavController, AlertController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { AuthService } from 'src/app/services/auth';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [IonicModule, CommonModule],
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage {
  nombreUsuario: string = ''; // ← Aquí puedes traerlo del login o sessionStorage
  menuAbierto: boolean = false;

  constructor(private navCtrl: NavController, private authService: AuthService, private alertCtrl: AlertController) { }

  ngOnInit() {
    if (!this.authService.isLoggedIn()) {
      this.navCtrl.navigateRoot('/login');
      return;
    }

    this.nombreUsuario = this.authService.getNombre();
  }

  async confirmarSalir() {
    const alert = await this.alertCtrl.create({
      header: '¿Estás seguro?',
      message: '¿Quieres cerrar sesión?',
      cssClass: 'custom-alert',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'alert-cancel'
        },
        {
          text: 'Salir',
          handler: () => {
            this.cerrarSesion();
          },
          cssClass: 'alert-exit'
        }
      ]
    });

    await alert.present();
  }

  toggleMenu() {
    this.menuAbierto = !this.menuAbierto;
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
    // Aquí puedes limpiar el token o datos del usuario
    localStorage.clear(); // o sessionStorage.clear()
    this.navCtrl.navigateRoot('/login');
  }
}
