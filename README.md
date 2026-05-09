# Somos R — Portal Web

Portal de gestión para ECAs y Asociaciones de reciclaje.
Stack: React 19 · TypeScript · Material UI · Vite · Zustand · React Query

---

## Descripción del proyecto

**Somos R** es una plataforma tecnológica para la gestión del ciclo de reciclaje en Colombia. Conecta ciudadanos, recicladores de oficio, ECAs (Estaciones de Clasificación y Aprovechamiento) y asociaciones.

Este repositorio contiene **únicamente el frontend del Portal ECA/Asociación** — la interfaz web de escritorio. La app móvil para ciudadanos y recicladores está en `somos-r-mobile/` y es un proyecto separado.

### Actores que usan el portal

| Actor | Qué puede hacer |
|-------|----------------|
| **Operador ECA** | Registrar pesajes, ver recicladores, consultar inventario y transacciones |
| **Admin ECA** | Todo lo del operador + dashboard de métricas, reportes, configuración |
| **Admin Asociación** | Padrón de recicladores, validación/rechazo, exportación |
| **Superadmin** | Acceso completo a todos los módulos |

---

## Stack tecnológico

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| React | 19.x | UI |
| TypeScript | 6.x | Tipado estático |
| Material UI | 6.x | Sistema de componentes |
| Emotion | 11.x | CSS-in-JS (requerido por MUI) |
| Vite | 8.x | Bundler y dev server |
| React Router | 7.x | Navegación |
| Zustand | 5.x | Estado global |
| React Query | 5.x | Caché de peticiones HTTP |
| Axios | 1.x | Cliente HTTP |
| lucide-react | latest | Íconos |
| Vitest | 3.x | Pruebas unitarias |
| Testing Library | 16.x | Utilidades de testing |

---

## Estructura del proyecto

```
src/
├── components/
│   ├── ui/          # Sistema de componentes propio (wrappers sobre MUI)
│   └── layout/      # Sidebar, Header, DashboardLayout
├── features/        # Módulos por dominio de negocio
│   ├── auth/        # Login, formulario de autenticación
│   ├── dashboard/   # Métricas y actividad reciente
│   ├── pesajes/     # Registro y validación de pesajes
│   ├── recicladores/# Padrón y verificación de recicladores
│   ├── inventario/  # Control de stock por material
│   ├── transacciones/ # Compras a recicladores y ventas a empresas
│   ├── reportes/    # Métricas y exportación
│   └── configuracion/ # Perfil y ajustes de la ECA
├── hooks/           # useAuth, useRoles — lógica reutilizable
├── stores/          # Estado global con Zustand
├── lib/             # apiClient (Axios)
├── types/           # Tipos TypeScript compartidos (auth.types.ts)
├── styles/          # Tema MUI de Somos R
└── test/            # Setup de Vitest

docs/
└── components/      # Documentación de cada componente UI

legacy-web/          # Código anterior en shadcn/ui (solo referencia, no usar)
somos-r-mobile/      # App móvil React Native (no modificar)
```

---

## Requisitos previos

- Node.js 18+
- pnpm 9+

---

## Instalación y desarrollo

```bash
# Instalar dependencias
pnpm install

# Levantar servidor de desarrollo
pnpm dev        # http://localhost:5173

# Compilar para producción
pnpm build

# Vista previa del build
pnpm preview
```

---

## Sistema de componentes UI

Los componentes están en `src/components/ui/`. Son wrappers sobre MUI — nunca importar `@mui/material` directamente en las páginas ni features.

```ts
import { Button, Input, Table, Badge } from '@/components/ui'
```

### Ejemplos rápidos

```tsx
// Botón con carga
<Button variant="contained" loading={isLoading}>Guardar</Button>

// Campo de texto con error
<Input label="Email" error={!!err} helperText={err} value={email} onChange={(e) => setEmail(e.target.value)} />

// Badge de estado
<Badge label="Verificado" color="success" />
```

Ver documentación completa en [`docs/components/README.md`](./docs/components/README.md).

---

## Pruebas

```bash
pnpm test            # modo watch
pnpm test:ui         # interfaz visual de Vitest
pnpm test:coverage   # reporte de cobertura HTML
```

**Qué se prueba:**
- Todos los componentes de `src/components/ui/` — renderizado, props, interacciones
- Hooks `useAuth` y `useRoles` — lógica de autenticación y permisos
- Los archivos de prueba están en `__tests__/` dentro de cada carpeta

---

## Roles y permisos

| Rol | Dashboard | Pesajes | Reportes | Recicladores | Inventario | Configuración |
|-----|:---------:|:-------:|:--------:|:------------:|:----------:|:-------------:|
| `operador_eca` | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| `admin_eca` | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| `admin_asociacion` | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| `superadmin` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

En modo desarrollo (`DEV`), el formulario de login incluye un selector de rol para simular cualquier actor.

---

## Convenciones de código

- **Componentes**: `PascalCase.tsx`
- **Hooks y utilidades**: `camelCase.ts`
- **Constantes**: `UPPER_SNAKE_CASE`
- **Commits**: Conventional Commits — `feat(scope): descripción`, `fix(scope): descripción`, `docs:`, `chore:`
- **Branches**: `feature/*` y `fix/*` desde `develop`
- Ver documentación de componentes en [`docs/components/`](./docs/components/)

---

## Conexión con el backend

El proyecto usa datos mock actualmente (`src/features/*/` contiene los arrays `MOCK_*`). El `apiClient.ts` está configurado con Axios y listo para conectar con el backend FastAPI cuando tenga CORS activo.

Variable de entorno requerida:

```env
VITE_API_URL=https://api.somosr.co
```

Para reemplazar el mock en una página, busca los comentarios `// Mock — reemplazar con:` en los archivos de cada feature.

---

## Estado del desarrollo

| Módulo | Estado | Pendiente |
|--------|--------|-----------|
| Login / Auth | ✅ Mock | Integrar Supabase Auth |
| Dashboard | ✅ Mock | Conectar métricas reales |
| Pesajes | ✅ Mock | `POST /api/v1/pesajes` |
| Recicladores | ✅ Mock | `GET /api/v1/users?user_type=recycler` |
| Inventario | ✅ Mock | `GET /api/v1/inventario` |
| Transacciones | ✅ Mock | `GET /api/v1/compras`, `GET /api/v1/ventas` |
| Reportes | ✅ Placeholder | Conectar métricas reales |
| Configuración | ✅ Placeholder | `PATCH /auth/password` |
