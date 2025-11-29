import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AlertController, NavController } from '@ionic/angular';
import { AuthService } from 'src/app/services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule],
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage {
  loginForm: FormGroup;

  verPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private navCtrl: NavController,
    private alertCtrl: AlertController
  ) {
    this.loginForm = this.fb.group({
      usuario: ['', Validators.required],
      contrasena: ['', Validators.required],
    });
  }

  async login() {
    const { usuario, contrasena } = this.loginForm.value;
    try {
      await this.authService.login(usuario, contrasena);
      this.navCtrl.navigateRoot('/dashboard');
    } catch (err) {
      const alert = await this.alertCtrl.create({
        header: 'Error',
        message: 'Usuario o contraseña incorrectos',
        buttons: ['OK'],
      });
      await alert.present();
    }
  }

  ngOnInit() {
  this.loginForm.setValue({
    usuario: '',
    contrasena: ''
  });// limpia campos al cargar
}

togglePassword() {
  this.verPassword = !this.verPassword;
}


  goToRegister() {
  this.navCtrl.navigateForward('/registro'); // o usa Router si prefieres
}
}
