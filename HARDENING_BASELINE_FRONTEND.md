# HARDENING_BASELINE_FRONTEND

Fecha de auditoria: 2026-04-08

Alcance revisado:
- `src/app/services`
- `src/app/pages/**`
- `src/app/shared/models/**`
- `src/app/shared/components/**`
- `src/environments/**`
- Documentacion de integracion en `FRONTEND_INTEGRATION_PLAN.md`, `INTEGRATION_PENDING_ITEMS.md` y `BACKEND_CHANGES_FOR_FRONT.md`

Observacion general:
- El frontend ya opera mayormente contra APIs reales.
- Los riesgos remanentes no estan en mocks activos sino en contratos no canonicos, normalizaciones tolerantes y persistencia parcial en configuracion/perfil/publico/estadisticas.
- Donde indico "inferencia" significa que el riesgo se deduce del codigo porque la UI conserva campos o estados que no tienen un contrato backend unico o completo.

## 1. Servicios API reales

| Servicio | Archivo | Endpoints reales consumidos | Observaciones |
| --- | --- | --- | --- |
| AuthService | `src/app/services/auth.ts` | `POST /auth/login`, `GET /auth/me`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/forgot-password`, `POST /usuarios/registro` | Fuente principal de autenticacion y sesion. |
| DashboardApiService | `src/app/services/dashboard-api.service.ts` | `GET /dashboard/resumen`, `GET /dashboard/agenda-hoy`, `GET /dashboard/consolidado` | Sin fallbacks en codigo. |
| NotificacionesApiService | `src/app/services/notificaciones.service.api.ts` | `GET /notificaciones`, `PATCH or POST /notificaciones/{id}/leida`, `POST or PATCH /notificaciones/marcar-todas-leidas` | Tiene fallback por metodo HTTP. |
| ConfiguracionApiService | `src/app/services/configuracion-api.service.ts` | `GET/PUT /configuracion/agenda`, `GET/PUT /configuracion/sistema`, `GET/PUT /configuracion/recordatorios`, `POST/PUT/PATCH /configuracion-recordatorios`, `POST/PUT /configuracion-sistema` | Modulo con mayor tolerancia de contrato. |
| PerfilApiService | `src/app/services/perfil-api.service.ts` | `GET/PUT /usuarios/me`, `GET /profesionales/me`, `PUT /profesionales/me/perfil`, `GET/POST /profesionales/me/codigo-vinculacion*`, `PUT /usuarios/me/password` | Usa varias rutas alternativas. |
| EquipoApiService | `src/app/services/equipo-api.service.ts` | `GET /recepcionistas`, `GET /recepcionistas/{id}`, `GET/PUT /recepcionistas/{id}/permisos`, `PATCH /recepcionistas/{id}/activo`, `PATCH /recepcionistas/{id}` | Compatible con naming legacy `equipo`. |
| ActividadApiService | `src/app/services/actividad-api.service.ts` | `GET /historial-eventos` | La capa de mapeo convierte bitacora tecnica a feed UX. |
| AdjuntosServiceApi | `src/app/services/adjuntos.service.api.ts` | `GET/POST/DELETE /archivos-adjuntos`, `POST /archivos-adjuntos/upload-url`, `GET /archivos-adjuntos/{id}/download-url`, `GET /sesiones/{id}/archivos-adjuntos`, `PUT <signed upload url>` | Flujo real de adjuntos ya integrado. |
| AgendaApiService | `src/app/pages/agenda/agenda-api.service.ts` | `GET /agenda`, `GET /configuracion/agenda`, `POST/PUT/DELETE /bloqueos-horario` | Normaliza agenda y bloqueos a shape legacy-compatible. |
| CitasApiService | `src/app/pages/citas/citas-api.service.ts` | `GET/POST/PUT/DELETE /citas`, `PATCH /citas/{id}/confirmar`, `cancelar`, `completar`, `no-asistio`, `estado`, `pago`, `GET /citas/disponibilidad` | Mezcla params camelCase y snake_case por compatibilidad. |
| SolicitudReprogramacionApiService | `src/app/pages/citas/solicitud-reprogramacion-api.service.ts` | `GET /citas/{id}/solicitudes-reprogramacion`, `PATCH /aprobar`, `PATCH /rechazar` | Usa cache local en agenda. |
| ConfirmacionPublicaService | `src/app/pages/confirmar-cita/confirmacion-publica.service.ts` | `GET /public/citas/gestion/{token}`, `PATCH /confirmar`, `PATCH /cancelar`, `POST /solicitudes-reprogramacion` | Endpoint publico real. |
| PacientesApiService | `src/app/pages/pacientes/pacientes-api.service.ts` | `GET/POST/PUT /pacientes`, `PATCH /pacientes/{id}/activo`, `GET /pacientes/{id}/resumen`, CRUD `/alertas`, `GET /pacientes/{id}/notas-clinicas`, CRUD `/notas-clinicas`, `GET /pacientes/{id}/sesiones`, `GET /pacientes/{id}/historial` | Sin mocks activos. |
| SesionesApiService | `src/app/pages/sesiones/sesiones-api.service.ts` | `GET/POST/PUT /sesiones`, `GET /sesiones/{id}`, `GET /citas/{id}/sesion` | Sin tolerancia fuerte, salvo consumo cruzado desde citas. |
| EstadisticasApiService | `src/app/pages/estadisticas/estadisticas.service.api.ts` | `GET /estadisticas/resumen`, `/citas`, `/ingresos`, `/pacientes`, `/insights`, `/caja-diaria`, `/reportes`, `/reportes/{tipo}`, `POST /estadisticas/reportes/exportar` | Es el servicio con mas heuristicas de shape de respuesta. |

Servicios no oficiales o deprecados:
- `src/app/services/usuario.ts`: usa `/usuario/crear`, no se importa en flujos activos y debe considerarse legado.

## 2. Fallbacks de endpoints y de contrato

### Fallbacks de ruta/metodo

| Area | Implementacion | Fallback detectado |
| --- | --- | --- |
| Configuracion sistema | `ConfiguracionApiService.getSistema()` | prueba `configuracion/sistema` y luego `configuracion-sistema` |
| Configuracion sistema save | `ConfiguracionApiService.saveSistema()` | intenta `PUT /configuracion/sistema`; si 404/405 cae a `PUT /configuracion-sistema/{id}` o `POST /configuracion-sistema` |
| Configuracion recordatorios | `ConfiguracionApiService.getRecordatorios()` | prueba `configuracion/recordatorios` y `configuracion-recordatorios` |
| Perfil usuario actual | `PerfilApiService.getUsuarioActual()` | prueba `usuarios/me` y `auth/me` |
| Perfil usuario save | `PerfilApiService.updateUsuarioActual()` | intenta `PUT /usuarios/me`; fallback a `PUT /usuarios/{id}` |
| Perfil profesional actual | `PerfilApiService.getProfesionalActual()` | prueba `profesionales/me`; fallback opcional a `profesionales/{id}` |
| Perfil profesional save | `PerfilApiService.updateProfesionalActual()` | intenta `PUT /profesionales/me/perfil`; fallback a `PUT /profesionales/{id}` |
| Codigo de vinculacion get | `PerfilApiService.getCodigoVinculacion()` | prueba `profesionales/me/codigo-vinculacion` y `codigos-vinculacion/me`; fallback final a leer `profesional.codigo_vinculacion` del perfil |
| Codigo de vinculacion regenerar | `PerfilApiService.regenerarCodigoVinculacion()` | prueba `profesionales/me/codigo-vinculacion/regenerar` y `codigos-vinculacion/regenerar`; fallback final a valor ya embebido en perfil |
| Password | `PerfilApiService.changePassword()` | intenta `PUT /usuarios/me/password`; fallback a `PUT /usuarios/{id}/password` |
| Equipo listado/detalle | `EquipoApiService` | prueba naming real `recepcionistas` y luego naming legacy `equipo` |
| Equipo permisos save | `EquipoApiService.updateRecepcionistaPermisos()` | intenta body plano en `/recepcionistas/{id}/permisos` o `/equipo/{id}/permisos`; fallback a `{ permisos: body }` sobre ruta real |
| Equipo activo | `EquipoApiService.setRecepcionistaActivo()` | intenta `PATCH /recepcionistas/{id}/activo` o `/equipo/{id}/activo`; fallback a `PATCH /recepcionistas/{id}` con `{ activo }` |
| Notificacion leida individual | `NotificacionesApiService.markAsRead()` | prueba `PATCH` y luego `POST` |
| Notificacion leidas masivo | `NotificacionesApiService.markAllAsRead()` | prueba `POST` y luego `PATCH` |
| Configuracion page recordatorios | `ConfiguracionPage.guardarRecordatorios()` | intenta save unificado; si 404/405 sincroniza como coleccion (`create`, `update`, `setActivo`) |

### Fallbacks de payload/query

| Area | Compatibilidad |
| --- | --- |
| `CitasApiService.getAll()` | envia `estadoPago` y `estado_pago` |
| `CitasApiService.getDisponibilidad()` | envia `duracionMinutos` y `duracion_min`, `citaIdExcluir` y `cita_id_excluir` |
| `PerfilApiService.changePassword()` | envia simultaneamente `password_actual/password_nueva`, `current_password/new_password`, `contrasena_actual/contrasena_nueva` |
| `EquipoApiService.toBackendPermisosPayload()` | envia llaves cortas y llaves `puede_*` al mismo tiempo |

## 3. Mappers heuristicos

Hallazgos principales:

| Mapper / helper | Archivo | Heuristica aplicada |
| --- | --- | --- |
| `withLegacyCitaFields` | `src/app/pages/citas/models/cita.model.ts` | deriva `fecha`, `hora_inicio`, `hora_fin`, `duracion`, `estado`, `notas_rapidas`, `monto_pagado`, `metodo_pago` desde `CitaDto` real para mantener pantallas legacy-compatible |
| `AgendaApiService.normalizeAgenda/normalizeBloqueo/normalizeConfiguracion` | `src/app/pages/agenda/agenda-api.service.ts` | acepta ids alternos, fecha separada o ISO completo, `motivo` vs `motivo_bloqueo`, `hora_inicio` vs `hora_inicio_jornada`, intervalos alternos |
| `CitasApiService.normalizeDisponibilidad` | `src/app/pages/citas/citas-api.service.ts` | acepta `slots` o `slots_disponibles`, `inicio/start`, `fin/end`, `duracion_minutos` o variantes |
| `SolicitudReprogramacionApiService.mapSolicitud/mapEstado` | `src/app/pages/citas/solicitud-reprogramacion-api.service.ts` | tolera `estado` o `estado_solicitud`, `APROBADA` o `ACEPTADA`, horas truncadas |
| `ActividadApiService.mapTipo/mapIcono/mapTitulo/mapDescripcion` | `src/app/services/actividad-api.service.ts` | clasifica actividad por `evento_tipo`, `entidad_tipo` y metadata JSON; convierte bitacora tecnica a feed UX |
| `ActividadApiService.parseMetadata/readString` | `src/app/services/actividad-api.service.ts` | tolera `metadata_json` vacio, invalido o con claves camel/snake |
| `ConfiguracionApiService.normalizeAgenda` | `src/app/services/configuracion-api.service.ts` | mezcla `hora_inicio` y `hora_inicio_jornada`, varios nombres para intervalo, booleans/numeros nullable |
| `ConfiguracionApiService.normalizeSistema` | `src/app/services/configuracion-api.service.ts` | acepta `id_configuracion_sistema` nullable y campos opcionales que la UI mantiene visibles |
| `ConfiguracionApiService.normalizeRecordatorios` | `src/app/services/configuracion-api.service.ts` | acepta array root o `recordatorios[]`; `id` o `id_configuracion_recordatorio` |
| `PerfilApiService.normalizeUsuario` | `src/app/services/perfil-api.service.ts` | tolera `id_usuario` o `id`, `username` o `usuario`, `numero_telefono` o `telefono` |
| `PerfilApiService.normalizeProfesional` | `src/app/services/perfil-api.service.ts` | tolera root o `profesional`, `id_profesional` o `id`, `especialidad` o `profesional_especialidad`, `descripcion` o `bio`, `telefono_consultorio` o `telefono` |
| `PerfilApiService.normalizeCodigo` | `src/app/services/perfil-api.service.ts` | acepta `codigo_vinculacion`, `codigo` o `value` |
| `EquipoApiService.extractRows/resolveId/extractPermisosRecord/mapBackendPermisos` | `src/app/services/equipo-api.service.ts` | tolera respuesta array/page/envelope; ids alternos; permisos anidados o planos; multiples aliases `agenda`, `puede_ver_agenda`, etc. |
| `SessionService.mapPermisosFromBackend` | `src/app/services/session.service.ts` | asume shape basico de `/auth/me` y solo mapea llaves canonicas snake_case |
| `DashboardPage.mapNotificacion/isNotificacionPendiente` | `src/app/pages/dashboard/dashboard.page.ts` | decide lectura por `leida`, `fecha_leida`, `read_at`, `estado`, `estado_envio` |
| `Pacientes.normalizeSexoPaciente` | `src/app/pages/pacientes/models/paciente.model.ts` | limpia acentos, guiones y variantes libres para mapear sexo a valores UI |
| `mapHistorialEventoApi` | `src/app/pages/pacientes/models/paciente.model.ts` | convierte `tipo_evento`, `estado` y `modulo` a tipos visuales del historial |
| `EstadisticasApiService.*` | `src/app/pages/estadisticas/estadisticas.service.api.ts` | usa `readArray`, `readString`, `readNumber`, `readBoolean` para absorber multiples nombres de claves en todos los modulos de estadisticas |
| `ConfirmarCitaPage.mapCita/detectModalidad/buildSlots` | `src/app/pages/confirmar-cita/confirmar-cita.page.ts` | infiere modalidad desde texto libre y genera slots sugeridos localmente en vez de consumir disponibilidad real |

## 4. Modelos tolerantes o ambiguos

| Modelo | Archivo | Ambiguedad / tolerancia |
| --- | --- | --- |
| `CitaDto` | `src/app/pages/citas/models/cita.model.ts` | mantiene campos deprecated para compatibilidad (`fecha`, `hora_inicio`, `estado`, `metodo_pago`, `monto_pagado`) |
| `DisponibilidadResponse` | `src/app/pages/citas/models/cita.model.ts` + servicio | depende de normalizacion porque backend puede devolver distintas keys para slots y duracion |
| `ConfiguracionAgendaDto` | `src/app/shared/models/configuracion.models.ts` | casi todo nullable/opcional; conviven campos duplicados de horario e intervalo |
| `ConfiguracionSistemaDto` | `src/app/shared/models/configuracion.models.ts` | varios campos visibles en UI pero sin contrato canonicamente cerrado (`tema`, `tamano_interfaz`, `animaciones`, etc.) |
| `ConfiguracionRecordatorioDto` | `src/app/shared/models/configuracion.models.ts` | `id` nullable, `activo` nullable, array o envelope segun endpoint |
| `UsuarioPerfilDto` | `src/app/shared/models/perfil.models.ts` | usa shape normalizada desde `/usuarios/me` o `/auth/me` |
| `ProfesionalPerfilDto` | `src/app/shared/models/perfil.models.ts` | multiples nombres posibles para la misma informacion profesional |
| `AuthMeResponse` | `src/app/shared/models/auth.models.ts` | el frontend asume `profesional` y `permisos` embebidos; otras rutas de perfil no siempre devuelven exactamente ese shape |
| `RecepcionistaEquipoViewModel` | `src/app/shared/models/equipo.model.ts` via servicio | no refleja un DTO canonico; es una proyeccion construida desde respuestas heterogeneas |
| `NotificacionDto` | `src/app/pages/dashboard/dashboard.models.ts` | coexisten `estado_envio`, `estado`, `leida`, `fecha_leida`, `read_at` |
| `HistorialEventoDto` | `src/app/services/actividad-api.service.ts` | `metadata_json` libre y `evento_tipo`/`entidad_tipo` no tipados de forma cerrada |
| `PacienteDto.sexo` | `src/app/pages/pacientes/models/paciente.model.ts` | se limpia y normaliza desde texto libre o variantes no canonicas |

## 5. Componentes/paginas que dependen de contratos no canonicos

| Pantalla/componente | Dependencia no canonica |
| --- | --- |
| `ConfiguracionPage` (`src/app/pages/configuracion/configuracion.page.integrated.ts`) | fusiona agenda, sistema y recordatorios en un solo state UI; guarda parte por endpoint unificado y parte como coleccion; conserva muchos toggles sin DTO backend unico |
| `PerfilPage` (`src/app/pages/perfil/perfil.page.integrated.ts`) | mezcla perfil, perfil profesional, agenda, sistema y recordatorios; usa fallbacks de `me` vs `/{id}` y rellena defaults locales |
| `DashboardPage` (`src/app/pages/dashboard/dashboard.page.ts`) | interpreta lectura de notificaciones con varios campos posibles; ignora fallo al marcar leida porque el endpoint aun no esta documentado de forma canonica |
| `ActividadPageIntegrated` (`src/app/pages/actividad/actividad.page.integrated.ts`) | renderiza un feed UX construido por heuristicas de `ActividadApiService` |
| `AgendaPage` y dependientes de agenda | consumen citas normalizadas con `withLegacyCitaFields` y cache local de solicitudes de reprogramacion |
| `CitaFormModal` (`src/app/shared/components/cita-form-modal/cita-form-modal.component.ts`) | depende de disponibilidad tolerante en `/citas/disponibilidad` |
| `DetalleCitaPage` (`src/app/pages/citas/detalle-cita/detalle-cita.page.ts`) | depende de `CitaDto` con campos legacy derivados y de acciones PATCH no uniformes por estado |
| `ConfirmarCitaPage` (`src/app/pages/confirmar-cita/confirmar-cita.page.ts`) | interpreta modalidad desde texto libre y muestra slots sugeridos generados en frontend, no desde una API de disponibilidad publica |
| Modulos de estadisticas (`src/app/pages/estadisticas/**`) | todos dependen de `EstadisticasApiService`, que absorbe shapes alternos para KPIs, series, estados, rankings, reportes e insights |
| `PacienteDetallePage` (`src/app/pages/pacientes/paciente-detalle.page.ts`) | historial y sexo del paciente se apoyan en mappers tolerantes |

## 6. Endpoints aun simulados o con persistencia parcial

Estado encontrado en codigo:

### Persistencia parcial confirmada

| Area | Situacion |
| --- | --- |
| Configuracion - recordatorios | La UI intenta un endpoint unificado, pero si no existe sincroniza reglas individuales. El contrato final sigue sin estar unificado. |
| Configuracion - sistema | Parte del formulario persiste contra `configuracion/sistema` o `configuracion-sistema`; varios campos siguen sujetos a documentacion incompleta. |
| Equipo | La funcionalidad es real, pero soporta dos contratos (`recepcionistas` y `equipo`) y dos shapes de payload para permisos. |
| Notificaciones | La lectura individual/masiva existe con fallback de metodo, lo que confirma que el contrato no esta totalmente canonizado. |
| Perfil | Perfil, profesional, password y codigo de vinculacion siguen dependiendo de rutas alternativas `me` vs `/{id}` y shapes heterogeneos. |
| Estadisticas - insights/caja/reportes | El frontend los consume como reales, pero trata 404 como ausencia valida. Eso indica endpoints opcionales o no desplegados en todos los entornos. |

### Simulacion funcional o UX local aun presente

| Area | Situacion |
| --- | --- |
| Confirmacion publica - slots sugeridos | `ConfirmarCitaPage.buildSlots()` genera 3 horarios sugeridos en frontend a partir de la cita original. No consume disponibilidad publica real. |
| Confirmacion publica - modalidad | `detectModalidad()` infiere "Virtual" o "Presencial" desde `nombre_consulta` y `motivo`. |
| Configuracion - campos sin respaldo claro | Inferencia: `permitirCancelacion`, `permitirReprogramacion`, `recordatorioProfesional`, `notifPacienteConfirma`, `notifPacienteCancela`, `notifPacienteReprograma`, `notifInApp`, `alertasSonoras`, `avisosCitasProximas`, `avisosPacientesNuevos`, `avisosPagosPendientes`, `formatoFecha`, `ocultarDatosSensibles`, `confirmarEliminarCitas`, `confirmarEliminarPacientes`, `vistaPreviaDatos`, `bloquearCambiosCriticos` permanecen como estado UI/defaults sin persistencia backend visible en este repo. |
| Perfil - cards informativas | `stats` e `integraciones` en `perfil.page.integrated.ts` siguen siendo datos estaticos de presentacion, no datos reales de API. |
| Actividad - modal de solicitud | `ActividadPageIntegrated.abrirSolicitud()` esta vacio; la vista ya no depende de mock, pero la accion profunda sobre solicitudes no esta cerrada desde esta pantalla. |

### Mocks activos

Resultado:
- No se detectaron mocks activos en flujos compilados.
- `useMocks` ya no participa en runtime.
- Persiste solo codigo legado/documental fuera del flujo principal, por ejemplo `src/app/services/usuario.ts` y referencias historicas en markdowns.

## 7. Clases CSS de integracion que aun deben validarse visualmente

Criterio usado:
- clases en pantallas/componentes agregados o fuertemente ampliados durante la integracion
- namespaces nuevos o bloques grandes detectados por historial Git y SCSS

### Alta prioridad visual

| Area | Namespace/clases a validar |
| --- | --- |
| Configuracion integrada | `cfg-*`, `eq-*` en `src/app/pages/configuracion/configuracion.page.scss` |
| Perfil integrado | `prf-*` en `src/app/pages/perfil/perfil.page.scss` |
| Actividad integrada | `act-*` en `src/app/pages/actividad/actividad.page.scss` |
| Confirmacion publica | `cc-*` en `src/app/pages/confirmar-cita/confirmar-cita.page.scss` |
| Estadisticas shell | `est-*` en `src/app/pages/estadisticas/estadisticas.page.scss` |
| Dashboard header/notificaciones/menus | `notification-*`, `notif-*`, `user-dropdown*`, `section-item*`, `bottom-menu*`, `dashboard-layout`, `sidebar`, `resizer` en `src/app/pages/dashboard/dashboard.page.scss` |

### Componentes compartidos o UI nueva de integracion

| Area | Namespace/clases a validar |
| --- | --- |
| Modal de solicitud reprogramacion | `srm-*` en `src/app/shared/components/solicitud-reprogramacion-modal/solicitud-reprogramacion-modal.component.scss` |
| Exportar reporte | `erm-*` en `src/app/pages/estadisticas/components/exportar-reporte-modal/exportar-reporte-modal.component.scss` |
| Date picker custom | `agf-dp*` y panel asociado en `src/app/shared/components/agf-date-picker/**` |
| Time picker custom | `agf-tp*` y panel asociado en `src/app/shared/components/agf-time-picker/**` |
| Badges de pago | `pb`, `pb--pending`, `pb--partial`, `pb--paid`, `pb--na`, `pb--refund` |
| Badges de estado | `eb`, `eb--pending`, `eb--confirmed`, `eb--completed`, `eb--cancelled`, `eb--absent`, `eb--postponed` |

### Submodulos visuales de estadisticas

El modulo de estadisticas tiene una superficie visual grande y nueva. Conviene validacion responsive/manual sobre:
- `chart-*` en `chart-citas-por-periodo`, `chart-citas-resumen`, `chart-estados-cita`, `chart-ingresos`, `chart-pacientes`
- `resumen-*` en `resumen-kpis`, `resumen-caja-diaria`
- `tabla-*` en `tabla-reportes`
- `insights-*` en `insights-estadisticas`
- `filtros-*` en `filtros-estadisticas`
- `submenu-*` en `estadisticas-submenu`

## Riesgos prioritarios antes de cierre final

1. Canonizar contratos de Configuracion/Perfil/Equipo/Notificaciones para poder retirar fallbacks de ruta, metodo y payload.
2. Confirmar que los campos visibles de Configuracion realmente tienen respaldo backend; hoy varios parecen solo UI state o persistencia parcial.
3. Reemplazar la sugerencia local de horarios en confirmacion publica por disponibilidad real si el release requiere reprogramacion publica confiable.
4. Validar visualmente namespaces `cfg-*`, `prf-*`, `act-*`, `cc-*`, `est-*`, `notif-*`, `srm-*`, `erm-*`, `agf-*`, `pb-*`, `eb-*` en desktop y mobile.
5. Definir contrato canonico de estadisticas/reportes; el frontend es resiliente, pero eso tambien oculta drift de backend.

## Conclusion

La app ya no depende de mocks para sus flujos principales. El baseline de hardening queda dominado por compatibilidad defensiva: multiples endpoints equivalentes, mapeos heuristicos y superficies de UI que preservan campos todavia no normalizados contra backend. El siguiente paso sano no es rediseñar, sino cerrar contratos canonicos y hacer QA visual/manual sobre los bloques CSS nuevos de la integracion.
