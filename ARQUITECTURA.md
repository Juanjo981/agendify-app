# Auditoría de Arquitectura Frontend — Agendify
> Fecha: 17 de marzo de 2026 | Versión: 0.0.1-prealpha | Rama: main

---

## 1. Estructura de Carpetas — Estado Actual

La estructura base es correcta y reconocible para un proyecto Angular + Ionic:

```
src/app/
├── auth/                         ✅ Bien encapsulado
├── guards/                       ✅ Correcto
├── services/                     ⚠️  Solo 4 archivos, resto están dispersos en pages/
├── pages/                        ✅ Bien organizado por dominio
│   ├── agenda/
│   ├── citas/
│   │   ├── components/           ✅ Bien
│   │   └── models/               ✅ Bien
│   ├── pacientes/
│   │   ├── components/
│   │   ├── pacientes.mock.ts     🔴 MEZCLA tipos + datos de prueba
│   │   └── (sin carpeta models/) 🔴 No tiene models/ separado
│   ├── sesiones/
│   │   └── models/               ✅ Bien
│   ├── estadisticas/
│   │   ├── components/ (12 items) ✅ Bien organizado
│   │   └── models/               ✅ El mejor ejemplo del proyecto
│   └── ...
└── shared/
    ├── components/               ✅ Correcto
    └── models/                   ✅ Correcto
```

**Evaluación general:** La estructura es sólida, con una evolución positiva visible — las páginas más recientes están mejor organizadas que las primeras.

---

## 2. Inventario Completo de Archivos

### Páginas (17 total)

| Página | Archivos | Servicios inyectados | Resumen |
|--------|----------|---------------------|---------|
| **login** | login.page.ts/html/scss | AuthService, NavController | Formulario de login, modal forgot-password (no conectado) |
| **dashboard** | dashboard.page.ts/html/scss | AuthService, AuthorizationService, SolicitudReprogramacionService | Layout principal: sidebar, navbar, notificaciones hardcodeadas, modal de reprogramación, confirm logout |
| **agenda** | agenda.page.ts/html/scss | CitasMockService, PacientesMockService, SolicitudReprogramacionService, PopoverController | Vista mensual de calendario, panel crear cita, búsqueda de paciente. **⚠️ 400+ líneas** |
| **citas** | citas.page.ts/html/scss | CitasMockService, Router | Lista de citas con búsqueda/filtro, modales de crear/editar/reprogramar |
| **detalle-cita** | detalle-cita.page.ts/html/scss | CitasMockService, SesionesMockService, Router, ActivatedRoute | Detalle de cita, editar, reprogramar, pago, crear sesión, cambio de estado |
| **pacientes** | pacientes.page.ts/html/scss | PacientesMockService, Router | Lista de pacientes con búsqueda/filtro/orden, modales CRUD, alertas clínicas |
| **paciente-detalle** | paciente-detalle.page.ts/html/scss | PacientesMockService, Router, ActivatedRoute, AlertController, html2pdf | Perfil multi-sección (Info, Citas, Sesiones, Notas, Historial), PDF export |
| **sesiones** | sesiones.page.ts/html/scss | SesionesMockService, Router | Lista de notas clínicas con búsqueda/filtro, badge de adjuntos |
| **detalle-sesion** | detalle-sesion.page.ts/html/scss | SesionesMockService, Router, ActivatedRoute, AlertController | Detalle de sesión, editar, adjuntos (preview/descarga), mapeo de iconos por tipo |
| **configuracion** | configuracion.page.ts/html/scss | EquipoMockService, ActivatedRoute | Tabs de configuración (General, Agenda, Equipo, Seguridad, Sistema), ~40 propiedades, tracking de cambios, reset |
| **estadisticas** | estadisticas.page.ts/html/scss + 5 sub-páginas | EstadisticasMockService | Punto de entrada analytics, submenu, delega a sub-páginas |
| **registro** | registro.page.ts/html/scss | UsuarioService, VinculacionMockService, NavController | Formulario de registro, toggle Profesional/Recepcionista, validación código beta (hardcodeado) |
| **perfil** | perfil.page.ts/html/scss | — | Perfil profesional editable, horarios, integraciones UI (Google, WhatsApp, Pagos — no implementadas), seguridad |
| **acceso-restringido** | acceso-restringido.page.ts/html/scss | AuthorizationService, Router, ActivatedRoute | Página de permiso denegado, muestra módulo desde query param |
| **actividad** | actividad.page.ts/html/scss | SolicitudReprogramacionService, Router | Historial de actividad, feed de solicitudes, filtros, aceptar/rechazar/ver |
| **confirmar-cita** | confirmar-cita.page.ts/html/scss | — | Página pública para pacientes (enlace SMS), confirmar/reprogramar/cancelar, máquina de estados (7 estados). **TODO: integrar :token** |
| **soporte** | soporte.page.ts/html/scss | — | FAQ acordeón (10+ preguntas), información de versión |

