import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, NavController } from '@ionic/angular';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { UsuarioService } from 'src/app/services/usuario';
import { RolUsuario } from 'src/app/shared/models/rol.model';
import { PERMISOS_DEFAULT_RECEPCIONISTA } from 'src/app/shared/models/permisos.model';
import { UsuarioRegistroDto } from 'src/app/shared/models/usuario.model';
import { VinculacionMockService } from 'src/app/services/vinculacion.mock';

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
  errorCodigo = '';

  readonly RolUsuario = RolUsuario;

  constructor(
    private fb: FormBuilder,
    private navCtrl: NavController,
    private usuarioService: UsuarioService,
    private vinculacionSvc: VinculacionMockService
  ) {
    this.registroForm = this.fb.group({
      nombre:            ['', Validators.required],
      apellido:          ['', Validators.required],
      email:             ['', [Validators.required, Validators.email]],
      usuario:           ['', Validators.required],
      contrasena:        ['', Validators.required],
      fecha_nacimiento:  ['', Validators.required],
      domicilio:         [''],
      numero_telefono:   ['', Validators.required],
      idRol:             [RolUsuario.PROFESIONAL, Validators.required],
      especialidad:      ['', Validators.required],
      codigoVinculacion: [''],
    });

    // Revalidar campos condicionales cuando cambia el rol
    this.registroForm.get('idRol')?.valueChanges.subscribe((rol: RolUsuario) => {
      const especialidadCtrl      = this.registroForm.get('especialidad');
      const codigoCtrl            = this.registroForm.get('codigoVinculacion');
      this.errorCodigo            = '';

      if (rol === RolUsuario.PROFESIONAL) {
        especialidadCtrl?.setValidators([Validators.required]);
        codigoCtrl?.clearValidators();
        codigoCtrl?.setValue('');
      } else {
        especialidadCtrl?.clearValidators();
        especialidadCtrl?.setValue('');
        codigoCtrl?.setValidators([Validators.required]);
      }

      especialidadCtrl?.updateValueAndValidity();
      codigoCtrl?.updateValueAndValidity();
    });
  }

  get rolActual(): RolUsuario {
    return this.registroForm.get('idRol')?.value;
  }

  seleccionarRol(rol: RolUsuario) {
    this.registroForm.get('idRol')?.setValue(rol);
  }

  togglePassword() {
    this.verPassword = !this.verPassword;
  }

  goToLogin() {
    this.navCtrl.navigateBack('/login');
  }

  registrarse() {
    this.errorCodigo = '';

    if (this.registroForm.invalid) {
      this.registroForm.markAllAsTouched();
      return;
    }

    const fv = this.registroForm.value;

    // ── Validación mock del código de vinculación ──
    if (fv.idRol === RolUsuario.RECEPCIONISTA) {
      const profesional = this.vinculacionSvc.getProfesionalPorCodigo(fv.codigoVinculacion);
      if (!profesional) {
        this.errorCodigo = 'El código de vinculación no es válido. Solicítalo a tu profesional.';
        this.registroForm.get('codigoVinculacion')?.markAsTouched();
        return;
      }

      const usuarioDTO: UsuarioRegistroDto = {
        nombre:           fv.nombre,
        apellido:         fv.apellido,
        email:            fv.email,
        usuario:          fv.usuario,
        contrasena:       fv.contrasena,
        fecha_nacimiento: fv.fecha_nacimiento,
        domicilio:        fv.domicilio,
        numero_telefono:  fv.numero_telefono,
        activo:           true,
        idRol:            RolUsuario.RECEPCIONISTA,
        codigoVinculacionIngresado: fv.codigoVinculacion.trim().toUpperCase(),
        profesionalId:    profesional.id,
        permisos:         { ...PERMISOS_DEFAULT_RECEPCIONISTA },
      };

      console.log('[MOCK] Recepcionista registrado:', usuarioDTO);
      this.enviarRegistro(usuarioDTO);
      return;
    }

    // ── Registro como Profesional ──
    const usuarioDTO: UsuarioRegistroDto = {
      nombre:           fv.nombre,
      apellido:         fv.apellido,
      email:            fv.email,
      usuario:          fv.usuario,
      contrasena:       fv.contrasena,
      fecha_nacimiento: fv.fecha_nacimiento,
      domicilio:        fv.domicilio,
      numero_telefono:  fv.numero_telefono,
      activo:           true,
      idRol:            RolUsuario.PROFESIONAL,
      especialidad:     fv.especialidad,
    };

    console.log('[MOCK] Profesional registrado:', usuarioDTO);
    this.enviarRegistro(usuarioDTO);
  }

  private enviarRegistro(dto: UsuarioRegistroDto) {
    this.usuarioService.registrarUsuario(dto).subscribe({
      next: () => this.navCtrl.navigateRoot('/login'),
      error: (err) => console.error('Error al registrar usuario:', err),
    });
  }
}
