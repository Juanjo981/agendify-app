# Agendify — Backend & Database Blueprint
> Generado el 17 de marzo de 2026 | Basado en análisis exhaustivo del frontend v0.0.1-prealpha  
> Stack objetivo: **Spring Boot 3 + PostgreSQL 16**

---

## 1. Resumen Ejecutivo

### Dominio detectado

Agendify es una **SaaS de gestión de agenda y expediente clínico ligero** orientada a profesionales independientes de la salud (psicólogos, médicos, nutriólogos, etc.) que pueden tener uno o más recepcionistas bajo su cargo.

El sistema gestiona el ciclo de vida completo de una consulta:

```
Paciente creado → Cita agendada → Recordatorio enviado (SMS/email con token)
→ Paciente confirma/cancela/pide reprogramar (flujo público, sin login)
→ Profesional acepta/rechaza reprogramación
→ Cita completada → Sesión/nota clínica registrada → Pago cargado
→ Estadísticas agregadas
```

### Módulos principales del sistema

| Módulo | Descripción |
|--------|-------------|
| **Auth / Sesión** | Login, JWT, roles (Profesional / Recepcionista), recuperación de contraseña |
| **Usuarios / Registro** | Alta dual con código beta; vinculación Recepcionista → Profesional |
| **Pacientes** | CRUD completo, alertas, historial de eventos |
| **Citas** | Agenda diaria/mensual, CRUD, estados, pagos, bloqueos horarios |
| **Sesiones clínicas** | Notas SOAP/libres vinculadas a una cita, adjuntos (imágenes, PDFs) |
| **Solicitudes de reprogramación** | Flujo paciente → profesional con estado PENDIENTE/ACEPTADA/RECHAZADA |
| **Confirmación pública** | Página sin autenticación accesible por token: confirmar / cancelar / reprogramar |
| **Configuración** | Ajustes de agenda, recordatorios, notificaciones, apariencia, privacidad |
| **Equipo** | Gestión de recepcionistas asociados al profesional + permisos granulares |
| **Estadísticas** | KPIs, series temporales, ranking pacientes, reportes exportables |
| **Actividad / Notificaciones** | Feed de eventos del sistema agrupados por fecha |
| **Perfil** | Datos personales y profesionales del usuario autenticado |

---

## 2. Modelos / Entidades Recomendadas

---

### 2.1 `usuarios`
**Tipo:** Principal  
**Descripción:** Tabla raíz de cualquier persona con acceso al sistema. Almacena credenciales y datos personales básicos.

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | BIGSERIAL PK | |
| `nombre` | VARCHAR(100) NOT NULL | |
| `apellido` | VARCHAR(100) NOT NULL | |
| `email` | VARCHAR(254) UNIQUE NOT NULL | índice único |
| `username` | VARCHAR(60) UNIQUE NOT NULL | alias de login |
| `password_hash` | VARCHAR(255) NOT NULL | bcrypt |
| `fecha_nacimiento` | DATE | |
| `domicilio` | VARCHAR(300) | |
| `telefono` | VARCHAR(30) | |
| `activo` | BOOLEAN DEFAULT TRUE | |
| `id_rol` | INT FK → `roles` | 3=Profesional, 4=Recepcionista |
| `reset_token` | VARCHAR(255) | token temporal para forgot-password |
| `reset_token_expira` | TIMESTAMP | |
| `creado_en` | TIMESTAMP DEFAULT NOW() | |
| `actualizado_en` | TIMESTAMP | |

**Relaciones:**
- 1:1 → `profesionales` o `recepcionistas` según `id_rol`

**Notas de diseño:**
- No mezclar datos del Profesional con el Usuario base. El `usuario` solo es la identidad; la dimensión de negocio vive en `profesionales`.
- `username` y `email` son índices únicos separados; el login puede usar cualquiera de los dos.

---

### 2.2 `roles`
**Tipo:** Catálogo  
**Descripción:** Tabla de roles del sistema.

| Campo | Tipo |
|-------|------|
| `id` | INT PK |
| `nombre` | VARCHAR(50) UNIQUE |
| `descripcion` | VARCHAR(200) |

**Valores iniciales:**

| id | nombre |
|----|--------|
| 3 | PROFESIONAL |
| 4 | RECEPCIONISTA |

**Notas de diseño:** Los valores 3 y 4 coinciden con los hardcodeados en el frontend (`RolUsuario enum`). Mantener esa convención al insertar datos base.

---

### 2.3 `profesionales`
**Tipo:** Principal (extensión de `usuarios`)  
**Descripción:** Perfil de negocio del profesional. Centraliza toda la lógica dueña del consultorio.

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | BIGSERIAL PK | |
| `id_usuario` | BIGINT FK → `usuarios` UNIQUE NOT NULL | 1:1 |
| `especialidad` | VARCHAR(150) | |
| `nombre_consulta` | VARCHAR(200) | nombre del consultorio para branding |
| `tipo_servicio` | VARCHAR(100) | "Psicología", "Nutrición", etc. |
| `descripcion` | TEXT | bio/presentación en página pública |
| `codigo_vinculacion` | VARCHAR(10) UNIQUE NOT NULL | generado al crear profesional; usado por recepcionistas |
| `prefijo_moneda` | VARCHAR(5) DEFAULT '€' | MXN, USD, EUR, etc. |
| `creado_en` | TIMESTAMP DEFAULT NOW() | |

**Relaciones:**
- 1:N → `pacientes`
- 1:N → `citas`
- 1:N → `bloqueos_horario`
- 1:1 → `configuracion_agenda`
- 1:1 → `configuracion_notificaciones`
- 1:N → `recepcionistas` (vía `profesional_recepcionistas`)

**Notas de diseño:**
- `codigo_vinculacion` se genera automáticamente al crear el profesional (UUID corto de 8 chars, p.ej. `AGD-4F2K`). No exponer el ID interno.
- Datos como `nombre_consulta`, `tipo_servicio`, `descripcion` viven en `profesionales`, NO en `usuarios`.

---

### 2.4 `recepcionistas`
**Tipo:** Principal (extensión de `usuarios`)  
**Descripción:** Perfil de un recepcionista. Siempre vinculado a exactamente un profesional.

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | BIGSERIAL PK | |
| `id_usuario` | BIGINT FK → `usuarios` UNIQUE NOT NULL | 1:1 |
| `id_profesional` | BIGINT FK → `profesionales` NOT NULL | su jefe |
| `activo` | BOOLEAN DEFAULT TRUE | el profesional puede activar/desactivar |
| `fecha_vinculacion` | DATE NOT NULL | día en que se unió al equipo |
| `creado_en` | TIMESTAMP DEFAULT NOW() | |

---

### 2.5 `permisos_recepcionista`
**Tipo:** Configuración / Pivote  
**Descripción:** Permisos granulares por módulo para cada recepcionista. Se diseña como tabla separada para extensibilidad (agregar permisos en el futuro sin alterar el schema de `recepcionistas`).

