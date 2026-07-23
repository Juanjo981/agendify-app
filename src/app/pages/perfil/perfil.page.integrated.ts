import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { Subscription, finalize, firstValueFrom } from 'rxjs';
import { AuthService } from 'src/app/services/auth';
import { ConfiguracionApiService } from 'src/app/services/configuracion-api.service';
import { CurrencyPreferenceService } from 'src/app/services/currency-preference.service';
import { PerfilApiService } from 'src/app/services/perfil-api.service';
import { SessionService } from 'src/app/services/session.service';
import { ActualizarMiPerfilRequest, MiPerfilResponse } from 'src/app/shared/models/perfil.models';
import { ConfiguracionRecordatorioDto, ConfiguracionSistemaDto } from 'src/app/shared/models/configuracion.models';
import { mapApiError } from 'src/app/shared/utils/api-error.mapper';
import { AgfTimePickerComponent } from '../../shared/components/agf-time-picker/agf-time-picker.component';

type PreferenciasUi = {
  idioma: string;
  zonaHoraria: string;
  notificacionEmail: boolean;
  notificacionSMS: boolean;
};

type PersonalFormValue = {
  nombreCompleto: string;
  correoElectronico: string;
  usuario: string;
  telefono: string;
  domicilio: string;
  especialidad: string;
  cedulaProfesional: string;
};

type ProfesionalFormValue = {
  nombreConsultorio: string;
  telefonoConsultorio: string;
  direccionConsultorio: string;
  descripcionProfesional: string;
};

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, ReactiveFormsModule, AgfTimePickerComponent],
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss']
})
export class PerfilPage implements OnInit, OnDestroy {
  @ViewChild('avatarInput') avatarInput!: ElementRef<HTMLInputElement>;

  avatarUrl: string | null = null;

  /** Formulario de «Información personal» (incluye especialidad y cédula). */
  informacionPersonalForm: FormGroup;

  /** Formulario de «Perfil profesional» (consultorio). */
  perfilProfesionalForm: FormGroup;

  /** Preferencias / notificaciones (fuera de los FormGroups de perfil). */
  perfil: PreferenciasUi = {
    idioma: 'es',
    zonaHoraria: 'GMT-6',
    notificacionEmail: true,
    notificacionSMS: false,
  };

  horarios = {
    duracionCita: 60,
    buffer: 10,
    inicio: '09:00',
    fin: '18:00',
  };

  readonly stats = {
    totalPacientes: 48,
    citasMes: 23,
    citasHoy: 4,
  };

  readonly integraciones = [
    { nombre: 'Google Calendar', desc: 'Sincroniza tus citas automáticamente', icon: 'calendar-outline', color: 'linear-gradient(135deg, #4285F4, #34A853)' },
    { nombre: 'WhatsApp Business', desc: 'Envía recordatorios a tus pacientes', icon: 'logo-whatsapp', color: 'linear-gradient(135deg, #25D366, #128C7E)' },
    { nombre: 'Pagos en línea', desc: 'Cobra consultas con tarjeta o transferencia', icon: 'card-outline', color: 'linear-gradient(135deg, #6366f1, #3b3f92)' },
    { nombre: 'Videollamadas', desc: 'Consultas en línea con tus pacientes', icon: 'videocam-outline', color: 'linear-gradient(135deg, #14b8a6, #0d9488)' },
  ];

  passwordActual = '';
  nuevaPassword = '';
  confirmarPassword = '';

  editarPersonal = false;
  editarPreferencias = false;
  editarSeguridad = false;
  editarNotificaciones = false;
  editarProfesional = false;
  editarHorarios = false;

  loadingProfile = false;
  guardando = false;
  loadError = false;

  private sistemaId: number | null = null;
  private recordatoriosActuales: ConfiguracionRecordatorioDto[] = [];
  private sistemaActual: ConfiguracionSistemaDto | null = null;
  private initialPersonalData: PersonalFormValue = this.emptyPersonal();
  private initialProfessionalData: ProfesionalFormValue = this.emptyProfessional();
  private originalPreferencias = JSON.stringify(this.perfil);
  private originalHorarios = JSON.stringify(this.horarios);
  private perfilLoadSub: Subscription | null = null;
  private perfilLoadStarted = false;

