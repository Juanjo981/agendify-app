# INTEGRATION_CONFIG_PERFIL_VINCULACION

Fecha: 2026-04-08

## Archivos tocados

- `src/app/services/configuracion-api.service.ts`
- `src/app/services/perfil-api.service.ts`
- `src/app/services/equipo-api.service.ts`
- `src/app/shared/models/configuracion.models.ts`
- `src/app/shared/models/equipo.model.ts`
- `src/app/pages/configuracion/configuracion.page.integrated.ts`
- `src/app/pages/perfil/perfil.page.integrated.ts`

## Endpoints consumidos

### Configuracion

- `GET /api/configuracion/agenda`
- `PUT /api/configuracion/agenda`
- `GET /api/configuracion-sistema`
- `POST /api/configuracion-sistema`
- `PUT /api/configuracion-sistema/{id}`
- `GET /api/configuracion-recordatorios`
- `POST /api/configuracion-recordatorios`
- `PUT /api/configuracion-recordatorios/{id}`
- `PATCH /api/configuracion-recordatorios/{id}/activo`

### Perfil

- `GET /api/usuarios/me`
- `PUT /api/usuarios/me`
- `PUT /api/usuarios/me/password`
- `GET /api/profesionales/me`
- `PUT /api/profesionales/me/perfil`

### Vinculacion / Equipo

- `GET /api/codigos-vinculacion/me`
- `POST /api/codigos-vinculacion/regenerar`
- `GET /api/recepcionistas`
- `GET /api/recepcionistas/{id}`
- `GET /api/recepcionistas/{id}/permisos`
- `PUT /api/recepcionistas/{id}/permisos`
- `PATCH /api/recepcionistas/{id}/activo`

## Modelos actualizados

### `ConfiguracionSistemaDto` / `ConfiguracionSistemaRequest`

Se ampliaron para reflejar el DTO de sistema/UI usado por la UI actual:

- `notif_in_app`
- `alertas_sonoras`
- `avisos_citas_proximas`
- `avisos_pacientes_nuevos`
- `avisos_pagos_pendientes`
- `tema`
- `tamano_interfaz`
- `animaciones`
- `idioma`
- `zona_horaria`
- `formato_hora`
- `formato_fecha`
- `moneda`
- `duracion_cita_default_min`
- `politica_cancelacion_horas`
- `permite_confirmacion_publica`
- `ocultar_datos_sensibles`
- `confirmar_eliminar_citas`
- `confirmar_eliminar_pacientes`
- `permitir_cancelacion`
- `permitir_reprogramacion`
- `recordatorio_profesional`
- `notif_paciente_confirma`
- `notif_paciente_cancela`
- `notif_paciente_reprograma`
- `vista_previa_datos`
- `bloquear_cambios_criticos`

### `equipo.model.ts`

Se agregaron DTOs canónicos para eliminar inferencia excesiva:

- `RecepcionistaDto`
- `PermisosRecepcionistaDto`
- `CodigoVinculacionDto`

## Mapeos realizados

### Configuracion

- La persistencia de sistema dejó de usar fallback entre `configuracion/sistema` y `configuracion-sistema`; ahora usa solo `configuracion-sistema`.
- La persistencia de recordatorios dejó de intentar un endpoint unificado con fallback; ahora trabaja directo sobre la colección canónica `configuracion-recordatorios`.
- La página de configuración sigue conservando defaults visuales cuando el backend devuelve `null`.
- Los toggles y selects existentes ahora se proyectan al DTO ampliado de sistema sin cambiar HTML ni SCSS.

### Perfil

- `PerfilApiService` dejó de usar fallbacks `auth/me`, `usuarios/{id}`, `profesionales/{id}` y `usuarios/{id}/password`.
- Se adoptaron rutas canónicas:
  - `usuarios/me`
  - `usuarios/me/password`
  - `profesionales/me`
  - `profesionales/me/perfil`
  - `codigos-vinculacion/me`
  - `codigos-vinculacion/regenerar`
- Se conservaron normalizaciones ligeras de `null` a defaults visuales, pero ya no fallback de contrato/ruta.

### Equipo / Vinculacion

- `EquipoApiService` dejó de usar fallback al naming legacy `/equipo/*`.
- El servicio ahora consume solo `/recepcionistas/*`.
- Los permisos se envían y leen con shape canónico:
  - `agenda`
  - `citas`
  - `pacientes`
  - `notas_clinicas`
  - `configuracion`
- El view model visual (`RecepcionistaEquipoViewModel`) se sigue construyendo para no tocar la UI.

## Riesgos pendientes

- El contrato ampliado de `configuracion-sistema` se tomó de la línea final de producto documentada localmente; conviene validar backend real para todos los campos nuevos en un smoke test de escritura/lectura.
- La UI de configuración sigue mezclando semánticamente sistema + preferencias + notificaciones; ya quedó conectada al DTO ampliado, pero el backend debe confirmar que esa superficie vive en un solo recurso.
- `PerfilPage` conserva cards informativas estáticas (`stats`, `integraciones`) porque son solo presentación y no forman parte de este contrato.
- La acción de regenerar `codigo_vinculacion` sigue disponible a nivel de servicio, pero la UI actual no agrega un nuevo affordance visual para exponerla.
- Falta validación manual de QA sobre configuración/perfil/equipo para confirmar round-trip real de datos y consistencia visual en desktop/mobile.

## Verificacion

- `npx tsc -p tsconfig.app.json --noEmit` OK
