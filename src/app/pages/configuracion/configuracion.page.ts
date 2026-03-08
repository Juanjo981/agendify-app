import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

const DEFAULTS = {
  // General
  boletines: true,
  encuestas: false,
  consejosApp: true,
  tooltips: true,
  confirmarAcciones: true,

  // Agenda
  vistaDefault: 'semana',
  inicioJornada: '09:00',
  finJornada: '18:00',
  intervaloCalendario: 30,
  duracionCita: 60,
  bufferCitas: 10,
  citasSuperpuestas: false,
  mostrarSabados: true,
  mostrarDomingos: false,

  // Recordatorios
  recordatorioPaciente: true,
  tiempoRecordatorio: '1dia',
  recordatorioProfesional: true,
  notificarCancelaciones: true,
  notificarReprogramaciones: true,
  mensajeConfirmacionCita: true,

  // Notificaciones del sistema
  notifInApp: true,
  alertasSonoras: false,
  avisosCitasProximas: true,
  avisosPacientesNuevos: true,
  avisosPagosPendientes: true,
  avisosReprogramaciones: true,

  // Apariencia
  tema: 'claro',
  tamanoInterfaz: 'normal',
  animaciones: true,

  // Preferencias regionales
  idioma: 'es',
  zonaHoraria: 'GMT-6',
  formatoHora: '12h',
  formatoFecha: 'DD/MM/YYYY',
  moneda: 'MXN',

  // Privacidad
  ocultarDatosSensibles: false,
  confirmarEliminarCitas: true,
  confirmarEliminarPacientes: true,
  vistaPreviaDatos: true,
  bloquearCambiosCriticos: true,
};

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  templateUrl: './configuracion.page.html',
  styleUrls: ['./configuracion.page.scss']
})
export class ConfiguracionPage {
  config = { ...DEFAULTS };

  showResetConfirm = false;
  savedToast = false;

  readonly appVersion = '0.0.1-prealpha';
  readonly entorno = 'Desarrollo';

  readonly integraciones = [
    { nombre: 'Google Calendar', desc: 'Sincroniza citas automáticamente', icon: 'calendar-outline', color: 'linear-gradient(135deg,#4285F4,#34A853)' },
    { nombre: 'WhatsApp Business', desc: 'Envía recordatorios a pacientes', icon: 'logo-whatsapp', color: 'linear-gradient(135deg,#25D366,#128C7E)' },
    { nombre: 'Correo transaccional', desc: 'Confirmaciones y alertas por email', icon: 'mail-outline', color: 'linear-gradient(135deg,#6366f1,#3b3f92)' },
    { nombre: 'Videollamadas', desc: 'Consultas en línea integradas', icon: 'videocam-outline', color: 'linear-gradient(135deg,#14b8a6,#0d9488)' },
    { nombre: 'Pagos en línea', desc: 'Cobra consultas directamente', icon: 'card-outline', color: 'linear-gradient(135deg,#f97316,#ea580c)' },
    { nombre: 'Facturación', desc: 'Genera y envía facturas fiscales', icon: 'receipt-outline', color: 'linear-gradient(135deg,#a855f7,#9333ea)' },
  ];

  guardar() {
    console.log('Configuración guardada:', this.config);
    this.savedToast = true;
    setTimeout(() => (this.savedToast = false), 2800);
  }

  pedirReset() {
    this.showResetConfirm = true;
  }

  cancelarReset() {
    this.showResetConfirm = false;
  }

  confirmarReset() {
    this.config = { ...DEFAULTS };
    this.showResetConfirm = false;
  }
}
