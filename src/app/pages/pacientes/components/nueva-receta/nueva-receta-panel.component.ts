import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { PlantillaRecetasApiService } from 'src/app/services/plantilla-recetas-api.service';
import { Router } from '@angular/router';
import {
  PlantillaRecetasConfigDto,
  createDefaultPlantillaConfig,
} from 'src/app/shared/models/plantilla-recetas.models';
import { PacienteDto } from '../../models/paciente.model';
import {
  RecetaContenidoDinamico,
  createEmptyRecetaContenido,
} from './receta-contenido.models';
import { RecetaSheetPreviewComponent } from './receta-sheet-preview.component';
import { mapApiError } from 'src/app/shared/utils/api-error.mapper';

export type NuevaRecetaVistaMovil = 'datos' | 'preview';

@Component({
  selector: 'app-nueva-receta-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RecetaSheetPreviewComponent],
  templateUrl: './nueva-receta-panel.component.html',
  styleUrls: ['./nueva-receta-panel.component.scss'],
})
export class NuevaRecetaPanelComponent implements OnInit, OnChanges, OnDestroy {
  @Input() abierto = false;
  @Input() paciente: PacienteDto | null = null;
  @Output() cerrado = new EventEmitter<void>();

  /** Pestaña activa en <1280px; en desktop amplio ambas columnas se muestran. */
  vistaMovil: NuevaRecetaVistaMovil = 'datos';

  cargandoPlantilla = false;
  errorPlantilla = '';
  esPredeterminada = true;
  config: PlantillaRecetasConfigDto = createDefaultPlantillaConfig();
  contenido: RecetaContenidoDinamico = createEmptyRecetaContenido();

  private bodyOverflowPrev = '';

  constructor(
    private plantillaApi: PlantillaRecetasApiService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    if (this.abierto) {
      this.syncBodyScrollLock(true);
      void this.inicializar();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['abierto']) {
      const abierto = !!changes['abierto'].currentValue;
      this.syncBodyScrollLock(abierto);
      if (abierto) {
        this.vistaMovil = 'datos';
        void this.inicializar();
      }
    }
  }

  ngOnDestroy(): void {
    this.syncBodyScrollLock(false);
  }

  setVistaMovil(vista: NuevaRecetaVistaMovil): void {
    this.vistaMovil = vista;
  }

  cerrar(): void {
    this.syncBodyScrollLock(false);
    this.cerrado.emit();
  }

  irAPlantilla(): void {
    this.cerrar();
    void this.router.navigateByUrl('/dashboard/plantilla-recetas');
  }

  agregarMedicamento(): void {
    this.contenido.medicamentos = [
      ...this.contenido.medicamentos,
      { nombre: '', dosis: '', frecuencia: '', duracion: '' },
    ];
  }

  quitarMedicamento(index: number): void {
    if (this.contenido.medicamentos.length <= 1) {
      this.contenido.medicamentos = [{ nombre: '', dosis: '', frecuencia: '', duracion: '' }];
      return;
    }
    this.contenido.medicamentos = this.contenido.medicamentos.filter((_, i) => i !== index);
  }

  trackMed(index: number): number {
    return index;
  }

  private syncBodyScrollLock(lock: boolean): void {
    if (typeof document === 'undefined') return;
    // No usa body.modal-open: el menú inferior móvil debe permanecer visible.
    if (lock) {
      this.bodyOverflowPrev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = this.bodyOverflowPrev;
      this.bodyOverflowPrev = '';
    }
  }

  private async inicializar(): Promise<void> {
    this.cargandoPlantilla = true;
    this.errorPlantilla = '';
    this.seedContenidoDesdePaciente();

    try {
      const preview = await this.plantillaApi.obtenerVistaPrevia();
      this.esPredeterminada = preview.esPredeterminada ?? true;
      this.config = preview.configuracion;
    } catch (error) {
      this.config = createDefaultPlantillaConfig();
      this.esPredeterminada = true;
      this.errorPlantilla = mapApiError(error).userMessage;
    } finally {
      this.cargandoPlantilla = false;
    }
  }

  private seedContenidoDesdePaciente(): void {
    const p = this.paciente;
    const hoy = new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date());

    let edad: string | null = null;
    if (p?.fecha_nacimiento) {
      const years = this.calcularEdad(p.fecha_nacimiento);
      if (years !== null) edad = `${years} años`;
    }

    this.contenido = {
      ...createEmptyRecetaContenido(),
      pacienteNombre: p ? `${p.nombre} ${p.apellido}`.trim() : '',
      fechaEmision: hoy,
      edad,
      medicamentos: [{ nombre: '', dosis: '', frecuencia: '', duracion: '' }],
    };
  }

  private calcularEdad(fechaNacimiento: string): number | null {
    const nac = new Date(fechaNacimiento);
    if (Number.isNaN(nac.getTime())) return null;
    const hoy = new Date();
    let edad = hoy.getFullYear() - nac.getFullYear();
    if (hoy.getMonth() < nac.getMonth() || (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate())) {
      edad--;
    }
    return edad >= 0 ? edad : null;
  }
}
