import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SessionService } from '../services/session.service';
import { RolUsuario } from '../shared/models/rol.model';
import { HasPermissionDirective } from './has-permission.directive';

@Component({
  template: `<span *appHasPermission="'pacientes'">Pacientes</span>`,
  standalone: false,
})
class PermissionHostComponent {}

describe('HasPermissionDirective', () => {
  let fixture: ComponentFixture<PermissionHostComponent>;
  let session: SessionService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PermissionHostComponent],
      imports: [HasPermissionDirective],
    }).compileComponents();

    session = TestBed.inject(SessionService);
    fixture = TestBed.createComponent(PermissionHostComponent);
    fixture.detectChanges();
  });

  it('updates the visible menu item when session permissions change', () => {
    expect(fixture.nativeElement.querySelector('span')).toBeNull();

    session.setUser({
      id_usuario: 1,
      username: 'recepcionista',
      nombre: 'Ana',
      apellido: 'Ejemplo',
      email: 'ana@example.com',
      id_rol: RolUsuario.RECEPCIONISTA,
      nombre_rol: 'Recepcionista',
      activo: true,
      fecha_nacimiento: '',
      domicilio: '',
      numero_telefono: '',
      profesional: null,
      permisos: { pacientes: true },
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('span')?.textContent).toContain('Pacientes');

    session.clearSession();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('span')).toBeNull();
  });
});