| Campo | Tipo | Default |
|-------|------|---------|
| `id` | BIGSERIAL PK | |
| `id_recepcionista` | BIGINT FK → `recepcionistas` UNIQUE | |
| `agenda` | BOOLEAN | TRUE |
| `citas` | BOOLEAN | TRUE |
| `pacientes` | BOOLEAN | TRUE |
| `notas_clinicas` | BOOLEAN | FALSE |
| `configuracion` | BOOLEAN | FALSE |

**Notas de diseño:**
- Relación 1:1 con `recepcionistas`. Podría ser un JSONB en `recepcionistas`, pero la tabla separada permite queries de "¿quién tiene permiso X?" con índices normales.
- Si se anticipan más de 10 permisos en V2, considerar cambiar a un esquema EAV o `permisos_recepcionista (id_recepcionista, modulo, permitido)`.

---

### 2.6 `pacientes`
**Tipo:** Principal  
**Descripción:** Expediente base de un paciente en el contexto de un profesional. Cada profesional tiene su propia lista de pacientes (sin cruce entre profesionales).

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | BIGSERIAL PK | |
| `id_profesional` | BIGINT FK → `profesionales` NOT NULL | |
| `nombre` | VARCHAR(100) NOT NULL | |
| `apellido` | VARCHAR(100) NOT NULL | |
| `email` | VARCHAR(254) | no único globalmente; único por profesional |
| `telefono` | VARCHAR(30) | |
| `fecha_nacimiento` | DATE | |
| `notas_generales` | TEXT | |
| `direccion` | VARCHAR(300) | |
| `activo` | BOOLEAN DEFAULT TRUE | baja lógica |
| `creado_en` | TIMESTAMP DEFAULT NOW() | |
| `actualizado_en` | TIMESTAMP | |

**Relaciones:**
- N:1 → `profesionales`
- 1:N → `alertas_paciente`
- 1:N → `citas`
- 1:N → `notas_clinicas`
- 1:N (derivado) → `sesiones` (vía `citas`)

**Notas de diseño:**
- `email` del paciente puede repetirse entre profesionales distintos. El índice de unicidad debe ser `(id_profesional, email)`.
- El frontend tiene un campo `alertas: string[]`. Esto debe ser tabla propia `alertas_paciente`, no columna array. Facilita CRUD granular.

---

### 2.7 `alertas_paciente`
**Tipo:** Auxiliar  
**Descripción:** Alertas clínicas o administrativas visibles en el perfil del paciente (ej.: "Alergia a penicilina", "Pago pendiente desde enero").

| Campo | Tipo |
|-------|------|
| `id` | BIGSERIAL PK |
| `id_paciente` | BIGINT FK → `pacientes` NOT NULL |
| `descripcion` | VARCHAR(500) NOT NULL |
| `creado_en` | TIMESTAMP DEFAULT NOW() |

---

### 2.8 `citas`
**Tipo:** Principal  
**Descripción:** El objeto central del sistema. Representa una cita agendada entre un paciente y un profesional.

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | BIGSERIAL PK | |
| `id_profesional` | BIGINT FK → `profesionales` NOT NULL | |
| `id_paciente` | BIGINT FK → `pacientes` NOT NULL | |
| `fecha` | DATE NOT NULL | |
| `hora_inicio` | TIME NOT NULL | |
| `hora_fin` | TIME NOT NULL | |
| `duracion_min` | SMALLINT NOT NULL | derivable; almacenar para eficiencia de consultas |
| `motivo` | VARCHAR(500) NOT NULL | equivale al campo `tipo` de `CitaResumenDto` |
| `notas_rapidas` | TEXT | |
| `estado` | VARCHAR(30) NOT NULL | ver enum `EstadoCita` |
| `estado_pago` | VARCHAR(20) NOT NULL DEFAULT 'Pendiente' | |
| `metodo_pago` | VARCHAR(20) | nullable cuando no se ha cobrado |
| `monto` | NUMERIC(10,2) NOT NULL DEFAULT 0 | precio acordado |
| `monto_pagado` | NUMERIC(10,2) NOT NULL DEFAULT 0 | lo que ya pagó el paciente |
| `modalidad` | VARCHAR(20) DEFAULT 'Presencial' | 'Presencial' \| 'Virtual' — del confirmar-cita |
| `ubicacion` | VARCHAR(300) | dirección o link de videollamada |
| `creado_en` | TIMESTAMP DEFAULT NOW() | |
| `actualizado_en` | TIMESTAMP | |

**Relaciones:**
- N:1 → `profesionales`, `pacientes`
- 1:1 → `sesiones` (opcional)
- 1:N → `solicitudes_reprogramacion`
- 1:1 → `tokens_confirmacion`

**Campos que NO deben estar aquí:**
- ❌ `nombre_paciente`, `apellido_paciente` — se obtienen con JOIN
- ❌ `tiene_sesion` — calculado con `EXISTS (SELECT 1 FROM sesiones WHERE id_cita = ?)`

**Notas de diseño:**
- `duracion_min` se puede calcular de `hora_fin - hora_inicio` pero almacenarlo evita recalcular en cada query de agenda. Mantenerlo sincronizado via trigger o lógica de servicio.
- Índices recomendados: `(id_profesional, fecha)`, `(id_paciente)`, `(estado, id_profesional)`.

---

### 2.9 `sesiones`
**Tipo:** Principal  
**Descripción:** Nota clínica asociada a una cita completada. Una cita puede tener como máximo una sesión.

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | BIGSERIAL PK | |
| `id_cita` | BIGINT FK → `citas` UNIQUE NOT NULL | 1:1 con cita |
| `id_paciente` | BIGINT FK → `pacientes` NOT NULL | desnormalización útil para queries de historial |
| `id_profesional` | BIGINT FK → `profesionales` NOT NULL | |
| `notas` | TEXT NOT NULL | texto libre tipo SOAP o narrativo |
| `fecha_creacion` | TIMESTAMP DEFAULT NOW() | |
| `actualizado_en` | TIMESTAMP | |

**Relaciones:**
- 1:1 → `citas`
- 1:N → `adjuntos` (filtrados por `entidad_tipo = 'sesion'`) ó tabla `adjuntos_sesion` específica

**Notas de diseño:**
- El frontend tiene `SesionPaciente` (en `paciente.model.ts`) con campos `tipo` y `resumen` que no existen en `SesionDto`. Esto es una inconsistencia: en V1, `notas` cubre ambos. En V2 considerar `tipo_sesion` (individual, grupal, evaluación) y `resumen` como campos separados.
- `nombre_paciente` y `apellido_paciente` que aparecen en `SesionDto` son desnormalizaciones del mock. **No almacenarlos**; usar JOIN.

---

### 2.10 `notas_clinicas`
**Tipo:** Principal  
**Descripción:** Notas independientes de una cita, accesibles desde el perfil del paciente (tab "Notas" en paciente-detalle).

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | BIGSERIAL PK | |
| `id_paciente` | BIGINT FK → `pacientes` NOT NULL | |
| `id_profesional` | BIGINT FK → `profesionales` NOT NULL | quien la escribió |
| `fecha` | DATE NOT NULL | |
| `contenido` | TEXT NOT NULL | |
| `creado_en` | TIMESTAMP DEFAULT NOW() | |
| `actualizado_en` | TIMESTAMP | |

