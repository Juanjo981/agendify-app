# Ajustes de Backend Necesarios para Soportar el Frontend â€” Agendify

> **VersiÃ³n:** 1.0  
> **Fecha:** 3 de abril de 2026  
> **Autor:** Arquitectura Frontend  
> **Última actualización:** Fase 7 — Dashboard y Resumen General

---

## 1. Objetivo del Documento

Este documento es un **backlog tÃ©cnico vivo** de ajustes necesarios en el backend, detectados desde la perspectiva del frontend.

Su propÃ³sito es garantizar que la API estÃ© diseÃ±ada para servir correctamente a la experiencia del usuario, no solo para reflejar el schema de la base de datos.

Se actualizarÃ¡ conforme avancemos mÃ³dulo por mÃ³dulo en la integraciÃ³n frontend â†” API real.

---

## 2. Regla del Proyecto: El Backend se Adapta al Frontend

> **El frontend es la fuente de verdad funcional de la experiencia del usuario.**

Si un endpoint, contrato, DTO, estructura de respuesta, naming, flujo, validaciÃ³n, paginaciÃ³n o comportamiento del backend **NO cumple** con lo que necesita el frontend para ofrecer una buena experiencia:

- **NO** adaptamos el frontend con workarounds feos
- **SÃ** documentamos el cambio necesario en este archivo
- **SÃ** ajustamos el backend para servir correctamente al frontend

Excepciones temporales estÃ¡n permitidas solo cuando:
- El cambio backend estÃ¡ planificado pero no implementado aÃºn
- El workaround frontend es trivial y limpio
- Se documenta explÃ­citamente como **soluciÃ³n temporal** con fecha de vencimiento

---

## 3. CÃ³mo se ActualizarÃ¡ este Documento

| Momento | AcciÃ³n |
|---------|--------|
| Al iniciar una fase de integraciÃ³n | Revisar hallazgos pendientes de este documento para el mÃ³dulo en cuestiÃ³n |
| Al encontrar una discrepancia | Agregar un nuevo hallazgo con toda la informaciÃ³n |
| Al resolver un hallazgo | Cambiar estado a `âœ… Resuelto` con la fecha y soluciÃ³n aplicada |
| Al fin de cada fase | Revisar que no quedaron hallazgos sin documentar |

### ClasificaciÃ³n de severidad

| Nivel | Significado |
|-------|------------|
| ðŸ”´ **Obligatorio** | Sin este cambio, el frontend no puede integrar el mÃ³dulo correctamente |
| ðŸŸ  **Recomendado** | El frontend puede funcionar con un workaround, pero el cambio simplifica y mejora la integraciÃ³n |
| ðŸŸ¡ **Menor** | Inconsistencia estÃ©tica o de convenciÃ³n que no bloquea pero deberÃ­a corregirse |
| ðŸ’¡ **Oportunidad** | Mejora que reducirÃ­a complejidad, llamadas o duplicaciÃ³n en frontend |

---

## 4. Hallazgos Iniciales

> Detectados durante el anÃ¡lisis del blueprint y la arquitectura frontend existente, **antes de comenzar la integraciÃ³n real**.

---

### Hallazgo 1 â€” `/auth/me` devuelve datos insuficientes para el session bootstrap

- **MÃ³dulo:** Auth / SesiÃ³n
- **Severidad:** ðŸ”´ Obligatorio
- **Fase afectada:** Fase 2

**Problema detectado:**  
La interfaz actual `Usuario` que devuelve `/auth/me` solo contiene `{ id_usuario, username }`. El frontend necesita datos mucho mÃ¡s completos para reconstruir la sesiÃ³n al recargar la app.

**Comportamiento actual del backend:**  
`GET /api/auth/me` â†’ `{ id_usuario: number, username: string }`

**Comportamiento esperado para el frontend:**  
`GET /api/auth/me` debe devolver un DTO expandido que incluya:

```json
{
  "id_usuario": 1,
  "username": "drgarcia",
  "nombre": "Carlos",
  "apellido": "GarcÃ­a",
  "email": "carlos@agendify.com",
  "id_rol": 3,
  "nombre_rol": "PROFESIONAL",
  "activo": true,
  "fecha_nacimiento": "1985-03-15",
  "domicilio": "Calle Principal 123",
  "numero_telefono": "+52 555 123 4567",
  "profesional": {
    "id_profesional": 1,
    "especialidad": "PsicologÃ­a ClÃ­nica",
    "nombre_consulta": "Consultorio GarcÃ­a",
    "tipo_servicio": "PsicologÃ­a",
    "codigo_vinculacion": "AGD-4F2K"
  },
  "permisos": null
}
```

Para un recepcionista, el campo `profesional` serÃ­a `null` y `permisos` contendrÃ­a:

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
Ampliar el DTO de respuesta de `/auth/me` para incluir todos los campos necesarios para el session bootstrap. Incluir la extensiÃ³n del profesional o recepcionista segÃºn el rol, y los permisos del recepcionista si aplica.

**Alternativa:** Crear un endpoint dedicado `GET /api/usuarios/me/perfil-completo` o permitir que el frontend haga dos llamadas (`/auth/me` + `/usuarios/me/permisos`), pero esto es menos eficiente.

**Prioridad:** Alta â€” sin esto no se puede hacer session bootstrap ni authorization real.  
**Bloqueante:** SÃ­, para Fase 2.  
**SoluciÃ³n temporal en frontend:** Seguir usando `SessionMockService` hasta que este endpoint estÃ© listo.  
**Estado:** âœ… Implementado â€” AuthMeResponseDto con datos expandidos

---

### Hallazgo 2 â€” Ruta de registro inconsistente

- **MÃ³dulo:** Auth / Registro
- **Severidad:** ðŸŸ  Recomendado
- **Fase afectada:** Fase 2

**Problema detectado:**  
El frontend actual usa `POST /api/usuario/crear` para el registro, pero el blueprint sugiere `POST /api/usuarios/registro`. Necesitan coincidir.

**Comportamiento actual del backend:**  
No estÃ¡ claro cuÃ¡l es la ruta real implementada. El cÃ³digo en `usuario.ts` llama a `${environment.apiUrl}/usuario/crear`.

**Comportamiento esperado para el frontend:**  
Una sola ruta consistente. Sugerimos `POST /api/usuarios/registro` por ser mÃ¡s RESTful y consistente con el naming plural (`/api/usuarios/me`, `/api/usuarios/me/permisos`).

**Cambio recomendado en backend:**  
Si la ruta real es `/api/usuario/crear`, cambiarla a `/api/usuarios/registro` (o al menos `/api/usuarios`). Si ya es `/api/usuarios/registro`, el frontend se ajustarÃ¡.

**Prioridad:** Media  
**Bloqueante:** No (se ajusta fÃ¡cilmente del lado que sea)  
**Estado:** âœ… Ya existente â€” `/api/usuarios/registro` ya implementado

---

### Hallazgo 3 â€” `ROL_REGISTRO` IDs podrÃ­an no coincidir con el backend

- **MÃ³dulo:** Auth / Registro
- **Severidad:** ðŸ”´ Obligatorio
- **Fase afectada:** Fase 2

**Problema detectado:**  
El frontend define dos sets de IDs de rol:
- `ROL_REGISTRO = { PROFESIONAL: 1, RECEPCIONISTA: 2, ADMIN: 3 }` â€” enviados al registrarse
- `RolUsuario = { PROFESIONAL: 3, RECEPCIONISTA: 4 }` â€” usados internamente para verificar permisos

El blueprint de base de datos define la tabla `roles` con IDs `3=PROFESIONAL, 4=RECEPCIONISTA`.

**Impacto en frontend:**  
Si el backend espera `id_rol: 3` para Profesional en el registro pero el frontend envÃ­a `id_rol: 1`, el registro fallarÃ¡ silenciosamente o crearÃ¡ el rol incorrecto.

