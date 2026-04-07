import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { buildQueryParams } from 'src/app/shared/utils/query-params.utils';
import {
  CitasPorPeriodo,
  EstadoCitaEstadistica,
  EstadisticasResumen,
  ExportacionReporteRequest,
  ExportacionReporteResponse,
  IngresoPorMetodoPago,
  IngresoPorPeriodo,
  InsightEstadistica,
  KpiCard,
  NuevosVsRecurrentesPunto,
  PacienteEstadistica,
  PeriodoCitas,
  RankingPaciente,
  ReporteEstadistica,
  ResumenCajaDiaria,
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

@Injectable({ providedIn: 'root' })
export class EstadisticasApiService {
  private readonly base = `${environment.apiUrl}/estadisticas`;
  private readonly filtrosSubject = new BehaviorSubject<FiltroEstadisticas>(this.getFiltrosIniciales());

  readonly filtros$ = this.filtrosSubject.asObservable();

  constructor(private http: HttpClient) {}

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

  async getResumenKpis(filtros: FiltroEstadisticas = this.filtrosActuales): Promise<EstadisticasResumen> {
    const raw = await firstValueFrom(
      this.http.get<any>(`${this.base}/resumen`, { params: this.buildStatsParams(filtros) })
    );

    return {
      citasHoy: this.readNumber(raw, ['citas_hoy', 'citasHoy']),
      citasMes: this.readNumber(raw, ['citas_mes', 'citasMes', 'total_citas', 'totalCitas']),
      pacientesNuevosMes: this.readNumber(raw, ['pacientes_nuevos_mes', 'pacientesNuevosMes', 'pacientes_nuevos', 'pacientesNuevos']),
      pacientesRecurrentes: this.readNumber(raw, ['pacientes_recurrentes', 'pacientesRecurrentes', 'recurrentes']),
      ingresosHoy: this.readNumber(raw, ['ingresos_hoy', 'ingresosHoy']),
      ingresosMes: this.readNumber(raw, ['ingresos_mes', 'ingresosMes', 'ingresos_totales', 'ingresosTotales']),
      noAsistencias: this.readNumber(raw, ['no_asistencias', 'noAsistencias']),
      tasaCancelacion: this.readNumber(raw, ['tasa_cancelacion', 'tasaCancelacion']),
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
      this.http.get<any>(`${this.base}/citas`, {
        params: this.buildStatsParams(filtros, { periodo }),
      })
    );

    const barras = this.readArray(raw, ['serie', 'series', 'periodos', 'items', 'data']).map((item: any) =>
      this.normalizeCitasPorPeriodo(item, periodo)
    );

    const estados = this.normalizeEstados(raw);
    const totalPeriodo = this.readNumber(raw, ['total_citas', 'totalCitas'], barras.reduce((acc, item) => acc + item.total, 0));

    return {
      barras,
      estados,
      resumen: {
        totalPeriodo,
        estadoPredominante: estados[0]?.estado ?? 'Sin datos',
        horasMasOcupadas: this.readArray(raw, ['horas_mas_ocupadas', 'horasMasOcupadas']).map((item: any) => ({
          hora: this.readString(item, ['hora', 'label'], 'Sin datos'),
          citas: this.readNumber(item, ['citas', 'cantidad', 'total']),
        })),
        diasMasOcupados: this.readArray(raw, ['dias_mas_ocupados', 'diasMasOcupados']).map((item: any) => ({
          dia: this.readString(item, ['dia', 'label'], 'Sin datos'),
          citas: this.readNumber(item, ['citas', 'cantidad', 'total']),
        })),
      },
    };
  }

  async getIngresosStats(periodo: PeriodoCitas, filtros: FiltroEstadisticas = this.filtrosActuales): Promise<IngresosStatsViewModel> {
    const raw = await firstValueFrom(
      this.http.get<any>(`${this.base}/ingresos`, {
        params: this.buildStatsParams(filtros, { periodo }),
      })
    );

    const barras = this.readArray(raw, ['serie', 'series', 'periodos', 'items', 'data']).map((item: any) =>
      this.normalizeIngresoPorPeriodo(item, periodo)
    );

    const metodosRaw = this.readArray(raw, ['por_metodo_pago', 'porMetodoPago', 'metodos_pago', 'metodosPago']);
    const totalMetodos = metodosRaw.reduce((acc: number, item: any) => acc + this.readNumber(item, ['total', 'monto']), 0);
    const metodos = metodosRaw.map((item: any) => this.normalizeMetodoPago(item, totalMetodos));

    return {
      barras,
      metodos,
      resumen: {
        totalPeriodo: this.readNumber(raw, ['total_periodo', 'totalPeriodo', 'total_ingresos', 'totalIngresos'], barras.reduce((acc, item) => acc + item.total, 0)),
        montoPendiente: this.readNumber(raw, ['monto_pendiente', 'montoPendiente', 'pendiente_total', 'pendienteTotal']),
        citasPagadas: this.readNumber(raw, ['citas_pagadas', 'citasPagadas']),
        citasPendientes: this.readNumber(raw, ['citas_pendientes', 'citasPendientes']),
        metodoPrincipal: [...metodos].sort((a, b) => b.total - a.total)[0]?.metodo ?? 'Sin datos',
      },
    };
  }

  async getPacientesStats(filtros: FiltroEstadisticas = this.filtrosActuales): Promise<PacientesStatsViewModel> {
    const raw = await firstValueFrom(
      this.http.get<any>(`${this.base}/pacientes`, { params: this.buildStatsParams(filtros) })
    );

    return {
      puntos: this.readArray(raw, ['nuevos_vs_recurrentes', 'nuevosVsRecurrentes', 'serie', 'periodos']).map((item: any) => ({
        label: this.readString(item, ['label', 'periodo', 'mes'], 'Sin datos'),
        nuevos: this.readNumber(item, ['nuevos', 'pacientes_nuevos', 'pacientesNuevos']),
        recurrentes: this.readNumber(item, ['recurrentes', 'pacientes_recurrentes', 'pacientesRecurrentes']),
      })),
      resumen: {
        totalActivos: this.readNumber(raw, ['total_activos', 'totalActivos', 'total_pacientes_activos', 'totalPacientesActivos']),
        nuevosEsteMes: this.readNumber(raw, ['nuevos_este_mes', 'nuevosEsteMes', 'pacientes_nuevos', 'pacientesNuevos']),
        recurrentesEsteMes: this.readNumber(raw, ['recurrentes_este_mes', 'recurrentesEsteMes', 'pacientes_recurrentes', 'pacientesRecurrentes']),
        tasaRetencion: this.readNumber(raw, ['tasa_retencion', 'tasaRetencion']),
      },
      rankingCitas: this.readArray(raw, ['ranking_mas_citas', 'rankingMasCitas']).map((item: any, index: number) => this.normalizeRankingPaciente(item, index)),
      rankingNoAsistencias: this.readArray(raw, ['ranking_no_asistencias', 'rankingNoAsistencias']).map((item: any, index: number) => this.normalizeRankingPaciente(item, index)),
      pacientes: this.readArray(raw, ['pacientes', 'items']).map((item: any) => this.normalizePacienteEstadistica(item)),
    };
  }

  async getInsights(filtros: FiltroEstadisticas = this.filtrosActuales): Promise<InsightEstadistica[]> {
    try {
      const raw = await firstValueFrom(
        this.http.get<any>(`${this.base}/insights`, { params: this.buildStatsParams(filtros) })
      );

      return this.readArray(raw, ['insights', 'items', 'data'], Array.isArray(raw) ? raw : []).map((item: any, index: number) => ({
        id: this.readString(item, ['id'], `insight-${index + 1}`),
        icono: this.readString(item, ['icono', 'icon', 'icon_name'], 'sparkles-outline'),
        titulo: this.readString(item, ['titulo', 'title'], 'Insight'),
        valor: this.readString(item, ['valor', 'value'], 'Sin datos'),
        descripcion: this.readString(item, ['descripcion', 'description'], ''),
        tipo: this.normalizeInsightTipo(this.readString(item, ['tipo', 'tone', 'variant'], 'primary')),
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
        this.http.get<any>(`${this.base}/caja-diaria`, {
          params: this.buildStatsParams(filtros, { fecha }),
        })
      );

      return {
        fecha: this.readString(raw, ['fecha'], fecha),
        totalCobrado: this.readNumber(raw, ['total_cobrado', 'totalCobrado', 'monto_total', 'montoTotal']),
        efectivo: this.readNumber(raw, ['efectivo']),
        transferencia: this.readNumber(raw, ['transferencia']),
        debito: this.readNumber(raw, ['debito', 'debito_total']),
        credito: this.readNumber(raw, ['credito', 'credito_total']),
        pagosExentos: this.readNumber(raw, ['pagos_exentos', 'pagosExentos']),
        pagosPendientes: this.readNumber(raw, ['pagos_pendientes', 'pagosPendientes']),
        citasCobradas: this.readNumber(raw, ['citas_cobradas', 'citasCobradas']),
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
        this.http.get<any>(`${this.base}/reportes`, { params: this.buildStatsParams(filtros) })
      );

      return this.readArray(raw, ['reportes', 'items', 'data'], Array.isArray(raw) ? raw : []).map((item: any) =>
        this.normalizeReporte(item)
      );
    } catch (error) {
      if (this.isNotFound(error)) {
        return [];
      }
      throw error;
    }
  }

  async getReporteDetalle(reporte: Pick<ReporteEstadistica, 'id' | 'tipo'>, filtros: FiltroEstadisticas = this.filtrosActuales): Promise<ReporteEstadistica> {
    const raw = await firstValueFrom(
      this.http.get<any>(`${this.base}/reportes/${encodeURIComponent(reporte.tipo)}`, {
        params: this.buildStatsParams(filtros),
      })
    );

    return this.normalizeReporte(raw, reporte);
  }

  exportarPdf(req: ExportacionReporteRequest): Promise<ExportacionReporteResponse> {
    return this.exportarReporte({ ...req, formato: 'pdf' });
  }

  exportarExcel(req: ExportacionReporteRequest): Promise<ExportacionReporteResponse> {
    return this.exportarReporte({ ...req, formato: 'excel' });
  }

  private async exportarReporte(req: ExportacionReporteRequest): Promise<ExportacionReporteResponse> {
    const response = await firstValueFrom(
      this.http.post(`${this.base}/reportes/exportar`, req, {
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
      profesional: filtros.profesional || undefined,
      estado_cita: this.mapEstadoFiltro(filtros.estadoCita),
      metodo_pago: this.mapMetodoPagoFiltro(filtros.metodoPago),
      ...extras,
    });
  }

  private normalizeCitasPorPeriodo(item: any, periodo: PeriodoCitas): CitasPorPeriodo {
    const fecha = this.readString(item, ['fecha', 'periodo', 'key'], '');
    const label = this.readString(item, ['label'], this.buildPeriodoLabel(fecha, periodo));
    return {
      fecha,
      label,
      total: this.readNumber(item, ['total', 'cantidad', 'total_citas']),
      confirmadas: this.readNumber(item, ['confirmadas', 'confirmada', 'confirmados']),
      completadas: this.readNumber(item, ['completadas', 'completada', 'completados']),
      canceladas: this.readNumber(item, ['canceladas', 'cancelada', 'cancelados']),
      noAsistio: this.readNumber(item, ['no_asistio', 'noAsistio']),
    };
  }

  private normalizeIngresoPorPeriodo(item: any, periodo: PeriodoCitas): IngresoPorPeriodo {
    const fecha = this.readString(item, ['fecha', 'periodo', 'key'], '');
    const label = this.readString(item, ['label'], this.buildPeriodoLabel(fecha, periodo));
    return {
      fecha,
      label,
      total: this.readNumber(item, ['total', 'monto_total', 'montoTotal']),
      efectivo: this.readNumber(item, ['efectivo']),
      transferencia: this.readNumber(item, ['transferencia']),
      tarjeta: this.readNumber(item, ['tarjeta']),
      pendiente: this.readNumber(item, ['pendiente', 'monto_pendiente', 'montoPendiente']),
    };
  }

  private normalizeEstados(raw: any): EstadoCitaEstadistica[] {
    const conteos = this.readArray(raw, ['conteo_por_estado', 'conteoPorEstado', 'estados']);
    const total = conteos.reduce((acc: number, item: any) => acc + this.readNumber(item, ['cantidad', 'total']), 0);

    return conteos
      .map((item: any) => {
        const estado = this.normalizeEstadoLabel(this.readString(item, ['estado', 'label'], 'Sin datos'));
        const cantidad = this.readNumber(item, ['cantidad', 'total']);
        return {
          estado,
          total: cantidad,
          porcentaje: total > 0 ? Number(((cantidad / total) * 100).toFixed(1)) : 0,
          color: this.colorEstado(estado),
        };
      })
      .sort((a, b) => b.total - a.total);
  }

  private normalizeMetodoPago(item: any, totalMetodos: number): IngresoPorMetodoPago {
    const metodo = this.normalizeMetodoPagoLabel(this.readString(item, ['metodo', 'label'], 'Sin datos'));
    const total = this.readNumber(item, ['total', 'monto']);
    const porcentajeRaw = this.readNumber(item, ['porcentaje'], -1);
    const porcentaje = porcentajeRaw >= 0
      ? porcentajeRaw
      : totalMetodos > 0
        ? Number(((total / totalMetodos) * 100).toFixed(1))
        : 0;

    return {
      metodo,
      total,
      porcentaje,
      color: this.colorMetodoPago(metodo),
    };
  }

  private normalizeRankingPaciente(item: any, index: number): RankingPaciente {
    const nombre = this.readString(item, ['nombre', 'nombre_paciente', 'paciente_nombre'], 'Sin datos');
    const apellido = this.readString(item, ['apellido', 'apellido_paciente', 'paciente_apellido'], '');
    return {
      posicion: this.readNumber(item, ['posicion'], index + 1),
      id: this.readNumber(item, ['id', 'id_paciente']),
      nombre,
      apellido,
      valor: this.readNumber(item, ['valor', 'cantidad', 'total']),
      avatarInicial: nombre.charAt(0).toUpperCase() || '?',
      colorAvatar: this.avatarColor(index),
    };
  }

  private normalizePacienteEstadistica(item: any): PacienteEstadistica {
    return {
      id: this.readNumber(item, ['id', 'id_paciente']),
      nombre: this.readString(item, ['nombre', 'nombre_paciente'], 'Sin datos'),
      apellido: this.readString(item, ['apellido', 'apellido_paciente'], ''),
      totalCitas: this.readNumber(item, ['total_citas', 'totalCitas']),
      noAsistencias: this.readNumber(item, ['no_asistencias', 'noAsistencias']),
      ingresos: this.readNumber(item, ['ingresos', 'total_ingresos', 'totalIngresos']),
      esNuevo: this.readBoolean(item, ['es_nuevo', 'esNuevo']),
    };
  }

  private normalizeReporte(raw: any, fallback?: Pick<ReporteEstadistica, 'id' | 'tipo'>): ReporteEstadistica {
    const tipo = this.normalizeTipoReporte(this.readString(raw, ['tipo', 'id'], fallback?.tipo ?? 'citas'));
    const filas = this.readArray(raw, ['filas', 'rows', 'detalle', 'items'], []);
    return {
      id: this.readString(raw, ['id'], fallback?.id ?? tipo),
      tipo,
      titulo: this.readString(raw, ['titulo', 'title'], this.tituloReporte(tipo)),
      descripcion: this.readString(raw, ['descripcion', 'description'], ''),
      icono: this.readString(raw, ['icono', 'icon'], this.iconoReporte(tipo)),
      colorIcono: this.readString(raw, ['color_icono', 'colorIcono'], this.colorReporte(tipo)),
      totalRegistros: this.readNumber(raw, ['total_registros', 'totalRegistros', 'total'], filas.length),
      resumenTexto: this.readString(raw, ['resumen_texto', 'resumenTexto'], filas.length ? `${filas.length} registros` : 'Sin datos en el período'),
      periodoLabel: this.readString(raw, ['periodo_label', 'periodoLabel'], this.buildPeriodoTexto(this.filtrosActuales)),
      ultimaActualizacion: this.readString(raw, ['ultima_actualizacion', 'ultimaActualizacion', 'generated_at'], new Date().toISOString()),
      filas,
    };
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
      Débito: 'DEBITO',
      Crédito: 'CREDITO',
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

  private readArray(source: any, keys: string[], fallback: any[] = []): any[] {
    for (const key of keys) {
      const value = source?.[key];
      if (Array.isArray(value)) {
        return value;
      }
    }
    return fallback;
  }

  private readString(source: any, keys: string[], fallback = ''): string {
    for (const key of keys) {
      const value = source?.[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
      if (typeof value === 'number') {
        return String(value);
      }
    }
    return fallback;
  }

  private readNumber(source: any, keys: string[], fallback = 0): number {
    for (const key of keys) {
      const value = source?.[key];
      const numeric = Number(value);
      if (!Number.isNaN(numeric)) {
        return numeric;
      }
    }
    return fallback;
  }

  private readBoolean(source: any, keys: string[], fallback = false): boolean {
    for (const key of keys) {
      const value = source?.[key];
      if (typeof value === 'boolean') {
        return value;
      }
    }
    return fallback;
  }

  private isNotFound(error: unknown): boolean {
    return error instanceof HttpErrorResponse && error.status === 404;
  }

  private toIso(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}