  constructor(
    private fb: FormBuilder,
    private perfilApi: PerfilApiService,
    private configuracionApi: ConfiguracionApiService,
    private auth: AuthService,
    private session: SessionService,
    private toastCtrl: ToastController,
    private currencyPreference: CurrencyPreferenceService,
  ) {
    this.informacionPersonalForm = this.fb.group({
      nombreCompleto: [''],
      correoElectronico: ['', [Validators.email]],
      usuario: [''],
      telefono: [''],
      domicilio: [''],
      especialidad: [''],
      cedulaProfesional: ['', [
        Validators.maxLength(20),
        Validators.pattern(/^[A-Za-z0-9\s-]*$/),
      ]],
    });

    this.perfilProfesionalForm = this.fb.group({
      nombreConsultorio: ['', [Validators.maxLength(150)]],
      telefonoConsultorio: ['', [
        Validators.maxLength(30),
        Validators.pattern(/^[0-9+\s()\-]*$/),
      ]],
      direccionConsultorio: ['', [Validators.maxLength(255)]],
      descripcionProfesional: ['', [Validators.maxLength(500)]],
    });
  }

  get nombreHero(): string {
    return this.displayValue(this.informacionPersonalForm.get('nombreCompleto')?.value, '');
  }

  get especialidadHero(): string {
    return this.displayValue(this.informacionPersonalForm.get('especialidad')?.value, '');
  }

  get descripcionProfesionalLength(): number {
    const value = this.perfilProfesionalForm.get('descripcionProfesional')?.value;
    return String(value ?? '').length;
  }

  get errorCedulaProfesional(): string {
    const control = this.informacionPersonalForm.get('cedulaProfesional');
    if (!control || !control.touched || !control.invalid) {
      return '';
    }
    return 'Ingresa una cédula profesional válida.';
  }

  get errorTelefonoConsultorio(): string {
    const control = this.perfilProfesionalForm.get('telefonoConsultorio');
    if (!control || !control.touched || !control.invalid) {
      return '';
    }
    return 'Ingresa un teléfono de consultorio válido.';
  }

  /** Expuesto para pruebas: copia usada por Cancelar. */
  getInitialPersonalData(): PersonalFormValue {
    return { ...this.initialPersonalData };
  }

  getInitialProfessionalData(): ProfesionalFormValue {
    return { ...this.initialProfessionalData };
  }

  ngOnInit(): void {
    this.cargarPerfilReal();
  }

  ngOnDestroy(): void {
    this.perfilLoadSub?.unsubscribe();
    if (this.avatarUrl) {
      URL.revokeObjectURL(this.avatarUrl);
    }
  }

  displayValue(value: unknown, emptyLabel = 'Sin registrar'): string {
    if (value === null || value === undefined) {
      return emptyLabel;
    }
    const text = String(value).trim();
    if (!text || text === 'null' || text === 'undefined') {
      return emptyLabel;
    }
    return text;
  }

  hasValue(value: unknown): boolean {
    if (value === null || value === undefined) return false;
    const text = String(value).trim();
    return !!text && text !== 'null' && text !== 'undefined';
  }

  reintentarCarga(): void {
    this.perfilLoadStarted = false;
    this.cargarPerfilReal();
  }

