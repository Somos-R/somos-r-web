# 📐 Guía de Estilo — Somos R

Convenciones de código para Frontend (TypeScript) y Backend (Python).  
Objetivo: código consistente, code reviews enfocados en lógica, no en formato.

---

## 1. Naming Conventions

### Frontend — TypeScript

| Elemento | Convención | Ejemplo |
|----------|-----------|---------|
| Variables y funciones | `camelCase` | `pesoTotal`, `calcularDistancia()` |
| Componentes React | `PascalCase` | `PesajeForm`, `LoginPage` |
| Interfaces y Types | `PascalCase` | `Usuario`, `ApiResponse` |
| Constantes | `UPPER_SNAKE_CASE` | `MAX_PESO_KG`, `API_URL` |
| Archivos componentes | `PascalCase.tsx` | `PesajeForm.tsx` |
| Archivos hooks/utils | `camelCase.ts` | `useAuth.ts`, `apiClient.ts` |
| Archivos de tipos | `camelCase.types.ts` | `auth.types.ts` |

### Backend — Python (FastAPI)

| Elemento | Convención | Ejemplo |
|----------|-----------|---------|
| Variables y funciones | `snake_case` | `peso_total`, `calcular_distancia()` |
| Clases | `PascalCase` | `PesajeService`, `RecicladorRepository` |
| Constantes | `UPPER_SNAKE_CASE` | `MAX_PESO_KG` |
| Archivos | `snake_case.py` | `pesaje_service.py` |

---

## 2. Commits — Conventional Commits

**Formato:** `tipo(scope): descripción en minúscula`

| Tipo | Cuándo |
|------|--------|
| `feat` | Nueva funcionalidad |
| `fix` | Corrección de bug |
| `docs` | Solo documentación |
| `refactor` | Cambio sin nueva feature ni bug |
| `test` | Tests nuevos o modificados |
| `chore` | Configs, dependencias, CI |

**Ejemplos:**
```
feat(auth): agregar endpoint de registro de reciclador
fix(pesaje): corregir cálculo de peso con decimales
docs(readme): actualizar instrucciones de instalación
chore(deps): actualizar React Query a 5.99
```

---

## 3. Branch Strategy

```
main       → producción
develop    → integración / staging
feature/*  → nueva funcionalidad (sale de develop)
fix/*      → corrección de bug (sale de develop)
```

**Flujo:**
```bash
git checkout develop && git pull
git checkout -b feature/nombre-feature
# trabajar y commitear...
git push origin feature/nombre-feature
# abrir Pull Request → develop
```

---

## 4. Estructura de Archivos

### Frontend (somos-r-web)

```
src/
├── features/          # Un módulo por dominio
│   ├── auth/
│   │   ├── LoginPage.tsx
│   │   ├── RegisterForm.tsx
│   │   └── useAuth.ts
│   └── pesaje/
│       ├── PesajeForm.tsx
│       └── usePesaje.ts
├── shared/
│   └── components/    # Button, Input, Card (reutilizables)
├── lib/
│   ├── apiClient.ts   # Instancia Axios
│   └── queryClient.ts # React Query config
└── types/
    └── auth.types.ts  # Interfaces compartidas
```

> Ver [src/types/auth.types.ts](../somos-r-web/src/types/auth.types.ts) para las interfaces de usuarios.

### Mobile (somos-r-mobile)

```
app/
├── (tabs)/            # Pantallas con tab navigation
│   ├── index.tsx
│   └── _layout.tsx
├── features/          # Módulos por dominio (se agrega en Sprint 3+)
└── types/
    └── auth.types.ts  # Mismo esquema que web
```

### Backend (somos-r-backend — Sprint 3)

```
app/
├── api/v1/            # Endpoints REST
├── models/            # Modelos de base de datos
├── schemas/           # Validación de entrada/salida (Pydantic)
├── services/          # Lógica de negocio
├── repositories/      # Acceso a base de datos
└── core/              # Configuración global
```

---

## 5. ESLint y Prettier

Ya configurados en ambos proyectos. Ver `.prettierrc` y `eslint.config.js`.

```bash
pnpm lint     # Detecta errores
pnpm format   # Formatea automáticamente
```

**Reglas clave:**
- `no-console: warn` — recordatorio para remover logs antes de merge
- `no-unused-vars: error` — no dejar variables muertas
- `react-hooks/exhaustive-deps: warn` — dependencias correctas en `useEffect`

---

## 6. Checklist antes de abrir un PR

```
[ ] pnpm lint pasa sin errores
[ ] Branch con nombre correcto (feature/* o fix/*)
[ ] Commits con formato convencional
[ ] Sin console.log (excepto debug temporal)
[ ] Descripción del PR explica qué cambió y por qué
```

---

> Para más contexto sobre el stack y setup del proyecto, ver [SETUP_GUIDE.md](../SETUP_GUIDE.md).
