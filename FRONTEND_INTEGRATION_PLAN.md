# Plan Maestro de Integración Frontend ↔ API Real — Agendify

> **Versión:** 2.0 (Post-Auditoría)  
> **Fecha:** 3 de abril de 2026  
> **Stack frontend:** Angular 20 · Ionic 8 · Capacitor 7 · TypeScript 5.9  
> **Stack backend esperado:** Spring Boot 3 · PostgreSQL 16  
> **Autor:** Arquitectura Frontend  
> **Última actualización:** Auditoría técnica contra `FRONTEND_API_REFERENCE.md`

---

## 1. Objetivo General

Migrar progresivamente la aplicación Agendify desde servicios 100% mock hacia una integración completa con la API REST real, sin romper funcionalidades existentes en ningún punto del proceso, y dejando la app lista para producción.

La integración seguirá una estrategia **incremental por módulo**: cada fase produce una versión funcional de la app donde los módulos ya migrados consumen la API real y el resto sigue funcionando con mocks.

---

## 2. Principios de Integración

| # | Principio | Descripción |
|---|-----------|-------------|
| 1 | **El frontend manda** | Si un endpoint no entrega la data que necesita la UI, se solicita un cambio en backend. No se escriben workarounds feos en frontend. |
| 2 | **Migración progresiva** | Un módulo a la vez. Cada fase termina con la app funcional y desplegable. |
| 3 | **Mocks como fallback** | Los mocks no se retiran hasta que el módulo esté 100% integrado y validado. Se usa inyección condicional (`useFactory` o flag de environment) durante la transición. |
| 4 | **Contratos primero** | Antes de consumir un endpoint, se define la interface TypeScript que el backend debe cumplir. |
| 5 | **Un solo modelo por entidad** | Se elimina toda duplicación de interfaces (`CitaDto` duplicado, `SesionPaciente` vs `SesionDto`, etc.) antes de integrar el módulo correspondiente. |
| 6 | **snake_case del backend** | Los DTOs de entrada/salida usan `snake_case` para respetar el contrato del backend. El frontend puede crear alias camelCase vía mappers o mantener snake_case internamente, pero nunca inventar campos. |
| 7 | **Errores primero** | Toda pantalla que consuma la API debe manejar: loading, error, vacío y éxito. No se integra un endpoint sin contemplar sus estados de fallo. |
| 8 | **Ownership implícito** | El backend filtra por `id_profesional` derivado del JWT. El frontend nunca envía `id_profesional` en el body (excepto en registro). |
| 9 | **Paginación estándar** | Toda lista que devuelva `Page<T>` se consume con el mismo componente/utilidad de paginación. |

---

## 3. Estrategia de Migración de Mocks a API Real

### 3.1 Mecanismo de reemplazo

Se usará **inyección condicional por environment** con `useFactory`:

```typescript
// En el módulo o providers del componente standalone
{
  provide: PacientesService,
  useFactory: () => environment.useMocks
    ? inject(PacientesMockService)
    : inject(PacientesApiService)
}
```

Esto permite:
- Desarrollar y testear el servicio real sin retirar el mock
- Volver al mock instantáneamente ante un problema backend
- Retirar el mock definitivamente solo cuando el módulo esté validado

### 3.2 Convención de archivos

| Archivo | Propósito |
|---------|-----------|
| `pacientes.service.ts` | Interfaz abstracta o token de inyección |
| `pacientes.service.api.ts` | Implementación real con HttpClient |
| `pacientes.service.mock.ts` | Implementación mock (ya existente) |

### 3.3 Orden de migración por servicio

```
1. AuthService              ← ya parcialmente integrado
2. SessionService           ← reemplazar SessionMockService
3. PacientesMockService     ← → PacientesApiService
4. CitasMockService         ← → CitasApiService
5. SesionesMockService      ← → SesionesApiService
6. SolicitudReprogramacionService ← → SolicitudesApiService
7. EquipoMockService        ← → EquipoApiService
8. VinculacionMockService   ← → VinculacionApiService (posiblemente fusionado con EquipoApiService)
9. EstadisticasMockService  ← → EstadisticasApiService
10. (Nuevos) ConfiguracionApiService, NotificacionesApiService, DashboardApiService
```

---

## 4. Supuestos y Dependencias

### 4.1 Supuestos

| # | Supuesto | Estado post-auditoría |
|---|----------|-----------------------|
| 1 | El backend expone los endpoints bajo el prefijo `/api/` (no `/api/v1/`). **Excepción:** los endpoints públicos usan `/public/` sin prefijo `/api/`. | ✅ Confirmado |
| 2 | Las respuestas del backend usan `snake_case` para los nombres de campo. Jackson `SNAKE_CASE` global configurado. | ✅ Confirmado |
| 3 | La paginación sigue el contrato `Page<T>` de Spring Boot con campos en **snake_case**: `content`, `total_elements`, `total_pages`, `number`, `size`, `first`, `last`, `empty`, `number_of_elements`, `pageable`. | ✅ Confirmado |
| 4 | Los errores del backend siguen el contrato `ApiErrorResponse` (`timestamp`, `status`, `error`, `code`, `message`, `path`, `details[]`). | ✅ Confirmado |
| 5 | El JWT contiene al menos `id_usuario`, `id_rol` y `username`. El backend resuelve `id_profesional` internamente. | ✅ Confirmado (ownership implícito) |
| 6 | El backend está disponible localmente en `http://localhost:8080` con la base de datos configurada. | Supuesto operativo |
| 7 | `GET /api/auth/me` devuelve un `AuthMeResponseDto` expandido con: usuario completo, profesional{} (o null), permisos{} (o null). | ✅ Confirmado e implementado |
| 8 | **NUEVO:** El login espera `{ username, password }`, NO `{ usuario, contrasena }`. | ✅ Confirmado — requiere fix en frontend |
| 9 | **NUEVO:** Los ROL IDs son: ADMIN=1, PROFESIONAL=2, RECEPCIONISTA=3. | ✅ Confirmado — requiere fix en frontend |
| 10 | **NUEVO:** Los query params de filtros NO usan snake_case uniforme — usan los nombres Java directos (mayoría camelCase, excepciones snake_case). | ✅ Confirmado |

### 4.2 Dependencias externas

| Dependencia | Impacto |
|-------------|---------|
| Backend desplegado y funcional por módulo | Cada fase requiere que los endpoints correspondientes estén implementados |
| Acceso a object storage (S3/GCS/MinIO) | Fase 6 (adjuntos) no puede completarse sin storage |
| SMTP / servicio de SMS | Recuperación de contraseña, recordatorios. No bloquea la integración frontend pero sí el flujo end-to-end |
| Base de datos con datos de prueba | Para validar paginación, filtros y edge cases |

---

## 5. Fases de Implementación

---

### Fase 1 — Fundaciones Técnicas

**Objetivo:** Establecer la infraestructura compartida de integración (configuración de environments, tipado centralizado de respuestas API, utilidades de paginación, manejo global de errores HTTP, y convenciones de servicio) sin modificar ningún flujo funcional ni pantalla.

**Alcance:**
- Configurar `environment.prod.ts` con `apiUrl`
- Agregar flag `useMocks: boolean` a environments
- Crear interface `PageResponse<T>` para paginación estándar de Spring
- Ampliar/refinar `ApiErrorResponse` y `api-error.mapper.ts` si es necesario
- Crear utilidad de query params builder para filtros y paginación
- Documentar la convención de creación de servicios API vs mock
- Verificar que el interceptor existente es compatible con todos los endpoints previstos

**Pantallas afectadas:** Ninguna directamente

**Servicios involucrados:**
- `src/environments/environment.ts` — agregar `useMocks`
- `src/environments/environment.prod.ts` — agregar `apiUrl`, `useMocks: false`
- `src/app/shared/utils/api-error.mapper.ts` — refinar si es necesario
- Nuevo: `src/app/shared/models/page.model.ts`
- Nuevo: `src/app/shared/utils/query-params.utils.ts`
- `src/app/interceptors/auth.interceptor.ts` — revisar lista de URLs públicas

**Endpoints involucrados:** Ninguno directamente

**Modelos involucrados:**
- Nuevo: `PageResponse<T>` — `{ content: T[], total_elements: number, total_pages: number, number: number, size: number, first: boolean, last: boolean }`
- Existente: `ApiErrorResponse` — verificar que cubre todos los códigos de error del blueprint
- Existente: `MappedApiError` — verificar completitud

**Dependencias previas:** Ninguna

**Cambios técnicos:**
1. Agregar `apiUrl: 'https://api.agendify.com/api'` (o placeholder) a `environment.prod.ts`
2. Agregar `useMocks: true` a `environment.ts` y `useMocks: false` a `environment.prod.ts`
3. Crear `PageResponse<T>` interface con campos del `Page<T>` de Spring
4. Crear `buildQueryParams(filters: Record<string, any>): HttpParams` — utilidad que ignora valores nulos/undefined y convierte fechas
5. Verificar que la lista `PUBLIC_URLS` del interceptor incluirá las rutas públicas de confirmación de cita
6. (Opcional) Crear un `BaseApiService` abstracto con métodos genéricos `get<T>()`, `post<T>()`, `getPage<T>()` que encapsulen el manejo de errores y paginación

**Riesgos:**
- Bajar la guardia y empezar a conectar endpoints antes de tener las bases listas
- No contemplar todos los códigos de error que el backend puede devolver
- Paginación de Spring con campos distintos a los esperados

**Criterios de terminado:**
- [x] `environment.prod.ts` tiene `apiUrl` definido
- [x] Ambos environments tienen flag `useMocks`
- [x] Existe `PageResponse<T>` con tipado completo
- [x] Existe `buildQueryParams()` funcional
- [x] `api-error.mapper.ts` cubre los códigos listados en `API_ERROR_CODES`
- [x] El interceptor tiene la lista actualizada de URLs públicas (incluyendo `/public/citas/gestion/*`)
- [x] La aplicación compila sin errores
- [x] Ningún mock ha sido retirado
- [x] Ninguna pantalla ha sido modificada

**Qué NO tocar todavía:**
- No retirar mocks
- No modificar servicios de dominio
- No cambiar componentes ni páginas
- No conectar endpoints reales

**Entregables concretos de la fase:**
1. `environment.ts` y `environment.prod.ts` actualizados
2. `src/app/shared/models/page.model.ts` creado
3. `src/app/shared/utils/query-params.utils.ts` creado
4. `api-error.mapper.ts` revisado y completado si faltaban códigos
5. Interceptor actualizado con URLs públicas completas

**Preparación para la siguiente fase:**
La Fase 2 (Auth) necesita que el environment esté configurado, que el mapeo de errores funcione y que el interceptor maneje correctamente las URLs públicas de auth.

**Nota de cierre — Fase 1 (3 de abril de 2026):**

Fase completada al 100%. Resumen:

- **Qué quedó integrado:**
  - `environment.ts` con `apiUrl` + `useMocks: true`
  - `environment.prod.ts` con `apiUrl` placeholder + `useMocks: false`
  - `PageResponse<T>` en `src/app/shared/models/page.model.ts` (incluye `PageableInfo`, `SortInfo`, `PageRequest`)
  - `buildQueryParams()` en `src/app/shared/utils/query-params.utils.ts`
  - `api-error.mapper.ts` ampliado con `DATA_INTEGRITY_ERROR` (el backend usa este código además de `DATA_INTEGRITY`)
  - Interceptor actualizado con exclusiones públicas: `/public/*`, `/api/auth/reset-password`, URLs externas (signed URLs de storage)

- **Qué mocks dejaron de inyectarse:** Ninguno (no estaba en alcance)

- **Qué quedó pendiente para fases posteriores:**
  - `LoginRequest` todavía usa `usuario/contrasena` en vez de `username/password` → se corrige en Fase 2
  - `ROL_REGISTRO` IDs incorrectos (Front: PRO=1,REC=2,ADM=3 vs Backend: ADM=1,PRO=2,REC=3) → se corrige en Fase 2
  - `apiUrl` de producción es placeholder, debe configurarse con URL real antes de deploy
  - No se creó `BaseApiService` abstracto (era opcional; los servicios API de cada módulo lo evaluarán según necesidad)

