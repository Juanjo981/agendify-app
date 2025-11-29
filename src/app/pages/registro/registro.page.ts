import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, NavController } from '@ionic/angular';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { UsuarioService } from 'src/app/services/usuario';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    ReactiveFormsModule,
    RouterModule
  ],
  templateUrl: './registro.page.html',
  styleUrls: ['./registro.page.scss']
})
export class RegistroPage {
  registroForm: FormGroup;
  verPassword = false;

  constructor(
    private fb: FormBuilder,
    private navCtrl: NavController,
    private usuarioService: UsuarioService
  ) {
    this.registroForm = this.fb.group({
      nombre: ['', Validators.required],
      apellido: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      usuario: ['', Validators.required],
      contrasena: ['', Validators.required],
      fecha_nacimiento: ['', Validators.required],
      domicilio: [''],
      numero_telefono: ['', Validators.required],
      idRol: [3, Validators.required], // Por defecto Profesional
      especialidad: ['']
    });

    // Revalidar "especialidad" cuando cambia el rol
    this.registroForm.get('idRol')?.valueChanges.subscribe((idRol) => {
      const especialidadCtrl = this.registroForm.get('especialidad');
      if (idRol === 3) {
        especialidadCtrl?.setValidators([Validators.required]);
      } else {
        especialidadCtrl?.clearValidators();
        especialidadCtrl?.setValue('');
      }
      especialidadCtrl?.updateValueAndValidity();
    });
  }

  togglePassword() {
    this.verPassword = !this.verPassword;
  }

  goToLogin() {
    this.navCtrl.navigateBack('/login');
  }

  registrarse() {
    if (this.registroForm.invalid) {
      this.registroForm.markAllAsTouched();
      return;
    }

    const formValue = this.registroForm.value;

    const usuarioDTO = {
      nombre: formValue.nombre,
      apellido: formValue.apellido,
      email: formValue.email,
      usuario: formValue.usuario,
      contrasena: formValue.contrasena,
      fecha_nacimiento: formValue.fecha_nacimiento,
      domicilio: formValue.domicilio,
      numero_telefono: formValue.numero_telefono,
      activo: true,
      idRol: formValue.idRol,
      especialidad: formValue.idRol === 3 ? formValue.especialidad : ''
    };

    this.usuarioService.registrarUsuario(usuarioDTO).subscribe({
      next: () => {
        console.log('Usuario registrado con éxito');
        this.navCtrl.navigateRoot('/login');
      },
      error: (err) => {
        console.error('Error al registrar usuario:', err);
        // Aquí podrías mostrar un toast o alerta
      }
    });
  }
}
