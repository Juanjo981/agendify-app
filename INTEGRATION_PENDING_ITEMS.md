# Pendientes de Integración

> Archivo creado durante Fase 1 — Fundaciones Técnicas (3 de abril de 2026)
> Última actualización: Fase 8 — Configuración, Perfil y Preferencias (6 de abril de 2026)

---

## Backend

### Bloqueantes

_(Sin pendientes bloqueantes de backend detectados en Fase 1)_

### No bloqueantes

| # | Módulo/Fase | Problema detectado | Impacto | Acción recomendada | Severidad | Estado |
|---|-------------|--------------------|---------|--------------------|-----------|--------|
| B1 | Fase 2 / Auth | `LoginRequest` espera `{ username, password }` según API real, pero el front tiene `{ usuario, contrasena }` | N/A — el backend realmente usa `{ usuario, contrasena }` según API Reference §3.1 | Sin acción necesaria | ?? Informativo | ? Resuelto (Fase 2) |
| B2 | Fase 2 / Auth | `ROL_REGISTRO` IDs no coinciden: front usa PRO=1,REC=2,ADM=3 vs backend ADM=1,PRO=2,REC=3 | Registro asignará rol incorrecto | Corregido: ADMIN=1, PRO=2, REC=3 en `auth.models.ts` y `rol.model.ts` | ?? Alta | ? Completado (Fase 2) |

---

## Frontend

### Bloqueantes

_(Sin pendientes bloqueantes de frontend detectados en Fase 1)_

### No bloqueantes

