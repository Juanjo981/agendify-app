import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { SessionService } from 'src/app/services/session.service';
import { buildQueryParams } from 'src/app/shared/utils/query-params.utils';
import { environment } from 'src/environments/environment';
import {
  CitasPorPeriodo,
  CitasStatsDto,
  EstadoCitaEstadistica,
  EstadisticasResumen,
  EstadisticasResumenDto,
  ExportacionReporteRequest,
  ExportacionReporteResponse,
  IngresoPorMetodoPago,
  IngresoPorPeriodo,
  IngresosStatsDto,
  InsightEstadistica,
  InsightEstadisticaDto,
  KpiCard,
  NuevosVsRecurrentesPunto,
  PacienteEstadistica,
  PacientesStatsDto,
  PeriodoCitas,
  ProfesionalEstadisticaDto,
  ProfesionalFiltroOption,
  RankingPaciente,
  RankingPacienteDto,
  ReporteEstadistica,
  ReporteEstadisticaDto,
  ResumenCajaDiaria,
  ResumenCajaDiariaDto,
  ResumenCitasEstadistica,
  ResumenIngresosEstadistica,
  ResumenPacientesEstadistica,
  TipoReporte,
} from './models/estadisticas.model';
import { EstadoCitaFiltro, FiltroEstadisticas, MetodoPagoFiltro } from './models/filtros-estadisticas.model';

interface CitasStatsViewModel {
  barras: CitasPorPeriodo[];
  estados: EstadoCitaEstadistica[];
  resumen: ResumenCitasEstadistica;
}

interface IngresosStatsViewModel {
  barras: IngresoPorPeriodo[];
  metodos: IngresoPorMetodoPago[];
  resumen: ResumenIngresosEstadistica;
}

interface PacientesStatsViewModel {
  puntos: NuevosVsRecurrentesPunto[];
  resumen: ResumenPacientesEstadistica;
  rankingCitas: RankingPaciente[];
  rankingNoAsistencias: RankingPaciente[];
  pacientes: PacienteEstadistica[];
}

interface ExportacionReportePayload {
  tipo_reporte: TipoReporte;
  formato: 'pdf' | 'excel';
  fecha_desde: string;
  fecha_hasta: string;
  id_profesional?: number;
  incluir_resumen: boolean;
  incluir_detalle: boolean;
  nombre_archivo: string;
}

@Injectable({ providedIn: 'root' })
export class EstadisticasApiService {
  private readonly base = `${environment.apiUrl}/estadisticas`;
  private readonly profesionalesUrl = `${environment.apiUrl}/profesionales`;
  private readonly filtrosSubject = new BehaviorSubject<FiltroEstadisticas>(this.getFiltrosIniciales());

  readonly filtros$ = this.filtrosSubject.asObservable();

  constructor(
    private http: HttpClient,
    private session: SessionService,
  ) {}

  getFiltrosIniciales(): FiltroEstadisticas {
    const hoy = new Date();
    return {
      rango: 'mes',
      fechaDesde: this.toIso(new Date(hoy.getFullYear(), hoy.getMonth(), 1)),
      fechaHasta: this.toIso(hoy),
      profesional: '',
      estadoCita: 'todos',
      metodoPago: 'todos',
    };
  }

  get filtrosActuales(): FiltroEstadisticas {
    return this.filtrosSubject.value;
  }

  setFiltros(filtros: FiltroEstadisticas): void {
    this.filtrosSubject.next({ ...filtros });
  }

  async getProfesionalesFiltro(): Promise<ProfesionalFiltroOption[]> {
    const baseOption: ProfesionalFiltroOption = { id: '', nombre: 'Todos los profesionales' };

    if (this.session.esAdmin()) {
      const rows = await firstValueFrom(this.http.get<ProfesionalEstadisticaDto[]>(this.profesionalesUrl));
      return [
        baseOption,
        ...(rows ?? []).map(item => ({
          id: String(item.id_profesional),
          nombre: this.buildProfesionalLabel(item),
        })),
      ];
    }

    const profesional = this.session.getProfesional();
    if (!profesional) {
      return [baseOption];
    }

    return [
      baseOption,
      {
        id: String(profesional.id_profesional),
        nombre: profesional.nombre_consulta?.trim() || this.session.getNombreCompleto() || 'Mi perfil profesional',
      },
    ];
  }

