import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IonicModule } from '@ionic/angular';
import { ResumenCajaDiaria } from '../../models/estadisticas.model';
import { EstadisticasApiService } from '../../estadisticas.service.api';

interface MetodoItem {
  label: string;
  icon: string;
  colorClass: string;
  valor: number;
}

@Component({
  selector: 'app-resumen-caja-diaria',
  templateUrl: './resumen-caja-diaria.component.html',
  styleUrls: ['./resumen-caja-diaria.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class ResumenCajaDiariaComponent implements OnInit {
  data: ResumenCajaDiaria = {
    fecha: '',
    totalCobrado: 0,
    efectivo: 0,
    transferencia: 0,
    debito: 0,
    credito: 0,
    pagosExentos: 0,
    pagosPendientes: 0,
    citasCobradas: 0,
  };
  metodoItems: MetodoItem[] = [];
  fechaDisplay = '';
  private readonly destroyRef = inject(DestroyRef);

  constructor(private svc: EstadisticasApiService) {}

  ngOnInit() {
    this.svc.filtros$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(filtros => {
        const fecha = filtros.fechaHasta || this.svc.getFiltrosIniciales().fechaHasta;
        void this.cargar(fecha, filtros);
      });
    this.fechaDisplay = this.formatDate(this.data.fecha);
    this.metodoItems = [
      { label: 'Efectivo',      icon: 'cash-outline',            colorClass: 'met--cash',     valor: this.data.efectivo      },
      { label: 'Transferencia', icon: 'swap-horizontal-outline', colorClass: 'met--transfer', valor: this.data.transferencia },
      { label: 'Débito',        icon: 'card-outline',            colorClass: 'met--debit',    valor: this.data.debito        },
      { label: 'Crédito',       icon: 'wallet-outline',          colorClass: 'met--credit',   valor: this.data.credito       },
    ];
  }

  private formatDate(iso: string): string {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  trackByLabel(_: number, m: MetodoItem): string { return m.label; }

  private async cargar(fecha: string, filtros: any) {
    try {
      this.data = await this.svc.getCajaDiaria(fecha, filtros) ?? {
        fecha,
        totalCobrado: 0,
        efectivo: 0,
        transferencia: 0,
        debito: 0,
        credito: 0,
        pagosExentos: 0,
        pagosPendientes: 0,
        citasCobradas: 0,
      };
    } catch {
      this.data = {
        fecha,
        totalCobrado: 0,
        efectivo: 0,
        transferencia: 0,
        debito: 0,
        credito: 0,
        pagosExentos: 0,
        pagosPendientes: 0,
        citasCobradas: 0,
      };
    }

    this.fechaDisplay = this.formatDate(this.data.fecha);
    this.metodoItems = [
      { label: 'Efectivo', icon: 'cash-outline', colorClass: 'met--cash', valor: this.data.efectivo },
      { label: 'Transferencia', icon: 'swap-horizontal-outline', colorClass: 'met--transfer', valor: this.data.transferencia },
      { label: 'Débito', icon: 'card-outline', colorClass: 'met--debit', valor: this.data.debito },
      { label: 'Crédito', icon: 'wallet-outline', colorClass: 'met--credit', valor: this.data.credito },
    ];
  }
}
