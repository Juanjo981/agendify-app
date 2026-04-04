# Ajustes de Backend Necesarios para Soportar el Frontend — Agendify

> **Versión:** 1.0  
> **Fecha:** 3 de abril de 2026  
> **Autor:** Arquitectura Frontend  
> **Última actualización:** Fase 0 — Análisis inicial

---

## 1. Objetivo del Documento

Este documento es un **backlog técnico vivo** de ajustes necesarios en el backend, detectados desde la perspectiva del frontend.

Su propósito es garantizar que la API esté diseñada para servir correctamente a la experiencia del usuario, no solo para reflejar el schema de la base de datos.

Se actualizará conforme avancemos módulo por módulo en la integración frontend ↔ API real.

---

## 2. Regla del Proyecto: El Backend se Adapta al Frontend

> **El frontend es la fuente de verdad funcional de la experiencia del usuario.**

Si un endpoint, contrato, DTO, estructura de respuesta, naming, flujo, validación, paginación o comportamiento del backend **NO cumple** con lo que necesita el frontend para ofrecer una buena experiencia:

- **NO** adaptamos el frontend con workarounds feos
- **SÍ** documentamos el cambio necesario en este archivo
- **SÍ** ajustamos el backend para servir correctamente al frontend

Excepciones temporales están permitidas solo cuando:
- El cambio backend está planificado pero no implementado aún
- El workaround frontend es trivial y limpio
- Se documenta explícitamente como **solución temporal** con fecha de vencimiento

---

## 3. Cómo se Actualizará este Documento

| Momento | Acción |
|---------|--------|
| Al iniciar una fase de integración | Revisar hallazgos pendientes de este documento para el módulo en cuestión |
| Al encontrar una discrepancia | Agregar un nuevo hallazgo con toda la información |
| Al resolver un hallazgo | Cambiar estado a `✅ Resuelto` con la fecha y solución aplicada |
| Al fin de cada fase | Revisar que no quedaron hallazgos sin documentar |

### Clasificación de severidad

| Nivel | Significado |
|-------|------------|
| 🔴 **Obligatorio** | Sin este cambio, el frontend no puede integrar el módulo correctamente |
| 🟠 **Recomendado** | El frontend puede funcionar con un workaround, pero el cambio simplifica y mejora la integración |
| 🟡 **Menor** | Inconsistencia estética o de convención que no bloquea pero debería corregirse |
| 💡 **Oportunidad** | Mejora que reduciría complejidad, llamadas o duplicación en frontend |

---

## 4. Hallazgos Iniciales

> Detectados durante el análisis del blueprint y la arquitectura frontend existente, **antes de comenzar la integración real**.

---

### Hallazgo 1 — `/auth/me` devuelve datos insuficientes para el session bootstrap

- **Módulo:** Auth / Sesión
- **Severidad:** 🔴 Obligatorio
- **Fase afectada:** Fase 2

**Problema detectado:**  
La interfaz actual `Usuario` que devuelve `/auth/me` solo contiene `{ id_usuario, username }`. El frontend necesita datos mucho más completos para reconstruir la sesión al recargar la app.

**Comportamiento actual del backend:**  
`GET /api/auth/me` → `{ id_usuario: number, username: string }`

**Comportamiento esperado para el frontend:**  
`GET /api/auth/me` debe devolver un DTO expandido que incluya:

```json
{
  "id_usuario": 1,
  "username": "drgarcia",
  "nombre": "Carlos",
  "apellido": "García",
  "email": "carlos@agendify.com",
  "id_rol": 3,
  "nombre_rol": "PROFESIONAL",
  "activo": true,
  "fecha_nacimiento": "1985-03-15",
  "domicilio": "Calle Principal 123",
  "numero_telefono": "+52 555 123 4567",
  "profesional": {
    "id_profesional": 1,
    "especialidad": "Psicología Clínica",
    "nombre_consulta": "Consultorio García",
    "tipo_servicio": "Psicología",
    "codigo_vinculacion": "AGD-4F2K"
  },
  "permisos": null
}
```

Para un recepcionista, el campo `profesional` sería `null` y `permisos` contendría:

```json
{
  "permisos": {
    "agenda": true,
    "citas": true,
    "pacientes": true,
    "notas_clinicas": false,
    "configuracion": false
  }
}
```

**Cambio recomendado en backend:**  
Ampliar el DTO de respuesta de `/auth/me` para incluir todos los campos necesarios para el session bootstrap. Incluir la extensión del profesional o recepcionista según el rol, y los permisos del recepcionista si aplica.

**Alternativa:** Crear un endpoint dedicado `GET /api/usuarios/me/perfil-completo` o permitir que el frontend haga dos llamadas (`/auth/me` + `/usuarios/me/permisos`), pero esto es menos eficiente.

**Prioridad:** Alta — sin esto no se puede hacer session bootstrap ni authorization real.  
**Bloqueante:** Sí, para Fase 2.  
**Solución temporal en frontend:** Seguir usando `SessionMockService` hasta que este endpoint esté listo.  
**Estado:** ✅ Implementado — AuthMeResponseDto con datos expandidos

---

### Hallazgo 2 — Ruta de registro inconsistente

- **Módulo:** Auth / Registro
- **Severidad:** 🟠 Recomendado
- **Fase afectada:** Fase 2

**Problema detectado:**  
El frontend actual usa `POST /api/usuario/crear` para el registro, pero el blueprint sugiere `POST /api/usuarios/registro`. Necesitan coincidir.

**Comportamiento actual del backend:**  
No está claro cuál es la ruta real implementada. El código en `usuario.ts` llama a `${environment.apiUrl}/usuario/crear`.

**Comportamiento esperado para el frontend:**  
Una sola ruta consistente. Sugerimos `POST /api/usuarios/registro` por ser más RESTful y consistente con el naming plural (`/api/usuarios/me`, `/api/usuarios/me/permisos`).

**Cambio recomendado en backend:**  
Si la ruta real es `/api/usuario/crear`, cambiarla a `/api/usuarios/registro` (o al menos `/api/usuarios`). Si ya es `/api/usuarios/registro`, el frontend se ajustará.

**Prioridad:** Media  
**Bloqueante:** No (se ajusta fácilmente del lado que sea)  
**Estado:** ✅ Ya existente — `/api/usuarios/registro` ya implementado

---

### Hallazgo 3 — `ROL_REGISTRO` IDs podrían no coincidir con el backend

- **Módulo:** Auth / Registro
- **Severidad:** 🔴 Obligatorio
- **Fase afectada:** Fase 2

**Problema detectado:**  
El frontend define dos sets de IDs de rol:
- `ROL_REGISTRO = { PROFESIONAL: 1, RECEPCIONISTA: 2, ADMIN: 3 }` — enviados al registrarse
- `RolUsuario = { PROFESIONAL: 3, RECEPCIONISTA: 4 }` — usados internamente para verificar permisos

El blueprint de base de datos define la tabla `roles` con IDs `3=PROFESIONAL, 4=RECEPCIONISTA`.

**Impacto en frontend:**  
Si el backend espera `id_rol: 3` para Profesional en el registro pero el frontend envía `id_rol: 1`, el registro fallará silenciosamente o creará el rol incorrecto.

**Cambio recomendado en backend:**  
Documentar explícitamente qué `id_rol` espera el endpoint de registro. Lo ideal es que sea el mismo ID que la tabla `roles` (`3=PROFESIONAL, 4=RECEPCIONISTA`) para evitar confusión. El frontend se ajustará a lo que el backend defina.

