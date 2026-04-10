import { Injectable } from '@angular/core';
import { DashboardSectionRefreshContext } from './dashboard-section-refresh-context';
import { SeccionPaciente } from 'src/app/pages/pacientes/components/paciente-submenu/paciente-submenu.component';

export type ConfiguracionTabId = 'general' | 'agenda' | 'equipo' | 'seguridad' | 'sistema';
export type EstadisticasSectionId = 'dashboard' | 'citas' | 'ingresos' | 'pacientes' | 'reportes';
export type CitasSectionId = 'list' | 'detail';
export type AgendaSectionId = 'agenda';

@Injectable({ providedIn: 'root' })
export class PacienteDetailRefreshService extends DashboardSectionRefreshContext<SeccionPaciente> {}

@Injectable({ providedIn: 'root' })
export class ConfiguracionRefreshService extends DashboardSectionRefreshContext<ConfiguracionTabId> {}

@Injectable({ providedIn: 'root' })
export class EstadisticasRefreshService extends DashboardSectionRefreshContext<EstadisticasSectionId> {}

@Injectable({ providedIn: 'root' })
export class CitasRefreshService extends DashboardSectionRefreshContext<CitasSectionId> {}

@Injectable({ providedIn: 'root' })
export class AgendaRefreshService extends DashboardSectionRefreshContext<AgendaSectionId> {}
