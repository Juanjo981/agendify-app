# Checklist Integracion Frontend ↔ Backend

Fecha: 2026-10-15
Repositorio: Juanjo981/agendify-app

## Checklist detallado por modulo

- [x] Reprogramacion: alinear servicio a contrato por cita con PATCH /api/citas/{id}/solicitudes-reprogramacion/{id_solicitud}/aprobar
  Evidencia: [src/app/pages/citas/solicitud-reprogramacion-api.service.ts](src/app/pages/citas/solicitud-reprogramacion-api.service.ts#L36), [src/app/pages/citas/solicitud-reprogramacion-api.service.ts](src/app/pages/citas/solicitud-reprogramacion-api.service.ts#L92), [FRONTEND_API_REFERENCE.md](FRONTEND_API_REFERENCE.md#L1190)
  Estado actual: Implementado en frontend con ruta anidada por cita (/api/citas/{id}/solicitudes-reprogramacion/{id_solicitud}/aprobar).
  Criterio de aceptacion: Aprobar/rechazar funciona contra rutas anidadas por cita y actualiza estado en UI sin fallback.

- [x] Reprogramacion: cambiar rechazo a PATCH /api/citas/{id}/solicitudes-reprogramacion/{id_solicitud}/rechazar
  Evidencia: [src/app/pages/citas/solicitud-reprogramacion-api.service.ts](src/app/pages/citas/solicitud-reprogramacion-api.service.ts#L109), [FRONTEND_API_REFERENCE.md](FRONTEND_API_REFERENCE.md#L1203)
  Estado actual: Implementado en frontend con ruta anidada por cita (/api/citas/{id}/solicitudes-reprogramacion/{id_solicitud}/rechazar).
  Criterio de aceptacion: Rechazo persiste y se refleja en actividad/citas con respuesta backend oficial.

- [x] Confirmacion publica: eliminar fallback mock en pantalla y ruta de desarrollo /confirmar-cita sin token
  Evidencia: [src/app/app-routing.module.ts](src/app/app-routing.module.ts#L122), [src/app/pages/confirmar-cita/confirmar-cita.page.ts](src/app/pages/confirmar-cita/confirmar-cita.page.ts#L94), [src/app/pages/confirmar-cita/confirmar-cita.page.ts](src/app/pages/confirmar-cita/confirmar-cita.page.ts#L200)
  Estado actual: Sin token se muestra estado de enlace invalido y se removio ruta de desarrollo /confirmar-cita.
  Criterio de aceptacion: Acceso sin token muestra error de enlace invalido, nunca datos ficticios.

- [x] Confirmacion publica: validar/definir contrato minimo de disponibilidad publica o remover consumo
  Evidencia: [src/app/pages/confirmar-cita/confirmacion-publica.service.ts](src/app/pages/confirmar-cita/confirmacion-publica.service.ts#L81), [FRONTEND_API_REFERENCE.md](FRONTEND_API_REFERENCE.md#L2199)
  Estado actual: Se removio consumo de /public/citas/gestion/{token}/disponibilidad y se oculto reprogramacion publica basada en slots hasta definir contrato oficial.
  Criterio de aceptacion: Endpoint documentado y probado, o UI oculta reprogramacion basada en slots publicos.

- [x] Estadisticas: unificar contrato de endpoints (familia /api/estadisticas vs /api/dashboard/estadisticas-*)
  Evidencia: [src/app/pages/estadisticas/estadisticas.service.api.ts](src/app/pages/estadisticas/estadisticas.service.api.ts#L85), [FRONTEND_API_REFERENCE.md](FRONTEND_API_REFERENCE.md#L523), [FRONTEND_API_REFERENCE.md](FRONTEND_API_REFERENCE.md#L560)
  Estado actual: Referencia principal unificada con /api/estadisticas como canonico y rutas /api/dashboard/estadisticas-* declaradas como alias legacy.
  Criterio de aceptacion: Contrato unico publicado y todas consultas devuelven 200 con shape estable.

- [x] Notificaciones: formalizar endpoints de lectura/no leidas en contrato backend principal
  Evidencia: [src/app/services/notificaciones.service.api.ts](src/app/services/notificaciones.service.api.ts#L56), [src/app/services/notificaciones.service.api.ts](src/app/services/notificaciones.service.api.ts#L73), [src/app/services/notificaciones.service.api.ts](src/app/services/notificaciones.service.api.ts#L77), [FRONTEND_API_REFERENCE.md](FRONTEND_API_REFERENCE.md#L2055)
  Estado actual: Doc principal incluye /api/notificaciones/no-leidas/count, PATCH /api/notificaciones/{id}/leida y POST /api/notificaciones/marcar-todas-leidas con codigos de error esperados.
  Criterio de aceptacion: Doc y backend incluyen estas rutas con codigos de error esperados.

- [x] Perfil: acordar y documentar /api/usuarios/me y /api/profesionales/me en referencia principal
  Evidencia: [src/app/services/perfil-api.service.ts](src/app/services/perfil-api.service.ts#L19), [src/app/services/perfil-api.service.ts](src/app/services/perfil-api.service.ts#L21), [FRONTEND_API_REFERENCE.md](FRONTEND_API_REFERENCE.md#L2402)
  Estado actual: Referencia principal incluye GET/PUT /api/usuarios/me, PUT /api/usuarios/me/password, GET /api/profesionales/me y PUT /api/profesionales/me/perfil con request/response/errores y nota de forma canonica de respuesta.
  Criterio de aceptacion: Endpoints me documentados con request/response/error y utilizados sin normalizaciones ambiguas.

- [x] Perfil: reemplazar metricas estaticas por datos backend reales o ocultarlas
  Evidencia: [src/app/pages/perfil/perfil.page.integrated.ts](src/app/pages/perfil/perfil.page.integrated.ts#L73), [src/app/pages/perfil/perfil.page.integrated.ts](src/app/pages/perfil/perfil.page.integrated.ts#L79)
  Estado actual: Metricas/cards estaticas se mantienen solo como contenido informativo no dinamico, etiquetado explicitamente en UI de perfil.
  Criterio de aceptacion: Metricas y cards salen de API o se marcan explicitamente como contenido informativo no dinamico.

- [x] Sesiones: implementar accion de cambio de estatus con PATCH /api/sesiones/{id}/estatus
  Evidencia: [FRONTEND_API_REFERENCE.md](FRONTEND_API_REFERENCE.md#L1523), [src/app/pages/sesiones/sesiones-api.service.ts](src/app/pages/sesiones/sesiones-api.service.ts#L17)
  Estado actual: Frontend implementa PATCH /api/sesiones/{id}/estatus y acciones cerrar/cancelar desde detalle de sesion con refresco de estado en UI.
  Criterio de aceptacion: Cerrar/cancelar sesion desde UI persiste estatus sin editar payload completo.

- [x] Auth/seguridad: migrar almacenamiento de tokens a storage seguro (si target movil lo permite)
  Evidencia: [src/app/services/auth.ts](src/app/services/auth.ts#L132), [src/app/services/auth.ts](src/app/services/auth.ts#L133), [FRONTEND_API_REFERENCE.md](FRONTEND_API_REFERENCE.md#L41)
  Estado actual: Auth usa estrategia secure-first en movil via SecureStoragePlugin (si disponible) con cache en memoria y fallback web/localStorage; logout limpia ambos tokens y estado local.
  Criterio de aceptacion: Tokens cifrados/seguros y logout limpia ambos stores.

- [x] Dashboard shell: usar logout remoto para revocar refresh token antes de limpiar sesion local
  Evidencia: [src/app/pages/dashboard/dashboard.page.ts](src/app/pages/dashboard/dashboard.page.ts#L258), [src/app/services/auth.ts](src/app/services/auth.ts#L108), [FRONTEND_API_REFERENCE.md](FRONTEND_API_REFERENCE.md#L366)
  Estado actual: Desde menu se ejecuta logout remoto (POST /auth/logout con refresh_token) y luego limpieza local de sesion/tokens.
  Criterio de aceptacion: Cierre de sesion dispara revocacion backend y luego navegacion.

- [x] Recetas: resolver conflicto de contrato entre servicio actual y documento backend especifico
  Evidencia: [src/app/services/recetas-api.service.ts](src/app/services/recetas-api.service.ts#L27), [docs/recetas-medicas-endpoints.txt](docs/recetas-medicas-endpoints.txt#L18), [docs/recetas-medicas-endpoints.txt](docs/recetas-medicas-endpoints.txt#L100)
  Estado actual: Contrato consolidado y alineado al frontend en familia /api/recetas + /api/pacientes/{id}/recetas; rutas /profesionales/me/... quedan como referencia legacy no canonica para FE.
  Criterio de aceptacion: Un solo contrato vigente y pruebas de crear/listar/ver/emitir/copia/anular/pdfs en ese contrato.

- [x] Resumen paciente y primera sesion: documentar contratos en referencia principal o moverlos a documento backend oficial
  Evidencia: [src/app/services/paciente-resumen.service.ts](src/app/services/paciente-resumen.service.ts#L26), [src/app/services/primera-sesion.service.ts](src/app/services/primera-sesion.service.ts#L27), [FRONTEND_API_REFERENCE.md](FRONTEND_API_REFERENCE.md#L639)
  Estado actual: Referencia principal incluye contratos de /resumen/indicadores, /resumen/actividad y GET/PUT /primera-sesion con ejemplos y codigos 204/404/422.
  Criterio de aceptacion: Contrato publicado con ejemplos de payload y errores 204/404/422.

## Checklist transversal

- [x] Cliente API centralizado + interceptores
  Estado actual: Cliente HTTP central de Angular (`provideHttpClient`) con `authInterceptor` global registrado; servicios consumen `HttpClient` sobre ese pipeline comun.
  Evidencia: [src/app/app.module.ts](src/app/app.module.ts#L17), [src/app/interceptors/auth.interceptor.ts](src/app/interceptors/auth.interceptor.ts#L41)

- [x] Manejo unificado de errores API
  Estado actual: Adopcion transversal de `mapApiError`/`mapRecetaApiError` en pantallas, flujos de guardado y auth interceptor con mensajes consistentes por codigo/HTTP.
  Evidencia: [src/app/pages/login/login.page.ts](src/app/pages/login/login.page.ts#L57), [src/app/pages/pacientes/paciente-detalle.page.ts](src/app/pages/pacientes/paciente-detalle.page.ts#L361), [src/app/pages/citas/citas.page.ts](src/app/pages/citas/citas.page.ts#L188)

- [x] Refresh token y sesion expirada
  Estado actual: Flujo robusto implementado en interceptor con refresh unico concurrente, cola de requests en espera, reintento transparente y logout forzado al fallar refresh.
  Evidencia: [src/app/interceptors/auth.interceptor.ts](src/app/interceptors/auth.interceptor.ts#L141), [src/app/interceptors/auth.interceptor.ts](src/app/interceptors/auth.interceptor.ts#L158)

- [x] Contratos tipados FE/BE
  Estado actual: Tipado reforzado en fronteras HTTP (servicios API troncales + auth/interceptor) usando contratos DTO y `unknown` en bordes para evitar `any` en respuestas BE.
  Evidencia: [src/app/services/configuracion-api.service.ts](src/app/services/configuracion-api.service.ts#L24), [src/app/pages/agenda/agenda-api.service.ts](src/app/pages/agenda/agenda-api.service.ts#L26), [src/app/pages/citas/citas-api.service.ts](src/app/pages/citas/citas-api.service.ts#L160), [src/app/services/auth.ts](src/app/services/auth.ts#L247)

- [x] Paginacion/filtros server-side donde aplique
  Estado actual: Paginacion y rango de fechas en server-side; en sesiones se elimino el fallback N+1 de adjuntos por fila y se usa metadata del listado (`primer_adjunto`/`tiene_adjuntos`/`total_adjuntos`) para filtro visual local sin llamadas extra.
  Evidencia: [src/app/pages/sesiones/sesiones-api.service.ts](src/app/pages/sesiones/sesiones-api.service.ts#L23), [src/app/pages/sesiones/sesiones.page.ts](src/app/pages/sesiones/sesiones.page.ts#L69), [src/app/pages/sesiones/sesiones.page.ts](src/app/pages/sesiones/sesiones.page.ts#L180)

- [x] Pruebas de integracion de flujos criticos
  Estado actual: Se agrego suite de contract tests en vivo FE↔BE con `node:test` para flujos criticos de auth (login endpoint, rechazo sin token, refresh/logout y paginacion de sesiones cuando hay credenciales de prueba). Ejecucion actual contra BE levantado: 2 pruebas passing, 1 prueba autenticada en skip por falta de `AGENDIFY_TEST_USER`/`AGENDIFY_TEST_PASSWORD`.
  Evidencia: [scripts/contract-flujos-criticos.test.mjs](scripts/contract-flujos-criticos.test.mjs#L1), [package.json](package.json#L10)

## Plan de ejecucion por fases

### Fase 1 (Alta prioridad)

- [x] Reprogramacion de citas: corregir rutas y acciones al contrato oficial (M)
- [x] Retirar mock runtime y ruta dev de confirmacion publica (S)
- [x] Resolver contrato unico para estadisticas (M)
- [x] Logout remoto + revocacion token en menu dashboard (S)
- [x] Definir oficialmente endpoints de notificaciones de lectura/no leidas (M)

### Fase 2 (Media)

- [x] Documentar endpoints faltantes (usuarios me, profesionales me, primera sesion, resumen paciente) o ajustar frontend al contrato existente (M)
- [x] Resolver conflicto de contrato de recetas (servicio vs documento especifico) (L)
- [x] Reducir N+1 en sesiones para adjuntos y alinear paginacion/filtrado server-side (M)
- [x] Reemplazar metricas hardcodeadas de perfil por datos reales o etiqueta informativo (S)

### Fase 3 (Baja)

- [x] Estandarizar convencion de endpoints y normalizadores de respuesta por modulo (M)
- [x] Revisar seguridad de storage de tokens para contexto movil/hibrido (M)
- [x] Añadir suite de contract tests FE↔BE para flujos criticos (L)
- [x] Consolidar documentacion backend del repo en una sola fuente de verdad versionada (M)
- [ ] Habilitar credenciales tecnicas de QA (o usuario semilla) para ejecutar tambien el test autenticado en CI de `npm run test:contracts` (S)
  Estado actual: se puede ejecutar localmente con `.\scripts\test-contracts-authenticated.ps1`, que solicita usuario y contraseña sin guardarlos en el repo. El test falla si las credenciales faltan cuando `CI=true` o `AGENDIFY_REQUIRE_AUTH_TEST=true`; en modo local normal mantiene el skip para permitir los contratos públicos.
  Pendiente para CI: el backend debe estar accesible desde el runner de CI (el `localhost` del desarrollador no es accesible desde GitHub Actions) y las credenciales deben configurarse como secrets. Usar una cuenta técnica aislada con rol PROFESIONAL y acceso de lectura a sesiones; no usar credenciales personales ni commitearlas.
  Alta de cuenta: preferir el registro soportado por la API de backend; no insertar usuarios directamente en PostgreSQL sin hash BCrypt y relaciones asociadas. No se agregó script SQL porque el registro requiere flujo de backend y código beta.
