import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { SesionesMockService } from '../sesiones.service.mock';
import { SesionDto } from '../models/sesion.model';
import { SesionFormComponent, SesionFormData } from '../components/sesion-form/sesion-form.component';
import { ConfirmDialogComponent, ConfirmDialogConfig } from '../../../shared/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-detalle-sesion',
  templateUrl: './detalle-sesion.page.html',
  styleUrls: ['./detalle-sesion.page.scss'],
  standalone: true,
  imports: [
    IonicModule, CommonModule, FormsModule,
    SesionFormComponent, ConfirmDialogComponent,
  ],
})
export class DetalleSesionPage implements OnInit {
  sesion: SesionDto | null = null;
  showEditarModal = false;

  confirmConfig: ConfirmDialogConfig | null = null;
  private confirmCallback: (() => void) | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private svc: SesionesMockService,
  ) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.sesion = this.svc.getSesionById(id) ?? null;
  }

  private recargar() {
    if (!this.sesion) return;
    this.sesion = this.svc.getSesionById(this.sesion.id_sesion) ?? null;
  }

  volver() { this.router.navigate(['/dashboard/citas']); }

  formatFecha(iso: string): string {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  formatCreacion(iso: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-ES', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  get iniciales(): string {
    if (!this.sesion) return '';
    return `${this.sesion.apellido_paciente.charAt(0)}${this.sesion.nombre_paciente.charAt(0)}`.toUpperCase();
  }

  // ─── Editar sesión ────────────────────────────────────────────────────────
  onSesionEditada(data: SesionFormData) {
    if (!this.sesion) return;
    this.svc.updateSesion({ ...this.sesion, notas: data.notas, adjunto: data.adjunto });
    this.recargar();
    this.showEditarModal = false;
  }

  // ─── Adjunto ──────────────────────────────────────────────────────────────
  eliminarAdjunto() {
    if (!this.sesion) return;
    this.openConfirm(
      {
        title: 'Eliminar adjunto',
        message: '¿Deseas eliminar el archivo adjunto de esta sesión?',
        confirmLabel: 'Eliminar',
        variant: 'danger',
        icon: 'trash-outline',
      },
      () => {
        this.svc.deleteArchivoSesion(this.sesion!.id_sesion);
        this.recargar();
      }
    );
  }

  // ─── Confirm dialog ───────────────────────────────────────────────────────
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
}