**Relaciones:**
- 1:1 → `adjuntos_nota` (opcional)

---

### 2.11 `adjuntos`
**Tipo:** Auxiliar / Genérico  
**Descripción:** Tabla polimórfica para archivos adjuntos de sesiones y notas clínicas. Almacena metadatos; el binario va a un object storage (S3, GCS, MinIO).

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | BIGSERIAL PK | |
| `entidad_tipo` | VARCHAR(20) NOT NULL | `'sesion'` \| `'nota'` |
| `entidad_id` | BIGINT NOT NULL | FK lógica al id de la entidad |
| `nombre_archivo` | VARCHAR(255) NOT NULL | nombre original del archivo |
| `tipo_mime` | VARCHAR(100) NOT NULL | `image/png`, `application/pdf`, etc. |
| `tamano_bytes` | BIGINT NOT NULL | |
| `storage_key` | VARCHAR(500) NOT NULL | clave en el bucket (path interno) |
| `url_publica` | VARCHAR(1000) | URL pre-signed o CDN (nullable si privado) |
| `subido_por` | BIGINT FK → `usuarios` | |
| `creado_en` | TIMESTAMP DEFAULT NOW() | |

**Notas de diseño:**
- No almacenar el binario en la base de datos (columna BYTEA). Siempre externalizar a object storage.
- `previewUrl` del frontend es una `object URL` del browser generada con `URL.createObjectURL()`. No tiene equivalente en backend — el frontend la generará a partir de la URL devuelta por la API.
- Índice en `(entidad_tipo, entidad_id)` para lookups O(1).

---

### 2.12 `bloqueos_horario`
**Tipo:** Auxiliar  
**Descripción:** Períodos de tiempo en que el profesional no está disponible (descansos, vacaciones, reuniones). Usado en la agenda para mostrar slots bloqueados.

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | BIGSERIAL PK | |
| `id_profesional` | BIGINT FK → `profesionales` NOT NULL | |
| `fecha` | DATE NOT NULL | |
| `hora_inicio` | TIME NOT NULL | |
| `hora_fin` | TIME NOT NULL | |
| `motivo` | VARCHAR(300) | texto libre |
| `tipo` | VARCHAR(30) | `'descanso'` \| `'vacacion'` \| `'personal'` |
| `creado_en` | TIMESTAMP DEFAULT NOW() | |

---

### 2.13 `solicitudes_reprogramacion`
**Tipo:** Principal  
**Descripción:** Solicitud enviada por el paciente (vía token público) para cambiar la fecha/hora de una cita.

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | BIGSERIAL PK | |
| `id_cita` | BIGINT FK → `citas` NOT NULL | |
| `mensaje_paciente` | TEXT | texto libre del paciente |
| `fecha_hora_sugerida` | TIMESTAMP | propuesta de fecha/hora (opcional) |
| `estado` | VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' | ver enum `EstadoSolicitud` |
| `motivo_rechazo` | TEXT | nullable; completa el profesional al rechazar |
| `fecha_solicitud` | TIMESTAMP DEFAULT NOW() NOT NULL | |
| `resuelta_en` | TIMESTAMP | cuando el profesional aceptó o rechazó |
| `resuelta_por` | BIGINT FK → `usuarios` | puede ser el profesional o recepcionista |

**Notas de diseño:**
- Una cita puede tener múltiples solicitudes en el tiempo (paciente pide, se rechaza, vuelve a pedir). No restringir a 1:1 a nivel de base de datos; la lógica de negocio limita cuántas `PENDIENTE` puede haber simultáneamente.
- `pacienteNombre` que expone el frontend proviene del JOIN con `pacientes`.

---

### 2.14 `tokens_confirmacion`
**Tipo:** Temporal / Token  
**Descripción:** Token de un solo uso enviado al paciente por SMS o email para confirmar/cancelar/reprogramar su cita sin necesidad de login.

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | BIGSERIAL PK | |
| `id_cita` | BIGINT FK → `citas` NOT NULL | |
| `token` | UUID NOT NULL UNIQUE | generado con `UUID.randomUUID()` |
| `accion_realizada` | VARCHAR(30) | `'confirmada'` \| `'cancelada'` \| `'reprogramacion_solicitada'` \| NULL si no usada |
| `fecha_expiracion` | TIMESTAMP NOT NULL | típicamente 24-48h antes de la cita |
| `fecha_uso` | TIMESTAMP | cuándo fue consumido el token |
| `creado_en` | TIMESTAMP DEFAULT NOW() | |

**Notas de diseño:**
- El frontend espera recibir datos completos de la cita con un GET al endpoint público usando el token. Devolver el token como parte del body implica una ruta como `GET /public/citas/confirmar/{token}`.
- El token **no debe invalidarse** si el paciente recarga la página; solo invalida cuando ejecuta una acción (confirmar, cancelar, solicitar reprogramar).
- Múltiples tokens pueden existir para la misma cita si se reenvía el recordatorio. Solo el último es válido; invalidar los anteriores al generar uno nuevo.

---

### 2.15 `historial_eventos`
**Tipo:** Auditoría  
**Descripción:** Log de eventos relevantes del ciclo de vida de una cita o del expediente de un paciente. Se genera automáticamente en backend.

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | BIGSERIAL PK | |
| `id_paciente` | BIGINT FK → `pacientes` NOT NULL | |
| `id_profesional` | BIGINT FK → `profesionales` NOT NULL | |
| `id_cita` | BIGINT FK → `citas` | nullable (una nota_agregada no tiene cita) |
| `tipo` | VARCHAR(40) NOT NULL | ver enum `HistorialTipoEvento` |
| `descripcion` | VARCHAR(500) NOT NULL | texto legible generado en backend |
| `detalle` | TEXT | información adicional opcional |
| `fecha` | DATE NOT NULL | |
| `hora` | TIME | |
| `creado_en` | TIMESTAMP DEFAULT NOW() | |

**Notas de diseño:**
- **No debe ser insertado directamente por el frontend**. El backend genera estos registros como efecto secundario de otras operaciones (cambio de estado de cita, registro de sesión, etc.).
- Seguir el modelo del frontend: los tipos definidos en `HistorialTipoEvento` son el catálogo inicial.

---

### 2.16 `notificaciones`
**Tipo:** Auxiliar  
**Descripción:** Notificaciones in-app para el profesional/recepcionista. Feed de actividad del dashboard.

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | BIGSERIAL PK | |
| `id_destinatario` | BIGINT FK → `usuarios` NOT NULL | quién la recibe |
| `tipo` | VARCHAR(30) NOT NULL | `'reprogramar'` \| `'sistema'` \| `'agenda'` \| `'equipo'` |
| `icono` | VARCHAR(60) | nombre del icono Ionicons |
| `titulo` | VARCHAR(200) NOT NULL | |
| `descripcion` | TEXT NOT NULL | |
| `leida` | BOOLEAN DEFAULT FALSE | |
| `id_solicitud` | BIGINT FK → `solicitudes_reprogramacion` | si aplica |
| `fecha` | TIMESTAMP DEFAULT NOW() NOT NULL | |