  async guardarCambios(): Promise<void> {
    if (this.guardando || this.loadingProfile) return;

    if (this.tieneCambioPassword() && this.nuevaPassword !== this.confirmarPassword) {
      await this.presentToast('La confirmación de la contraseña no coincide.', 'danger');
      return;
    }

    if (this.tieneCambioPassword() && !this.passwordActual) {
      await this.presentToast('Debes ingresar tu contraseña actual para cambiarla.', 'danger');
      return;
    }

    const personalCambio = this.informacionPersonalCambio();
    const profesionalCambio = this.perfilProfesionalCambio();

    if (personalCambio) {
      this.informacionPersonalForm.markAllAsTouched();
      if (this.informacionPersonalForm.invalid) {
        await this.presentToast(
          this.errorCedulaProfesional || 'Revisa los datos de información personal.',
          'danger',
        );
        return;
      }
    }

    if (profesionalCambio) {
      this.perfilProfesionalForm.markAllAsTouched();
      if (this.perfilProfesionalForm.invalid) {
        await this.presentToast(
          this.errorTelefonoConsultorio || 'Revisa los datos del perfil profesional.',
          'danger',
        );
        return;
      }
    }

    this.guardando = true;

    try {
      let perfilGuardado: MiPerfilResponse | null = null;

      // Un solo PUT /usuarios/me con personal + profesional (reemplazo completo del perfil).
      if (personalCambio || profesionalCambio) {
        const payload = this.buildActualizarMiPerfilPayload();
        const response = await firstValueFrom(this.perfilApi.actualizarMiPerfil(payload));

        if (!this.perfilApi.isValidMiPerfilResponse(response)) {
          await this.presentToast(
            profesionalCambio && !personalCambio
              ? 'No fue posible guardar el perfil profesional.'
              : 'No fue posible confirmar los datos guardados. Inténtalo nuevamente.',
            'danger',
          );
          return;
        }

        perfilGuardado = this.resolveSavedProfile(response, payload);
        this.applyProfile(perfilGuardado);
        this.updateInitialCopies(perfilGuardado);
        this.syncProfileState(perfilGuardado);
      }

      if (this.horariosCambio()) {
        const costoGuardado = Number(this.sistemaActual?.costo_cita_predeterminado ?? 0);
        const costoNum = Number.isFinite(costoGuardado) && costoGuardado >= 0 ? Math.round(costoGuardado * 100) / 100 : 0;
        await this.configuracionApi.saveAgenda({
          hora_inicio_jornada: this.horarios.inicio,
          hora_fin_jornada: this.horarios.fin,
          intervalo_calendario_min: 30,
          duracion_cita_default_min: Number(this.horarios.duracionCita),
          buffer_citas_min: Number(this.horarios.buffer),
          citas_superpuestas: false,
          mostrar_sabados: true,
          mostrar_domingos: false,
          costoCitaPredeterminado: costoNum,
        });
        this.originalHorarios = JSON.stringify(this.horarios);
      }

      if (this.preferenciasCambio() || this.horariosCambio()) {
        this.sistemaActual = await this.configuracionApi.saveSistema({
          notif_in_app: this.sistemaActual?.notif_in_app ?? true,
          alertas_sonoras: this.sistemaActual?.alertas_sonoras ?? false,
          avisos_citas_proximas: this.sistemaActual?.avisos_citas_proximas ?? true,
          avisos_pacientes_nuevos: this.sistemaActual?.avisos_pacientes_nuevos ?? true,
          avisos_pagos_pendientes: this.sistemaActual?.avisos_pagos_pendientes ?? true,
          zona_horaria: this.toBackendTimeZone(this.perfil.zonaHoraria),
          moneda: this.sistemaActual?.moneda ?? 'MXN',
          formato_hora: this.sistemaActual?.formato_hora ?? '24h',
          formato_fecha: this.sistemaActual?.formato_fecha ?? 'DD/MM/YYYY',
          duracion_cita_default_min: Number(this.horarios.duracionCita),
          politica_cancelacion_horas: this.sistemaActual?.politica_cancelacion_horas ?? 24,
          permite_confirmacion_publica: this.sistemaActual?.permite_confirmacion_publica ?? true,
          ocultar_datos_sensibles: this.sistemaActual?.ocultar_datos_sensibles ?? false,
          confirmar_eliminar_citas: this.sistemaActual?.confirmar_eliminar_citas ?? true,
          confirmar_eliminar_pacientes: this.sistemaActual?.confirmar_eliminar_pacientes ?? true,
          permitir_cancelacion: this.sistemaActual?.permitir_cancelacion ?? true,
          permitir_reprogramacion: this.sistemaActual?.permitir_reprogramacion ?? true,
          recordatorio_profesional: this.sistemaActual?.recordatorio_profesional ?? true,
          notif_paciente_confirma: this.sistemaActual?.notif_paciente_confirma ?? true,
          notif_paciente_cancela: this.sistemaActual?.notif_paciente_cancela ?? true,
          notif_paciente_reprograma: this.sistemaActual?.notif_paciente_reprograma ?? false,
          idioma: this.perfil.idioma,
          tema: this.sistemaActual?.tema ?? 'claro',
          tamano_interfaz: this.sistemaActual?.tamano_interfaz ?? 'normal',
          animaciones: this.sistemaActual?.animaciones ?? true,
          vista_previa_datos: this.sistemaActual?.vista_previa_datos ?? true,
          bloquear_cambios_criticos: this.sistemaActual?.bloquear_cambios_criticos ?? true,
        }, this.sistemaId);
        this.sistemaId = this.sistemaActual.id_configuracion_sistema ?? this.sistemaId;
        this.originalPreferencias = JSON.stringify(this.perfil);
      }

      if (this.notificacionesCambio()) {
        await this.syncNotificationChannels();
        this.recordatoriosActuales = await this.configuracionApi.getRecordatorios().catch(() => this.recordatoriosActuales);
        this.originalPreferencias = JSON.stringify(this.perfil);
      }

      if (this.tieneCambioPassword()) {
        await this.perfilApi.changePassword({
          password_actual: this.passwordActual,
          password_nueva: this.nuevaPassword,
        });
      }

      if (!perfilGuardado) {
        await this.auth.getCurrentUser().catch(() => null);
      } else {
        void this.auth.getCurrentUser().catch(() => null);
      }

      this.passwordActual = '';
      this.nuevaPassword = '';
      this.confirmarPassword = '';
      this.cerrarEdiciones();
      await this.presentToast('Perfil actualizado correctamente.', 'success');
    } catch (error) {
      const onlyProfessional =
        this.perfilProfesionalCambio() && !this.informacionPersonalCambio();
      if (onlyProfessional) {
        const mapped = mapApiError(error);
        const backendMessage = mapped.userMessage?.trim();
        const useBackend =
          !!backendMessage &&
          mapped.status !== undefined &&
          mapped.status < 500 &&
          mapped.status !== 0;
        await this.presentToast(
          useBackend ? backendMessage! : 'No fue posible guardar el perfil profesional.',
          'danger',
        );
      } else {
        await this.presentToast(this.resolveSaveErrorMessage(error), 'danger');
      }
    } finally {
      this.guardando = false;
    }
  }

