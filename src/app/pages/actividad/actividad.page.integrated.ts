import { Component, OnInit } from '@angular/core';
import { IonicModule, LoadingController, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SolicitudReprogramacion } from 'src/app/shared/models/solicitud-reprogramacion.model';
import { SolicitudReprogramacionModalComponent } from 'src/app/shared/components/solicitud-reprogramacion-modal/solicitud-reprogramacion-modal.component';
import { ActividadApiService, ActividadFeedItem, ActividadTipo } from 'src/app/services/actividad-api.service';
import { SolicitudReprogramacionApiService } from '../citas/solicitud-reprogramacion-api.service';
import { mapApiError } from 'src/app/shared/utils/api-error.mapper';

type FiltroActivo = 'todos' | 'agenda' | 'equipo' | 'sistema';

interface EventoActividad {
  tipo: ActividadTipo;
  icono: string;
  titulo: string;
  descripcion: string;
  tiempo: string;
  fecha: 'hoy' | 'ayer' | 'anterior';
  solicitudId?: number;
}

@Component({
  selector: 'app-actividad',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, SolicitudReprogramacionModalComponent],
  templateUrl: './actividad.page.html',
  styleUrls: ['./actividad.page.scss'],
})
export class ActividadPageIntegrated implements OnInit {
  solicitudSeleccionada: SolicitudReprogramacion | null = null;
  showSolicitudModal = false;

  filtroActivo: FiltroActivo = 'todos';

  filtros: { label: string; value: FiltroActivo; icono: string }[] = [
    { label: 'Todos', value: 'todos', icono: 'apps-outline' },
    { label: 'Agenda', value: 'agenda', icono: 'calendar-outline' },
    { label: 'Equipo', value: 'equipo', icono: 'people-outline' },
    { label: 'Sistema', value: 'sistema', icono: 'settings-outline' },
  ];

  private _todos: EventoActividad[] = [];

  constructor(
    private actividadApi: ActividadApiService,
    private solicitudApi: SolicitudReprogramacionApiService,
    private router: Router,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.cargarActividad();
  }

  async abrirSolicitud(solicitudId: number): Promise<void> {
    try {
      const solicitud = await this.solicitudApi.ensureLoaded(solicitudId);
      if (!solicitud) {
        await this.presentToast('No pudimos cargar la solicitud seleccionada.');
        return;
      }

      this.solicitudSeleccionada = solicitud;
      this.showSolicitudModal = true;
    } catch (error) {
      await this.presentToast(mapApiError(error).userMessage);
    }
  }

  async onSolicitudAceptada(): Promise<void> {
    if (!this.solicitudSeleccionada) {
      return;
    }

    try {
      await this.solicitudApi.aprobar(this.solicitudSeleccionada.id_solicitud);
      this.showSolicitudModal = false;
      this.solicitudSeleccionada = null;
      await this.cargarActividad();
      await this.presentToast('Solicitud aprobada correctamente.', 'success');
    } catch (error) {
      await this.presentToast(mapApiError(error).userMessage);
    }
  }

  async onSolicitudRechazada(motivo: string): Promise<void> {
    if (!this.solicitudSeleccionada) {
      return;
    }

    try {
      await this.solicitudApi.rechazar(this.solicitudSeleccionada.id_solicitud, motivo);
      this.showSolicitudModal = false;
      this.solicitudSeleccionada = null;
      await this.cargarActividad();
      await this.presentToast('Solicitud rechazada correctamente.', 'success');
    } catch (error) {
      await this.presentToast(mapApiError(error).userMessage);
    }
  }

  async onVerAgenda(): Promise<void> {
    this.showSolicitudModal = false;
    this.solicitudSeleccionada = null;
    await this.router.navigate(['/dashboard/agenda']);
  }

  cerrarSolicitudModal(): void {
    this.showSolicitudModal = false;
    this.solicitudSeleccionada = null;
  }

  get eventosFiltrados(): EventoActividad[] {
    if (this.filtroActivo === 'todos') return this._todos;
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

  iconoPorTipo(tipo: ActividadTipo): string {
    const map: Record<ActividadTipo, string> = {
      agenda: 'calendar-outline',
      equipo: 'people-outline',
      sistema: 'settings-outline',
      reprogramar: 'swap-horizontal-outline',
    };
    return map[tipo];
  }

  private async cargarActividad(): Promise<void> {
    const loading = await this.loadingCtrl.create({
      message: 'Cargando actividad...',
      spinner: 'crescent',
    });

    await loading.present();

    try {
      const response = await this.actividadApi.getAll({ size: 100 });
      this._todos = (response.content ?? []).map(item => this.mapEventoActividad(item));
    } catch (error) {
      this._todos = [];
      await this.presentToast(mapApiError(error).userMessage);
    } finally {
      await loading.dismiss();
    }
  }

  private mapEventoActividad(item: ActividadFeedItem): EventoActividad {
    return {
      tipo: item.tipo,
      icono: item.icono,
      titulo: item.titulo,
      descripcion: item.descripcion,
      tiempo: item.tiempo,
      fecha: item.fecha,
      solicitudId: item.solicitudId ?? undefined,
    };
  }

  private async presentToast(message: string, color: 'danger' | 'success' = 'danger'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'bottom',
      color,
    });

    await toast.present();
  }
}