---

### 2.17 `configuracion_agenda`
**Tipo:** Configuración  
**Descripción:** Preferencias de agenda del profesional. Una fila por profesional.

| Campo | Tipo | Default |
|-------|------|---------|
| `id` | BIGSERIAL PK | |
| `id_profesional` | BIGINT FK UNIQUE | |
| `hora_inicio_jornada` | TIME | `09:00` |
| `hora_fin_jornada` | TIME | `18:00` |
| `intervalo_calendario_min` | SMALLINT | `30` |
| `duracion_cita_defecto_min` | SMALLINT | `60` |
| `buffer_citas_min` | SMALLINT | `10` |
| `citas_superpuestas` | BOOLEAN | `FALSE` |
| `mostrar_sabados` | BOOLEAN | `TRUE` |
| `mostrar_domingos` | BOOLEAN | `FALSE` |
| `vista_defecto` | VARCHAR(10) | `'semana'` |
| `antelacion_maxima_dias` | SMALLINT | `90` |

---

### 2.18 `configuracion_recordatorios`
**Tipo:** Configuración  
**Descripción:** Reglas de recordatorios automáticos y comunicación con el paciente.

| Campo | Tipo | Default |
|-------|------|---------|
| `id` | BIGSERIAL PK | |
| `id_profesional` | BIGINT FK UNIQUE | |
| `recordatorio_paciente_activo` | BOOLEAN | `TRUE` |
| `canal_sms` | BOOLEAN | `FALSE` |
| `canal_email` | BOOLEAN | `TRUE` |
| `tiempo_recordatorio` | VARCHAR(10) | `'1dia'` — '30min' \| '1h' \| '2h' \| '1dia' |
| `recordatorio_mismo_dia` | BOOLEAN | `FALSE` |
| `tiempo_recordatorio_dia` | VARCHAR(10) | `'2h'` |
| `solicitar_confirmacion` | BOOLEAN | `TRUE` |
| `permitir_cancelacion` | BOOLEAN | `TRUE` |
| `permitir_reprogramacion` | BOOLEAN | `TRUE` |
| `limite_cancelacion` | VARCHAR(10) | `'12h'` |
| `recordatorio_profesional` | BOOLEAN | `TRUE` |
| `notif_paciente_confirma` | BOOLEAN | `TRUE` |
| `notif_paciente_cancela` | BOOLEAN | `TRUE` |
| `notif_paciente_reprograma` | BOOLEAN | `FALSE` |

---

### 2.19 `configuracion_sistema`
**Tipo:** Configuración  
**Descripción:** Preferencias de UI/sistema del profesional (tema, idioma, zona horaria, privacidad, notificaciones in-app).

| Campo | Tipo | Default |
|-------|------|---------|
| `id` | BIGSERIAL PK | |
| `id_profesional` | BIGINT FK UNIQUE | |
| `notif_in_app` | BOOLEAN | `TRUE` |
| `alertas_sonoras` | BOOLEAN | `FALSE` |
| `avisos_citas_proximas` | BOOLEAN | `TRUE` |
| `avisos_pacientes_nuevos` | BOOLEAN | `TRUE` |
| `avisos_pagos_pendientes` | BOOLEAN | `TRUE` |
| `tema` | VARCHAR(10) | `'claro'` |
| `tamano_interfaz` | VARCHAR(10) | `'normal'` |
| `animaciones` | BOOLEAN | `TRUE` |
| `idioma` | VARCHAR(5) | `'es'` |
| `zona_horaria` | VARCHAR(50) | `'GMT-6'` |
| `formato_hora` | VARCHAR(5) | `'12h'` |
| `formato_fecha` | VARCHAR(15) | `'DD/MM/YYYY'` |
| `moneda` | VARCHAR(5) | `'MXN'` |
| `ocultar_datos_sensibles` | BOOLEAN | `FALSE` |
| `confirmar_eliminar_citas` | BOOLEAN | `TRUE` |
| `confirmar_eliminar_pacientes` | BOOLEAN | `TRUE` |

---

### 2.20 `codigos_beta`
**Tipo:** Temporal / Soporte  
**Descripción:** Tabla de códigos de acceso durante la fase beta cerrada. El frontend valida `BETA_INVITE_CODES` localmente pero el backend debe ser la fuente de verdad.

| Campo | Tipo |
|-------|------|
| `id` | BIGSERIAL PK |
| `codigo` | VARCHAR(30) UNIQUE NOT NULL |
| `usado_por` | BIGINT FK → `usuarios` (nullable) |
| `fecha_uso` | TIMESTAMP |
| `activo` | BOOLEAN DEFAULT TRUE |

---

## 3. Estados y Enums Sugeridos

```sql
-- Estado del ciclo de vida de una cita
CREATE TYPE estado_cita AS ENUM (
  'Pendiente', 'Confirmada', 'Completada', 'Cancelada', 'No asistió', 'Pospuesta'
);

-- Estado de pago de una cita
CREATE TYPE estado_pago AS ENUM ('Pendiente', 'Parcial', 'Pagado');

-- Método de pago
CREATE TYPE metodo_pago AS ENUM ('Efectivo', 'Transferencia', 'Tarjeta', 'Otro');

-- Estado de una solicitud de reprogramación
CREATE TYPE estado_solicitud AS ENUM ('PENDIENTE', 'ACEPTADA', 'RECHAZADA');

-- Roles de usuario
CREATE TYPE rol_usuario AS ENUM ('PROFESIONAL', 'RECEPCIONISTA');
-- Note: almacenar como INT FK a tabla 'roles' es más flexible

-- Tipo de bloqueo horario
CREATE TYPE tipo_bloqueo AS ENUM ('descanso', 'vacacion', 'personal');

-- Tipo de evento en historial del paciente
CREATE TYPE historial_tipo_evento AS ENUM (
  'cita_confirmada', 'cita_completada', 'cita_cancelada',
  'cita_pendiente', 'cita_pospuesta', 'no_asistio',
  'sesion_registrada', 'pago_registrado', 'pago_pendiente',
  'reprogramacion', 'nota_agregada'
);

-- Tipo de notificación in-app
CREATE TYPE tipo_notificacion AS ENUM ('reprogramar', 'sistema', 'agenda', 'equipo');

-- Acción realizada con token de confirmación
CREATE TYPE accion_token AS ENUM (
  'confirmada', 'cancelada', 'reprogramacion_solicitada'
);

-- Tipos de reporte exportable
CREATE TYPE tipo_reporte AS ENUM (
  'citas', 'ingresos', 'pacientes', 'pagos-pendientes', 'no-asistencias'
);

-- Formato de exportación
CREATE TYPE formato_exportacion AS ENUM ('pdf', 'excel');

-- Modalidad de la cita
CREATE TYPE modalidad_cita AS ENUM ('Presencial', 'Virtual');
```

