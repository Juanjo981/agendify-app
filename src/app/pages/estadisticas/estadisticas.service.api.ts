import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { SessionService } from 'src/app/services/session.service';
import { CurrencyPreferenceService } from 'src/app/services/currency-preference.service';
import { buildQueryParams } from 'src/app/shared/utils/query-params.utils';
import { environment } from 'src/environments/environment';
import {
  CitasPorPeriodo,
  CitasPorPeriodoDto,
  CitasStatsDto,
  CitasStatsMetaDto,
  DiaOcupadoDto,
  EstadoCitaConteoDto,
  EstadoCitaEstadistica,
  HoraOcupadaDto,
  EstadisticasResumen,
  EstadisticasResumenDto,
  ExportacionReporteRequest,
  ExportacionReporteResponse,
  IngresoPorMetodoPago,
  IngresoPorPeriodo,
  IngresoPorPeriodoDto,
  IngresoMetodoPagoDto,
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
  NuevosVsRecurrentesPuntoDto,
  PacienteEstadisticaDto,
} from './models/estadisticas.model';
import { EstadoCitaFiltro, FiltroEstadisticas, MetodoPagoFiltro } from './models/filtros-estadisticas.model';
import { normalizeUltimos6MesesPacientes, RANKING_PACIENTES_TOP_N } from './components/chart-pacientes/pacientes-semester.util';

interface CitasStatsViewModel {
  barras: CitasPorPeriodo[];
  estados: EstadoCitaEstadistica[];
  resumen: ResumenCitasEstadistica;
  /** Opcional: TZ del consultorio y texto de desempate (backend dashboard). */
  meta?: CitasStatsMetaDto;
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
    private currencyPreference: CurrencyPreferenceService,
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

