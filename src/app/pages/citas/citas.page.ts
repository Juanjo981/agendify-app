import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { CitasMockService } from './citas.service.mock';
import { CitaDto, FiltroCitas } from './models/cita.model';
import { CitaCardComponent } from './components/cita-card/cita-card.component';
import { CitaFiltrosComponent } from './components/cita-filtros/cita-filtros.component';
import { CitaFormComponent, CitaFormData } from './components/cita-form/cita-form.component';
import { EstadoBadgeComponent } from './components/estado-badge/estado-badge.component';
import { PagoBadgeComponent } from './components/pago-badge/pago-badge.component';

@Component({
  selector: 'app-citas',
  templateUrl: './citas.page.html',
  styleUrls: ['./citas.page.scss'],
  standalone: true,
  imports: [
    IonicModule, CommonModule, FormsModule,
    CitaCardComponent, CitaFiltrosComponent, CitaFormComponent,
    EstadoBadgeComponent, PagoBadgeComponent,
  ],
})
export class CitasPage implements OnInit {
  citasFiltradas: CitaDto[] = [];
  showFormModal = false;
  citaEditando: CitaDto | null = null;

  constructor(private router: Router, private svc: CitasMockService) {}

  ngOnInit() {
    this.aplicarFiltros({ busqueda: '', estado: 'todos', estado_pago: 'todos', fecha_desde: '', fecha_hasta: '' });
  }

  get totalCitas(): number { return this.svc.getCitas().length; }

  aplicarFiltros(f: FiltroCitas) {
    let r = this.svc.getCitas();
    if (f.busqueda.trim()) {
      const q = f.busqueda.toLowerCase();
      r = r.filter(c =>
        c.nombre_paciente.toLowerCase().includes(q) ||
        c.apellido_paciente.toLowerCase().includes(q) ||
        c.motivo.toLowerCase().includes(q)
      );
    }
    if (f.estado !== 'todos') r = r.filter(c => c.estado === f.estado);
    if (f.estado_pago !== 'todos') r = r.filter(c => c.estado_pago === f.estado_pago);
    if (f.fecha_desde) r = r.filter(c => c.fecha >= f.fecha_desde);
    if (f.fecha_hasta) r = r.filter(c => c.fecha <= f.fecha_hasta);
    this.citasFiltradas = r;
  }

  verDetalle(cita: CitaDto) {
    this.router.navigate(['/dashboard/citas', cita.id_cita]);
  }

  abrirCrear() {
    this.citaEditando = null;
    this.showFormModal = true;
  }

  abrirEditar(cita: CitaDto) {
    this.citaEditando = cita;
    this.showFormModal = true;
  }

  onGuardado(data: CitaFormData) {
    if (this.citaEditando) {
      this.svc.updateCita({ ...this.citaEditando, ...data });
    } else {
      this.svc.createCita({ ...data, tiene_sesion: false });
    }
    this.showFormModal = false;
    this.aplicarFiltros({ busqueda: '', estado: 'todos', estado_pago: 'todos', fecha_desde: '', fecha_hasta: '' });
  }

  formatFecha(iso: string): string {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  formatMonto(n: number): string {
    return `€${n.toFixed(2)}`;
  }
}