**Cambio recomendado en backend:**  
Documentar explÃ­citamente quÃ© `id_rol` espera el endpoint de registro. Lo ideal es que sea el mismo ID que la tabla `roles` (`3=PROFESIONAL, 4=RECEPCIONISTA`) para evitar confusiÃ³n. El frontend se ajustarÃ¡ a lo que el backend defina.

**Prioridad:** Alta  
**Bloqueante:** SÃ­, para el registro  
**Estado:** â¬œ Pendiente â€” Requiere cambio en frontend. IDs reales del backend: ADMIN=1, PROFESIONAL=2, RECEPCIONISTA=3 (ver `GET /api/roles`)

---

### Hallazgo 4 â€” PacienteDto: Â¿el detalle incluye sub-recursos o se cargan aparte?

- **MÃ³dulo:** Pacientes
- **Severidad:** ðŸŸ  Recomendado
- **Fase afectada:** Fase 3

**Problema detectado:**  
El mock actual de `PacienteDto` incluye embebidos los arrays `citas[]` y `notas[]` directamente en el objeto del paciente. El blueprint sugiere endpoints separados para sub-recursos (`/pacientes/{id}/citas`, `/pacientes/{id}/notas`, etc.).

**Impacto en frontend:**  
Si `GET /api/pacientes/{id}` no incluye `citas` ni `notas` en el body de respuesta, el frontend deberÃ¡ hacer 3-5 llamadas adicionales al cargar el detalle del paciente, una por cada tab.

**Cambio recomendado en backend (dos opciones):**

**OpciÃ³n A (preferida â€” menos llamadas):**  
`GET /api/pacientes/{id}` devuelve el paciente con un resumen ligero de sub-recursos:
```json
{
  "id_paciente": 1,
  "nombre": "...",
  "citas_count": 12,
  "notas_count": 5,
  "alertas": ["AlÃ©rgico a penicilina"],
  "ultima_cita": "2026-03-15"
}
```
Y los sub-recursos completos se cargan lazy vÃ­a endpoints separados.

**OpciÃ³n B (mÃ¡s simple pero mÃ¡s pesado):**  
`GET /api/pacientes/{id}` devuelve todo embebido (citas, notas, historial). MÃ¡s simple pero puede ser lento con muchos datos.

**RecomendaciÃ³n para el frontend:** OpciÃ³n A â€” carga lazy de tabs para mejor rendimiento.

**Prioridad:** Media  
**Bloqueante:** No (el frontend puede adaptarse a cualquier opciÃ³n)  
**Estado:** â¬œ Pendiente â€” DecisiÃ³n de diseÃ±o frontend

---

### Hallazgo 5 â€” Alertas de paciente: de `string[]` a entidad con ID

- **MÃ³dulo:** Pacientes
- **Severidad:** ðŸŸ¡ Menor
- **Fase afectada:** Fase 3

**Problema detectado:**  
El mock actual tiene `alertas: string[]` en `PacienteDto`. El blueprint define `alertas_paciente` como tabla separada con `id` y `descripcion`.

**Impacto en frontend:**  
El frontend necesitarÃ¡ un `id` para poder eliminar alertas individuales. Actualmente elimina por Ã­ndice del array.

**Cambio recomendado en backend:**  
Devolver alertas como `{ id: number, descripcion: string }[]` en lugar de `string[]`. Esto ya estÃ¡ contemplado en el blueprint con la tabla `alertas_paciente`.

**Cambio requerido en frontend:**  
Adaptar la interfaz `PacienteDto.alertas` de `string[]` a `{ id: number, descripcion: string }[]`.

**Prioridad:** Baja  
**Bloqueante:** No  
**Estado:** âœ… Ya existente â€” AlertaPacienteDto ya tiene id_alerta_paciente

---

### Hallazgo 6 â€” Endpoint `/api/agenda` â€” Â¿existe como endpoint dedicado?

- **MÃ³dulo:** Agenda
- **Severidad:** ðŸŸ  Recomendado
- **Fase afectada:** Fase 5

**Problema detectado:**  
El blueprint sugiere un endpoint `GET /api/agenda` que devuelve citas + bloqueos del perÃ­odo en una sola llamada. Sin embargo, no estÃ¡ claro si este endpoint dedicado estÃ¡ implementado, o si el frontend debe combinar manualmente `GET /api/citas?fecha_desde=...&fecha_hasta=...` + `GET /api/bloqueos?...`.

**Impacto en frontend:**  
Sin endpoint dedicado, el frontend necesita:
1. `GET /api/citas?fecha_desde=2026-04-01&fecha_hasta=2026-04-30` â€” citas del mes
2. `GET /api/bloqueos?fecha_desde=2026-04-01&fecha_hasta=2026-04-30` â€” bloqueos del mes
3. Combinarlos en el calendario

Con endpoint dedicado, una sola llamada devolverÃ­a ambos, con rendimiento y simplicidad superiores.

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

Incluir la configuraciÃ³n de jornada evita una tercera llamada para obtener los horarios laborales.

**Prioridad:** Media  
**Bloqueante:** No (se puede hacer con dos llamadas separadas)  
**Estado:** âœ… Implementado â€” GET /api/agenda?mes=X&anio=Y consolidado
---

### Hallazgo 7 â€” Campos derivados que el backend debe incluir en DTOs de respuesta

- **MÃ³dulo:** Citas, Sesiones
- **Severidad:** ðŸ”´ Obligatorio
- **Fase afectada:** Fases 4, 6

**Problema detectado:**  
Varios campos que el frontend espera son derivados (calculados por JOIN o EXISTS), no almacenados. El backend debe incluirlos en los DTOs de respuesta:

| Campo | DTO | CÃ³mo obtener |
|-------|-----|-------------|
| `nombre_paciente` | `CitaDto`, `SesionDto` | JOIN con `pacientes` |
| `apellido_paciente` | `CitaDto`, `SesionDto` | JOIN con `pacientes` |
| `tiene_sesion` | `CitaDto` | `EXISTS (SELECT 1 FROM sesiones WHERE id_cita = ?)` |
| `paciente_nombre` | `SolicitudReprogramacion` | JOIN con `citas` â†’ `pacientes` |

**Comportamiento esperado:**  
El DTO de respuesta del backend debe incluir estos campos ya resueltos. El frontend **no debe** hacer llamadas adicionales para obtener el nombre del paciente de cada cita.

**Cambio recomendado en backend:**  
Asegurar que los mappers de respuesta (DTO builders) incluyan estos campos derivados vÃ­a JOINs en las queries o en la capa de servicio.

**Prioridad:** Alta  
**Bloqueante:** SÃ­, para la renderizaciÃ³n de listados  
**Estado:** âœ… Implementado â€” CitaDto, SesionDto, SolicitudReprogramacionDto con campos derivados
---

### Hallazgo 8 â€” ConvenciÃ³n de naming: Â¿snake_case uniformemente?

- **MÃ³dulo:** Transversal
- **Severidad:** ðŸŸ¡ Menor
- **Fase afectada:** Todas

**Problema detectado:**  
La mayorÃ­a de interfaces del frontend usan `snake_case` para coincidir con el backend (`id_cita`, `nombre_paciente`, `estado_pago`). Sin embargo, `SolicitudReprogramacion` usa `camelCase` (`idSolicitud`, `pacienteNombre`, `fechaCita`).

**Impacto en frontend:**  
Si el backend envÃ­a `id_solicitud` (snake_case) pero el frontend espera `idSolicitud` (camelCase), la deserializaciÃ³n fallarÃ¡ silenciosamente (campos `undefined`).

**RecomendaciÃ³n:**  
Definir una convenciÃ³n global y Ãºnica:
- **OpciÃ³n A:** El backend configura Jackson para enviar `camelCase` (propiedad `spring.jackson.property-naming-strategy=LOWER_CAMEL_CASE`)
- **OpciÃ³n B:** El backend envÃ­a `snake_case` y el frontend ajusta la interfaz `SolicitudReprogramacion` a snake_case para ser consistente