  toggleEditar(seccion: string): void {
    switch (seccion) {
      case 'personal':
        if (this.editarPersonal) {
          this.restaurarInformacionPersonal();
        }
        this.editarPersonal = !this.editarPersonal;
        break;
      case 'preferencias': this.editarPreferencias = !this.editarPreferencias; break;
      case 'seguridad': this.editarSeguridad = !this.editarSeguridad; break;
      case 'notificaciones': this.editarNotificaciones = !this.editarNotificaciones; break;
      case 'profesional':
        if (this.editarProfesional) {
          this.restaurarPerfilProfesional();
        }
        this.editarProfesional = !this.editarProfesional;
        break;
      case 'horarios': this.editarHorarios = !this.editarHorarios; break;
    }
  }

  triggerAvatarPicker(): void {
    this.avatarInput.nativeElement.click();
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    if (this.avatarUrl) URL.revokeObjectURL(this.avatarUrl);
    this.avatarUrl = URL.createObjectURL(file);
  }

  private cargarPerfilReal(): void {
    if (this.perfilLoadStarted) {
      return;
    }
    this.perfilLoadStarted = true;
    this.loadingProfile = true;
    this.loadError = false;
    this.perfilLoadSub?.unsubscribe();

    this.perfilLoadSub = this.perfilApi.obtenerMiPerfil().pipe(
      finalize(() => {
        this.loadingProfile = false;
      }),
    ).subscribe({
      next: (miPerfil) => {
        this.applyProfile(miPerfil);
        this.updateInitialCopies(miPerfil);
        void this.cargarConfiguracionSecundaria();
      },
      error: () => {
        this.loadError = true;
        this.perfilLoadStarted = false;
        void this.presentToast('No fue posible cargar la información del perfil.', 'danger');
      },
    });
  }

