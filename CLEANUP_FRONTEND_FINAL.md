# Cleanup Frontend Final

## Resumen

Limpieza técnica final aplicada sin cambios de diseño ni UX. Se priorizó eliminar código legacy realmente muerto, alinear tipados al contrato canónico ya integrado y verificar que las clases CSS nuevas usadas durante integración sigan teniendo cobertura de estilos.

## Environment

- `src/environments/environment.prod.ts`
  - Verificado: ya apuntaba a la URL productiva final `https://api.agendify.com/api`.
  - No requirió cambio funcional.

## Archivos Eliminados

- `src/app/services/usuario.ts`
  - Servicio legacy sin referencias activas en el frontend actual.
- `src/app/services/usuario.spec.ts`
  - Spec legacy asociado al servicio eliminado.

## Cambios de Tipado

- `src/app/shared/models/solicitud-reprogramacion.model.ts`
  - Modelo alineado a naming canónico en `snake_case`:
    - `id_solicitud`
    - `id_cita`
    - `paciente_nombre`
    - `fecha_cita`
    - `hora_cita`
    - `mensaje_paciente`
    - `fecha_hora_sugerida`
    - `fecha_solicitud`

- `src/app/pages/citas/solicitud-reprogramacion-api.service.ts`
  - Actualizado para mapear y cachear usando el modelo canónico final.
  - Ajustadas búsquedas, cachés y persistencia interna al nuevo naming.

- `src/app/shared/components/solicitud-reprogramacion-modal/solicitud-reprogramacion-modal.component.ts`
- `src/app/shared/components/solicitud-reprogramacion-modal/solicitud-reprogramacion-modal.component.html`
  - Consumo del modelo actualizado a `snake_case` sin cambios visuales.

- `src/app/pages/actividad/actividad.page.integrated.ts`
- `src/app/pages/agenda/agenda.page.ts`
  - Ajustadas referencias a `id_solicitud` e `id_cita`.

- `src/app/pages/sesiones/models/sesion.model.ts`
  - Tipado ampliado para soportar resumen agregado opcional de adjuntos:
    - `total_adjuntos`
    - `tiene_adjuntos`
    - `primer_adjunto`

## Imports y Código Muerto

- Eliminado `UsuarioService` legacy al no tener usos en `src/app`.
- Revisión manual de imports y consumidores en los módulos tocados para dejar consistencia con el tipado actualizado.
- No se realizaron refactors estructurales ni movimientos de módulos.

## CSS Revisado

Se revisaron las superficies y clases CSS nuevas utilizadas en la fase de integración reciente, especialmente:

- Agenda quick actions / acciones de cita
- Modal de solicitud de reprogramación
- Notas clínicas con adjuntos
- Agenda mensual con resumen de jornada

Resultado:

- No se detectaron clases nuevas sin cobertura de estilos en las superficies activas revisadas.
- No fue necesario agregar SCSS adicional para este cleanup final.

## Verificación

- `npx tsc -p tsconfig.app.json --noEmit`
  - OK

## Riesgos Residuales

- El resumen agregado de adjuntos por sesión sigue siendo opcional del lado backend; el frontend ya consume `total_adjuntos` / `tiene_adjuntos` / `primer_adjunto` si aparecen, y mantiene fallback compatible cuando no vienen.