**Prioridad:** Alta  
**Bloqueante:** Sí, para el registro  
**Estado:** ⬜ Pendiente — Requiere cambio en frontend. IDs reales del backend: ADMIN=1, PROFESIONAL=2, RECEPCIONISTA=3 (ver `GET /api/roles`)

---

### Hallazgo 4 — PacienteDto: ¿el detalle incluye sub-recursos o se cargan aparte?

- **Módulo:** Pacientes
- **Severidad:** 🟠 Recomendado
- **Fase afectada:** Fase 3

**Problema detectado:**  
El mock actual de `PacienteDto` incluye embebidos los arrays `citas[]` y `notas[]` directamente en el objeto del paciente. El blueprint sugiere endpoints separados para sub-recursos (`/pacientes/{id}/citas`, `/pacientes/{id}/notas`, etc.).

**Impacto en frontend:**  
Si `GET /api/pacientes/{id}` no incluye `citas` ni `notas` en el body de respuesta, el frontend deberá hacer 3-5 llamadas adicionales al cargar el detalle del paciente, una por cada tab.

**Cambio recomendado en backend (dos opciones):**

**Opción A (preferida — menos llamadas):**  
`GET /api/pacientes/{id}` devuelve el paciente con un resumen ligero de sub-recursos:
```json
{
  "id_paciente": 1,
  "nombre": "...",
  "citas_count": 12,
  "notas_count": 5,
  "alertas": ["Alérgico a penicilina"],
  "ultima_cita": "2026-03-15"
}
```
Y los sub-recursos completos se cargan lazy vía endpoints separados.

**Opción B (más simple pero más pesado):**  
`GET /api/pacientes/{id}` devuelve todo embebido (citas, notas, historial). Más simple pero puede ser lento con muchos datos.

**Recomendación para el frontend:** Opción A — carga lazy de tabs para mejor rendimiento.

**Prioridad:** Media  
**Bloqueante:** No (el frontend puede adaptarse a cualquier opción)  
**Estado:** ⬜ Pendiente — Decisión de diseño frontend

---

### Hallazgo 5 — Alertas de paciente: de `string[]` a entidad con ID

- **Módulo:** Pacientes
- **Severidad:** 🟡 Menor
- **Fase afectada:** Fase 3

**Problema detectado:**  
El mock actual tiene `alertas: string[]` en `PacienteDto`. El blueprint define `alertas_paciente` como tabla separada con `id` y `descripcion`.

**Impacto en frontend:**  
El frontend necesitará un `id` para poder eliminar alertas individuales. Actualmente elimina por índice del array.

**Cambio recomendado en backend:**  
Devolver alertas como `{ id: number, descripcion: string }[]` en lugar de `string[]`. Esto ya está contemplado en el blueprint con la tabla `alertas_paciente`.

**Cambio requerido en frontend:**  
Adaptar la interfaz `PacienteDto.alertas` de `string[]` a `{ id: number, descripcion: string }[]`.

**Prioridad:** Baja  
**Bloqueante:** No  
**Estado:** ✅ Ya existente — AlertaPacienteDto ya tiene id_alerta_paciente

---

### Hallazgo 6 — Endpoint `/api/agenda` — ¿existe como endpoint dedicado?

- **Módulo:** Agenda
- **Severidad:** 🟠 Recomendado
- **Fase afectada:** Fase 5

**Problema detectado:**  
El blueprint sugiere un endpoint `GET /api/agenda` que devuelve citas + bloqueos del período en una sola llamada. Sin embargo, no está claro si este endpoint dedicado está implementado, o si el frontend debe combinar manualmente `GET /api/citas?fecha_desde=...&fecha_hasta=...` + `GET /api/bloqueos?...`.

**Impacto en frontend:**  
Sin endpoint dedicado, el frontend necesita:
1. `GET /api/citas?fecha_desde=2026-04-01&fecha_hasta=2026-04-30` — citas del mes
2. `GET /api/bloqueos?fecha_desde=2026-04-01&fecha_hasta=2026-04-30` — bloqueos del mes
3. Combinarlos en el calendario

Con endpoint dedicado, una sola llamada devolvería ambos, con rendimiento y simplicidad superiores.

**Cambio recomendado en backend:**  
Implementar `GET /api/agenda?mes=4&anio=2026` que devuelva:
```json
{
  "citas": [ ... ],
  "bloqueos": [ ... ],
  "configuracion_jornada": {
    "hora_inicio": "09:00",
    "hora_fin": "18:00",
    "mostrar_sabados": true,
    "mostrar_domingos": false
  }
}
```

Incluir la configuración de jornada evita una tercera llamada para obtener los horarios laborales.

**Prioridad:** Media  
**Bloqueante:** No (se puede hacer con dos llamadas separadas)  
**Estado:** ✅ Implementado — GET /api/agenda?mes=X&anio=Y consolidado
---

### Hallazgo 7 — Campos derivados que el backend debe incluir en DTOs de respuesta

- **Módulo:** Citas, Sesiones
- **Severidad:** 🔴 Obligatorio
- **Fase afectada:** Fases 4, 6

**Problema detectado:**  
Varios campos que el frontend espera son derivados (calculados por JOIN o EXISTS), no almacenados. El backend debe incluirlos en los DTOs de respuesta:

| Campo | DTO | Cómo obtener |
|-------|-----|-------------|
| `nombre_paciente` | `CitaDto`, `SesionDto` | JOIN con `pacientes` |
| `apellido_paciente` | `CitaDto`, `SesionDto` | JOIN con `pacientes` |
| `tiene_sesion` | `CitaDto` | `EXISTS (SELECT 1 FROM sesiones WHERE id_cita = ?)` |
| `paciente_nombre` | `SolicitudReprogramacion` | JOIN con `citas` → `pacientes` |

**Comportamiento esperado:**  
El DTO de respuesta del backend debe incluir estos campos ya resueltos. El frontend **no debe** hacer llamadas adicionales para obtener el nombre del paciente de cada cita.

**Cambio recomendado en backend:**  
Asegurar que los mappers de respuesta (DTO builders) incluyan estos campos derivados vía JOINs en las queries o en la capa de servicio.

**Prioridad:** Alta  
**Bloqueante:** Sí, para la renderización de listados  
**Estado:** ✅ Implementado — CitaDto, SesionDto, SolicitudReprogramacionDto con campos derivados
---

### Hallazgo 8 — Convención de naming: ¿snake_case uniformemente?

- **Módulo:** Transversal
- **Severidad:** 🟡 Menor
- **Fase afectada:** Todas

**Problema detectado:**  
La mayoría de interfaces del frontend usan `snake_case` para coincidir con el backend (`id_cita`, `nombre_paciente`, `estado_pago`). Sin embargo, `SolicitudReprogramacion` usa `camelCase` (`idSolicitud`, `pacienteNombre`, `fechaCita`).

**Impacto en frontend:**  
Si el backend envía `id_solicitud` (snake_case) pero el frontend espera `idSolicitud` (camelCase), la deserialización fallará silenciosamente (campos `undefined`).

**Recomendación:**  
Definir una convención global y única:
- **Opción A:** El backend configura Jackson para enviar `camelCase` (propiedad `spring.jackson.property-naming-strategy=LOWER_CAMEL_CASE`)
- **Opción B:** El backend envía `snake_case` y el frontend ajusta la interfaz `SolicitudReprogramacion` a snake_case para ser consistente

Recomendamos **Opción B** (snake_case uniforme) porque es el estándar actual del 90% de las interfaces del frontend.