  private async cargarConfiguracionSecundaria(): Promise<void> {
    const [agenda, sistema, recordatorios] = await Promise.all([
      this.configuracionApi.getAgenda().catch(() => null),
      this.configuracionApi.getSistema().catch(() => null),
      this.configuracionApi.getRecordatorios().catch(() => []),
    ]);

    this.sistemaId = sistema?.id_configuracion_sistema ?? null;
    this.sistemaActual = sistema;
    this.recordatoriosActuales = recordatorios;

    this.perfil = {
      idioma: sistema?.idioma ?? 'es',
      zonaHoraria: this.toUiTimeZone(sistema?.zona_horaria) ?? 'GMT-6',
      notificacionEmail: this.hasActiveChannel(recordatorios, 'EMAIL'),
      notificacionSMS: this.hasActiveChannel(recordatorios, 'SMS'),
    };

    this.horarios = {
      duracionCita: Number(sistema?.duracion_cita_default_min ?? agenda?.duracion_cita_default_min ?? 60),
      buffer: Number(agenda?.buffer_citas_min ?? 10),
      inicio: this.normalizeTime(agenda?.hora_inicio_jornada ?? agenda?.hora_inicio) ?? '09:00',
      fin: this.normalizeTime(agenda?.hora_fin_jornada ?? agenda?.hora_fin) ?? '18:00',
    };

    this.originalPreferencias = JSON.stringify(this.perfil);
    this.originalHorarios = JSON.stringify(this.horarios);
    this.currencyPreference.setCurrencyCode(sistema?.moneda);
  }

  /**
   * Aplica el perfil a ambos formularios desde GET/PUT.
   */
  private applyProfile(perfil: MiPerfilResponse): void {
    this.informacionPersonalForm.patchValue({
      nombreCompleto: perfil.nombreCompleto ?? '',
      correoElectronico: perfil.correoElectronico ?? '',
      usuario: perfil.usuario ?? '',
      telefono: perfil.telefono ?? '',
      domicilio: perfil.domicilio ?? '',
      especialidad: perfil.especialidad ?? '',
      cedulaProfesional: perfil.cedulaProfesional ?? '',
    }, { emitEvent: false });

    this.perfilProfesionalForm.patchValue({
      nombreConsultorio: perfil.nombreConsultorio ?? '',
      telefonoConsultorio: perfil.telefonoConsultorio ?? '',
      direccionConsultorio: perfil.direccionConsultorio ?? '',
      descripcionProfesional: perfil.descripcionProfesional ?? '',
    }, { emitEvent: false });

    this.informacionPersonalForm.markAsPristine();
    this.informacionPersonalForm.markAsUntouched();
    this.perfilProfesionalForm.markAsPristine();
    this.perfilProfesionalForm.markAsUntouched();
  }

  private updateInitialCopies(perfil: MiPerfilResponse): void {
    this.initialPersonalData = {
      nombreCompleto: perfil.nombreCompleto ?? '',
      correoElectronico: perfil.correoElectronico ?? '',
      usuario: perfil.usuario ?? '',
      telefono: perfil.telefono ?? '',
      domicilio: perfil.domicilio ?? '',
      especialidad: perfil.especialidad ?? '',
      cedulaProfesional: perfil.cedulaProfesional ?? '',
    };

    this.initialProfessionalData = {
      nombreConsultorio: perfil.nombreConsultorio ?? '',
      telefonoConsultorio: perfil.telefonoConsultorio ?? '',
      direccionConsultorio: perfil.direccionConsultorio ?? '',
      descripcionProfesional: perfil.descripcionProfesional ?? '',
    };
  }