  reloadCurrentFilters(): void {
    this.filtrosSubject.next({ ...this.filtrosSubject.value });
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
    const httpRaw = await firstValueFrom(
      this.http.get<unknown>(`${this.base}/citas`, {
        params: this.buildStatsParams(filtros, { periodo }),
      })
    );

    const raw = this.normalizeCitasStatsDto(httpRaw);

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
      meta: raw.meta,
    };
  }

  async getIngresosStats(periodo: PeriodoCitas, filtros: FiltroEstadisticas = this.filtrosActuales): Promise<IngresosStatsViewModel> {
    const httpRaw = await firstValueFrom(
      this.http.get<unknown>(`${this.base}/ingresos`, {
        params: this.buildStatsParams(filtros, { periodo }),
      })
    );

    const raw = this.normalizeIngresosStatsDto(httpRaw);

    const barras = (raw.serie ?? []).map(item => ({
      fecha: item.fecha,
      label: item.label || this.buildPeriodoLabel(item.fecha, periodo),
      total: item.total ?? 0,
      efectivo: item.efectivo ?? 0,
      transferencia: item.transferencia ?? 0,
      tarjeta: item.tarjeta ?? 0,
      pendiente: item.pendiente ?? 0,
    }));

    let metodos = (raw.por_metodo_pago ?? []).map(item => ({
      metodo: this.normalizeMetodoPagoLabel(item.metodo),
      total: item.total ?? 0,
      porcentaje: item.porcentaje ?? 0,
      color: this.colorMetodoPago(this.normalizeMetodoPagoLabel(item.metodo)),
    }));

    const sumMontos = metodos.reduce((acc, m) => acc + m.total, 0);
    if (sumMontos > 0) {
      metodos = metodos.map(m => ({
        ...m,
        porcentaje: Number(((m.total / sumMontos) * 100).toFixed(1)),
      }));
    }

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
    const httpRaw = await firstValueFrom(
      this.http.get<unknown>(`${this.base}/pacientes`, { params: this.buildStatsParams(filtros) })
    );

    const raw = this.normalizePacientesStatsDto(httpRaw);
    const rankingNoAsistenciasSource = raw.ranking_no_asistencias ?? [];

    const puntosRaw: NuevosVsRecurrentesPunto[] = (raw.nuevos_vs_recurrentes ?? []).map(item => ({
      label: item.label || '',
      nuevos: item.nuevos ?? 0,
      recurrentes: item.recurrentes ?? 0,
      ...(item.fecha ? { fecha: item.fecha } : {}),
    }));

    const puntos = normalizeUltimos6MesesPacientes(puntosRaw, filtros.fechaHasta);

    const mapRankTop = (rows: RankingPacienteDto[]) =>
      rows.slice(0, RANKING_PACIENTES_TOP_N).map((item, index) =>
        this.mapRankingPaciente({ ...item, posicion: index + 1 }, index),
      );

    return {
      puntos,
      resumen: {
        totalActivos: raw.total_activos ?? 0,
        nuevosEsteMes: raw.nuevos_este_mes ?? 0,
        recurrentesEsteMes: raw.recurrentes_este_mes ?? 0,
        tasaRetencion: raw.tasa_retencion ?? 0,
      },
      rankingCitas: mapRankTop(raw.ranking_mas_citas ?? []),
      rankingNoAsistencias: mapRankTop(rankingNoAsistenciasSource),
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
    console.debug('[Estadisticas] GET /insights params:', this.buildStatsParams(filtros));
    try {
      const raw = await firstValueFrom(
        this.http.get<InsightEstadisticaDto[] | { insights?: InsightEstadisticaDto[] }>(`${this.base}/insights`, {
          params: this.buildStatsParams(filtros),
        })
      );
      console.debug('[Estadisticas] /insights response:', raw);

      const rows = Array.isArray(raw) ? raw : (Array.isArray(raw?.insights) ? raw.insights : []);

      return rows.map((item, index) => ({
        id: item.id || `insight-${index + 1}`,
        icono: item.icono || 'sparkles-outline',
        titulo: item.titulo || 'Insight',
        valor: item.valor || 'Sin datos',
        descripcion: item.descripcion || '',
        tipo: this.normalizeInsightTipo(item.tipo || 'primary'),
      }));
    } catch (error) {
      if (this.isNotFound(error)) {
        console.warn('[Estadisticas] /insights 404, devolviendo []');
        return [];
      }
      console.error('[Estadisticas] Error en /insights:', error);
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
    const pid = filtros.profesional?.trim();
    const profesionalId = pid ? Number(pid) : NaN;
    return buildQueryParams({
      rango: filtros.rango,
      fecha_desde: filtros.fechaDesde,
      fecha_hasta: filtros.fechaHasta,
      estado_cita: this.mapEstadoFiltro(filtros.estadoCita),
      metodo_pago: this.mapMetodoPagoFiltro(filtros.metodoPago),
      ...(Number.isFinite(profesionalId) && profesionalId > 0 ? { profesional_id: profesionalId } : {}),
      ...extras,
    });
  }

  /** Spring suele serializar camelCase; el front histórico esperaba snake_case. */
  private normalizeCitasStatsDto(raw: unknown): CitasStatsDto {
    if (!raw || typeof raw !== 'object') {
      return {
        serie: [],
        conteo_por_estado: [],
        total_citas: 0,
        horas_mas_ocupadas: [],
        dias_mas_ocupados: [],
        meta: undefined,
      };
    }
    const r = raw as Record<string, unknown>;
    const serieIn = r['serie'] ?? r['series'];
    const serie = Array.isArray(serieIn) ? serieIn.map(row => this.normalizeCitasPorPeriodoRow(row)) : [];
    const estadosIn = r['conteo_por_estado'] ?? r['conteoPorEstado'];
    const conteo_por_estado = Array.isArray(estadosIn)
      ? estadosIn.map(row => this.normalizeEstadoConteoRow(row))
      : [];
    const horasIn = r['horas_mas_ocupadas'] ?? r['horasMasOcupadas'];
    const horas_mas_ocupadas = Array.isArray(horasIn)
      ? horasIn.map(row => this.normalizeHoraOcupadaRow(row))
      : [];
    const diasIn = r['dias_mas_ocupados'] ?? r['diasMasOcupados'];
    const dias_mas_ocupados = Array.isArray(diasIn)
      ? diasIn.map(row => this.normalizeDiaOcupadoRow(row))
      : [];
    const total_citas = this.pickNum(r['total_citas'] ?? r['totalCitas'], serie.reduce((a, x) => a + (x.total ?? 0), 0));

    return {
      serie,
      conteo_por_estado,
      total_citas,
      horas_mas_ocupadas,
      dias_mas_ocupados,
      meta: this.normalizeCitasStatsMeta(r['meta']),
    };
  }

  private normalizeCitasStatsMeta(raw: unknown): CitasStatsMetaDto | undefined {
    if (!raw || typeof raw !== 'object') return undefined;
    const m = raw as Record<string, unknown>;
    const zona = m['zona_horaria'] ?? m['zonaHoraria'];
    const des = m['desempate_conteo_estado'] ?? m['desempateConteoEstado'];
    if (zona == null && des == null) return undefined;
    const out: CitasStatsMetaDto = {
      zona_horaria: typeof zona === 'string' ? zona : zona != null ? String(zona) : '',
    };
    if (des != null) out.desempate_conteo_estado = typeof des === 'string' ? des : String(des);
    return out;
  }

  private normalizeCitasPorPeriodoRow(row: unknown): CitasPorPeriodoDto {
    if (!row || typeof row !== 'object') {
      return { fecha: '', label: '', total: 0, confirmadas: 0, completadas: 0, canceladas: 0, no_asistio: 0 };
    }
    const o = row as Record<string, unknown>;
    return {
      fecha: String(o['fecha'] ?? ''),
      label: String(o['label'] ?? ''),
      total: this.pickNum(o['total'], 0),
      confirmadas: this.pickNum(o['confirmadas'], 0),
      completadas: this.pickNum(o['completadas'], 0),
      canceladas: this.pickNum(o['canceladas'], 0),
      no_asistio: this.pickNum(o['no_asistio'] ?? o['noAsistio'], 0),
    };
  }

  private normalizeEstadoConteoRow(row: unknown): EstadoCitaConteoDto {
    if (!row || typeof row !== 'object') {
      return { estado: '', cantidad: 0 };
    }
    const o = row as Record<string, unknown>;
    return {
      estado: String(o['estado'] ?? ''),
      cantidad: this.pickNum(o['cantidad'], 0),
    };
  }

  private normalizeHoraOcupadaRow(row: unknown): HoraOcupadaDto {
    if (!row || typeof row !== 'object') {
      return { hora: '', citas: 0 };
    }
    const o = row as Record<string, unknown>;
    return {
      hora: String(o['hora'] ?? ''),
      citas: this.pickNum(o['citas'], 0),
    };
  }

  private normalizeDiaOcupadoRow(row: unknown): DiaOcupadoDto {
    if (!row || typeof row !== 'object') {
      return { dia: '', citas: 0 };
    }
    const o = row as Record<string, unknown>;
    return {
      dia: String(o['dia'] ?? ''),
      citas: this.pickNum(o['citas'], 0),
    };
  }

  private normalizeIngresosStatsDto(raw: unknown): IngresosStatsDto {
    if (!raw || typeof raw !== 'object') {
      return {
        serie: [],
        por_metodo_pago: [],
        total_periodo: 0,
        monto_pendiente: 0,
        citas_pagadas: 0,
        citas_pendientes: 0,
        metodo_principal: null,
      };
    }
    const r = raw as Record<string, unknown>;
    const serieIn = r['serie'] ?? r['series'];
    const serie = Array.isArray(serieIn) ? serieIn.map(row => this.normalizeIngresoPorPeriodoRow(row)) : [];
    const pmIn = r['por_metodo_pago'] ?? r['porMetodoPago'];
    const por_metodo_pago = Array.isArray(pmIn) ? pmIn.map(row => this.normalizeIngresoMetodoPagoRow(row)) : [];
    const mp = r['metodo_principal'] ?? r['metodoPrincipal'];

    return {
      serie,
      por_metodo_pago,
      total_periodo: this.pickNum(r['total_periodo'] ?? r['totalPeriodo'], serie.reduce((a, x) => a + (x.total ?? 0), 0)),
      monto_pendiente: this.pickNum(r['monto_pendiente'] ?? r['montoPendiente'], 0),
      citas_pagadas: this.pickNum(r['citas_pagadas'] ?? r['citasPagadas'], 0),
      citas_pendientes: this.pickNum(r['citas_pendientes'] ?? r['citasPendientes'], 0),
      metodo_principal: mp != null && mp !== '' ? String(mp) : null,
    };
  }

  private normalizeIngresoPorPeriodoRow(row: unknown): IngresoPorPeriodoDto {
    if (!row || typeof row !== 'object') {
      return { fecha: '', label: '', total: 0, efectivo: 0, transferencia: 0, tarjeta: 0, pendiente: 0 };
    }
    const o = row as Record<string, unknown>;
    return {
      fecha: String(o['fecha'] ?? ''),
      label: String(o['label'] ?? ''),
      total: this.pickNum(o['total'], 0),
      efectivo: this.pickNum(o['efectivo'], 0),
      transferencia: this.pickNum(o['transferencia'], 0),
      tarjeta: this.pickNum(o['tarjeta'], 0),
      pendiente: this.pickNum(o['pendiente'], 0),
    };
  }

  private normalizeIngresoMetodoPagoRow(row: unknown): IngresoMetodoPagoDto {
    if (!row || typeof row !== 'object') {
      return { metodo: '', total: 0, porcentaje: 0 };
    }
    const o = row as Record<string, unknown>;
    return {
      metodo: String(o['metodo'] ?? ''),
      total: this.pickNum(o['total'], 0),
      porcentaje: this.pickNum(o['porcentaje'], 0),
    };
  }

  private normalizePacientesStatsDto(raw: unknown): PacientesStatsDto {
    if (!raw || typeof raw !== 'object') {
      return {
        nuevos_vs_recurrentes: [],
        total_activos: 0,
        nuevos_este_mes: 0,
        recurrentes_este_mes: 0,
        tasa_retencion: 0,
        ranking_mas_citas: [],
        ranking_no_asistencias: [],
        ranking_por_ingresos: [],
        pacientes: [],
      };
    }
    const r = raw as Record<string, unknown>;
    const nvrIn = r['nuevos_vs_recurrentes'] ?? r['nuevosVsRecurrentes'];
    const nuevos_vs_recurrentes = Array.isArray(nvrIn)
      ? nvrIn.map(row => this.normalizeNuevosVsRecurrentesRow(row))
      : [];

    const rnkCitas = r['ranking_mas_citas'] ?? r['rankingMasCitas'];
    const ranking_mas_citas = Array.isArray(rnkCitas) ? rnkCitas.map(row => this.normalizeRankingPacienteRow(row)) : [];

    const rnkNa = r['ranking_no_asistencias'] ?? r['rankingNoAsistencias'];
    const ranking_no_asistencias = Array.isArray(rnkNa) ? rnkNa.map(row => this.normalizeRankingPacienteRow(row)) : [];

    const rnkIng = r['ranking_por_ingresos'] ?? r['rankingPorIngresos'];
    const ranking_por_ingresos = Array.isArray(rnkIng) ? rnkIng.map(row => this.normalizeRankingPacienteRow(row)) : [];

    const pacIn = r['pacientes'];
    const pacientes = Array.isArray(pacIn) ? pacIn.map(row => this.normalizePacienteEstadisticaRow(row)) : [];

    return {
      nuevos_vs_recurrentes,
      ranking_mas_citas,
      ranking_no_asistencias,
      ranking_por_ingresos,
      pacientes,
      total_activos: this.pickNum(r['total_activos'] ?? r['totalActivos'], 0),
      nuevos_este_mes: this.pickNum(r['nuevos_este_mes'] ?? r['nuevosEsteMes'], 0),
      recurrentes_este_mes: this.pickNum(r['recurrentes_este_mes'] ?? r['recurrentesEsteMes'], 0),
      tasa_retencion: this.pickNum(r['tasa_retencion'] ?? r['tasaRetencion'], 0),
    };
  }

  private normalizeNuevosVsRecurrentesRow(row: unknown): NuevosVsRecurrentesPuntoDto {
    if (!row || typeof row !== 'object') {
      return { label: '', nuevos: 0, recurrentes: 0 };
    }
    const o = row as Record<string, unknown>;
    const fechaRaw = o['fecha'] ?? o['periodo'];
    const dto: NuevosVsRecurrentesPuntoDto = {
      label: String(o['label'] ?? ''),
      nuevos: this.pickNum(o['nuevos'], 0),
      recurrentes: this.pickNum(o['recurrentes'], 0),
    };
    if (typeof fechaRaw === 'string' && fechaRaw.trim().length >= 7) {
      dto.fecha = fechaRaw.trim().slice(0, 7);
    }
    return dto;
  }

  private normalizeRankingPacienteRow(row: unknown): RankingPacienteDto {
    if (!row || typeof row !== 'object') {
      return { posicion: 0, id_paciente: 0, nombre_paciente: '', valor: 0 };
    }
    const o = row as Record<string, unknown>;
    const ap = o['apellido_paciente'] ?? o['apellidoPaciente'];
    return {
      posicion: this.pickNum(o['posicion'] ?? o['position'], 0),
      id_paciente: this.pickNum(o['id_paciente'] ?? o['idPaciente'], 0),
      nombre_paciente: String(o['nombre_paciente'] ?? o['nombrePaciente'] ?? ''),
      apellido_paciente: ap != null && String(ap).trim() !== '' ? String(ap) : null,
      valor: this.pickNum(o['valor'] ?? o['value'], 0),
    };
  }

  private normalizePacienteEstadisticaRow(row: unknown): PacienteEstadisticaDto {
    if (!row || typeof row !== 'object') {
      return {
        id_paciente: 0,
        nombre_paciente: '',
        total_citas: 0,
        no_asistencias: 0,
        ingresos: 0,
        es_nuevo: false,
      };
    }
    const o = row as Record<string, unknown>;
    const ap = o['apellido_paciente'] ?? o['apellidoPaciente'];
    return {
      id_paciente: this.pickNum(o['id_paciente'] ?? o['idPaciente'], 0),
      nombre_paciente: String(o['nombre_paciente'] ?? o['nombrePaciente'] ?? ''),
      apellido_paciente: ap != null && String(ap).trim() !== '' ? String(ap) : null,
      total_citas: this.pickNum(o['total_citas'] ?? o['totalCitas'], 0),
      no_asistencias: this.pickNum(o['no_asistencias'] ?? o['noAsistencias'], 0),
      ingresos: this.pickNum(o['ingresos'], 0),
      es_nuevo: o['es_nuevo'] === true || o['esNuevo'] === true,
    };
  }

  private pickNum(v: unknown, fallback: number): number {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim() !== '') {
      const n = Number(v.replace(',', '.'));
      return Number.isFinite(n) ? n : fallback;
    }
    return fallback;
  }

  private mapEstados(raw: CitasStatsDto): EstadoCitaEstadistica[] {
    const conteos = [...(raw.conteo_por_estado ?? [])];
    const total = conteos.reduce((acc, item) => acc + (item.cantidad ?? 0), 0);

    // Misma regla que SQL backend: total DESC, estado ASC (desempate).
    conteos.sort((a, b) => {
      const ca = a.cantidad ?? 0;
      const cb = b.cantidad ?? 0;
      if (cb !== ca) return cb - ca;
      return String(a.estado ?? '').localeCompare(String(b.estado ?? ''));
    });

    return conteos.map(item => {
      const estado = this.normalizeEstadoLabel(item.estado);
      const cantidad = item.cantidad ?? 0;
      return {
        estado,
        total: cantidad,
        porcentaje: total > 0 ? Number(((cantidad / total) * 100).toFixed(1)) : 0,
        color: this.colorEstado(estado),
      };
    });
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
    return this.currencyPreference.format(value, { maximumFractionDigits: 0 });
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
      citas: 'var(--chart-primary)',
      ingresos: 'var(--success-strong)',
      pacientes: 'var(--chart-info)',
      'pagos-pendientes': 'var(--warning)',
      'no-asistencias': 'var(--danger-bright)',
    };
    return map[tipo];
  }

  private colorEstado(estado: string): string {
    const map: Record<string, string> = {
      Confirmada: 'var(--chart-primary)',
      Completada: 'var(--success)',
      Pendiente: 'var(--warning)',
      Cancelada: 'var(--danger-bright)',
      'No asistió': 'var(--text-muted)',
      Pospuesta: 'var(--chart-purple)',
    };
    return map[estado] ?? 'var(--text-faint)';
  }

  private colorMetodoPago(metodo: string): string {
    const map: Record<string, string> = {
      Transferencia: 'var(--chart-primary)',
      Efectivo: 'var(--success)',
      Débito: 'var(--chart-info)',
      Crédito: 'var(--warning)',
      Tarjeta: 'var(--chart-info)',
    };
    return map[metodo] ?? 'var(--text-faint)';
  }

  private avatarColor(index: number): string {
    const colors = ['var(--chart-primary)', 'var(--success)', 'var(--chart-info)', 'var(--warning)', 'var(--chart-purple)'];
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