**Prioridad:** Baja (se resuelve al integrar el módulo correspondiente)  
**Bloqueante:** No
**Estado:** ✅ Implementado — spring.jackson.property-naming-strategy=SNAKE_CASE

---

### Hallazgo 9— Código beta validado localmente en frontend

- **Módulo:** Registro / Vinculación
- **Severidad:** 🔴 Obligatorio
- **Fase afectada:** Fase 2

**Problema detectado:**  
`registro.page.ts` tiene `BETA_INVITE_CODES` hardcodeado y valida el código localmente antes de enviar el registro. Esto es una vulnerabilidad de seguridad: cualquier usuario puede inspeccionar el código fuente y encontrar los códigos válidos.

**Comportamiento actual:**  
```typescript
const BETA_INVITE_CODES = ['BETA-2024-AGD', ...];
// Validación local antes de POST
```

**Comportamiento esperado:**  
El frontend envía el `codigo_beta` al backend sin validarlo localmente. El backend valida contra la tabla `codigos_beta` y devuelve un error tipado si es inválido:
```json
{ "code": "CODIGO_BETA_INVALIDO", "message": "El código de invitación no es válido o ya fue utilizado" }
```

**Cambio recomendado en backend:**  
Asegurar que el endpoint de registro (`POST /api/usuarios/registro`) valide el `codigo_beta` y devuelva error `CODIGO_BETA_INVALIDO` si es inválido o ya fue usado. El código de error ya está contemplado en `api-error.mapper.ts`.

**Prioridad:** Alta (vulnerabilidad de seguridad)  
**Bloqueante:** No (funciona pero es inseguro)  
**Estado:** ✅ Ya existente — Backend valida codigo_beta en registrarPublico()
---

### Hallazgo 10 — Endpoint de disponibilidad: definición del contrato de respuesta

- **Módulo:** Citas
- **Severidad:** 🟠 Recomendado
- **Fase afectada:** Fase 4

**Problema detectado:**  
El blueprint menciona `GET /api/citas/disponibilidad` con params `fecha` y `duracion_min`, pero no especifica el formato exacto de la respuesta.

**Comportamiento esperado para el frontend:**  
```json
{
  "fecha": "2026-04-15",
  "duracion_solicitada_min": 60,
  "slots_disponibles": [
    { "hora_inicio": "09:00", "hora_fin": "10:00" },
    { "hora_inicio": "10:30", "hora_fin": "11:30" },
    { "hora_inicio": "14:00", "hora_fin": "15:00" }
  ]
}
```

El endpoint debe considerar:
1. Configuración de jornada del profesional (hora inicio/fin)
2. Citas ya agendadas (evitar solapamiento)
3. Bloqueos horarios
4. Buffer entre citas (`buffer_citas_min`)
5. Flag `citas_superpuestas` (si está activo, no restringir)

**Cambio recomendado en backend:**  
Implementar el endpoint con la lógica de cálculo completa y devolver la respuesta en el formato descrito.

**Prioridad:** Media  
**Bloqueante:** No (el frontend puede funcionar sin mostrar disponibilidad, pero la UX mejora mucho con ella)  
**Estado:** ✅ Implementado — `GET /api/citas/disponibilidad?fecha=X&duracion_min=Y` con `slots_disponibles[]`

---

### Hallazgo 11 — Dashboard: no existe endpoint dedicado de resumen

- **Módulo:** Dashboard
- **Severidad:** 💡 Oportunidad
- **Fase afectada:** Fase 7

**Problema detectado:**  
Para renderizar el dashboard, el frontend necesita datos de múltiples fuentes:
1. Citas de hoy
2. KPIs (citas mes, ingresos mes, pacientes nuevos, tasa cancelación)
3. Solicitudes de reprogramación pendientes (count)
4. Notificaciones no leídas (count)

Sin un endpoint dedicado, esto requiere 4+ llamadas en paralelo al cargar el dashboard.

**Comportamiento esperado para el frontend (ideal):**  
Un solo endpoint `GET /api/dashboard` que devuelva:
```json
{
  "citas_hoy": [ ... ],
  "kpis": {
    "citas_hoy_count": 5,
    "citas_mes_count": 42,
    "ingresos_mes": 15000.00,
    "pacientes_nuevos_mes": 3,
    "tasa_cancelacion": 8.5
  },
  "solicitudes_pendientes_count": 2,
  "notificaciones_no_leidas_count": 7
}
```

**Cambio recomendado en backend:**  
Considerar un endpoint de dashboard que agregue los datos más consultados. No es obligatorio — el frontend puede hacer múltiples llamadas en paralelo, pero un endpoint consolidado reduce latencia y complejidad.

**Prioridad:** Baja  
**Bloqueante:** No  
**Solución temporal en frontend:** Llamadas paralelas a endpoints individuales  
**Estado:** ✅ Implementado — GET /api/dashboard/consolidado
---

### Hallazgo 12 — Solicitud de reprogramación: necesita datos de la cita embebidos

- **Módulo:** Solicitudes de Reprogramación
- **Severidad:** 🟠 Recomendado
- **Fase afectada:** Fase 7

**Problema detectado:**  
El frontend muestra en el card de solicitud de reprogramación: nombre del paciente, fecha de la cita y hora de la cita. Estos datos no están en la tabla `solicitudes_reprogramacion` — se obtienen vía JOIN con `citas` y `pacientes`.

**Comportamiento esperado para el frontend:**  
`GET /api/solicitudes-reprogramacion` debe devolver cada solicitud con estos campos derivados:
```json
{
  "id_solicitud": 1,
  "id_cita": 5,
  "paciente_nombre": "María López",
  "fecha_cita": "2026-04-15",
  "hora_cita": "09:00",
  "mensaje_paciente": "No puedo asistir ese día",
  "fecha_hora_sugerida": "2026-04-17T10:00:00",
  "estado": "PENDIENTE",
  "fecha_solicitud": "2026-04-10T14:30:00"
}
```

**Cambio recomendado en backend:**  
Incluir `paciente_nombre`, `fecha_cita` y `hora_cita` como campos derivados en el DTO de respuesta de solicitudes de reprogramación.

**Prioridad:** Media  
**Bloqueante:** Sí, para renderizar el componente de solicitudes  
**Estado:** ✅ Implementado — SolicitudReprogramacionDto incluye paciente_nombre, fecha_cita, hora_cita

---

### Hallazgo 13 — Configuraciones: ¿se crean automáticamente al registrar profesional?

- **Módulo:** Configuración
- **Severidad:** 🟠 Recomendado
- **Fase afectada:** Fase 8

**Problema detectado:**  
Existen tres tablas de configuración (`configuracion_agenda`, `configuracion_recordatorios`, `configuracion_sistema`). El frontend espera poder hacer `GET /api/configuracion/agenda` y obtener una respuesta exitosa siempre.

**Problema potencial:**  
Si el profesional se acaba de registrar y nunca ha configurado nada, el `GET` devolvería 404 porque no existe la fila.

**Comportamiento esperado para el frontend:**  
Al registrar un profesional, el backend crea automáticamente las tres filas de configuración con valores por defecto. De esta forma, `GET /api/configuracion/agenda` siempre devuelve datos.

**Cambio recomendado en backend:**  
En el servicio de registro, al crear un `profesional`, insertar también las tres configuraciones con defaults:
- `configuracion_agenda`: hora_inicio=09:00, hora_fin=18:00, intervalo=30, etc.
- `configuracion_recordatorios`: recordatorio_paciente_activo=true, canal_email=true, etc.
- `configuracion_sistema`: tema=claro, idioma=es, etc.