- **Qué desbloquea para la siguiente fase:** Todo lo necesario para Fase 2 (Auth): environments con `apiUrl` y `useMocks`, interceptor con exclusiones públicas completas, error mapper con todos los códigos conocidos, utilidades de paginación y query params listas para uso en Fases 3+.

---

### Fase 2 — Autenticación, Registro y Gestión de Sesión

**Objetivo:** Completar la integración del flujo de autenticación con la API real: login, refresh token con rotación, logout, obtención del usuario autenticado (`/auth/me`), registro de usuario, session bootstrap al iniciar la app, y reemplazo de `SessionMockService` con datos reales.

**Alcance:**
- Verificar/ajustar `AuthService.login()` con la API real
- Implementar session bootstrap en `AppComponent` o guard: al cargar la app, si hay token guardado, llamar a `/auth/me` para restaurar la sesión
- Ampliar la respuesta de `/auth/me` para incluir datos completos del usuario (rol, permisos, datos del profesional/recepcionista)
- Reemplazar `SessionMockService` con un `SessionService` real que derive del `/auth/me` response
- Integrar `AuthorizationService` con permisos reales del backend
- Conectar formulario de registro con validación real de código beta y código de vinculación
- Conectar `forgot-password` modal
- Verificar flujo completo de 401 → refresh → retry con el backend real
- Verificar que el logout invalida el refresh token en backend

**Pantallas afectadas:**
- `login.page.ts` — verificar manejo de errores reales, mensajes de validación
- `registro.page.ts` — conectar con `/api/usuarios/registro`, eliminar validación local de código beta
- `dashboard.page.ts` — session bootstrap, datos del usuario autenticado
- `app.component.ts` — inicialización de sesión al arrancar

**Servicios involucrados:**
- `services/auth.ts` — refinar `login()`, `getCurrentUser()`, `logout()`
- `services/session.service.mock.ts` → evolucionar a `services/session.service.ts` (datos reales de `/auth/me`)
- `auth/authorization.service.ts` — adaptar para consumir permisos reales en lugar de mock
- `services/usuario.ts` — verificar endpoint de registro (`/api/usuarios/registro` vs `/api/usuario/crear`)
- `interceptors/auth.interceptor.ts` — validar flujo de refresh real
- `guards/auth.guard.ts` — ajustar si es necesario para session bootstrap

**Endpoints involucrados:**
| Método | Ruta | Estado actual |
|--------|------|---------------|
| `POST` | `/api/auth/login` | Ya conectado, verificar contrato |
| `POST` | `/api/auth/refresh` | Ya conectado, verificar rotación real |
| `POST` | `/api/auth/logout` | Ya conectado, verificar invalidación |
| `GET` | `/api/auth/me` | Ya conectado, respuesta insuficiente (ver BACKEND_CHANGES) |
| `POST` | `/api/auth/forgot-password` | Por conectar |
| `POST` | `/api/auth/reset-password` | Por conectar |
| `POST` | `/api/usuarios/registro` | Verificar ruta exacta |
| `GET` | `/api/usuarios/me/permisos` | Por conectar (o incluir en `/auth/me`) |
| `POST` | `/api/vinculacion/validar-codigo-beta` | Por conectar (eliminar validación local) |
| `GET` | `/api/vinculacion/profesional/{codigo}` | Por conectar |

**Modelos involucrados:**
- `LoginRequest`, `LoginResponse`, `Usuario` — verificar contra contrato real
- `RefreshTokenRequest`, `RefreshTokenResponse` — verificar
- `RegisterRequest`, `RegisterResponse` — verificar
- `ApiErrorResponse` — ya definido
- Nuevo o ampliado: `UsuarioCompleto` — respuesta expandida de `/auth/me` con rol, permisos y datos de perfil profesional/recepcionista
- `PermisosRecepcionista` — debe venir del backend, no estar hardcodeado

**Dependencias previas:** Fase 1

**Cambios técnicos:**
1. Verificar que `LoginResponse` coincide con la respuesta real del backend
2. Ampliar `interface Usuario` (o crear `UsuarioCompleto`) para incluir: `id_rol`, `nombre`, `apellido`, `email`, permisos, y datos extendidos (profesional o recepcionista)
3. Crear `SessionService` (real) que almacene los datos de `/auth/me` en memoria y exponga: `getCurrentUser()`, `getRol()`, `esProfesional()`, `esRecepcionista()`, `getPermisos()`
4. Implementar session bootstrap: en `APP_INITIALIZER` o en el `authGuard`, si hay token en localStorage → `GET /auth/me` → poblar `SessionService`. Si falla → logout silencioso
5. Adaptar `AuthorizationService` para consumir `SessionService` real
6. Eliminar `BETA_INVITE_CODES` hardcodeado de `registro.page.ts` — validar contra el backend
7. Conectar modal `forgot-password` con endpoint real
8. Verificar compatibilidad de `ROL_REGISTRO` (1=Profesional, 2=Recepcionista) con lo que espera el backend
9. Verificar que el endpoint de registro coincide: actual `POST /api/usuario/crear` vs blueprint `POST /api/usuarios/registro`

**Riesgos:**
- La respuesta de `/auth/me` podría no incluir permisos de recepcionista, obligando a una segunda llamada
- El endpoint de registro podría tener naming diferente al actual del frontend
- `ROL_REGISTRO` IDs podrían no coincidir con los del backend
- El session bootstrap podría causar un flash de pantalla de login antes de redirigir al dashboard

**Criterios de terminado:**
- [x] Login funciona contra la API real con mensajes de error correctos
- [x] Registro de Profesional funciona contra la API real con código beta validado en backend
- [x] Registro de Recepcionista funciona con código de vinculación validado en backend
- [x] Session bootstrap: al recargar la app con token válido, se restaura la sesión sin pedir login
- [x] `SessionMockService` ya no se usa en ninguna pantalla
- [x] `AuthorizationService` usa permisos reales del backend
- [x] Logout invalida el token en backend y limpia localStorage
- [x] Un 401 con refresh exitoso reintenta la request original
- [x] Un 401 con refresh fallido redirige a login con toast
- [x] Guards funcionan correctamente con datos reales

**Qué NO tocar todavía:**
- No migrar servicios de dominio (pacientes, citas, sesiones, etc.)
- No modificar lógica de pantallas más allá de lo necesario para auth
- No implementar cambio de contraseña (solo forgot-password)
- No tocar la vista de dashboard más allá del session bootstrap

**Entregables concretos de la fase:**
1. `SessionService` real creado y funcionando
2. `SessionMockService` obsoleto (puede permanecer pero no se inyecta)
3. `AuthorizationService` adaptado a permisos reales
4. Login, registro, logout y session bootstrap integrados
5. Validación de código beta movida al backend
6. Modal forgot-password conectado

**Preparación para la siguiente fase:**
Con auth y sesión reales, todas las pantallas protegidas pueden hacer peticiones autenticadas al backend. La Fase 3 comenzará a reemplazar servicios mock de dominio.

> **✅ Fase 2 cerrada — 4 de abril de 2026**
>
> Cambios realizados:
> - `SessionService` real creado (`src/app/services/session.service.ts`) con mapeo de permisos backend → frontend
> - `AuthMeResponse`, `LoginUsuario`, `ProfesionalInfo` interfaces creadas en `auth.models.ts`
> - `RolUsuario` enum y `ROL_REGISTRO` constantes corregidos a ADMIN=1, PRO=2, REC=3
> - `AuthService` refactorizado: inyecta `SessionService`, `login()` async, `restoreSession()` carga desde localStorage y valida con `/auth/me`
> - `AuthorizationService` migrado de `SessionMockService` a `SessionService`
> - Login y registro adaptados al nuevo flujo
> - `SessionMockService` ya no se importa en ningún archivo activo
> - Build verificado sin errores

---

### Fase 3 — Pacientes (CRUD Completo y Sub-recursos)

**Objetivo:** Integrar el módulo de Pacientes con la API real: listado paginado con búsqueda y filtros, detalle, creación, edición, activación/desactivación, alertas y sub-recursos del paciente (notas clínicas, historial).

**Alcance:**
- Crear `PacientesApiService` consumiendo endpoints reales
- Migrar `PacientesPage` para usar listado paginado con búsqueda, filtro y orden
- Migrar `PacienteDetallePage` para obtener detalle, sub-recursos (citas, sesiones, notas, historial, alertas) desde la API
- CRUD de alertas del paciente
- CRUD de notas clínicas del paciente (crear, editar, eliminar)
- Historial de eventos del paciente (solo lectura)
- Mantener la UX actual (loadings, empty states, toasts de éxito/error)

**Pantallas afectadas:**
- `pacientes.page.ts` — listado, modal de crear/editar, filtros, activación/desactivación
- `paciente-detalle.page.ts` — info general, tabs de citas/sesiones/notas/historial, alertas

**Servicios involucrados:**
- `pages/pacientes/pacientes.service.mock.ts` — servicio actual a reemplazar
- Nuevo: `pages/pacientes/pacientes.service.api.ts` — implementación real
- Nuevo o refactored: `pages/pacientes/pacientes.service.ts` — token/interfaz abstracta
- `pages/pacientes/pacientes.mock.ts` — datos mock, se conserva temporalmente

**Endpoints involucrados:**
| Método | Ruta | Propósito |
|--------|------|-----------|
| `GET` | `/api/pacientes` | Lista paginada. Params: `busqueda`, `activo`, `orden`, `page`, `size` |
| `POST` | `/api/pacientes` | Crear paciente |
| `GET` | `/api/pacientes/{id}` | Detalle completo |
| `PUT` | `/api/pacientes/{id}` | Actualizar paciente |
| `DELETE` | `/api/pacientes/{id}` | Baja lógica (activo=false) |
| `GET` | `/api/pacientes/{id}/citas` | Historial de citas (resumen) |
| `GET` | `/api/pacientes/{id}/sesiones` | Sesiones del paciente |
| `GET` | `/api/pacientes/{id}/notas` | Notas clínicas |
| `POST` | `/api/pacientes/{id}/notas` | Crear nota |
| `PUT` | `/api/pacientes/{id}/notas/{notaId}` | Editar nota |
| `DELETE` | `/api/pacientes/{id}/notas/{notaId}` | Eliminar nota |
| `GET` | `/api/pacientes/{id}/historial` | Historial de eventos |
| `GET` | `/api/pacientes/{id}/alertas` | Alertas del paciente |
| `POST` | `/api/pacientes/{id}/alertas` | Crear alerta |
| `DELETE` | `/api/pacientes/{id}/alertas/{alertaId}` | Eliminar alerta |

**Modelos involucrados:**
- `PacienteDto` — verificar contra respuesta real del backend
- `NotaDto` — verificar campos
- `CitaResumenDto` — verificar que corresponde al contrato de `/pacientes/{id}/citas`
- `SesionPaciente` — verificar contra `/pacientes/{id}/sesiones`
- `HistorialEvento` — verificar campos
- `AdjuntoMeta` — verificar (adjuntos de notas se posponen a Fase 6)
- `PageResponse<PacienteDto>` — para el listado paginado

**Dependencias previas:** Fase 2 (auth funcional para peticiones autenticadas)

**Cambios técnicos:**
1. Crear `PacientesApiService` con HttpClient consumiendo todos los endpoints
2. Implementar paginación en `PacientesPage` usando `PageResponse<PacienteDto>` (scroll infinito o botón "cargar más")
3. Adaptar filtros de búsqueda a query params del backend
4. Implementar loading states en listado y detalle
5. Implementar empty states ("No hay pacientes" / "No hay notas" / etc.)
6. Implementar toasts de éxito/error para operaciones CRUD
7. Conectar tabs de paciente-detalle con endpoints de sub-recursos (lazy loading por tab)
8. Adaptar alertas de `string[]` mock a CRUD real con IDs
9. Asegurar manejo de error 404 cuando un paciente no existe (redirigir a listado)
10. El campo `activo` de la baja lógica se conecta vía `DELETE /pacientes/{id}` (que internamente hace set `activo=false`)

