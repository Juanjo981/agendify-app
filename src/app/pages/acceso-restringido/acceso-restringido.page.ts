import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { SessionMockService } from 'src/app/services/session.mock';

@Component({
  selector: 'app-acceso-restringido',
  standalone: true,
  imports: [IonicModule, CommonModule],
  templateUrl: './acceso-restringido.page.html',
  styleUrls:   ['./acceso-restringido.page.scss'],
})
export class AccesoRestringidoPage implements OnInit {
  /** Nombre del módulo que el usuario intentó acceder */
  moduloOrigen = 'este módulo';

  constructor(
    private route:   ActivatedRoute,
    private router:  Router,
    public  session: SessionMockService,
  ) {}

  ngOnInit(): void {
    this.moduloOrigen =
      this.route.snapshot.queryParamMap.get('origen') ?? 'este módulo';
  }

  volverAAgenda(): void {
    this.router.navigate(['/dashboard/agenda']);
  }
}