Recomendamos **OpciÃ³n B** (snake_case uniforme) porque es el estÃ¡ndar actual del 90% de las interfaces del frontend.

**Prioridad:** Baja (se resuelve al integrar el mÃ³dulo correspondiente)  
**Bloqueante:** No
**Estado:** âœ… Implementado â€” spring.jackson.property-naming-strategy=SNAKE_CASE

---

### Hallazgo 9â€” CÃ³digo beta validado localmente en frontend

- **MÃ³dulo:** Registro / VinculaciÃ³n
- **Severidad:** ðŸ”´ Obligatorio
- **Fase afectada:** Fase 2

**Problema detectado:**  
`registro.page.ts` tiene `BETA_INVITE_CODES` hardcodeado y valida el cÃ³digo localmente antes de enviar el registro. Esto es una vulnerabilidad de seguridad: cualquier usuario puede inspeccionar el cÃ³digo fuente y encontrar los cÃ³digos vÃ¡lidos.

**Comportamiento actual:**  
```typescript
const BETA_INVITE_CODES = ['BETA-2024-AGD', ...];
// ValidaciÃ³n local antes de POST
```

**Comportamiento esperado:**  
El frontend envÃ­a el `codigo_beta` al backend sin validarlo localmente. El backend valida contra la tabla `codigos_beta` y devuelve un error tipado si es invÃ¡lido:
```json
{ "code": "CODIGO_BETA_INVALIDO", "message": "El cÃ³digo de invitaciÃ³n no es vÃ¡lido o ya fue utilizado" }
```

**Cambio recomendado en backend:**  
Asegurar que el endpoint de registro (`POST /api/usuarios/registro`) valide el `codigo_beta` y devuelva error `CODIGO_BETA_INVALIDO` si es invÃ¡lido o ya fue usado. El cÃ³digo de error ya estÃ¡ contemplado en `api-error.mapper.ts`.

**Prioridad:** Alta (vulnerabilidad de seguridad)  
**Bloqueante:** No (funciona pero es inseguro)  
**Estado:** âœ… Ya existente â€” Backend valida codigo_beta en registrarPublico()
---

### Hallazgo 10 â€” Endpoint de disponibilidad: definiciÃ³n del contrato de respuesta

- **MÃ³dulo:** Citas
- **Severidad:** ðŸŸ  Recomendado
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
1. ConfiguraciÃ³n de jornada del profesional (hora inicio/fin)
2. Citas ya agendadas (evitar solapamiento)
3. Bloqueos horarios
4. Buffer entre citas (`buffer_citas_min`)
5. Flag `citas_superpuestas` (si estÃ¡ activo, no restringir)

**Cambio recomendado en backend:**  
Implementar el endpoint con la lÃ³gica de cÃ¡lculo completa y devolver la respuesta en el formato descrito.

**Prioridad:** Media  
**Bloqueante:** No (el frontend puede funcionar sin mostrar disponibilidad, pero la UX mejora mucho con ella)  
**Estado:** âœ… Implementado â€” `GET /api/citas/disponibilidad?fecha=X&duracion_min=Y` con `slots_disponibles[]`

---

### Hallazgo 11 â€” Dashboard: no existe endpoint dedicado de resumen

- **MÃ³dulo:** Dashboard
- **Severidad:** ðŸ’¡ Oportunidad
- **Fase afectada:** Fase 7

**Problema detectado:**  
Para renderizar el dashboard, el frontend necesita datos de mÃºltiples fuentes:
1. Citas de hoy
2. KPIs (citas mes, ingresos mes, pacientes nuevos, tasa cancelaciÃ³n)
3. Solicitudes de reprogramaciÃ³n pendientes (count)
4. Notificaciones no leÃ­das (count)

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
Considerar un endpoint de dashboard que agregue los datos mÃ¡s consultados. No es obligatorio â€” el frontend puede hacer mÃºltiples llamadas en paralelo, pero un endpoint consolidado reduce latencia y complejidad.

**Prioridad:** Baja  
**Bloqueante:** No  
**SoluciÃ³n temporal en frontend:** Llamadas paralelas a endpoints individuales  
**Estado:** âœ… Implementado â€” GET /api/dashboard/consolidado
---

### Hallazgo 12 â€” Solicitud de reprogramaciÃ³n: necesita datos de la cita embebidos

- **MÃ³dulo:** Solicitudes de ReprogramaciÃ³n
- **Severidad:** ðŸŸ  Recomendado
- **Fase afectada:** Fase 7

**Problema detectado:**  
El frontend muestra en el card de solicitud de reprogramaciÃ³n: nombre del paciente, fecha de la cita y hora de la cita. Estos datos no estÃ¡n en la tabla `solicitudes_reprogramacion` â€” se obtienen vÃ­a JOIN con `citas` y `pacientes`.

**Comportamiento esperado para el frontend:**  
`GET /api/solicitudes-reprogramacion` debe devolver cada solicitud con estos campos derivados:
```json
{
  "id_solicitud": 1,
  "id_cita": 5,
  "paciente_nombre": "MarÃ­a LÃ³pez",
  "fecha_cita": "2026-04-15",
  "hora_cita": "09:00",
  "mensaje_paciente": "No puedo asistir ese dÃ­a",
  "fecha_hora_sugerida": "2026-04-17T10:00:00",
  "estado": "PENDIENTE",
  "fecha_solicitud": "2026-04-10T14:30:00"
}
```

**Cambio recomendado en backend:**  
Incluir `paciente_nombre`, `fecha_cita` y `hora_cita` como campos derivados en el DTO de respuesta de solicitudes de reprogramaciÃ³n.

**Prioridad:** Media  
**Bloqueante:** SÃ­, para renderizar el componente de solicitudes  
**Estado:** âœ… Implementado â€” SolicitudReprogramacionDto incluye paciente_nombre, fecha_cita, hora_cita

---

### Hallazgo 13 â€” Configuraciones: Â¿se crean automÃ¡ticamente al registrar profesional?

- **MÃ³dulo:** ConfiguraciÃ³n
- **Severidad:** ðŸŸ  Recomendado
- **Fase afectada:** Fase 8

**Problema detectado:**  
Existen tres tablas de configuraciÃ³n (`configuracion_agenda`, `configuracion_recordatorios`, `configuracion_sistema`). El frontend espera poder hacer `GET /api/configuracion/agenda` y obtener una respuesta exitosa siempre.

**Problema potencial:**  
Si el profesional se acaba de registrar y nunca ha configurado nada, el `GET` devolverÃ­a 404 porque no existe la fila.

**Comportamiento esperado para el frontend:**  
Al registrar un profesional, el backend crea automÃ¡ticamente las tres filas de configuraciÃ³n con valores por defecto. De esta forma, `GET /api/configuracion/agenda` siempre devuelve datos.

**Cambio recomendado en backend:**  
En el servicio de registro, al crear un `profesional`, insertar tambiÃ©n las tres configuraciones con defaults:
- `configuracion_agenda`: hora_inicio=09:00, hora_fin=18:00, intervalo=30, etc.
- `configuracion_recordatorios`: recordatorio_paciente_activo=true, canal_email=true, etc.
- `configuracion_sistema`: tema=claro, idioma=es, etc.

**Alternativa:** El backend devuelve defaults si no existe la fila (lÃ³gica en el servicio), sin generar 404.

**Prioridad:** Media  
**Bloqueante:** No (el frontend puede manejar 404 con defaults locales, pero es mÃ¡s limpio si el backend los tiene)  
**Estado:** âœ… Implementado â€” crearConfiguracionesDefault() en UsuarioServiceImpl

---

### Hallazgo 14 â€” Adjuntos: flujo de upload no definido (multipart vs signed URL)

- **MÃ³dulo:** Sesiones / Notas / Adjuntos
- **Severidad:** ðŸŸ  Recomendado
- **Fase afectada:** Fase 6

**Problema detectado:**  
El blueprint menciona object storage para adjuntos pero no especifica el flujo de upload:

