import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { IonicModule, ToastController } from '@ionic/angular';
import { ConfiguracionApiService } from 'src/app/services/configuracion-api.service';
import { EquipoMockService, PERMISOS_DETALLES } from 'src/app/services/equipo.service.mock';
import { PerfilApiService } from 'src/app/services/perfil-api.service';
import { PermisoDetalle, RecepcionistaEquipoViewModel } from 'src/app/shared/models/equipo.model';
import { PermisosRecepcionista } from 'src/app/shared/models/permisos.model';
import { UsuarioMock } from 'src/app/shared/models/usuario.model';
import { mapApiError } from 'src/app/shared/utils/api-error.mapper';
import { AgfTimePickerComponent } from '../../shared/components/agf-time-picker/agf-time-picker.component';
import { ConfiguracionRecordatorioDto } from '../../shared/models/configuracion.models';

const DEFAULTS = {
  vistaDefault: 'semana',
  inicioJornada: '09:00',
  finJornada: '18:00',
  intervaloCalendario: 30,
  duracionCita: 60,
  bufferCitas: 10,
  citasSuperpuestas: false,
  mostrarSabados: true,
  mostrarDomingos: false,
  recordatorioPaciente: true,
  canalSMS: false,
  canalEmail: true,
  tiempoRecordatorio: '1dia',
  recordatorioMismoDia: false,
  tiempoRecordatorioMismoDia: '2h',
  solicitarConfirmacion: true,
  permitirCancelacion: true,
  permitirReprogramacion: true,
  limiteCancelacion: '12h',
  recordatorioProfesional: true,
  notifPacienteConfirma: true,
  notifPacienteCancela: true,
  notifPacienteReprograma: false,
  notifInApp: true,
  alertasSonoras: false,
  avisosCitasProximas: true,
  avisosPacientesNuevos: true,
  avisosPagosPendientes: true,
  tema: 'claro',
  tamanoInterfaz: 'normal',
  animaciones: true,
  idioma: 'es',
  zonaHoraria: 'GMT-6',
  formatoHora: '12h',
  formatoFecha: 'DD/MM/YYYY',
  moneda: 'MXN',
  ocultarDatosSensibles: false,
  confirmarEliminarCitas: true,
  confirmarEliminarPacientes: true,
  vistaPreviaDatos: true,
  bloquearCambiosCriticos: true,
};

type ConfigState = typeof DEFAULTS;
type CfgTab = 'general' | 'agenda' | 'equipo' | 'seguridad' | 'sistema';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, AgfTimePickerComponent],
  templateUrl: './configuracion.page.html',
  styleUrls: ['./configuracion.page.scss']
})
export class ConfiguracionPage implements OnInit {
  config: ConfigState = { ...DEFAULTS };
  private configOriginal: ConfigState = { ...DEFAULTS };
  private sistemaId: number | null = null;
  private recordatoriosActuales: ConfiguracionRecordatorioDto[] = [];
  private cargando = false;
  private guardando = false;

  showResetConfirm = false;
  savedToast = false;
  copiado = false;

  readonly appVersion = '0.0.1-prealpha';
  readonly entorno = 'Desarrollo';
  readonly aboutApp = {
    build: '2026.03.10',
    empresa: 'Scottware',
    contacto: 'soporte@agendify.app',
    sitioWeb: 'https://agendify.app',
  };

  readonly profesionalActual: UsuarioMock;
  codigoVinculacion = '';
  recepcionistas: RecepcionistaEquipoViewModel[];

  modalPermisos: RecepcionistaEquipoViewModel | null = null;
  permisosEditando: PermisosRecepcionista | null = null;
  readonly permisosDetalles: PermisoDetalle[] = PERMISOS_DETALLES;

  activeTab: CfgTab = 'general';
  readonly cfgTabs: { id: CfgTab; label: string; icon: string }[] = [
    { id: 'general', label: 'General', icon: 'apps-outline' },
    { id: 'agenda', label: 'Agenda', icon: 'calendar-outline' },
    { id: 'equipo', label: 'Equipo', icon: 'people-circle-outline' },
    { id: 'seguridad', label: 'Seguridad', icon: 'shield-checkmark-outline' },
    { id: 'sistema', label: 'Sistema', icon: 'construct-outline' },
  ];