---

## 4. Relaciones del Dominio

```
usuarios
  ├── 1:1 ──── profesionales
  │               ├── 1:N ──── pacientes
  │               │               ├── 1:N ──── alertas_paciente
  │               │               ├── 1:N ──── notas_clinicas ──── 1:1 adjuntos (nota)
  │               │               └── 1:N ──── historial_eventos
  │               │
  │               ├── 1:N ──── citas ──── N:1 pacientes
  │               │               ├── 1:1 ──── sesiones ──── 1:N adjuntos (sesion)
  │               │               ├── 1:N ──── solicitudes_reprogramacion
  │               │               └── 1:1 ──── tokens_confirmacion
  │               │
  │               ├── 1:N ──── bloqueos_horario
  │               ├── 1:N ──── notificaciones (como destinatario)
  │               ├── 1:1 ──── configuracion_agenda
  │               ├── 1:1 ──── configuracion_recordatorios
  │               └── 1:1 ──── configuracion_sistema
  │
  └── 1:1 ──── recepcionistas ──── N:1 profesionales
                  └── 1:1 ──── permisos_recepcionista
```

### Relaciones críticas a tener en cuenta

| Relación | Cardinalidad | Nota |
|----------|-------------|------|
| `usuarios` ↔ `profesionales` | 1:1 | Un usuario solo puede ser profesional una vez |
| `usuarios` ↔ `recepcionistas` | 1:1 | Un usuario solo puede ser recepcionista de un profesional |
| `profesionales` ↔ `recepcionistas` | 1:N | Un profesional puede tener múltiples recepcionistas |
| `pacientes` ↔ `profesionales` | N:1 | Un paciente pertenece a un solo profesional (V1) |
| `citas` ↔ `sesiones` | 1:1 | Una cita como máximo una sesión clínica |
| `citas` ↔ `solicitudes_reprogramacion` | 1:N | Posibles múltiples solicitudes en el tiempo |
| `citas` ↔ `tokens_confirmacion` | 1:N | Pero solo uno activo por vez |
| `profesionales` ↔ `configuracion_*` | 1:1 | Tres tablas de configuración independientes |

---

## 5. Campos Persistidos vs Calculados

### ✅ Deben almacenarse

| Campo | Entidad | Razón |
|-------|---------|-------|
| `duracion_min` | `citas` | Evitar recalcular en queries de disponibilidad; mantener en sync via trigger |
| `estado_pago`, `monto`, `monto_pagado` | `citas` | Estado financiero persistente |
| `fecha_vinculacion` | `recepcionistas` | Dato histórico que no se puede derivar |
| `token` (UUID) | `tokens_confirmacion` | Emitido una vez, referenciado constantemente |
| `fecha_solicitud` | `solicitudes_reprogramacion` | Timestamp de creación inmutable |
| `notas_generales` | `pacientes` | Texto libre introducido por el profesional |
| `storage_key` | `adjuntos` | Referencia al objeto en el bucket |
| todos los campos de `configuracion_*` | — | Preferencias del usuario |

### ❌ NO deben almacenarse (son calculados o derivados)

| Campo (frontend) | Por qué no persistir |
|------------------|---------------------|
| `tiene_sesion` en `CitaDto` | `EXISTS (SELECT 1 FROM sesiones WHERE id_cita = ?)` |
| `nombre_paciente`, `apellido_paciente` en `CitaDto` / `SesionDto` | JOIN con `pacientes` |
| `previewUrl` en `AdjuntoMeta` / `SesionAdjunto` | URL firmada generada on-demand por la API |
| `permisosActivosCount`, `permisosResumen` en `RecepcionistaEquipoViewModel` | Calculado en backend al construir el DTO de respuesta |
| `initials`, `avatarColor` (colores de avatar) | Calculado en frontend a partir del nombre |
| `nombreCompleto` en `RecepcionistaEquipoViewModel` | `nombre + ' ' + apellido` |
| `fechaVinculacion` formateada | Formateo en frontend a partir de `fecha_vinculacion` DATE |
| `diasRestantes` en `ConfirmarCitaData` | `DATEDIFF(fecha_cita, NOW())` |
| `fechaLarga`, `fechaCorta` en `ConfirmarCitaData` | Formateo de `fecha` + `hora_inicio` |
| KPIs (`citasHoy`, `ingresosMes`, etc.) | Queries de agregación en tiempo real |
| `tasaCancelacion` | `100 * COUNT(canceladas) / COUNT(total)` |
| `esNuevo` en `PacienteEstadistica` | `DATE_TRUNC('month', creado_en) = DATE_TRUNC('month', NOW())` |
| `tendencia` de KPIs | Comparación de períodos via query |

---

## 6. Endpoints REST Recomendados

> Convención base: `/api/v1/`  
> Autenticación: `Bearer JWT` en todos excepto los marcados `[público]`  
> Multipart: adjuntos usan `multipart/form-data`

---

### 6.1 Auth

| Método | Ruta | Propósito |
|--------|------|-----------|
| `POST` | `/auth/login` | Login con email/username + password. Devuelve access + refresh tokens |
| `POST` | `/auth/refresh` | Renueva el access token con el refresh token |
| `POST` | `/auth/logout` | Invalida el refresh token |
| `POST` | `/auth/forgot-password` | Solicita email de recuperación |
| `POST` | `/auth/reset-password` | Cambia contraseña usando el token del email |

---

### 6.2 Usuarios / Registro

| Método | Ruta | Propósito |
|--------|------|-----------|
| `POST` | `/usuarios/registro` | Crea un usuario (Profesional o Recepcionista). Valida código beta. Para Recepcionista, valida `codigoVinculacion` del profesional |
| `GET` | `/usuarios/me` | Devuelve el perfil completo del usuario autenticado (incluye extensión Profesional/Recepcionista) |
| `PUT` | `/usuarios/me` | Actualiza datos personales (nombre, apellido, teléfono, domicilio, etc.) |
| `PUT` | `/usuarios/me/password` | Cambia contraseña (requiere contraseña actual) |
| `GET` | `/usuarios/me/permisos` | Devuelve los módulos a los que tiene acceso el usuario actual |

---

### 6.3 Profesionales

| Método | Ruta | Propósito |
|--------|------|-----------|
| `GET` | `/profesionales/me` | Perfil completo del profesional autenticado |
| `PUT` | `/profesionales/me/perfil` | Actualiza nombre_consulta, especialidad, tipo_servicio, descripcion |
| `GET` | `/profesionales/me/codigo-vinculacion` | Devuelve el código para compartir con recepcionistas |
| `POST` | `/profesionales/me/codigo-vinculacion/regenerar` | Genera un nuevo código, invalida el anterior |

---

### 6.4 Configuración

| Método | Ruta | Propósito |
|--------|------|-----------|
| `GET` | `/configuracion/agenda` | Obtiene configuración de agenda del profesional autenticado |
| `PUT` | `/configuracion/agenda` | Guarda configuración de agenda |
| `GET` | `/configuracion/recordatorios` | Obtiene configuración de recordatorios |
| `PUT` | `/configuracion/recordatorios` | Guarda configuración de recordatorios |
| `GET` | `/configuracion/sistema` | Obtiene preferencias de sistema/UI |
| `PUT` | `/configuracion/sistema` | Guarda preferencias de sistema/UI |