  async getResumenKpis(filtros: FiltroEstadisticas = this.filtrosActuales): Promise<EstadisticasResumen> {
    const raw = await firstValueFrom(
      this.http.get<EstadisticasResumenDto>(`${this.base}/resumen`, { params: this.buildStatsParams(filtros) })
    );

    return {
      citasHoy: raw.citas_hoy ?? 0,
      citasMes: raw.citas_mes ?? 0,
      pacientesNuevosMes: raw.pacientes_nuevos_mes ?? 0,
      pacientesRecurrentes: raw.pacientes_recurrentes ?? 0,
      ingresosHoy: raw.ingresos_hoy ?? 0,
      ingresosMes: raw.ingresos_mes ?? 0,
      noAsistencias: raw.no_asistencias ?? 0,
      tasaCancelacion: raw.tasa_cancelacion ?? 0,
    };
  }

  buildKpiCards(resumen: EstadisticasResumen): KpiCard[] {
    return [
      { id: 'citas-hoy', label: 'Citas hoy', valor: resumen.citasHoy, icono: 'calendar-outline', color: 'primary' },
      { id: 'citas-mes', label: 'Citas este mes', valor: resumen.citasMes, icono: 'calendar-number-outline', color: 'info' },
      { id: 'pacientes-nuevos', label: 'Pacientes nuevos', valor: resumen.pacientesNuevosMes, icono: 'person-add-outline', color: 'success' },
      { id: 'pacientes-recurrentes', label: 'Recurrentes', valor: resumen.pacientesRecurrentes, icono: 'people-outline', color: 'purple' },
      { id: 'ingresos-hoy', label: 'Ingresos hoy', valor: this.formatCurrency(resumen.ingresosHoy), icono: 'cash-outline', color: 'success' },
      { id: 'ingresos-mes', label: 'Ingresos del mes', valor: this.formatCurrency(resumen.ingresosMes), icono: 'trending-up-outline', color: 'info' },
      { id: 'no-asistencias', label: 'No asistencias', valor: resumen.noAsistencias, icono: 'person-remove-outline', color: 'warning' },
      { id: 'tasa-cancelacion', label: 'Cancelaciones', valor: resumen.tasaCancelacion, sufijo: '%', icono: 'close-circle-outline', color: 'danger' },
    ];
  }

  async getCitasStats(periodo: PeriodoCitas, filtros: FiltroEstadisticas = this.filtrosActuales): Promise<CitasStatsViewModel> {
    const raw = await firstValueFrom(
      this.http.get<CitasStatsDto>(`${this.base}/citas`, {
        params: this.buildStatsParams(filtros, { periodo }),
      })
    );

    const barras = (raw.serie ?? []).map(item => ({
      fecha: item.fecha,
      label: item.label || this.buildPeriodoLabel(item.fecha, periodo),
      total: item.total ?? 0,
      confirmadas: item.confirmadas ?? 0,
      completadas: item.completadas ?? 0,
      canceladas: item.canceladas ?? 0,
      noAsistio: item.no_asistio ?? 0,
    }));

    const estados = this.mapEstados(raw);

    return {
      barras,
      estados,
      resumen: {
        totalPeriodo: raw.total_citas ?? barras.reduce((acc, item) => acc + item.total, 0),
        estadoPredominante: estados[0]?.estado ?? 'Sin datos',
        horasMasOcupadas: (raw.horas_mas_ocupadas ?? []).map(item => ({
          hora: item.hora || 'Sin datos',
          citas: item.citas ?? 0,
        })),
        diasMasOcupados: (raw.dias_mas_ocupados ?? []).map(item => ({
          dia: item.dia || 'Sin datos',
          citas: item.citas ?? 0,
        })),
      },
    };
  }

