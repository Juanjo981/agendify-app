import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ResumenCajaDiaria } from '../../models/estadisticas.model';
import { EstadisticasMockService } from '../../estadisticas.service.mock';

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
  data!: ResumenCajaDiaria;
  metodoItems: MetodoItem[] = [];
  fechaDisplay = '';

  constructor(private svc: EstadisticasMockService) {}

  ngOnInit() {
    this.data = this.svc.getResumenCajaDiaria();
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
}