---

### 6.5 Pacientes

| Método | Ruta | Propósito |
|--------|------|-----------|
| `GET` | `/pacientes` | Lista paginada de pacientes del profesional. Query params: `busqueda`, `activo`, `orden`, `pagina` |
| `POST` | `/pacientes` | Crea nuevo paciente |
| `GET` | `/pacientes/{id}` | Detalle completo del paciente |
| `PUT` | `/pacientes/{id}` | Actualiza datos del paciente |
| `DELETE` | `/pacientes/{id}` | Baja lógica (setea `activo=false`) |
| `GET` | `/pacientes/{id}/citas` | Historial de citas del paciente (resumen ligero) |
| `GET` | `/pacientes/{id}/sesiones` | Sesiones clínicas del paciente |
| `GET` | `/pacientes/{id}/notas` | Notas clínicas del paciente |
| `POST` | `/pacientes/{id}/notas` | Crea nota clínica |
| `PUT` | `/pacientes/{id}/notas/{notaId}` | Edita nota clínica |
| `DELETE` | `/pacientes/{id}/notas/{notaId}` | Elimina nota clínica |
| `POST` | `/pacientes/{id}/notas/{notaId}/adjunto` | Sube adjunto a una nota (multipart) |
| `DELETE` | `/pacientes/{id}/notas/{notaId}/adjunto` | Elimina adjunto de una nota |
| `GET` | `/pacientes/{id}/historial` | Historial de eventos del expediente |
| `GET` | `/pacientes/{id}/alertas` | Lista alertas del paciente |
| `POST` | `/pacientes/{id}/alertas` | Agrega alerta |
| `DELETE` | `/pacientes/{id}/alertas/{alertaId}` | Elimina alerta |

---

### 6.6 Citas

| Método | Ruta | Propósito |
|--------|------|-----------|
| `GET` | `/citas` | Lista filtrable de citas. Params: `fecha_desde`, `fecha_hasta`, `estado`, `estado_pago`, `id_paciente`, `busqueda` |
| `POST` | `/citas` | Crea nueva cita. Genera token de confirmación si `solicitar_confirmacion=true` |
| `GET` | `/citas/{id}` | Detalle completo de la cita |
| `PUT` | `/citas/{id}` | Actualiza todos los campos editables de la cita |
| `PATCH` | `/citas/{id}/estado` | Cambia solo el estado. Body: `{ "estado": "Confirmada" }`. Genera evento en historial |
| `PATCH` | `/citas/{id}/pago` | Actualiza estado_pago, metodo_pago, monto_pagado. Genera evento historial |
| `DELETE` | `/citas/{id}` | Elimina cita (baja definitiva o lógica, según política) |
| `GET` | `/citas/disponibilidad` | Query params: `fecha`, `duracion_min`. Devuelve slots libres como `[{ hora_inicio, hora_fin }]`. Considera citas existentes + bloqueos + configuración de jornada |

---

### 6.7 Agenda / Bloqueos

| Método | Ruta | Propósito |
|--------|------|-----------|
| `GET` | `/agenda` | Devuelve citas + bloqueos del período. Params: `mes`, `anio` (o `fecha_desde` + `fecha_hasta`). Optimizado para el grid mensual |
| `GET` | `/bloqueos` | Lista bloqueos del profesional. Params: `fecha_desde`, `fecha_hasta` |
| `POST` | `/bloqueos` | Crea bloqueo horario |
| `PUT` | `/bloqueos/{id}` | Edita bloqueo |
| `DELETE` | `/bloqueos/{id}` | Elimina bloqueo |

---

### 6.8 Sesiones Clínicas

| Método | Ruta | Propósito |
|--------|------|-----------|
| `GET` | `/sesiones` | Lista de sesiones del profesional. Params: `busqueda`, `fecha_desde`, `fecha_hasta`, `con_adjunto` |
| `GET` | `/sesiones/{id}` | Detalle de la sesión |
| `POST` | `/citas/{citaId}/sesion` | Crea sesión asociada a una cita. Actualiza `tiene_sesion` derivado |
| `PUT` | `/sesiones/{id}` | Edita notas de la sesión |
| `DELETE` | `/sesiones/{id}` | Elimina sesión |
| `POST` | `/sesiones/{id}/adjunto` | Sube adjunto a sesión (multipart/form-data). Max 1 adjunto por sesión en V1 |
| `DELETE` | `/sesiones/{id}/adjunto` | Elimina adjunto de sesión |

---

### 6.9 Equipo (Recepcionistas)

| Método | Ruta | Propósito |
|--------|------|-----------|
| `GET` | `/equipo` | Lista recepcionistas del profesional autenticado con sus permisos |
| `PUT` | `/equipo/{recepcionistaId}/permisos` | Actualiza permisos del recepcionista. Body: `PermisosRecepcionista` |
| `PATCH` | `/equipo/{recepcionistaId}/activo` | Activa o desactiva el acceso del recepcionista. Body: `{ "activo": false }` |

---

### 6.10 Solicitudes de Reprogramación

| Método | Ruta | Propósito |
|--------|------|-----------|
| `GET` | `/solicitudes-reprogramacion` | Lista solicitudes. Params: `estado=PENDIENTE` |
| `GET` | `/solicitudes-reprogramacion/pendientes` | Shortcut para el badge del dashboard |
| `PATCH` | `/solicitudes-reprogramacion/{id}/aceptar` | Acepta la solicitud. El profesional decide la nueva fecha; puede incluir `{ "nuevaFecha": "...", "nuevaHora": "..." }`. Actualiza la cita y genera historial |
| `PATCH` | `/solicitudes-reprogramacion/{id}/rechazar` | Rechaza. Body: `{ "motivoRechazo": "..." }`. Notifica al paciente |

---

### 6.11 Notificaciones / Actividad

| Método | Ruta | Propósito |
|--------|------|-----------|
| `GET` | `/notificaciones` | Lista notificaciones del usuario autenticado. Params: `leida`, `tipo` |
| `GET` | `/notificaciones/no-leidas/count` | Cantidad de notificaciones no leídas (para el badge) |
| `PATCH` | `/notificaciones/{id}/leida` | Marca como leída |
| `POST` | `/notificaciones/marcar-todas-leidas` | Marca todo el feed como leído |
| `GET` | `/actividad` | Feed de actividad agrupado por fecha. Params: `tipo` (agenda, equipo, sistema, reprogramar) |

---

### 6.12 Confirmación Pública de Cita `[público]`

> Estos endpoints no requieren autenticación. Se protegen solo con el token de un solo uso.