**Alternativa:** El backend devuelve defaults si no existe la fila (lógica en el servicio), sin generar 404.

**Prioridad:** Media  
**Bloqueante:** No (el frontend puede manejar 404 con defaults locales, pero es más limpio si el backend los tiene)  
**Estado:** ✅ Implementado — crearConfiguracionesDefault() en UsuarioServiceImpl

---

### Hallazgo 14 — Adjuntos: flujo de upload no definido (multipart vs signed URL)

- **Módulo:** Sesiones / Notas / Adjuntos
- **Severidad:** 🟠 Recomendado
- **Fase afectada:** Fase 6

**Problema detectado:**  
El blueprint menciona object storage para adjuntos pero no especifica el flujo de upload:

**Opción A — Multipart directo:** El frontend envía el archivo al backend vía `POST multipart/form-data`. El backend lo sube a storage y registra metadata.

**Opción B — Signed URL:** El frontend pide una URL firmada al backend → sube directamente a storage → confirma al backend con los metadatos.

**Impacto en frontend:**  
- Opción A: más simple para el frontend (un solo request), pero el backend se convierte en proxy del archivo completo
- Opción B: más eficiente (el backend no maneja el binario), pero más complejo en frontend (3 pasos) y requiere configurar CORS en el storage

**Recomendación:** Para V1, usar **Opción A** (multipart) por simplicidad. Para V2 con archivos grandes, migrar a signed URLs.

**Prioridad:** Media — debe definirse antes de implementar Fase 6  
**Bloqueante:** Sí, para la implementación de adjuntos  
**Estado:** ✅ Ya existente — GCS signed URL flow ya implementado

---

### Hallazgo 15 — `SesionPaciente` tiene campos que no existen en el backend: `tipo` y `resumen`

- **Módulo:** Sesiones / Pacientes
- **Severidad:** 🟡 Menor
- **Fase afectada:** Fases 3, 6

**Problema detectado:**  
La interfaz `SesionPaciente` (usada en el tab "Sesiones" del detalle de paciente) tiene:
- `tipo: string` — "Individual", "Evaluación", etc.
- `resumen: string` — resumen corto de la sesión

Pero la tabla `sesiones` del blueprint solo tiene `notas: TEXT`. No existen los campos `tipo` ni `resumen`.

**Impacto en frontend:**  
El frontend renderiza estas columnas en el listado de sesiones del paciente. Sin estos datos, las columnas quedarán vacías.

**Opciones:**
1. **El frontend elimina** los campos `tipo` y `resumen` de `SesionPaciente` y muestra un extracto de `notas` en su lugar
2. **El backend agrega** los campos `tipo_sesion` y `resumen` a la tabla `sesiones` (V2)

**Recomendación:** Opción 1 para V1. El frontend mostrará los primeros 100 caracteres de `notas` como resumen. El campo `tipo` se oculta o se marca como "General" por defecto.

**Prioridad:** Baja  
**Bloqueante:** No  
**Estado:** ✅ Ya existente — Sesion model ya tiene tipo_sesion y resumen

--- — Paginación: definir contrato exacto de `Page<T>`

- **Módulo:** Transversal
- **Severidad:** 🟠 Recomendado
- **Fase afectada:** Fase 1

**Problema detectado:**  
Spring Boot usa `Page<T>` de Spring Data para paginación, pero existen variaciones en la serialización:

- Spring HATEOAS: `{ _embedded: { items: [...] }, page: { size, totalElements, totalPages, number } }`
- Spring Data estándar: `{ content: [...], totalElements, totalPages, number, size, first, last, empty }`

El frontend necesita saber la estructura exacta para crear `PageResponse<T>`.

**Cambio recomendado en backend:**  
Confirmar que la serialización de `Page<T>` es la estándar de Spring Data (sin HATEOAS) con los campos:
```json
{
  "content": [ ... ],
  "total_elements": 100,
  "total_pages": 10,
  "number": 0,
  "size": 10,
  "first": true,
  "last": false,
  "empty": false
}
```

**Nota adicional sobre naming:** Verificar si Spring serializa los campos del Page en camelCase (`totalElements`) o snake_case (`total_elements`). El frontend necesita saber cuál esperar.

**Prioridad:** Media  
**Bloqueante:** Sí, para Fase 1 (definir la interface)  
**Estado:** ✅ Implementado — Jackson SNAKE_CASE + Page<T> en snake_case

---

### Hallazgo 17 — Notificaciones: ¿el backend las genera automáticamente?

- **Módulo:** Notificaciones
- **Severidad:** 🟠 Recomendado
- **Fase afectada:** Fase 7, 10

**Problema detectado:**  
El frontend espera un feed de notificaciones en el dashboard. El blueprint define la tabla `notificaciones` y especifica que el backend debe generar notificaciones como efecto secundario de ciertas acciones (paciente confirma cita, recepcionista se vincula, etc.).

**Impacto en frontend:**  
Si el backend no genera notificaciones automáticamente, el endpoint `GET /api/notificaciones` siempre devolverá lista vacía, y el dashboard no mostrará nada.

**Cambio recomendado en backend:**  
Implementar la generación automática de notificaciones en los siguientes puntos:
1. Paciente confirma cita vía token público → notificación al profesional
2. Paciente cancela cita vía token público → notificación al profesional
3. Paciente solicita reprogramación → notificación al profesional
4. Nuevo recepcionista se vincula → notificación al profesional
5. Cita completada sin pago → notificación al profesional (opcional)

**Prioridad:** Media (el frontend funciona sin notificaciones pero la UX sufre)  
**Bloqueante:** No
**Estado:** ✅ Implementado — Notificaciones auto-generadas en confirmar, cancelar, reprogramar y vincular

---

### Hallazgo 18— Estadísticas: endpoints potencialmente complejos

- **Módulo:** Estadísticas
- **Severidad:** 💡 Oportunidad
- **Fase afectada:** Fase 11

**Problema detectado:**  
El módulo de estadísticas tiene 9 endpoints distintos. Algunos son queries de agregación complejas que podrían ser lentas en bases de datos con mucho volumen.

**Endpoints potencialmente pesados:**
- `/api/estadisticas/citas` — serie temporal con agrupación por período
- `/api/estadisticas/ingresos` — agrupación por método de pago y período
- `/api/estadisticas/pacientes` — ranking, nuevos vs recurrentes
- `/api/estadisticas/insights` — cálculos de tendencias y anomalías

**Recomendación para el backend:**
1. Para V1, las queries directas sobre las tablas principales son suficientes
2. Si el volumen crece, considerar vistas materializadas o precalculación nocturna
3. Los insights son opcionales y pueden devolver lista vacía si no están implementados — el frontend los maneja como optional

**Prioridad:** Baja  
**Bloqueante:** No  
**Estado:** ⬜ Pendiente — Oportunidad de optimización futura

---

### Hallazgo 19 — Confirmar-cita público: token en la URL

- **Módulo:** Público / Confirmación
- **Severidad:** 🟡 Menor
- **Fase afectada:** Fase 12

**Problema detectado:**  
La ruta actual del frontend es `/confirmar-cita` sin el parámetro `:token`. Necesita cambiar a `/confirmar-cita/:token` para funcionar con la API.

