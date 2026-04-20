# Somos R - Web

Portal ECA (Estación de Clasificación y Aprovechamiento) construido con React 19, Vite, TypeScript y shadcn/ui.

## Requisitos previos

- Node.js 18+
- pnpm 9+

## Instalación

```bash
pnpm install
```

## Desarrollo

```bash
pnpm dev
```

El servidor se ejecutará en `http://localhost:5173`

## Compilación

```bash
pnpm build
```

## Lint y formato

```bash
pnpm lint
pnpm format
```

## Páginas disponibles

| Ruta | Página | Descripción |
|------|--------|-------------|
| `/login` | Login | Autenticación con manejo de errores 401/403 |
| `/dashboard` | Dashboard | Métricas de resumen y acciones rápidas |
| `/recicladores` | Recicladores | Padrón con búsqueda, paginación y validación ASOBEUM |
| `/pesajes` | Pesajes | Registro de pesajes, calculadora de materiales |
| `/reportes` | Reportes | Métricas, top recicladores y exportación CSV |
| `/configuracion` | Configuración | Perfil ECA y cambio de contraseña |

## Estructura del proyecto

```
somos-r-web/
├── src/
│   ├── components/       # Componentes reutilizables
│   │   ├── ui/           # Primitivos shadcn/ui (Button, Input, Dialog…)
│   │   ├── DashboardLayout.tsx
│   │   ├── LoginForm.tsx
│   │   ├── RecicladoresTable.tsx
│   │   ├── PesajesTable.tsx
│   │   ├── MatrizMateriales.tsx
│   │   ├── NuevoPesajeModal.tsx
│   │   └── ValidacionRecicladorModal.tsx
│   ├── pages/            # Páginas de la aplicación
│   ├── data/
│   │   └── mockData.ts   # Fuente única de datos mock (recicladores + pesajes)
│   ├── lib/
│   │   └── apiClient.ts  # Axios instance + interceptores + helpers tipados
│   ├── hooks/            # Custom hooks
│   ├── stores/           # Estado global (Zustand)
│   ├── styles/           # Estilos globales
│   ├── types/            # Tipos TypeScript
│   ├── App.tsx
│   └── main.tsx
├── public/
├── tailwind.config.js
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## Stack tecnológico

| Librería | Versión | Uso |
|----------|---------|-----|
| React | 19.2.4 | UI |
| TypeScript | 6.0.2 | Tipado |
| Vite | 8.0.4 | Bundler |
| React Router | 7.14.0 | Navegación |
| Zustand | 5.0.12 | Estado global (auth) |
| Axios | 1.15.0 | HTTP client |
| React Query | 5.99.0 | Fetching y caché |
| Tailwind CSS | 3.4.19 | Estilos |
| shadcn/ui | — | Componentes UI |
| tailwindcss-animate | — | Animaciones (Dialog) |

## Estado de conexión con backend

Toda la app usa datos mock. `apiClient.ts` está listo para conectar cuando el backend habilite CORS.

| Feature | Estado | Bloqueante |
|---------|--------|------------|
| Login POST /auth/login | Pendiente | CORS backend |
| Lista recicladores | Pendiente | CORS backend |
| Registrar pesaje | Pendiente | Endpoint /api/v1/pesajes |
| Validar reciclador | Pendiente | Endpoint /api/v1/users/{id}/verify |
| Exportar CSV | Funcional | 100% client-side |

Para conectar, reemplazar en `Recicladores.tsx` y `Pesajes.tsx`:

```typescript
// Antes (mock):
await new Promise((r) => setTimeout(r, 800))
return MOCK_RECICLADORES

// Después (real):
const { data } = await recicladoresApi.list()
return data
```

## Guía de Estilo

Ver [docs/CODE_STYLE.md](../docs/CODE_STYLE.md).

## Licencia

Privado — Somos R