| Método | Ruta | Propósito |
|--------|------|-----------|
| `GET` | `/public/citas/confirmar/{token}` | Devuelve datos de la cita para mostrar al paciente (nombre profesional, fecha, hora, modalidad, etc.). Valida que el token no esté expirado ni usado |
| `POST` | `/public/citas/confirmar/{token}/confirmar` | El paciente confirma la cita. Cambia estado a `Confirmada`. Invalida el token |
| `POST` | `/public/citas/confirmar/{token}/cancelar` | El paciente cancela. Cambia estado a `Cancelada`. Invalida el token |
| `POST` | `/public/citas/confirmar/{token}/reprogramar` | El paciente solicita reprogramar. Crea un registro en `solicitudes_reprogramacion`. Body: `{ "mensajePaciente": "...", "fechaHoraSugerida": "..." }`. Invalida el token |

---

### 6.13 Estadísticas

| Método | Ruta | Propósito |
|--------|------|-----------|
| `GET` | `/estadisticas/resumen` | KPIs principales (citasHoy, citasMes, ingresos, pacientes nuevos, etc.). Params: `rango`, `fecha_desde`, `fecha_hasta` |
| `GET` | `/estadisticas/citas` | Serie temporal de citas + estados. Para el chart de citas por período |
| `GET` | `/estadisticas/ingresos` | Serie temporal de ingresos por método de pago |
| `GET` | `/estadisticas/pacientes` | Nuevos vs recurrentes, ranking por citas, ranking por ingresos |
| `GET` | `/estadisticas/insights` | Lista de insights destacados generados por el backend |
| `GET` | `/estadisticas/caja-diaria` | Resumen de caja para una fecha específica. Param: `fecha` |
| `GET` | `/estadisticas/reportes` | Lista de reportes disponibles con metadatos |
| `GET` | `/estadisticas/reportes/{tipo}` | Filas detalladas de un reporte. Params: filtros de período |
| `POST` | `/estadisticas/reportes/exportar` | Genera y devuelve (o encola) un reporte en PDF o Excel |

---

### 6.14 Vinculación Beta

| Método | Ruta | Propósito |
|--------|------|-----------|
| `POST` | `/vinculacion/validar-codigo-beta` | Valida el código de invitación beta. Body: `{ "codigo": "..." }`. Devuelve si es válido y no está usado |
| `GET` | `/vinculacion/profesional/{codigoVinculacion}` | Busca el profesional por su código de vinculación (para el formulario de registro de recepcionistas). Devuelve nombre del profesional |

---

## 7. Recomendaciones de Arquitectura Backend

### 7.1 Separación de entidades — qué NO mezclar

| ❌ Anti-patrón a evitar | ✅ Cómo debe ser |
|------------------------|----------------|
| Poner datos de `profesionales` en `usuarios` | `usuarios` solo tiene credenciales y datos personales; `profesionales` tiene la dimensión de negocio |
| Poner permisos en `recepcionistas` directamente como columnas | Tabla `permisos_recepcionista` separada; facilita agregar permisos en V2 sin ALTER TABLE masivo |
| Guardar el adjunto binario (BYTEA) en PostgreSQL | Siempre object storage externo (S3/GCS/MinIO). PostgreSQL solo guarda el `storage_key` |
| Una sola tabla `configuracion` con JSONB para todo | Tres tablas separadas (`configuracion_agenda`, `_recordatorios`, `_sistema`) facilitan las queries de validación y las actualizaciones parciales |
| El `historial_eventos` como inserción directa del frontend | Generar server-side como efecto secundario en el Service layer; es la fuente de verdad del audit trail |

### 7.2 Configuraciones son siempre por Profesional

Las tres tablas de configuración (`configuracion_agenda`, `configuracion_recordatorios`, `configuracion_sistema`) son 1:1 con `profesionales`, no con `usuarios`. El recepcionista hereda la configuración de su profesional pero no puede editarla (salvo que tenga el permiso `configuracion=true`).

### 7.3 Flujos que requieren token seguro

Dos flujos deben usar tokens de uso único:

1. **Confirmación de cita**: `tokens_confirmacion` con UUID + expiración. La ruta pública `/public/citas/confirmar/{token}` es el único entrypoint sin JWT. El token se firma con la `id_cita` para evitar enumeración.
2. **Reset de contraseña**: `reset_token` en `usuarios`, válido por 1 hora máximo. Envio exclusivo por email, no expuesto en ninguna respuesta de API.

### 7.4 Eventos que deben generar notificaciones automáticas

El backend debe emitir notificaciones (registros en `notificaciones`) como efecto secundario de:

| Evento | Destinatario |
|--------|-------------|
| Paciente confirma cita via token | Profesional + Recepcionistas con permiso `citas` |
| Paciente cancela cita via token | Profesional + Recepcionistas con permiso `citas` |
| Paciente solicita reprogramación | Profesional + Recepcionistas con permiso `citas` |
| Nuevo recepcionista se vincula | Profesional |
| Pago pendiente detectado (cita completada sin pago) | Profesional |
| Cita próxima (configuración: `avisos_citas_proximas`) | Profesional + Recepcionistas |

### 7.5 Lo que merece tabla propia (no columna)

- `alertas_paciente`: array de strings en el frontend → tabla propia para CRUD individual
- `bloqueos_horario`: bloqueos son entidades editables, no un campo de configuración
- Cada grupo de configuración (`agenda`, `recordatorios`, `sistema`): tres tablas, no una sola con JSONB, para facilitar validación de campos individuales en Spring

### 7.6 Diseño de la capa de autorización en Spring

El modelo del frontend es sólido y mapea directamente a Spring Security:

```
PROFESIONAL     → acceso total
RECEPCIONISTA   → acceso solo a módulos donde permisos[modulo] = true
```

Implementar como `@PreAuthorize` con un `CustomPermissionEvaluator` que consulte `permisos_recepcionista`. No usar roles de Spring para los permisos granulares; manejar con la tabla propia.

### 7.7 Multitenancy implícito

La app es **single-tenant por profesional**: cada profesional tiene su propia isla de datos. Toda query de negocio debe filtrar por `id_profesional` derivado del JWT. No existe un profesional que pueda ver pacientes/citas de otro.

Estrategia recomendada: implementar un `ProfesionalContextHolder` (similar a `SecurityContextHolder`) que se llene en cada request a partir del JWT y que los Services usen para inyectarlo en todas las queries. Nunca confiar en `id_profesional` del request body.

### 7.8 Campos para V2 — definir contrato ahora

Aunque no se implementen en V1, dejar espacio en el schema para:

| Feature V2 | Campo/tabla a reservar |
|------------|----------------------|
| Agenda Online (pacientes pueden agendar solos) | `agenda_online_activa BOOLEAN` en `configuracion_agenda` |
| Múltiples profesionales por práctica | Tabla `practicas` con 1:N `profesionales` |
| Telemetría / uso por feature | Tabla `eventos_uso (id_usuario, feature, fecha)` |
| Pagos online | Tabla `pagos (id_cita, pasarela, referencia_externa, estado)` |
| Grupos de sesión | `tipo_sesion ENUM` en `sesiones` |

---

## 8. Riesgos e Inconsistencias Detectadas desde el Frontend

### 8.1 `CitaResumenDto` vs `CitaDto` — dos formas del mismo objeto