**Este cambio es del frontend**, no del backend. Pero el backend debe asegurar que:
1. El endpoint `GET /api/public/citas/confirmar/{token}` devuelve datos suficientes para renderizar la página (nombre del profesional, fecha/hora de la cita, modalidad, estado, etc.)
2. El token UUID es suficientemente largo y seguro
3. Tokens expirados devuelven un status HTTP claro (410 Gone o 400 con código `TOKEN_EXPIRED`)
4. Tokens ya usados devuelven información de qué acción se realizó (para mostrar al paciente)

**Estructura de respuesta esperada por el frontend:**
```json
{
  "nombre_profesional": "Dr. Carlos García",
  "especialidad": "Psicología Clínica",
  "nombre_consulta": "Consultorio García",
  "fecha": "2026-04-15",
  "hora_inicio": "09:00",
  "hora_fin": "10:00",
  "modalidad": "Presencial",
  "ubicacion": "Av. Reforma 123",
  "estado_cita": "Pendiente",
  "paciente_nombre": "María",
  "token_valido": true,
  "accion_realizada": null
}
```

Para un token ya usado:
```json
{
  "token_valido": false,
  "accion_realizada": "confirmada",
  "fecha_accion": "2026-04-10T14:30:00"
}
```

**Prioridad:** Media  
**Bloqueante:** Sí, para Fase 12  
**Estado:** ✅ Implementado — CitaGestionPublicaResponseDto con token_valido, accion_realizada, nombre_consulta
---

### Hallazgo 20 — Búsqueda de citas: ¿busca por nombre de paciente?

- **Módulo:** Citas
- **Severidad:** 🟠 Recomendado
- **Fase afectada:** Fase 4

**Problema detectado:**  
El frontend tiene un campo de búsqueda libre en la página de citas. El usuario espera poder buscar por nombre del paciente (ej: "María"). Pero la tabla `citas` no tiene el nombre del paciente — está en la tabla `pacientes`.

**Impacto en frontend:**  
Si el param `busqueda` del endpoint `GET /api/citas` solo busca en los campos de la tabla `citas` (motivo, notas_rapidas), el usuario no podrá encontrar citas por nombre de paciente, que es el caso de uso más común.

**Cambio recomendado en backend:**  
El endpoint `GET /api/citas?busqueda=María` debe buscar en:
1. `pacientes.nombre`
2. `pacientes.apellido`
3. `citas.motivo`
4. `citas.notas_rapidas`

Esto requiere un JOIN con `pacientes` en la query de búsqueda.

**Prioridad:** Alta  
**Bloqueante:** No (funciona pero la UX es mala sin búsqueda por paciente)  
**Estado:** ✅ Ya existente — JPQL query ya busca por paciente.nombre y paciente.apellido

---

## Hallazgos Post-Auditoría (API Reference vs Frontend Actual)

> Detectados al comparar `FRONTEND_API_REFERENCE.md` (documentación real del backend) contra los modelos e interfaces TypeScript actuales del frontend. Todos estos son **cambios requeridos en el frontend**.

---

### Hallazgo 21 — LoginRequest: campos `usuario`/`contrasena` no coinciden con backend

- **Módulo:** Auth
- **Severidad:** 🔴 Obligatorio
- **Fase afectada:** Fase 2

**Problema detectado:**  
El frontend envía `{ usuario, contrasena }` pero el backend espera `{ username, password }`.

**Frontend actual:**
```typescript
export interface LoginRequest {
  usuario: string;
  contrasena: string;
}
```

**Backend espera:**
```json
{ "username": "drgarcia", "password": "SecurePass123!" }
```

**Cambio requerido en frontend:**  
Renombrar fields a `username` y `password`. Actualizar `LoginRequest` y el formulario de login.

**Prioridad:** Crítica — el login no funciona sin esto  
**Bloqueante:** Sí  
**Estado:** ✅ Resuelto (Fase 2) — LoginRequest alineado al contrato real usado por backend.

---

### Hallazgo 22 — ROL IDs: todas las constantes del frontend son incorrectas

- **Módulo:** Auth / Roles
- **Severidad:** 🔴 Obligatorio
- **Fase afectada:** Fase 2

**Problema detectado:**  
El backend define los roles con IDs diferentes a los del frontend en AMBOS sets de constantes.

| Rol | `ROL_REGISTRO` (frontend) | `RolUsuario` (frontend) | Backend real (`GET /api/roles`) |
|---|---|---|---|
| ADMIN | 3 | — | **1** |
| PROFESIONAL | 1 | 3 | **2** |
| RECEPCIONISTA | 2 | 4 | **3** |

**Cambio requerido en frontend:**  
```typescript
// auth.models.ts
export const ROL_REGISTRO = { ADMIN: 1, PROFESIONAL: 2, RECEPCIONISTA: 3 } as const;

// rol.model.ts
export enum RolUsuario { PROFESIONAL = 2, RECEPCIONISTA = 3 }
```

**Prioridad:** Crítica — el registro y los guards de rol fallarán  
**Bloqueante:** Sí  
**Estado:** ✅ Resuelto (Fase 2) — `ROL_REGISTRO` y `RolUsuario` corregidos a ADMIN=1, PROFESIONAL=2, RECEPCIONISTA=3.

---

### Hallazgo 23 — CitaDto: reestructuración completa de campos

- **Módulo:** Citas
- **Severidad:** 🔴 Obligatorio
- **Fase afectada:** Fase 4

**Problema detectado:**  
La interfaz `CitaDto` del frontend tiene diferencias estructurales mayores con el backend.

| Cambio | Frontend actual | Backend real |
|---|---|---|
| Fecha/hora | `fecha` (date) + `hora_inicio`/`hora_fin` (time) + `duracion` | `fecha_inicio`/`fecha_fin` (datetime ISO) |
| Estado | `estado: EstadoCita` | `estado_cita: string` (nombre de campo diferente) |
| Notas | `notas_rapidas: string` | `observaciones: string` |
| Pago | `metodo_pago`, `monto_pagado` | Solo `estado_pago` + `monto` en el DTO |
| Nuevos campos | — | `origen_cita`, `confirmado_por_paciente`, `fecha_confirmacion`, `motivo_cancelacion` |

**Cambio requerido en frontend — nueva CitaDto:**
```typescript
export interface CitaDto {
  id_cita: number;
  id_paciente: number;
  nombre_paciente: string;
  apellido_paciente: string;
  fecha_inicio: string;       // ISO datetime '2026-04-10T10:00:00'
  fecha_fin: string;          // ISO datetime '2026-04-10T10:45:00'
  motivo: string;
  observaciones: string | null;
  estado_cita: EstadoCita;
  estado_pago: EstadoPago;
  monto: number;
  tiene_sesion: boolean;
  origen_cita: string;
  confirmado_por_paciente: boolean;
  fecha_confirmacion: string | null;
  motivo_cancelacion: string | null;
}
```

**Impacto:** Toda lógica que extrae fecha y hora de citas debe adaptarse para parsear datetimes ISO en lugar de campos separados. Componentes afectados: `cita-form-modal`, `detalle-cita`, `agenda`, `calendario`, listados de citas.

**Prioridad:** Crítica  
**Bloqueante:** Sí, para Fase 4  
**Estado:** 🟡 Parcial — Resuelto en módulo Citas (Fase 4). Se mantiene compatibilidad legacy para Agenda/Fase 5.

---

### Hallazgo 24 — Enums EstadoCita y EstadoPago: UPPERCASE + valores renombrados

- **Módulo:** Citas
- **Severidad:** 🔴 Obligatorio
- **Fase afectada:** Fase 4

**Problema detectado:**  
El backend envía todos los valores de estado en UPPERCASE con valores diferentes.