  /**
   * Si el PUT aún no devuelve campos profesionales, conserva lo enviado
   * ('' del payload sí limpia; undefined de respuesta se rellena con payload).
   */
  private resolveSavedProfile(
    response: MiPerfilResponse,
    payload: ActualizarMiPerfilRequest,
  ): MiPerfilResponse {
    return {
      idUsuario: response.idUsuario,
      nombreCompleto: response.nombreCompleto || payload.nombreCompleto || '',
      correoElectronico: response.correoElectronico || payload.correoElectronico || '',
      usuario: response.usuario || payload.usuario || '',
      telefono: response.telefono ?? payload.telefono ?? '',
      domicilio: response.domicilio ?? payload.domicilio ?? '',
      especialidad: response.especialidad ?? payload.especialidad ?? '',
      cedulaProfesional: response.cedulaProfesional ?? payload.cedulaProfesional ?? '',
      nombreConsultorio: response.nombreConsultorio ?? payload.nombreConsultorio ?? '',
      telefonoConsultorio: response.telefonoConsultorio ?? payload.telefonoConsultorio ?? '',
      direccionConsultorio: response.direccionConsultorio ?? payload.direccionConsultorio ?? '',
      descripcionProfesional: response.descripcionProfesional ?? payload.descripcionProfesional ?? '',
    };
  }

  private syncProfileState(perfil: MiPerfilResponse): void {
    this.session.patchFromMiPerfil(perfil);
  }

  private restaurarInformacionPersonal(): void {
    this.informacionPersonalForm.reset({ ...this.initialPersonalData }, { emitEvent: false });
    this.informacionPersonalForm.markAsPristine();
    this.informacionPersonalForm.markAsUntouched();
  }

  private restaurarPerfilProfesional(): void {
    this.perfilProfesionalForm.reset({ ...this.initialProfessionalData }, { emitEvent: false });
    this.perfilProfesionalForm.markAsPristine();
    this.perfilProfesionalForm.markAsUntouched();
  }

  /** Payload completo: personal + profesional (un solo PUT). */
  private buildActualizarMiPerfilPayload(): ActualizarMiPerfilRequest {
    const personal = this.informacionPersonalForm.getRawValue() as PersonalFormValue;
    const professional = this.perfilProfesionalForm.getRawValue() as ProfesionalFormValue;

    return {
      nombreCompleto: personal.nombreCompleto?.trim() ?? '',
      correoElectronico: personal.correoElectronico?.trim() ?? '',
      usuario: personal.usuario?.trim() ?? '',
      telefono: personal.telefono?.trim() ?? '',
      domicilio: personal.domicilio?.trim() ?? '',
      especialidad: personal.especialidad?.trim() ?? '',
      cedulaProfesional: personal.cedulaProfesional?.trim() ?? '',
      nombreConsultorio: professional.nombreConsultorio?.trim() ?? '',
      telefonoConsultorio: professional.telefonoConsultorio?.trim() ?? '',
      direccionConsultorio: professional.direccionConsultorio?.trim() ?? '',
      descripcionProfesional: professional.descripcionProfesional?.trim() ?? '',
    };
  }

  private informacionPersonalCambio(): boolean {
    return JSON.stringify(this.informacionPersonalForm.getRawValue()) !== JSON.stringify(this.initialPersonalData);
  }

  private perfilProfesionalCambio(): boolean {
    return JSON.stringify(this.perfilProfesionalForm.getRawValue()) !== JSON.stringify(this.initialProfessionalData);
  }

  private horariosCambio(): boolean {
    return JSON.stringify(this.horarios) !== this.originalHorarios;
  }

