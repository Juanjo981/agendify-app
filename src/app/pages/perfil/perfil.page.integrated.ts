import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { AuthService } from 'src/app/services/auth';
import { ConfiguracionApiService } from 'src/app/services/configuracion-api.service';
import { PerfilApiService } from 'src/app/services/perfil-api.service';
import { SessionService } from 'src/app/services/session.service';
import { ConfiguracionRecordatorioDto, ConfiguracionSistemaDto } from 'src/app/shared/models/configuracion.models';
import { mapApiError } from 'src/app/shared/utils/api-error.mapper';
import { AgfTimePickerComponent } from '../../shared/components/agf-time-picker/agf-time-picker.component';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, AgfTimePickerComponent],
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss']
})
export class PerfilPage implements OnInit, OnDestroy {
  @ViewChild('avatarInput') avatarInput!: ElementRef<HTMLInputElement>;

  avatarUrl: string | null = null;

  perfil = {
    nombre: '',
    email: '',
    usuario: '',
    telefono: '',
    domicilio: '',
    especialidad: '',
    idioma: 'es',
    zonaHoraria: 'GMT-6',
    notificacionEmail: true,
    notificacionSMS: false,
  };

  perfilProfesional = {
    consultorio: '',
    direccion: '',
    telefono: '',
    descripcion: '',
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

  private userId: number | null = null;
  private profesionalId: number | null = null;
  private sistemaId: number | null = null;
  private recordatoriosActuales: ConfiguracionRecordatorioDto[] = [];
  private sistemaActual: ConfiguracionSistemaDto | null = null;
  private guardando = false;
  private originalPerfil = JSON.stringify(this.perfil);
  private originalPerfilProfesional = JSON.stringify(this.perfilProfesional);
  private originalHorarios = JSON.stringify(this.horarios);

  constructor(
    private perfilApi: PerfilApiService,
    private configuracionApi: ConfiguracionApiService,
    private session: SessionService,
    private auth: AuthService,
    private toastCtrl: ToastController,
  ) {}

  ngOnInit(): void {
    void this.cargarPerfilReal();
  }

  ngOnDestroy(): void {
    if (this.avatarUrl) {
      URL.revokeObjectURL(this.avatarUrl);
    }
  }

  async guardarCambios(): Promise<void> {
    if (this.guardando) return;

    if (this.tieneCambioPassword() && this.nuevaPassword !== this.confirmarPassword) {
      await this.presentToast('La confirmación de la contraseña no coincide.', 'danger');
      return;
    }

    if (this.tieneCambioPassword() && !this.passwordActual) {
      await this.presentToast('Debes ingresar tu contraseña actual para cambiarla.', 'danger');
      return;
    }

    try {
      this.guardando = true;

      const [nombre, apellido] = this.splitFullName(this.perfil.nombre);

      if (this.perfilCambio()) {
        await this.perfilApi.updateUsuarioActual({
          nombre,
          apellido,
          email: this.perfil.email.trim(),
          username: this.perfil.usuario.trim(),
          domicilio: this.perfil.domicilio.trim(),
          numero_telefono: this.perfil.telefono.trim(),
        }, this.userId);
      }

      if (this.perfilProfesionalCambio()) {
        await this.perfilApi.updateProfesionalActual({
          especialidad: this.perfil.especialidad.trim(),
          nombre_consulta: this.perfilProfesional.consultorio.trim(),
          descripcion: this.perfilProfesional.descripcion.trim() || null,
        }, this.profesionalId);
      }

      if (this.horariosCambio()) {
        await this.configuracionApi.saveAgenda({
          hora_inicio_jornada: this.horarios.inicio,
          hora_fin_jornada: this.horarios.fin,
          intervalo_calendario_min: 30,
          duracion_cita_default_min: Number(this.horarios.duracionCita),
          buffer_citas_min: Number(this.horarios.buffer),
          citas_superpuestas: false,
          mostrar_sabados: true,
          mostrar_domingos: false,
          vista_default: 'semana',
        });
      }

      if (this.preferenciasCambio() || this.horariosCambio()) {
        this.sistemaActual = await this.configuracionApi.saveSistema({
          zona_horaria: this.toBackendTimeZone(this.perfil.zonaHoraria),
          moneda: this.sistemaActual?.moneda ?? 'MXN',
          formato_hora: this.sistemaActual?.formato_hora ?? '24h',
          duracion_cita_default_min: Number(this.horarios.duracionCita),
          politica_cancelacion_horas: this.sistemaActual?.politica_cancelacion_horas ?? 24,
          permite_confirmacion_publica: this.sistemaActual?.permite_confirmacion_publica ?? true,
          idioma: this.perfil.idioma,
          tema: this.sistemaActual?.tema ?? 'claro',
          tamano_interfaz: this.sistemaActual?.tamano_interfaz ?? 'normal',
          animaciones: this.sistemaActual?.animaciones ?? true,
        }, this.sistemaId);
        this.sistemaId = this.sistemaActual.id_configuracion_sistema ?? this.sistemaId;
      }

      if (this.notificacionesCambio()) {
        await this.syncNotificationChannels();
        this.recordatoriosActuales = await this.configuracionApi.getRecordatorios().catch(() => this.recordatoriosActuales);
      }

      if (this.tieneCambioPassword()) {
        await this.perfilApi.changePassword({
          password_actual: this.passwordActual,
          password_nueva: this.nuevaPassword,
        }, this.userId);
      }

      await this.auth.getCurrentUser().catch(() => null);
      await this.cargarPerfilReal();
      this.passwordActual = '';
      this.nuevaPassword = '';
      this.confirmarPassword = '';
      this.cerrarEdiciones();
      await this.presentToast('Perfil actualizado correctamente.', 'success');
    } catch (error) {
      await this.presentToast(mapApiError(error).userMessage, 'danger');
    } finally {
      this.guardando = false;
    }
  }

  toggleEditar(seccion: string): void {
    switch (seccion) {
      case 'personal': this.editarPersonal = !this.editarPersonal; break;
      case 'preferencias': this.editarPreferencias = !this.editarPreferencias; break;
      case 'seguridad': this.editarSeguridad = !this.editarSeguridad; break;
      case 'notificaciones': this.editarNotificaciones = !this.editarNotificaciones; break;
      case 'profesional': this.editarProfesional = !this.editarProfesional; break;
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

  private async cargarPerfilReal(): Promise<void> {
    this.profesionalId = this.session.getProfesional()?.id_profesional ?? null;

    const [usuario, profesional, agenda, sistema, recordatorios] = await Promise.all([
      this.perfilApi.getUsuarioActual(),
      this.perfilApi.getProfesionalActual(this.profesionalId).catch(() => null),
      this.configuracionApi.getAgenda().catch(() => null),
      this.configuracionApi.getSistema().catch(() => null),
      this.configuracionApi.getRecordatorios().catch(() => []),
    ]);

    this.userId = usuario.id_usuario;
    this.profesionalId = profesional?.id_profesional ?? this.profesionalId;
    this.sistemaId = sistema?.id_configuracion_sistema ?? null;
    this.sistemaActual = sistema;
    this.recordatoriosActuales = recordatorios;

    this.perfil = {
      nombre: `${usuario.nombre ?? ''} ${usuario.apellido ?? ''}`.trim(),
      email: usuario.email ?? '',
      usuario: usuario.username ?? '',
      telefono: usuario.numero_telefono ?? '',
      domicilio: usuario.domicilio ?? '',
      especialidad: profesional?.especialidad ?? '',
      idioma: sistema?.idioma ?? 'es',
      zonaHoraria: this.toUiTimeZone(sistema?.zona_horaria) ?? 'GMT-6',
      notificacionEmail: this.hasActiveChannel(recordatorios, 'EMAIL'),
      notificacionSMS: this.hasActiveChannel(recordatorios, 'SMS'),
    };

    this.perfilProfesional = {
      consultorio: profesional?.nombre_consulta ?? '',
      direccion: profesional?.direccion_consultorio ?? '',
      telefono: profesional?.telefono_consultorio ?? '',
      descripcion: profesional?.descripcion ?? '',
    };

    this.horarios = {
      duracionCita: Number(sistema?.duracion_cita_default_min ?? agenda?.duracion_cita_default_min ?? 60),
      buffer: Number(agenda?.buffer_citas_min ?? 10),
      inicio: this.normalizeTime(agenda?.hora_inicio_jornada ?? agenda?.hora_inicio) ?? '09:00',
      fin: this.normalizeTime(agenda?.hora_fin_jornada ?? agenda?.hora_fin) ?? '18:00',
    };

    this.originalPerfil = JSON.stringify(this.perfil);
    this.originalPerfilProfesional = JSON.stringify(this.perfilProfesional);
    this.originalHorarios = JSON.stringify(this.horarios);
  }

  private perfilCambio(): boolean {
    return JSON.stringify(this.perfil) !== this.originalPerfil;
  }

  private perfilProfesionalCambio(): boolean {
    return JSON.stringify(this.perfilProfesional) !== this.originalPerfilProfesional;
  }

  private horariosCambio(): boolean {
    return JSON.stringify(this.horarios) !== this.originalHorarios;
  }

  private preferenciasCambio(): boolean {
    return this.perfilCambio();
  }

  private notificacionesCambio(): boolean {
    return this.perfilCambio();
  }

  private tieneCambioPassword(): boolean {
    return !!(this.passwordActual || this.nuevaPassword || this.confirmarPassword);
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

  private splitFullName(fullName: string): [string, string] {
    const normalized = fullName.trim().replace(/\s+/g, ' ');
    if (!normalized) return ['', ''];
    const parts = normalized.split(' ');
    const nombre = parts.shift() ?? '';
    return [nombre, parts.join(' ')];
  }

  private cerrarEdiciones(): void {
    this.editarPersonal = false;
    this.editarPreferencias = false;
    this.editarSeguridad = false;
    this.editarNotificaciones = false;
    this.editarProfesional = false;
    this.editarHorarios = false;
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