### Servicios

#### Autenticación y Autorización

| Archivo | Clase | Métodos principales | Dependencias |
|---------|-------|---------------------|--------------|
| `services/auth.ts` | `AuthService` | `login()`, `logout()`, `isLoggedIn()`, `getUsuario()`, `getNombre()`, `forgotPassword()` | HttpClient, environment |
| `services/session.mock.ts` | `SessionMockService` | `getCurrentUser()`, `getRol()`, `esProfesional()`, `esRecepcionista()`, `setCurrentUser()`, `clearSession()` | — (estado en memoria) |
| `auth/authorization.service.ts` | `AuthorizationService` | `isProfesional()`, `hasPermission(Permiso)`, `canAccessModule()`, `canAccessRoute()`, `canAccessSegmento()` | SessionMockService |
| `guards/permisos.guard.ts` | `permisosGuard` (CanActivateFn) | Verifica `canAccessSegmento()`, redirige a `/acceso-restringido?origen=<seg>` | AuthorizationService, Router |

#### Servicios de Dominio (todos mock)

| Archivo | Métodos principales | Datos de prueba | Problemas |
|---------|---------------------|-----------------|-----------|
| `pages/citas/citas.service.mock.ts` | `getCitas()`, `getCitaById()`, `createCita()`, `updateCita()`, `updateEstado()`, `reprogramarCita()`, `updatePago()`, `deleteCita()` | 15 citas | — |
| `pages/pacientes/pacientes.mock.ts` | `getAll()`, `getById()`, `create()`, `update()`, `delete()`, `addNota()`, `updateNota()`, `deleteNota()`, `getSesiones()` | ~8 pacientes con citas, notas, sesiones embebidas | 🔴 Mezcla interfaces + datos |
| `pages/sesiones/sesiones.service.mock.ts` | `getAllSesiones()`, `getSesionesByPaciente()`, `getSesionByCita()`, `getSesionById()`, `createSesion()`, `updateSesion()`, `deleteSesion()` | 5 sesiones (3 con adjuntos) | — |
| `pages/citas/solicitud-reprogramacion.service.mock.ts` | `getAll()`, `getPendientes()`, `getByCita()`, `getById()`, `aceptar()`, `rechazar()` | 2 solicitudes pendientes | — |
| `services/equipo.mock.ts` | `getRecepcionistasDelProfesional()`, `getProfesionalActual()`, `getCodigoVinculacion()`, `updateRecepcionistaPermisos()`, `setRecepcionistaActivo()` | 1 profesional, 1 recepcionista | ⚠️ Hace demasiado: mezcla profesional + equipo + códigos |
| `services/vinculacion.mock.ts` | `getProfesionales()`, `getProfesionalById()`, `validarCodigoVinculacion()`, `getProfesionalByCodigo()` | 1 profesional | — |
| `pages/estadisticas/estadisticas.service.mock.ts` | `getFiltrosIniciales()`, `getResumenKpis()`, `getKpiCards()`, `getCitasChart()`, `getIngresosChart()`, `getPacientesChart()`, `getReportData()`, `exportarReporte()` | 20+ métodos de datos mock | ⚠️ Algunas páginas de estadísticas no usan todos los métodos |

#### Servicio Compartido

| Archivo | Propósito |
|---------|-----------|
| `shared/components/agf-picker-registry.service.ts` | Singleton global: garantiza que solo 1 date/time picker esté abierto a la vez |

### Modelos e Interfaces

#### Modelos de Autorización/Permisos