**Riesgos:**
- El backend podría devolver `PacienteDto` sin el array `citas[]` embebido (necesita llamada separada a `/pacientes/{id}/citas`)
- Los sub-recursos (notas, sesiones, historial) podrían necesitar ser paginados si hay muchos datos
- El formato de `alertas` podría diferir (actualmente `string[]`, backend será entidad con `id` + `descripcion`)
- La exportación PDF del detalle de paciente depende de datos locales; si se hace lazy loading de tabs, hay que asegurar que los datos estén cargados antes de exportar

**Criterios de terminado:**
- [x] Listado de pacientes carga desde la API con paginación
- [x] Búsqueda y filtros funcionan contra la API
- [x] Crear paciente funciona con validaciones de backend
- [x] Editar paciente funciona
- [x] Desactivar/activar paciente funciona
- [x] Detalle del paciente carga datos reales
- [x] Tab de citas muestra resumen real
- [x] Tab de notas permite CRUD real
- [x] Tab de historial muestra eventos reales
- [x] Alertas se pueden agregar y eliminar
- [x] Loading, error y empty states funcionan correctamente
- [x] PacientesMockService ya no se inyecta (pero no se borra aún)

> **Fase 3 completada** — 4 de abril de 2026
> Todos los endpoints de pacientes integrados. PacientesApiService creado con 16 métodos.
> Pacientes list page usa paginación del servidor, búsqueda con debounce, filtro activo/inactivo.
> Detalle del paciente con carga lazy por tab: alertas (entity CRUD), notas clínicas (CRUD),
> sesiones (paginadas), historial (desde API). PDF export adaptado.
> Consumidores externos (agenda, buscar-paciente-modal) migrados a PacientesApiService.
> File attachments en notas diferidos a Fase 6.

**Qué NO tocar todavía:**
- No integrar citas (solo lectura del resumen embebido en paciente)
- No integrar sesiones completas (solo resumen vía sub-recurso de paciente)
- No implementar upload de adjuntos (se pospone a Fase 6)
- No modificar la agenda ni la vista de calendario

**Notas de arquitectura:**
- Las tabs del paciente-detalle (`Info`, `Citas`, `Sesiones`, `Notas`, `Historial`) deben cargarse lazy: solo cuando el usuario selecciona el tab se hace la petición correspondiente
- El resumen de citas del paciente (`CitaResumenDto`) es un DTO ligero distinto al `CitaDto` completo. No confundir ni intentar unificarlos — son contratos diferentes para vistas diferentes
- Las alertas cambian de `string[]` embebido a entidad independiente con ID. Esto requiere ajustar la UI para soportar eliminación por ID

**Entregables concretos de la fase:**
1. `PacientesApiService` funcional con todos los endpoints
2. Listado paginado con búsqueda/filtros integrado
3. CRUD completo de pacientes funcionando
4. Sub-recursos de paciente (notas, alertas, historial) integrados
5. Loading/error/empty states en todas las vistas de pacientes

**Preparación para la siguiente fase:**
Con Pacientes integrado, la Fase 4 (Citas) podrá referenciar pacientes reales al crear/editar citas. El componente `buscar-paciente-modal` podrá buscar pacientes reales.

---

### Fase 4 — Citas (CRUD, Estados y Pagos)

**Objetivo:** Integrar el módulo de Citas con la API real: listado filtrable, detalle, creación, edición, máquina de estados de la cita, registro de pagos, y endpoint de disponibilidad horaria.

**Alcance:**
- Crear `CitasApiService` consumiendo endpoints reales
- Migrar `CitasPage` (listado con filtros)
- Migrar `DetalleCitaPage` (detalle, edición, estados, pagos)
- Integrar `buscar-paciente-modal` con búsqueda real de pacientes
- Integrar `cita-form-modal` con creación y edición real
- Conectar endpoint de disponibilidad para mostrar slots libres
- Implementar máquina de estados real (PENDIENTE → CONFIRMADA → COMPLETADA / CANCELADA / NO_ASISTIO / REPROGRAMADA)
- Integrar flujo de pagos real (PATCH de `estado_pago` + `monto`)

**Pantallas afectadas:**
- `citas.page.ts` — listado, filtros, modal de crear/editar
- `citas/detalle-cita/detalle-cita.page.ts` — detalle completo, cambio de estado, pago
- `shared/components/cita-form-modal/cita-form-modal.component.ts` — crear/editar cita
- `citas/components/buscar-paciente-modal/buscar-paciente-modal.component.ts` — búsqueda real

**Servicios involucrados:**
- `pages/citas/citas.service.mock.ts` — servicio actual a reemplazar
- Nuevo: `pages/citas/citas-api.service.ts`
- `pages/pacientes/pacientes.service.api.ts` — ya creado en Fase 3, usado por `buscar-paciente-modal`

**Endpoints involucrados:**
| Método | Ruta | Propósito |
|--------|------|-----------|
| `GET` | `/api/citas` | Lista filtrable. Params soportados: `search`, `estado`, `estadoPago/estado_pago`, `pacienteId`, `fechaDesde`, `fechaHasta`, `page`, `size`, `sort` |
| `POST` | `/api/citas` | Crear cita |
| `GET` | `/api/citas/{id}` | Detalle completo |
| `PUT` | `/api/citas/{id}` | Actualizar cita |
| `PATCH` | `/api/citas/{id}/confirmar` | Cambiar estado a CONFIRMADA |
| `PATCH` | `/api/citas/{id}/completar` | Cambiar estado a COMPLETADA |
| `PATCH` | `/api/citas/{id}/cancelar` | Cambiar estado a CANCELADA |
| `PATCH` | `/api/citas/{id}/no-asistio` | Cambiar estado a NO_ASISTIO |
| `PATCH` | `/api/citas/{id}/estado` | Fallback para estados no cubiertos por acciones dedicadas |
| `PATCH` | `/api/citas/{id}/pago` | Actualizar pago |
| `DELETE` | `/api/citas/{id}` | Eliminar cita |
| `GET` | `/api/citas/disponibilidad` | Slots libres. Params: `fecha`, `duracion_min` (con normalizaciÃ³n de variantes) |

**Modelos involucrados:**
- `CitaDto` — el modelo principal, verificar contra respuesta real
- `EstadoCita`, `EstadoPago` — enums reales del backend (UPPERCASE)
- `FiltroCitas` — adaptar a query params del backend
- `PageResponse<CitaDto>` — para listado paginado
- Nuevo: `DisponibilidadSlot` — `{ hora_inicio: string, hora_fin: string }`

**Dependencias previas:** Fase 3 (Pacientes, para el selector de pacientes)

**Cambios técnicos:**
1. Crear `CitasApiService` con HttpClient
2. Conectar listado con paginación y filtros
3. Conectar `buscar-paciente-modal` con `PacientesApiService.getAll()` (o un endpoint de búsqueda ligero)
4. Conectar `cita-form-modal` con creación y edición real
5. Implementar disponibilidad: al seleccionar una fecha en el form, mostrar slots libres
6. Implementar cambio de estado con confirmación y validación de transición válida
7. Implementar flujo de pago: modal/form para registrar `monto` y `estado_pago` (sin `metodo_pago`)
8. `tiene_sesion` debe venir del backend como campo derivado en el DTO
9. `nombre_paciente` y `apellido_paciente` deben venir del backend vía JOIN
10. Loading, error y empty states en listado y detalle

**Riesgos:**
- El endpoint de disponibilidad podría no existir aún en backend
- La máquina de estados podría tener restricciones adicionales en backend no documentadas (ej: no permitir ciertos cambios si hay pago registrado)
- El campo `duracion` del frontend se llama `duracion_min` en la tabla del backend — verificar naming
- El filtro `busqueda` podría no buscar por nombre de paciente en el backend (requiere JOIN)

**Criterios de terminado:**
- [x] Listado de citas carga desde la API con paginación y filtros
- [x] Crear cita funciona con validaciones de backend (incluida disponibilidad)
- [x] Editar cita funciona
- [x] Cambiar estado de cita funciona con transiciones válidas
- [x] Registrar pago funciona
- [ ] Eliminar cita se difiere (no estaba en alcance de Fase 4)
- [x] Disponibilidad muestra slots libres al seleccionar fecha
- [x] `buscar-paciente-modal` busca pacientes reales
- [x] Detalle de cita muestra datos reales
- [x] Loading, error y empty states funcionan
- [x] `CitasMockService` ya no se inyecta en el módulo Citas ni en Agenda

**Qué NO tocar todavía:**
- No integrar la vista de Agenda/Calendario (Fase 5)  
- No integrar sesiones clínicas (solo leer `tiene_sesion`)
- No integrar solicitudes de reprogramación todavía
- No integrar bloqueos horarios

**Notas de arquitectura:**
- El componente `cita-form-modal` es compartido entre Citas y Agenda. En esta fase se integra para Citas. En Fase 5 se verifica que funcione también desde Agenda
- El endpoint de disponibilidad debe considerar citas existentes + bloqueos + configuración de jornada. Esto requiere que el backend tenga como mínimo la tabla `configuracion_agenda` funcional
- El campo `duracion` del frontend debe mapearse a `duracion_min` si el backend usa ese nombre

**Entregables concretos de la fase:**
1. `CitasApiService` funcional con todos los endpoints
2. Listado, detalle, crear/editar, estados y pagos funcionando con API real
3. Selector de pacientes conectado a datos reales
4. Disponibilidad de slots integrada

**Preparación para la siguiente fase:**
Con Citas integrado, la Fase 5 (Agenda) puede mostrar citas reales en el calendario y usar disponibilidad real para la creación rápida de citas desde la vista de agenda.

> **✅ Fase 4 cerrada — 4 de abril de 2026**
>
> Cambios realizados:
> - `CitasApiService` creado (`src/app/pages/citas/citas-api.service.ts`) y conectado a listado, detalle, crear, editar, estados y pago.
> - `CitaDto` y enums migrados al contrato real (`fecha_inicio`/`fecha_fin`, `estado_cita`, `estado_pago`) con helpers de compatibilidad legacy.
> - `cita-form-modal` integrado con disponibilidad real (`GET /api/citas/disponibilidad`) y validación de slot.
> - `buscar-paciente-modal` migrado a búsqueda real con `PacientesApiService`.
> - `CitasPage` y `DetalleCitaPage` con loading/error/empty states reales.
> - `CitasMockService` queda **deprecado** y fuera de inyección en módulo Citas y Agenda.
> - Verificación técnica: `npx tsc -p tsconfig.app.json --noEmit` sin errores.

---

### Fase 5 — Agenda, Disponibilidad y Bloqueos Horarios

**Objetivo:** Integrar la vista de Agenda (calendario mensual/semanal) con datos reales: citas del período, bloqueos horarios, y creación rápida de citas desde el calendario.

**Alcance:**
- Consumir endpoint de agenda para obtener citas + bloqueos del período visible
- CRUD de bloqueos horarios
- Crear citas desde la vista de agenda (reutilizando `cita-form-modal` ya integrado)
- Mostrar disponibilidad visual en el grid de calendario
- Integrar la lógica de configuración de jornada (horarios, intervalos, sábados/domingos)

**Pantallas afectadas:**
- `agenda.page.ts` — vista de calendario, grid, panel de creación, bloqueos

**Servicios involucrados:**
- Nuevo: `pages/agenda/agenda-api.service.ts`
- `pages/citas/citas-api.service.ts` — reutilizado para crear citas desde agenda

**Endpoints involucrados:**
| Método | Ruta | Propósito |
|--------|------|-----------|
| `GET` | `/api/agenda` | Citas + bloqueos del período. Params: `mes`, `anio` (o `fecha_desde`, `fecha_hasta`) |
| `GET` | `/api/bloqueos-horario` | Lista bloqueos. Params: `fechaDesde`, `fechaHasta` |
| `POST` | `/api/bloqueos-horario` | Crear bloqueo |
| `PUT` | `/api/bloqueos-horario/{id}` | Editar bloqueo |
| `DELETE` | `/api/bloqueos-horario/{id}` | Eliminar bloqueo |
| `GET` | `/api/configuracion/agenda` | Jornada, intervalos, sábados/domingos (Fase 5 solo lectura; escritura en Fase 8) |

