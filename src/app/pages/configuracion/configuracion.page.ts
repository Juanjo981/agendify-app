import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EquipoMockService, PERMISOS_DETALLES } from 'src/app/services/equipo.mock';
import { UsuarioMock } from 'src/app/shared/models/usuario.model';
import { PermisosRecepcionista } from 'src/app/shared/models/permisos.model';
import { PermisoDetalle, RecepcionistaEquipoViewModel } from 'src/app/shared/models/equipo.model';

const DEFAULTS = {
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

  // Notificaciones del sistema
  notifInApp: true,
  alertasSonoras: false,
  avisosCitasProximas: true,
  avisosPacientesNuevos: true,
  avisosPagosPendientes: true,

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

type CfgTab = 'general' | 'agenda' | 'equipo' | 'seguridad' | 'sistema';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  templateUrl: './configuracion.page.html',
  styleUrls: ['./configuracion.page.scss']
})
export class ConfiguracionPage {
  config = { ...DEFAULTS };
  private configOriginal = { ...DEFAULTS };

  hasChanges(): boolean {
    return JSON.stringify(this.config) !== JSON.stringify(this.configOriginal);
  }

  showResetConfirm = false;
  savedToast = false;
  copiado = false;

  readonly appVersion = '0.0.1-prealpha';
  readonly entorno = 'Desarrollo';

  readonly aboutApp = {
    build:     '2026.03.10',
    empresa:   'Scottware',
    contacto:  'soporte@agendify.app',
    sitioWeb:  'https://agendify.app',
  };

  // ─── Datos de equipo (resueltos por EquipoMockService) ─────────────────────
  readonly profesionalActual: UsuarioMock;
  readonly codigoVinculacion: string;
  recepcionistas: RecepcionistaEquipoViewModel[];

  // ─── Modal de permisos ──────────────────────────────────────────────
  /** Recepcionista cuyo modal de permisos está abierto, o null si cerrado */
  modalPermisos: RecepcionistaEquipoViewModel | null = null;
  /** Copia de trabajo de los permisos mientras el modal está abierto */
  permisosEditando: PermisosRecepcionista | null = null;
  /** Definición estática de permisos con etiquetas, descripciones e iconos */
  readonly permisosDetalles: PermisoDetalle[] = PERMISOS_DETALLES;

  // ─── Tab navigation ──────────────────────────────────────────────────────────
  activeTab: CfgTab = 'general';

  readonly cfgTabs: { id: CfgTab; label: string; icon: string }[] = [
    { id: 'general',   label: 'General',   icon: 'apps-outline'             },
    { id: 'agenda',    label: 'Agenda',    icon: 'calendar-outline'         },
    { id: 'equipo',    label: 'Equipo',    icon: 'people-circle-outline'    },
    { id: 'seguridad', label: 'Seguridad', icon: 'shield-checkmark-outline' },
    { id: 'sistema',   label: 'Sistema',   icon: 'construct-outline'        },
  ];

  setTab(tab: CfgTab): void {
    this.activeTab = tab;
  }

  constructor(private equipoSvc: EquipoMockService) {
    this.profesionalActual  = this.equipoSvc.getProfesionalActual();
    this.codigoVinculacion  = this.equipoSvc.getCodigoVinculacion();
    this.recepcionistas     = this.equipoSvc.getRecepcionistasDelProfesional();
  }

  guardar() {
    console.log('Configuración guardada:', this.config);
    this.configOriginal = { ...this.config };
    this.savedToast = true;
    setTimeout(() => (this.savedToast = false), 2800);
  }

  pedirReset() { this.showResetConfirm = true; }
  cancelarReset() { this.showResetConfirm = false; }
  confirmarReset() {
    this.config = { ...DEFAULTS };
    this.configOriginal = { ...DEFAULTS };
    this.showResetConfirm = false;
  }

  copiarCodigo() {
    navigator.clipboard.writeText(this.codigoVinculacion).catch(() => {});
    this.copiado = true;
    setTimeout(() => (this.copiado = false), 2000);
  }

  // ─── Modal de permisos ───────────────────────────────────────────────

  /** Abre el modal de permisos para el recepcionista dado, con una copia de trabajo. */
  abrirModalPermisos(r: RecepcionistaEquipoViewModel): void {
    this.modalPermisos    = r;
    this.permisosEditando = { ...r.permisos };
  }

  /** Descarta los cambios y cierra el modal. */
  cerrarModalPermisos(): void {
    this.modalPermisos    = null;
    this.permisosEditando = null;
  }

  /**
   * Actualiza un permiso individual en la copia de trabajo.
   * Se llama desde el evento (ionChange) del ion-toggle del modal.
   */
  setPermiso(key: keyof PermisosRecepcionista, event: Event): void {
    if (this.permisosEditando) {
      this.permisosEditando[key] = (event as CustomEvent<{ checked: boolean }>).detail.checked;
    }
  }

  /** Persiste los cambios mock y refresca la lista. */
  guardarPermisos(): void {
    if (!this.modalPermisos || !this.permisosEditando) return;
    this.equipoSvc.updateRecepcionistaPermisos(this.modalPermisos.id, { ...this.permisosEditando });
    this.recepcionistas = this.equipoSvc.getRecepcionistasDelProfesional();
    this.cerrarModalPermisos();
  }

  /**
   * Invierte el estado activo del recepcionista y refresca el listado.
   * Llama a `setRecepcionistaActivo` con el valor negado para mayor claridad
   * de intención (no depende de efectos de toggle interno del servicio).
   */
  toggleActivo(r: RecepcionistaEquipoViewModel): void {
    this.equipoSvc.setRecepcionistaActivo(r.id, !r.activo);
    this.recepcionistas = this.equipoSvc.getRecepcionistasDelProfesional();
  }
}
