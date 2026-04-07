import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, NavController } from '@ionic/angular';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from 'src/app/services/auth';
import { ROL_REGISTRO } from 'src/app/shared/models/auth.models';
import { mapApiError, humanizeFieldError, API_ERROR_CODES } from 'src/app/shared/utils/api-error.mapper';
import { AgfDatePickerComponent } from 'src/app/shared/components/agf-date-picker/agf-date-picker.component';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule, RouterModule, AgfDatePickerComponent],
  templateUrl: './registro.page.html',
  styleUrls: ['./registro.page.scss'],
})
export class RegistroPage {
  readonly birthDateMaxYear = new Date().getFullYear();

  registroForm: FormGroup;
  verPassword     = false;
  cargando        = false;
  registroExitoso = false;
  errorGlobal     = '';
  errorCodigo     = '';
  errorInvitacion = '';
  errorEmail      = '';
  errorUsuario    = '';
  validationDetails: string[] = [];

  readonly ROL_REGISTRO = ROL_REGISTRO;

  constructor(
    private fb: FormBuilder,
    private navCtrl: NavController,
    private authService: AuthService,
  ) {
    this.registroForm = this.fb.group({
      nombre:            ['', Validators.required],
      apellido:          ['', Validators.required],
      email:             ['', [Validators.required, Validators.email]],
      usuario:           ['', Validators.required],   // mapeado a `username` en el payload
      contrasena:        ['', Validators.required],
      fecha_nacimiento:  ['', Validators.required],
      domicilio:         [''],
      numero_telefono:   ['', Validators.required],
      idRol:             [ROL_REGISTRO.PROFESIONAL, Validators.required],
      // PROFESIONAL
      especialidad:      ['', Validators.required],
      codigoInvitacion:  ['', Validators.required],   // mapeado a `codigo_beta`
      // RECEPCIONISTA
      codigoVinculacion: [''],
      alias_interno:     [''],
      puesto:            [''],
    });

    this.registroForm.get('idRol')?.valueChanges.subscribe((rol: number) => {
      this.limpiarErrores();
      this.actualizarValidacionesPorRol(rol);
    });
  }

  get rolActual(): number {
    return this.registroForm.get('idRol')?.value;
  }

  seleccionarRol(rol: number): void {
    this.registroForm.get('idRol')?.setValue(rol);
  }

  togglePassword(): void {
    this.verPassword = !this.verPassword;
  }

  goToLogin(): void {
    this.navCtrl.navigateBack('/login');
  }

  async registrarse(): Promise<void> {
    this.limpiarErrores();

    if (this.registroForm.invalid) {
      this.registroForm.markAllAsTouched();
      return;
    }
    if (this.cargando) return;

    this.cargando = true;
    const fv  = this.registroForm.value;
    const rol = fv.idRol as number;

    const payload = {
      nombre:             fv.nombre.trim(),
      apellido:           fv.apellido.trim(),
      email:              fv.email.trim().toLowerCase(),
      username:           fv.usuario.trim(),
      contrasena:         fv.contrasena,
      fecha_nacimiento:   fv.fecha_nacimiento,
      domicilio:          fv.domicilio?.trim() ?? '',
      numero_telefono:    fv.numero_telefono.trim(),
      id_rol:             rol as 2 | 3,
      especialidad:       rol === ROL_REGISTRO.PROFESIONAL ? (fv.especialidad?.trim() || null) : null,
      codigo_beta:        rol === ROL_REGISTRO.PROFESIONAL ? (fv.codigoInvitacion?.trim() || null) : null,
      codigo_vinculacion: rol === ROL_REGISTRO.RECEPCIONISTA ? (fv.codigoVinculacion?.trim() || null) : null,
      alias_interno:      rol === ROL_REGISTRO.RECEPCIONISTA ? (fv.alias_interno?.trim() || null) : null,
      puesto:             rol === ROL_REGISTRO.RECEPCIONISTA ? (fv.puesto?.trim() || null) : null,
    };

    try {
      await this.authService.register(payload);
      this.registroExitoso = true;
      // Breve pausa para que el usuario vea el mensaje de éxito antes de redirigir
      setTimeout(() => this.navCtrl.navigateRoot('/login'), 2500);
    } catch (err) {
      this.manejarError(err);
    } finally {
      this.cargando = false;
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private actualizarValidacionesPorRol(rol: number): void {
    const especialidad = this.registroForm.get('especialidad');
    const invitacion   = this.registroForm.get('codigoInvitacion');
    const vinculacion  = this.registroForm.get('codigoVinculacion');

    if (rol === ROL_REGISTRO.PROFESIONAL) {
      especialidad?.setValidators([Validators.required]);
      invitacion?.setValidators([Validators.required]);
      vinculacion?.clearValidators();
      vinculacion?.setValue('');
    } else {
      especialidad?.clearValidators();
      especialidad?.setValue('');
      invitacion?.clearValidators();
      invitacion?.setValue('');
      vinculacion?.setValidators([Validators.required]);
    }

    especialidad?.updateValueAndValidity();
    invitacion?.updateValueAndValidity();
    vinculacion?.updateValueAndValidity();
  }

  private limpiarErrores(): void {
    this.errorGlobal       = '';
    this.errorCodigo       = '';
    this.errorInvitacion   = '';
    this.errorEmail        = '';
    this.errorUsuario      = '';
    this.validationDetails = [];
  }

  private manejarError(err: unknown): void {
    const mapped = mapApiError(err);
    const { code, fieldErrors, userMessage } = mapped;

    switch (code) {

      case API_ERROR_CODES.EMAIL_DUPLICADO:
        this.errorEmail = fieldErrors?.['email'] ?? userMessage;
        break;

      case API_ERROR_CODES.USUARIO_DUPLICADO:
        this.errorUsuario = fieldErrors?.['username'] ?? userMessage;
        break;

      case API_ERROR_CODES.CODIGO_BETA_INVALIDO:
        this.errorInvitacion = userMessage;
        this.registroForm.get('codigoInvitacion')?.setErrors({ backendError: true });
        break;

      case API_ERROR_CODES.CODIGO_VINCULACION_INVALIDO:
        this.errorCodigo = userMessage;
        this.registroForm.get('codigoVinculacion')?.setErrors({ backendError: true });
        break;

      case API_ERROR_CODES.VALIDATION_ERROR: {
        this.errorGlobal = userMessage;

        if (fieldErrors) {
          if (fieldErrors['email'])    this.errorEmail   = humanizeFieldError(fieldErrors['email']);
          if (fieldErrors['username']) this.errorUsuario = humanizeFieldError(fieldErrors['username']);

          if (fieldErrors['codigo_beta']) {
            this.errorInvitacion = humanizeFieldError(fieldErrors['codigo_beta']);
            this.registroForm.get('codigoInvitacion')?.setErrors({ backendError: true });
          }
          if (fieldErrors['codigo_vinculacion']) {
            this.errorCodigo = humanizeFieldError(fieldErrors['codigo_vinculacion']);
            this.registroForm.get('codigoVinculacion')?.setErrors({ backendError: true });
          }
        }

        // Show any remaining detail lines that weren't routed to a specific field
        const handledFields = new Set(['email', 'username', 'codigo_beta', 'codigo_vinculacion']);
        this.validationDetails = (mapped.raw?.details ?? [])
          .filter(d => !handledFields.has(d.split(':')[0].trim()))
          .map(d => {
            const colonIdx = d.indexOf(':');
            return humanizeFieldError(colonIdx > 0 ? d.substring(colonIdx + 1).trim() : d);
          });
        break;
      }

      default:
        this.errorGlobal = userMessage;
    }
  }
}

