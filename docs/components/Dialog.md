# Dialog

Modal accesible basado en el sistema `Dialog` de MUI. Compuesto por subcomponentes.

## Importación

```ts
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@/components/ui'
```

## Componentes

### Dialog

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| open | `boolean` | — | Controla la visibilidad |
| onClose | `() => void` | — | Callback al cerrar |
| maxWidth | `"xs"` \| `"sm"` \| `"md"` \| `"lg"` \| `"xl"` | `"sm"` | Ancho máximo |
| fullWidth | `boolean` | `true` | Ocupa el ancho máximo |
| sx | `SxProps` | — | Estilos adicionales |

### DialogTitle

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| showClose | `boolean` | — | Muestra botón X de cierre |
| onClose | `() => void` | — | Callback del botón X |

### DialogContent, DialogActions

Wrappers simples con padding consistente.

## Ejemplo de uso

```tsx
<Dialog open={open} onClose={onClose}>
  <DialogTitle showClose onClose={onClose}>Confirmar acción</DialogTitle>
  <DialogContent>
    <Typography>¿Deseas continuar?</Typography>
  </DialogContent>
  <DialogActions>
    <Button variant="outlined" onClick={onClose}>Cancelar</Button>
    <Button onClick={onConfirm}>Confirmar</Button>
  </DialogActions>
</Dialog>
```

## Uso en Somos R

- DashboardLayout: confirmación de logout
- Transacciones: modales de nueva compra/venta

## Notas

El botón de cierre usa el ícono `X` de `lucide-react`.
