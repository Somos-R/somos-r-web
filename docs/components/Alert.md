# Alert

Mensaje de alerta con severidad visual, basado en `Alert` de MUI.

## Importación

```ts
import { Alert } from '@/components/ui'
```

## Props

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| severity | `"success"` \| `"error"` \| `"warning"` \| `"info"` | — | Tipo de alerta |
| children | `ReactNode` | — | Contenido del mensaje |
| onClose | `() => void` | — | Callback para mostrar botón de cierre |
| sx | `SxProps` | — | Estilos adicionales |

## Ejemplos de uso

### Error de autenticación
```tsx
<Alert severity="error">{error}</Alert>
```

### Éxito
```tsx
<Alert severity="success" onClose={() => setOpen(false)}>
  Operación completada exitosamente.
</Alert>
```

## Uso en Somos R

- LoginForm: error de login

## Notas

Para notificaciones temporales (toasts), usa `Snackbar` en su lugar.