| # | Módulo/Fase | Problema detectado | Impacto | Acción recomendada | Severidad | Estado |
|---|-------------|--------------------|---------|--------------------|-----------|--------|
| F1 | General | `environment.prod.ts` usa `apiUrl` placeholder (`https://api.agendify.com/api`) | No afecta dev, pero bloquea deploy a producción | Configurar URL real antes de deploy | ?? Media | ? Pendiente |
| F2 | General | `UsuarioService` (`services/usuario.ts`) usa ruta incorrecta `/api/usuario/crear` y tipado `any` | Método duplicado con `AuthService.register()` | Deprecado de facto — `AuthService.register()` es el método oficial. No se importa en ningún módulo activo. Eliminar cuando se limpien mocks | ?? Media | ? Pendiente |
| F3 | General | `solicitud-reprogramacion.model.ts` usa camelCase (`idSolicitud`, `pacienteNombre`) en vez de snake_case | Deserialización fallará contra backend real | Corregir en la fase de solicitudes/reprogramación pública (Fase 7/12) | ?? Media | ? Pendiente |
| F4 | General | No existe `BaseApiService` abstracto | Sin impacto inmediato; cada servicio API manejará errores individualmente | Evaluar si vale la pena crearlo cuando se tenga el primer servicio API real (Fase 3) | ?? Baja | ? Pendiente |
| F5 | Fase 3 / Pacientes | File attachments en notas clínicas no implementados | Fase 6 cubrió adjuntos de sesión, pero no adjuntos sobre notas clínicas del módulo Pacientes | Retomar cuando se integre upload sobre `NOTA_CLINICA` | ?? Media | ? Pendiente |
| F6 | Fase 3 / Pacientes | `PacientesMockService` sigue en el proyecto (no se borra) | Sin impacto — ya no se importa/inyecta en ningún componente | Eliminar en limpieza final post-integración | ?? Baja | ? Pendiente |
| F7 | Fase 3 / Pacientes | CSS classes `det-alert-entity`, `det-inline-form`, `det-section-spinner`, `det-load-more`, `det-section-loading` son nuevas | Pueden necesitar estilos en `paciente-detalle.page.scss` | Verificar visualmente y agregar si faltan | ?? Media | ? Pendiente |
| F8 | Fase 4 / Citas | `CitasMockService` seguía inyectado en `AgendaPage` | La agenda mensual dependía de datos mock | Migración completada en Fase 5: `AgendaPage` ya usa `AgendaApiService` + `CitasApiService` | ?? Media | ? Resuelto (Fase 5) |
| F9 | Fase 4 / Citas | Flujo de eliminación de cita no conectado en UI de Citas | No bloquea alcance de Fase 4, pero limita paridad de CRUD completo | Definir UX de eliminación y conectar `DELETE /api/citas/{id}` en fase posterior | ?? Baja | ? Pendiente |
| F10 | General / Build | `ng build` falla por budgets de SCSS globales preexistentes | Impide validar build de producción como criterio final de fase | Mantener validación por build alterno / hardening y resolver budgets en una fase de estabilización | ?? Media | ? Pendiente |
| F11 | Fase 5 / Agenda | La configuración de jornada ya alimenta horas disponibles, pero la vista mensual existente no oculta columnas de sábados/domingos | No bloquea la carga real; afecta solo la paridad visual fina con `configuracion_jornada` | Evaluar ajuste visual no disruptivo del grid en una fase de hardening UX | ?? Baja | ? Pendiente |
| F12 | Fase 6 / Sesiones | `GET /api/sesiones` no expone conteo/resumen de adjuntos por sesión | El listado necesita una consulta ligera adicional por sesión para pintar badge y filtro `con_adjunto` | Si se quiere optimizar el listado, agregar `total_adjuntos` o `primer_adjunto` en `SesionDto`/lista | ?? Baja | ? Pendiente |
| F13 | Fase 7 / Dashboard | El dashboard ya muestra el count real de solicitudes pendientes, pero no hay listado global documentado para gestionarlas desde el header | Se evita simular aprobación/rechazo en el dashboard para no depender de un contrato no documentado | Si backend expone listado global o se decide usar actividad/citas como surface oficial, completar ese flujo en fase posterior | ?? Media | ? Pendiente |
| F14 | Fase 7 / Dashboard | El feed real de notificaciones usa `estado_envio`/`pendiente`, no un concepto persistente de leída en la API documentada | La UI ya no hardcodea “sin leer”, pero tampoco persiste lectura individual desde el dropdown | Completar el marcado persistente en la fase de Actividad/Notificaciones si backend confirma endpoint dedicado | ?? Baja | ? Pendiente |
| F15 | Fase 8 / Configuración-Perfil | Los contratos documentados para Fase 8 son inconsistentes entre blueprint/plan y API reference: `configuracion/sistema` vs `configuracion-sistema`, `profesionales/me/*` vs `profesionales/{id}`/`codigos-vinculacion/*`, `usuarios/me/password` vs `usuarios/{id}/password` | El frontend tuvo que implementar fallback de endpoints para soportar ambos contratos; aumenta complejidad y riesgo de mantenimiento | Unificar documentación y exponer un contrato canónico único para Configuración/Perfil | ?? Alta | ? Pendiente |
| F16 | Fase 8 / Configuración | La UI actual expone campos sin contrato backend confirmado en la documentación vigente: `tema`, `tamano_interfaz`, `animaciones`, flags de privacidad, alertas internas, permisos de cancelación/reprogramación y varios toggles de notificación | Esos controles se preservan visualmente, pero parte de ellos sólo puede mantener defaults locales o persistencia parcial | Confirmar DTO/backend para esos campos o reducir el formulario a campos realmente soportados en una fase posterior | ?? Media | ? Pendiente |
| F17 | Fase 8 / Perfil/Equipo | No existe en la UI actual un control visible para regenerar `codigo_vinculacion` y la regla del proyecto prohíbe cambios visuales en esta fase | El código real sí se carga y se muestra, pero la regeneración no quedó accesible sin introducir un nuevo affordance visual | Definir un trigger UX existente o autorizar una mínima adición visual para exponer `POST /api/profesionales/me/codigo-vinculacion/regenerar` / `POST /api/codigos-vinculacion/regenerar` | ?? Media | ? Pendiente |

