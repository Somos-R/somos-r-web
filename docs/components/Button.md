# Button

Botón de acción principal de Somos R. Soporta variantes de color, tamaños y estado de carga.

## Importación

```ts
import { Button } from '@/components/ui'
```

## Props

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| variant | `"contained"` \| `"outlined"` \| `"text"` \| `"destructive"` | `"contained"` | Estilo visual del botón |
| size | `"small"` \| `"medium"` \| `"large"` | `"medium"` | Tamaño |
| loading | `boolean` | `false` | Muestra spinner y deshabilita el botón |
| disabled | `boolean` | — | Deshabilita el botón |
| fullWidth | `boolean` | — | Ocupa el 100% del ancho |
| startIcon | `ReactNode` | — | Ícono antes del texto |
| endIcon | `ReactNode` | — | Ícono después del texto |
| onClick | `MouseEventHandler` | — | Callback al hacer clic |
| type | `"button"` \| `"submit"` \| `"reset"` | `"button"` | Tipo HTML del botón |
| sx | `SxProps` | — | Estilos MUI adicionales |

## Ejemplos de uso

### Guardar con estado de carga
```tsx
<Button variant="contained" loading={isLoading}>Guardar</Button>
```

### Cancelar
```tsx
<Button variant="outlined" onClick={handleCancel}>Cancelar</Button>
```

### Eliminar (destructivo)
```tsx
<Button variant="destructive" onClick={handleDelete}>Eliminar</Button>
```

## Uso en Somos R

- Login: botón de submit con `loading={isLoading}`
- Confirmación de logout: botón destructivo
- Tablas: botón "Validar" con `variant="outlined"`
- Modales: botones de cancelar y confirmar

## Notas

`variant="destructive"` usa el color `error` del tema MUI, que corresponde a `#ef4444`.