**OpciÃ³n A â€” Multipart directo:** El frontend envÃ­a el archivo al backend vÃ­a `POST multipart/form-data`. El backend lo sube a storage y registra metadata.

**OpciÃ³n B â€” Signed URL:** El frontend pide una URL firmada al backend â†’ sube directamente a storage â†’ confirma al backend con los metadatos.

**Impacto en frontend:**  
- OpciÃ³n A: mÃ¡s simple para el frontend (un solo request), pero el backend se convierte en proxy del archivo completo
- OpciÃ³n B: mÃ¡s eficiente (el backend no maneja el binario), pero mÃ¡s complejo en frontend (3 pasos) y requiere configurar CORS en el storage

**RecomendaciÃ³n:** Para V1, usar **OpciÃ³n A** (multipart) por simplicidad. Para V2 con archivos grandes, migrar a signed URLs.

**Prioridad:** Media â€” debe definirse antes de implementar Fase 6  
**Bloqueante:** SÃ­, para la implementaciÃ³n de adjuntos  
**Estado:** âœ… Ya existente â€” GCS signed URL flow ya implementado

---

### Hallazgo 15 â€” `SesionPaciente` tiene campos que no existen en el backend: `tipo` y `resumen`

- **MÃ³dulo:** Sesiones / Pacientes
- **Severidad:** ðŸŸ¡ Menor
- **Fase afectada:** Fases 3, 6

**Problema detectado:**  
La interfaz `SesionPaciente` (usada en el tab "Sesiones" del detalle de paciente) tiene:
- `tipo: string` â€” "Individual", "EvaluaciÃ³n", etc.
- `resumen: string` â€” resumen corto de la sesiÃ³n

Pero la tabla `sesiones` del blueprint solo tiene `notas: TEXT`. No existen los campos `tipo` ni `resumen`.

**Impacto en frontend:**  
El frontend renderiza estas columnas en el listado de sesiones del paciente. Sin estos datos, las columnas quedarÃ¡n vacÃ­as.

**Opciones:**
1. **El frontend elimina** los campos `tipo` y `resumen` de `SesionPaciente` y muestra un extracto de `notas` en su lugar
2. **El backend agrega** los campos `tipo_sesion` y `resumen` a la tabla `sesiones` (V2)

**RecomendaciÃ³n:** OpciÃ³n 1 para V1. El frontend mostrarÃ¡ los primeros 100 caracteres de `notas` como resumen. El campo `tipo` se oculta o se marca como "General" por defecto.

**Prioridad:** Baja  
**Bloqueante:** No  
**Estado:** âœ… Ya existente â€” Sesion model ya tiene tipo_sesion y resumen

--- â€” PaginaciÃ³n: definir contrato exacto de `Page<T>`

- **MÃ³dulo:** Transversal
- **Severidad:** ðŸŸ  Recomendado
- **Fase afectada:** Fase 1

**Problema detectado:**  
Spring Boot usa `Page<T>` de Spring Data para paginaciÃ³n, pero existen variaciones en la serializaciÃ³n:

- Spring HATEOAS: `{ _embedded: { items: [...] }, page: { size, totalElements, totalPages, number } }`
- Spring Data estÃ¡ndar: `{ content: [...], totalElements, totalPages, number, size, first, last, empty }`

El frontend necesita saber la estructura exacta para crear `PageResponse<T>`.

**Cambio recomendado en backend:**  
Confirmar que la serializaciÃ³n de `Page<T>` es la estÃ¡ndar de Spring Data (sin HATEOAS) con los campos:
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

**Nota adicional sobre naming:** Verificar si Spring serializa los campos del Page en camelCase (`totalElements`) o snake_case (`total_elements`). El frontend necesita saber cuÃ¡l esperar.

**Prioridad:** Media  
**Bloqueante:** SÃ­, para Fase 1 (definir la interface)  
**Estado:** âœ… Implementado â€” Jackson SNAKE_CASE + Page<T> en snake_case

---

### Hallazgo 17 â€” Notificaciones: Â¿el backend las genera automÃ¡ticamente?

- **MÃ³dulo:** Notificaciones
- **Severidad:** ðŸŸ  Recomendado
- **Fase afectada:** Fase 7, 10

**Problema detectado:**  
El frontend espera un feed de notificaciones en el dashboard. El blueprint define la tabla `notificaciones` y especifica que el backend debe generar notificaciones como efecto secundario de ciertas acciones (paciente confirma cita, recepcionista se vincula, etc.).

**Impacto en frontend:**  
Si el backend no genera notificaciones automÃ¡ticamente, el endpoint `GET /api/notificaciones` siempre devolverÃ¡ lista vacÃ­a, y el dashboard no mostrarÃ¡ nada.

**Cambio recomendado en backend:**  
Implementar la generaciÃ³n automÃ¡tica de notificaciones en los siguientes puntos:
1. Paciente confirma cita vÃ­a token pÃºblico â†’ notificaciÃ³n al profesional
2. Paciente cancela cita vÃ­a token pÃºblico â†’ notificaciÃ³n al profesional
3. Paciente solicita reprogramaciÃ³n â†’ notificaciÃ³n al profesional
4. Nuevo recepcionista se vincula â†’ notificaciÃ³n al profesional
5. Cita completada sin pago â†’ notificaciÃ³n al profesional (opcional)

**Prioridad:** Media (el frontend funciona sin notificaciones pero la UX sufre)  
**Bloqueante:** No
**Estado:** âœ… Implementado â€” Notificaciones auto-generadas en confirmar, cancelar, reprogramar y vincular

---

### Hallazgo 18â€” EstadÃ­sticas: endpoints potencialmente complejos

- **MÃ³dulo:** EstadÃ­sticas
- **Severidad:** ðŸ’¡ Oportunidad
- **Fase afectada:** Fase 11

**Problema detectado:**  
El mÃ³dulo de estadÃ­sticas tiene 9 endpoints distintos. Algunos son queries de agregaciÃ³n complejas que podrÃ­an ser lentas en bases de datos con mucho volumen.

**Endpoints potencialmente pesados:**
- `/api/estadisticas/citas` â€” serie temporal con agrupaciÃ³n por perÃ­odo
- `/api/estadisticas/ingresos` â€” agrupaciÃ³n por mÃ©todo de pago y perÃ­odo
- `/api/estadisticas/pacientes` â€” ranking, nuevos vs recurrentes
- `/api/estadisticas/insights` â€” cÃ¡lculos de tendencias y anomalÃ­as

**RecomendaciÃ³n para el backend:**
1. Para V1, las queries directas sobre las tablas principales son suficientes
2. Si el volumen crece, considerar vistas materializadas o precalculaciÃ³n nocturna
3. Los insights son opcionales y pueden devolver lista vacÃ­a si no estÃ¡n implementados â€” el frontend los maneja como optional
4. Publicar DTOs completos para `/api/estadisticas/*` y el contrato de `POST /api/estadisticas/reportes/exportar` para eliminar mappers heurÃ­sticos en frontend

**Estado frontend tras Fase 11:**  
El mÃ³dulo ya quedÃ³ conectado a `EstadisticasApiService` y dejÃ³ de inyectar `EstadisticasMockService`, pero la documentaciÃ³n vigente sigue sin fijar nombres canÃ³nicos para series/rankings/reportes ni el formato exacto de exportaciÃ³n.

**Prioridad:** Baja  
**Bloqueante:** No  
**Estado:** â¬œ Pendiente â€” Oportunidad de optimizaciÃ³n futura

---

### Hallazgo 19 â€” Confirmar-cita pÃºblico: token en la URL

- **MÃ³dulo:** PÃºblico / ConfirmaciÃ³n
- **Severidad:** ðŸŸ¡ Menor
- **Fase afectada:** Fase 12

**Problema detectado:**  
La ruta actual del frontend es `/confirmar-cita` sin el parÃ¡metro `:token`. Necesita cambiar a `/confirmar-cita/:token` para funcionar con la API.

