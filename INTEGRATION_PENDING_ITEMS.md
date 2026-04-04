# Pendientes de Integración

> Archivo creado durante Fase 1 — Fundaciones Técnicas (3 de abril de 2026)

---

## Backend

### Bloqueantes

_(Sin pendientes bloqueantes de backend detectados en Fase 1)_

### No bloqueantes

| # | Módulo/Fase | Problema detectado | Impacto | Acción recomendada | Severidad | Estado |
|---|-------------|--------------------|---------|--------------------|-----------|--------|
| B1 | Fase 2 / Auth | `LoginRequest` espera `{ username, password }` según API real, pero el front tiene `{ usuario, contrasena }` | N/A — el backend realmente usa `{ usuario, contrasena }` según API Reference §3.1 | Sin acción necesaria | 🟢 Informativo | ✅ Resuelto (Fase 2) |
| B2 | Fase 2 / Auth | `ROL_REGISTRO` IDs no coinciden: front usa PRO=1,REC=2,ADM=3 vs backend ADM=1,PRO=2,REC=3 | Registro asignará rol incorrecto | Corregido: ADMIN=1, PRO=2, REC=3 en `auth.models.ts` y `rol.model.ts` | 🔴 Alta | ✅ Completado (Fase 2) |

---

## Frontend

### Bloqueantes

_(Sin pendientes bloqueantes de frontend detectados en Fase 1)_

### No bloqueantes

| # | Módulo/Fase | Problema detectado | Impacto | Acción recomendada | Severidad | Estado |
|---|-------------|--------------------|---------|--------------------|-----------|--------|
| F1 | General | `environment.prod.ts` usa `apiUrl` placeholder (`https://api.agendify.com/api`) | No afecta dev, pero bloquea deploy a producción | Configurar URL real antes de deploy | 🟡 Media | ⬜ Pendiente |
| F2 | General | `UsuarioService` (`services/usuario.ts`) usa ruta incorrecta `/api/usuario/crear` y tipado `any` | Método duplicado con `AuthService.register()` | Deprecado de facto — `AuthService.register()` es el método oficial. No se importa en ningún módulo activo. Eliminar cuando se limpien mocks | 🟡 Media | ⬜ Pendiente |
| F3 | General | `solicitud-reprogramacion.model.ts` usa camelCase (`idSolicitud`, `pacienteNombre`) en vez de snake_case | Deserialización fallará contra backend real | Corregir en la fase que integre solicitudes (Fase 4 o posterior) | 🟡 Media | ⬜ Pendiente |
| F4 | General | No existe `BaseApiService` abstracto | Sin impacto inmediato; cada servicio API manejará errores individualmente | Evaluar si vale la pena crearlo cuando se tenga el primer servicio API real (Fase 3) | 🟢 Baja | ⬜ Pendiente |
| F5 | Fase 3 / Pacientes | File attachments en notas clínicas no implementados | UI de adjuntos removida; backend puede soportar files pero frontend no sube aún | Implementar en Fase 6 (Files & Uploads) | 🟡 Media | ⬜ Pendiente (Fase 6) |
| F6 | Fase 3 / Pacientes | `PacientesMockService` sigue en el proyecto (no se borra) | Sin impacto — ya no se importa/inyecta en ningún componente | Eliminar en limpieza final post-integración | 🟢 Baja | ⬜ Pendiente |
| F7 | Fase 3 / Pacientes | CSS classes `det-alert-entity`, `det-inline-form`, `det-section-spinner`, `det-load-more`, `det-section-loading` son nuevas | Pueden necesitar estilos en `paciente-detalle.page.scss` | Verificar visualmente y agregar si faltan | 🟡 Media | ⬜ Pendiente |
