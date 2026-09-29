# Somos R — Portal Web

Portal de gestión para ECAs y Asociaciones de reciclaje: recicladores, pesajes, inventario y transacciones.

Este repositorio es solo el portal web. La app móvil (`somos-r-mobile`) y el backend (`backend`) son proyectos aparte. El backoffice de Somos R también será una aplicación aparte.

**Stack:** React 19 · TypeScript · Vite · Material UI · React Router · TanStack Query · Axios

## Puesta en marcha

Requiere Node 20+ y pnpm (se activa con Corepack: `corepack enable`).

```bash
pnpm install
echo "VITE_API_URL=http://localhost:8000" > .env.local   # opcional: es el valor por defecto
pnpm dev                     # http://localhost:5173
```

`VITE_API_URL` es la URL del backend. En desarrollo el valor por defecto es `http://localhost:8000`; un **build de producción exige** una URL `https` real y falla si falta o apunta a `localhost` (se compila dentro del JavaScript, así que un valor equivocado llegaría a todos los usuarios). Para probar un build de producción en tu máquina a propósito: `ALLOW_LOCAL_API_URL=1 pnpm build`. En Docker se pasa con `--build-arg VITE_API_URL=...`; en el CI sale de la variable del repositorio `VITE_API_URL`.

## Comandos

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` | Typecheck y build de producción |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest en modo watch (`pnpm exec vitest run` para una sola pasada) |
| `pnpm test:coverage` | Cobertura |
| `pnpm check:bundle` | Comprueba el tamaño del bundle contra el presupuesto (tras `pnpm build`) |

## Documentación para desarrollar

La arquitectura, las convenciones (permisos por rol, manejo de errores, contrato de la API en inglés, i18n, tests) y el flujo de trabajo con Git están en [`CLAUDE.md`](./CLAUDE.md). `main` está protegida: los cambios entran por Pull Request.