| Archivo | Exportaciones |
|---------|--------------|
| `auth/permission.types.ts` | `enum Permiso` (5 permisos), `enum Modulo` (8 módulos), `type ModuloId` |
| `auth/permission.maps.ts` | `MODULO_PERMISO`, `SEGMENTO_MODULO`, `RUTA_MODULO` (3 tablas de verdad) |
| `shared/models/rol.model.ts` | `enum RolUsuario { PROFESIONAL = 3, RECEPCIONISTA = 4 }`, `ROL_LABEL` |
| `shared/models/permisos.model.ts` | `interface PermisosRecepcionista`, `PERMISOS_DEFAULT_RECEPCIONISTA`, `PERMISO_LABEL` |
| `shared/models/usuario.model.ts` | `interface UsuarioRegistroDto`, `interface UsuarioMock` |
| `shared/models/equipo.model.ts` | `interface PermisoDetalle`, `interface RecepcionistaEquipoViewModel` |
| `shared/models/solicitud-reprogramacion.model.ts` | `type EstadoSolicitud`, `interface SolicitudReprogramacion` |

#### Modelos de Dominio

| Archivo | Exportaciones |
|---------|--------------|
| `pages/citas/models/cita.model.ts` | `interface CitaDto`, `type EstadoCita` (6 estados), `type EstadoPago`, `type MetodoPago`, `interface FiltroCitas` |
| `pages/sesiones/models/sesion.model.ts` | `interface SesionAdjunto`, `interface SesionDto` |
| `pages/pacientes/pacientes.mock.ts` | `interface PacienteDto`, `interface NotaDto`, **`interface CitaDto` (LOCAL — ⚠️ CONFLICTO)**, `interface SesionPaciente`, `type HistorialTipoEvento`, `interface HistorialEvento` |
| `pages/estadisticas/models/estadisticas.model.ts` | `KpiCard`, `EstadisticasResumen`, `CitasPorPeriodo`, `IngresoPorPeriodo`, `PacienteEstadistica`, `RankingPaciente`, etc. (20+ tipos, muy completo) |
| `pages/estadisticas/models/filtros-estadisticas.model.ts` | `interface FiltroEstadisticas` |

### Componentes Compartidos (shared/components/, 8 principales)

| Componente | Propósito | Standalone |
|------------|-----------|-----------|
| `agf-date-picker` | Selector de fecha personalizado con vista mensual | ✅ |
| `agf-time-picker` | Selector de hora con tabs hora/minuto | ✅ |
| `cita-form-modal` | Modal crear/editar cita | ✅ |
| `date-picker-field` | Wrapper campo input + date picker | ✅ |
| `forgot-password` | Modal recuperación de contraseña | ✅ |
| `mini-calendar` | Widget calendario mensual (solo display) | ✅ |
| `solicitud-reprogramacion-modal` | Revisar solicitud de reprogramación | ✅ |
| `confirm-dialog` | Diálogo genérico OK/Cancelar configurable | ✅ |

### Componentes de Páginas (20+ en total)

**Citas:** `cita-card`, `cita-filtros`, `buscar-paciente-modal`, `reprogramar-modal`, `estado-badge`, `pago-badge`, `cqa-popover`

**Estadísticas:** `estadisticas-submenu`, `chart-citas-por-periodo`, `chart-ingresos`, `chart-citas-resumen`, `chart-estados-cita`, `chart-pacientes`, `resumen-kpis`, `tabla-reportes`, `exportar-reporte-modal`, `filtros-estadisticas`, `insights-estadisticas`, `resumen-caja-diaria`

**Pacientes:** `paciente-submenu` (tab switcher para detalle)

**Sesiones:** `sesion-form`, `archivo-adjunto`, `historial-sesiones`

---

## 3. Problemas Detectados

### 🔴 Crítico

#### CitaDto definida en dos lugares con estructuras distintas

| Archivo | Campos distintos | Tipo de definición |
|---------|-----------------|-------------------|
| `pages/citas/models/cita.model.ts` | `hora_inicio`, `hora_fin`, `EstadoCita` tipado, `EstadoPago`, `MetodoPago` | Completo y tipado |
| `pages/pacientes/pacientes.mock.ts` | Solo `hora`, sin estados tipados | Simplificado e incompatible |

**Impacto:** Cuando el backend devuelva la entidad `Cita`, una de las dos definiciones quedará rota. Es el problema más urgente antes de diseñar el schema de base de datos.

#### `pacientes.mock.ts` mezcla interfaces + datos de prueba

No existe `pacientes.model.ts`. Las interfaces y los datos mock conviven en el mismo archivo, haciendo imposible importar solo los tipos sin arrastrar los datos.

---

### 🟠 Importante

#### Nomenclatura inconsistente en servicios mock

