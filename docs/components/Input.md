# Input

Campo de texto basado en `TextField` de MUI con soporte para label, validación y adornments.

## Importación

```ts
import { Input } from '@/components/ui'
```

## Props

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| label | `string` | — | Label flotante del campo |
| placeholder | `string` | — | Texto de placeholder |
| value | `string` | — | Valor controlado |
| onChange | `ChangeEventHandler` | — | Callback al cambiar valor |
| type | `string` | `"text"` | Tipo HTML del input |
| disabled | `boolean` | — | Deshabilita el campo |
| error | `boolean` | — | Aplica estilos de error |
| helperText | `string` | — | Texto de ayuda/error debajo del campo |
| fullWidth | `boolean` | `true` | Ocupa el 100% del ancho |
| size | `"small"` \| `"medium"` | `"small"` | Tamaño del campo |
| startAdornment | `ReactNode` | — | Elemento al inicio del campo |
| endAdornment | `ReactNode` | — | Elemento al final del campo |
| sx | `SxProps` | — | Estilos MUI adicionales |

## Ejemplos de uso

### Campo de email con validación
```tsx
<Input
  label="Email"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  error={!!emailError}
  helperText={emailError}
/>
```

### Campo con ícono al final
```tsx
<Input
  label="Contraseña"
  type="password"
  endAdornment={<IconButton onClick={toggle}><Eye /></IconButton>}
/>
```

## Uso en Somos R

- LoginForm: email y contraseña
- Modales de pesajes: campo de kg
- Tablas: buscador con `fullWidth={false}`

## Notas

`fullWidth` es `true` por defecto para facilitar el uso en formularios.