**Este cambio es del frontend**, no del backend. Pero el backend debe asegurar que:
1. El endpoint `GET /api/public/citas/confirmar/{token}` devuelve datos suficientes para renderizar la pÃ¡gina (nombre del profesional, fecha/hora de la cita, modalidad, estado, etc.)
2. El token UUID es suficientemente largo y seguro
3. Tokens expirados devuelven un status HTTP claro (410 Gone o 400 con cÃ³digo `TOKEN_EXPIRED`)
4. Tokens ya usados devuelven informaciÃ³n de quÃ© acciÃ³n se realizÃ³ (para mostrar al paciente)

**Estructura de respuesta esperada por el frontend:**
```json
{
  "nombre_profesional": "Dr. Carlos GarcÃ­a",
  "especialidad": "PsicologÃ­a ClÃ­nica",
  "nombre_consulta": "Consultorio GarcÃ­a",
  "fecha": "2026-04-15",
  "hora_inicio": "09:00",
  "hora_fin": "10:00",
  "modalidad": "Presencial",
  "ubicacion": "Av. Reforma 123",
  "estado_cita": "Pendiente",
  "paciente_nombre": "MarÃ­a",
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
**Bloqueante:** SÃ­, para Fase 12  
**Estado:** âœ… Implementado â€” CitaGestionPublicaResponseDto con token_valido, accion_realizada, nombre_consulta
---

### Hallazgo 20 â€” BÃºsqueda de citas: Â¿busca por nombre de paciente?

- **MÃ³dulo:** Citas
- **Severidad:** ðŸŸ  Recomendado
- **Fase afectada:** Fase 4

**Problema detectado:**  
El frontend tiene un campo de bÃºsqueda libre en la pÃ¡gina de citas. El usuario espera poder buscar por nombre del paciente (ej: "MarÃ­a"). Pero la tabla `citas` no tiene el nombre del paciente â€” estÃ¡ en la tabla `pacientes`.

**Impacto en frontend:**  
Si el param `busqueda` del endpoint `GET /api/citas` solo busca en los campos de la tabla `citas` (motivo, notas_rapidas), el usuario no podrÃ¡ encontrar citas por nombre de paciente, que es el caso de uso mÃ¡s comÃºn.

**Cambio recomendado en backend:**  
El endpoint `GET /api/citas?busqueda=MarÃ­a` debe buscar en:
1. `pacientes.nombre`
2. `pacientes.apellido`
3. `citas.motivo`
4. `citas.notas_rapidas`

Esto requiere un JOIN con `pacientes` en la query de bÃºsqueda.

**Prioridad:** Alta  
**Bloqueante:** No (funciona pero la UX es mala sin bÃºsqueda por paciente)  
**Estado:** âœ… Ya existente â€” JPQL query ya busca por paciente.nombre y paciente.apellido

---

## Hallazgos Post-AuditorÃ­a (API Reference vs Frontend Actual)

> Detectados al comparar `FRONTEND_API_REFERENCE.md` (documentaciÃ³n real del backend) contra los modelos e interfaces TypeScript actuales del frontend. Todos estos son **cambios requeridos en el frontend**.

---

### Hallazgo 21 â€” LoginRequest: campos `usuario`/`contrasena` no coinciden con backend

- **MÃ³dulo:** Auth
- **Severidad:** ðŸ”´ Obligatorio
- **Fase afectada:** Fase 2

**Problema detectado:**  
El frontend envÃ­a `{ usuario, contrasena }` pero el backend espera `{ username, password }`.

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

**Prioridad:** CrÃ­tica â€” el login no funciona sin esto  
**Bloqueante:** SÃ­  
**Estado:** âœ… Resuelto (Fase 2) â€” LoginRequest alineado al contrato real usado por backend.

---

### Hallazgo 22 â€” ROL IDs: todas las constantes del frontend son incorrectas

- **MÃ³dulo:** Auth / Roles
- **Severidad:** ðŸ”´ Obligatorio
- **Fase afectada:** Fase 2

**Problema detectado:**  
El backend define los roles con IDs diferentes a los del frontend en AMBOS sets de constantes.

| Rol | `ROL_REGISTRO` (frontend) | `RolUsuario` (frontend) | Backend real (`GET /api/roles`) |
|---|---|---|---|
| ADMIN | 3 | â€” | **1** |
| PROFESIONAL | 1 | 3 | **2** |
| RECEPCIONISTA | 2 | 4 | **3** |

**Cambio requerido en frontend:**  
```typescript
// auth.models.ts
export const ROL_REGISTRO = { ADMIN: 1, PROFESIONAL: 2, RECEPCIONISTA: 3 } as const;

// rol.model.ts
export enum RolUsuario { PROFESIONAL = 2, RECEPCIONISTA = 3 }
```

**Prioridad:** CrÃ­tica â€” el registro y los guards de rol fallarÃ¡n  
**Bloqueante:** SÃ­  
**Estado:** âœ… Resuelto (Fase 2) â€” `ROL_REGISTRO` y `RolUsuario` corregidos a ADMIN=1, PROFESIONAL=2, RECEPCIONISTA=3.

---

### Hallazgo 23 â€” CitaDto: reestructuraciÃ³n completa de campos

- **MÃ³dulo:** Citas
- **Severidad:** ðŸ”´ Obligatorio
- **Fase afectada:** Fase 4

**Problema detectado:**  
La interfaz `CitaDto` del frontend tiene diferencias estructurales mayores con el backend.

| Cambio | Frontend actual | Backend real |
|---|---|---|
| Fecha/hora | `fecha` (date) + `hora_inicio`/`hora_fin` (time) + `duracion` | `fecha_inicio`/`fecha_fin` (datetime ISO) |
| Estado | `estado: EstadoCita` | `estado_cita: string` (nombre de campo diferente) |
| Notas | `notas_rapidas: string` | `observaciones: string` |
| Pago | `metodo_pago`, `monto_pagado` | Solo `estado_pago` + `monto` en el DTO |
| Nuevos campos | â€” | `origen_cita`, `confirmado_por_paciente`, `fecha_confirmacion`, `motivo_cancelacion` |

**Cambio requerido en frontend â€” nueva CitaDto:**
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

**Impacto:** Toda lÃ³gica que extrae fecha y hora de citas debe adaptarse para parsear datetimes ISO en lugar de campos separados. Componentes afectados: `cita-form-modal`, `detalle-cita`, `agenda`, `calendario`, listados de citas.

**Prioridad:** CrÃ­tica  
**Bloqueante:** SÃ­, para Fase 4  
**Estado:** ? Resuelto (Fase 5) ï¿½ `AgendaPage` ya consume `CitaDto` real/legacy-normalizado desde `AgendaApiService` y `CitasApiService`.

---

### Hallazgo 24 â€” Enums EstadoCita y EstadoPago: UPPERCASE + valores renombrados

- **MÃ³dulo:** Citas
- **Severidad:** ðŸ”´ Obligatorio
- **Fase afectada:** Fase 4

**Problema detectado:**  
El backend envÃ­a todos los valores de estado en UPPERCASE con valores diferentes.

**EstadoCita:**
| Frontend actual | Backend real |
|---|---|
| `'Pendiente'` | `'PENDIENTE'` |
| `'Confirmada'` | `'CONFIRMADA'` |
| `'Completada'` | `'COMPLETADA'` |
| `'Cancelada'` | `'CANCELADA'` |
| `'No asistiÃ³'` | `'NO_ASISTIO'` |
| `'Pospuesta'` | `'REPROGRAMADA'` |

**EstadoPago:**
| Frontend actual | Backend real |
|---|---|
| `'Pendiente'` | `'PENDIENTE'` |
| `'Parcial'` | `'PARCIAL'` |
| `'Pagado'` | `'PAGADO'` |
| â€” | `'NO_APLICA'` (nuevo) |
| â€” | `'REEMBOLSADO'` (nuevo) |

**MetodoPago:** Este type ya **NO existe** en el backend. El pago solo usa `estado_pago` + `monto`.

**Cambio requerido:**
```typescript
export type EstadoCita = 'PENDIENTE' | 'CONFIRMADA' | 'COMPLETADA' | 'CANCELADA' | 'NO_ASISTIO' | 'REPROGRAMADA';
export type EstadoPago = 'PENDIENTE' | 'PARCIAL' | 'PAGADO' | 'NO_APLICA' | 'REEMBOLSADO';
// Eliminar MetodoPago
```

Crear mapeo de labels para UI (ej: `'NO_ASISTIO'` â†’ `'No asistiÃ³'`).

**Impacto:** Todos los condicionales, badges de color, filtros y comparaciones de estado en toda la app.

**Prioridad:** CrÃ­tica  
**Bloqueante:** SÃ­  
**Estado:** ? Resuelto (Fase 5) ï¿½ Agenda ya usa `estado_cita`/`estado_pago` en UPPERCASE y labels derivados consistentes con backend.

---

### Hallazgo 25 â€” PacienteDto: sub-recursos NO embebidos + campos nuevos

- **MÃ³dulo:** Pacientes
- **Severidad:** ðŸŸ  Recomendado
- **Fase afectada:** Fase 3

**Problema detectado:**  
El `PacienteDto` del backend **NO** incluye `citas[]`, `notas[]` ni `alertas[]` embebidos. Son sub-recursos vÃ­a endpoints separados. AdemÃ¡s, hay campos nuevos.

**Campos que NO vienen en PacienteDto:**
- `citas: CitaResumenDto[]` â†’ usar `GET /api/pacientes/{id}/citas`
- `notas: NotaDto[]` â†’ usar `GET /api/pacientes/{id}/notas-clinicas`
- `alertas: string[]` â†’ usar `GET /api/pacientes/{id}/alertas` (entidades con `id_alerta_paciente`)

**Campos nuevos en el backend:**
- `sexo: string | null`
- `contacto_emergencia_nombre: string | null`
- `contacto_emergencia_telefono: string | null`

**Endpoint nuevo Ãºtil:** `GET /api/pacientes/{id}/resumen` devuelve contadores (citas, notas, sesiones, etc.)

**Cambio requerido en frontend:**  
1. Eliminar `citas`, `notas`, `alertas` de `PacienteDto`
2. Agregar campos nuevos
3. Implementar carga lazy por tab en el detalle del paciente (ya contemplado como enfoque recomendado)

**Prioridad:** Media  
**Bloqueante:** No  
**Estado:** â¬œ Pendiente â€” Se adapta al integrar Fase 3

---

### Hallazgo 26 â€” NotaDto â†’ NotaClinicaDto: entidad separada con campos nuevos

- **MÃ³dulo:** Notas ClÃ­nicas
- **Severidad:** ðŸ”´ Obligatorio
- **Fase afectada:** Fases 3, 6

**Problema detectado:**  
Las notas clÃ­nicas son una entidad independiente con endpoints propios (`/api/notas-clinicas`).

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
  "titulo": "EvaluaciÃ³n inicial",
  "contenido": "El paciente presenta...",
  "tipo_nota": "EVALUACION",
  "visible_en_resumen": true,
  "created_at": "2026-04-05T09:00:00"
}
```

