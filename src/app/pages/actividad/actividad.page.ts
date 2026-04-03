import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SolicitudReprogramacionService } from '../citas/solicitud-reprogramacion.service.mock';
import { SolicitudReprogramacion } from 'src/app/shared/models/solicitud-reprogramacion.model';
import { tiempoRelativo, formatFechaLarga } from '../../shared/utils/date.utils';
import { SolicitudReprogramacionModalComponent } from 'src/app/shared/components/solicitud-reprogramacion-modal/solicitud-reprogramacion-modal.component';

type TipoEvento = 'agenda' | 'equipo' | 'sistema' | 'reprogramar';
type FiltroActivo = 'todos' | 'agenda' | 'equipo' | 'sistema';

interface EventoActividad {
  tipo: TipoEvento;
  icono: string;
  titulo: string;
  descripcion: string;
  tiempo: string;
  fecha: 'hoy' | 'ayer' | 'anterior';
  /** If set, clicking "Ver solicitud" opens the reprogramación modal */
  solicitudId?: number;
}

@Component({
  selector: 'app-actividad',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, SolicitudReprogramacionModalComponent],
  templateUrl: './actividad.page.html',
  styleUrls: ['./actividad.page.scss'],
})
export class ActividadPage {

  constructor(private solicitudSvc: SolicitudReprogramacionService) {
    this.cargarSolicitudes();
  }

  // ─── Modal de solicitud ──────────────────────────────────────────────────
  solicitudSeleccionada: SolicitudReprogramacion | null = null;
  showSolicitudModal = false;

  abrirSolicitud(solicitudId: number): void {
    const s = this.solicitudSvc.getById(solicitudId);
    if (!s) return;
    this.solicitudSeleccionada = s;
    this.showSolicitudModal = true;
  }

  onSolicitudAceptada(): void {
    if (!this.solicitudSeleccionada) return;
    this.solicitudSvc.aceptar(this.solicitudSeleccionada.idSolicitud);
    this.eliminarSolicitudDeLista(this.solicitudSeleccionada.idSolicitud);
    this.showSolicitudModal = false;
    this.solicitudSeleccionada = null;
  }

  onSolicitudRechazada(motivo: string): void {
    if (!this.solicitudSeleccionada) return;
    this.solicitudSvc.rechazar(this.solicitudSeleccionada.idSolicitud);
    this.eliminarSolicitudDeLista(this.solicitudSeleccionada.idSolicitud);
    this.showSolicitudModal = false;
    this.solicitudSeleccionada = null;
  }

  onVerAgenda(): void {
    this.showSolicitudModal = false;
    this.solicitudSeleccionada = null;
  }

  cerrarSolicitudModal(): void {
    this.showSolicitudModal = false;
    this.solicitudSeleccionada = null;
  }

  private eliminarSolicitudDeLista(idSolicitud: number): void {
    this._todos = this._todos.filter(e => e.solicitudId !== idSolicitud);
  }

  // ─── Filtros ─────────────────────────────────────────────────────────────
  filtroActivo: FiltroActivo = 'todos';

  filtros: { label: string; value: FiltroActivo; icono: string }[] = [
    { label: 'Todos',   value: 'todos',   icono: 'apps-outline'       },
    { label: 'Agenda',  value: 'agenda',  icono: 'calendar-outline'   },
    { label: 'Equipo',  value: 'equipo',  icono: 'people-outline'     },
    { label: 'Sistema', value: 'sistema', icono: 'settings-outline'   },
  ];

