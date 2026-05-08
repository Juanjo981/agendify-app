import { Injectable } from '@angular/core';
import { ToastController } from '@ionic/angular';

export type InAppNotifyColor = 'success' | 'warning' | 'danger' | 'medium' | 'primary';

export interface InAppNotifyOptions {
  /** Duración en ms (por defecto 2200). */
  duration?: number;
  /** Posición del toast. */
  position?: 'top' | 'middle' | 'bottom';
  /** Si se indica, no mostrar de nuevo hasta que pase `throttleMs` desde la última vez con la misma clave. */
  throttleKey?: string;
  throttleMs?: number;
  color?: InAppNotifyColor;
}

/**
 * Notificaciones in-app discretas (Ionic Toast) con throttle en memoria y “una vez por sesión”.
 *
 * Convención Agendify (no duplicar con otros patrones):
 * - **Agenda:** mantener `successMessage` / `errorMessage` en banner; no añadir toasts paralelos para los mismos eventos.
 * - **Detalle cita / Home / otras pantallas sin banner:** usar este servicio para confirmaciones breves de éxito o avisos info.
 * - Errores de API: seguir usando mensajes inline + `mapApiError`; usar toast aquí solo si ya es patrón de la pantalla.
 */
@Injectable({ providedIn: 'root' })
export class InAppNotifyService {
  private readonly throttleUntil = new Map<string, number>();

  constructor(private readonly toastCtrl: ToastController) {}

  private static sessionStorageKey(segment: string): string {
    return `agf:inapp:${segment}`;
  }

  /** Ejecuta el callback solo si la clave no se usó en esta sesión de navegador. */
  runOncePerSession(sessionSegment: string, fn: () => void | Promise<void>): void {
    if (typeof sessionStorage === 'undefined') {
      void Promise.resolve(fn());
      return;
    }
    const key = InAppNotifyService.sessionStorageKey(sessionSegment);
    if (sessionStorage.getItem(key)) {
      return;
    }
    sessionStorage.setItem(key, '1');
    void Promise.resolve(fn());
  }

  /** Devuelve true si puede mostrar (y registra ventana de throttle); false si aún en cooldown. */
  tryThrottle(key: string, cooldownMs: number): boolean {
    const now = Date.now();
    const until = this.throttleUntil.get(key) ?? 0;
    if (now < until) {
      return false;
    }
    this.throttleUntil.set(key, now + cooldownMs);
    return true;
  }

  async success(message: string, opts: InAppNotifyOptions = {}): Promise<void> {
    await this.present(message, { ...opts, color: opts.color ?? 'success' });
  }

  async info(message: string, opts: InAppNotifyOptions = {}): Promise<void> {
    await this.present(message, { ...opts, color: opts.color ?? 'primary' });
  }

  async warning(message: string, opts: InAppNotifyOptions = {}): Promise<void> {
    await this.present(message, { ...opts, color: opts.color ?? 'warning' });
  }

  private async present(message: string, opts: InAppNotifyOptions): Promise<void> {
    if (opts.throttleKey != null && opts.throttleMs != null && opts.throttleMs > 0) {
      if (!this.tryThrottle(opts.throttleKey, opts.throttleMs)) {
        return;
      }
    }

    const toast = await this.toastCtrl.create({
      message,
      duration: opts.duration ?? 2200,
      position: opts.position ?? 'top',
      color: opts.color,
      cssClass: 'agf-inapp-toast',
    });
    await toast.present();
  }
}
