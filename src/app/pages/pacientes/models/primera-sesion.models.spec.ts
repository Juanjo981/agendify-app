import {
  PRIMERA_SESION_CAMPOS,
  PRIMERA_SESION_TOTAL,
  contarCompletadosForm,
  normalizeNivelInicial,
  toChecklistRequest,
} from './primera-sesion.models';

describe('primera-sesion.models', () => {
  it('centraliza total en 10 campos', () => {
    expect(PRIMERA_SESION_CAMPOS.length).toBe(10);
    expect(PRIMERA_SESION_TOTAL).toBe(10);
  });

  it('cuenta completados sin fallbacks', () => {
    expect(
      contarCompletadosForm({
        consentimiento_informado: true,
        motivo_consulta: false,
        antecedentes: true,
      }),
    ).toBe(2);
    expect(contarCompletadosForm({})).toBe(0);
  });

  it('normaliza nivel a BAJO|MEDIO|ALTO', () => {
    expect(normalizeNivelInicial('medio')).toBe('MEDIO');
    expect(normalizeNivelInicial('ALTO')).toBe('ALTO');
    expect(normalizeNivelInicial('x')).toBe('BAJO');
  });

  it('arma request PUT sin labels UI', () => {
    const req = toChecklistRequest({
      consentimiento_informado: true,
      motivo_consulta: false,
      antecedentes: false,
      red_apoyo: false,
      riesgo_suicida: true,
      consumo_sustancias: false,
      violencia: true,
      enfermedades: false,
      medicacion_actual: false,
      firma_digital: false,
      nivel_inicial: 'ALTO',
    });
    expect(req.nivel_inicial).toBe('ALTO');
    expect(req.consentimiento_informado).toBeTrue();
    expect(JSON.stringify(req)).not.toContain('Bajo');
    expect(JSON.stringify(req)).not.toContain('Consentimiento');
  });
});
