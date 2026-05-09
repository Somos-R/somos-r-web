# Select

Selector desplegable basado en `TextField` con `select` de MUI. Acepta opciones tipadas.

## Importación

```ts
import { Select } from '@/components/ui'
```

## Props

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| label | `string` | — | Label flotante del selector |
| value | `string` | — | Valor seleccionado (controlado) |
| onChange | `ChangeEventHandler` | — | Callback al seleccionar |
| options | `Array<{ value: string; label: string }>` | — | Opciones del selector |
| disabled | `boolean` | — | Deshabilita el selector |
| error | `boolean` | — | Aplica estilos de error |
| helperText | `string` | — | Texto de ayuda debajo |
| fullWidth | `boolean` | `true` | Ocupa el 100% del ancho |
| size | `"small"` \| `"medium"` | `"small"` | Tamaño |
| sx | `SxProps` | — | Estilos MUI adicionales |

## Ejemplos de uso

### Selector de material
```tsx
<Select
  label="Material"
  value={material}
  onChange={(e) => setMaterial(e.target.value)}
  options={[
    { value: 'papel', label: 'Papel' },
    { value: 'plastico', label: 'Plástico' },
  ]}
/>
```

### Selector de rol (solo DEV)
```tsx
<Select label="Rol (solo DEV)" value={devRole} onChange={(e) => setDevRole(e.target.value)} options={DEV_ROLES} />
```

## Uso en Somos R

- LoginForm: selector de rol en modo DEV
- Modales de transacciones: selector de material y estado

## Notas

Usa el mismo componente base (`TextField`) que `Input` para consistencia visual.
