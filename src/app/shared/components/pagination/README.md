# app-pagination

Componente reusable de paginacion para tablas/listados de Agendify.

## Inputs

- `page: number` -> pagina actual (base 0).
- `pageSize: number` -> tamano de pagina actual.
- `total: number` -> total de registros en backend.
- `pageSizeOptions?: number[]` -> opciones de tamano (default: `10,20,50`).
- `showPageSizeSelector?: boolean` -> muestra selector de tamano (default: `true`).
- `compact?: boolean` -> reduce espaciado superior (default: `false`).

## Outputs

- `pageChange: EventEmitter<number>` -> emite pagina destino (base 0).
- `pageSizeChange: EventEmitter<number>` -> emite nuevo tamano de pagina.

## Comportamiento

- Calcula internamente rango visible (`start-end`) y estado de flechas.
- Soporta `total=0` sin romper UI (`0-0 de 0` y navegacion deshabilitada).
- Mantiene estilo minimalista tipo Stripe/Linear.

## Integracion recomendada

1. Al recibir `pageChange`, recargar API con `page`.
2. Al recibir `pageSizeChange`, guardar nuevo size y recargar con `page=0`.
3. Al cambiar filtros, resetear pagina a `0` antes de consultar.

## Ejemplo

```html
<app-pagination
  [page]="currentPage"
  [pageSize]="pageSize"
  [total]="totalItems"
  (pageChange)="onPageChange($event)"
  (pageSizeChange)="onPageSizeChange($event)"
></app-pagination>
```

