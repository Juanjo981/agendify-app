import { Injectable } from '@angular/core';
import { RolUsuario } from '../shared/models/rol.model';
import { PERMISOS_DEFAULT_RECEPCIONISTA } from '../shared/models/permisos.model';
import { UsuarioMock } from '../shared/models/usuario.model';

// ─── Helper: generador de códigos de vinculación ───────────────────────────────
// Formato: AGD-XXXXXX  (6 caracteres alfanuméricos, sin letras ambiguas O/I/0/1)
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generarCodigoVinculacion(): string {
  const segmento = Array.from(
    { length: 6 },
    () => CHARS[Math.floor(Math.random() * CHARS.length)]
  ).join('');
  return `AGD-${segmento}`;
}

// ─── Mock data ─────────────────────────────────────────────────────────────────

const PROFESIONALES_MOCK: UsuarioMock[] = [
  {
    id: 1,
    nombre: 'Juan José',
    apellido: 'García',
    email: 'juan@agendify.com',
    usuario: 'juangarcia',
    fecha_nacimiento: '1985-04-12',
    domicilio: 'Calle Mayor 10, Madrid',
    numero_telefono: '612345678',
    activo: true,
    idRol: RolUsuario.PROFESIONAL,
    especialidad: 'Psicología',
    codigoVinculacion: 'AGD-4F7K2Q',
  },
];

const RECEPCIONISTAS_MOCK: UsuarioMock[] = [
  {
    id: 2,
    nombre: 'Laura',
    apellido: 'Martínez',
    email: 'laura@agendify.com',
    usuario: 'lauramartinez',
    fecha_nacimiento: '1995-08-20',
    domicilio: 'Avenida del Sol 5, Madrid',
    numero_telefono: '698765432',
    activo: true,
    idRol: RolUsuario.RECEPCIONISTA,
    profesionalId: 1,
    permisos: { ...PERMISOS_DEFAULT_RECEPCIONISTA },
  },
];

// ─── Servicio mock ─────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class VinculacionMockService {

  /** Devuelve todos los profesionales mock */
  getProfesionales(): UsuarioMock[] {
    return PROFESIONALES_MOCK;
  }

  /** Busca un profesional por su id */
  getProfesionalById(id: number): UsuarioMock | undefined {
    return PROFESIONALES_MOCK.find(p => p.id === id);
  }

  /**
   * Valida si un código de vinculación existe en el sistema.
   * Normaliza a mayúsculas antes de comparar.
   */
  validarCodigoVinculacion(codigo: string): boolean {
    const normalizado = codigo.trim().toUpperCase();
    return PROFESIONALES_MOCK.some(p => p.codigoVinculacion === normalizado);
  }

  /**
   * Devuelve el profesional asociado a un código de vinculación,
   * o undefined si el código no existe.
   */
  getProfesionalPorCodigo(codigo: string): UsuarioMock | undefined {
    const normalizado = codigo.trim().toUpperCase();
    return PROFESIONALES_MOCK.find(p => p.codigoVinculacion === normalizado);
  }

  /** Devuelve todos los recepcionistas mock */
  getRecepcionistas(): UsuarioMock[] {
    return RECEPCIONISTAS_MOCK;
  }

  /**
   * Genera un código de vinculación único (mock).
   * En producción esto lo generará el backend.
   */
  generarCodigo(): string {
    return generarCodigoVinculacion();
  }
}
