# Somos R - Web

Aplicación web de Somos R construida con React 19, Vite, TypeScript y Tailwind CSS.

## Requisitos previos

- Node.js 18+ o superior
- pnpm 9+

## Instalación

```bash
# Instalar dependencias
pnpm install
```

## Desarrollo

```bash
# Iniciar servidor de desarrollo
pnpm dev
```

El servidor se ejecutará en `http://localhost:5173`

## Compilación

```bash
# Compilar para producción
pnpm build
```

Los archivos compilados se generarán en el directorio `dist/`

## Lint y formato

```bash
# Ejecutar ESLint
pnpm lint

# Formatear código
pnpm format
```

### Configuración

**ESLint** (`eslint.config.js`):
- ✓ Reglas recomendadas de JavaScript y TypeScript
- ✓ Verificación de hooks de React
- ✓ React Refresh para HMR

**Prettier** (`.prettierrc`):
- Indentación: 2 espacios
- Comillas simples
- Línea máxima: 100 caracteres
- Punto y coma al final de líneas
- Auto-formato al guardar (VSCode)

## Estructura del proyecto

```
somos-r-web/
├── src/
│   ├── components/       # Componentes reutilizables
│   ├── pages/           # Páginas de la aplicación
│   ├── hooks/           # Custom hooks
│   ├── services/        # Servicios y API calls
│   ├── stores/          # Estado global (Zustand)
│   ├── styles/          # Estilos globales
│   ├── types/           # Tipos TypeScript
│   ├── App.tsx          # Componente raíz
│   └── main.tsx         # Punto de entrada
├── public/              # Archivos estáticos
├── tailwind.config.js   # Configuración de Tailwind
├── vite.config.ts       # Configuración de Vite
├── tsconfig.json        # Configuración de TypeScript
└── package.json         # Dependencias del proyecto
```

## Stack tecnológico

- **React**: 19.2.4
- **TypeScript**: 6.0.2
- **Vite**: 8.0.4
- **React Router**: 7.14.0
- **Zustand**: 5.0.12
- **Axios**: 1.15.0
- **React Query**: 5.99.0
- **Tailwind CSS**: 3.4.19

## Guía de Estilo

Este proyecto sigue convenciones estrictas. Ver [docs/CODE_STYLE.md](../docs/CODE_STYLE.md).

**Referencia rápida:**
- Variables/funciones: `camelCase`
- Componentes: `PascalCase`
- Constantes: `UPPER_SNAKE_CASE`
- Commits: `feat(scope): descripción`
- Branches: `feature/*` o `fix/*`

## Tipos

Interfaces de usuarios y autenticación en [src/types/auth.types.ts](src/types/auth.types.ts).

## Licencia

Privado - Somos R