**Modelos involucrados:**
- `CitaDto` — ya definido
- Nuevo: `BloqueoHorarioDto` — `{ id, fecha, hora_inicio, hora_fin, motivo, tipo }`
- Nuevo: `AgendaDiaDto` — respuesta de `/api/agenda` agrupada por fecha
- Existente: `ConfiguracionAgendaDto` — para renderizar la jornada correctamente

**Dependencias previas:** Fase 4 (Citas integrado)

**Cambios técnicos:**
1. El `agenda.page.ts` actualmente tiene ~400 líneas con lógica de calendario embebida. Conviene extraer la lógica de cálculo de grid a un `CalendarService` o al menos a una utilidad, pero solo si esa extracción es necesaria para la integración — no refactorear por refactorear
2. Conectar el endpoint `/api/agenda` para obtener citas + bloqueos del mes visible
3. Al navegar entre meses, solicitar datos del nuevo período
4. Implementar CRUD de bloqueos con modal
5. Leer configuración de agenda para: hora de inicio/fin de jornada, intervalos, mostrar sábados/domingos
6. La creación de cita desde agenda reutiliza `cita-form-modal` (ya integrado en Fase 4)
7. Manejar el caso de "no hay citas" en un día (empty state por celda)
8. Verificar que la respuesta de `/api/agenda` sea eficiente: un solo request por mes, no un request por día

**Riesgos:**
- El endpoint `/api/agenda` podría no existir como endpoint dedicado, requiriendo combinar `/api/citas?fecha_desde=...&fecha_hasta=...` + `/api/bloqueos?...` manualmente
- La lógica de calendario es la más compleja del frontend (~400 líneas). La integración debe ser quirúrgica: cambiar solo el origen de datos, no reescribir el cálculo del grid
- Rendimiento: si un mes tiene muchas citas, la respuesta podría ser pesada. Considerar lazy loading por semana si es necesario
- La configuración de agenda (`hora_inicio_jornada`, etc.) podría no existir aún si el profesional nunca la configuró — necesitar defaults del backend

**Criterios de terminado:**
- [x] El calendario muestra citas reales del mes actual
- [x] Al cambiar de mes, se cargan citas del nuevo período
- [x] Los bloqueos se muestran visualmente en el calendario
- [x] Se pueden crear, editar y eliminar bloqueos
- [x] Se pueden crear citas desde la vista de agenda
- [x] La jornada laboral se consume desde la configuración real para horas disponibles y creación/bloqueos
- [x] Loading state mientras carga el calendario
- [x] Error state si falla la carga

**Qué NO tocar todavía:**
- No integrar solicitudes de reprogramación desde la agenda
- No modificar la configuración de agenda (solo lectura)
- No integrar recordatorios
- No cambiar la estructura del componente de calendario más allá de lo necesario

**Entregables concretos de la fase:**
1. Agenda consumiendo datos reales del API
2. CRUD de bloqueos funcional
3. Configuración de jornada aplicada a horas disponibles y modal de bloqueos/citas
4. Creación de citas desde agenda funcionando con API

**Cierre implementado (05/04/2026):**
- `AgendaPage` ya consume `GET /api/agenda?mes&anio` para cargar citas + bloqueos del mes visible en una sola llamada.
- La navegación mensual recarga el período visible sin reescribir la lógica del grid.
- Los bloqueos se renderizan dentro del calendario y del panel diario, y ya permiten crear, editar y eliminar contra `/api/bloqueos-horario`.
- La creación y reprogramación de citas desde Agenda ya reutiliza `cita-form-modal` persistiendo con `CitasApiService`.
- `configuracion_jornada` del backend se usa para construir las horas disponibles del modal y respetar la jornada en creación/bloqueos.
- El layout mensual sigue siendo el existente: aún no oculta columnas de sábados/domingos aunque la configuración ya se consume.

**Preparación para la siguiente fase:**
Con Agenda integrada, el sistema tiene los tres módulos centrales (Pacientes, Citas, Agenda) funcionando con datos reales. La Fase 6 puede integrar sesiones clínicas que dependen de citas completadas.

---

### Fase 6 — Sesiones Clínicas y Adjuntos

**Estado:** ✅ Completada (5 de abril de 2026)

**Objetivo:** Integrar sesiones clínicas reales y el flujo real de adjuntos sin reescribir la UI principal del módulo.

**Implementado en esta fase:**
- `SesionesApiService` (`GET /api/sesiones`, `GET /api/sesiones/{id}`, `POST /api/sesiones`, `PUT /api/sesiones/{id}`, `GET /api/citas/{id}/sesion`)
- `AdjuntosServiceApi` con flujo signed URL de 3 pasos:
  1. `POST /api/archivos-adjuntos/upload-url`
  2. `PUT` directo al `upload_url` externo
  3. `POST /api/archivos-adjuntos`
- `SesionesPage` con listado real, filtros por fecha contra API y búsqueda local por paciente/tipo/resumen
- `DetalleSesionPage` con detalle real, edición real, upload, preview, descarga y eliminación de adjuntos
- `DetalleCitaPage` con acción real `Crear sesión` / `Ver sesión` para citas completadas
- Exclusión explícita de dominios de storage en `auth.interceptor.ts`
- `SesionesMockService` conservado como deprecated, pero fuera de los flujos activos del módulo

**Pantallas / servicios tocados:**
- `pages/sesiones/sesiones.page.ts`
- `pages/sesiones/detalle-sesion/detalle-sesion.page.ts`
- `pages/sesiones/sesiones-api.service.ts`
- `services/adjuntos.service.api.ts`
- `pages/citas/detalle-cita/detalle-cita.page.ts`

**Endpoints reales usados finalmente:**
| Método | Ruta | Propósito |
|--------|------|-----------|
| `GET` | `/api/sesiones` | Listado real de sesiones |
| `GET` | `/api/sesiones/{id}` | Detalle real |
| `POST` | `/api/sesiones` | Crear sesión desde cita completada |
| `PUT` | `/api/sesiones/{id}` | Editar sesión |
| `GET` | `/api/citas/{id}/sesion` | Resolver "Crear sesión" vs "Ver sesión" |
| `GET` | `/api/sesiones/{id}/archivos-adjuntos` | Listar adjuntos de la sesión |
| `POST` | `/api/archivos-adjuntos/upload-url` | Obtener signed URL |
| `POST` | `/api/archivos-adjuntos` | Registrar metadata |
| `GET` | `/api/archivos-adjuntos/{id}/download-url` | Preview / descarga |
| `DELETE` | `/api/archivos-adjuntos/{id}` | Eliminación lógica del adjunto |

**Qué parte ya usa API real y qué parte no:**
- Usa API real:
  - listado de sesiones
  - detalle y edición de sesión
  - creación de sesión desde cita completada
  - adjuntos de sesión (upload / preview / download / delete)
- Aún no se integra en esta fase:
  - adjuntos de notas clínicas del módulo de pacientes
  - cambio de estatus de sesión (`PATCH /api/sesiones/{id}/estatus`)

**Notas de integración / limitaciones detectadas:**
- El backend no expone conteo/resumen de adjuntos dentro de `SesionDto`; para conservar el badge en el listado actual se hace una consulta ligera por sesión (`size=1`) sobre la página visible.
- El filtro `con_adjunto` se resuelve sobre la página cargada, no como filtro server-side, porque `GET /api/sesiones` no documenta ese parámetro.
- La creación desde cita usa `POST /api/sesiones` con `{ id_cita }`; el endpoint legado `POST /api/citas/{citaId}/sesion` no se usa.

**Criterios de terminado:**
- [x] Listado de sesiones carga desde la API
- [x] Crear sesión desde cita completada funciona
- [x] Editar sesión funciona
- [x] Upload de adjunto funciona
- [x] Descarga / preview de adjunto funciona
- [x] Eliminación de adjunto funciona
- [x] El interceptor no interfiere con requests de storage
- [x] `SesionesMockService` ya no se inyecta en flujos activos

**Preparación para la siguiente fase:**
Con Sesiones integradas, el ciclo Paciente → Cita → Agenda → Sesión ya opera con API real. La Fase 7 puede consumir dashboard y agregados sin depender de mocks clínicos.

---

### Fase 7 — Dashboard y Resumen General

**Estado:** ✅ Completada (5 de abril de 2026)

**Objetivo:** Integrar un dashboard inicial real, resiliente y útil al entrar a la app, sin mezclar todavía el módulo completo de estadísticas.

**Implementado en esta fase:**
- Nueva home real en `/dashboard/inicio`
- `DashboardApiService` con:
  - `GET /api/dashboard/resumen`
  - `GET /api/dashboard/agenda-hoy`
  - `GET /api/dashboard/consolidado`
- `NotificacionesApiService` con `GET /api/notificaciones`
- Carga paralela resiliente por bloques:
  - la home carga `resumen` y `agenda-hoy` por separado
  - el shell del dashboard carga `consolidado` y `notificaciones` en paralelo
- KPIs reales
- Agenda del día real
- Badges reales de pendientes:
  - notificaciones pendientes en la campana
  - solicitudes pendientes en navegación de citas
- Eliminación del array hardcodeado de notificaciones en `dashboard.page.ts`

**Pantallas / archivos tocados:**
- `pages/dashboard/home/dashboard-home.page.ts`
- `pages/dashboard/dashboard.page.ts`
- `services/dashboard-api.service.ts`
- `services/notificaciones.service.api.ts`
- `app-routing.module.ts`

**Endpoints reales usados finalmente:**
| Método | Ruta | Propósito |
|--------|------|-----------|
| `GET` | `/api/dashboard/resumen` | KPIs principales |
| `GET` | `/api/dashboard/agenda-hoy` | Agenda operativa del día |
| `GET` | `/api/dashboard/consolidado` | Counts de solicitudes / notificaciones pendientes |
| `GET` | `/api/notificaciones` | Feed real del dropdown |

**Qué quedó real y qué no en esta fase:**
- Ya usa API real:
  - home del dashboard
  - KPIs
  - agenda del día
  - badge de solicitudes pendientes
  - badge y listado de notificaciones
- Deliberadamente no se integró aquí:
  - estadísticas completas (`estadisticas-citas`, `estadisticas-pacientes`)
  - workflow de aprobar/rechazar solicitudes desde el dropdown del dashboard
  - marcado persistente de notificaciones como leídas

**Notas de integración / decisiones de resiliencia:**
- No se usó solo `GET /api/dashboard/consolidado` para toda la home porque un fallo único habría tumbado resumen y agenda a la vez.
- El dropdown de notificaciones consume datos reales, pero la UI ahora trabaja con “pendientes” (`estado_envio=PENDIENTE`) en lugar de “leídas/no leídas”, que era un supuesto del mock anterior.
- El count de solicitudes sí se muestra porque el backend lo expone en `DashboardConsolidadoDto`, pero no hay un endpoint global documentado para listar y gestionar todas las solicitudes pendientes desde el header; por eso esa interacción se deja para una fase posterior.

**Criterios de terminado:**
- [x] Dashboard carga datos reales
- [x] Agenda del día funciona
- [x] KPIs funcionan
- [x] Badges de pendientes funcionan
- [x] Notificaciones hardcodeadas eliminadas
- [x] La carga es paralela y resiliente
- [x] Si falla una sección, el resto del dashboard sigue usable

**Preparación para la siguiente fase:**
Con el dashboard operativo y sin mocks visibles, la Fase 8 puede centrarse en configuración/perfil sin depender de datos sintéticos en la entrada principal de la app.

---

### Fase 8 — Configuración, Perfil y Preferencias

**Objetivo:** Integrar la página de Configuración con la API real: configuración de agenda, recordatorios y sistema. Integrar el perfil del profesional. Manejar el patrón create vs update: la configuración se crea automáticamente si no existe.

