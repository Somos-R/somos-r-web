# Snackbar

Notificación temporal (toast) basada en `Snackbar` + `Alert` de MUI.

## Importación

```ts
import { Snackbar } from '@/components/ui'
```

## Props

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| open | `boolean` | — | Controla la visibilidad |
| onClose | `() => void` | — | Callback al cerrar |
| message | `string` | — | Texto del mensaje |
| severity | `"success"` \| `"error"` \| `"warning"` \| `"info"` | `"success"` | Tipo de notificación |
| duration | `number` | `3000` | Duración en ms antes de cerrarse |

## Ejemplo de uso

```tsx
const [open, setOpen] = useState(false)

<Button onClick={() => setOpen(true)}>Guardar</Button>

<Snackbar
  open={open}
  onClose={() => setOpen(false)}
  message="Cambios guardados exitosamente"
  severity="success"
/>
```

## Uso en Somos R

- DashboardLayout: confirmación de logout exitoso

## Notas

Se posiciona en `bottom-center` por defecto para no interferir con la navegación del sidebar.
