# Table

Sistema de tabla completo basado en los componentes de tabla de MUI.

## Importación

```ts
import {
  Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, TablePagination
} from '@/components/ui'
```

## Componentes

| Componente | Descripción |
|-----------|-------------|
| `TableContainer` | Envuelve la tabla en un Paper con borde |
| `Table` | Tabla HTML semántica |
| `TableHead` | Cabecera de la tabla |
| `TableBody` | Cuerpo de la tabla |
| `TableRow` | Fila (acepta `hover` para resaltar) |
| `TableCell` | Celda (acepta `align`: left/center/right) |
| `TablePagination` | Paginación con selector de filas por página |

### TablePagination Props

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| count | `number` | — | Total de filas |
| page | `number` | — | Página actual (0-indexed) |
| rowsPerPage | `number` | — | Filas por página |
| onPageChange | `function` | — | Callback de cambio de página |
| onRowsPerPageChange | `function` | — | Callback de cambio de filas/página |
| rowsPerPageOptions | `number[]` | `[8, 15, 25]` | Opciones de filas por página |

## Ejemplo de uso

```tsx
<TableContainer>
  <Table>
    <TableHead>
      <TableRow>
        <TableCell>Nombre</TableCell>
        <TableCell align="right">Kg</TableCell>
      </TableRow>
    </TableHead>
    <TableBody>
      {rows.map((r) => (
        <TableRow key={r.id} hover>
          <TableCell>{r.name}</TableCell>
          <TableCell align="right">{r.kg}</TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
  <TablePagination count={total} page={page} rowsPerPage={8} onPageChange={handlePage} />
</TableContainer>
```

## Uso en Somos R

- PesajesTable, RecicladoresTable, InventarioTable, Transacciones

## Notas

La paginación usa 0-indexing (página 0 = primera página), que es el estándar de MUI.
