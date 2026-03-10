import { Directive, Input, OnInit, TemplateRef, ViewContainerRef } from '@angular/core';
import { AuthorizationService } from './authorization.service';
import { Modulo } from './permission.types';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  HasPermissionDirective  (*appHasPermission)
 * ─────────────────────────────────────────────────────────────────────────────
 *  Structural directive that renders its host element only when the current
 *  user has access to the specified module.
 *
 *  Benefit: removes repetitive `*ngIf="authSvc.canAccessModule('x')"` inline
 *  expressions from templates, making the intent declarative and auditable.
 *
 *  Usage:
 *    <!-- Renders only if the user can access "citas" -->
 *    <ion-item *appHasPermission="'citas'">Citas</ion-item>
 *
 *    <!-- Using the enum (import Modulo in the component) -->
 *    <ion-item *appHasPermission="Modulo.CONFIGURACION">Configuración</ion-item>
 *
 *  Import into a standalone component:
 *    imports: [ HasPermissionDirective ]
 *
 *  Import into an NgModule:
 *    declarations: [ HasPermissionDirective ]   (also add to exports if shared)
 *
 *  REAL PHASE:
 *    AuthorizationService is the only dependency — swap it for the real
 *    auth service and the directive continues to work unchanged.
 * ─────────────────────────────────────────────────────────────────────────────
 */
@Directive({
  selector: '[appHasPermission]',
  standalone: true,
})
export class HasPermissionDirective implements OnInit {

  private _modulo: Modulo | string = '';

  /** The module identifier to check. Accepts a Modulo enum or a plain string. */
  @Input() set appHasPermission(modulo: Modulo | string) {
    this._modulo = modulo;
  }

  constructor(
    private templateRef: TemplateRef<any>,
    private vcRef: ViewContainerRef,
    private authSvc: AuthorizationService,
  ) {}

  ngOnInit(): void {
    if (this.authSvc.canAccessModule(this._modulo)) {
      this.vcRef.createEmbeddedView(this.templateRef);
    } else {
      this.vcRef.clear();
    }
  }
}