**Alcance:**
- Integrar los tres bloques de configuración (agenda, recordatorios, sistema)
- Integrar perfil del profesional (datos profesionales, códigos)
- Implementar lógica de "GET → si 404 → usar defaults → primer PUT crea"
- Integrar cambio de contraseña
- Integrar código de vinculación (ver/regenerar)

**Pantallas afectadas:**
- `configuracion.page.ts` — tabs de configuración: General, Agenda, Equipo (se pospone equipo a Fase 9), Seguridad, Sistema
- `perfil.page.ts` — datos personales y profesionales

**Servicios involucrados:**
- Nuevo: `services/configuracion-api.service.ts`
- Nuevo: `services/perfil-api.service.ts`
- `services/auth.ts` — para cambio de contraseña

**Endpoints involucrados:**
| Método | Ruta | Propósito |
|--------|------|-----------|
| `GET` | `/api/configuracion/agenda` | Obtener config de agenda |
| `PUT` | `/api/configuracion/agenda` | Guardar config de agenda |
| `GET` | `/api/configuracion/recordatorios` | Obtener config de recordatorios |
| `PUT` | `/api/configuracion/recordatorios` | Guardar config de recordatorios |
| `GET` | `/api/configuracion/sistema` o `/api/configuracion-sistema` | Obtener config de sistema |
| `PUT` | `/api/configuracion/sistema` o `POST/PUT /api/configuracion-sistema` | Guardar config de sistema |
| `GET` | `/api/profesionales/me` o `/api/profesionales/{id}` | Perfil del profesional |
| `PUT` | `/api/profesionales/me/perfil` o `/api/profesionales/{id}` | Actualizar perfil profesional |
| `GET` | `/api/profesionales/me/codigo-vinculacion` o `/api/codigos-vinculacion/me` | Ver código de vinculación |
| `POST` | `/api/profesionales/me/codigo-vinculacion/regenerar` o `/api/codigos-vinculacion/regenerar` | Regenerar código |
| `PUT` | `/api/usuarios/me` o `/api/usuarios/{id}` | Actualizar datos personales |
| `PUT` | `/api/usuarios/me/password` o `/api/usuarios/{id}/password` | Cambiar contraseña |

**Modelos involucrados:**
- Nuevo: `ConfiguracionAgendaDto` — campos según blueprint (hora_inicio_jornada, hora_fin_jornada, etc.)
- Nuevo: `ConfiguracionRecordatoriosDto` — campos según blueprint
- Nuevo: `ConfiguracionSistemaDto` — campos según blueprint
- Nuevo: `PerfilProfesionalDto` — especialidad, nombre_consulta, tipo_servicio, descripcion, codigo_vinculacion

**Dependencias previas:** Fase 2 (Auth — para cambio de contraseña y /me)

**Cambios técnicos:**
1. Crear DTOs de configuración alineados al blueprint
2. Implementar patrón de carga: `GET config → si existe, mostrar → si no, usar defaults locales` (el backend debería crear configs con defaults al crear el profesional, pero si no los tiene, el frontend muestra defaults y el primer `PUT` los crea)
3. Implementar tracking de cambios: el botón "Guardar" solo se habilita si hay cambios (comparación con snapshot del GET original)
4. Implementar lógica de "reset a defaults" usando constantes locales
5. La tab "Equipo" de configuración se pospone a Fase 9 y se mantiene con mock temporalmente
6. Conectar cambio de contraseña con `PUT /usuarios/me/password` (requiere contraseña actual)
7. Conectar perfil profesional con lectura/escritura
8. Conectar código de vinculación con lectura y regeneración (con confirmación)

**Riesgos:**
- Las tres tablas de configuración podrían no tener defaults creados automáticamente por el backend al registrar al profesional
- El endpoint de cambio de contraseña podría requerir re-autenticación
- La UI tiene ~40 propiedades de configuración distribuidas en 5 tabs — hay que mapear correctamente cada una al DTO correspondiente
- La tab de seguridad incluye integraciones (Google, WhatsApp, Pagos) que no están implementadas — mantener como UI informativa sin backend

**Criterios de terminado:**
- [x] Las tres configuraciones (agenda, recordatorios, sistema) se cargan desde la API con fallback de contratos
- [x] Modificar y guardar configuración funciona para los campos backend soportados
- [x] Reset a defaults funciona
- [x] Tracking de cambios funciona (botón guardar se habilita solo con cambios)
- [x] Perfil del profesional carga y se puede editar
- [ ] Código de vinculación se puede ver y regenerar
- [x] Cambio de contraseña funciona

**Qué NO tocar todavía:**
- No integrar la tab de Equipo (Fase 9)
- No implementar integraciones (Google, WhatsApp, Pagos)
- No modificar la lógica de permisos del recepcionista sobre configuración

**Entregables concretos de la fase:**
1. `ConfiguracionApiService` funcional con agenda, sistema y recordatorios
2. `PerfilApiService` funcional con perfil/código/password y fallback de endpoints
3. Configuración y perfil conectados sin modificar HTML/SCSS/layout
4. Pendientes documentados para campos sin contrato y regeneración del código

**Preparación para la siguiente fase:**
La configuración de agenda ya integrada permite que la Fase 5 (ya completada) valide correctamente la jornada laboral. La Fase 9 (Equipo) completará la tab pendiente de configuración.

---

### Fase 9 — Equipo, Permisos de Recepcionista y Vinculación

**Objetivo:** Integrar el módulo de gestión de equipo: listado de recepcionistas, edición de permisos granulares, activación/desactivación, y flujo de vinculación.

**Alcance:**
- Listado de recepcionistas del profesional con sus permisos
- Edición de permisos granulares por recepcionista
- Activación/desactivación de recepcionistas
- Validación de código de vinculación (ya parcialmente conectado en Fase 2)

**Pantallas afectadas:**
- `configuracion.page.ts` — tab "Equipo"

**Servicios involucrados:**
- `services/equipo.service.mock.ts` — deprecado, mantener sin inyección activa
- `services/vinculacion.service.mock.ts` — deprecado, mantener sin inyección activa
- Nuevo: `services/equipo-api.service.ts`

**Endpoints involucrados:**
| Método | Ruta | Propósito |
|--------|------|-----------|
| `GET` | `/api/recepcionistas` o `/api/equipo` | Lista recepcionistas |
| `GET` | `/api/recepcionistas/{id}/permisos` | Ver permisos |
| `PUT` | `/api/recepcionistas/{id}/permisos` o `/api/equipo/{id}/permisos` | Actualizar permisos |
| `PATCH` | `/api/recepcionistas/{id}/activo` o `/api/equipo/{id}/activo` | Activar/desactivar |

**Modelos involucrados:**
- `RecepcionistaEquipoViewModel` — view model ya definido, el servicio API construye instancias de esta interfaz a partir de la respuesta del backend
- `PermisosRecepcionista` — ya definido, mapear a/desde backend
- `PermisoDetalle` — constantes locales para renderizar el modal de edición

**Dependencias previas:** Fase 2 (Auth — para el rol y la vinculación)

**Cambios técnicos:**
1. Crear `EquipoApiService` que consuma las rutas reales de recepcionistas
2. Construir en el servicio el mapper enriquecido a `RecepcionistaEquipoViewModel` (`initials`, `nombreCompleto`, `permisosActivosCount`, `permisosResumen`, `fechaVinculacion`)
3. Resolver permisos desde el listado cuando vengan embebidos, o con `GET /recepcionistas/{id}/permisos` cuando no vengan
4. Conectar edición de permisos y activación/desactivación sin tocar la UX del modal actual
5. Retirar la inyección activa de mocks en la pantalla integrada, dejando los mocks solo como fallback/deprecados en el repo

**Riesgos:**
- El endpoint `/api/equipo` podría devolver datos en formato plano que no coincidan con `RecepcionistaEquipoViewModel` — necesitar mapper
- La activación/desactivación podría tener restricciones (ej: no desactivar al último recepcionista activo)

**Criterios de terminado:**
- [x] Listado de recepcionistas carga desde la API
- [x] Edición de permisos funciona
- [x] Activación/desactivación funciona
- [x] View model se construye correctamente desde datos reales
- [x] `EquipoMockService` ya no se inyecta en la pantalla integrada

**Qué NO tocar todavía:**
- No implementar invitaciones por email
- No implementar roles adicionales

**Entregables concretos de la fase:**
1. `EquipoApiService` funcional
2. Tab de Equipo en configuración integrada con API real
3. Mocks de equipo/vinculación conservados pero fuera de la inyección activa

**Preparación para la siguiente fase:**
Con Equipo integrado, el sistema de permisos funciona end-to-end con datos reales. La Fase 10 puede integrar actividad y notificaciones que involucran acciones del equipo.

---

### Fase 10 — Actividad, Notificaciones e Historial de Eventos

**Objetivo:** Integrar la página de Actividad, el sistema de notificaciones completo, y los tabs de historial de eventos en paciente, cita y sesión.

**Alcance:**
- Página de actividad con feed de eventos filtrable
- Notificaciones: listado, marcar como leída, marcar todas como leídas
- Historial de eventos global y por entidad (tabs de bitácora)

**Pantallas afectadas:**
- `actividad.page.ts` — feed de actividad
- `dashboard.page.ts` — dropdown/listado de notificaciones (complemento de Fase 7)
- `paciente-detalle.page.ts` — tab de historial (ya parcialmente integrado en Fase 3)

**Servicios involucrados:**
- `services/notificaciones.service.api.ts` — ya creado en Fase 7, ampliar
- Nuevo: `services/actividad.service.api.ts` (o usar notificaciones)

**Endpoints involucrados:**
| Método | Ruta | Propósito |
|--------|------|-----------|
| `GET` | `/api/actividad` | Feed de actividad filtrable. Params: `tipo` |
| `GET` | `/api/notificaciones` | Listado completo |
| `PATCH` | `/api/notificaciones/{id}/leida` | Marcar como leída |
| `POST` | `/api/notificaciones/marcar-todas-leidas` | Marcar todas |

**Modelos involucrados:**
- `NotificacionDto` — ya definido en Fase 7
- Nuevo: `ActividadEventoDto` — según respuesta de `/api/actividad`

**Dependencias previas:** Fase 7 (Dashboard con notificaciones parciales)

**Cambios técnicos:**
1. Crear `ActividadApiService` o ampliar `NotificacionesApiService`
2. Conectar filtros de tipo de actividad (agenda, equipo, sistema, reprogramar)
3. Agrupación por fecha en la vista de actividad (puede venir agrupado del backend o agruparse en frontend)
4. Marcar notificaciones como leídas al hacer click o al abrir el dropdown
5. Botón "marcar todas como leídas"

**Riesgos:**
- La actividad y las notificaciones podrían ser conceptos solapados en el backend (ambas son "eventos")
- El historial de eventos por paciente ya se conectó en Fase 3, pero el historial global podría ser diferente
- Sin WebSockets, las notificaciones solo se actualizan al recargar o con polling

**Criterios de terminado:**
- [ ] Página de actividad muestra feed real
- [ ] Filtros de tipo funcionan
- [ ] Notificaciones se pueden marcar como leídas
- [ ] "Marcar todas" funciona
- [ ] Feed agrupado por fecha visualmente correcto

**Qué NO tocar todavía:**
- No implementar WebSockets / push notifications
- No implementar preferencias de notificaciones (tipos a recibir)

**Entregables concretos de la fase:**
1. `ActividadApiService` funcional
2. Página de actividad integrada con API real
3. Notificaciones completamente integradas

**Preparación para la siguiente fase:**
Con actividad y notificaciones funcionando, el sistema tiene información completa de eventos. La Fase 11 puede integrar estadísticas que consumen datos similares.

---

### Fase 11 — Estadísticas y Reportes

**Objetivo:** Integrar el módulo de Estadísticas con la API real: KPIs detallados, gráficos temporales, rankings, caja diaria, y generación/exportación de reportes.

**Alcance:**
- KPIs: tarjetas de resumen con tendencias
- Gráfico de citas por período
- Gráfico de ingresos por método de pago
- Estadísticas de pacientes (nuevos vs recurrentes, ranking)
- Insights generados por backend
- Caja diaria
- Generación y exportación de reportes (PDF/Excel)

