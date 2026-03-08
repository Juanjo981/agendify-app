import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { CitasMockService } from '../citas.service.mock';
import { SesionesMockService } from '../../sesiones/sesiones.service.mock';
import { CitaDto, EstadoCita, EstadoPago, MetodoPago } from '../models/cita.model';
import { EstadoBadgeComponent } from '../components/estado-badge/estado-badge.component';
import { PagoBadgeComponent } from '../components/pago-badge/pago-badge.component';
import { CitaFormModalComponent, CitaFormData } from '../../../shared/components/cita-form-modal/cita-form-modal.component';
import { ReprogramarModalComponent, ReprogramarData } from '../components/reprogramar-modal/reprogramar-modal.component';
import { SesionFormComponent } from '../../sesiones/components/sesion-form/sesion-form.component';
import { ConfirmDialogComponent, ConfirmDialogConfig } from '../../../shared/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-detalle-cita',
  templateUrl: './detalle-cita.page.html',
  styleUrls: ['./detalle-cita.page.scss'],
  standalone: true,
  imports: [
    IonicModule, CommonModule, FormsModule,
    EstadoBadgeComponent, PagoBadgeComponent,
    CitaFormModalComponent, ReprogramarModalComponent,
    SesionFormComponent, ConfirmDialogComponent,
  ],
})
export class DetalleCitaPage implements OnInit {
  cita: CitaDto | null = null;

  showEditarModal = false;
  showReprogramarModal = false;
  showSesionForm = false;
  showPagoForm = false;

  pagoForm: { estado_pago: EstadoPago; monto_pagado: number; metodo_pago: MetodoPago | '' } = {
    estado_pago: 'Pendiente',
    monto_pagado: 0,
    metodo_pago: '',
  };
  pagoError = '';

  readonly metodoPagoOpts: MetodoPago[] = ['Efectivo', 'Transferencia', 'Tarjeta', 'Otro'];

  confirmConfig: ConfirmDialogConfig | null = null;
  private confirmCallback: (() => void) | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private citasSvc: CitasMockService,
    private sesionesSvc: SesionesMockService,
  ) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.recargar(id);
  }

  private recargar(id = this.cita?.id_cita ?? 0) {
    this.cita = this.citasSvc.getCitaById(id) ?? null;
  }

  volver() { this.router.navigate(['/dashboard/citas']); }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  formatFecha(iso: string): string {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  formatMonto(n: number): string { return `€${n.toFixed(2)}`; }

  get iniciales(): string {
    if (!this.cita) return '';
    return `${this.cita.apellido_paciente.charAt(0)}${this.cita.nombre_paciente.charAt(0)}`.toUpperCase();
  }

  get duracionLabel(): string {
    if (!this.cita) return '—';
    const h = Math.floor(this.cita.duracion / 60);
    const m = this.cita.duracion % 60;
    if (h === 0) return `${m} min`;
    return m === 0 ? `${h} h` : `${h} h ${m} min`;
  }

  get puedeCrearSesion(): boolean {
    return !!this.cita && this.cita.estado === 'Completada' && !this.cita.tiene_sesion;
  }

  get sesionExistente() {
    if (!this.cita) return null;
    return this.sesionesSvc.getSesionByCita(this.cita.id_cita) ?? null;
  }

  // ─── Acciones de estado ───────────────────────────────────────────────────
  cambiarEstado(estado: EstadoCita, label: string) {
    this.openConfirm(
      {
        title: label,
        message: `¿Confirmas cambiar el estado de la cita a "${estado}"?`,
        confirmLabel: 'Confirmar',
        variant: 'primary',
        icon: 'checkmark-circle-outline',
      },
      () => {
        this.citasSvc.updateEstado(this.cita!.id_cita, estado);
        this.recargar();
      }
    );
  }

  // ─── Editar ───────────────────────────────────────────────────────────────
  onCitaEditada(data: CitaFormData) {
    if (!this.cita) return;
    this.citasSvc.updateCita({ ...this.cita, ...data });
    this.recargar();
    this.showEditarModal = false;
  }

  // ─── Reprogramar ──────────────────────────────────────────────────────────
  onReprogramado(data: ReprogramarData) {
    if (!this.cita) return;
    this.citasSvc.reprogramarCita(this.cita.id_cita, data.fecha, data.hora_inicio, data.hora_fin);
    this.recargar();
    this.showReprogramarModal = false;
  }

  // ─── Registrar pago ───────────────────────────────────────────────────────
  abrirPagoForm() {
    if (!this.cita) return;
    this.pagoForm = {
      estado_pago: this.cita.estado_pago,
      monto_pagado: this.cita.monto_pagado,
      metodo_pago: this.cita.metodo_pago,
    };
    this.pagoError = '';
    this.showPagoForm = true;
  }

  guardarPago() {
    if (!this.cita) return;
    if (!this.pagoForm.estado_pago) { this.pagoError = 'Selecciona un estado de pago'; return; }
    this.citasSvc.updatePago(
      this.cita.id_cita,
      this.pagoForm.estado_pago,
      this.pagoForm.monto_pagado,
      this.pagoForm.metodo_pago,
    );
    this.recargar();
    this.showPagoForm = false;
  }

  // ─── Crear sesión ─────────────────────────────────────────────────────────
  onSesionGuardada(data: { notas: string; adjunto?: any }) {
    if (!this.cita) return;
    this.sesionesSvc.createSesion({
      id_cita: this.cita.id_cita,
      id_paciente: this.cita.id_paciente,
      nombre_paciente: this.cita.nombre_paciente,
      apellido_paciente: this.cita.apellido_paciente,
      fecha_cita: this.cita.fecha,
      notas: data.notas,
      adjunto: data.adjunto,
    });
    this.citasSvc.marcarConSesion(this.cita.id_cita);
    this.recargar();
    this.showSesionForm = false;
  }

  verSesion() {
    const sesion = this.sesionExistente;
    if (sesion) this.router.navigate(['/dashboard/sesiones', sesion.id_sesion]);
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