**EstadoCita:**
| Frontend actual | Backend real |
|---|---|
| `'Pendiente'` | `'PENDIENTE'` |
| `'Confirmada'` | `'CONFIRMADA'` |
| `'Completada'` | `'COMPLETADA'` |
| `'Cancelada'` | `'CANCELADA'` |
| `'No asistió'` | `'NO_ASISTIO'` |
| `'Pospuesta'` | `'REPROGRAMADA'` |

**EstadoPago:**
| Frontend actual | Backend real |
|---|---|
| `'Pendiente'` | `'PENDIENTE'` |
| `'Parcial'` | `'PARCIAL'` |
| `'Pagado'` | `'PAGADO'` |
| — | `'NO_APLICA'` (nuevo) |
| — | `'REEMBOLSADO'` (nuevo) |

**MetodoPago:** Este type ya **NO existe** en el backend. El pago solo usa `estado_pago` + `monto`.

**Cambio requerido:**
```typescript
export type EstadoCita = 'PENDIENTE' | 'CONFIRMADA' | 'COMPLETADA' | 'CANCELADA' | 'NO_ASISTIO' | 'REPROGRAMADA';
export type EstadoPago = 'PENDIENTE' | 'PARCIAL' | 'PAGADO' | 'NO_APLICA' | 'REEMBOLSADO';
// Eliminar MetodoPago
```

Crear mapeo de labels para UI (ej: `'NO_ASISTIO'` → `'No asistió'`).

**Impacto:** Todos los condicionales, badges de color, filtros y comparaciones de estado en toda la app.

**Prioridad:** Crítica  
**Bloqueante:** Sí  
**Estado:** 🟡 Parcial — Enums UPPERCASE aplicados en Citas (Fase 4). Falta cierre total en Agenda/Fase 5.

---

### Hallazgo 25 — PacienteDto: sub-recursos NO embebidos + campos nuevos

- **Módulo:** Pacientes
- **Severidad:** 🟠 Recomendado
- **Fase afectada:** Fase 3

**Problema detectado:**  
El `PacienteDto` del backend **NO** incluye `citas[]`, `notas[]` ni `alertas[]` embebidos. Son sub-recursos vía endpoints separados. Además, hay campos nuevos.

**Campos que NO vienen en PacienteDto:**
- `citas: CitaResumenDto[]` → usar `GET /api/pacientes/{id}/citas`
- `notas: NotaDto[]` → usar `GET /api/pacientes/{id}/notas-clinicas`
- `alertas: string[]` → usar `GET /api/pacientes/{id}/alertas` (entidades con `id_alerta_paciente`)

**Campos nuevos en el backend:**
- `sexo: string | null`
- `contacto_emergencia_nombre: string | null`
- `contacto_emergencia_telefono: string | null`

**Endpoint nuevo útil:** `GET /api/pacientes/{id}/resumen` devuelve contadores (citas, notas, sesiones, etc.)

**Cambio requerido en frontend:**  
1. Eliminar `citas`, `notas`, `alertas` de `PacienteDto`
2. Agregar campos nuevos
3. Implementar carga lazy por tab en el detalle del paciente (ya contemplado como enfoque recomendado)

**Prioridad:** Media  
**Bloqueante:** No  
**Estado:** ⬜ Pendiente — Se adapta al integrar Fase 3

---

### Hallazgo 26 — NotaDto → NotaClinicaDto: entidad separada con campos nuevos

- **Módulo:** Notas Clínicas
- **Severidad:** 🔴 Obligatorio
- **Fase afectada:** Fases 3, 6

**Problema detectado:**  
Las notas clínicas son una entidad independiente con endpoints propios (`/api/notas-clinicas`).

**Frontend actual:**
```typescript
export interface NotaDto {
  id_nota: number;
  fecha: string;
  contenido: string;
  adjunto?: AdjuntoMeta;
}
```

**Backend real:**
```json
{
  "id_nota_clinica": 10,
  "id_paciente": 15,
  "id_sesion": null,
  "titulo": "Evaluación inicial",
  "contenido": "El paciente presenta...",
  "tipo_nota": "EVALUACION",
  "visible_en_resumen": true,
  "created_at": "2026-04-05T09:00:00"
}
```

**Cambios clave:**
- `id_nota` → `id_nota_clinica`
- Nuevos: `titulo`, `tipo_nota`, `visible_en_resumen`, `id_sesion` (vínculo opcional con sesión)
- `adjunto` removido (ahora es entidad separada `ArchivoAdjuntoDto` vinculada por `entidad_tipo=NOTA_CLINICA`)

**Nota importante:** `DELETE /api/notas-clinicas/{id}` hace eliminación FÍSICA (no soft delete). Siempre mostrar diálogo de confirmación "Esta acción no se puede deshacer".

**Prioridad:** Alta  
**Bloqueante:** Sí, para integración de notas  
**Estado:** ⬜ Pendiente — Cambio en frontend

---

### Hallazgo 27 — SesionDto: nuevos campos y máquina de estados propia

- **Módulo:** Sesiones
- **Severidad:** 🟠 Recomendado
- **Fase afectada:** Fase 6

**Problema detectado:**  
El `SesionDto` del backend incluye campos nuevos y su propia máquina de estados.

**Campos nuevos:**
- `tipo_sesion: string` — "INDIVIDUAL", "EVALUACION", etc.
- `estatus: string` — "ABIERTA", "CERRADA", "CANCELADA"
- `resumen: string | null` — resumen corto de la sesión
- `fecha_sesion: string` — (en lugar de `fecha_cita`)

**Máquina de estados:** ABIERTA → CERRADA/CANCELADA vía `PATCH /api/sesiones/{id}/estatus`.

**Cambio requerido:** Agregar campos nuevos a `SesionDto`, adaptar UI para mostrar tipo, estatus y resumen. Implementar cambio de estatus.

**Prioridad:** Media  
**Bloqueante:** No  
**Estado:** ⬜ Pendiente — Cambio en frontend

---

### Hallazgo 28 — Adjuntos: modelo completamente rediseñado

- **Módulo:** Adjuntos / Sesiones / Notas
- **Severidad:** 🔴 Obligatorio
- **Fase afectada:** Fase 6

**Problema detectado:**  
El modelo de adjuntos del frontend (inline `SesionAdjunto`/`AdjuntoMeta`) es completamente diferente al backend.

**Frontend actual:** Adjunto como propiedad inline
```typescript
export interface SesionAdjunto {
  name: string; type: string; size: number; previewUrl?: string;
}
```

**Backend real:** Entidad independiente con vinculación polimórfica
```json
{
  "id_archivo_adjunto": 1,
  "nombre_original": "informe.pdf",
  "mime_type": "application/pdf",
  "tamano_bytes": 204800,
  "entidad_tipo": "SESION",
  "entidad_id": 42,
  "url_descarga": "https://storage.googleapis.com/..."
}
```

**Flujo de upload (3 pasos):**
1. `POST /api/archivos-adjuntos/upload-url` → obtener signed URL
2. `PUT {signed_url}` con el archivo binario (**sin** Authorization header)
3. `POST /api/archivos-adjuntos` → registrar metadata

**Cambio requerido:**
1. Crear `ArchivoAdjuntoDto` como entidad independiente
2. Crear `ArchivosService` con flujo de 3 pasos
3. Remover `adjunto?` inline de SesionDto y NotaDto
4. Agregar URLs de GCS a la lista de exclusión del interceptor