El frontend tiene dos versiones de "cita":
- `CitaDto` (completo): en `pages/citas/models/cita.model.ts` — usado en la página de citas y agenda
- `CitaResumenDto` (ligero): en `pages/pacientes/models/paciente.model.ts` — embebido en el perfil del paciente

`CitaResumenDto` tiene un campo `tipo: string` que **no existe** en `CitaDto`. En el contexto del perfil del paciente, `tipo` equivale a `motivo`. El backend debe devolver el mismo campo con el mismo nombre en ambas respuestas: usar `motivo` en ambas y que el frontend adapte la visualización.

### 8.2 `SesionPaciente` vs `SesionDto` — campos distintos

`SesionPaciente` (embedded en perfil de paciente) tiene `tipo` y `resumen` que no existen en `SesionDto`. En V1 ambos se mapean a `notas`. En V2 si se implementan tipos de sesión, definir `tipo_sesion` en la tabla `sesiones`.

### 8.3 `tiene_sesion` en `CitaDto` — campo derivado tratado como persistido

El frontend espera recibir `tiene_sesion: boolean` en la respuesta de cita. Este campo **no debe almacenarse**; el backend debe calcularlo en el DTO de respuesta:
```java
citaDto.setTieneSesion(sesionRepository.existsByIdCita(cita.getId()));
```
O más eficientemente con un LEFT JOIN en la query de listado.

### 8.4 `nombre_paciente` / `apellido_paciente` desnormalizados

Aparecen en `CitaDto`, `SesionDto` y `SolicitudReprogramacion`. Son datos derivados por JOIN. El backend no debe almacenarlos; los formatea en el mapper antes de devolver el DTO.

### 8.5 `previewUrl` en `AdjuntoMeta` / `SesionAdjunto`

Es una `object URL` del browser (`blob:...`), no un campo de base de datos. El backend nunca recibe ni devuelve este campo. El frontend debe ignorarlo al enviar datos y generarlo localmente al recibir la URL real del adjunto.

### 8.6 `BETA_INVITE_CODES` hardcodeado en `registro.page.ts`

La validación del código beta está actualmente en el frontend. **Nunca debe validarse en el cliente**. El endpoint de registro o un endpoint dedicado `/vinculacion/validar-codigo-beta` debe ser la fuente de verdad.

### 8.7 `diasRestantes` en `ConfirmarCitaData` — dato sensible en cliente

El frontend del `confirmar-cita` calcula visualmente `diasRestantes` a partir de la fecha devuelta por el backend. Correcto que el backend devuelva la fecha bruta; el frontend lo formatea. No incluir `diasRestantes` como campo en la respuesta del backend.

### 8.8 `avatarColor` en `ConfirmarCitaData`

El backend mock devuelve el color hex del avatar del paciente. El backend real no debe generar ni almacenar este valor. Es estrictamente una función del frontend (`getAvatarColor(nombre) = colores[nombre.charCodeAt(0) % 7]`).

### 8.9 `estadoCita` en el formulario de confirmación pública

El frontend permite que el paciente cambie el estado de la cita (confirmar/cancelar) vía token. El backend debe validar que la transición de estado sea válida según la máquina de estados:
- `Pendiente` → `Confirmada` ✅
- `Pendiente` → `Cancelada` ✅
- `Confirmada` → `Cancelada` ✅ (si lo permite la configuración)
- `Completada` → cualquier cosa ❌ (bloquear)
- `No asistió` → cualquier cosa ❌ (bloquear)

### 8.10 Múltiples `tokens_confirmacion` por cita

Si se reenvía el recordatorio, se genera un nuevo token. El backend debe desactivar los tokens anteriores de la misma cita al crear uno nuevo. No basta con `UNIQUE(id_cita)` en tokens; la validez es temporal.

### 8.11 Configuración de `sábados` / `domingos` sin tabla `dias_laborales`

El frontend usa dos booleans (`mostrar_sabados`, `mostrar_domingos`). En un modelo más rico se necesitaría una tabla `dias_laborales (id_profesional, dia_semana: INT, activo: BOOLEAN, hora_inicio: TIME, hora_fin: TIME)` para soporte completo de horarios por día. Definir ahora si V1 es suficiente con los dos booleans o si se necesita el modelo extendido.

### 8.12 Estadísticas no tienen propio módulo de datos

Todos los endpoints de estadísticas son queries de agregación sobre `citas`, `pacientes` y `sesiones`. No necesitan tablas propias en V1. Si el volumen de datos crece, considerar views materializadas o una capa de precalculación en V2.

---

## 9. Diagrama de Entidades (simplificado)

```
┌─────────────┐     ┌──────────────────┐     ┌────────────────────────┐
│  usuarios   │─1:1─│  profesionales   │─1:1─│  configuracion_agenda  │
│             │     │                  │─1:1─│  configuracion_record. │
│ id          │     │ id               │─1:1─│  configuracion_sistema │
│ email       │     │ id_usuario       │     └────────────────────────┘
│ password    │     │ especialidad     │
│ id_rol      │     │ codigo_vinc.     │─1:N─┐
└─────────────┘     └──────────────────┘     │
      │                                      ▼
      │ 1:1          ┌───────────────┐   ┌─────────────────────┐
      └──────────────│ recepcionistas│   │      pacientes      │
                     │               │   │                     │
                     │ id_usuario    │   │ id_profesional      │
                     │ id_profesional│   │ nombre, apellido    │
                     │ activo        │   │ email, telefono     │
                     └───────────────┘   └─────────────────────┘
                            │ 1:1               │ 1:N
                            ▼                   ▼
                  ┌────────────────────┐  ┌──────────────────────┐
                  │permisos_recepcion. │  │        citas         │
                  │                   │  │                      │
                  │ agenda, citas,    │  │ id_paciente          │
                  │ pacientes,        │  │ id_profesional       │
                  │ notas_clinicas,   │  │ fecha, hora_inicio   │
                  │ configuracion     │  │ estado, monto        │
                  └────────────────────┘  └──────────────────────┘
                                                   │
                       ┌──────────────┬────────────┼──────────────┐
                       ▼              ▼            ▼              ▼
               ┌──────────────┐ ┌──────────┐ ┌────────────┐ ┌──────────────────┐
               │   sesiones   │ │solicitudes│ │  tokens_   │ │historial_eventos │
               │              │ │reprogr.   │ │confirmacion│ │                  │
               │ id_cita (1:1)│ │           │ │            │ │ tipo, descripcion│
               │ notas        │ │ estado    │ │ token UUID │ │ fecha            │
               └──────────────┘ └──────────┘ └────────────┘ └──────────────────┘
                      │
                      ▼
               ┌──────────────┐
               │   adjuntos   │
               │              │
               │ entidad_tipo │
               │ storage_key  │
               └──────────────┘
```

---

*Blueprint generado el 17/03/2026 — Agendify v0.0.1-prealpha*  
*Análisis basado en 40+ archivos del frontend: modelos TypeScript, servicios mock, páginas, modales y componentes compartidos.*