  constructor(
    private equipoSvc: EquipoMockService,
    private route: ActivatedRoute,
    private configuracionApi: ConfiguracionApiService,
    private perfilApi: PerfilApiService,
    private toastCtrl: ToastController,
  ) {
    this.profesionalActual = this.equipoSvc.getProfesionalActual();
    this.recepcionistas = this.equipoSvc.getRecepcionistasDelProfesional();
  }

  ngOnInit(): void {
    const tabParam = this.route.snapshot.queryParamMap.get('tab');
    if (tabParam && this.cfgTabs.some(tab => tab.id === tabParam)) {
      this.activeTab = tabParam as CfgTab;
    }

    void this.cargarConfiguracionReal();
  }

  hasChanges(): boolean {
    return JSON.stringify(this.config) !== JSON.stringify(this.configOriginal);
  }

  setTab(tab: CfgTab): void {
    this.activeTab = tab;
  }

  async guardar(): Promise<void> {
    if (!this.hasChanges() || this.guardando) return;

    try {
      this.guardando = true;

      const agendaGuardada = await this.configuracionApi.saveAgenda({
        hora_inicio_jornada: this.config.inicioJornada,
        hora_fin_jornada: this.config.finJornada,
        intervalo_calendario_min: Number(this.config.intervaloCalendario),
        duracion_cita_default_min: Number(this.config.duracionCita),
        buffer_citas_min: Number(this.config.bufferCitas),
        citas_superpuestas: this.config.citasSuperpuestas,
        mostrar_sabados: this.config.mostrarSabados,
        mostrar_domingos: this.config.mostrarDomingos,
        vista_default: this.config.vistaDefault,
      });

      const sistemaGuardado = await this.configuracionApi.saveSistema({
        zona_horaria: this.toBackendTimeZone(this.config.zonaHoraria),
        moneda: this.config.moneda,
        formato_hora: this.toBackendHourFormat(this.config.formatoHora),
        duracion_cita_default_min: Number(this.config.duracionCita),
        politica_cancelacion_horas: this.presetToHours(this.config.limiteCancelacion),
        permite_confirmacion_publica: this.config.solicitarConfirmacion,
        idioma: this.config.idioma,
        tema: this.config.tema,
        tamano_interfaz: this.config.tamanoInterfaz,
        animaciones: this.config.animaciones,
      }, this.sistemaId);

      this.sistemaId = sistemaGuardado.id_configuracion_sistema ?? this.sistemaId;
      await this.guardarRecordatorios();

      this.config = this.mergeConfig(agendaGuardada, sistemaGuardado, this.recordatoriosActuales);
      this.configOriginal = { ...this.config };
      this.savedToast = true;
      setTimeout(() => (this.savedToast = false), 2800);
    } catch (error) {
      await this.presentToast(mapApiError(error).userMessage, 'danger');
    } finally {
      this.guardando = false;
    }
  }

  pedirReset(): void {
    this.showResetConfirm = true;
  }

  cancelarReset(): void {
    this.showResetConfirm = false;
  }

  confirmarReset(): void {
    this.config = { ...DEFAULTS };
    this.showResetConfirm = false;
  }

  copiarCodigo(): void {
    navigator.clipboard.writeText(this.codigoVinculacion || '').catch(() => {});
    this.copiado = true;
    setTimeout(() => (this.copiado = false), 2000);
  }

  abrirModalPermisos(r: RecepcionistaEquipoViewModel): void {
    this.modalPermisos = r;
    this.permisosEditando = { ...r.permisos };
  }

  cerrarModalPermisos(): void {
    this.modalPermisos = null;
    this.permisosEditando = null;
  }