**Pantallas afectadas:**
- `estadisticas/dashboard/` — KPIs y resumen
- `estadisticas/citas/` — gráficos de citas
- `estadisticas/ingresos/` — gráficos de ingresos
- `estadisticas/pacientes/` — estadísticas y rankings
- `estadisticas/reportes/` — tabla y exportación
- `estadisticas/components/` — 12 componentes de UI

**Servicios involucrados:**
- `pages/estadisticas/estadisticas.service.mock.ts` — reemplazar
- Nuevo: `pages/estadisticas/estadisticas.service.api.ts`

**Endpoints involucrados:**
| Método | Ruta | Propósito |
|--------|------|-----------|
| `GET` | `/api/estadisticas/resumen` | KPIs. Params: `rango`, `fecha_desde`, `fecha_hasta` |
| `GET` | `/api/estadisticas/citas` | Serie temporal de citas |
| `GET` | `/api/estadisticas/ingresos` | Serie temporal de ingresos |
| `GET` | `/api/estadisticas/pacientes` | Nuevos vs recurrentes, rankings |
| `GET` | `/api/estadisticas/insights` | Insights destacados |
| `GET` | `/api/estadisticas/caja-diaria` | Caja del día. Param: `fecha` |
| `GET` | `/api/estadisticas/reportes` | Reportes disponibles |
| `GET` | `/api/estadisticas/reportes/{tipo}` | Filas del reporte |
| `POST` | `/api/estadisticas/reportes/exportar` | Exportar PDF/Excel |

**Modelos involucrados:**
- `KpiCard`, `EstadisticasResumen`, `CitasPorPeriodo`, `IngresoPorPeriodo`, `RankingPaciente`, etc. — ya definidos extensamente
- `FiltroEstadisticas`, `RangoFecha` — ya definidos
- Verificar todos contra respuestas reales del backend

**Dependencias previas:** Fases 3-6 (datos reales de pacientes, citas, sesiones y pagos en la base)

**Cambios técnicos:**
1. Crear `EstadisticasApiService` con HttpClient
2. Adaptar componentes de gráficos para consumir datos de la API
3. Los filtros de período (`rango`, `fecha_desde`, `fecha_hasta`) deben traducirse a query params
4. La exportación de reportes podría devolver un blob (archivo) directamente o disparar un proceso asíncrono — adaptar según la respuesta del backend
5. Los insights deben mostrarse solo si el backend los genera — manejar respuesta vacía
6. La caja diaria probablemente necesita un selector de fecha simple

**Riesgos:**
- El módulo de estadísticas es el más complejo en interfaces (20+ tipos). Verificar que cada campo del modelo coincida con el backend
- Los gráficos dependen de que haya datos suficientes. Sin datos, mostrar empty states informativos
- La exportación podría tardar — implementar loading state
- Algunos endpoints de estadísticas podrían no estar implementados en backend (insights, caja diaria)

**Criterios de terminado:**
- [ ] Todas las sub-páginas de estadísticas muestran datos reales
- [ ] Filtros por período funcionan
- [ ] Gráficos se renderizan con datos reales
- [ ] Rankings muestran datos reales
- [ ] Exportar reporte genera archivo descargable
- [ ] Empty states cuando no hay datos
- [ ] `EstadisticasMockService` ya no se inyecta

**Qué NO tocar todavía:**
- No implementar gráficos avanzados (Chart.js/ApexCharts se implementará si es necesario, pero no es parte de la integración API)
- No implementar caché de estadísticas

**Entregables concretos de la fase:**
1. `EstadisticasApiService` funcional
2. Todas las vistas de estadísticas consumiendo datos reales
3. Exportación de reportes funcional

**Preparación para la siguiente fase:**
Con estadísticas integradas, solo quedan los endpoints públicos y el hardening final.

---

### Fase 12 — Flujo Público de Confirmación de Cita y Solicitudes de Reprogramación

**Objetivo:** Integrar la página pública de confirmación de cita accesible por token (sin autenticación): consultar datos de la cita, confirmar, cancelar, solicitar reprogramación.

**Alcance:**
- Conectar ruta `/confirmar-cita/:token` con endpoint público
- Cargar datos de la cita usando el token
- Implementar acciones: confirmar, cancelar, solicitar reprogramación
- Manejar estados de UI: válido, expirado, ya usado, error
- Integrar solicitudes de reprogramación como flujo completo (creación desde la página pública + gestión desde el dashboard/actividad)

**Pantallas afectadas:**
- `confirmar-cita.page.ts` — página pública del paciente
- `app-routing.module.ts` — agregar `:token` a la ruta

**Servicios involucrados:**
- Nuevo: `services/confirmacion-publica.service.ts`
- Reutilizar el servicio/API de solicitudes que se defina cuando se complete el flujo global de reprogramación

**Endpoints involucrados:**
| Método | Ruta | Propósito |
|--------|------|-----------|
| `GET` | `/api/public/citas/confirmar/{token}` | Datos de la cita para el paciente (público, sin auth) |
| `POST` | `/api/public/citas/confirmar/{token}/confirmar` | Paciente confirma |
| `POST` | `/api/public/citas/confirmar/{token}/cancelar` | Paciente cancela |
| `POST` | `/api/public/citas/confirmar/{token}/reprogramar` | Paciente solicita reprogramar. Body: `{ mensaje_paciente, fecha_hora_sugerida }` |

**Modelos involucrados:**
- Nuevo: `ConfirmacionPublicaDto` — datos que devuelve el GET al token: nombre del profesional, fecha, hora, modalidad, estado actual, etc.
- `SolicitudReprogramacion` — para el body del POST de reprogramación

**Dependencias previas:** Fase 4 (Citas integradas) y Fase 7 (Solicitudes de reprogramación)

**Cambios técnicos:**
1. Agregar `:token` a la ruta de `confirmar-cita` en routing
2. Crear `ConfirmacionPublicaService` con las 4 operaciones
3. **Estos endpoints son públicos**: agregar las URLs `/api/public/*` a la lista de exclusión del interceptor
4. Implementar máquina de estados en la UI del paciente:
   - Estado inicial: mostrando datos de la cita
   - Token expirado: mostrar mensaje de expiración
   - Token ya usado: mostrar acción ya realizada
   - Cita ya completada/cancelada: mostrar estado final
   - Acción exitosa: mostrar confirmación
5. El campo `diasRestantes` se calcula localmente desde la fecha de la cita (no viene del backend)
6. El campo `avatarColor` se calcula localmente (no viene del backend)
7. Manejar errores: token inválido (404), token expirado (410 o similar), error de red

**Riesgos:**
- La página pública no tiene navegación de la app. Verificar que la UI funcione correctamente como página standalone
- El token podría expirar entre que el paciente abre la página y realiza la acción — manejar error gracefully
- Si el paciente recarga la página después de confirmar, el token ya está invalidado — mostrar el estado actual de la cita

**Criterios de terminado:**
- [ ] La página carga datos de la cita con el token
- [ ] Confirmar funciona y muestra confirmación
- [ ] Cancelar funciona y muestra confirmación
- [ ] Solicitar reprogramación funciona con mensaje y fecha sugerida
- [ ] Token expirado muestra mensaje claro
- [ ] Token ya usado muestra estado de la acción realizada
- [ ] Error de red muestra mensaje de reintento
- [ ] No se inyecta Bearer token en requests a `/api/public/*`

**Qué NO tocar todavía:**
- No implementar reenvío de token/recordatorio (está en el lado del backend/admin)
- No implementar notificaciones push al paciente

**Entregables concretos de la fase:**
1. `ConfirmacionPublicaService` funcional
2. Página pública completamente integrada con API
3. Ruta con `:token` configurada
4. Máquina de estados de UI completa

**Preparación para la siguiente fase:**
Con los endpoints públicos integrados, todos los flujos funcionales de la app están conectados. La Fase 13 es el hardening final.

---

### Fase 13 — Hardening Final y Checklist de Producción

**Objetivo:** Retirar definitivamente todos los mocks, verificar la consistencia global de la integración, pulir estados de carga/error/vacío, validar permisos, asegurar responsividad mobile, y ejecutar un smoke test integral.

**Alcance:**
- Retiro definitivo de todos los archivos `*.mock.ts` y datos mock
- Remover `useMocks` de environments y toda la lógica de inyección condicional
- Revisión de consistencia de modelos TypeScript contra respuestas reales del backend
- Verificación de loaders, toasts, empty states y spinners en todas las pantallas
- Validación de errores de negocio (mensajes de error legibles en español)
- Validación de permisos por rol (Profesional vs Recepcionista) en todas las pantallas
- Validación mobile/responsive en todas las pantallas
- Smoke test integral de todos los flujos

**Pantallas afectadas:** Todas

**Servicios involucrados:** Todos (limpieza de mocks, verificación de servicios API)

**Endpoints involucrados:** Todos (verificación integral)

**Cambios técnicos:**
1. Eliminar archivos mock:
   - `pages/pacientes/pacientes.service.mock.ts`
   - `pages/pacientes/pacientes.mock.ts`
   - `pages/citas/citas.service.mock.ts`
   - `pages/citas/solicitud-reprogramacion.service.mock.ts`
   - `pages/sesiones/sesiones.service.mock.ts`
   - `pages/estadisticas/estadisticas.service.mock.ts`
   - `services/equipo.service.mock.ts`
   - `services/vinculacion.service.mock.ts`
   - `services/session.service.mock.ts`
2. Eliminar flag `useMocks` de environments y toda lógica condicional de inyección
3. Revisar cada página contra la siguiente checklist:
   - ¿Tiene loading state?
   - ¿Tiene error state con mensaje legible?
   - ¿Tiene empty state cuando no hay datos?
   - ¿Los toasts de éxito/error son claros?
   - ¿Los permisos ocultan/muestran correctamente los botones?
   - ¿Funciona en mobile (Ionic responsive)?
4. Verificar que no hay `console.log()` ni `TODO: conectar API` en el código
5. Verificar que `environment.prod.ts` tiene `apiUrl` apuntando al backend real
6. Verificar que no hay hardcoded data (notificaciones mock, `BETA_INVITE_CODES`, etc.)
7. Verificar que los guards funcionan correctamente con datos reales
8. Verificar que el interceptor maneja todos los escenarios de error

**Riesgos:**
- Eliminar mocks podría revelar dependencias implícitas que no se detectaron antes
- Algunos edge cases solo aparecen con datos reales (listas vacías, strings muy largos, fechas límite)
- Responsividad mobile podría tener problemas con datos reales (ej: nombres largos, tablas con muchas columnas)
- Falta de datos de prueba en la base de datos podría dificultar el smoke test

**Criterios de terminado:**
- [ ] Cero archivos `*.mock.ts` en el proyecto
- [ ] Cero referencias a `useMocks` o inyección condicional
- [ ] Cero `console.log()` de desarrollo en el código
- [ ] Cero `TODO: conectar API` pendientes
- [ ] Todas las pantallas tienen loading, error y empty states
- [ ] Todos los toasts muestran mensajes legibles en español
- [ ] Permisos de Recepcionista restringen correctamente el acceso
- [ ] La app funciona correctamente en mobile (Android al menos)
- [ ] Smoke test integral pasa en los flujos principales:
  - Login → Dashboard → Crear paciente → Crear cita → Confirmar cita → Completar cita → Crear sesión → Ver estadísticas → Logout
  - Login Recepcionista → Verificar permisos → Solo ve módulos permitidos
  - Flujo público: abrir link → ver cita → confirmar/cancelar
- [ ] Build de producción compila sin errores ni warnings

**Qué NO tocar:**
- No agregar features nuevas
- No refactorizar componentes
- No cambiar la arquitectura

**Entregables concretos de la fase:**
1. Proyecto limpio sin mocks
2. Documento de smoke test ejecutado
3. Build de producción exitoso
4. App lista para deploy