  private preferenciasCambio(): boolean {
    try {
      const original = JSON.parse(this.originalPreferencias) as PreferenciasUi;
      return (
        this.perfil.idioma !== original.idioma ||
        this.perfil.zonaHoraria !== original.zonaHoraria
      );
    } catch {
      return true;
    }
  }

  private notificacionesCambio(): boolean {
    try {
      const original = JSON.parse(this.originalPreferencias) as PreferenciasUi;
      return (
        this.perfil.notificacionEmail !== original.notificacionEmail ||
        this.perfil.notificacionSMS !== original.notificacionSMS
      );
    } catch {
      return true;
    }
  }

  private tieneCambioPassword(): boolean {
    return !!(this.passwordActual || this.nuevaPassword || this.confirmarPassword);
  }

  private resolveSaveErrorMessage(error: unknown): string {
    const mapped = mapApiError(error);
    if (mapped.status === 403) {
      return mapped.userMessage || 'No tienes autorización para realizar esta acción.';
    }
    if (mapped.status === 409) {
      return mapped.userMessage || 'Conflicto: el correo o usuario ya está registrado.';
    }
    if (mapped.status === 500) {
      return 'No fue posible guardar los cambios. Inténtalo nuevamente.';
    }
    return mapped.userMessage || 'No fue posible guardar los cambios. Inténtalo nuevamente.';
  }

  private async syncNotificationChannels(): Promise<void> {
    const desiredByChannel = new Map<string, boolean>([
      ['EMAIL', this.perfil.notificacionEmail],
      ['SMS', this.perfil.notificacionSMS],
    ]);

    for (const [channel, shouldBeActive] of desiredByChannel.entries()) {
      const channelRules = this.recordatoriosActuales
        .filter(rule => rule.canal === channel && rule.id_configuracion_recordatorio);

      if (channelRules.length === 0 && shouldBeActive) {
        await this.configuracionApi.createRecordatorio({
          canal: channel,
          anticipacion_minutos: 1440,
          mensaje_personalizado: null,
          activo: true,
        });
        continue;
      }

      for (const rule of channelRules) {
        if (rule.id_configuracion_recordatorio && (rule.activo ?? true) !== shouldBeActive) {
          await this.configuracionApi.setActivoRecordatorio(rule.id_configuracion_recordatorio, shouldBeActive);
        }
      }
    }
  }

  private hasActiveChannel(recordatorios: ConfiguracionRecordatorioDto[], channel: string): boolean {
    return recordatorios.some(rule => rule.canal === channel && rule.activo !== false);
  }

  private cerrarEdiciones(): void {
    this.editarPersonal = false;
    this.editarPreferencias = false;
    this.editarSeguridad = false;
    this.editarNotificaciones = false;
    this.editarProfesional = false;
    this.editarHorarios = false;
  }

  private emptyPersonal(): PersonalFormValue {
    return {
      nombreCompleto: '',
      correoElectronico: '',
      usuario: '',
      telefono: '',
      domicilio: '',
      especialidad: '',
      cedulaProfesional: '',
    };
  }

  private emptyProfessional(): ProfesionalFormValue {
    return {
      nombreConsultorio: '',
      telefonoConsultorio: '',
      direccionConsultorio: '',
      descripcionProfesional: '',
    };
  }

  private toUiTimeZone(value?: string | null): string | null {
    switch (value) {
      case 'America/Mexico_City': return 'GMT-6';
      case 'America/Bogota': return 'GMT-5';
      default: return value ?? null;
    }
  }

  private toBackendTimeZone(value: string): string {
    switch (value) {
      case 'GMT-6': return 'America/Mexico_City';
      case 'GMT-5': return 'America/Bogota';
      default: return value;
    }
  }

  private normalizeTime(value?: string | null): string | null {
    if (!value) return null;
    return value.length >= 5 ? value.substring(0, 5) : value;
  }

  private async presentToast(message: string, color: 'success' | 'danger'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3200,
      color,
      position: 'top',
    });
    await toast.present();
  }
}