  setPermiso(key: keyof PermisosRecepcionista, event: Event): void {
    if (!this.permisosEditando) return;
    this.permisosEditando[key] = (event as CustomEvent<{ checked: boolean }>).detail.checked;
  }

  guardarPermisos(): void {
    if (!this.modalPermisos || !this.permisosEditando) return;
    this.equipoSvc.updateRecepcionistaPermisos(this.modalPermisos.id, { ...this.permisosEditando });
    this.recepcionistas = this.equipoSvc.getRecepcionistasDelProfesional();
    this.cerrarModalPermisos();
  }

  toggleActivo(r: RecepcionistaEquipoViewModel): void {
    this.equipoSvc.setRecepcionistaActivo(r.id, !r.activo);
    this.recepcionistas = this.equipoSvc.getRecepcionistasDelProfesional();
  }

  private async cargarConfiguracionReal(): Promise<void> {
    if (this.cargando) return;

    try {
      this.cargando = true;

      const [agenda, sistema, recordatorios, codigo] = await Promise.all([
        this.configuracionApi.getAgenda(),
        this.configuracionApi.getSistema().catch(() => null),
        this.configuracionApi.getRecordatorios().catch(() => []),
        this.perfilApi.getCodigoVinculacion().catch(() => null),
      ]);

      this.sistemaId = sistema?.id_configuracion_sistema ?? null;
      this.recordatoriosActuales = recordatorios;
      this.codigoVinculacion = codigo ?? '';
      this.config = this.mergeConfig(agenda, sistema, recordatorios);
      this.configOriginal = { ...this.config };
    } catch (error) {
      await this.presentToast(mapApiError(error).userMessage, 'danger');
    } finally {
      this.cargando = false;
    }
  }

  private mergeConfig(agenda: any, sistema: any, recordatorios: ConfiguracionRecordatorioDto[]): ConfigState {
    const merged = { ...DEFAULTS };
    const primaryRule = this.getPrimaryReminderRule(recordatorios);
    const sameDayRule = this.getSameDayReminderRule(recordatorios, primaryRule);
    const activeManagedRules = this.getActiveManagedRules(recordatorios);

    merged.vistaDefault = agenda?.vista_default ?? merged.vistaDefault;
    merged.inicioJornada = this.normalizeTime(agenda?.hora_inicio_jornada ?? agenda?.hora_inicio) ?? merged.inicioJornada;
    merged.finJornada = this.normalizeTime(agenda?.hora_fin_jornada ?? agenda?.hora_fin) ?? merged.finJornada;
    merged.intervaloCalendario = Number(
      agenda?.intervalo_calendario_min ?? agenda?.intervalo_minutos ?? agenda?.intervalo ?? merged.intervaloCalendario,
    );
    merged.duracionCita = Number(
      sistema?.duracion_cita_default_min ?? agenda?.duracion_cita_default_min ?? merged.duracionCita,
    );
    merged.bufferCitas = Number(agenda?.buffer_citas_min ?? merged.bufferCitas);
    merged.citasSuperpuestas = agenda?.citas_superpuestas ?? merged.citasSuperpuestas;
    merged.mostrarSabados = agenda?.mostrar_sabados ?? merged.mostrarSabados;
    merged.mostrarDomingos = agenda?.mostrar_domingos ?? merged.mostrarDomingos;
    merged.recordatorioPaciente = activeManagedRules.length > 0;
    merged.canalEmail = activeManagedRules.some(rule => rule.canal === 'EMAIL');
    merged.canalSMS = activeManagedRules.some(rule => rule.canal === 'SMS');
    merged.tiempoRecordatorio = this.minutesToReminderPreset(
      primaryRule?.anticipacion_minutos ?? this.reminderPresetToMinutes(merged.tiempoRecordatorio),
      false,
    );
    merged.recordatorioMismoDia = !!sameDayRule;
    merged.tiempoRecordatorioMismoDia = this.minutesToReminderPreset(
      sameDayRule?.anticipacion_minutos ?? this.reminderPresetToMinutes(merged.tiempoRecordatorioMismoDia),
      true,
    );
    merged.solicitarConfirmacion = sistema?.permite_confirmacion_publica ?? merged.solicitarConfirmacion;
    merged.limiteCancelacion = this.hoursToPreset(
      Number(sistema?.politica_cancelacion_horas ?? this.presetToHours(merged.limiteCancelacion)),
    );
    merged.tema = sistema?.tema ?? merged.tema;
    merged.tamanoInterfaz = sistema?.tamano_interfaz ?? merged.tamanoInterfaz;
    merged.animaciones = sistema?.animaciones ?? merged.animaciones;
    merged.idioma = sistema?.idioma ?? merged.idioma;
    merged.zonaHoraria = this.toUiTimeZone(sistema?.zona_horaria) ?? merged.zonaHoraria;
    merged.formatoHora = this.toUiHourFormat(sistema?.formato_hora) ?? merged.formatoHora;
    merged.moneda = sistema?.moneda ?? merged.moneda;

    return merged;
  }