  async getIngresosStats(periodo: PeriodoCitas, filtros: FiltroEstadisticas = this.filtrosActuales): Promise<IngresosStatsViewModel> {
    const raw = await firstValueFrom(
      this.http.get<IngresosStatsDto>(`${this.base}/ingresos`, {
        params: this.buildStatsParams(filtros, { periodo }),
      })
    );

    const barras = (raw.serie ?? []).map(item => ({
      fecha: item.fecha,
      label: item.label || this.buildPeriodoLabel(item.fecha, periodo),
      total: item.total ?? 0,
      efectivo: item.efectivo ?? 0,
      transferencia: item.transferencia ?? 0,
      tarjeta: item.tarjeta ?? 0,
      pendiente: item.pendiente ?? 0,
    }));

    const metodos = (raw.por_metodo_pago ?? []).map(item => ({
      metodo: this.normalizeMetodoPagoLabel(item.metodo),
      total: item.total ?? 0,
      porcentaje: item.porcentaje ?? 0,
      color: this.colorMetodoPago(this.normalizeMetodoPagoLabel(item.metodo)),
    }));

    return {
      barras,
      metodos,
      resumen: {
        totalPeriodo: raw.total_periodo ?? barras.reduce((acc, item) => acc + item.total, 0),
        montoPendiente: raw.monto_pendiente ?? 0,
        citasPagadas: raw.citas_pagadas ?? 0,
        citasPendientes: raw.citas_pendientes ?? 0,
        metodoPrincipal: raw.metodo_principal?.trim() || [...metodos].sort((a, b) => b.total - a.total)[0]?.metodo || 'Sin datos',
      },
    };
  }

  async getPacientesStats(filtros: FiltroEstadisticas = this.filtrosActuales): Promise<PacientesStatsViewModel> {
    const raw = await firstValueFrom(
      this.http.get<PacientesStatsDto>(`${this.base}/pacientes`, { params: this.buildStatsParams(filtros) })
    );

    const rankingNoAsistenciasSource = raw.ranking_no_asistencias ?? raw.ranking_por_ingresos ?? [];

    return {
      puntos: (raw.nuevos_vs_recurrentes ?? []).map(item => ({
        label: item.label || 'Sin datos',
        nuevos: item.nuevos ?? 0,
        recurrentes: item.recurrentes ?? 0,
      })),
      resumen: {
        totalActivos: raw.total_activos ?? 0,
        nuevosEsteMes: raw.nuevos_este_mes ?? 0,
        recurrentesEsteMes: raw.recurrentes_este_mes ?? 0,
        tasaRetencion: raw.tasa_retencion ?? 0,
      },
      rankingCitas: (raw.ranking_mas_citas ?? []).map((item, index) => this.mapRankingPaciente(item, index)),
      rankingNoAsistencias: rankingNoAsistenciasSource.map((item, index) => this.mapRankingPaciente(item, index)),
      pacientes: (raw.pacientes ?? []).map(item => ({
        id: item.id_paciente ?? 0,
        nombre: item.nombre_paciente || 'Sin datos',
        apellido: item.apellido_paciente ?? '',
        totalCitas: item.total_citas ?? 0,
        noAsistencias: item.no_asistencias ?? 0,
        ingresos: item.ingresos ?? 0,
        esNuevo: item.es_nuevo === true,
      })),
    };
  }

  async getInsights(filtros: FiltroEstadisticas = this.filtrosActuales): Promise<InsightEstadistica[]> {
    try {
      const raw = await firstValueFrom(
        this.http.get<InsightEstadisticaDto[]>(`${this.base}/insights`, { params: this.buildStatsParams(filtros) })
      );

      return (raw ?? []).map((item, index) => ({
        id: item.id || `insight-${index + 1}`,
        icono: item.icono || 'sparkles-outline',
        titulo: item.titulo || 'Insight',
        valor: item.valor || 'Sin datos',
        descripcion: item.descripcion || '',
        tipo: this.normalizeInsightTipo(item.tipo || 'primary'),
      }));
    } catch (error) {
      if (this.isNotFound(error)) {
        return [];
      }
      throw error;
    }
  }

