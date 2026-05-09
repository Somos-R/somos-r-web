# Badge

Chip de estado basado en `Chip` de MUI. Usado para mostrar estados como verificado, pendiente, etc.

## Importación

```ts
import { Badge } from '@/components/ui'
```

## Props

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| label | `string` | — | Texto del badge |
| color | `"success"` \| `"warning"` \| `"error"` \| `"default"` \| `"info"` \| `"primary"` | `"default"` | Color del badge |
| size | `"small"` \| `"medium"` | `"small"` | Tamaño |
| sx | `SxProps` | — | Estilos adicionales |

## Ejemplos de uso

### Estado de reciclador
```tsx
<Badge label="Verificado" color="success" />
<Badge label="Pendiente" color="warning" />
<Badge label="Rechazado" color="error" />
```

### Material
```tsx
<Badge label="Papel" color="info" />
<Badge label="Metal" color="default" />
```

## Uso en Somos R

- PesajesTable: estado del pesaje y tipo de material
- RecicladoresTable: estado de verificación
- InventarioTable: material y estado de stock

## Notas

Se usa `Chip` de MUI (no `Badge`) porque permite texto inline, lo que es más apropiado para etiquetas de estado.
