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

/** Valid beta invite codes for closed-beta access (mock). */
const BETA_INVITE_CODES: ReadonlySet<string> = new Set([
  'AGD-BETA-001',
  'AGD-BETA-002',
  'AGD-BETA-003',
]);

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
  errorInvitacion = '';

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
      codigoInvitacion:  ['', Validators.required],
      codigoVinculacion: [''],
    });

    // Revalidar campos condicionales cuando cambia el rol
    this.registroForm.get('idRol')?.valueChanges.subscribe((rol: RolUsuario) => {
      const especialidadCtrl      = this.registroForm.get('especialidad');
      const invitacionCtrl        = this.registroForm.get('codigoInvitacion');
      const codigoCtrl            = this.registroForm.get('codigoVinculacion');
      this.errorCodigo            = '';
      this.errorInvitacion        = '';

      if (rol === RolUsuario.PROFESIONAL) {
        especialidadCtrl?.setValidators([Validators.required]);
        invitacionCtrl?.setValidators([Validators.required]);
        codigoCtrl?.clearValidators();
        codigoCtrl?.setValue('');
      } else {
        especialidadCtrl?.clearValidators();
        especialidadCtrl?.setValue('');
        invitacionCtrl?.clearValidators();
        invitacionCtrl?.setValue('');
        codigoCtrl?.setValidators([Validators.required]);
      }

      especialidadCtrl?.updateValueAndValidity();
      invitacionCtrl?.updateValueAndValidity();
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
    this.errorCodigo     = '';
    this.errorInvitacion = '';

    if (this.registroForm.invalid) {
      this.registroForm.markAllAsTouched();
      return;
    }

    const fv = this.registroForm.value;

    // ── Validación mock del código de invitación (beta cerrada) ──
    if (fv.idRol === RolUsuario.PROFESIONAL) {
      const codigo = (fv.codigoInvitacion ?? '').trim().toUpperCase();
      if (!BETA_INVITE_CODES.has(codigo)) {
        this.errorInvitacion = 'El código de invitación no es válido. Verifica que esté escrito correctamente.';
        this.registroForm.get('codigoInvitacion')?.markAsTouched();
        return;
      }
    }

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