  async getCajaDiaria(fecha: string, filtros: FiltroEstadisticas = this.filtrosActuales): Promise<ResumenCajaDiaria | null> {
    try {
      const raw = await firstValueFrom(
        this.http.get<ResumenCajaDiariaDto>(`${this.base}/caja-diaria`, {
          params: this.buildStatsParams(filtros, { fecha }),
        })
      );

      return {
        fecha: raw.fecha || fecha,
        totalCobrado: raw.total_cobrado ?? 0,
        efectivo: raw.efectivo ?? 0,
        transferencia: raw.transferencia ?? 0,
        debito: raw.debito ?? 0,
        credito: raw.credito ?? 0,
        pagosExentos: raw.pagos_exentos ?? 0,
        pagosPendientes: raw.pagos_pendientes ?? 0,
        citasCobradas: raw.citas_cobradas ?? 0,
      };
    } catch (error) {
      if (this.isNotFound(error)) {
        return null;
      }
      throw error;
    }
  }

  async getReportes(filtros: FiltroEstadisticas = this.filtrosActuales): Promise<ReporteEstadistica[]> {
    try {
      const raw = await firstValueFrom(
        this.http.get<ReporteEstadisticaDto[]>(`${this.base}/reportes`, { params: this.buildStatsParams(filtros) })
      );

      return (raw ?? []).map(item => this.mapReporte(item));
    } catch (error) {
      if (this.isNotFound(error)) {
        return [];
      }
      throw error;
    }
  }

  async getReporteDetalle(reporte: Pick<ReporteEstadistica, 'id' | 'tipo'>, filtros: FiltroEstadisticas = this.filtrosActuales): Promise<ReporteEstadistica> {
    const raw = await firstValueFrom(
      this.http.get<ReporteEstadisticaDto>(`${this.base}/reportes/${encodeURIComponent(reporte.tipo)}`, {
        params: this.buildStatsParams(filtros),
      })
    );

    return this.mapReporte(raw, reporte);
  }

  exportarPdf(req: ExportacionReporteRequest): Promise<ExportacionReporteResponse> {
    return this.exportarReporte({ ...req, formato: 'pdf' });
  }

  exportarExcel(req: ExportacionReporteRequest): Promise<ExportacionReporteResponse> {
    return this.exportarReporte({ ...req, formato: 'excel' });
  }

  private async exportarReporte(req: ExportacionReporteRequest): Promise<ExportacionReporteResponse> {
    const payload: ExportacionReportePayload = {
      tipo_reporte: req.tipo,
      formato: req.formato,
      fecha_desde: req.fechaDesde,
      fecha_hasta: req.fechaHasta,
      id_profesional: req.profesionalId,
      incluir_resumen: req.incluirResumen,
      incluir_detalle: req.incluirDetalle,
      nombre_archivo: req.nombreArchivo,
    };

    const response = await firstValueFrom(
      this.http.post(`${this.base}/reportes/exportar`, payload, {
        observe: 'response',
        responseType: 'blob',
      })
    );

    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const text = await response.body?.text();
      const parsed = text ? JSON.parse(text) : {};
      if (parsed?.url) {
        window.open(parsed.url, '_blank', 'noopener,noreferrer');
      }
      return {
        ok: parsed?.ok !== false,
        url: parsed?.url,
        mensaje: parsed?.mensaje ?? 'Reporte exportado correctamente.',
      };
    }

    const blob = response.body ?? new Blob();
    const filename = this.resolveFilename(response, req);
    this.downloadBlob(blob, filename);