**Cambios clave:**
- `id_nota` â†’ `id_nota_clinica`
- Nuevos: `titulo`, `tipo_nota`, `visible_en_resumen`, `id_sesion` (vÃ­nculo opcional con sesiÃ³n)
- `adjunto` removido (ahora es entidad separada `ArchivoAdjuntoDto` vinculada por `entidad_tipo=NOTA_CLINICA`)

**Nota importante:** `DELETE /api/notas-clinicas/{id}` hace eliminaciÃ³n FÃSICA (no soft delete). Siempre mostrar diÃ¡logo de confirmaciÃ³n "Esta acciÃ³n no se puede deshacer".

**Prioridad:** Alta  
**Bloqueante:** SÃ­, para integraciÃ³n de notas  
**Estado:** â¬œ Pendiente â€” Cambio en frontend

---

### Hallazgo 27 â€” SesionDto: nuevos campos y mÃ¡quina de estados propia

- **MÃ³dulo:** Sesiones
- **Severidad:** ðŸŸ  Recomendado
- **Fase afectada:** Fase 6

**Problema detectado:**  
El `SesionDto` del backend incluye campos nuevos y su propia mÃ¡quina de estados.

**Campos nuevos:**
- `tipo_sesion: string` â€” "INDIVIDUAL", "EVALUACION", etc.
- `estatus: string` â€” "ABIERTA", "CERRADA", "CANCELADA"
- `resumen: string | null` â€” resumen corto de la sesiÃ³n
- `fecha_sesion: string` â€” (en lugar de `fecha_cita`)

**MÃ¡quina de estados:** ABIERTA â†’ CERRADA/CANCELADA vÃ­a `PATCH /api/sesiones/{id}/estatus`.

**Cambio requerido:** Agregar campos nuevos a `SesionDto`, adaptar UI para mostrar tipo, estatus y resumen. Implementar cambio de estatus.

**Prioridad:** Media  
**Bloqueante:** No  
**Estado:** â¬œ Pendiente â€” Cambio en frontend

---

### Hallazgo 28 â€” Adjuntos: modelo completamente rediseÃ±ado

- **MÃ³dulo:** Adjuntos / Sesiones / Notas
- **Severidad:** ðŸ”´ Obligatorio
- **Fase afectada:** Fase 6

**Problema detectado:**  
El modelo de adjuntos del frontend (inline `SesionAdjunto`/`AdjuntoMeta`) es completamente diferente al backend.

**Frontend actual:** Adjunto como propiedad inline
```typescript
export interface SesionAdjunto {
  name: string; type: string; size: number; previewUrl?: string;
}
```

**Backend real:** Entidad independiente con vinculaciÃ³n polimÃ³rfica
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
1. `POST /api/archivos-adjuntos/upload-url` â†’ obtener signed URL
2. `PUT {signed_url}` con el archivo binario (**sin** Authorization header)
3. `POST /api/archivos-adjuntos` â†’ registrar metadata

**Cambio requerido:**
1. Crear `ArchivoAdjuntoDto` como entidad independiente
2. Crear `ArchivosService` con flujo de 3 pasos
3. Remover `adjunto?` inline de SesionDto y NotaDto
4. Agregar URLs de GCS a la lista de exclusiÃ³n del interceptor

**Prioridad:** Alta  
**Bloqueante:** SÃ­, para Fase 6  
**Estado:** â¬œ Pendiente â€” Cambio en frontend

---

### Hallazgo 29 â€” SolicitudReprogramacion: camelCaseâ†’snake_case + estructura diferente

