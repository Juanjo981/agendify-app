import { BehaviorSubject, Observable } from 'rxjs';
import { filter, map, shareReplay } from 'rxjs/operators';

export type DashboardRefreshReason = 'enter' | 'request';

export interface DashboardRefreshEvent<Section extends string> {
  activeSection: Section | null;
  reason: DashboardRefreshReason;
  targets: ReadonlyArray<Section | 'all'>;
  sequence: number;
}

/**
 * Base reusable para refresco contextual en vistas del dashboard con subnavegación.
 *
 * Cómo funciona:
 * - `enterSection(section)` se llama cuando el usuario entra a una pestaña/submódulo.
 * - `requestRefresh(section|all)` se llama después de CRUD o cambios que invalidan datos.
 * - Los componentes se suscriben con `watchSection(section)` y reaccionan solo a su contexto.
 *
 * Uso recomendado:
 * 1. El shell o página contenedora llama `enterSection()` en cada navegación interna.
 * 2. El submódulo escucha `watchSection()` y vuelve a cargar sus datos.
 * 3. Tras crear/editar/eliminar, disparar `requestRefresh()` para el contexto afectado.
 */
export abstract class DashboardSectionRefreshContext<Section extends string> {
  private readonly stateSubject = new BehaviorSubject<DashboardRefreshEvent<Section>>({
    activeSection: null,
    reason: 'enter',
    targets: [],
    sequence: 0,
  });

  readonly events$: Observable<DashboardRefreshEvent<Section>> = this.stateSubject.asObservable().pipe(
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly activeSection$: Observable<Section | null> = this.events$.pipe(
    map(event => event.activeSection),
  );

  get activeSection(): Section | null {
    return this.stateSubject.value.activeSection;
  }

  enterSection(section: Section): void {
    this.emit('enter', [section], section);
  }

  requestRefresh(targets: Section | ReadonlyArray<Section> | 'all' = 'all'): void {
    const normalizedTargets = targets === 'all' ? ['all'] : Array.isArray(targets) ? [...targets] : [targets];
    this.emit('request', normalizedTargets, this.activeSection);
  }

  watchSection(section: Section): Observable<DashboardRefreshEvent<Section>> {
    return this.events$.pipe(
      filter(event => event.sequence > 0),
      filter(event => event.targets.includes('all') || event.targets.includes(section)),
    );
  }

  private emit(
    reason: DashboardRefreshReason,
    targets: ReadonlyArray<Section | 'all'>,
    activeSection: Section | null,
  ): void {
    const previous = this.stateSubject.value;
    this.stateSubject.next({
      activeSection,
      reason,
      targets,
      sequence: previous.sequence + 1,
    });
  }
}