  private async guardarRecordatorios(): Promise<void> {
    const body = {
      recordatorio_paciente_activo: this.config.recordatorioPaciente,
      canal_email: this.config.canalEmail,
      canal_sms: this.config.canalSMS,
      anticipacion_minutos: this.reminderPresetToMinutes(this.config.tiempoRecordatorio),
      recordatorio_mismo_dia_activo: this.config.recordatorioMismoDia,
      anticipacion_mismo_dia_minutos: this.reminderPresetToMinutes(this.config.tiempoRecordatorioMismoDia),
      solicitar_confirmacion: this.config.solicitarConfirmacion,
    };

    try {
      this.recordatoriosActuales = await this.configuracionApi.saveRecordatoriosUnificado(body);
    } catch (error) {
      if (!(error instanceof HttpErrorResponse) || ![404, 405].includes(error.status)) {
        throw error;
      }
      await this.syncRecordatoriosComoColeccion();
      this.recordatoriosActuales = await this.configuracionApi.getRecordatorios().catch(() => this.recordatoriosActuales);
    }
  }

  private async syncRecordatoriosComoColeccion(): Promise<void> {
    const desiredRules = this.buildDesiredReminderRules();
    const existingManaged = this.recordatoriosActuales.filter(rule => this.isManagedReminderChannel(rule.canal));

    for (const desired of desiredRules) {
      const existing = existingManaged.find(rule =>
        rule.canal === desired.canal && rule.anticipacion_minutos === desired.anticipacion_minutos,
      );

      if (!existing) {
        await this.configuracionApi.createRecordatorio(desired);
        continue;
      }

      if (existing.id_configuracion_recordatorio) {
        await this.configuracionApi.updateRecordatorio(existing.id_configuracion_recordatorio, desired);
        if (existing.activo === false) {
          await this.configuracionApi.setActivoRecordatorio(existing.id_configuracion_recordatorio, true);
        }
      }
    }

    for (const existing of existingManaged) {
      const stillDesired = desiredRules.some(desired =>
        desired.canal === existing.canal && desired.anticipacion_minutos === existing.anticipacion_minutos,
      );

      if (!stillDesired && existing.id_configuracion_recordatorio && existing.activo !== false) {
        await this.configuracionApi.setActivoRecordatorio(existing.id_configuracion_recordatorio, false);
      }
    }
  }

  private buildDesiredReminderRules(): Array<{ canal: string; anticipacion_minutos: number; mensaje_personalizado: null; activo: true }> {
    if (!this.config.recordatorioPaciente) return [];

    const channels = [
      this.config.canalEmail ? 'EMAIL' : null,
      this.config.canalSMS ? 'SMS' : null,
    ].filter((value): value is string => !!value);

    const reminders = channels.map(canal => ({
      canal,
      anticipacion_minutos: this.reminderPresetToMinutes(this.config.tiempoRecordatorio),
      mensaje_personalizado: null,
      activo: true as const,
    }));

    if (this.config.recordatorioMismoDia) {
      const sameDayMinutes = this.reminderPresetToMinutes(this.config.tiempoRecordatorioMismoDia);
      for (const canal of channels) {
        reminders.push({
          canal,
          anticipacion_minutos: sameDayMinutes,
          mensaje_personalizado: null,
          activo: true as const,
        });
      }
    }

    return reminders.filter((item, index, list) =>
      list.findIndex(other => other.canal === item.canal && other.anticipacion_minutos === item.anticipacion_minutos) === index,
    );
  }

