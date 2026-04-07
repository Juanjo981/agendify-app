import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { PageResponse } from 'src/app/shared/models/page.model';
import { buildQueryParams } from 'src/app/shared/utils/query-params.utils';
import { tiempoRelativo } from 'src/app/shared/utils/date.utils';

export type ActividadTipo = 'agenda' | 'equipo' | 'sistema' | 'reprogramar';
export type ActividadFechaGrupo = 'hoy' | 'ayer' | 'anterior';

export interface HistorialEventoDto {
  id_historial_evento: number;
  id_profesional?: number | null;
  entidad_tipo?: string | null;
  entidad_id?: number | null;
  evento_tipo?: string | null;
  descripcion?: string | null;
  usuario_actor_id?: number | null;
  fecha_evento: string;
  metadata_json?: string | null;
}

export interface ActividadFeedItem {
  id: number;
  tipo: ActividadTipo;
  icono: string;
  titulo: string;
  descripcion: string;
  tiempo: string;
  fecha: ActividadFechaGrupo;
  fechaEvento: string;
  entidadTipo?: string | null;
  entidadId?: number | null;
  eventoTipo?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ActividadApiService {
  private readonly base = `${environment.apiUrl}/historial-eventos`;

  constructor(private http: HttpClient) {}

  async getAll(params: {
    entidadTipo?: string;
    entidadId?: number;
    eventoTipo?: string;
    search?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    page?: number;
    size?: number;
    sort?: string;
  } = {}): Promise<PageResponse<ActividadFeedItem>> {
    const query = buildQueryParams({
      entidadTipo: params.entidadTipo,
      entidadId: params.entidadId,
      eventoTipo: params.eventoTipo,
      search: params.search,
      fechaDesde: params.fechaDesde,
      fechaHasta: params.fechaHasta,
      page: params.page,
      size: params.size ?? 100,
      sort: params.sort ?? 'fecha_evento,desc',
    });

    const response = await firstValueFrom(
      this.http.get<PageResponse<HistorialEventoDto>>(this.base, { params: query })
    );

    return {
      ...response,
      content: (response.content ?? []).map(item => this.mapFeedItem(item)),
    };
  }

  private mapFeedItem(item: HistorialEventoDto): ActividadFeedItem {
    const meta = this.parseMetadata(item.metadata_json);
    const tipo = this.mapTipo(item, meta);

    return {
      id: item.id_historial_evento,
      tipo,
      icono: this.mapIcono(item, tipo),
      titulo: this.mapTitulo(item, meta),
      descripcion: this.mapDescripcion(item, meta),
      tiempo: tiempoRelativo(item.fecha_evento),
      fecha: this.mapFechaGrupo(item.fecha_evento),
      fechaEvento: item.fecha_evento,
      entidadTipo: item.entidad_tipo,
      entidadId: item.entidad_id,
      eventoTipo: item.evento_tipo,
    };
  }

  private mapTipo(item: HistorialEventoDto, meta: Record<string, unknown>): ActividadTipo {
    const evento = (item.evento_tipo ?? '').toUpperCase();
    const entidad = (item.entidad_tipo ?? '').toUpperCase();

    if (
      entidad === 'RECEPCIONISTA' ||
      evento.includes('RECEPCIONISTA') ||
      evento.includes('VINCULACION') ||
      evento.includes('PERMISO') ||
      evento.includes('EQUIPO')
    ) {
      return 'equipo';
    }

    if (
      entidad === 'CONFIGURACION_SISTEMA' ||
      entidad === 'USUARIO' ||
      evento.includes('CONFIGURACION') ||
      evento.includes('PASSWORD') ||
      evento.includes('CONTRASENA') ||
      evento.includes('PERFIL') ||
      evento.includes('NOTIFICACION')
    ) {
      return 'sistema';
    }

    if (
      evento.includes('REPROGRAMACION') ||
      String(meta['tipo'] ?? '').toUpperCase().includes('REPROGRAMACION')
    ) {
      return 'reprogramar';
    }

    return 'agenda';
  }

  private mapIcono(item: HistorialEventoDto, tipo: ActividadTipo): string {
    const evento = (item.evento_tipo ?? '').toUpperCase();

    if (evento.includes('CONFIRM')) {
      return 'checkmark-circle-outline';
    }

    if (evento.includes('CANCEL')) {
      return 'close-circle-outline';
    }

    if (evento.includes('REPROGRAM')) {
      return 'swap-horizontal-outline';
    }

    if (evento.includes('VINCULACION')) {
      return 'link-outline';
    }

    if (evento.includes('PERMISO')) {
      return 'shield-checkmark-outline';
    }

    if (evento.includes('NOTIFICACION')) {
      return 'notifications-outline';
    }

    switch (tipo) {
      case 'equipo':
        return 'people-outline';
      case 'sistema':
        return 'settings-outline';
      case 'reprogramar':
        return 'swap-horizontal-outline';
      default:
        return 'calendar-outline';
    }
  }

  private mapTitulo(item: HistorialEventoDto, meta: Record<string, unknown>): string {
    const evento = (item.evento_tipo ?? '').toUpperCase();

    if (evento.includes('CONFIRM')) return 'Cita confirmada';
    if (evento.includes('CANCEL')) return 'Cita cancelada';
    if (evento.includes('COMPLET')) return 'Cita completada';
    if (evento.includes('REPROGRAM')) return 'Cita reprogramada';
    if (evento.includes('VINCULACION')) return 'Recepcionista vinculado';
    if (evento.includes('PERMISO')) return 'Permisos actualizados';
    if (evento.includes('CONFIGURACION')) return 'Configuracion actualizada';
    if (evento.includes('PASSWORD') || evento.includes('CONTRASENA')) return 'Contrasena actualizada';
    if (evento.includes('NOTIFICACION')) return 'Notificacion registrada';
    if (evento.includes('CREADA') && (item.entidad_tipo ?? '').toUpperCase() === 'CITA') return 'Nueva cita registrada';

    const estadoNuevo = this.readString(meta, ['estado_nuevo', 'estadoNuevo']);
    if (estadoNuevo === 'CONFIRMADA') return 'Cita confirmada';
    if (estadoNuevo === 'CANCELADA') return 'Cita cancelada';
    if (estadoNuevo === 'COMPLETADA') return 'Cita completada';
    if (estadoNuevo === 'REPROGRAMADA') return 'Cita reprogramada';

    if ((item.entidad_tipo ?? '').toUpperCase() === 'SESION') return 'Actividad de sesion';
    if ((item.entidad_tipo ?? '').toUpperCase() === 'PACIENTE') return 'Actividad de paciente';

    return 'Actividad reciente';
  }

  private mapDescripcion(item: HistorialEventoDto, meta: Record<string, unknown>): string {
    const descripcion = item.descripcion?.trim();
    if (descripcion) {
      return descripcion;
    }

    const estadoAnterior = this.readString(meta, ['estado_anterior', 'estadoAnterior']);
    const estadoNuevo = this.readString(meta, ['estado_nuevo', 'estadoNuevo']);
    if (estadoAnterior || estadoNuevo) {
      return `Cambio de estado${estadoAnterior ? ` de ${estadoAnterior}` : ''}${estadoNuevo ? ` a ${estadoNuevo}` : ''}.`;
    }

    if (item.entidad_tipo && item.entidad_id) {
      return `${item.entidad_tipo} #${item.entidad_id}`;
    }

    return 'Evento registrado en la bitacora del sistema.';
  }

  private mapFechaGrupo(iso: string): ActividadFechaGrupo {
    const target = new Date(iso);
    const eventDate = new Date(target.getFullYear(), target.getMonth(), target.getDate());
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (eventDate.getTime() === today.getTime()) {
      return 'hoy';
    }

    if (eventDate.getTime() === yesterday.getTime()) {
      return 'ayer';
    }

    return 'anterior';
  }

  private parseMetadata(raw?: string | null): Record<string, unknown> {
    if (!raw) {
      return {};
    }

    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {};
    } catch {
      return {};
    }
  }

  private readString(meta: Record<string, unknown>, keys: string[]): string {
    for (const key of keys) {
      const value = meta[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim().toUpperCase();
      }
    }

    return '';
  }
}
