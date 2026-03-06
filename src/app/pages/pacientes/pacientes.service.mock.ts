import { Injectable } from '@angular/core';
import { PacienteDto, NotaDto, PACIENTES_MOCK_DATA } from './pacientes.mock';

@Injectable({ providedIn: 'root' })
export class PacientesMockService {
  private pacientes: PacienteDto[] = JSON.parse(JSON.stringify(PACIENTES_MOCK_DATA));

  getAll(): PacienteDto[] {
    return this.pacientes;
  }

  getById(id: number): PacienteDto | undefined {
    return this.pacientes.find(p => p.id_paciente === id);
  }

  create(p: PacienteDto): void {
    this.pacientes.unshift(p);
  }

  update(updated: PacienteDto): void {
    const idx = this.pacientes.findIndex(p => p.id_paciente === updated.id_paciente);
    if (idx !== -1) this.pacientes[idx] = updated;
  }

  delete(id: number): void {
    this.pacientes = this.pacientes.filter(p => p.id_paciente !== id);
  }

  addNota(pacienteId: number, nota: NotaDto): void {
    const p = this.getById(pacienteId);
    if (p) p.notas.unshift(nota);
  }

  updateNota(pacienteId: number, nota: NotaDto): void {
    const p = this.getById(pacienteId);
    if (!p) return;
    const idx = p.notas.findIndex(n => n.id_nota === nota.id_nota);
    if (idx !== -1) p.notas[idx] = nota;
  }

  deleteNota(pacienteId: number, notaId: number): void {
    const p = this.getById(pacienteId);
    if (p) p.notas = p.notas.filter(n => n.id_nota !== notaId);
  }
}
