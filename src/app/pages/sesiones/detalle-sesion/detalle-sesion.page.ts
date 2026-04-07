import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AlertController, IonicModule } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmDialogComponent, ConfirmDialogConfig } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { mapApiError } from 'src/app/shared/utils/api-error.mapper';
import { AdjuntosServiceApi } from 'src/app/services/adjuntos.service.api';
import { SesionesApiService } from '../sesiones-api.service';
import {
  ArchivoAdjuntoDto,
  SesionDto,
  SesionArchivoLocal,
  getSessionSummary,
  hasTerminalStatus,
} from '../models/sesion.model';
import { SesionFormComponent, SesionFormData } from '../components/sesion-form/sesion-form.component';

@Component({
  selector: 'app-detalle-sesion',
  templateUrl: './detalle-sesion.page.html',
  styleUrls: ['./detalle-sesion.page.scss'],
  standalone: true,
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    SesionFormComponent,
    ConfirmDialogComponent,
  ],
})
export class DetalleSesionPage implements OnInit {
  sesion: SesionDto | null = null;
  adjuntos: ArchivoAdjuntoDto[] = [];
  showEditarModal = false;
  loading = false;
  saving = false;
  adjuntosLoading = false;
  errorMessage = '';
  formErrorMessage = '';

  confirmConfig: ConfirmDialogConfig | null = null;
  private confirmCallback: (() => void) | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private sesionesApi: SesionesApiService,
    private adjuntosApi: AdjuntosServiceApi,
    private alertCtrl: AlertController,
  ) {}

  ngOnInit() {
    void this.recargar();
  }

  get iniciales(): string {
    if (!this.sesion) return '';
    return `${this.sesion.apellido_paciente.charAt(0)}${this.sesion.nombre_paciente.charAt(0)}`.toUpperCase();
  }

  get puedeEditar(): boolean {
    return !!this.sesion && !hasTerminalStatus(this.sesion);
  }

  get resumenSesion(): string {
    return this.sesion ? getSessionSummary(this.sesion) : '';
  }

  volver() {
    this.router.navigate(['/dashboard/sesiones']);
  }

  async recargar() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.errorMessage = 'Sesión no encontrada';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    try {
      this.sesion = await this.sesionesApi.getById(id);
      await this.cargarAdjuntos();
    } catch (err) {
      this.sesion = null;
      this.adjuntos = [];
      this.errorMessage = mapApiError(err).userMessage;
    } finally {
      this.loading = false;
    }
  }

  formatFecha(iso: string): string {
    if (!iso) return '-';
    const date = new Date(iso);
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatCreacion(iso: string): string {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString('es-ES', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  formatFileSize(bytes?: number | null): string {
    const value = Number(bytes || 0);
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }

  getFileIcon(type?: string | null): string {
    if (!type) return 'attach-outline';
    if (type.startsWith('image/')) return 'image-outline';
    if (type === 'application/pdf') return 'document-outline';
    return 'document-text-outline';
  }

  async onSesionEditada(data: SesionFormData) {
    if (!this.sesion) return;

    this.saving = true;
    this.formErrorMessage = '';

    try {
      this.sesion = await this.sesionesApi.update(this.sesion.id_sesion, {
        fecha_sesion: data.fecha_sesion,
        tipo_sesion: data.tipo_sesion,
        resumen: data.resumen || null,
      });

      if (data.adjunto) {
        await this.adjuntosApi.uploadToEntidad('SESION', this.sesion.id_sesion, data.adjunto);
      }

      this.showEditarModal = false;
      await this.cargarAdjuntos();
    } catch (err) {
      this.formErrorMessage = mapApiError(err).userMessage;
    } finally {
      this.saving = false;
    }
  }

  async verAdjunto(adjunto: ArchivoAdjuntoDto) {
    try {
      const response = await this.adjuntosApi.getDownloadUrl(adjunto.id_archivo_adjunto);
      window.open(response.download_url, '_blank', 'noopener');
    } catch (err) {
      await this.presentAlert('No se pudo abrir el adjunto', mapApiError(err).userMessage);
    }
  }

  async descargarAdjunto(adjunto: ArchivoAdjuntoDto) {
    try {
      const response = await this.adjuntosApi.getDownloadUrl(adjunto.id_archivo_adjunto);
      const link = document.createElement('a');
      link.href = response.download_url;
      link.download = response.nombre_original || adjunto.nombre_original;
      link.target = '_blank';
      link.rel = 'noopener';
      link.click();
    } catch (err) {
      await this.presentAlert('No se pudo descargar el adjunto', mapApiError(err).userMessage);
    }
  }

  eliminarAdjunto(adjunto: ArchivoAdjuntoDto) {
    this.openConfirm(
      {
        title: 'Eliminar adjunto',
        message: `Se marcará como inactivo "${adjunto.nombre_original}".`,
        confirmLabel: 'Eliminar',
        variant: 'danger',
        icon: 'trash-outline',
      },
      () => {
        void this.confirmarEliminarAdjunto(adjunto.id_archivo_adjunto);
      }
    );
  }

  private async cargarAdjuntos() {
    if (!this.sesion) return;

    this.adjuntosLoading = true;
    try {
      const page = await this.adjuntosApi.getBySesionId(this.sesion.id_sesion, { size: 50 });
      this.adjuntos = page.content ?? [];
    } catch {
      this.adjuntos = [];
    } finally {
      this.adjuntosLoading = false;
    }
  }

  private async confirmarEliminarAdjunto(idArchivoAdjunto: number) {
    try {
      await this.adjuntosApi.delete(idArchivoAdjunto);
      await this.cargarAdjuntos();
    } catch (err) {
      await this.presentAlert('No se pudo eliminar el adjunto', mapApiError(err).userMessage);
    }
  }

  private openConfirm(config: ConfirmDialogConfig, onConfirm: () => void) {
    this.confirmConfig = config;
    this.confirmCallback = onConfirm;
  }

  onConfirmConfirmed() {
    this.confirmCallback?.();
    this.confirmConfig = null;
    this.confirmCallback = null;
  }

  onConfirmCancelled() {
    this.confirmConfig = null;
    this.confirmCallback = null;
  }

  private async presentAlert(header: string, message: string) {
    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: [{ text: 'Entendido', role: 'cancel' }],
      cssClass: 'agendify-alert',
    });
    await alert.present();
  }
}