| Patrón esperado | Archivos que lo siguen | Archivos que NO lo siguen |
|----------------|----------------------|--------------------------|
| `*.service.mock.ts` | `citas.service.mock.ts`, `sesiones.service.mock.ts`, `solicitud-reprogramacion.service.mock.ts` | `pacientes.mock.ts`, `vinculacion.mock.ts`, `equipo.mock.ts`, `session.mock.ts` |

Los archivos que son servicios `@Injectable` deben llamarse `*.service.mock.ts`. Los que solo exportan datos pueden ser `*.data.mock.ts`.

#### Servicios que deberían existir pero no existen

| Servicio faltante | Dónde vive actualmente la lógica |
|-------------------|----------------------------------|
| `NotificationsService` | Array hardcodeado en `dashboard.page.ts` |
| `ConfigService` | `DEFAULTS` const + lógica de reset en `configuracion.page.ts` |
| `CalendarService` | ~400 líneas de lógica de calendario en `agenda.page.ts` |

#### Lógica de negocio en componentes que debería estar en servicios

| Página | Lógica a extraer |
|--------|-----------------|
| `agenda.page.ts` | Generación del grid de calendario, cálculo de semanas, disponibilidad de slots |
| `dashboard.page.ts` | Array de notificaciones, `tiempoRelativo()`, `formatFechaCita()` |
| `configuracion.page.ts` | `DEFAULTS` const, `hasChanges()`, lógica de reset |
| `paciente-detalle.page.ts` | Exportación PDF directamente en el componente |

#### `equipo.mock.ts` hace demasiado

Mezcla lógica del profesional actual, gestión del equipo, códigos de vinculación y permisos en un solo servicio. Debería dividirse conforme crezca.

---

### 🟡 Menor

#### Código duplicado en múltiples lugares

| Función | Dónde aparece duplicada |
|---------|------------------------|
| `avatarColor(nombre: string)` | `pacientes.page.ts`, `paciente-detalle.page.ts`, `sesiones.page.ts` |
| `formatFecha(iso: string)` | `actividad.page.ts`, `agenda.page.ts`, `dashboard.page.ts` |
| `tiempoRelativo(iso: string)` | `actividad.page.ts`, `dashboard.page.ts` |

Todos deberían vivir en `shared/utils/` como funciones puras, o en un pipe Angular de formato de fecha.

#### Datos de prueba hardcodeados en componentes

- Notificaciones del dashboard (array directo en el componente)
- Eventos de ejemplo en la agenda
- `BETA_INVITE_CODES` en `registro.page.ts`

---

## 4. Calidad de la Arquitectura

| Aspecto | Puntuación | Observaciones |
|---------|-----------|---------------|
| **Routing** | 9/10 | Lazy-loaded, estructura clara, guards funcionales, ruta pública lista para token |
| **Auth/Autorización** | 8/10 | Excelente separación de responsabilidades; listo para JWT real |
| **Servicios** | 6/10 | Estructura CRUD sólida pero 100% mock; faltan NotificationsService, ConfigService, CalendarService |
| **Modelos** | 6/10 | Bien tipados en general; pendiente resolver conflicto CitaDto |
| **Componentes** | 7/10 | Todos standalone y reutilizables; agenda.page.ts demasiado grande |
| **Organización de código** | 7/10 | Buena separación; los modelos están dispersos en archivos `.mock.ts` |
| **Testing** | 2/10 | Archivos spec.ts existen pero están vacíos o con boilerplate |
| **Manejo de errores** | 2/10 | Casi inexistente: sin error handling HTTP, sin loading states, sin snackbars |
| **Documentación** | 4/10 | Buena cobertura JSDoc en la capa auth; escasa en el resto |

**Puntuación general: 6.5/10** — Fundación sólida con 100% datos mock y sin integración backend.

---

## 5. Estructura Ideal Recomendada