**Prioridad:** Alta  
**Bloqueante:** Sí, para Fase 6  
**Estado:** ⬜ Pendiente — Cambio en frontend

---

### Hallazgo 29 — SolicitudReprogramacion: camelCase→snake_case + estructura diferente

- **Módulo:** Solicitudes de Reprogramación
- **Severidad:** 🔴 Obligatorio
- **Fase afectada:** Fases 7, 12

**Problema detectado:**  
La interfaz usa camelCase y tiene estructura diferente al backend.

**Frontend actual (camelCase):**
```typescript
export interface SolicitudReprogramacion {
  idSolicitud: number;
  idCita: number;
  pacienteNombre: string;
  mensajePaciente: string;
  fechaHoraSugerida?: string;   // single datetime
  estado: EstadoSolicitud;
  fechaSolicitud: string;
}
```

**Backend real (snake_case + cambios):**
```json
{
  "id_solicitud_reprogramacion": 1,
  "id_cita": 42,
  "paciente_nombre": "María López",
  "motivo": "Tengo un compromiso familiar",
  "fecha_solicitada": "2026-04-17",
  "hora_inicio_solicitada": "11:00:00",
  "hora_fin_solicitada": "11:45:00",
  "estado": "PENDIENTE",
  "created_at": "2026-04-10T14:30:00"
}
```

**Cambios clave:**
- `idSolicitud` → `id_solicitud_reprogramacion`
- `mensajePaciente` → `motivo`
- `fechaHoraSugerida` (datetime) → `fecha_solicitada` + `hora_inicio_solicitada` + `hora_fin_solicitada` (separados)
- `fechaSolicitud` → `created_at`
- Solicitudes son sub-recurso de citas: `GET /api/citas/{id}/solicitudes-reprogramacion`

**Prioridad:** Alta  
**Bloqueante:** Sí  
**Estado:** ⬜ Pendiente — Cambio en frontend

---

### Hallazgo 30 — PermisosRecepcionista: formato de keys diferente

- **Módulo:** Equipo / Permisos
- **Severidad:** 🟠 Recomendado
- **Fase afectada:** Fases 2, 9

**Problema detectado:**  
El frontend usa keys simples (camelCase), el backend usa keys granulares (snake_case).

**Frontend:** `{ agenda: true, citas: true, pacientes: true, notasClinicas: false, configuracion: false }`

**Backend (AuthMeResponseDto y PUT /api/recepcionistas/{id}/permisos):**
`{ "puede_crear_citas": true, "puede_ver_pacientes": true, ... }`

**Cambio requerido:** Definir el mapping exacto entre keys del frontend y del backend. Adaptar `PermisosRecepcionista` o crear mapper bidireccional.

**Prioridad:** Media  
**Bloqueante:** No inmediatamente  
**Estado:** ⬜ Pendiente — Requiere definir mapping exacto con backend

---

### Hallazgo 31 — Endpoints públicos: path y método HTTP diferentes

- **Módulo:** Público / Confirmación de Cita
- **Severidad:** 🔴 Obligatorio
- **Fase afectada:** Fase 12

**Problema detectado:**  
Los endpoints públicos tienen paths y métodos diferentes a lo planeado.

| Aspecto | Plan original | Backend real |
|---|---|---|
| Base path | `/api/public/citas/confirmar/{token}` | `/public/citas/gestion/{token}` |
| Prefijo | Con `/api` | **Sin** `/api` |
| Path segment | `confirmar` | `gestion` |
| Confirmar | `POST` | `PATCH` |
| Cancelar | `POST` | `PATCH` |
| Reprogramar | `POST .../reprogramar` | `POST .../solicitudes-reprogramacion` |

**Cambio requerido:**
1. Actualizar todas las URLs del servicio público
2. Usar PATCH para confirmar y cancelar
3. Actualizar lista de URLs públicas en el interceptor (prefijo NO es `/api`)

**Prioridad:** Alta  
**Bloqueante:** Sí, para Fase 12  
**Estado:** ⬜ Pendiente — Cambio en frontend

---

### Hallazgo 32 — HistorialEventoDto: estructura completamente diferente

- **Módulo:** Historial / Actividad
- **Severidad:** 🟠 Recomendado
- **Fase afectada:** Fases 3, 10

**Problema detectado:**  

**Frontend actual:**
```typescript
export interface HistorialEvento {
  id: string;
  fecha: string;
  hora?: string;
  tipo: HistorialTipoEvento;  // 'cita_confirmada', etc.
  descripcion: string;
  detalle?: string;
}
```

**Backend real:**
```json
{
  "id_historial_evento": 100,
  "entidad_tipo": "CITA",
  "entidad_id": 42,
  "evento_tipo": "ESTADO_CAMBIADO",
  "descripcion": "Estado cambiado de PENDIENTE a CONFIRMADA",
  "usuario_actor_id": 1,
  "fecha_evento": "2026-04-05T09:22:00",
  "metadata_json": "{\"estado_anterior\":\"PENDIENTE\",\"estado_nuevo\":\"CONFIRMADA\"}"
}
```

**Cambios clave:**
- `id: string` → `id_historial_evento: number`
- `tipo` → `evento_tipo` + `entidad_tipo` (separados)
- `fecha` + `hora` → `fecha_evento` (datetime combinado)
- Nuevo: `entidad_id`, `usuario_actor_id`, `metadata_json`
- `HistorialTipoEvento` enum values no coinciden

**Prioridad:** Media  
**Bloqueante:** No  
**Estado:** ⬜ Pendiente — Cambio en frontend

---

### Hallazgo 33 — Nuevas entidades sin modelo frontend

- **Módulo:** Múltiple
- **Severidad:** 🟠 Recomendado
- **Fase afectada:** Múltiple

**Problema detectado:**  
El backend tiene entidades completas sin interfaces TypeScript correspondientes.

| Entidad backend | Fase | Endpoints |
|---|---|---|
| `HorarioLaboralDto` | 5, 8 | CRUD `/api/horarios-laborales` |
| `BloqueoHorarioDto` | 5 | CRUD `/api/bloqueos-horarios` |
| `NotificacionDto` | 7, 10 | `/api/notificaciones` |
| `ConfiguracionSistemaDto` | 8 | `/api/configuracion` |
| `ConfiguracionRecordatorioDto` | 8 | `/api/configuracion-recordatorios` |
| `DashboardConsolidadoDto` | 7 | `/api/dashboard/consolidado` |
| `CitaGestionPublicaResponseDto` | 12 | `/public/citas/gestion/{token}` |
| `ProfesionalDto` | 8 | `/api/profesionales` |
| `RecepcionistaDto` | 9 | `/api/recepcionistas` |
| `RolResponseDto` | 2 | `/api/roles` |

**Acción:** Crear interfaces TypeScript conforme se integre cada fase.

**Prioridad:** Media  
**Bloqueante:** No  
**Estado:** ⬜ Pendiente — Se resolverá fase por fase

---

### Hallazgo 34 — Query params: naming mixto camelCase/snake_case

- **Módulo:** Transversal
- **Severidad:** 🟡 Menor
- **Fase afectada:** Todas

**Problema detectado:**  
Los query params de filtros usan naming inconsistente. Jackson SNAKE_CASE **NO** afecta a `@ModelAttribute` — los params usan los nombres tal cual están en Java:
- Mayoría: camelCase → `?pacienteId=15&fechaDesde=...&estadoCita=PENDIENTE`
- Excepciones: snake_case → `?id_usuario=1&fecha_expiracion_desde=...`

