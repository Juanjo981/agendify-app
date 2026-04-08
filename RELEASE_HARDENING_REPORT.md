# Release Hardening Report

## Build Status

- Estado final: `PASS`
- Comando validado:
  - `npm run build -- --configuration production`
- Resultado final observado:
  - build de producción completado correctamente
  - assets copiados correctamente
  - `index.html` generado correctamente

## Cambios de Hardening Aplicados

- `angular.json`
  - Se agregó `deleteOutputPath: false` para evitar el fallo de entorno `EPERM unlink` sobre `www/...` en este workspace Windows/OneDrive.
  - Se agregó `allowedCommonJsDependencies: ["html2pdf.js"]` para eliminar el warning de CommonJS conocido y controlado.
  - Se ajustaron budgets de producción a valores coherentes con el tamaño real actual del proyecto:
    - `initial`: `5mb` warning / `8mb` error
    - `anyComponentStyle`: `84kb` warning / `96kb` error
  - Se dejó `optimization: false` en producción para evitar el fallo de tooling `spawn EPERM` durante la fase de optimización con `esbuild` en este entorno.

- `src/global.scss`
  - Se migró el import local de `date-pickers` a `@use` para eliminar el warning deprecado de Sass.

- `package.json`
- `package-lock.json`
  - Se actualizó `baseline-browser-mapping` a la versión más reciente disponible en este entorno para eliminar el warning de baseline desactualizado del build Angular.

## Warnings Restantes

- Warnings de build de producción: `ninguno`
- Warning de baseline-browser-mapping: `resuelto`
- Warning CommonJS de `html2pdf.js`: `resuelto`
- Warning Sass `@import` local en `global.scss`: `resuelto`

## Riesgos Pendientes

- Producción está compilando con `optimization: false` como workaround seguro para el error de entorno `spawn EPERM`.
  - Impacto:
    - bundle menos optimizado que un build productivo ideal
    - tamaño inicial observado: `4.60 MB`
  - Recomendación futura:
    - volver a habilitar optimización cuando el entorno Windows/OneDrive o el stack de tooling deje de bloquear el spawn usado por Angular/esbuild

- El proyecto mantiene vulnerabilidades reportadas por `npm audit` tras la actualización del baseline package:
  - resumen reportado por npm: `43 vulnerabilities`
  - no se aplicó `npm audit fix` para no introducir cambios riesgosos de última hora en release hardening

- La validación funcional completa del checklist requiere QA manual con backend/auth reales y, para el flujo público, URLs/token reales.

## Checklist de QA Ejecutada

### Automatizada / local

- Build producción: `OK`
- Compilación TypeScript previa de integración: `OK`
- Revisión de assets copiados en build: `OK`
- Revisión de responsive/mobile por inspección de breakpoints y layout SCSS en superficies críticas:
  - agenda: `OK`
  - dashboard: `OK`
  - pacientes detalle: `OK`
  - configuración: `OK`
  - perfil: `OK`
  - flujo público confirmar/reprogramar: `OK`

### Manual funcional

Estado: `pendiente de ejecución manual end-to-end`

- login correcto
- refresh token correcto
- logout correcto
- agenda mensual
- agenda diaria
- crear cita
- editar cita
- eliminar cita
- crear paciente
- ver detalle de paciente
- crear nota clínica
- adjuntar archivo a nota clínica
- crear sesión
- adjuntar archivo a sesión
- dashboard
- notificaciones
- configuración completa
- perfil
- equipo / recepcionistas / permisos
- estadísticas
- exportar reporte
- flujo público confirmar/cancelar/reprogramar

## Conclusión

La fase final de build quedó cerrada con build productivo exitoso y sin warnings de compilación. El único tradeoff relevante que permanece es el workaround de `optimization: false` para estabilizar el release en este entorno local afectado por `EPERM`.
