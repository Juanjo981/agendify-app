import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { EstadisticasSubmenuComponent } from './components/estadisticas-submenu/estadisticas-submenu.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EstadisticasRefreshService, EstadisticasSectionId } from '../../shared/refresh/dashboard-module-refresh.services';

@Component({
  selector: 'app-estadisticas',
  templateUrl: './estadisticas.page.html',
  styleUrls: ['./estadisticas.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterOutlet, EstadisticasSubmenuComponent],
})
export class EstadisticasPage implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private router: Router,
    private refresh: EstadisticasRefreshService,
  ) {}

  ngOnInit(): void {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        const section = this.resolveActiveSection(this.router.url);
        if (section) {
          this.refresh.enterSection(section);
        }
      });

    const initialSection = this.resolveActiveSection(this.router.url);
    if (initialSection) {
      this.refresh.enterSection(initialSection);
    }
  }

  private resolveActiveSection(url: string): EstadisticasSectionId | null {
    const match = url.match(/\/dashboard\/estadisticas\/([^/?#]+)/i);
    const section = match?.[1] as EstadisticasSectionId | undefined;
    const validSections: EstadisticasSectionId[] = ['dashboard', 'citas', 'ingresos', 'pacientes', 'reportes'];
    return section && validSections.includes(section) ? section : 'dashboard';
  }
}