  private getActiveManagedRules(recordatorios: ConfiguracionRecordatorioDto[]): ConfiguracionRecordatorioDto[] {
    return recordatorios
      .filter(rule => this.isManagedReminderChannel(rule.canal) && rule.activo !== false)
      .sort((a, b) => b.anticipacion_minutos - a.anticipacion_minutos);
  }

  private getPrimaryReminderRule(recordatorios: ConfiguracionRecordatorioDto[]): ConfiguracionRecordatorioDto | null {
    const rules = this.getActiveManagedRules(recordatorios);
    return rules[0] ?? null;
  }

  private getSameDayReminderRule(
    recordatorios: ConfiguracionRecordatorioDto[],
    primaryRule: ConfiguracionRecordatorioDto | null,
  ): ConfiguracionRecordatorioDto | null {
    const rules = this.getActiveManagedRules(recordatorios).filter(rule => rule.anticipacion_minutos <= 180);
    if (rules.length === 0 || !primaryRule) return null;
    if (primaryRule.anticipacion_minutos <= 180 && rules.length === 1) return null;
    return rules.sort((a, b) => b.anticipacion_minutos - a.anticipacion_minutos)[0] ?? null;
  }

  private isManagedReminderChannel(channel: string): boolean {
    return ['EMAIL', 'SMS'].includes(String(channel ?? '').toUpperCase());
  }

  private reminderPresetToMinutes(value: string): number {
    switch (value) {
      case '1h': return 60;
      case '2h': return 120;
      case '3h': return 180;
      case '6h': return 360;
      case '12h': return 720;
      case '1dia': return 1440;
      case '2dias': return 2880;
      default: return 1440;
    }
  }

  private minutesToReminderPreset(value: number, sameDay: boolean): string {
    if (sameDay) {
      if (value <= 60) return '1h';
      if (value <= 120) return '2h';
      return '3h';
    }

    if (value <= 60) return '1h';
    if (value <= 120) return '2h';
    if (value <= 360) return '6h';
    if (value <= 720) return '12h';
    if (value <= 1440) return '1dia';
    return '2dias';
  }

  private presetToHours(value: string): number {
    switch (value) {
      case '1h': return 1;
      case '2h': return 2;
      case '6h': return 6;
      case '12h': return 12;
      case '24h': return 24;
      case '48h': return 48;
      default: return 12;
    }
  }

  private hoursToPreset(value: number): string {
    if (value <= 1) return '1h';
    if (value <= 2) return '2h';
    if (value <= 6) return '6h';
    if (value <= 12) return '12h';
    if (value <= 24) return '24h';
    return '48h';
  }

  private toUiTimeZone(value?: string | null): string | null {
    switch (value) {
      case 'America/Mexico_City': return 'GMT-6';
      case 'America/Bogota': return 'GMT-5';
      case 'America/Santiago': return 'GMT-4';
      case 'America/Argentina/Buenos_Aires': return 'GMT-3';
      default: return value ?? null;
    }
  }

  private toBackendTimeZone(value: string): string {
    switch (value) {
      case 'GMT-6': return 'America/Mexico_City';
      case 'GMT-5': return 'America/Bogota';
      case 'GMT-4': return 'America/Santiago';
      case 'GMT-3': return 'America/Argentina/Buenos_Aires';
      default: return value;
    }
  }

  private toUiHourFormat(value?: string | null): string | null {
    return value === '24h' ? '24h' : value === '12h' ? '12h' : null;
  }

  private toBackendHourFormat(value: string): string {
    return value === '24h' ? '24h' : '12h';
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