**Preparación para el futuro:**
La app está lista para producción. Mejoras futuras incluyen: testing automatizado, i18n, caché de datos, WebSockets para notificaciones en tiempo real, y nuevos módulos según roadmap de producto.

---

## 6. Matriz de Dependencias entre Fases

```
Fase 1 (Fundaciones)
  └──→ Fase 2 (Auth)
         ├──→ Fase 3 (Pacientes)
         │      └──→ Fase 4 (Citas)
         │             ├──→ Fase 5 (Agenda/Bloqueos)
         │             ├──→ Fase 6 (Sesiones/Adjuntos)
         │             └──→ Fase 7 (Dashboard)
         │                    └──→ Fase 10 (Actividad/Notificaciones)
         ├──→ Fase 8 (Configuración/Perfil) [puede ir en paralelo con Fases 3-6]
         ├──→ Fase 9 (Equipo) [puede ir en paralelo con Fases 3-6]
         └──→ Fase 12 (Público) [requiere Fase 4]
                    
Fases 3-12 ──→ Fase 11 (Estadísticas) [se beneficia de datos reales]
Todas ──→ Fase 13 (Hardening)
```

**Nota:** Las Fases 8 (Configuración) y 9 (Equipo) no tienen dependencias fuertes con Pacientes/Citas y pueden ejecutarse en paralelo si hay capacidad.

---

## 7. Riesgos Globales del Proyecto

| # | Riesgo | Probabilidad | Impacto | Mitigación |
|---|--------|-------------|---------|------------|
| 1 | **Backend no disponible o inestable** | Media | Alto | Mantener mocks como fallback hasta la Fase 13. Flag `useMocks` en environment |
| 2 | **Contratos de API inconsistentes con el blueprint** | Alta | Medio | Validar contrato real en las primeras llamadas de cada módulo. Documentar diferencias en `BACKEND_CHANGES_FOR_FRONT.md` |
| 3 | **Paginación con formato inesperado** | Baja | Medio | Definir `PageResponse<T>` en Fase 1 y validar contra la primera respuesta paginada real |
| 4 | **Manejo de errores insuficiente del backend** | Media | Medio | `api-error.mapper.ts` ya tiene mapeo de códigos. Agregar fallbacks para mensajes genéricos |
| 5 | **Adjuntos sin object storage** | Media | Alto | Posponer la Fase 6 (adjuntos) si no hay storage. Sesiones funcionan sin adjuntos |
| 6 | **Datos de prueba insuficientes** | Media | Bajo | Crear script de seed en backend o usar Postman para poblar datos mínimos |
| 7 | **Refresh token con rotación falla silenciosamente** | Baja | Alto | Smoke test específico del flujo 401→refresh→retry en Fase 2 |
| 8 | **Diferencias de naming snake_case/camelCase no uniformes** | Alta | Medio | Definir convención en Fase 1. `SolicitudReprogramacion` ya usa camelCase internamente — decidir si se mantiene o unifica |
| 9 | **Rendimiento en mobile con datos reales** | Baja | Medio | Paginación en listados. Lazy loading de tabs. Virtual scroll si hay listas muy largas |
| 10 | **Session bootstrap lento o con flash de login** | Media | Bajo | Resolver en Fase 2: splash screen o loading state mientras se verifica el token |

---

## 8. Reglas de Implementación para Fases Futuras

Estas reglas aplican a **cada fase** cuando se implemente:

1. **Leer antes de modificar.** Siempre leer el estado actual del archivo antes de editarlo.
2. **Un servicio por endpoint group.** No hacer un solo servicio monolítico para toda la API.
3. **Errores tipados.** Todo `catch` de HttpErrorResponse debe pasar por `mapApiError()`.
4. **Loading states obligatorios.** Toda vista que haga una petición HTTP debe mostrar un spinner o skeleton.
5. **Empty states obligatorios.** Toda lista que pueda estar vacía debe mostrar un mensaje informativo.
6. **Toasts de feedback.** Toda operación de escritura debe mostrar un toast de éxito o error.
7. **No hard-codear datos.** Si un dato viene de la API, no usar valores por defecto inventados.
8. **Paginación consistente.** Usar `PageResponse<T>` y el mismo patrón de carga en todas las listas paginadas.
9. **Interceptor limpio.** No modificar el interceptor por capricho. Las URLs públicas se agregan a la lista una sola vez.
10. **Mocks hasta validar.** No eliminar un mock hasta que el servicio real esté validado en al menos un flujo completo. 
11. **Documentar diferencias.** Cualquier diferencia entre el blueprint y la implementación real del backend se documenta en `BACKEND_CHANGES_FOR_FRONT.md`.
12. **No refactorizar "de paso".** Si un componente necesita refactor, documentarlo como tarea separada, no mezclarlo con la integración.

---

## 9. Alertas Técnicas Detectadas (Actualizadas Post-Auditoría)

> Las alertas originales 9.1-9.8 han sido verificadas contra la API Reference real. Se indica el estado actualizado de cada una y se agregan alertas nuevas.

### 9.1. ~~Inconsistencia de naming: `SolicitudReprogramacion` usa camelCase~~ → CONFIRMADO COMO PROBLEMA
**Estado:** ⬜ Pendiente — La interfaz completa debe reescribirse a snake_case. Además cambió la estructura interna (ver Hallazgo 29 en BACKEND_CHANGES).

### 9.2. ~~Conflicto de `CitaDto` resuelto pero verificar~~ → CONFIRMADO COMO PROBLEMA MAYOR
**Estado:** ✅ Resuelto en Fase 5. Compatibilidad legacy mantenida solo a nivel de normalización de `CitaDto`, no en inyección de mocks.

### 9.3. ~~Endpoint de registro no coincide~~ → ✅ RESUELTO
**Estado:** ✅ — El backend usa `POST /api/usuarios/registro`. El frontend debe ajustar la URL.

### 9.4. ~~`ROL_REGISTRO` vs `RolUsuario` — dos sets de IDs~~ → CONFIRMADO COMO PROBLEMA CRÍTICO
**Estado:** ⬜ Pendiente — Los IDs reales son ADMIN=1, PROFESIONAL=2, RECEPCIONISTA=3. AMBOS sets de constantes del frontend son incorrectos. Ver Hallazgo 22.

### 9.5. ~~/auth/me devuelve datos insuficientes~~ → ✅ RESUELTO
**Estado:** ✅ — `AuthMeResponseDto` expandido ya implementado.

### 9.6. Production environment sin `apiUrl`
**Estado:** ⬜ Pendiente — Se resolverá en Fase 1 (sin cambios).

### 9.7. ~~SesionPaciente vs SesionDto~~ → ✅ RESUELTO (pero hay cambios)
**Estado:** ✅ Parcial — El backend ahora incluye `tipo_sesion` y `resumen`. Pero además agrega `estatus` (ABIERTA/CERRADA/CANCELADA) que el frontend no contempla. Ver Hallazgo 27.

### 9.8. ~~Adjuntos: flujo de upload no definido~~ → ✅ RESUELTO (signed URLs)
**Estado:** ✅ — El backend usa GCS signed URLs con flujo de 3 pasos. El modelo de adjuntos es entity-based con `entidad_tipo`/`entidad_id`. Ver Hallazgo 28.

### 9.9. NUEVA — LoginRequest usa campos incorrectos
**Severidad:** 🔴 Crítica — El login no funciona sin corregir esto.
El frontend envía `{ usuario, contrasena }` pero el backend espera `{ username, password }`. Ver Hallazgo 21.

### 9.10. NUEVA — Todos los enums de estado son UPPERCASE
**Severidad:** 🔴 Crítica — Afecta TODA la app.
`EstadoCita` y `EstadoPago` usan valores UPPERCASE en el backend (`PENDIENTE`, `NO_ASISTIO`, `REPROGRAMADA`). El frontend usa Title Case (`Pendiente`, `No asistió`, `Pospuesta`). Ver Hallazgo 24.
**Estado:** ✅ Resuelto en módulo Citas (Fase 4). Agenda mensual y flujo público se validan en Fases 5 y 12.

### 9.11. NUEVA — CitaDto usa datetimes combinados
**Severidad:** 🔴 Mayor — Afecta todo el módulo de citas y agenda.
El backend envía `fecha_inicio`/`fecha_fin` como datetimes ISO (`2026-04-10T10:00:00`), NO campos separados de fecha y hora. Ver Hallazgo 23.
**Estado:** ✅ Resuelto en módulo Citas (Fase 4). Agenda completa queda para Fase 5.

### 9.12. NUEVA — Endpoints públicos sin prefijo `/api`
**Severidad:** 🟠 Media — El interceptor debe excluir `/public/*` además de las URLs actuales.
Path real: `/public/citas/gestion/{token}`. Métodos: PATCH (no POST) para confirmar/cancelar. Ver Hallazgo 31.

### 9.13. NUEVA — Notas clínicas son entidad independiente
**Severidad:** 🟠 Media — `NotaDto` debe reescribirse como `NotaClinicaDto` con campos nuevos (`titulo`, `tipo_nota`, `visible_en_resumen`). DELETE hace eliminación física. Ver Hallazgo 26.

---

## 10. Checklist Final de Integración

| # | Verificación | Estado |
|---|-------------|--------|
| 1 | Environment configurado para producción | ⬜ |
| 2 | Login/registro/logout funcionan contra API real | ⬜ |
| 3 | Session bootstrap restaura sesión al recargar | ⬜ |
| 4 | Guards protegen rutas correctamente | ⬜ |
| 5 | Interceptor inyecta Bearer y maneja 401 | ⬜ |
| 6 | Pacientes CRUD funciona contra API | ⬜ |
| 7 | Citas CRUD + estados + pagos funciona contra API | ⬜ |
| 8 | Agenda muestra datos reales | ? |
| 9 | Bloqueos horarios CRUD funciona | ? |
| 10 | Sesiones CRUD funciona con adjuntos | ⬜ |
| 11 | Notas clínicas CRUD funciona | ⬜ |
| 12 | Dashboard muestra datos agregados reales | ⬜ |
| 13 | Configuración se lee/escribe desde API | ⬜ |
| 14 | Equipo de recepcionistas funciona | ⬜ |
| 15 | Notificaciones muestran datos reales | ⬜ |
| 16 | Actividad muestra feed real | ⬜ |
| 17 | Estadísticas y reportes funcionan | ⬜ |
| 18 | Página pública de confirmación funciona | ⬜ |
| 19 | Todos los mocks eliminados | ⬜ |
| 20 | Cero console.log() de desarrollo | ⬜ |
| 21 | Todos los error states implementados | ⬜ |
| 22 | Todos los loading states implementados | ⬜ |
| 23 | Todos los empty states implementados | ⬜ |
| 24 | Permisos de recepcionista validados | ⬜ |
| 25 | Responsive mobile verificado | ⬜ |
| 26 | Smoke test integral pasa | ⬜ |
| 27 | Build de producción exitoso | ⬜ |

---

## 11. Matriz Resumen de Fases

