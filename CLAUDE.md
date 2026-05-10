# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # start dev server (Vite, http://localhost:5173)
npm run build        # tsc -b + vite build
npm run lint         # ESLint
npm run format       # Prettier over src/**
npm run test         # Vitest in watch mode
npm run test:coverage
```

Run a single test file:
```bash
npx vitest run src/components/ui/__tests__/FormDrawer.test.tsx
```

## Architecture

**Stack:** React 19 + TypeScript, Vite 8, MUI v6, React Router v7, TanStack React Query v5, Zustand, Axios.

**Path alias:** `@` → `src/` (configured in both `vite.config.ts` and `vitest.config.ts`).

### Routing and auth gate

`App.tsx` reads `token` from `useAuthStore`. Authenticated routes render inside `DashboardLayout` (Sidebar + Header + `<Outlet />`). Unauthenticated requests redirect to `/login`. There is no route guard component — the gate is the conditional `{token ? ... : ...}` in `App.tsx`.

### State layers

| Concern | Tool |
|---|---|
| Auth (user, token) | Zustand — `useAuthStore` in `src/hooks/useAuth.ts` |
| Role-based checks | `useRoles()` hook — never read `user.role` directly in components |
| Server data | TanStack React Query — `useQuery` / `useMutation` |
| API calls | Axios — `apiClient` in `src/lib/apiClient.ts` |

`apiClient` automatically injects `Authorization: Bearer <token>` from `localStorage` and redirects to `/login` on 401.

`queryClient` is exported from `src/main.tsx` and used by `useAuthStore.logout()` to clear the cache.

The backend base URL is `VITE_API_URL` env var (default `http://localhost:8000`). Auth is still mocked in `useAuthStore.login()` — replace with a real `POST /auth/login` call when the backend is ready.

### Feature structure

Each route lives in `src/features/<name>/`. A feature folder contains the page component plus any feature-specific subcomponents (tables, drawers that wrap UI primitives). Features handle data fetching and mutations; they delegate rendering to `src/components/ui/`.

## UI Component System

All reusable primitives live in `src/components/ui/` and are exported from `index.ts`. Every component is a thin, typed wrapper around MUI — never import from `@mui/material` directly inside feature code; always go through `src/components/ui/`.

Available primitives: `Button`, `Input`, `Select`, `Dialog`/`DialogTitle`/`DialogContent`/`DialogActions`, `FormDrawer`, `Badge`, `Card`/`CardContent`/`CardHeader`, `Table`/`TableHead`/`TableBody`/`TableRow`/`TableCell`/`TableContainer`/`TablePagination`, `Alert`, `Snackbar`.

The MUI theme is in `src/styles/theme.ts` (primary green `#059669`, `borderRadius: 8`, flat buttons, small outlined text fields by default).

### FormDrawer — standard pattern for data-entry forms

`FormDrawer` is a right-anchored MUI Drawer (420 px wide) that renders a form from a `fields` array. Use it for any form that registers or edits a record. The form state, validation, and password-toggle logic live inside `FormDrawer`.

```tsx
import { FormDrawer, type FormFieldDef } from '../../components/ui'

const fields: FormFieldDef[] = [
  { name: 'full_name', label: 'Full name', type: 'text', required: true },
  { name: 'email',     label: 'Email',     type: 'email', required: true,
    validate: (v) => (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? 'Invalid email' : undefined) },
  { name: 'password',  label: 'Password',  type: 'password', required: true,
    validate: (v) => (v.length < 8 ? 'Minimum 8 characters' : undefined) },
  { name: 'category',  label: 'Category',  type: 'select', required: true,
    options: [{ value: 'a', label: 'Alpha' }] },
  { name: 'phone',     label: 'Phone',     type: 'tel' },
]

<FormDrawer
  open={open}
  onClose={onClose}
  title="Register record"
  fields={fields}
  onSubmit={(values) => mutation.mutate(values)}
  isSubmitting={mutation.isPending}
  submitLabel="Register"
/>
```

**`FormFieldDef` shape:**

| Property | Type | Description |
|---|---|---|
| `name` | `string` | Key in the `values` object passed to `onSubmit` |
| `label` | `string` | Displayed label and used in the default required message |
| `type` | `'text' \| 'email' \| 'password' \| 'select' \| 'tel'` | Field type; `password` adds the eye toggle automatically |
| `placeholder` | `string?` | Optional placeholder text |
| `required` | `boolean?` | Adds `*` to the field label (via MUI), shows `"<label> is required"` on submit, and keeps the submit button disabled until the field has a value |
| `options` | `SelectOption[]?` | Required when `type === 'select'` |
| `validate` | `(value: string) => string \| undefined` | Custom validator, called after the required check passes |

**Validation order:** required check → `validate` function. An empty string on a non-required field will not trigger `validate`.

**`onSubmit` receives:** `Record<string, string>` — all field values keyed by `name`. The caller is responsible for trimming, type coercion, and API mapping (see `RegisterRecyclerDrawer.tsx` for reference).

The form resets automatically whenever `open` becomes `false`.

### Adding a new reusable component

1. Create `src/components/ui/MyComponent.tsx` wrapping MUI.
2. Export from `src/components/ui/index.ts`.
3. Add `src/components/ui/__tests__/MyComponent.test.tsx`.

## Testing

Tests use Vitest + React Testing Library (`@testing-library/react`) + `@testing-library/user-event`. The jsdom environment is pre-configured in `vitest.config.ts`; `@testing-library/jest-dom` matchers are set up in `src/test/setup.ts`.

**Rules:**
- Every new or modified file in `src/components/ui/` must have a corresponding test file in `__tests__/`.
- No `ThemeProvider` is needed in tests — MUI renders without a theme in jsdom.
- For components that call `apiClient` or `useAuthStore`, use `vi.mock`.
- Prefer `userEvent` over `fireEvent` except when bypassing CSS pointer-events (see `Button.test.tsx`).
- When a field has `required`, MUI appends ` *` to the label text. Use regex (`getByLabelText(/Label name/)`) instead of exact strings for those queries.

## Internationalization (i18n)

All user-visible strings live in `src/assets/i18n/es.json`. Never hardcode UI text in components.

```typescript
import { t, interpolate } from '../../lib/i18n'

// Static string
<Typography>{t.recicladores.title}</Typography>

// Dynamic string with variable substitution
<Typography>{interpolate(t.dashboard.greeting, { name: user.full_name })}</Typography>
```

`interpolate(template, vars)` replaces `{{key}}` placeholders. Use it whenever a string contains a variable.

When adding new screens or UI text:
1. Add the string to the correct section in `es.json` (or create a new section for a new feature).
2. Reference it via `t.<section>.<key>` — never inline the string in the component.

## Code Rules

- **All identifiers, variable names, comments, and file/folder names must be in English.** This includes feature folders (`recyclers/`, `inventory/`), component files (`RecyclersTable.tsx`), service files (`recyclers.ts`), and exported types (`Recycler`, `InventoryItem`). User-visible strings (labels, messages, placeholders) are the only exception — those go in `es.json`.
- Any new or modified `src/components/ui/` component requires a unit test.
- Use `FormDrawer` for all forms — do not build one-off inline form UIs in feature components.
- Role checks belong in `useRoles()` — extend the hook when adding new permission needs.