```
src/app/
├── auth/                             (sin cambios)
├── guards/                           (sin cambios)
│
├── core/                             ← NUEVO
│   ├── services/
│   │   ├── notifications.service.ts  ← extraer de dashboard.page.ts
│   │   ├── config.service.ts         ← extraer de configuracion.page.ts
│   │   └── calendar.service.ts       ← extraer de agenda.page.ts
│   └── utils/
│       ├── date.utils.ts             ← formatFecha(), tiempoRelativo()
│       └── avatar.utils.ts           ← avatarColor()
│
├── services/                         (renombrar uniformemente)
│   ├── auth.service.ts               ← auth.ts
│   ├── usuario.service.ts            ← usuario.ts
│   ├── session.service.mock.ts       ← session.mock.ts
│   ├── equipo.service.mock.ts        ← equipo.mock.ts
│   └── vinculacion.service.mock.ts   ← vinculacion.mock.ts
│
├── pages/
│   ├── pacientes/
│   │   ├── models/
│   │   │   └── paciente.model.ts     ← extraer interfaces de pacientes.mock.ts
│   │   ├── pacientes.service.mock.ts ← renombrar, solo datos
│   │   └── ...
│   └── (resto sin cambios estructurales mayores)
│
└── shared/
    ├── components/                   (sin cambios)
    ├── models/                       (sin cambios)
    └── pipes/                        ← NUEVO
        ├── fecha-relativa.pipe.ts
        └── formato-fecha.pipe.ts
```

---

## 6. Lista de Mejoras — Prioridades

### Antes de rediseñar el backend (orden recomendado)

| # | Acción | Razón |
|---|--------|-------|
| 1 | **Unificar `CitaDto` en `pages/citas/models/cita.model.ts`** y eliminar la definición local de `pacientes.mock.ts` | El backend necesita mapear a una sola interfaz |
| 2 | **Crear `pages/pacientes/models/paciente.model.ts`** con `PacienteDto`, `NotaDto`, `HistorialEvento` | Separar tipos de datos mock antes de conectar la API |
| 3 | **Renombrar servicios inyectables** a `*.service.mock.ts` uniformemente | Facilita el swap futuro mock → real con mínimos cambios de import |
| 4 | **Extraer `formatFecha`, `tiempoRelativo`, `avatarColor`** a `shared/utils/` | Evitar reescribirlos cuando se integre el backend real |
| 5 | **Crear `NotificationsService`** con la interfaz definida (aunque vacía) | Definir el contrato antes de diseñar el endpoint de notificaciones |
| 6 | **Documentar qué campos de `CitaDto` son calculados vs almacenados** | Crítico para diseñar el schema de base de datos correctamente |
| 7 | **Marcar `// TODO: conectar API`** explícitamente en todos los métodos mock | Evitar confundir lógica mock con lógica real al refactorizar |

### Fase backend (una vez conectado el API)

| # | Acción |
|---|--------|
| 8 | Reemplazar todos los servicios mock con HttpClient + interceptores |
| 9 | Integrar JWT real: swap `SessionMockService.getCurrentUser()` con decodificador de token |
| 10 | Agregar manejo de errores HTTP + loading states + feedback al usuario (toasts/snackbars) |
| 11 | Implementar librería de gráficas real (Chart.js / ApexCharts) para estadísticas |
| 12 | Conectar flujo `confirmar-cita` con endpoint real (token en URL) |

### Mejoras a largo plazo

| # | Acción |
|---|--------|
| 13 | Agregar tests unitarios significativos (Jest o Karma) |
| 14 | Agregar soporte i18n (ngx-translate) |
| 15 | Extraer pipes de formato de fecha a `shared/pipes/` |
| 16 | Dividir `equipo.mock.ts` en `profesional.service` + `recepcionistas.service` |
| 17 | Agregar `CalendarService` para extraer lógica de `agenda.page.ts` |

---

## 7. Lo que Funciona Bien ✅

- **Capa auth/autorización:** Separación excelente entre `AuthService` (credenciales) → `SessionMockService` (identidad) → `AuthorizationService` (política). Diseño listo para integración JWT real.
- **Sistema de permisos:** `permission.types.ts` + `permission.maps.ts` + directiva `*appHasPermission` — arquitectura limpia, centralizada y extensible.
- **Routing:** Lazy-loaded, guards correctamente integrados, ruta pública `confirmar-cita` preparada para integración con token SMS.
- **Standalone components:** Toda la app usa standalone de forma consistente, sin NgModules innecesarios. Buena adopción de Angular moderno.
- **Módulo estadísticas:** El mejor área del proyecto — modelos bien separados, 12 componentes bien divididos, servicio completo con todos los métodos necesarios.
- **Modal de solicitudes de reprogramación:** Componente bien encapsulado, reutilizado correctamente en Dashboard, Agenda y Actividad.
- **Nomenclatura de archivos:** Consistente en el 80% del proyecto (`*.page.ts/html/scss`, `*.component.ts/html/scss`, `*.model.ts`).

---

*Generado el 17/03/2026 — Agendify v0.0.1-prealpha*
