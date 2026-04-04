# Agendify — Referencia de API para Frontend

> **Audiencia:** Desarrolladores Angular + Ionic que consumen la API REST de Agendify.  
> **Base URL:** `http://localhost:8080`  
> **Formato de fechas:** ISO-8601 (`"2026-04-03T14:30:00"` para datetime, `"2026-04-03"` para date, `"09:30:00"` para time)  
> **Naming convention JSON:** `snake_case` (los campos Java ya están definidos en snake_case). Configurado globalmente con `spring.jackson.property-naming-strategy=SNAKE_CASE`. Los metadatos de `Page<T>` también usan snake_case (`total_elements`, `total_pages`, etc.).

---

## Tabla de Contenidos

1. [Flujo de Autenticación en Frontend](#1-flujo-de-autenticación-en-frontend)
2. [Convenciones Globales para Frontend](#2-convenciones-globales-para-frontend)
3. [Auth / Sesión](#3-auth--sesión)
4. [Dashboard](#4-dashboard)
5. [Pacientes](#5-pacientes)
6. [Citas](#6-citas)
7. [Calendario y Disponibilidad](#7-calendario-y-disponibilidad)
8. [Sesiones Clínicas](#8-sesiones-clínicas)
9. [Notas Clínicas](#9-notas-clínicas)
10. [Archivos Adjuntos](#10-archivos-adjuntos)
11. [Horarios Laborales y Bloqueos](#11-horarios-laborales-y-bloqueos)
12. [Configuración del Sistema y Recordatorios](#12-configuración-del-sistema-y-recordatorios)
13. [Notificaciones](#13-notificaciones)
14. [Historial de Eventos](#14-historial-de-eventos)
15. [Endpoints Públicos para el Paciente](#15-endpoints-públicos-para-el-paciente)
16. [Administración (ADMIN)](#16-administración-admin)
17. [Checklist de Servicios Angular Recomendados](#17-checklist-de-servicios-angular-recomendados)
18. [Flujos de UI Recomendados](#18-flujos-de-ui-recomendados)
19. [Inconsistencias y Observaciones](#19-inconsistencias-y-observaciones)

---

## 1. Flujo de Autenticación en Frontend

### Paso a paso recomendado

```
1. LOGIN
   POST /api/auth/login  { usuario, contrasena }
   → Guardar access_token y refresh_token en storage seguro (Capacitor SecureStorage / localStorage)
   → Guardar datos del usuario (response.usuario) en estado global (NgRx / signal / BehaviorSubject)
   → Navegar a /dashboard

2. INTERCEPTOR HTTP
   → Agregar header: Authorization: Bearer {access_token}
   → Si respuesta es 401:
     a) Intentar refresh automático: POST /api/auth/refresh { refresh_token }
     b) Si refresh OK → actualizar access_token y reintentar request original
     c) Si refresh falla (401) → limpiar storage → navegar a /login

3. GUARD DE RUTAS
   → canActivate: verificar si hay access_token en storage
   → Si no hay → redirigir a /login
   → Opcionalmente verificar expiración del JWT localmente (decodificar payload)

4. CARGAR PERFIL ACTUAL
   → Al iniciar la app (AppInitializer o constructor de AuthService):
     GET /api/auth/me → cargar usuario actual y rol
   → Usar el rol para mostrar/ocultar rutas y features (ADMIN, PROFESIONAL, RECEPCIONISTA)

5. LOGOUT
   → POST /api/auth/logout { refresh_token }
   → Limpiar storage
   → Limpiar estado global
   → Navegar a /login

6. SESIÓN EXPIRADA
   → Si el refresh falla: mostrar toast "Tu sesión ha expirado" + redirigir a /login
   → No mostrar alert bloqueante si el usuario ya estaba en login
```

### Estructura recomendada del interceptor

```typescript
// Pseudocódigo — adaptar a tu versión de Angular
intercept(req, next) {
  const token = this.authService.getAccessToken();
  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next.handle(req).pipe(
    catchError(err => {
      if (err.status === 401 && !req.url.includes('/auth/')) {
        return this.authService.refresh().pipe(
          switchMap(() => next.handle(req.clone({
            setHeaders: { Authorization: `Bearer ${this.authService.getAccessToken()}` }
          }))),
          catchError(() => {
            this.authService.logout();
            return throwError(() => err);
          })
        );
      }
      return throwError(() => err);
    })
  );
}
```

---

## 2. Convenciones Globales para Frontend

### 2.1 Formato de errores

Todas las respuestas de error siguen esta estructura:

```json
{
  "timestamp": "2026-04-03T14:30:00",
  "status": 400,
  "error": "Bad Request",
  "code": "VALIDATION_ERROR",
  "message": "Error de validacion en los datos enviados",
  "path": "/api/pacientes",
  "details": ["nombre: El nombre es obligatorio"]
}
```

> Los campos con valor `null` se omiten del JSON (no aparecen en la respuesta).

**Códigos de error que el frontend debe manejar:**

| HTTP | `code` | Significado para la UI | Acción recomendada |
|---|---|---|---|
| 400 | `VALIDATION_ERROR` | Campos del formulario inválidos | Mostrar errores inline por campo (usar `details[]`) |
| 400 | `MALFORMED_JSON` | Body mal formado | Mostrar error genérico "Datos inválidos" |
| 400 | `MISSING_PARAMETER` | Falta query param obligatorio | Bug del frontend — revisar llamada |
| 400 | `TYPE_MISMATCH` | Tipo de dato incorrecto en param | Bug del frontend — revisar llamada |
| 400 | `INVALID_ARGUMENT` | Error de negocio (ej: rango de fechas inválido) | Mostrar `message` al usuario |
| 401 | `UNAUTHORIZED` | Token expirado o inválido | Intentar refresh → si falla, redirigir a login |
| 403 | `FORBIDDEN` | Sin permisos para esta acción | Mostrar "No tienes permisos" / ocultar opción en UI |
| 404 | *(varía)* | Recurso no encontrado | Mostrar "No encontrado" / navegar a lista |
| 409 | *(varía)* | Conflicto de negocio | Mostrar `message` al usuario (ej: "Ya existe sesión para esta cita") |
| 409 | `DATA_INTEGRITY_ERROR` | Violación de restricción en BD | Mostrar "Esta operación no es posible" con `message` |
| 409 | `ILLEGAL_STATE` | Estado no válido para la operación | Mostrar `message` al usuario |
| 500 | `INTERNAL_ERROR` | Error del servidor | Mostrar "Error inesperado, intenta más tarde" |

**Manejo recomendado en un servicio de errores global:**

```typescript
handleError(error: HttpErrorResponse): string {
  const body = error.error;
  if (body?.code === 'VALIDATION_ERROR' && body?.details?.length) {
    return body.details.join('\n');
  }
  return body?.message || 'Error inesperado';
}
```

### 2.2 Respuestas paginadas

Los endpoints paginados devuelven un objeto `Page<T>` de Spring Data:

```json
{
  "content": [ { ... }, { ... } ],
  "total_elements": 42,
  "total_pages": 3,
  "number": 0,
  "size": 20,
  "first": true,
  "last": false,
  "empty": false,
  "number_of_elements": 20,
  "pageable": {
    "page_number": 0,
    "page_size": 20,
    "sort": { "sorted": true, "unsorted": false, "empty": false },
    "offset": 0,
    "paged": true,
    "unpaged": false
  },
  "sort": { "sorted": true, "unsorted": false, "empty": false }
}
```

> **Nota:** Con la configuración global de Jackson `SNAKE_CASE`, los metadatos de paginación cambiaron de `camelCase` a `snake_case` (ej: `totalElements` → `total_elements`, `totalPages` → `total_pages`, `numberOfElements` → `number_of_elements`).

**Query params de paginación:**

| Param | Tipo | Default | Ejemplo |
|---|---|---|---|
| `page` | int | `0` | `?page=0` (primera página) |
| `size` | int | `20` | `?size=10` |
| `sort` | string | varía por endpoint | `?sort=fecha_inicio,desc` |

**Interface TypeScript recomendada:**

```typescript
interface Page<T> {
  content: T[];
  total_elements: number;
  total_pages: number;
  number: number;      // página actual (0-indexed)
  size: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}
```

**Endpoints paginados:**

| Endpoint | Sort default |
|---|---|
| `GET /api/pacientes` | `idPaciente` |
| `GET /api/citas` | `fecha_inicio` |
| `GET /api/sesiones` | `fecha_sesion` |
| `GET /api/notas-clinicas` | `created_at` |
| `GET /api/archivos-adjuntos` | `created_at` |
| `GET /api/notificaciones` | `created_at` |
| `GET /api/historial-eventos` | `fecha_evento` |
| Sub-recursos paginados de pacientes/citas/sesiones | `created_at` o `fecha_*` |

**Endpoints NO paginados (devuelven lista simple `[]`):**

| Endpoint | Comentario |
|---|---|
| `GET /api/horarios-laborales` | Pocos registros por profesional |
| `GET /api/bloqueos-horario` | Lista filtrada |
| `GET /api/configuracion-recordatorios` | Pocas reglas |
| `GET /api/usuarios` | Lista simple |
| `GET /api/roles` | Catálogo pequeño |
| `GET /api/codigos-beta` | Solo ADMIN |
| `GET /api/refresh-tokens` | Lista simple |
| `GET /api/recepcionistas` | Pocos por profesional |
| `GET /api/profesionales` | Solo ADMIN |

### 2.3 Ownership implícito

El backend filtra datos automáticamente por el profesional autenticado:
- Si el usuario tiene rol **PROFESIONAL**: solo ve sus datos.
- Si el usuario tiene rol **RECEPCIONISTA**: ve los datos del profesional al que está vinculado.

> **Implicación para frontend:** No necesitas pasar `id_profesional` en ningún request. El backend lo resuelve del JWT.

### 2.4 PATCH vs PUT

| Método | Uso |
|---|---|
| `PUT` | Actualización completa de un recurso (enviar todos los campos editables) |
| `PATCH` | Operaciones puntuales: cambiar estado, activar/desactivar, acciones específicas |

### 2.5 Formato de fechas en query params

Para filtros con fechas, usar formato ISO sin encoding especial:
- DateTime: `?fechaDesde=2026-04-01T00:00:00&fechaHasta=2026-04-30T23:59:59`
- Date: `?fecha=2026-04-03`
- Time: `09:00:00`

---

## 3. Auth / Sesión

### Propósito
Gestiona el ciclo de vida de la sesión del usuario: login, refresh de tokens, logout y consulta del perfil actual.

### Pantallas que lo consumen
- **Login** — pantalla de inicio de sesión
- **Toda la app** — interceptor JWT
- **AppInitializer** — carga de perfil al abrir la app
- **Sidebar/Header** — mostrar nombre y rol del usuario

---

### 3.1 Login

| | |
|---|---|
| **Endpoint** | `POST /api/auth/login` |
| **Uso en frontend** | Formulario de login |
| **Auth** | No requiere JWT |

**Request:**
```json
{
  "usuario": "dr.garcia",
  "contrasena": "MiPassword123"
}
```

| Campo | Obligatorio | Nota |
|---|---|---|
| `usuario` | Sí | Puede ser `username` o `email` |
| `contrasena` | Sí | — |

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiJ9...",
  "refresh_token": "550e8400-e29b-41d4-a716-446655440000",
  "usuario": {
    "id_usuario": 1,
    "id_rol": 2,
    "nombre": "Carlos",
    "apellido": "García",
    "email": "carlos@ejemplo.com",
    "username": "dr.garcia",
    "activo": true,
    "bloqueado": false
  }
}
```

**Errores que manejar:**

| HTTP | Caso real en UI | Acción |
|---|---|---|
| 401 | Contraseña incorrecta | Mostrar "Credenciales inválidas" bajo el formulario |
| 403 | Usuario inactivo o bloqueado | Mostrar "Tu cuenta está deshabilitada. Contacta al administrador" |
| 404 | Username/email no existe | Mostrar "Usuario no encontrado" |

**Tras éxito:**
1. Guardar `access_token` y `refresh_token` en storage seguro
2. Guardar `usuario` en estado global
3. Navegar a `/dashboard`

---

### 3.2 Refresh Token

| | |
|---|---|
| **Endpoint** | `POST /api/auth/refresh` |
| **Uso en frontend** | Interceptor HTTP (automático, transparente para el usuario) |
| **Auth** | No requiere JWT (envía refresh_token en body) |

**Request:**
```json
{
  "refresh_token": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiJ9...(nuevo)",
  "refresh_token": "nuevo-uuid-generado",
  "usuario": {
    "id_usuario": 1,
    "id_rol": 2,
    "nombre": "Carlos",
    "apellido": "García"
  }
}
```

> **Importante:** El backend aplica **rotación de tokens**. Al hacer refresh, el token anterior se invalida y recibes uno nuevo. Siempre actualiza ambos tokens en storage.

**Errores que manejar:**

| HTTP | Caso real | Acción |
|---|---|---|
| 401 | Refresh token expirado, revocado o inválido | Forzar logout → navegar a login |
| 403 | Usuario fue bloqueado/desactivado mientras tenía sesión | Forzar logout con mensaje "Tu cuenta ha sido deshabilitada" |

---

### 3.3 Logout

| | |
|---|---|
| **Endpoint** | `POST /api/auth/logout` |
| **Uso en frontend** | Botón de cerrar sesión |
| **Auth** | No requiere JWT (envía refresh_token) |

**Request:**
```json
{
  "refresh_token": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response (200):**
```json
{
  "mensaje": "Logout exitoso"
}
```

**Tras éxito:**
1. Limpiar tokens del storage
2. Limpiar estado global del usuario
3. Navegar a `/login`

> Si falla el logout (ej: token ya expirado), igual limpiar storage local y navegar a login.

---

### 3.4 Perfil Actual (Me)

| | |
|---|---|
| **Endpoint** | `GET /api/auth/me` |
| **Uso en frontend** | Al iniciar la app — cargar datos del usuario autenticado |
| **Auth** | JWT requerido |

**Response (200):** `AuthMeResponseDto`
```json
{
  "id_usuario": 1,
  "username": "dr.garcia",
  "nombre": "Carlos",
  "apellido": "García",
  "email": "carlos@ejemplo.com",
  "id_rol": 2,
  "nombre_rol": "PROFESIONAL",
  "activo": true,
  "fecha_nacimiento": "1985-03-15",
  "domicilio": "Av. Reforma 100",
  "numero_telefono": "5551234567",
  "profesional": {
    "id_profesional": 1,
    "especialidad": "Psicología Clínica",
    "nombre_consulta": "Consultorio Dr. García",
    "codigo_vinculacion": "ABC123"
  },
  "permisos": {}
}
```

> **Nota:** El campo `profesional` es `null` si el usuario no tiene perfil profesional. El campo `permisos` contiene los permisos del recepcionista como `Map<String, Boolean>` (ej: `{"puede_crear_citas": true, "puede_editar_pacientes": false}`). Para profesionales/admin, `permisos` está vacío.

**Uso recomendado:**
- Llamar en `APP_INITIALIZER` o al detectar que hay token en storage pero no hay usuario en estado
- Usar `id_rol` / `nombre_rol` para determinar qué menú/rutas mostrar
- Guardar `profesional.id_profesional` y `profesional.nombre_consulta` en el estado global
- Usar `permisos` para habilitar/deshabilitar acciones de recepcionista
- Si responde 401/403: forzar logout

---

## 4. Dashboard

### Propósito
Provee KPIs, la agenda del día y estadísticas para la pantalla principal del profesional/recepcionista.

### Pantallas que lo consumen
- **Dashboard / Home** — vista principal al entrar
- **Widget de agenda del día**
- **Gráficas de estadísticas** (citas por estado, tendencia diaria, pacientes)

---

### 4.1 Resumen General

| | |
|---|---|
| **Endpoint** | `GET /api/dashboard/resumen` |
| **Uso en frontend** | Cards/KPIs del dashboard principal |
| **Auth** | JWT (PROFESIONAL, RECEPCIONISTA) |

**Response (200):**
```json
{
  "total_pacientes": 150,
  "total_pacientes_activos": 142,
  "total_citas": 1230,
  "citas_hoy": 8,
  "citas_pendientes": 45,
  "citas_confirmadas": 23,
  "total_sesiones": 890,
  "ingresos_totales": 125000.00
}
```

**Tras éxito:** Pintar cards con los valores.  
**Observación:** Conviene llamar al entrar al dashboard y al volver de crear cita/completar cita.

---

### 4.2 Agenda del Día

| | |
|---|---|
| **Endpoint** | `GET /api/dashboard/agenda-hoy` |
| **Uso en frontend** | Lista de citas del día en el home, widget de próxima cita |
| **Auth** | JWT (PROFESIONAL, RECEPCIONISTA) |

**Response (200):**
```json
{
  "fecha_hoy": "2026-04-03",
  "total_citas_hoy": 8,
  "citas_pendientes_hoy": 3,
  "citas_confirmadas_hoy": 4,
  "citas_completadas_hoy": 1,
  "citas_canceladas_hoy": 0,
  "proxima_cita": {
    "id_cita": 42,
    "fecha_inicio": "2026-04-03T10:00:00",
    "fecha_fin": "2026-04-03T10:45:00",
    "estado_cita": "CONFIRMADA",
    "motivo": "Seguimiento mensual",
    "paciente_nombre": "María",
    "paciente_apellido": "López"
  },
  "citas_del_dia": [
    {
      "id_cita": 41,
      "fecha_inicio": "2026-04-03T09:00:00",
      "fecha_fin": "2026-04-03T09:45:00",
      "estado_cita": "COMPLETADA",
      "motivo": "Primera consulta",
      "paciente_nombre": "Juan",
      "paciente_apellido": "Pérez"
    }
  ]
}
```

**Observación:** `proxima_cita` puede ser `null` si no hay citas futuras hoy.

---

### 4.3 Estadísticas de Citas

| | |
|---|---|
| **Endpoint** | `GET /api/dashboard/estadisticas-citas` |
| **Uso en frontend** | Gráficas (pastel por estado, serie diaria de tendencia) |
| **Auth** | JWT (PROFESIONAL, RECEPCIONISTA) |

**Query params (obligatorios):**
```
?fecha_desde=2026-03-01&fecha_hasta=2026-03-31
```

**Response (200):**
```json
{
  "fecha_desde": "2026-03-01",
  "fecha_hasta": "2026-03-31",
  "total_citas": 87,
  "conteo_por_estado": [
    { "estado": "COMPLETADA", "cantidad": 52 },
    { "estado": "CANCELADA", "cantidad": 10 },
    { "estado": "PENDIENTE", "cantidad": 15 },
    { "estado": "CONFIRMADA", "cantidad": 8 },
    { "estado": "NO_ASISTIO", "cantidad": 2 }
  ],
  "serie_diaria": [
    { "fecha": "2026-03-01", "total": 3 },
    { "fecha": "2026-03-02", "total": 4 }
  ]
}
```

**Errores:** 400 si falta `fecha_desde` o `fecha_hasta`.

---

### 4.4 Estadísticas de Pacientes

| | |
|---|---|
| **Endpoint** | `GET /api/dashboard/estadisticas-pacientes` |
| **Uso en frontend** | Cards/métricas de pacientes en rango |
| **Auth** | JWT (PROFESIONAL, RECEPCIONISTA) |

**Query params:** Mismos que estadísticas de citas.

**Response (200):**
```json
{
  "fecha_desde": "2026-03-01",
  "fecha_hasta": "2026-03-31",
  "total_pacientes_con_cita_en_rango": 45,
  "pacientes_nuevos": 8,
  "pacientes_recurrentes": 37,
  "total_con_sesion_en_rango": 30
}
```

---

### 4.5 Dashboard Consolidado

| | |
|---|---|
| **Endpoint** | `GET /api/dashboard/consolidado` |
| **Uso en frontend** | Carga inicial de la pantalla principal — obtiene todo en una sola llamada |
| **Auth** | JWT (PROFESIONAL, RECEPCIONISTA) |

**Response (200):** `DashboardConsolidadoResponseDto`
```json
{
  "resumen": {
    "total_pacientes": 120,
    "total_pacientes_activos": 95,
    "total_citas": 340,
    "citas_hoy": 5,
    "citas_pendientes": 12,
    "citas_confirmadas": 8,
    "total_sesiones": 200,
    "ingresos_totales": 150000.00
  },
  "agenda_hoy": {
    "fecha_hoy": "2026-04-03",
    "total_citas_hoy": 5,
    "citas_pendientes_hoy": 2,
    "citas_confirmadas_hoy": 2,
    "citas_completadas_hoy": 1,
    "citas_canceladas_hoy": 0,
    "proxima_cita": { ... },
    "citas_del_dia": [ ... ]
  },
  "solicitudes_pendientes_count": 3,
  "notificaciones_pendientes_count": 7
}
```

> **Recomendación:** Usar este endpoint en lugar de llamar a 4.1 y 4.2 por separado. Los campos `solicitudes_pendientes_count` y `notificaciones_pendientes_count` permiten mostrar badges de pendientes en el menú.

---

## 5. Pacientes

### Propósito
Gestión completa del expediente de pacientes: CRUD, alertas, resumen, historial, y acceso a sub-recursos (sesiones, notas, archivos, notificaciones, historial de eventos).

### Pantallas que lo consumen
- **Lista de pacientes** — tabla con búsqueda y filtros
- **Detalle de paciente** — información base + tabs de sub-recursos
- **Form crear/editar paciente** — modal o page
- **Resumen de paciente** — vista con KPIs
- **Historial del paciente** — timeline
- **Alertas del paciente** — cards con avisos importantes

---

### 5.1 Crear Paciente

| | |
|---|---|
| **Endpoint** | `POST /api/pacientes` |
| **Uso en frontend** | Modal o form de alta de paciente |
| **Auth** | JWT (PROFESIONAL, RECEPCIONISTA) |

**Request:**
```json
{
  "nombre": "María",
  "apellido": "López García",
  "email": "maria@ejemplo.com",
  "numero_telefono": "+52 55 1234 5678",
  "fecha_nacimiento": "1990-05-15",
  "sexo": "Femenino",
  "direccion": "Av. Reforma 123, CDMX",
  "contacto_emergencia_nombre": "Pedro López",
  "contacto_emergencia_telefono": "+52 55 8765 4321",
  "notas_generales": "Alérgica a la penicilina"
}
```

| Campo | Obligatorio | Max |
|---|---|---|
| `nombre` | **Sí** | 120 |
| `apellido` | **Sí** | 120 |
| `email` | No (pero si se envía, debe ser válido) | 180 |
| `numero_telefono` | No | 30 |
| `fecha_nacimiento` | No | — |
| `sexo` | No | 20 |
| `direccion` | No | 255 |
| `contacto_emergencia_nombre` | No | 160 |
| `contacto_emergencia_telefono` | No | 30 |
| `notas_generales` | No | — |

**Response (201):** `PacienteDto` completo con `id_paciente`, `created_at`, etc.

**Errores que manejar:**

| HTTP | Caso real | UI |
|---|---|---|
| 400 | `nombre` o `apellido` vacío | Marcar campos en rojo |
| 409 | Ya existe paciente con mismo nombre+email o nombre+teléfono | Mostrar "Ya existe un paciente con estos datos" |

**Tras éxito:** Cerrar modal → refrescar lista de pacientes o navegar al detalle del nuevo paciente.

---

### 5.2 Listar Pacientes

| | |
|---|---|
| **Endpoint** | `GET /api/pacientes` |
| **Uso en frontend** | Tabla principal de pacientes, selectores de paciente |
| **Auth** | JWT (PROFESIONAL, RECEPCIONISTA) |
| **Paginado** | Sí (`Page<PacienteDto>`, default 20, sort `idPaciente`) |

**Query params (todos opcionales):**
```
?search=María&activo=true&page=0&size=20&sort=nombre,asc
```

| Param | Tipo | Descripción |
|---|---|---|
| `search` | String | Busca en nombre, apellido, email, teléfono |
| `activo` | Boolean | Filtrar activos/inactivos |
| `page` | int | Página (0-indexed) |
| `size` | int | Tamaño de página |
| `sort` | String | Campo y dirección |

**Response (200):** `Page<PacienteDto>`

**Observación:** Para selectores (ej: al crear cita), podrías enviar `?size=100&activo=true` para traer todos los activos sin paginación visual.

---

### 5.3 Obtener Paciente por ID

| | |
|---|---|
| **Endpoint** | `GET /api/pacientes/{id}` |
| **Uso en frontend** | Pantalla de detalle de paciente |
| **Auth** | JWT (PROFESIONAL, RECEPCIONISTA) |

**Response (200):** `PacienteDto`

```json
{
  "id_paciente": 15,
  "id_profesional": 1,
  "nombre": "María",
  "apellido": "López García",
  "email": "maria@ejemplo.com",
  "numero_telefono": "+52 55 1234 5678",
  "fecha_nacimiento": "1990-05-15",
  "sexo": "Femenino",
  "direccion": "Av. Reforma 123",
  "contacto_emergencia_nombre": "Pedro López",
  "contacto_emergencia_telefono": "+52 55 8765 4321",
  "notas_generales": "Alérgica a penicilina",
  "activo": true,
  "created_at": "2026-01-20T14:30:00",
  "updated_at": "2026-03-10T09:15:00",
  "created_by": 1,
  "updated_by": 1
}
```

**Errores:** 404 si no existe o no pertenece al profesional.

---

### 5.4 Actualizar Paciente

| | |
|---|---|
| **Endpoint** | `PUT /api/pacientes/{id}` |
| **Uso en frontend** | Formulario de edición de paciente |
| **Auth** | JWT (PROFESIONAL, RECEPCIONISTA) |

**Request:** Mismos campos y validaciones que crear.

**Tras éxito:** Actualizar datos en detalle / refrescar lista si estás en listado.

---

### 5.5 Activar/Desactivar Paciente

| | |
|---|---|
| **Endpoint** | `PATCH /api/pacientes/{id}/activo` |
| **Uso en frontend** | Toggle o botón de activar/desactivar en detalle |
| **Auth** | JWT (PROFESIONAL, RECEPCIONISTA) |

**Request:**
```json
{ "activo": false }
```

**Tras éxito:** Actualizar badge de estado en la UI.

---

### 5.6 Resumen del Paciente

| | |
|---|---|
| **Endpoint** | `GET /api/pacientes/{id}/resumen` |
| **Uso en frontend** | Header/cards del detalle de paciente con KPIs |
| **Auth** | JWT (PROFESIONAL, RECEPCIONISTA) |

**Response (200):**
```json
{
  "id_paciente": 15,
  "nombre": "María",
  "apellido": "López García",
  "email": "maria@ejemplo.com",
  "numero_telefono": "+52 55 1234 5678",
  "fecha_nacimiento": "1990-05-15",
  "sexo": "Femenino",
  "activo": true,
  "notas_generales": "...",
  "total_citas": 12,
  "total_sesiones": 8,
  "total_notas_clinicas": 15,
  "total_alertas_activas": 2,
  "fecha_proxima_cita": "2026-04-10T10:00:00",
  "fecha_ultima_cita": "2026-03-28T11:00:00",
  "fecha_ultima_sesion": "2026-03-28T11:30:00",
  "created_at": "2026-01-20T14:30:00",
  "updated_at": "2026-03-10T09:15:00"
}
```

**Uso recomendado:** Llamar al entrar al detalle del paciente. Mostrar contadores como badges en las tabs (ej: "Citas (12)", "Sesiones (8)").

---

### 5.7 Historial del Paciente

| | |
|---|---|
| **Endpoint** | `GET /api/pacientes/{id}/historial` |
| **Uso en frontend** | Tab "Historial" / timeline del paciente |
| **Auth** | JWT (PROFESIONAL, RECEPCIONISTA) |

**Query params (opcionales):**
```
?tipo=CITA&fechaDesde=2026-01-01T00:00:00&fechaHasta=2026-04-01T00:00:00&page=0&size=20
```

**Response (200):**
```json
{
  "id_paciente": 15,
  "nombre": "María",
  "apellido": "López García",
  "total_citas": 12,
  "total_sesiones": 8,
  "total_notas_clinicas": 15,
  "total_alertas_activas": 2,
  "total_eventos": 35,
  "eventos": [
    {
      "tipo_evento": "CITA_CREADA",
      "fecha_evento": "2026-03-28T11:00:00",
      "titulo": "Cita de seguimiento",
      "descripcion_corta": "Seguimiento mensual",
      "estado": "COMPLETADA",
      "id_referencia": 42,
      "modulo": "CITA"
    }
  ]
}
```

> **Nota:** La paginación de eventos es in-memory (el backend devuelve los eventos filtrados pero la paginación no es de Spring Data Page). El frontend recibe la lista completa de `eventos` ya filtrada.

---

### 5.8 Alertas del Paciente

#### Listar alertas
| | |
|---|---|
| **Endpoint** | `GET /api/pacientes/{id}/alertas` |
| **Uso en frontend** | Sección de alertas en detalle de paciente |
| **Auth** | JWT (PROFESIONAL, RECEPCIONISTA) |

**Response (200):** `List<AlertaPacienteDto>` — ordenadas: activas primero, luego por fecha desc.

```json
[
  {
    "id_alerta_paciente": 5,
    "id_paciente": 15,
    "tipo_alerta": "ALERGIA",
    "titulo": "Alergia a la penicilina",
    "descripcion": "Reacción severa documentada",
    "activa": true,
    "created_at": "2026-02-01T10:00:00"
  }
]
```

#### Crear alerta
| | |
|---|---|
| **Endpoint** | `POST /api/pacientes/{id}/alertas` |
| **Auth** | JWT (PROFESIONAL, RECEPCIONISTA) |

**Request:**
```json
{
  "tipo_alerta": "ALERGIA",
  "titulo": "Alergia a la penicilina",
  "descripcion": "Reacción severa documentada",
  "activa": true
}
```

| Campo | Obligatorio | Max |
|---|---|---|
| `tipo_alerta` | **Sí** | 50 |
| `titulo` | **Sí** | 200 |
| `descripcion` | No | 1000 |
| `activa` | No (default `true` implícito) | — |

#### Actualizar alerta
`PUT /api/pacientes/{id}/alertas/{idAlerta}` — mismos campos que crear.

#### Activar/desactivar alerta
`PATCH /api/pacientes/{id}/alertas/{idAlerta}/activa` con `{ "activa": false }`

#### Eliminar alerta
`DELETE /api/pacientes/{id}/alertas/{idAlerta}` — soft delete (marca como inactiva).

---

### 5.9 Sub-recursos del Paciente (tabs del detalle)

Estos endpoints alimentan las tabs internas del detalle de paciente. Todos son paginados (`Page<T>`, default 20).

| Endpoint | Tab | Tipo Response | Observación |
|---|---|---|---|
| `GET /api/pacientes/{id}/sesiones` | Sesiones | `Page<SesionDto>` | Sort por `fecha_sesion` |
| `GET /api/pacientes/{id}/notas-clinicas` | Notas | `Page<NotaClinicaDto>` | Sort por `created_at` |
| `GET /api/pacientes/{id}/archivos-adjuntos` | Archivos | `Page<ArchivoAdjuntoDto>` | Sort por `created_at` |
| `GET /api/pacientes/{id}/notificaciones` | Notificaciones | `Page<NotificacionDto>` | Sort por `created_at` |
| `GET /api/pacientes/{id}/historial-eventos` | Bitácora | `Page<HistorialEventoDto>` | Sort por `fecha_evento` |

**Uso recomendado:** Cargar cada tab de forma lazy (solo al seleccionarla). No precargar todos.

---

## 6. Citas

### Propósito
Gestión completa de citas: CRUD, máquina de estados, pagos, reprogramación, tokens públicos, y sub-recursos.

### Pantallas que lo consumen
- **Lista de citas** — tabla con filtros y búsqueda
- **Detalle de cita** — información + acciones de estado + tabs
- **Form crear/editar cita** — con selector de paciente y horario
- **Agenda / Calendario** — vista por semana o mes

### Estados de cita (máquina de estados)

```
PENDIENTE ──→ CONFIRMADA ──→ COMPLETADA (terminal)
    ├──→ CANCELADA (terminal)      ├──→ CANCELADA (terminal)
    ├──→ NO_ASISTIO (terminal)     ├──→ NO_ASISTIO (terminal)
    └──→ REPROGRAMADA             └──→ REPROGRAMADA
              ├──→ PENDIENTE
              ├──→ CONFIRMADA
              └──→ CANCELADA (terminal)
```

> **Para la UI:** Mostrar solo los botones de acciones válidas según el estado actual:
> - `PENDIENTE` → [Confirmar, Cancelar, No Asistió, Reprogramar]
> - `CONFIRMADA` → [Completar, Cancelar, No Asistió, Reprogramar]
> - `REPROGRAMADA` → [Confirmar, Cancelar]
> - `COMPLETADA`, `CANCELADA`, `NO_ASISTIO` → Sin acciones de estado (terminal)

---

### 6.1 Crear Cita

| | |
|---|---|
| **Endpoint** | `POST /api/citas` |
| **Uso en frontend** | Form de nueva cita (modal/page) |
| **Auth** | JWT (PROFESIONAL, RECEPCIONISTA) |

**Request:**
```json
{
  "id_paciente": 15,
  "fecha_inicio": "2026-04-10T10:00:00",
  "fecha_fin": "2026-04-10T10:45:00",
  "motivo": "Seguimiento mensual",
  "notas_internas": "Revisar progreso del tratamiento",
  "observaciones": "",
  "monto": 800.00
}
```

| Campo | Obligatorio | Max |
|---|---|---|
| `id_paciente` | **Sí** | — |
| `fecha_inicio` | **Sí** | — |
| `fecha_fin` | **Sí** | — |
| `motivo` | No | 255 |
| `notas_internas` | No | — |
| `observaciones` | No | — |
| `monto` | No | — |

**Response (201):** `CitaDto` completo con `estado_cita: "PENDIENTE"`, `estado_pago: "PENDIENTE"`.

**Errores que manejar:**

| HTTP | Caso real | UI |
|---|---|---|
| 400 | `fecha_inicio` después de `fecha_fin` | "El horario de inicio debe ser anterior al de fin" |
| 404 | `id_paciente` no encontrado | "Paciente no encontrado" — no debería pasar si usas selector |
| 409 | Conflicto de horario con otra cita existente | "Ya existe una cita en ese horario" — mostrar horarios disponibles |

**Tras éxito:** Cerrar form → refrescar calendario/agenda → opcionalmente navegar al detalle de la cita.

**Tip:** Antes de crear, consultar disponibilidad (`GET /api/citas/disponibilidad?fecha=...`) para mostrar slots libres.

---

### 6.2 Listar Citas

| | |
|---|---|
| **Endpoint** | `GET /api/citas` |
| **Uso en frontend** | Tabla de citas con filtros |
| **Auth** | JWT (PROFESIONAL, RECEPCIONISTA) |
| **Paginado** | Sí (`Page<CitaDto>`, default 20, sort `fecha_inicio`) |

**Query params (todos opcionales):**
```
?search=seguimiento&estado=PENDIENTE&pacienteId=15&fechaDesde=2026-04-01T00:00:00&fechaHasta=2026-04-30T23:59:59&activo=true&page=0&size=20&sort=fecha_inicio,desc
```

| Param | Tipo | Descripción |
|---|---|---|
| `search` | String | Busca en motivo, nombre del paciente |
| `estado` | String | Filtrar por estado: `PENDIENTE`, `CONFIRMADA`, `COMPLETADA`, `CANCELADA`, `NO_ASISTIO`, `REPROGRAMADA` |
| `pacienteId` | Long | Filtrar por paciente específico |
| `fechaDesde` | DateTime | Rango inicio |
| `fechaHasta` | DateTime | Rango fin |
| `activo` | Boolean | Filtrar activas/inactivas |

---

### 6.3 Obtener Cita por ID

| | |
|---|---|
| **Endpoint** | `GET /api/citas/{id}` |
| **Uso en frontend** | Pantalla de detalle de cita |
| **Auth** | JWT (PROFESIONAL, RECEPCIONISTA) |

**Response (200):** `CitaDto`

```json
{
  "id_cita": 42,
  "id_profesional": 1,
  "id_paciente": 15,
  "id_recepcionista_creador": null,
  "fecha_inicio": "2026-04-10T10:00:00",
  "fecha_fin": "2026-04-10T10:45:00",
  "motivo": "Seguimiento mensual",
  "notas_internas": "Revisar progreso",
  "estado_cita": "CONFIRMADA",
  "estado_pago": "PENDIENTE",
  "monto": 800.00,
  "origen_cita": "PROFESIONAL",
  "confirmado_por_paciente": true,
  "fecha_confirmacion": "2026-04-05T09:22:00",
  "activo": true,
  "created_at": "2026-04-01T14:00:00",
  "updated_at": "2026-04-05T09:22:00",
  "nombre_paciente": "María",
  "apellido_paciente": "López",
  "tiene_sesion": false
}
```

> **Campos derivados nuevos:** `nombre_paciente` y `apellido_paciente` permiten mostrar el nombre del paciente sin hacer una llamada adicional. `tiene_sesion` indica si ya existe una sesión vinculada a esta cita (para mostrar/ocultar botón "Crear sesión" vs "Ver sesión").

---

### 6.4 Actualizar Cita

| | |
|---|---|
| **Endpoint** | `PUT /api/citas/{id}` |
| **Uso en frontend** | Form de edición de cita |
| **Auth** | JWT (PROFESIONAL, RECEPCIONISTA) |

**Request:** Similar a crear (sin `observaciones`).

**Errores que manejar:**

| HTTP | Caso real | UI |
|---|---|---|
| 409 | Cita en estado terminal (COMPLETADA/CANCELADA/NO_ASISTIO) | "No se puede editar una cita en estado {estado}" — deshabilitar botón editar |
| 409 | Conflicto de horario | "Ya existe una cita en ese horario" |

> **Importante para UI:** Si `estado_cita` está en `{COMPLETADA, CANCELADA, NO_ASISTIO}`, ocultar/deshabilitar el botón de editar.

---

### 6.5 Acciones de Estado

Todos requieren JWT (PROFESIONAL, RECEPCIONISTA). Todos retornan `CitaDto` (200).

| Endpoint | Acción | Body | Uso en UI |
|---|---|---|---|
| `PATCH /api/citas/{id}/confirmar` | → CONFIRMADA | — | Botón "Confirmar" |
| `PATCH /api/citas/{id}/cancelar` | → CANCELADA | — | Botón "Cancelar" con confirmación |
| `PATCH /api/citas/{id}/completar` | → COMPLETADA | — | Botón "Completar" |
| `PATCH /api/citas/{id}/no-asistio` | → NO_ASISTIO | — | Botón "No asistió" |
| `PATCH /api/citas/{id}/estado` | → cualquier estado válido | `{ "estado": "CONFIRMADA" }` | Selector genérico (alternativa) |

**Errores comunes:**
- `409` — Transición no permitida (ej: `COMPLETADA → PENDIENTE`): mostrar `message` del error.
- `404` — Cita no encontrada.

**Tras éxito:** Actualizar estado en la vista → si la cita se completó, habilitar botón "Crear sesión".

---

### 6.6 Actualizar Pago

| | |
|---|---|
| **Endpoint** | `PATCH /api/citas/{id}/pago` |
| **Uso en frontend** | Sección de pago en detalle de cita |
| **Auth** | JWT (PROFESIONAL, RECEPCIONISTA) |

**Request:**
```json
{
  "estado_pago": "PAGADO",
  "monto": 800.00
}
```

**Estados de pago válidos:** `PENDIENTE`, `PAGADO`, `PARCIAL`, `NO_APLICA`, `REEMBOLSADO`

**Tras éxito:** Actualizar badge de pago en la UI.

---

### 6.7 Generar Token de Gestión Pública

| | |
|---|---|
| **Endpoint** | `POST /api/citas/{id}/tokens-confirmacion` |
| **Uso en frontend** | Botón "Generar link para paciente" en detalle de cita |
| **Auth** | JWT (PROFESIONAL, RECEPCIONISTA) |

**Response (201):**
```json
{
  "id_token_confirmacion": 7,
  "id_cita": 42,
  "token": "b3f7a291-4e5c-48d9-910f-c8d2e5a1b6f3",
  "alcance": "GESTION_PUBLICA",
  "fecha_expiracion": "2026-04-17T10:00:00",
  "activo": true,
  "created_at": "2026-04-03T14:00:00"
}
```

> **Importante:** El campo `token` solo se muestra **una vez** en esta respuesta. Mostrarlo al usuario en un modal con opción de copiar. Construir la URL pública: `{APP_URL}/public/citas/{token}`

**Tras éxito:** Mostrar modal con el link copiable. Si se regenera, el token anterior se invalida automáticamente.

---

### 6.8 Solicitudes de Reprogramación

#### Listar solicitudes
`GET /api/citas/{id}/solicitudes-reprogramacion` → `List<SolicitudReprogramacionDto>` (ordenadas por más recientes).

#### Crear solicitud (desde panel privado)
| | |
|---|---|
| **Endpoint** | `POST /api/citas/{id}/solicitudes-reprogramacion` |

**Request:**
```json
{
  "fecha_solicitada": "2026-04-15",
  "hora_inicio_solicitada": "11:00:00",
  "hora_fin_solicitada": "11:45:00",
  "motivo": "Conflicto con otra actividad"
}
```

**Errores:** `409` si ya existe una solicitud pendiente para esta cita.

#### Aprobar solicitud
| | |
|---|---|
| **Endpoint** | `PATCH /api/citas/{id}/solicitudes-reprogramacion/{id_solicitud}/aprobar` |

**Response (200):**
```json
{
  "solicitud": { "estado_solicitud": "APROBADA", "..." : "..." },
  "cita": { "fecha_inicio": "2026-04-15T11:00:00", "estado_cita": "PENDIENTE", "..." : "..." }
}
```

> **Importante:** La cita cambia de horario y si estaba CONFIRMADA vuelve a PENDIENTE. Refrescar detalle de cita y calendario.

#### Rechazar solicitud
`PATCH /api/citas/{id}/solicitudes-reprogramacion/{id_solicitud}/rechazar` → `SolicitudReprogramacionDto`.

---

### 6.9 Sub-recursos de la Cita

| Endpoint | Qué devuelve | Tipo |
|---|---|---|
| `GET /api/citas/{id}/sesion` | Sesión asociada | `SesionDto` (único, no lista) |
| `GET /api/citas/{id}/archivos-adjuntos` | Archivos de la cita | `Page<ArchivoAdjuntoDto>` |
| `GET /api/citas/{id}/notificaciones` | Notificaciones de la cita | `Page<NotificacionDto>` |
| `GET /api/citas/{id}/historial-eventos` | Bitácora de la cita | `Page<HistorialEventoDto>` |

> **Nota:** `GET /api/citas/{id}/sesion` devuelve la sesión única o 404 si no existe. Usar esto para mostrar/ocultar botón "Crear sesión" vs "Ver sesión".

---

## 7. Calendario y Disponibilidad

### Propósito
Vista calendario de citas y cálculo de slots disponibles para agendar.

### Pantallas que lo consumen
- **Calendario** — vista mensual/semanal de citas
- **Form de nueva cita** — selector de horario disponible

---

### 7.1 Calendario de Citas

| | |
|---|---|
| **Endpoint** | `GET /api/citas/calendario` |
| **Uso en frontend** | Vista calendario completa |
| **Auth** | JWT (PROFESIONAL, RECEPCIONISTA) |

**Query params (obligatorios):**
```
?fechaDesde=2026-04-01T00:00:00&fechaHasta=2026-04-30T23:59:59
```

**Response (200):**
```json
{
  "fecha_desde": "2026-04-01T00:00:00",
  "fecha_hasta": "2026-04-30T23:59:59",
  "total_citas": 45,
  "dias": [
    {
      "fecha": "2026-04-03",
      "total_citas": 3,
      "citas": [
        {
          "id_cita": 42,
          "fecha_inicio": "2026-04-03T09:00:00",
          "fecha_fin": "2026-04-03T09:45:00",
          "estado_cita": "CONFIRMADA",
          "motivo": "Seguimiento",
          "id_paciente": 15,
          "paciente_nombre_completo": "María López García"
        }
      ]
    }
  ]
}
```

> **Tip:** Usar `dias` como data source del calendario. Cada `CitaCalendarioItemDto` tiene los datos mínimos para pintar un evento en la agenda. Para más detalle, navegar al detalle usando `id_cita`.

**Representación de colores sugerida por estado:**
- `PENDIENTE` → amarillo/naranja
- `CONFIRMADA` → azul
- `COMPLETADA` → verde
- `CANCELADA` → gris/rojo
- `NO_ASISTIO` → rojo oscuro
- `REPROGRAMADA` → morado

---

### 7.2 Disponibilidad de Horarios

| | |
|---|---|
| **Endpoint** | `GET /api/citas/disponibilidad` |
| **Uso en frontend** | Selector de horario al crear/editar cita |
| **Auth** | JWT (PROFESIONAL, RECEPCIONISTA) |

**Query params:**
```
?fecha=2026-04-10&duracionMinutos=45&citaIdExcluir=42
```

| Param | Obligatorio | Descripción |
|---|---|---|
| `fecha` | **Sí** | Fecha a consultar (ISO date) |
| `duracionMinutos` | No | Usa el default de configuración del sistema si no se envía |
| `citaIdExcluir` | No | Excluir esta cita del cálculo (para reprogramación) |

**Response (200):**
```json
{
  "fecha": "2026-04-10",
  "duracion_minutos": 45,
  "total_slots": 8,
  "slots": [
    { "hora_inicio": "09:00:00", "hora_fin": "09:45:00" },
    { "hora_inicio": "09:45:00", "hora_fin": "10:30:00" },
    { "hora_inicio": "10:30:00", "hora_fin": "11:15:00" },
    { "hora_inicio": "14:00:00", "hora_fin": "14:45:00" }
  ]
}
```

**Lógica del cálculo (para entender la UI):**
1. Toma los horarios laborales activos del día de la semana
2. Sustrae los bloqueos horarios de esa fecha
3. Sustrae las citas activas existentes
4. Genera slots de la duración especificada

> **Tip UX:** Mostrar los slots como botones/chips seleccionables. Al seleccionar uno, prellenar `fecha_inicio` y `fecha_fin` en el form de crear cita.

---

### 7.3 Agenda Consolidada

| | |
|---|---|
| **Endpoint** | `GET /api/agenda?mes=4&anio=2026` |
| **Uso en frontend** | Vista calendario completa — carga citas + bloqueos + configuración de jornada en una sola llamada |
| **Auth** | JWT (PROFESIONAL, RECEPCIONISTA) |

**Query params (obligatorios):**
```
?mes=4&anio=2026
```

| Param | Obligatorio | Descripción |
|---|---|---|
| `mes` | **Sí** | Mes (1-12) |
| `anio` | **Sí** | Año (ej: 2026) |

**Response (200):** `AgendaResponseDto`
```json
{
  "citas": [
    {
      "id_cita": 42,
      "id_profesional": 1,
      "id_paciente": 15,
      "fecha_inicio": "2026-04-10T10:00:00",
      "fecha_fin": "2026-04-10T10:45:00",
      "estado_cita": "CONFIRMADA",
      "motivo": "Seguimiento",
      "nombre_paciente": "María",
      "apellido_paciente": "López",
      "tiene_sesion": false
    }
  ],
  "bloqueos": [
    {
      "id_bloqueo_horario": 5,
      "fecha_inicio": "2026-04-15T08:00:00",
      "fecha_fin": "2026-04-15T12:00:00",
      "motivo": "Capacitación",
      "tipo_bloqueo": "PERSONAL"
    }
  ],
  "configuracion_jornada": {
    "hora_inicio": "08:00:00",
    "hora_fin": "18:00:00",
    "duracion_cita_default_min": 60,
    "permite_confirmacion_publica": true,
    "mostrar_sabados": true,
    "mostrar_domingos": false
  }
}
```

> **Diferencia con `/api/citas/calendario`:** Este endpoint es más completo — incluye bloqueos de horario y la configuración de jornada. Ideal para construir la vista de calendario principal.

**Uso recomendado:**
- Usar `configuracion_jornada.hora_inicio` / `hora_fin` para definir el rango visible del calendario
- Usar `mostrar_sabados` / `mostrar_domingos` para ocultar/mostrar columnas de fin de semana
- Pintar los `bloqueos` como franjas no disponibles en el calendario
- Usar `tiene_sesion` para mostrar un indicador visual en las citas con sesión vinculada

---

## 8. Sesiones Clínicas

### Propósito
Registro de sesiones clínicas vinculadas a citas completadas. Cada cita puede tener **como máximo una** sesión.

### Pantallas que lo consumen
- **Detalle de cita** — botón "Crear sesión" (solo si cita COMPLETADA y no tiene sesión)
- **Lista de sesiones** — tabla con filtros
- **Detalle de sesión** — info + tabs de notas/archivos/historial
- **Tab sesiones del paciente** — sub-recurso

### Regla crítica para el frontend

> **Una sesión solo puede crearse si la cita está en estado `COMPLETADA` y aún no tiene sesión asociada.**

Para determinar esto en el detalle de cita:
1. Verificar `estado_cita === 'COMPLETADA'`
2. Llamar `GET /api/citas/{id}/sesion` — si responde 404 → mostrar "Crear sesión", si responde 200 → mostrar "Ver sesión"

### Estados de sesión

| Estado | Editable | Acciones |
|---|---|---|
| `ABIERTA` | Sí | Cerrar, Cancelar |
| `CERRADA` | No (terminal) | — |
| `CANCELADA` | No (terminal) | — |

---

### 8.1 Crear Sesión

| | |
|---|---|
| **Endpoint** | `POST /api/sesiones` |
| **Uso en frontend** | Botón "Crear sesión" en detalle de cita completada |
| **Auth** | JWT (PROFESIONAL, RECEPCIONISTA) |

**Request:**
```json
{
  "id_cita": 42,
  "fecha_sesion": "2026-04-03T10:00:00",
  "tipo_sesion": "INDIVIDUAL",
  "resumen": "Se revisó el progreso del tratamiento..."
}
```

| Campo | Obligatorio | Max |
|---|---|---|
| `id_cita` | **Sí** | — |
| `fecha_sesion` | No | — |
| `tipo_sesion` | No | 30 |
| `resumen` | No | — |

**Response (201):** `SesionDto` con `estatus: "ABIERTA"`.

**Errores que manejar:**

| HTTP | Caso real | UI |
|---|---|---|
| 400 | La cita no está en estado COMPLETADA | "Solo puedes crear sesión para citas completadas" |
| 404 | Cita no encontrada | "Cita no encontrada" |
| 409 | Ya existe una sesión para esta cita | "Ya existe una sesión para esta cita" — navegar a la sesión existente |

**Tras éxito:** Navegar al detalle de la sesión creada.

---

### 8.2 Listar Sesiones

| | |
|---|---|
| **Endpoint** | `GET /api/sesiones` |
| **Auth** | JWT (PROFESIONAL, RECEPCIONISTA) |
| **Paginado** | Sí (`Page<SesionDto>`, default 20, sort `fecha_sesion`) |

**Query params (todos opcionales):**
```
?pacienteId=15&citaId=42&estatus=ABIERTA&tipoSesion=INDIVIDUAL&fechaDesde=2026-01-01T00:00:00&fechaHasta=2026-04-01T00:00:00
```

---

### 8.3 Obtener Sesión por ID

`GET /api/sesiones/{id}` → `SesionDto` (200)

```json
{
  "id_sesion": 28,
  "id_profesional": 1,
  "id_paciente": 15,
  "id_cita": 42,
  "fecha_sesion": "2026-04-03T10:00:00",
  "tipo_sesion": "INDIVIDUAL",
  "estatus": "ABIERTA",
  "resumen": "Se revisó el progreso...",
  "created_at": "2026-04-03T10:15:00",
  "updated_at": "2026-04-03T10:15:00",
  "nombre_paciente": "María",
  "apellido_paciente": "López"
}
```

---

### 8.4 Actualizar Sesión

| | |
|---|---|
| **Endpoint** | `PUT /api/sesiones/{id}` |
| **Auth** | JWT (PROFESIONAL, RECEPCIONISTA) |

**Request:**
```json
{
  "fecha_sesion": "2026-04-03T10:00:00",
  "tipo_sesion": "INDIVIDUAL",
  "resumen": "Se revisó el progreso del tratamiento. Paciente estable."
}
```

**Error:** `409` si la sesión está en estado terminal (`CERRADA` o `CANCELADA`).

> **Para UI:** Si `estatus !== 'ABIERTA'`, deshabilitar edición.

---

### 8.5 Cambiar Estatus

| | |
|---|---|
| **Endpoint** | `PATCH /api/sesiones/{id}/estatus` |
| **Auth** | JWT (PROFESIONAL, RECEPCIONISTA) |

**Request:**
```json
{ "estatus": "CERRADA" }
```

**Valores válidos:** `CERRADA`, `CANCELADA` (solo desde `ABIERTA`).

**Tras éxito:** Actualizar estado en la UI → deshabilitar edición si es terminal.

---

### 8.6 Sub-recursos de la Sesión

| Endpoint | Tab | Tipo |
|---|---|---|
| `GET /api/sesiones/{id}/notas-clinicas` | Notas | `Page<NotaClinicaDto>` |
| `GET /api/sesiones/{id}/archivos-adjuntos` | Archivos | `Page<ArchivoAdjuntoDto>` |
| `GET /api/sesiones/{id}/historial-eventos` | Bitácora | `Page<HistorialEventoDto>` |

---

## 9. Notas Clínicas

### Propósito
Documentación clínica asociada a un paciente y opcionalmente a una sesión. Las notas marcadas como "visibles en resumen" aparecen en el resumen del paciente.

### Pantallas que lo consumen
- **Tab notas en detalle de paciente**
- **Tab notas en detalle de sesión**
- **Form crear/editar nota**

---

### 9.1 Crear Nota Clínica

| | |
|---|---|
| **Endpoint** | `POST /api/notas-clinicas` |
| **Auth** | JWT (PROFESIONAL, RECEPCIONISTA) |

**Request:**
```json
{
  "id_paciente": 15,
  "id_sesion": 28,
  "titulo": "Evaluación de progreso",
  "contenido": "El paciente muestra mejoría significativa...",
  "tipo_nota": "EVOLUCION",
  "visible_en_resumen": true
}
```

| Campo | Obligatorio | Max |
|---|---|---|
| `id_paciente` | **Sí** | — |
| `id_sesion` | No | — (si se envía, la sesión debe pertenecer al mismo paciente/profesional) |
| `titulo` | No | 180 |
| `contenido` | **Sí** | — |
| `tipo_nota` | No | 30 |
| `visible_en_resumen` | No | — |

**Response (201):** `NotaClinicaDto`

**Tras éxito:** Refrescar la lista de notas en la tab correspondiente.

---

### 9.2 Listar Notas Clínicas

| | |
|---|---|
| **Endpoint** | `GET /api/notas-clinicas` |
| **Paginado** | Sí (`Page<NotaClinicaDto>`, default 20, sort `created_at`) |

**Query params:**
```
?pacienteId=15&sesionId=28&tipoNota=EVOLUCION&visibleEnResumen=true&search=progreso&fechaDesde=2026-01-01T00:00:00&fechaHasta=2026-04-01T00:00:00
```

---

### 9.3 Actualizar Nota

`PUT /api/notas-clinicas/{id}` — permite cambiar `titulo`, `contenido`, `tipo_nota`, `visible_en_resumen`. **No** permite cambiar paciente ni sesión.

---

### 9.4 Eliminar Nota

| | |
|---|---|
| **Endpoint** | `DELETE /api/notas-clinicas/{id}` |
| **Atención** | **Eliminación física** (no soft delete). Mostrar diálogo de confirmación. |

**Tras éxito:** Refrescar lista de notas.

---

### 9.5 Cambiar Visibilidad en Resumen

| | |
|---|---|
| **Endpoint** | `PATCH /api/notas-clinicas/{id}/visible-en-resumen` |

**Request:**
```json
{ "visible_en_resumen": true }
```

**Uso en UI:** Toggle/switch en la tarjeta de la nota.

---

### 9.6 Archivos de la Nota

`GET /api/notas-clinicas/{id}/archivos-adjuntos` → `Page<ArchivoAdjuntoDto>`

---

## 10. Archivos Adjuntos

### Propósito
Subida y gestión de archivos vinculados a pacientes, citas, sesiones o notas clínicas. Usa Google Cloud Storage con URLs firmadas.

### Pantallas que lo consumen
- **Tab archivos en detalle de paciente/cita/sesión/nota**
- **Componente de subida de archivos** (reutilizable)
- **Visor/descarga de archivos**

### Flujo completo de subida (3 pasos)

```
┌─────────────────────────────────────────────────────┐
│ PASO 1: Pedir URL de subida al backend              │
│ POST /api/archivos-adjuntos/upload-url              │
│ → Recibir upload_url (signed URL) + object_key      │
├─────────────────────────────────────────────────────┤
│ PASO 2: Subir archivo directo a GCS desde frontend  │
│ PUT {upload_url} con el archivo como body            │
│ Headers: Content-Type = mime_type del archivo       │
│ (NO enviar header Authorization JWT)                 │
├─────────────────────────────────────────────────────┤
│ PASO 3: Registrar metadata en Agendify              │
│ POST /api/archivos-adjuntos                         │
│ → Usar object_key, bucket_name, nombre_storage      │
│   del Paso 1 como datos en el body                  │
└─────────────────────────────────────────────────────┘
```

> **Importante para el interceptor:** El PUT al signed URL de GCS **no debe llevar** el header `Authorization: Bearer ...` de tu interceptor. Configurar exclusión para URLs que no sean tu API.

---

### 10.1 Paso 1 — Generar Upload URL

| | |
|---|---|
| **Endpoint** | `POST /api/archivos-adjuntos/upload-url` |
| **Auth** | JWT (PROFESIONAL, RECEPCIONISTA) |

**Request:**
```json
{
  "nombre_original": "informe_evaluacion.pdf",
  "mime_type": "application/pdf",
  "entidad_tipo": "PACIENTE",
  "entidad_id": 15,
  "tamano_bytes": 245760
}
```

| Campo | Obligatorio | Nota |
|---|---|---|
| `nombre_original` | **Sí** | Nombre del archivo con extensión (max 500) |
| `mime_type` | **Sí** | MIME correcto del archivo (max 100) |
| `entidad_tipo` | **Sí** | `PACIENTE`, `CITA`, `SESION`, `NOTA_CLINICA` |
| `entidad_id` | **Sí** | ID de la entidad destino |
| `tamano_bytes` | No | Tamaño en bytes |

**Response (201):**
```json
{
  "upload_url": "https://storage.googleapis.com/agendify-archivos/profesional_1/abc123_informe.pdf?X-Goog-Signature=...",
  "object_key": "profesional_1/abc123_informe_evaluacion.pdf",
  "bucket_name": "agendify-archivos",
  "nombre_storage": "abc123_informe_evaluacion.pdf",
  "expiration": "2026-04-03T14:45:00"
}
```

> **Guardar** `object_key`, `bucket_name` y `nombre_storage` para el Paso 3.

---

### 10.2 Paso 2 — Subir a GCS

**No es un endpoint de Agendify.** Es un PUT directo al `upload_url` recibido:

```typescript
// Pseudocódigo Angular
const file: File = event.target.files[0];
this.http.put(uploadUrl, file, {
  headers: new HttpHeaders({
    'Content-Type': file.type
    // NO incluir Authorization
  })
}).subscribe();
```

**Errores posibles:**
- `403` — URL firmada expirada (volver al Paso 1)
- `400` — Archivo excede tamaño configurado en GCS

---

### 10.3 Paso 3 — Registrar Metadata

| | |
|---|---|
| **Endpoint** | `POST /api/archivos-adjuntos` |
| **Auth** | JWT (PROFESIONAL, RECEPCIONISTA) |

**Request:**
```json
{
  "entidad_tipo": "PACIENTE",
  "entidad_id": 15,
  "nombre_original": "informe_evaluacion.pdf",
  "nombre_storage": "abc123_informe_evaluacion.pdf",
  "mime_type": "application/pdf",
  "extension": "pdf",
  "tamano_bytes": 245760,
  "bucket_name": "agendify-archivos",
  "object_key": "profesional_1/abc123_informe_evaluacion.pdf",
  "checksum_sha256": ""
}
```

| Campo | Obligatorio | Nota |
|---|---|---|
| `entidad_tipo` | **Sí** | Mismo que Paso 1 |
| `entidad_id` | **Sí** | Mismo que Paso 1 |
| `nombre_original` | **Sí** | — |
| `nombre_storage` | **Sí** | Del response del Paso 1 |
| `mime_type` | No | — |
| `extension` | No | — |
| `tamano_bytes` | No | — |
| `bucket_name` | **Sí** | Del response del Paso 1 |
| `object_key` | **Sí** | Del response del Paso 1 |
| `checksum_sha256` | No | Si lo calculas en frontend |

**Response (201):** `ArchivoAdjuntoDto` completo.

**Tras éxito:** Refrescar lista de archivos de la entidad.

---

### 10.4 Listar Archivos

| | |
|---|---|
| **Endpoint** | `GET /api/archivos-adjuntos` |
| **Paginado** | Sí (`Page<ArchivoAdjuntoDto>`, default 20, sort `created_at`) |

**Query params:**
```
?entidadTipo=PACIENTE&entidadId=15&activo=true&search=informe
```

---

### 10.5 Descargar Archivo

| | |
|---|---|
| **Endpoint** | `GET /api/archivos-adjuntos/{id}/download-url` |
| **Auth** | JWT (PROFESIONAL, RECEPCIONISTA) |

**Response (200):**
```json
{
  "download_url": "https://storage.googleapis.com/agendify-archivos/profesional_1/abc123_informe.pdf?X-Goog-Signature=...",
  "nombre_original": "informe_evaluacion.pdf",
  "mime_type": "application/pdf",
  "expiration": "2026-04-03T14:45:00"
}
```

**Uso en UI:** Abrir `download_url` en nueva tab o usar como `href` de un botón de descarga.

> Solo funciona para archivos activos. Si está inactivo, devuelve error.

---

### 10.6 Eliminar Archivo (Soft Delete)

`DELETE /api/archivos-adjuntos/{id}` → `ArchivoAdjuntoDto` con `activo: false`.

> El archivo **no se borra** del storage, solo se marca como inactivo.

---

## 11. Horarios Laborales y Bloqueos

### Propósito
Configuración de la disponibilidad del profesional: horarios recurrentes por día de la semana y excepciones (bloqueos puntuales).

### Pantallas que lo consumen
- **Configuración → Horarios laborales**
- **Configuración → Bloqueos de horario**
- **Indirectamente:** cálculo de disponibilidad al crear cita

---

### 11.1 Horarios Laborales

Representan la disponibilidad **recurrente** (ej: "Lunes de 09:00 a 13:00 y de 14:00 a 18:00").

#### Listar
`GET /api/horarios-laborales` → `List<HorarioLaboralDto>` (no paginado)

**Query params opcionales:** `?diaSemana=1&activo=true`

```json
[
  {
    "id_horario_laboral": 1,
    "id_profesional": 1,
    "dia_semana": 1,
    "hora_inicio": "09:00:00",
    "hora_fin": "13:00:00",
    "activo": true
  },
  {
    "id_horario_laboral": 2,
    "id_profesional": 1,
    "dia_semana": 1,
    "hora_inicio": "14:00:00",
    "hora_fin": "18:00:00",
    "activo": true
  }
]
```

> **Día de semana:** 1=Lunes, 2=Martes, ..., 7=Domingo

#### Crear
`POST /api/horarios-laborales`

```json
{
  "dia_semana": 1,
  "hora_inicio": "09:00:00",
  "hora_fin": "13:00:00"
}
```

| Campo | Obligatorio |
|---|---|
| `dia_semana` | **Sí** (1-7) |
| `hora_inicio` | **Sí** |
| `hora_fin` | **Sí** |

**Error `409`:** Si hay traslape con otro horario del mismo día → "Ya existe un horario en ese rango".

#### Actualizar
`PUT /api/horarios-laborales/{id}` — mismos campos.

#### Activar/Desactivar
`PATCH /api/horarios-laborales/{id}/activo` con `{ "activo": false }`

#### Eliminar (soft delete)
`DELETE /api/horarios-laborales/{id}` → marca `activo=false`.

---

### 11.2 Bloqueos de Horario

Representan excepciones puntuales: vacaciones, ausencias, hora de comida, eventos.

#### Listar
`GET /api/bloqueos-horario` → `List<BloqueoHorarioDto>` (no paginado)

**Query params opcionales:**
```
?fechaDesde=2026-04-01&fechaHasta=2026-04-30&activo=true&motivo=vacaciones
```

#### Crear
`POST /api/bloqueos-horario`

```json
{
  "fecha": "2026-04-15",
  "hora_inicio": "09:00:00",
  "hora_fin": "18:00:00",
  "motivo": "Día festivo",
  "tipo_bloqueo": "FESTIVO"
}
```

| Campo | Obligatorio | Max |
|---|---|---|
| `fecha` | **Sí** | — |
| `hora_inicio` | **Sí** | — |
| `hora_fin` | **Sí** | — |
| `motivo` | No | 255 |
| `tipo_bloqueo` | No | 30 |

**Error `409`:** Duplicado exacto (misma fecha + hora_inicio + hora_fin).

#### Actualizar / Activar / Eliminar
Misma estructura que horarios laborales.

---

## 12. Configuración del Sistema y Recordatorios

### Propósito
Configuración global del profesional (zona horaria, moneda, duración default de cita, política de cancelación) y reglas de recordatorios programados.

### Pantallas que lo consumen
- **Configuración → General** — form con los valores del sistema
- **Configuración → Recordatorios** — lista de reglas

---

### 12.1 Configuración del Sistema

> Cada profesional tiene **como máximo una** configuración. Si no existe, crearla; si ya existe, editarla.
>
> **Auto-creación:** Al registrar un profesional, el backend crea automáticamente una configuración con valores por defecto (`zona_horaria=America/Mexico_City`, `moneda=MXN`, `formato_hora=24H`, `duracion_cita_default_min=60`, `politica_cancelacion_horas=24`, `permite_confirmacion_publica=true`) y una regla de recordatorio (`canal=EMAIL`, `anticipacion_minutos=1440`). El frontend ya no necesita manejar el caso 404 en la carga inicial para profesionales nuevos.

#### Obtener
`GET /api/configuracion-sistema` → `ConfiguracionSistemaDto` (200) o `404` si no existe.

```json
{
  "id_configuracion_sistema": 1,
  "id_profesional": 1,
  "zona_horaria": "America/Mexico_City",
  "moneda": "MXN",
  "formato_hora": "24h",
  "duracion_cita_default_min": 45,
  "politica_cancelacion_horas": 24,
  "permite_confirmacion_publica": true,
  "activo": true,
  "created_at": "2026-01-15T10:00:00"
}
```

**Flujo recomendado en frontend:**
1. Al entrar a configuración: `GET /api/configuracion-sistema`
2. Si `404`: mostrar formulario vacío con defaults → `POST` al guardar
3. Si `200`: prellenar form → `PUT /{id}` al guardar

#### Crear
`POST /api/configuracion-sistema`

```json
{
  "zona_horaria": "America/Mexico_City",
  "moneda": "MXN",
  "formato_hora": "24h",
  "duracion_cita_default_min": 45,
  "politica_cancelacion_horas": 24,
  "permite_confirmacion_publica": true
}
```

**Error `409`:** Ya existe una configuración para este profesional.

#### Actualizar
`PUT /api/configuracion-sistema/{id}` — mismos campos.

---

### 12.2 Reglas de Recordatorio

#### Listar
`GET /api/configuracion-recordatorios` → `List<ConfiguracionRecordatorioDto>` (no paginado)

Ordenadas: activas primero, luego por anticipación ascendente.

#### Crear
`POST /api/configuracion-recordatorios`

```json
{
  "canal": "EMAIL",
  "anticipacion_minutos": 1440,
  "mensaje_personalizado": "Recordatorio: tiene cita mañana a las {hora}"
}
```

| Campo | Obligatorio | Nota |
|---|---|---|
| `canal` | **Sí** | Ej: `EMAIL`, `SMS`, `WHATSAPP` (max 20) |
| `anticipacion_minutos` | **Sí** | Min 1. Ej: 1440 = 24 horas antes |
| `mensaje_personalizado` | No | Max 5000 |

**Error `409`:** Ya existe regla con mismo `canal + anticipacion_minutos`.

#### Actualizar / Activar / Eliminar
Misma estructura que otros recursos con CRUD + activo + delete.

---

## 13. Notificaciones

### Propósito
Registro y gestión de intentos de comunicación (recordatorios, confirmaciones, mensajes manuales). Preparado para múltiples canales.

> **Notificaciones automáticas:** El sistema crea notificaciones automáticamente cuando:
> - Un paciente **confirma/cancela/solicita reprogramación** vía token público (tipos: `CONFIRMACION_PACIENTE`, `CANCELACION_PACIENTE`, `SOLICITUD_REPROGRAMACION`)
> - Se **vincula un recepcionista** a un profesional (tipo: `VINCULACION_RECEPCIONISTA`)
>
> Estas notificaciones aparecen con `estado_envio=PENDIENTE` y `canal=SISTEMA` en el listado.

### Pantallas que lo consumen
- **Administración → Notificaciones** (listado con filtros)
- **Tab notificaciones en detalle de cita/paciente**

---

### 13.1 Listar Notificaciones

| | |
|---|---|
| **Endpoint** | `GET /api/notificaciones` |
| **Paginado** | Sí (`Page<NotificacionDto>`, default 20, sort `created_at`) |

**Query params:**
```
?pacienteId=15&citaId=42&canal=EMAIL&estadoEnvio=ENVIADA&tipoNotificacion=RECORDATORIO&search=seguimiento&fechaDesde=2026-01-01T00:00:00&fechaHasta=2026-04-01T00:00:00
```

---

### 13.2 Crear Notificación

| | |
|---|---|
| **Endpoint** | `POST /api/notificaciones` |
| **Auth** | JWT (PROFESIONAL, RECEPCIONISTA) |

**Request:**
```json
{
  "id_paciente": 15,
  "id_cita": 42,
  "canal": "EMAIL",
  "tipo_notificacion": "RECORDATORIO",
  "destinatario": "maria@ejemplo.com",
  "asunto": "Recordatorio de cita",
  "mensaje_resumen": "Tu cita es mañana a las 10:00",
  "fecha_programada": "2026-04-09T10:00:00"
}
```

| Campo | Obligatorio |
|---|---|
| `canal` | **Sí** |
| `tipo_notificacion` | **Sí** |
| `destinatario` | **Sí** |
| `id_paciente` | No |
| `id_cita` | No |
| `asunto` | No |
| `mensaje_resumen` | No |
| `fecha_programada` | No |

---

### 13.3 Reenviar Notificación

| | |
|---|---|
| **Endpoint** | `POST /api/notificaciones/{id}/reenviar` |

> Solo permite reenvío si `estado_envio` es `FALLIDA` o `CANCELADA`.

**Error `409`:** "Solo se pueden reenviar notificaciones fallidas o canceladas".

---

## 14. Historial de Eventos

### Propósito
Bitácora funcional de negocio. Registra creaciones, confirmaciones, cancelaciones, y cambios de estado automatizados. No es un log técnico.

### Pantallas que lo consumen
- **Tab "Bitácora" en detalle de paciente/cita/sesión**
- **Administración → Historial de eventos** (listado global con filtros)

---

### 14.1 Listar Historial

| | |
|---|---|
| **Endpoint** | `GET /api/historial-eventos` |
| **Paginado** | Sí (`Page<HistorialEventoDto>`, default 20, sort `fecha_evento`) |

**Query params:**
```
?entidadTipo=CITA&entidadId=42&eventoTipo=ESTADO_CAMBIADO&search=confirmada&fechaDesde=2026-01-01T00:00:00&fechaHasta=2026-04-01T00:00:00
```

```json
{
  "content": [
    {
      "id_historial_evento": 100,
      "id_profesional": 1,
      "entidad_tipo": "CITA",
      "entidad_id": 42,
      "evento_tipo": "ESTADO_CAMBIADO",
      "descripcion": "Estado cambiado de PENDIENTE a CONFIRMADA",
      "usuario_actor_id": 1,
      "fecha_evento": "2026-04-05T09:22:00",
      "metadata_json": "{\"estado_anterior\":\"PENDIENTE\",\"estado_nuevo\":\"CONFIRMADA\"}"
    }
  ]
}
```

---

### 14.2 Obtener Evento por ID

`GET /api/historial-eventos/{id}` → `HistorialEventoDto` (200)

---

## 15. Endpoints Públicos para el Paciente

### Propósito
Permite al paciente gestionar su cita sin necesidad de autenticarse, usando un token único enviado por el profesional.

### Pantallas que lo consumen
- **Página pública de gestión de cita** — landing page sin login

### Flujo recomendado para la página pública

```
1. El paciente recibe un link: https://app.agendify.com/public/citas/{token}

2. La page pública carga al iniciar:
   GET /public/citas/gestion/{token}
   → Si token_valido === true:
     Muestra datos de la cita + acciones disponibles
     UI muestra botones según puede_confirmar / puede_cancelar / puede_solicitar_reprogramacion
   → Si token_valido === false:
     Muestra datos de la cita + mensaje según accion_realizada
     (ej: "Esta cita ya fue confirmada", "Este enlace ha expirado")

3. El paciente ejecuta una acción (solo si token_valido):
   a) Confirmar → PATCH /public/citas/gestion/{token}/confirmar
   b) Cancelar → PATCH /public/citas/gestion/{token}/cancelar
   c) Solicitar reprogramación → POST /public/citas/gestion/{token}/solicitudes-reprogramacion

4. Mostrar mensaje de éxito/error
   (El backend genera automáticamente una notificación al profesional)
```

> **Ninguno de estos endpoints requiere JWT.** El token en la URL es la autenticación.

---

### 15.1 Consultar Cita por Token

| | |
|---|---|
| **Endpoint** | `GET /public/citas/gestion/{token}` |
| **Auth** | Token público en path (sin JWT) |

**Response (200):** `CitaGestionPublicaResponseDto`
```json
{
  "fecha_inicio": "2026-04-10T10:00:00",
  "fecha_fin": "2026-04-10T10:45:00",
  "estado_cita": "PENDIENTE",
  "paciente_nombre": "María",
  "profesional_nombre": "Dr. Carlos García",
  "profesional_especialidad": "Psicología Clínica",
  "nombre_consulta": "Consultorio Dr. García",
  "motivo": "Seguimiento mensual",
  "fecha_expiracion_token": "2026-04-17T10:00:00",
  "puede_confirmar": true,
  "puede_cancelar": true,
  "puede_solicitar_reprogramacion": true,
  "token_valido": true,
  "accion_realizada": null,
  "fecha_accion": null
}
```

> **Datos mínimos expuestos:** Solo lo necesario para que el paciente identifique su cita. No se exponen notas internas, montos, ni estados de pago.

**Manejo de tokens expirados/usados (cambio importante):**

Anteriormente, tokens expirados o usados retornaban 404. Ahora retornan 200 con información contextual:

```json
{
  "fecha_inicio": "2026-04-10T10:00:00",
  "fecha_fin": "2026-04-10T10:45:00",
  "estado_cita": "CONFIRMADA",
  "paciente_nombre": "María",
  "profesional_nombre": "Dr. Carlos García",
  "profesional_especialidad": "Psicología Clínica",
  "nombre_consulta": "Consultorio Dr. García",
  "motivo": "Seguimiento mensual",
  "token_valido": false,
  "accion_realizada": "confirmada",
  "fecha_accion": "2026-04-05T15:30:00",
  "puede_confirmar": false,
  "puede_cancelar": false,
  "puede_solicitar_reprogramacion": false
}
```

**Para UI:**
- Si `token_valido === true`: mostrar los 3 botones de acción según los flags `puede_*`
- Si `token_valido === false`: mostrar un mensaje informativo según `accion_realizada`:
  - `"expirado"` → "Este enlace ha expirado"
  - `"confirmada"` → "Esta cita ya fue confirmada"
  - `"cancelada"` → "Esta cita ya fue cancelada"
  - Otro → "Esta cita ya fue procesada"
- Si todos los `puede_*` son `false`: mostrar solo la información sin botones de acción

**Errores:**

| HTTP | Caso real | UI |
|---|---|---|
| 404 | Token completamente inválido (no existe en BD) | Mostrar "Este enlace no es válido" |

> **Nota:** Las acciones públicas (confirmar, cancelar, solicitar reprogramación) ahora generan automáticamente una notificación al profesional con `canal=SISTEMA` y `estado_envio=PENDIENTE`.

---

### 15.2 Confirmar Cita (público)

| | |
|---|---|
| **Endpoint** | `PATCH /public/citas/gestion/{token}/confirmar` |

**Response (200):**
```json
{
  "fecha_inicio": "2026-04-10T10:00:00",
  "fecha_fin": "2026-04-10T10:45:00",
  "estado_cita": "CONFIRMADA",
  "confirmado_por_paciente": true,
  "fecha_confirmacion": "2026-04-05T15:30:00"
}
```

> Idempotente: si ya está confirmada, no falla.

**Tras éxito:** Mostrar "Cita confirmada exitosamente" con los datos de la cita.

---

### 15.3 Cancelar Cita (público)

| | |
|---|---|
| **Endpoint** | `PATCH /public/citas/gestion/{token}/cancelar` |

**Response (200):** `CitaPublicaAccionResponseDto` con `estado_cita: "CANCELADA"`.

> Idempotente: si ya está cancelada, no falla.

**Tras éxito:** Mostrar "Cita cancelada. Si necesitas reagendar, contacta a tu profesional."

---

### 15.4 Solicitar Reprogramación (público)

| | |
|---|---|
| **Endpoint** | `POST /public/citas/gestion/{token}/solicitudes-reprogramacion` |

**Request:**
```json
{
  "fecha_solicitada": "2026-04-15",
  "hora_inicio_solicitada": "11:00:00",
  "hora_fin_solicitada": "11:45:00",
  "motivo": "Tengo un compromiso familiar"
}
```

**Error `409`:** Ya existe una solicitud pendiente → "Ya tienes una solicitud de reprogramación pendiente de revisión".

**Tras éxito:** Mostrar "Solicitud enviada. Tu profesional la revisará pronto."

---

## 16. Administración (ADMIN)

### Propósito
Funcionalidades exclusivas del rol ADMIN para gestión de la plataforma.

### Pantallas que lo consumen
- **Admin → Códigos beta**
- **Admin → Profesionales**
- **Admin → Usuarios**

> **Nota:** Estas pantallas solo deben ser visibles/accesibles para usuarios con `id_rol` correspondiente a ADMIN. Usar guards de ruta.

---

### 16.1 Códigos Beta

CRUD de códigos de acceso para beta testers. Solo ADMIN.

| Endpoint | Método | Descripción |
|---|---|---|
| `GET /api/codigos-beta` | GET | Listar códigos (no paginado) |
| `GET /api/codigos-beta/{id}` | GET | Detalle |
| `POST /api/codigos-beta` | POST | Crear |
| `PATCH /api/codigos-beta/{id}/cancelar` | PATCH | Cancelar/invalidar |
| `POST /api/codigos-beta/validar` | POST | Validar si un código es usable (**público**) |

**Filtros de listado:**
```
?codigo=ABC123&activo=true&usado=false&search=beta&fecha_expiracion_desde=2026-01-01T00:00:00&fecha_expiracion_hasta=2026-12-31T23:59:59
```

---

### 16.2 Profesionales

| Endpoint | Método | Auth | Descripción |
|---|---|---|---|
| `GET /api/profesionales` | GET | ADMIN | Listar todos |
| `POST /api/profesionales` | POST | ADMIN | Crear perfil profesional |
| `GET /api/profesionales/{id}` | GET | ADMIN, PROFESIONAL | Detalle |
| `PUT /api/profesionales/{id}` | PUT | ADMIN, PROFESIONAL | Actualizar |
| `GET /api/profesionales/{id}/resumen` | GET | ADMIN, PROFESIONAL | Resumen con config |

---

### 16.3 Recepcionistas

| Endpoint | Método | Auth | Descripción |
|---|---|---|---|
| `GET /api/recepcionistas` | GET | ADMIN, PROFESIONAL | Listar |
| `POST /api/recepcionistas` | POST | ADMIN, PROFESIONAL | Crear (requiere `codigo_vinculacion`) |
| `GET /api/recepcionistas/{id}` | GET | ADMIN, PROFESIONAL | Detalle |
| `PUT /api/recepcionistas/{id}` | PUT | ADMIN, PROFESIONAL | Actualizar |
| `PATCH /api/recepcionistas/{id}/activo` | PATCH | ADMIN, PROFESIONAL | Activar/desactivar |
| `GET /api/recepcionistas/{id}/permisos` | GET | ADMIN, PROFESIONAL | Ver permisos |
| `PUT /api/recepcionistas/{id}/permisos` | PUT | ADMIN, PROFESIONAL | Reemplazar permisos |

---

### 16.4 Códigos de Vinculación (solo PROFESIONAL)

Para vincular recepcionistas al profesional.

| Endpoint | Método | Descripción |
|---|---|---|
| `GET /api/codigos-vinculacion/me` | GET | Obtener código activo |
| `POST /api/codigos-vinculacion/regenerar` | POST | Regenerar (invalida anterior) |

**Flujo:** El profesional genera un código → lo comparte con el recepcionista → el recepcionista se registra usando ese código.

---

### 16.5 Usuarios

| Endpoint | Método | Auth |
|---|---|---|
| `GET /api/usuarios` | GET | ADMIN, PROFESIONAL |
| `GET /api/usuarios/{id}` | GET | ADMIN, PROFESIONAL, RECEPCIONISTA |
| `POST /api/usuarios` | POST | ADMIN, PROFESIONAL |
| `POST /api/usuarios/registro` | POST | **Público** |
| `PUT /api/usuarios/{id}` | PUT | ADMIN, PROFESIONAL, RECEPCIONISTA |
| `PUT /api/usuarios/{id}/password` | PUT | ADMIN, PROFESIONAL, RECEPCIONISTA |
| `PATCH /api/usuarios/{id}/activo` | PATCH | ADMIN, PROFESIONAL |
| `PATCH /api/usuarios/{id}/bloqueado` | PATCH | ADMIN, PROFESIONAL |

---

### 16.6 Refresh Tokens

| Endpoint | Método | Auth |
|---|---|---|
| `GET /api/refresh-tokens` | GET | Cualquier autenticado |
| `PATCH /api/refresh-tokens/{id}/revocar` | PATCH | Cualquier autenticado |

**Uso:** Panel de "Sesiones activas" donde el usuario puede ver y revocar tokens.

---

### 16.7 Roles

`GET /api/roles` → `List<RolResponseDto>` (200) — catálogo de roles del sistema.

```json
[
  { "id_rol": 1, "nombre": "ADMIN" },
  { "id_rol": 2, "nombre": "PROFESIONAL" },
  { "id_rol": 3, "nombre": "RECEPCIONISTA" }
]
```

**Uso:** Poblar selectores de rol en forms de creación de usuario.

---

## 17. Checklist de Servicios Angular Recomendados

| Servicio | Responsabilidad |
|---|---|
| `auth.service` | Login, refresh, logout, me, gestión de tokens en storage |
| `pacientes.service` | CRUD pacientes, alertas, resumen, historial, sub-recursos |
| `citas.service` | CRUD citas, estados, pago, reprogramación, tokens, sub-recursos |
| `calendario.service` | Calendario y disponibilidad (puede ser parte de citas.service) |
| `agenda.service` | Agenda consolidada: citas + bloqueos + configuración jornada (`GET /api/agenda`) |
| `sesiones.service` | CRUD sesiones, cambio de estatus, sub-recursos |
| `notas-clinicas.service` | CRUD notas, visibilidad en resumen |
| `archivos.service` | Upload URL, registro de metadata, listado, download URL, delete |
| `horarios.service` | CRUD horarios laborales |
| `bloqueos.service` | CRUD bloqueos de horario |
| `configuracion.service` | Configuración del sistema (get/create/update) |
| `recordatorios.service` | CRUD reglas de recordatorio |
| `notificaciones.service` | Listado, creación, reenvío |
| `historial.service` | Listado y detalle de eventos |
| `dashboard.service` | Resumen, agenda hoy, estadísticas, consolidado |
| `public-citas.service` | Endpoints públicos de gestión de cita por token |
| `usuarios.service` | CRUD usuarios, activar/bloquear, password |
| `roles.service` | Catálogo de roles |
| `codigos-beta.service` | Solo si el rol es ADMIN |
| `codigos-vinculacion.service` | Solo si el rol es PROFESIONAL |
| `recepcionistas.service` | Gestión de recepcionistas y permisos |
| `profesionales.service` | Gestión de profesionales (ADMIN + self) |
| `refresh-tokens.service` | Listado y revocación de sesiones |

**Sugerencia adicional:**

| Utilidad | Responsabilidad |
|---|---|
| `jwt.interceptor` | Inyectar token + manejo de refresh automático |
| `error.interceptor` | Manejo global de errores HTTP |
| `auth.guard` | Proteger rutas que requieren login |
| `role.guard` | Proteger rutas por rol (ADMIN, PROFESIONAL, RECEPCIONISTA) |
| `pagination.helper` | Construir params de paginación y parsear respuesta `Page<T>` |
| `error-handler.service` | Parsear `ErrorResponseDto` y mostrar toasts/alerts |

---

## 18. Flujos de UI Recomendados

### 18.1 Crear Paciente

```
1. Abrir modal/page con formulario vacío
2. Validar campos obligatorios en frontend (nombre, apellido)
3. POST /api/pacientes
4. Si 201 → toast "Paciente creado" → cerrar modal → refrescar lista
5. Si 400 → marcar campos con error usando details[]
6. Si 409 → mostrar "Ya existe un paciente con estos datos"
```

### 18.2 Crear Cita

```
1. Seleccionar paciente (de lista o buscador)
2. Seleccionar fecha → GET /api/citas/disponibilidad?fecha=...
3. Mostrar slots disponibles como chips seleccionables
4. Al seleccionar slot → prellenar fecha_inicio/fecha_fin
5. Completar motivo y monto (opcionales)
6. POST /api/citas
7. Si 201 → toast "Cita creada" → refrescar calendario/agenda
8. Si 409 → "Conflicto de horario" → volver a consultar disponibilidad
```

### 18.3 Completar Cita + Crear Sesión

```
1. En detalle de cita "CONFIRMADA":
   PATCH /api/citas/{id}/completar
2. Si 200 → actualizar estado en UI → ahora mostrar botón "Crear sesión"
3. Click "Crear sesión" → POST /api/sesiones { id_cita }
4. Si 201 → navegar al detalle de la sesión
5. Si 409 → la sesión ya existe → GET /api/citas/{id}/sesion → navegar a ella
```

### 18.4 Subir Archivo

```
1. Usuario selecciona archivo con input[type=file]
2. POST /api/archivos-adjuntos/upload-url
   { nombre_original, mime_type, entidad_tipo, entidad_id }
3. Mostrar barra de progreso
4. PUT {upload_url} con el archivo (sin Authorization header)
5. POST /api/archivos-adjuntos con metadata del paso 2
6. Si 201 → toast "Archivo subido" → refrescar lista de archivos
7. Si falla paso 4 → toast "Error al subir archivo" → no hacer paso 5
```

### 18.5 Flujo Público de Cita (paciente sin login)

```
1. Paciente abre link https://app.agendify.com/public/citas/{token}
2. GET /public/citas/gestion/{token}
3. Si 404 → mostrar "Este enlace ha expirado o no es válido"
4. Si 200 → mostrar datos de la cita + botones según puede_*
5. Click "Confirmar":
   PATCH /public/citas/gestion/{token}/confirmar
   → "¡Cita confirmada!" con datos de la cita
6. Click "Cancelar":
   Diálogo de confirmación → PATCH .../cancelar
   → "Cita cancelada"
7. Click "Solicitar cambio de horario":
   Formulario con fecha, hora, motivo → POST .../solicitudes-reprogramacion
   → "Solicitud enviada" (si 409: "Ya hay una solicitud pendiente")
```

### 18.6 Gestión de Sesión Expirada

```
1. Cualquier request del interceptor → 401
2. Intentar POST /api/auth/refresh con refresh_token
3. Si 200 → actualizar tokens → reintentar request original (transparente)
4. Si 401/403 → limpiar storage → toast "Tu sesión ha expirado"
   → navegar a /login
5. No reintentar más de 1 vez por request
```

---

## 19. Inconsistencias y Observaciones

### 19.1 Campos sensibles en UsuarioDto

`UsuarioDto` incluye el campo `password_hash` en su definición. Aunque el mapper probablemente no lo llena, la presencia del campo en el DTO es un riesgo potencial. Verificar que nunca se envíe al frontend.

> **Acción frontend:** Ignorar `password_hash` si llega en algún response. No mostrarlo en UI.

### 19.2 Diferencia entre UsuarioDto y UsuarioResponseDto

- `UsuarioDto` se usa en `LoginResponseDto` y `RefreshResponseDto` (incluye campos como `password_hash`, `ultimo_login_at`).
- `UsuarioResponseDto` se usa en endpoints CRUD de usuarios (incluye `nombre_rol`, `alias_interno`, `puesto`).

> **Para frontend:** Definir dos interfaces TypeScript o una sola con campos opcionales.

### 19.3 Filtros con naming inconsistente

Los Filtro DTOs usan **camelCase** en algunos campos pero el backend espera los query params como se definen en Java:

| Filtro | Campo Java | Query param |
|---|---|---|
| `CitaFiltroDto` | `pacienteId` | `?pacienteId=15` |
| `CitaFiltroDto` | `fechaDesde` | `?fechaDesde=...` |
| `RefreshTokenFiltroDto` | `id_usuario` | `?id_usuario=1` |
| `CodigoBetaFiltroDto` | `fecha_expiracion_desde` | `?fecha_expiracion_desde=...` |

> **Observación:** La mayoría de filtros usan camelCase (`pacienteId`, `fechaDesde`) pero `RefreshTokenFiltroDto` y `CodigoBetaFiltroDto` usan snake_case (`id_usuario`, `fecha_expiracion_desde`). Tener cuidado al construir los params de búsqueda.
>
> **Nota sobre Jackson SNAKE_CASE:** Con la configuración global `spring.jackson.property-naming-strategy=SNAKE_CASE`, los query params de filtros `@ModelAttribute` **no** se ven afectados — siguen usando los nombres tal como están definidos en Java. Solo las respuestas JSON (bodies) se serializan en snake_case.

### 19.4 Historial del paciente no usa paginación estándar

`GET /api/pacientes/{id}/historial` devuelve un objeto `PacienteHistorialResponseDto` con una lista `eventos` que **no** es un `Page<T>` de Spring Data. Acepta `page` y `size` como parámetros pero la paginación se aplica en memoria.

> **Impacto:** Para conjuntos de datos muy grandes, podría haber impacto en rendimiento. No confiar en la metadata estándar de `Page` para este endpoint.

### 19.5 Notas clínicas usan DELETE físico

A diferencia de la mayoría de entidades (que usan soft delete con `activo=false`), `DELETE /api/notas-clinicas/{id}` realiza una **eliminación real** de la base de datos.

> **Para UI:** Siempre mostrar diálogo de confirmación "¿Estás seguro? Esta acción no se puede deshacer."

### 19.6 Campos de respuesta no usados por frontend típicamente

Muchos DTOs incluyen campos como `created_by`, `updated_by`, `id_profesional` que raramente se necesitan en la UI (ya que el ownership es implícito). No es necesario mapearlos en las interfaces TypeScript a menos que los uses.

### 19.7 Token de confirmación — visibilidad única

`POST /api/citas/{id}/tokens-confirmacion` es la **única oportunidad** de ver el token plano. El backend almacena solo el hash SHA-256. Si el usuario cierra el modal sin copiar el link, debe regenerar un nuevo token.

> **Para UI:** Mostrar el token en un modal bloqueante con botón "Copiar link" prominente y warning de que no se podrá ver de nuevo.

### 19.8 Endpoints de eliminación (DELETE) retornan el objeto eliminado

Los endpoints `DELETE` (archivos, alertas, horarios, bloqueos, recordatorios, notas clínicas) retornan el DTO del objeto eliminado/desactivado con status 200 (no 204). Esto puede ser útil para mostrar confirmación al usuario.

---

> **Última actualización:** Generado desde el código fuente del backend de Agendify. Actualizado con: AuthMeResponseDto expandido, endpoint /api/agenda consolidado, /api/dashboard/consolidado, campos derivados en CitaDto/SesionDto/SolicitudReprogramacionDto, manejo graceful de tokens públicos, notificaciones automáticas, auto-creación de configuración, Jackson SNAKE_CASE global.