  private _todos: EventoActividad[] = [
    // ── HOY ──────────────────────────────────────────────────────────────
    {
      tipo: 'agenda', icono: 'calendar-outline',
      titulo: 'Cita próxima',
      descripcion: 'Tienes una cita con Carlos Méndez hoy a las 4:00 PM.',
      tiempo: 'Hace 10 min', fecha: 'hoy',
    },
    {
      tipo: 'agenda', icono: 'calendar-outline',
      titulo: 'Nueva cita registrada',
      descripcion: 'Se agendó una consulta para María López el 15 de marzo.',
      tiempo: 'Hace 1 hora', fecha: 'hoy',
    },
    {
      tipo: 'sistema', icono: 'settings-outline',
      titulo: 'Configuración actualizada',
      descripcion: 'Los horarios del consultorio fueron actualizados correctamente.',
      tiempo: 'Hace 2 horas', fecha: 'hoy',
    },
    // ── AYER ─────────────────────────────────────────────────────────────
    {
      tipo: 'agenda', icono: 'refresh-outline',
      titulo: 'Cita reprogramada',
      descripcion: 'La cita de Pedro García fue movida al 18 de marzo a las 11:00 AM.',
      tiempo: 'Ayer, 3:45 PM', fecha: 'ayer',
    },
    {
      tipo: 'equipo', icono: 'people-outline',
      titulo: 'Recepcionista vinculado',
      descripcion: 'Laura Torres se unió al consultorio como recepcionista.',
      tiempo: 'Ayer, 10:12 AM', fecha: 'ayer',
    },
    {
      tipo: 'sistema', icono: 'shield-checkmark-outline',
      titulo: 'Permisos actualizados',
      descripcion: 'Los permisos de Laura Torres fueron configurados: acceso a citas y pacientes.',
      tiempo: 'Ayer, 10:15 AM', fecha: 'ayer',
    },
    // ── ANTERIORES ───────────────────────────────────────────────────────
    {
      tipo: 'agenda', icono: 'calendar-outline',
      titulo: 'Cita completada',
      descripcion: 'La sesión con Andrés Villa fue marcada como completada.',
      tiempo: 'Hace 3 días', fecha: 'anterior',
    },
    {
      tipo: 'agenda', icono: 'close-circle-outline',
      titulo: 'Cita cancelada',
      descripcion: 'La cita de Rosa Jiménez del 8 de marzo fue cancelada.',
      tiempo: 'Hace 3 días', fecha: 'anterior',
    },
    {
      tipo: 'sistema', icono: 'notifications-outline',
      titulo: 'Recordatorios activados',
      descripcion: 'Los recordatorios automáticos de citas están activos.',
      tiempo: 'Hace 5 días', fecha: 'anterior',
    },
    {
      tipo: 'equipo', icono: 'link-outline',
      titulo: 'Código de vinculación generado',
      descripcion: 'Se generó un nuevo código de vinculación para el consultorio.',
      tiempo: 'Hace 7 días', fecha: 'anterior',
    },
  ];

  // ─── Inject solicitudes PENDIENTES from the service ─────────────────────
  private cargarSolicitudes(): void {
    const pendientes = this.solicitudSvc.getPendientes();
    const eventos: EventoActividad[] = pendientes.map(s => ({
      tipo:        'reprogramar' as TipoEvento,
      icono:       'swap-horizontal-outline',
      titulo:      'Solicitud de reprogramación',
      descripcion: `${s.pacienteNombre} quiere cambiar su cita del ${formatFechaLarga(s.fechaCita)} • ${s.horaCita}`,
      tiempo:      tiempoRelativo(s.fechaSolicitud),
      fecha:       'hoy' as const,
      solicitudId: s.idSolicitud,
    }));
    // Prepend so they appear first inside "hoy"
    this._todos = [...eventos, ...this._todos];
  }

  private formatFecha(isoDate: string): string {
    return formatFechaLarga(isoDate);
  }

  private tiempoRelativo(isoDate: string): string {
    return tiempoRelativo(isoDate);
  }

  // ─── Filtered getters ────────────────────────────────────────────────────
  get eventosFiltrados(): EventoActividad[] {
    if (this.filtroActivo === 'todos') return this._todos;
    // 'reprogramar' tipo is shown under 'agenda' filter
    const matchAgenda = this.filtroActivo === 'agenda';
    return this._todos.filter(e =>
      e.tipo === this.filtroActivo || (matchAgenda && e.tipo === 'reprogramar')
    );
  }

  get eventoHoy(): EventoActividad[] {
    return this.eventosFiltrados.filter(e => e.fecha === 'hoy');
  }

  get eventoAyer(): EventoActividad[] {
    return this.eventosFiltrados.filter(e => e.fecha === 'ayer');
  }

  get eventoAnteriores(): EventoActividad[] {
    return this.eventosFiltrados.filter(e => e.fecha === 'anterior');
  }

  setFiltro(f: FiltroActivo) {
    this.filtroActivo = f;
  }

  iconoPorTipo(tipo: TipoEvento): string {
    const map: Record<TipoEvento, string> = {
      agenda:       'calendar-outline',
      equipo:       'people-outline',
      sistema:      'settings-outline',
      reprogramar:  'swap-horizontal-outline',
    };
    return map[tipo];
  }
}