    return {
      ok: true,
      mensaje: `Archivo "${filename}" generado correctamente.`,
    };
  }

  private buildStatsParams(filtros: FiltroEstadisticas, extras: Record<string, string | number | undefined> = {}) {
    return buildQueryParams({
      rango: filtros.rango,
      fecha_desde: filtros.fechaDesde,
      fecha_hasta: filtros.fechaHasta,
      id_profesional: filtros.profesional || undefined,
      estado_cita: this.mapEstadoFiltro(filtros.estadoCita),
      metodo_pago: this.mapMetodoPagoFiltro(filtros.metodoPago),
      ...extras,
    });
  }

  private mapEstados(raw: CitasStatsDto): EstadoCitaEstadistica[] {
    const conteos = raw.conteo_por_estado ?? [];
    const total = conteos.reduce((acc, item) => acc + (item.cantidad ?? 0), 0);

    return conteos
      .map(item => {
        const estado = this.normalizeEstadoLabel(item.estado);
        const cantidad = item.cantidad ?? 0;
        return {
          estado,
          total: cantidad,
          porcentaje: total > 0 ? Number(((cantidad / total) * 100).toFixed(1)) : 0,
          color: this.colorEstado(estado),
        };
      })
      .sort((a, b) => b.total - a.total);
  }

  private mapRankingPaciente(item: RankingPacienteDto, index: number): RankingPaciente {
    const nombre = item.nombre_paciente || 'Sin datos';
    return {
      posicion: item.posicion ?? index + 1,
      id: item.id_paciente ?? 0,
      nombre,
      apellido: item.apellido_paciente ?? '',
      valor: item.valor ?? 0,
      avatarInicial: nombre.charAt(0).toUpperCase() || '?',
      colorAvatar: this.avatarColor(index),
    };
  }

  private mapReporte(raw: ReporteEstadisticaDto, fallback?: Pick<ReporteEstadistica, 'id' | 'tipo'>): ReporteEstadistica {
    const tipo = this.normalizeTipoReporte(raw.tipo ?? fallback?.tipo ?? 'citas');
    const filas = raw.filas ?? [];

    return {
      id: raw.id ?? fallback?.id ?? tipo,
      tipo,
      titulo: raw.titulo ?? this.tituloReporte(tipo),
      descripcion: raw.descripcion ?? '',
      icono: raw.icono ?? this.iconoReporte(tipo),
      colorIcono: raw.color_icono ?? this.colorReporte(tipo),
      totalRegistros: raw.total_registros ?? filas.length,
      resumenTexto: raw.resumen_texto ?? (filas.length ? `${filas.length} registros` : 'Sin datos en el período'),
      periodoLabel: raw.periodo_label ?? this.buildPeriodoTexto(this.filtrosActuales),
      ultimaActualizacion: raw.ultima_actualizacion ?? new Date().toISOString(),
      filas,
    };
  }

  private buildProfesionalLabel(item: ProfesionalEstadisticaDto): string {
    const consulta = item.nombre_consulta?.trim();
    const nombreCompleto = [item.nombre, item.apellido].filter(Boolean).join(' ').trim();
    return consulta ? `${consulta} · ${nombreCompleto}` : nombreCompleto || `Profesional #${item.id_profesional}`;
  }

  private buildPeriodoTexto(filtros: FiltroEstadisticas): string {
    return `${filtros.fechaDesde} al ${filtros.fechaHasta}`;
  }

  private buildPeriodoLabel(rawFecha: string, periodo: PeriodoCitas): string {
    if (!rawFecha) return 'Sin datos';
    if (periodo === 'mes') {
      const safeDate = rawFecha.length === 7 ? `${rawFecha}-01` : rawFecha;
      const date = new Date(`${safeDate}T00:00:00`);
      return Number.isNaN(date.getTime()) ? rawFecha : date.toLocaleDateString('es-MX', { month: 'short' });
    }
    if (periodo === 'semana') {
      return rawFecha;
    }
    const date = new Date(`${rawFecha}T00:00:00`);
    return Number.isNaN(date.getTime()) ? rawFecha : date.toLocaleDateString('es-MX', { weekday: 'short' });
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 0,
    }).format(value);
  }

  private normalizeInsightTipo(value: string): InsightEstadistica['tipo'] {
    const tipo = value.toLowerCase();
    if (tipo === 'success' || tipo === 'info' || tipo === 'warning' || tipo === 'purple' || tipo === 'primary') {
      return tipo;
    }
    return 'primary';
  }

  private mapEstadoFiltro(value: EstadoCitaFiltro): string | undefined {
    const map: Record<Exclude<EstadoCitaFiltro, 'todos'>, string> = {
      Pendiente: 'PENDIENTE',
      Confirmada: 'CONFIRMADA',
      Completada: 'COMPLETADA',
      Cancelada: 'CANCELADA',
      'No asistió': 'NO_ASISTIO',
      Pospuesta: 'REPROGRAMADA',
    };
    return value === 'todos' ? undefined : map[value];
  }

  private mapMetodoPagoFiltro(value: MetodoPagoFiltro): string | undefined {
    const map: Record<Exclude<MetodoPagoFiltro, 'todos'>, string> = {
      Efectivo: 'EFECTIVO',
      Transferencia: 'TRANSFERENCIA',
      'Débito': 'DEBITO',
      'Crédito': 'CREDITO',
    };
    return value === 'todos' ? undefined : map[value];
  }

  private normalizeEstadoLabel(value: string): string {
    const map: Record<string, string> = {
      PENDIENTE: 'Pendiente',
      CONFIRMADA: 'Confirmada',
      COMPLETADA: 'Completada',
      CANCELADA: 'Cancelada',
      NO_ASISTIO: 'No asistió',
      REPROGRAMADA: 'Pospuesta',
    };
    return map[value] ?? value;
  }

  private normalizeMetodoPagoLabel(value: string): string {
    const map: Record<string, string> = {
      EFECTIVO: 'Efectivo',
      TRANSFERENCIA: 'Transferencia',
      DEBITO: 'Débito',
      DEBITO_TARJETA: 'Débito',
      CREDITO: 'Crédito',
      TARJETA: 'Tarjeta',
    };
    return map[value] ?? value;
  }

  private normalizeTipoReporte(value: string): TipoReporte {
    const normalized = value.toLowerCase();
    const allowed: TipoReporte[] = ['citas', 'ingresos', 'pacientes', 'pagos-pendientes', 'no-asistencias'];
    return allowed.includes(normalized as TipoReporte) ? (normalized as TipoReporte) : 'citas';
  }

  private tituloReporte(tipo: TipoReporte): string {
    const map: Record<TipoReporte, string> = {
      citas: 'Reporte de Citas',
      ingresos: 'Reporte de Ingresos',
      pacientes: 'Reporte de Pacientes',
      'pagos-pendientes': 'Pagos Pendientes',
      'no-asistencias': 'No Asistencias',
    };
    return map[tipo];
  }

  private iconoReporte(tipo: TipoReporte): string {
    const map: Record<TipoReporte, string> = {
      citas: 'calendar-outline',
      ingresos: 'trending-up-outline',
      pacientes: 'person-add-outline',
      'pagos-pendientes': 'hourglass-outline',
      'no-asistencias': 'person-remove-outline',
    };
    return map[tipo];
  }

  private colorReporte(tipo: TipoReporte): string {
    const map: Record<TipoReporte, string> = {
      citas: '#6366f1',
      ingresos: '#059669',
      pacientes: '#0ea5e9',
      'pagos-pendientes': '#f59e0b',
      'no-asistencias': '#ef4444',
    };
    return map[tipo];
  }

  private colorEstado(estado: string): string {
    const map: Record<string, string> = {
      Confirmada: '#6366f1',
      Completada: '#10b981',
      Pendiente: '#f59e0b',
      Cancelada: '#ef4444',
      'No asistió': '#64748b',
      Pospuesta: '#8b5cf6',
    };
    return map[estado] ?? '#94a3b8';
  }

  private colorMetodoPago(metodo: string): string {
    const map: Record<string, string> = {
      Transferencia: '#6366f1',
      Efectivo: '#10b981',
      Débito: '#0ea5e9',
      Crédito: '#f59e0b',
      Tarjeta: '#0ea5e9',
    };
    return map[metodo] ?? '#94a3b8';
  }

  private avatarColor(index: number): string {
    const colors = ['#6366f1', '#10b981', '#0ea5e9', '#f59e0b', '#8b5cf6'];
    return colors[index % colors.length];
  }

  private resolveFilename(response: HttpResponse<Blob>, req: ExportacionReporteRequest): string {
    const disposition = response.headers.get('content-disposition') ?? '';
    const match = disposition.match(/filename\*?=(?:UTF-8''|")?([^\";]+)/i);
    const raw = match?.[1] ? decodeURIComponent(match[1].replace(/"/g, '')) : '';
    const extension = req.formato === 'pdf' ? 'pdf' : 'xlsx';
    return raw || `${req.nombreArchivo}.${extension}`;
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }

  private isNotFound(error: unknown): boolean {
    return error instanceof HttpErrorResponse && error.status === 404;
  }

  private toIso(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}
