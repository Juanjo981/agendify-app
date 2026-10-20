import {
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IonicModule, ToastController } from '@ionic/angular';
import { EvalChecklistItemComponent } from './eval-checklist-item.component';
import { EvalRiskLevelComponent } from './eval-risk-level.component';
import { EvalRiskLevel } from './eval-checklist.models';
import { PrimeraSesionService } from 'src/app/services/primera-sesion.service';
import { mapApiError } from 'src/app/shared/utils/api-error.mapper';
import {
  ChecklistPrimeraSesionDto,
  PRIMERA_SESION_CAMPOS,
  PRIMERA_SESION_TOTAL,
  PrimeraSesionCampoKey,
  contarCompletadosForm,
  normalizeNivelInicial,
  toChecklistRequest,
} from '../../models/primera-sesion.models';

@Component({
  selector: 'app-primera-sesion-checklist',
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    ReactiveFormsModule,
    EvalChecklistItemComponent,
    EvalRiskLevelComponent,
  ],
  templateUrl: './primera-sesion-checklist.component.html',
  styleUrls: ['./primera-sesion-checklist.component.scss'],
})
export class PrimeraSesionChecklistComponent implements OnChanges, OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly svc = inject(PrimeraSesionService);
  private readonly toastCtrl = inject(ToastController);
  private readonly destroyRef = inject(DestroyRef);

  @Input({ required: true }) idPaciente!: number;
  /** Incrementar para forzar recarga al entrar al tab. */
  @Input() refreshKey = 0;

  @Output() readonly dirtyChange = new EventEmitter<boolean>();

  readonly campos = PRIMERA_SESION_CAMPOS;
  readonly totalItems = PRIMERA_SESION_TOTAL;
  readonly title = 'Primera sesión';
  readonly subtitle = 'Checklist inicial de admisión';

  readonly loading = signal(false);
  readonly guardando = signal(false);
  readonly error = signal('');
  readonly loaded = signal(false);
  /** El GET puede no encontrar una sesión clínica todavía; no es un error. */
  readonly hasPrimeraSesion = signal(false);

  /** Contador visual (feedback inmediato); tras guardar se alinea con backend. */
  completedCount = 0;
  serverCompletados: number | null = null;

  readonly form = this.fb.nonNullable.group({
    consentimiento_informado: false,
    motivo_consulta: false,
    antecedentes: false,
    red_apoyo: false,
    riesgo_suicida: false,
    consumo_sustancias: false,
    violencia: false,
    enfermedades: false,
    medicacion_actual: false,
    firma_digital: false,
    nivel_inicial: this.fb.nonNullable.control<EvalRiskLevel>('BAJO'),
  });

  private loadSeq = 0;
  private lastLoadedKey = '';

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.syncCompletedCount();
      this.dirtyChange.emit(this.form.dirty);
    });
  }

  ngOnInit(): void {
    if (this.idPaciente && !this.loaded() && !this.loading()) {
      void this.cargar(true);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.idPaciente) return;
    const idChanged = !!changes['idPaciente'] && !changes['idPaciente'].firstChange;
    const refreshChanged = !!changes['refreshKey'] && !changes['refreshKey'].firstChange;
    if (idChanged || refreshChanged) {
      void this.cargar(true);
    }
  }

  get isDirty(): boolean {
    return this.form.dirty;
  }

  get controlesDeshabilitados(): boolean {
    return this.loading() || this.guardando() || !!this.error();
  }

  getValue(key: PrimeraSesionCampoKey): boolean {
    return !!this.form.controls[key].value;
  }

  onItemToggle(key: PrimeraSesionCampoKey, checked: boolean): void {
    if (this.controlesDeshabilitados) return;
    this.form.controls[key].setValue(checked, { emitEvent: false });
    this.form.controls[key].markAsDirty();
    this.syncCompletedCount();
    this.dirtyChange.emit(this.form.dirty);
  }

  onRiskChange(level: EvalRiskLevel): void {
    if (this.controlesDeshabilitados) return;
    this.form.controls.nivel_inicial.setValue(level, { emitEvent: false });
    this.form.controls.nivel_inicial.markAsDirty();
    this.dirtyChange.emit(this.form.dirty);
  }

  async cargar(force = false): Promise<void> {
    if (!this.idPaciente) return;
    const key = `${this.idPaciente}:${this.refreshKey}`;
    if (!force && this.lastLoadedKey === key && this.loaded() && !this.error()) {
      return;
    }

    const seq = ++this.loadSeq;
    this.loading.set(true);
    this.error.set('');
    this.form.disable({ emitEvent: false });

    this.svc.obtenerChecklist(this.idPaciente).subscribe({
      next: dto => {
        if (seq !== this.loadSeq) return;
        if (dto) {
          this.applyDto(dto);
        } else {
          this.setSinPrimeraSesion();
        }
        this.lastLoadedKey = key;
        this.loaded.set(true);
        this.loading.set(false);
        if (dto) {
          this.form.enable({ emitEvent: false });
        }
        this.dirtyChange.emit(false);
      },
      error: err => {
        if (seq !== this.loadSeq) return;
        this.loading.set(false);
        this.loaded.set(false);
        this.error.set(mapApiError(err).userMessage);
        this.form.disable({ emitEvent: false });
        this.dirtyChange.emit(false);
      },
    });
  }

  reintentar(): void {
    void this.cargar(true);
  }

  async guardar(): Promise<void> {
    if (!this.idPaciente || !this.hasPrimeraSesion() || this.guardando() || this.loading()) return;
    if (this.form.invalid) return;

    this.guardando.set(true);
    this.form.disable({ emitEvent: false });
    const request = toChecklistRequest(this.form.getRawValue());

    this.svc.guardarChecklist(this.idPaciente, request).subscribe({
      next: async dto => {
        this.applyDto(dto);
        this.guardando.set(false);
        this.form.enable({ emitEvent: false });
        this.dirtyChange.emit(false);
        await this.presentToast('Checklist de primera sesión actualizado');
      },
      error: async err => {
        this.guardando.set(false);
        this.form.enable({ emitEvent: false });
        await this.presentToast(mapApiError(err).userMessage);
      },
    });
  }

  /** Descarta cambios locales y vuelve a la última respuesta (o recarga). */
  descartarCambios(): void {
    this.form.markAsPristine();
    this.dirtyChange.emit(false);
    void this.cargar(true);
  }

  private applyDto(dto: ChecklistPrimeraSesionDto): void {
    this.form.setValue({
      consentimiento_informado: !!dto.consentimiento_informado,
      motivo_consulta: !!dto.motivo_consulta,
      antecedentes: !!dto.antecedentes,
      red_apoyo: !!dto.red_apoyo,
      riesgo_suicida: !!dto.riesgo_suicida,
      consumo_sustancias: !!dto.consumo_sustancias,
      violencia: !!dto.violencia,
      enfermedades: !!dto.enfermedades,
      medicacion_actual: !!dto.medicacion_actual,
      firma_digital: !!dto.firma_digital,
      nivel_inicial: normalizeNivelInicial(dto.nivel_inicial),
    });
    this.form.markAsPristine();
    this.serverCompletados = dto.completados ?? null;
    this.syncCompletedCount();
    this.hasPrimeraSesion.set(true);
    this.error.set('');
  }

  private setSinPrimeraSesion(): void {
    // Se descarta cualquier respuesta previa: los valores por defecto nunca se
    // presentan ni se usan como una sesión real.
    this.form.reset(undefined, { emitEvent: false });
    this.form.markAsPristine();
    this.form.disable({ emitEvent: false });
    this.completedCount = 0;
    this.serverCompletados = null;
    this.hasPrimeraSesion.set(false);
    this.error.set('');
  }

  private syncCompletedCount(): void {
    const raw = this.form.getRawValue();
    this.completedCount = contarCompletadosForm(raw);
  }

  private async presentToast(message: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 1800,
      position: 'bottom',
      color: 'dark',
    });
    await toast.present();
  }
}
