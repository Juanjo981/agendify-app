# Dashboard Refresh Pattern

Patrón reusable para refresco contextual en módulos con subnavegación interna.

## Cómo funciona

- Cada módulo expone un servicio de contexto de refresh.
- La página shell llama `enterSection('mi-submodulo')` al entrar a una pestaña o ruta hija.
- Los componentes o shells se suscriben con `watchSection('mi-submodulo')` y recargan datos ahí.
- Después de un CRUD o cualquier cambio relevante, se dispara `requestRefresh()`.

## Cuándo usar `requestRefresh()`

- Después de crear, editar o eliminar registros.
- Cuando un cambio impacta resúmenes, cards o listados relacionados.
- Cuando un submódulo visible debe volver a consultar su fuente sin recargar toda la app.

## Cómo extenderlo

1. Crear un servicio que extienda `DashboardSectionRefreshContext`.
2. Definir los ids de sección del módulo.
3. Llamar `enterSection()` desde navegación local o desde la ruta hija activa.
4. Suscribir `watchSection()` en el shell o submódulo que carga datos.