| Fase | Prioridad | Complejidad | Dependencias | Riesgo | Impacto funcional | ¿Rompe mocks? | ¿Requiere backend estable? | Estado |
|------|-----------|-------------|-------------|--------|-------------------|----------------|---------------------------|----------------|
| 1 — Fundaciones | Crítica | Baja | Ninguna | Bajo | Infraestructura | No | No | ✅ Completada |
| 2 — Auth y Sesión | Crítica | Media | Fase 1 | Medio | Login/Registro/Sesión | Parcial (SessionMock) | Sí (auth) | ✅ Completada |
| 3 — Pacientes | Alta | Media | Fase 2 | Bajo | CRUD Pacientes | Sí (PacientesMock) | Sí | ✅ Completada |
| 4 — Citas | Alta | Alta | Fase 3 | Medio | CRUD Citas, Estados, Pagos | Sí (CitasMock) | Sí | ✅ Completada (módulo Citas; Agenda en Fase 5) |
| 5 — Agenda/Bloqueos | Alta | Alta | Fase 4 | Alto | Calendario, Bloqueos | Parcial | Sí | ? Completada |
| 6 — Sesiones/Adjuntos | Alta | Alta | Fase 4 | Alto | Sesiones, Upload archivos | Sí (SesionesMock) | Sí + Storage | ⬜ Pendiente |
| 7 — Dashboard | Media | Media | Fases 3-6 | Medio | Resumen, KPIs | Parcial | Sí | ⬜ Pendiente |
| 8 — Configuración | Media | Baja | Fase 2 | Bajo | Ajustes del sistema | No (no hay mock) | Sí | ⬜ Pendiente |
| 9 — Equipo | Media | Baja | Fase 2 | Bajo | Gestión recepcionistas | Sí (EquipoMock) | Sí | ⬜ Pendiente |
| 10 — Actividad/Notif. | Baja | Media | Fase 7 | Medio | Feed, Notificaciones | Parcial | Sí | ⬜ Pendiente |
| 11 — Estadísticas | Baja | Alta | Fases 3-6 | Medio | Reportes, Gráficos | Sí (EstadísticasMock) | Sí | ⬜ Pendiente |
| 12 — Público | Media | Media | Fase 4 | Medio | Confirmación paciente | No (no hay mock) | Sí | ⬜ Pendiente |
| 13 — Hardening | Crítica | Media | Todas | Bajo | Producción | Sí (elimina todo) | Sí | ⬜ Pendiente |

---

## 12. Addendum Post-Auditoría: Correcciones por Fase

> Resultado de la auditoría técnica comparando `FRONTEND_API_REFERENCE.md` contra el frontend actual. Cada fase lista las correcciones concretas que se deben aplicar **ANTES o DURANTE** la integración de ese módulo.

### Fase 1 — Correcciones de Fundaciones

1. **`PageResponse<T>`** — Los campos son snake_case confirmados: `total_elements`, `total_pages`, `number_of_elements`, no camelCase. Crear la interface con estos nombres exactos.
2. **`buildQueryParams()`** — Tener en cuenta que los query params usan naming **mixto** (mayoría camelCase, excepciones snake_case). El helper no puede asumir una convención uniforme.
3. **Interceptor** — Agregar `/public/*` a la lista de URLs excluidas (sin prefijo `/api`). Agregar también URLs de GCS (`storage.googleapis.com`) para el flujo de adjuntos.
4. **`ApiErrorResponse`** — Verificado como correcto contra el backend. Campos: `timestamp`, `status`, `error`, `code`, `message`, `path`, `details[]`.

### Fase 2 — Correcciones de Auth

1. **`LoginRequest`** — Cambiar `{ usuario, contrasena }` → `{ username, password }` (Hallazgo 21).
2. **`ROL_REGISTRO`** — Cambiar a `{ ADMIN: 1, PROFESIONAL: 2, RECEPCIONISTA: 3 }` (Hallazgo 22).
3. **`RolUsuario`** — Cambiar a `{ PROFESIONAL = 2, RECEPCIONISTA = 3 }` (Hallazgo 22).
4. **`LoginResponse`** — El backend devuelve `{ access_token, refresh_token, usuario: UsuarioDto }`. El `UsuarioDto` aquí incluye muchos campos internos. Definir interfaz mínima para lo que se usa.
5. **Session bootstrap** — `GET /api/auth/me` devuelve `AuthMeResponseDto` expandido con `profesional{}` y `permisos{}`. Ya implementado en backend.
6. **Permisos del recepcionista** — El formato de keys del backend es granular y snake_case (`puede_crear_citas`, `puede_ver_pacientes`). Definir mapping hacia/desde `PermisosRecepcionista` del frontend (Hallazgo 30).
7. **Endpoint de registro** — Ruta confirmada: `POST /api/usuarios/registro`.
8. **Flujo forgot-password** — Verificar si el endpoint `POST /api/auth/forgot-password` existe. No se menciona en la API Reference. Podría no estar implementado aún.

### Fase 3 — Correcciones de Pacientes

1. **`PacienteDto`** — Eliminar `citas[]`, `notas[]`, `alertas[]` embebidos. Agregar `sexo`, `contacto_emergencia_nombre`, `contacto_emergencia_telefono` (Hallazgo 25).
2. **Sub-recursos** — Implementar carga lazy por tab:
   - `GET /api/pacientes/{id}/citas` — lista de citas del paciente
   - `GET /api/pacientes/{id}/notas-clinicas` — notas (NO `/notas`)
   - `GET /api/pacientes/{id}/sesiones` — sesiones
   - `GET /api/pacientes/{id}/historial` — historial (paginación en memoria, no Page\<T\> estándar)
   - `GET /api/pacientes/{id}/alertas` — alertas con `id_alerta_paciente`
3. **Resumen** — Nuevo endpoint `GET /api/pacientes/{id}/resumen` para contadores.
4. **`NotaDto` → `NotaClinicaDto`** — Reescribir completamente. Nuevos campos: `titulo`, `tipo_nota`, `visible_en_resumen`, `id_sesion`. Campo renombrado: `id_nota` → `id_nota_clinica`. Adjuntos son entidad separada (Hallazgo 26).
5. **`HistorialEvento`** — Adaptar: `id_historial_evento: number`, `evento_tipo` + `entidad_tipo`, `fecha_evento` (datetime), `metadata_json` (Hallazgo 32).
6. **Alertas** — Confirmado como entidades con `id_alerta_paciente`, `tipo_alerta`, `titulo`, `descripcion`. CRUD completo disponible.
7. **Activar/Desactivar** — Endpoint: `PATCH /api/pacientes/{id}/activo`, NO `DELETE`.

### Fase 4 — Correcciones de Citas (LA MÁS IMPACTADA)

1. **`CitaDto` — Reescritura completa** (Hallazgo 23):
   - `fecha` + `hora_inicio` + `hora_fin` + `duracion` → `fecha_inicio` + `fecha_fin` (datetimes ISO)
   - `estado` → `estado_cita`
   - `notas_rapidas` → `observaciones`
   - Eliminar: `metodo_pago`, `monto_pagado`, `duracion`
   - Agregar: `origen_cita`, `confirmado_por_paciente`, `fecha_confirmacion`, `motivo_cancelacion`
2. **Enums UPPERCASE** (Hallazgo 24):
   - `EstadoCita`: `'PENDIENTE'|'CONFIRMADA'|'COMPLETADA'|'CANCELADA'|'NO_ASISTIO'|'REPROGRAMADA'`
   - `EstadoPago`: `'PENDIENTE'|'PARCIAL'|'PAGADO'|'NO_APLICA'|'REEMBOLSADO'`
   - Eliminar `MetodoPago` type
   - Crear mapeo de labels para UI: `ESTADO_CITA_LABEL` y `ESTADO_PAGO_LABEL`
3. **Acciones de estado** — Endpoints individuales (NO `PATCH /citas/{id}/estado` genérico):
   - `PATCH /api/citas/{id}/confirmar`
   - `PATCH /api/citas/{id}/completar`
   - `PATCH /api/citas/{id}/cancelar` (body: `{ motivo_cancelacion }`)
   - `PATCH /api/citas/{id}/no-asistio`
4. **Pago** — `PATCH /api/citas/{id}/pago` con body `{ estado_pago, monto }`. Sin `metodo_pago`.
5. **Disponibilidad** — ✅ Confirmada: `GET /api/citas/disponibilidad?fecha=X&duracion_min=Y` devuelve `slots_disponibles[]`.
6. **Token de gestión pública** — `POST /api/citas/{id}/tokens-confirmacion` devuelve el token plano UNA SOLA VEZ. Mostrar en modal bloqueante con "Copiar link".
7. **Solicitudes como sub-recurso** — `GET /api/citas/{id}/solicitudes-reprogramacion` (no endpoint top-level).
8. **Filtros** — Query params en camelCase: `?pacienteId=15&fechaDesde=...&estadoCita=PENDIENTE&search=...`
9. **Búsqueda** — ✅ Confirmada: param `search` busca por nombre/apellido de paciente + motivo.

### Fase 5 — Correcciones de Agenda/Bloqueos

1. **Agenda consolidada** — ✅ `GET /api/agenda?mes=X&anio=Y` devuelve `{ citas[], bloqueos[], config_jornada{} }`.
2. **Horarios Laborales** — Nueva entidad `HorarioLaboralDto`: CRUD en `/api/horarios-laborales`. Campos: `dia_semana` (1=Lunes...7=Domingo), `hora_inicio`, `hora_fin`, `activo`.
3. **Bloqueos** — CRUD en `/api/bloqueos-horarios`. Campos: `fecha`, `hora_inicio`, `hora_fin`, `motivo_bloqueo`, `todo_el_dia`.
4. **Calendario** — `GET /api/citas/calendario?mes=X&anio=Y` devuelve citas del mes para pintar en el calendario.

### Fase 6 — Correcciones de Sesiones/Adjuntos

1. **`SesionDto`** — Agregar: `tipo_sesion`, `estatus` (ABIERTA/CERRADA/CANCELADA), `resumen`, `fecha_sesion`. Cambio de estatus vía `PATCH /api/sesiones/{id}/estatus` (Hallazgo 27).
2. **Creación** — `POST /api/sesiones` con `{ id_cita }`. Si ya existe → 409 → `GET /api/citas/{id}/sesion`.
3. **Adjuntos — Modelo nuevo** (Hallazgo 28):
   - Crear `ArchivoAdjuntoDto` (entity-based: `id_archivo_adjunto`, `nombre_original`, `mime_type`, `tamano_bytes`, `entidad_tipo`, `entidad_id`, `url_descarga`)
   - Flujo de 3 pasos con signed URLs
   - Remover `adjunto?` inline de SesionDto
   - Agregar `storage.googleapis.com` a exclusiones del interceptor

### Fase 7 — Correcciones de Dashboard

1. **Dashboard consolidado** — ✅ `GET /api/dashboard/consolidado` devuelve todo en una llamada: resumen, agendaHoy, estadísticas de citas y pacientes.
2. **Endpoints individuales disponibles:** `/api/dashboard/resumen`, `/api/dashboard/agenda-hoy`, `/api/dashboard/estadisticas-citas`, `/api/dashboard/estadisticas-pacientes`.
3. **Solicitudes** — Son sub-recurso de citas ahora. El endpoint top-level para pendientes podría no existir. Verificar.
4. **Notificaciones** — `GET /api/notificaciones` paginado con filtros. Sin endpoint `/no-leidas/count` documentado — puede que necesite calcularse en frontend.
5. **`SolicitudReprogramacion`** — Reescribir a snake_case (Hallazgo 29).

### Fase 8 — Correcciones de Configuración

1. **Configuración unificada** — El backend usa un solo endpoint `GET /api/configuracion` que devuelve `ConfiguracionSistemaDto` con todos los campos. Se auto-crea al registrar profesional.
2. **Recordatorios** — Entidad separada: CRUD `/api/configuracion-recordatorios`. Cada regla tiene `canal`, `anticipacion_minutos`, `mensaje_personalizado`.
3. **Código de vinculación** — `GET /api/codigos-vinculacion/me` y `POST /api/codigos-vinculacion/regenerar`.
4. **Perfil profesional** — `GET /api/profesionales/{id}` y `PUT /api/profesionales/{id}`.

### Fase 12 — Correcciones de Endpoints Públicos

1. **Path** — `/public/citas/gestion/{token}` (sin `/api`, con `gestion` no `confirmar`).
2. **Métodos HTTP** — Confirmar: `PATCH`. Cancelar: `PATCH`. Reprogramar: `POST .../solicitudes-reprogramacion`.
3. **Token expirado/usado** — Retorna 200 (no 404) con `token_valido: false` y `accion_realizada`. Solo retorna 404 si el token no existe en BD.
4. **Datos de respuesta** — `CitaGestionPublicaResponseDto` incluye: `profesional_nombre`, `profesional_especialidad`, `nombre_consulta`, flags `puede_confirmar`/`puede_cancelar`/`puede_solicitar_reprogramacion`.

---

*Documento actualizado el 05/04/2026 — Cierre Fase 7 (Dashboard y Resumen General) con API real.*  
*Se actualizará conforme avancemos fase por fase.*


