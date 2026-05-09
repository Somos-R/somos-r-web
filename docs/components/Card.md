# Card

Contenedor de tarjeta basado en `Card` de MUI. Incluye subcomponentes para cabecera y contenido.

## Importación

```ts
import { Card, CardContent, CardHeader } from '@/components/ui'
```

## Componentes

### Card

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| elevation | `number` | `0` | Sombra de la tarjeta |
| variant | `"elevation"` \| `"outlined"` | `"outlined"` | Estilo de la tarjeta |
| sx | `SxProps` | — | Estilos adicionales |

### CardHeader

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| title | `string` | — | Título de la cabecera |
| subtitle | `string` | — | Subtítulo (opcional) |
| action | `ReactNode` | — | Elemento a la derecha (botón, link) |

### CardContent

Wrapper simple con padding consistente.

## Ejemplo de uso

```tsx
<Card>
  <CardHeader title="Métricas del mes" subtitle="Resumen general" action={<Button>Exportar</Button>} />
  <CardContent>
    <Typography>Contenido de la tarjeta</Typography>
  </CardContent>
</Card>
```

## Uso en Somos R

- Dashboard: tarjetas de métricas
- Reportes y Configuración: secciones de contenido

## Notas

`elevation={0}` con `variant="outlined"` da el aspecto limpio y consistente del diseño de Somos R.
