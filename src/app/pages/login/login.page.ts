import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, NavController } from '@ionic/angular';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from 'src/app/services/auth';
import { ForgotPasswordComponent } from 'src/app/shared/components/forgot-password/forgot-password.component';
import { mapApiError } from 'src/app/shared/utils/api-error.mapper';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule, FormsModule, ForgotPasswordComponent],
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {
  loginForm: FormGroup;

  verPassword = false;
  cargando = false;
  errorLogin = '';
  recordarme = false;
  mostrarForgotPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private navCtrl: NavController,
  ) {
    this.loginForm = this.fb.group({
      usuario: ['', Validators.required],
      contrasena: ['', Validators.required],
    });
  }

  ngOnInit() {
    this.loginForm.setValue({ usuario: '', contrasena: '' });
  }

  async login() {
    if (this.loginForm.invalid || this.cargando) return;

    this.cargando = true;
    this.errorLogin = '';

    const { usuario, contrasena } = this.loginForm.value;
    try {
      // 1. Autenticar → guarda access_token y refresh_token
      await this.authService.login(usuario, contrasena);

      // 2. Obtener perfil completo desde /api/auth/me → pobla SessionService
      await this.authService.getCurrentUser();

      // 3. Navegar al dashboard
      this.navCtrl.navigateRoot('/dashboard');
    } catch (err) {
      this.errorLogin = mapApiError(err).userMessage;
    } finally {
      this.cargando = false;
    }
  }

  togglePassword() {
    this.verPassword = !this.verPassword;
  }

  goToRegister() {
    this.navCtrl.navigateForward('/registro');
  }

  openForgotPassword() {
    this.mostrarForgotPassword = true;
  }

  closeForgotPassword() {
    this.mostrarForgotPassword = false;
  }
}