**Acción:** El helper `buildQueryParams()` debe usar los nombres exactos por endpoint. La API Reference ya los especifica.

**Prioridad:** Baja  
**Bloqueante:** No  
**Estado:** ⬜ Pendiente — Se maneja caso por caso

---

## 5. Resumen de Hallazgos por Severidad (Actualizado Post-Auditoría)

### Estado general

| Categoría | Total | ✅ Resueltos | ⬜ Pendientes |
|---|---|---|---|
| Hallazgos iniciales (1-20) | 20 | 17 | 3 |
| Hallazgos post-auditoría (21-34) | 14 | 0 | 14 |
| **Total** | **34** | **17** | **17** |

### ✅ Hallazgos Iniciales RESUELTOS por el backend (17/20)

| # | Hallazgo | Resolución |
|---|----------|-----------|
| 1 | `/auth/me` datos insuficientes | AuthMeResponseDto expandido |
| 2 | Ruta de registro inconsistente | `/api/usuarios/registro` existe |
| 5 | Alertas `string[]` → entidad con ID | AlertaPacienteDto con id_alerta_paciente |
| 6 | Endpoint `/api/agenda` | GET /api/agenda?mes=X&anio=Y |
| 7 | Campos derivados en DTOs | nombre_paciente, tiene_sesion incluidos |
| 8 | snake_case uniforme | Jackson SNAKE_CASE global |
| 9 | Código beta inseguro en frontend | Backend valida en registrarPublico() |
| 10 | Contrato de disponibilidad | GET /api/citas/disponibilidad con slots |
| 11 | Dashboard consolidado | GET /api/dashboard/consolidado |
| 12 | Solicitud con datos de cita | Campos derivados incluidos |
| 13 | Configuraciones auto-creadas | crearConfiguracionesDefault() |
| 14 | Flujo de upload definido | GCS signed URL 3-step flow |
| 15 | SesionPaciente.tipo y resumen | tipo_sesion y resumen existen |
| 16 | Paginación Page\<T\> | snake_case confirmado |
| 17 | Notificaciones automáticas | Auto-generadas en confirmar/cancelar/vincular |
| 19 | Token público: formato respuesta | CitaGestionPublicaResponseDto completo |
| 20 | Búsqueda por nombre paciente | JPQL JOIN ya implementado |

### ⬜ Hallazgos Pendientes — Cambios en FRONTEND (17)

#### 🔴 Obligatorios — Bloqueantes (10)
| # | Hallazgo | Fase | Impacto |
|---|----------|------|---------|
| 3 | ROL IDs incorrectos (original) | 2 | Registro y guards fallan |
| 21 | LoginRequest: usuario/contrasena → username/password | 2 | Login no funciona |
| 22 | ROL IDs: TODAS las constantes incorrectas | 2 | Registro y guards fallan |
| 23 | CitaDto: reestructuración completa | 4 | **Parcial:** resuelto en módulo Citas; pendiente cierre en Agenda (Fase 5) |
| 24 | Enums UPPERCASE + valores renombrados | 4 | **Parcial:** aplicados en Citas; pendiente migración total en Agenda |
| 26 | NotaClinicaDto: estructura diferente | 3, 6 | CRUD de notas |
| 28 | Adjuntos: modelo entity-based + signed URLs | 6 | Upload/download de archivos |
| 29 | SolicitudReprogramacion: camelCase→snake_case | 7, 12 | Solicitudes de reprogramación |
| 31 | Endpoints públicos: path y método diferente | 12 | Página pública del paciente |

#### 🟠 Recomendados (6)
| # | Hallazgo | Fase |
|---|----------|------|
| 25 | PacienteDto: sub-recursos separados + campos nuevos | 3 |
| 27 | SesionDto: tipo_sesion, estatus, resumen | 6 |
| 30 | PermisosRecepcionista: keys diferentes | 2, 9 |
| 32 | HistorialEventoDto: estructura diferente | 3, 10 |
| 33 | Nuevas entidades sin modelo frontend | Múltiple |

#### 🟡 Menores (1)
| # | Hallazgo | Fase |
|---|----------|------|
| 34 | Query params: naming mixto | Todas |

#### 💡 Oportunidades (1 del set original)
| # | Hallazgo | Fase |
|---|----------|------|
| 18 | Estadísticas: queries potencialmente pesadas | 11 |

---

## 6. Próximos Pasos (Actualizado Post-Auditoría)

> **Veredicto de la auditoría:** El backend está **significativamente más avanzado** de lo previsto. 17 de 20 hallazgos iniciales ya están resueltos. Sin embargo, la auditoría reveló **14 nuevas discrepancias** entre los modelos del frontend y la API real, todas de tipo "cambio requerido en frontend".

### Acción inmediata: Preparar el frontend para la integración

1. **Fase 1 — Corrección de modelos base (ANTES de integrar):**
   - Corregir `LoginRequest` → `{ username, password }` (Hallazgo 21)
   - Corregir `ROL_REGISTRO` y `RolUsuario` con IDs correctos (Hallazgos 3, 22)
   - Crear `PageResponse<T>` con campos snake_case confirmados (Hallazgo 16 ✅)
   - Crear helper `buildQueryParams()` consciente del naming mixto (Hallazgo 34)

2. **Fase 2 — Auth ya desbloqueada:**
   - El backend tiene todo lo necesario (auth/me expandido, refresh rotation, logout)
   - Solo requiere los fixes de Hallazgos 21 y 22 antes de integrar

3. **Fase 3 — Pacientes requiere ajustes de modelo:**
   - Eliminar sub-recursos embebidos de PacienteDto (Hallazgo 25)
   - Reescribir NotaDto → NotaClinicaDto (Hallazgo 26)
   - Adaptar HistorialEvento (Hallazgo 32)

4. **Fase 4 — Citas: la más impactada:**
   - ✅ Reescribir CitaDto en módulo Citas (Hallazgo 23) — pendiente cierre en Agenda
   - ✅ Migrar enums UPPERCASE en módulo Citas (Hallazgo 24) — pendiente migración total en Agenda
   - Reescribir SolicitudReprogramacion (Hallazgo 29)
   - Buscar y reemplazar en toda la app: comparaciones de estado, labels, filtros

5. **Fase 6 — Sesiones + Adjuntos:**
   - Agregar campos nuevos a SesionDto (Hallazgo 27)
   - Implementar ArchivoAdjuntoDto y signed URL flow (Hallazgo 28)

6. **Fase 12 — Endpoints públicos:**
   - Actualizar paths y métodos HTTP (Hallazgo 31)

### Prioridad de ejecución

```
[1] Corregir LoginRequest + ROL IDs         ← Desbloquea Fase 2
[2] Reescribir CitaDto + Enums UPPERCASE     ← Desbloquea Fases 4-7
[3] Reescribir NotaClinicaDto               ← Desbloquea notas en Fase 3
[4] Reescribir SolicitudReprogramacion       ← Desbloquea Fase 7
[5] Implementar ArchivoAdjuntoDto           ← Desbloquea Fase 6
[6] Adaptar el resto (sesiones, historial)  ← Se hace inline al integrar
```

### ¿Listos para comenzar Fase 1?

**Sí.** No hay bloqueantes de backend. Todos los hallazgos pendientes son cambios en el frontend. El backend está listo y estable.

---

*Documento actualizado el 04/04/2026 — Cierre Fase 4 (Citas).*  
*Versión 2.1 — Hallazgos 23 y 24 en estado parcial (resueltos en módulo Citas, pendiente Agenda/Fase 5).*
