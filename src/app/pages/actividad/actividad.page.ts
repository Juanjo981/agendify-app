import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';

type TipoEvento = 'agenda' | 'equipo' | 'sistema';
type FiltroActivo = 'todos' | TipoEvento;

interface EventoActividad {
  tipo: TipoEvento;
  icono: string;
  titulo: string;
  descripcion: string;
  tiempo: string;
  fecha: 'hoy' | 'ayer' | 'anterior';
}

@Component({
  selector: 'app-actividad',
  standalone: true,
  imports: [IonicModule, CommonModule],
  templateUrl: './actividad.page.html',
  styleUrls: ['./actividad.page.scss'],
})
export class ActividadPage {

  filtroActivo: FiltroActivo = 'todos';

  filtros: { label: string; value: FiltroActivo; icono: string }[] = [
    { label: 'Todos',   value: 'todos',   icono: 'apps-outline'       },
    { label: 'Agenda',  value: 'agenda',  icono: 'calendar-outline'   },
    { label: 'Equipo',  value: 'equipo',  icono: 'people-outline'     },
    { label: 'Sistema', value: 'sistema', icono: 'settings-outline'   },
  ];

  private todos: EventoActividad[] = [
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

  get eventosFiltrados(): EventoActividad[] {
    if (this.filtroActivo === 'todos') return this.todos;
    return this.todos.filter(e => e.tipo === this.filtroActivo);
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
    return { agenda: 'calendar-outline', equipo: 'people-outline', sistema: 'settings-outline' }[tipo];
  }
}