- **MÃ³dulo:** Solicitudes de ReprogramaciÃ³n
- **Severidad:** ðŸ”´ Obligatorio
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
  "paciente_nombre": "MarÃ­a LÃ³pez",
  "motivo": "Tengo un compromiso familiar",
  "fecha_solicitada": "2026-04-17",
  "hora_inicio_solicitada": "11:00:00",
  "hora_fin_solicitada": "11:45:00",
  "estado": "PENDIENTE",
  "created_at": "2026-04-10T14:30:00"
}
```

**Cambios clave:**
- `idSolicitud` â†’ `id_solicitud_reprogramacion`
- `mensajePaciente` â†’ `motivo`
- `fechaHoraSugerida` (datetime) â†’ `fecha_solicitada` + `hora_inicio_solicitada` + `hora_fin_solicitada` (separados)
- `fechaSolicitud` â†’ `created_at`
- Solicitudes son sub-recurso de citas: `GET /api/citas/{id}/solicitudes-reprogramacion`

**Prioridad:** Alta  
**Bloqueante:** SÃ­  
**Estado:** â¬œ Pendiente â€” Cambio en frontend

---

### Hallazgo 30 â€” PermisosRecepcionista: formato de keys diferente

- **MÃ³dulo:** Equipo / Permisos
- **Severidad:** ðŸŸ  Recomendado
- **Fase afectada:** Fases 2, 9

**Problema detectado:**  
El frontend usa keys simples (camelCase), el backend usa keys granulares (snake_case).

**Frontend:** `{ agenda: true, citas: true, pacientes: true, notasClinicas: false, configuracion: false }`

**Backend (AuthMeResponseDto y PUT /api/recepcionistas/{id}/permisos):**
`{ "puede_crear_citas": true, "puede_ver_pacientes": true, ... }`

**Cambio requerido:** Definir el mapping exacto entre keys del frontend y del backend. Adaptar `PermisosRecepcionista` o crear mapper bidireccional.

**Prioridad:** Media  
**Bloqueante:** No inmediatamente  
**Estado:** â¬œ Pendiente â€” Requiere definir mapping exacto con backend

---

### Hallazgo 31 â€” Endpoints pÃºblicos: path y mÃ©todo HTTP diferentes

- **MÃ³dulo:** PÃºblico / ConfirmaciÃ³n de Cita
- **Severidad:** ðŸ”´ Obligatorio
- **Fase afectada:** Fase 12

**Problema detectado:**  
Los endpoints pÃºblicos tienen paths y mÃ©todos diferentes a lo planeado.

| Aspecto | Plan original | Backend real |
|---|---|---|
| Base path | `/api/public/citas/confirmar/{token}` | `/public/citas/gestion/{token}` |
| Prefijo | Con `/api` | **Sin** `/api` |
| Path segment | `confirmar` | `gestion` |
| Confirmar | `POST` | `PATCH` |
| Cancelar | `POST` | `PATCH` |
| Reprogramar | `POST .../reprogramar` | `POST .../solicitudes-reprogramacion` |

**Cambio requerido:**
1. Actualizar todas las URLs del servicio pÃºblico
2. Usar PATCH para confirmar y cancelar
3. Actualizar lista de URLs pÃºblicas en el interceptor (prefijo NO es `/api`)

**Prioridad:** Alta  
**Bloqueante:** SÃ­, para Fase 12  
**Estado:** â¬œ Pendiente â€” Cambio en frontend

---

### Hallazgo 32 â€” HistorialEventoDto: estructura completamente diferente

- **MÃ³dulo:** Historial / Actividad
- **Severidad:** ðŸŸ  Recomendado
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
- `id: string` â†’ `id_historial_evento: number`
- `tipo` â†’ `evento_tipo` + `entidad_tipo` (separados)
- `fecha` + `hora` â†’ `fecha_evento` (datetime combinado)
- Nuevo: `entidad_id`, `usuario_actor_id`, `metadata_json`
- `HistorialTipoEvento` enum values no coinciden

**Prioridad:** Media  
**Bloqueante:** No  
**Estado:** â¬œ Pendiente â€” Cambio en frontend

---

### Hallazgo 33 â€” Nuevas entidades sin modelo frontend

- **MÃ³dulo:** MÃºltiple
- **Severidad:** ðŸŸ  Recomendado
- **Fase afectada:** MÃºltiple

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

**AcciÃ³n:** Crear interfaces TypeScript conforme se integre cada fase.

**Prioridad:** Media  
**Bloqueante:** No  
**Estado:** â¬œ Pendiente â€” Se resolverÃ¡ fase por fase

---

### Hallazgo 34 â€” Query params: naming mixto camelCase/snake_case

- **MÃ³dulo:** Transversal
- **Severidad:** ðŸŸ¡ Menor
- **Fase afectada:** Todas

**Problema detectado:**  
Los query params de filtros usan naming inconsistente. Jackson SNAKE_CASE **NO** afecta a `@ModelAttribute` â€” los params usan los nombres tal cual estÃ¡n en Java:
- MayorÃ­a: camelCase â†’ `?pacienteId=15&fechaDesde=...&estadoCita=PENDIENTE`
- Excepciones: snake_case â†’ `?id_usuario=1&fecha_expiracion_desde=...`

**AcciÃ³n:** El helper `buildQueryParams()` debe usar los nombres exactos por endpoint. La API Reference ya los especifica.

**Prioridad:** Baja  
**Bloqueante:** No  
**Estado:** â¬œ Pendiente â€” Se maneja caso por caso

---

## 5. Resumen de Hallazgos por Severidad (Actualizado Post-AuditorÃ­a)

### Estado general

| CategorÃ­a | Total | âœ… Resueltos | â¬œ Pendientes |
|---|---|---|---|
| Hallazgos iniciales (1-20) | 20 | 17 | 3 |
| Hallazgos post-auditorÃ­a (21-34) | 14 | 0 | 14 |
| **Total** | **34** | **17** | **17** |

### âœ… Hallazgos Iniciales RESUELTOS por el backend (17/20)

| # | Hallazgo | ResoluciÃ³n |
|---|----------|-----------|
| 1 | `/auth/me` datos insuficientes | AuthMeResponseDto expandido |
| 2 | Ruta de registro inconsistente | `/api/usuarios/registro` existe |
| 5 | Alertas `string[]` â†’ entidad con ID | AlertaPacienteDto con id_alerta_paciente |
| 6 | Endpoint `/api/agenda` | GET /api/agenda?mes=X&anio=Y |
| 7 | Campos derivados en DTOs | nombre_paciente, tiene_sesion incluidos |
| 8 | snake_case uniforme | Jackson SNAKE_CASE global |
| 9 | CÃ³digo beta inseguro en frontend | Backend valida en registrarPublico() |
| 10 | Contrato de disponibilidad | GET /api/citas/disponibilidad con slots |
| 11 | Dashboard consolidado | GET /api/dashboard/consolidado |
| 12 | Solicitud con datos de cita | Campos derivados incluidos |
| 13 | Configuraciones auto-creadas | crearConfiguracionesDefault() |
| 14 | Flujo de upload definido | GCS signed URL 3-step flow |
| 15 | SesionPaciente.tipo y resumen | tipo_sesion y resumen existen |
| 16 | PaginaciÃ³n Page\<T\> | snake_case confirmado |
| 17 | Notificaciones automÃ¡ticas | Auto-generadas en confirmar/cancelar/vincular |
| 19 | Token pÃºblico: formato respuesta | CitaGestionPublicaResponseDto completo |
| 20 | BÃºsqueda por nombre paciente | JPQL JOIN ya implementado |

### â¬œ Hallazgos Pendientes â€” Cambios en FRONTEND (17)

#### ðŸ”´ Obligatorios â€” Bloqueantes (10)
| # | Hallazgo | Fase | Impacto |
|---|----------|------|---------|
| 3 | ROL IDs incorrectos (original) | 2 | Registro y guards fallan |
| 21 | LoginRequest: usuario/contrasena â†’ username/password | 2 | Login no funciona |
| 22 | ROL IDs: TODAS las constantes incorrectas | 2 | Registro y guards fallan |
| 23 | CitaDto: reestructuraciÃ³n completa | 4 | **Parcial:** resuelto en mÃ³dulo Citas; pendiente cierre en Agenda (Fase 5) |
| 24 | Enums UPPERCASE + valores renombrados | 4 | **Parcial:** aplicados en Citas; pendiente migraciÃ³n total en Agenda |
| 26 | NotaClinicaDto: estructura diferente | 3, 6 | CRUD de notas |
| 28 | Adjuntos: modelo entity-based + signed URLs | 6 | Upload/download de archivos |
| 29 | SolicitudReprogramacion: camelCaseâ†’snake_case | 7, 12 | Solicitudes de reprogramaciÃ³n |
| 31 | Endpoints pÃºblicos: path y mÃ©todo diferente | 12 | PÃ¡gina pÃºblica del paciente |

#### ðŸŸ  Recomendados (6)
| # | Hallazgo | Fase |
|---|----------|------|
| 25 | PacienteDto: sub-recursos separados + campos nuevos | 3 |
| 27 | SesionDto: tipo_sesion, estatus, resumen | 6 |
| 30 | PermisosRecepcionista: keys diferentes | 2, 9 |
| 32 | HistorialEventoDto: estructura diferente | 3, 10 |
| 33 | Nuevas entidades sin modelo frontend | MÃºltiple |

#### ðŸŸ¡ Menores (1)
| # | Hallazgo | Fase |
|---|----------|------|
| 34 | Query params: naming mixto | Todas |

#### ðŸ’¡ Oportunidades (1 del set original)
| # | Hallazgo | Fase |
|---|----------|------|
| 18 | EstadÃ­sticas: queries potencialmente pesadas | 11 |

---

## 6. PrÃ³ximos Pasos (Actualizado Post-AuditorÃ­a)

> **Veredicto de la auditorÃ­a:** El backend estÃ¡ **significativamente mÃ¡s avanzado** de lo previsto. 17 de 20 hallazgos iniciales ya estÃ¡n resueltos. Sin embargo, la auditorÃ­a revelÃ³ **14 nuevas discrepancias** entre los modelos del frontend y la API real, todas de tipo "cambio requerido en frontend".

### AcciÃ³n inmediata: Preparar el frontend para la integraciÃ³n

1. **Fase 1 â€” CorrecciÃ³n de modelos base (ANTES de integrar):**
   - Corregir `LoginRequest` â†’ `{ username, password }` (Hallazgo 21)
   - Corregir `ROL_REGISTRO` y `RolUsuario` con IDs correctos (Hallazgos 3, 22)
   - Crear `PageResponse<T>` con campos snake_case confirmados (Hallazgo 16 âœ…)
   - Crear helper `buildQueryParams()` consciente del naming mixto (Hallazgo 34)

2. **Fase 2 â€” Auth ya desbloqueada:**
   - El backend tiene todo lo necesario (auth/me expandido, refresh rotation, logout)
   - Solo requiere los fixes de Hallazgos 21 y 22 antes de integrar

3. **Fase 3 â€” Pacientes requiere ajustes de modelo:**
   - Eliminar sub-recursos embebidos de PacienteDto (Hallazgo 25)
   - Reescribir NotaDto â†’ NotaClinicaDto (Hallazgo 26)
   - Adaptar HistorialEvento (Hallazgo 32)

4. **Fase 4 â€” Citas: la mÃ¡s impactada:**
   - âœ… Reescribir CitaDto en mï¿½dulo Citas y Agenda (Hallazgo 23)
   - âœ… Migrar enums UPPERCASE en mï¿½dulo Citas y Agenda (Hallazgo 24)
   - Reescribir SolicitudReprogramacion (Hallazgo 29)
   - Buscar y reemplazar en toda la app: comparaciones de estado, labels, filtros

5. **Fase 6 â€” Sesiones + Adjuntos:**
   - âœ… Agregar campos nuevos a SesionDto (Hallazgo 27) â€” consumido ya por el frontend en Fase 6
   - âœ… Implementar ArchivoAdjuntoDto y signed URL flow (Hallazgo 28) â€” consumido ya por el frontend en Fase 6
   - Opcional de optimizaciÃ³n backend: exponer `total_adjuntos` o `primer_adjunto` en `GET /api/sesiones` para evitar la consulta ligera adicional por fila en el listado

6. **Fase 12 â€” Endpoints pÃºblicos:**
   - Actualizar paths y mÃ©todos HTTP (Hallazgo 31)

### Prioridad de ejecuciÃ³n

```
[1] Corregir LoginRequest + ROL IDs         â† Desbloquea Fase 2
[2] Reescribir CitaDto + Enums UPPERCASE     â† Desbloquea Fases 4-7
[3] Reescribir NotaClinicaDto               â† Desbloquea notas en Fase 3
[4] Reescribir SolicitudReprogramacion       â† Desbloquea Fase 7
[5] Implementar ArchivoAdjuntoDto           â† Desbloquea Fase 6
[6] Adaptar el resto (sesiones, historial)  â† Se hace inline al integrar
```

### Â¿Listos para comenzar Fase 1?

**SÃ­.** No hay bloqueantes de backend. Todos los hallazgos pendientes son cambios en el frontend. El backend estÃ¡ listo y estable.

---

*Documento actualizado el 05/04/2026 â€” Cierre Fase 6 (Sesiones y Adjuntos).*  
*VersiÃ³n 2.3 â€” Hallazgos 27 y 28 ya consumidos por frontend; queda sÃ³lo una optimizaciÃ³n opcional para resumen de adjuntos en listados.*


Nota Fase 7 (frontend ya integrado):
- `GET /api/dashboard/consolidado` ya alimenta badges reales de pendientes en el shell del dashboard.
- `GET /api/dashboard/resumen` y `GET /api/dashboard/agenda-hoy` ya alimentan la home real `/dashboard/inicio`.
- `GET /api/notificaciones` ya reemplaza el feed hardcodeado del header.
- Si mÃ¡s adelante se quiere aprobar/rechazar solicitudes desde el propio header, aÃºn hace falta definir un listado global documentado o confirmar otra surface oficial basada en el sub-recurso por cita.

*Documento actualizado el 05/04/2026 â€” Cierre Fase 7 (Dashboard y Resumen General).*  
*VersiÃ³n 2.4 â€” Dashboard consumido ya por frontend con API real y carga resiliente; queda abierta la decisiÃ³n de listado global de solicitudes.*

Nota Fase 8 (frontend ya integrado):
- El frontend de configuraciÃ³n/perfil tuvo que implementar compatibilidad con ambos juegos de rutas documentadas para Fase 8:
  `configuracion/sistema` vs `configuracion-sistema`,
  `configuracion/recordatorios` vs `configuracion-recordatorios`,
  `profesionales/me/*` vs `profesionales/{id}` / `codigos-vinculacion/*`,
  `usuarios/me/password` vs `usuarios/{id}/password`.
- Para reducir complejidad y riesgo de mantenimiento, conviene unificar documentaciÃ³n y contrato backend en una sola surface canÃ³nica.
- La UI actual no expone un trigger visual para regenerar `codigo_vinculacion`; si ese flujo debe quedar usable en frontend sin romper la regla de no cambiar diseÃ±o, hace falta definir un affordance permitido o una acciÃ³n ya existente.

Nota Fase 9 (frontend ya integrado):
- La integraciÃ³n real de equipo se hizo contra `GET /api/recepcionistas`, `GET/PUT /api/recepcionistas/{id}/permisos` y `PATCH /api/recepcionistas/{id}/activo`, con fallback al naming viejo `/api/equipo/*` porque el plan de integraciÃ³n seguÃ­a desactualizado.
- El frontend tuvo que consolidar permisos granulares backend (ej. `puede_crear_citas`, `puede_editar_pacientes`) en el view model visual simplificado (`agenda`, `citas`, `pacientes`, `notasClinicas`, `configuracion`). Conviene documentar oficialmente esa equivalencia o exponer un DTO agregado para administraciÃ³n de equipo.

Nota Fase 10 (frontend ya integrado):
- La pantalla global de actividad quedÃ³ conectada contra `GET /api/historial-eventos`; el endpoint `/api/actividad` seguÃ­a figurando en el plan pero no en la referencia real, asÃ­ que conviene unificar documentaciÃ³n y dejar una sola source of truth.
- El frontend ya intenta marcar notificaciones individuales como leÃ­das con `PATCH/POST /api/notificaciones/{id}/leida`, pero la API Reference vigente todavÃ­a no publica ese contrato ni un campo canÃ³nico de lectura (`leida`, `fecha_leida`, etc.).
- La acciÃ³n masiva "marcar todas como leÃ­das" quedÃ³ documentada como pendiente porque no existe affordance visual en la UI actual y la ruta tampoco estÃ¡ canonizada en la referencia.

*Documento actualizado el 06/04/2026 â€” Fase 10 (Actividad, Notificaciones e Historial).*  
*VersiÃ³n 2.6 â€” Actividad global consume `historial-eventos`, la lectura individual de notificaciones quedÃ³ integrada con fallback y siguen pendientes la canonizaciÃ³n documental y la acciÃ³n masiva.*

