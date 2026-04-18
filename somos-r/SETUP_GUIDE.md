# Guía de Setup - Somos R

Documentación de la configuración inicial del proyecto (Sprint 2).

## Estructura del Repositorio

```
somos-r/
├── somos-r-web/      # Aplicación web (React + Vite)
├── somos-r-mobile/   # Aplicación móvil (React Native + Expo)
├── .prettierrc        # Configuración Prettier compartida
└── SETUP_GUIDE.md     # Este archivo
```

## Instalación Inicial

### 1. Clonar y acceder al repositorio

```bash
git clone <repo-url>
cd somos-r
```

### 2. Instalar dependencias

```bash
pnpm install
```

## Configuración de Herramientas

### ESLint + Prettier

**Instalados en ambos proyectos:**
- ESLint 9.39.4
- Prettier 3.2.5
- TypeScript ESLint 8.58.0

**Scripts disponibles:**

```bash
# Web
cd somos-r-web
pnpm lint    # Verificar errores
pnpm format  # Formatear código

# Mobile
cd somos-r-mobile
pnpm lint    # Verificar errores
pnpm format  # Formatear código
```

**Configuración compartida** (`.prettierrc`):
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "bracketSpacing": true,
  "printWidth": 100,
  "endOfLine": "lf"
}
```

### VSCode Auto-format

**Requiere:**
- Extensión Prettier (esLonely.prettier-vscode)
- Extensión ESLint

**En `.vscode/settings.json`:**
```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

## Desarrollo

### Web

```bash
cd somos-r-web
pnpm dev
```

Servidor en `http://localhost:5173`

**Rutas disponibles:**
- `/` - Inicio
- `/community` - Comunidad
- `/profile` - Perfil
- `/messages` - Mensajes
- `/settings` - Configuración

**Stack:**
- React 19.2.4
- Vite 8.0.4
- React Router 7.14.0
- Tailwind CSS 3.4.19

### Mobile

```bash
cd somos-r-mobile
pnpm start
```

Opciones:
- Presionar `a` → Android Emulator
- Presionar `i` → iOS Simulator
- Presionar `w` → Web
- Escanear QR → Expo Go

**Stack:**
- React Native 0.81.5
- Expo 54.0.33
- Expo Router 6.0.23
- NativeWind 4.2.3

## Control de Versiones

### Rama principal
- `main` - Rama principal (versión de producción)
- `master` - Rama de desarrollo (actual)

### Commits

Seguir convención:
```
[tipo]: Descripción breve

Descripción detallada si aplica.
```

Tipos: `feat`, `fix`, `refactor`, `docs`, `style`, `test`, `chore`

## Próximos Pasos

- **Sprint 3**: Login y autenticación
- **Sprint 4**: Integración con API backend
- **Sprint 5**: Modo offline y sincronización
- **Sprint 6**: Mapas e integración geolocalización

---

**Última actualización:** 2026-04-12  
**Sprint:** 2 - Inicialización del proyecto
