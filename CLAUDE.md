# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git workflow — read this first

`main` is protected: it only moves forward through a merged pull request, never a direct push.

- **Never commit directly on `main`.** Before starting any change — including a quick fix — create or switch to a branch (`feature/<slug>`, `fix/<slug>`, `chore/<slug>`).
- **Commit as you go.** Don't let a session end with unstaged or uncommitted changes sitting in the working tree "to commit later." If the work isn't finished, commit it as WIP on the branch anyway — an uncommitted working tree is not a save point.
- **Push and open a PR** once there's something worth reviewing, rather than leaving finished work local-only. A draft PR is fine if it's still in progress.
- This applies whether the session is you (a human) or a Claude Code / agent session — no exceptions for "it's just a small change."

This isn't theoretical: this repo had ~4 months of real work (MUI migration, real API wiring) sitting uncommitted in the working tree before it finally got consolidated into PRs. Don't repeat that.

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

**Stack:** React 19 + TypeScript, Vite 8, MUI v6, React Router v7, TanStack React Query v5, Axios.

**Path alias:** `@` → `src/` (configured in both `vite.config.ts` and `vitest.config.ts`).

### Routing and auth gate

`App.tsx` reads `isAuthenticated` from `useAuth()` (a session exists) and shows a loader until the user profile arrives, because roles come from the server. Authenticated routes render inside `DashboardLayout` (Sidebar + Header + `<Outlet />`). Unauthenticated requests redirect to `/login`. Routes come from `APP_ROUTES` in `src/routes.tsx` (one list feeds both the router and the sidebar); each one is wrapped in `<RequirePermission>`, which shows a 403 screen (or redirects `/` to the user's first allowed page). Public routes (`/login`, `/forgot-password`, `/activate`, `/reset-password`, `/verify-email`) sit outside the session gate.

### State layers

| Concern | Tool |
|---|---|
| Session (access + refresh tokens) | `src/lib/session.ts` — plain module with `subscribe`, no state library |
| Auth (user profile) | React Query, key `['me']`, read through `useAuth()` in `src/hooks/useAuth.ts` |
| Permission checks | `useRoles().can('weighings.review')` — ask for a capability, never compare `user.role`. The role→permission table lives in `src/lib/permissions.ts` and mirrors the backend's `docs/matriz-permisos.md`; update both together. It only decides what the UI shows: the backend enforces every rule and answers 403 |
| Server data | TanStack React Query — `useQuery` / `useMutation` |
| API calls | Axios — `apiClient` in `src/lib/apiClient.ts` |

`apiClient` injects `Authorization: Bearer <token>` from `lib/session`. Access tokens are short-lived (30 minutes today, set by the backend): on a 401 it refreshes once (`lib/tokenRefresh.ts`, single-flight across requests and tabs, because the backend revokes the whole session if a rotated refresh token is reused) and replays the request. If the refresh is rejected the session is cleared and the router sends the user to `/login`. Auth endpoints pass `skipAuthRefresh: true`.

`queryClient` lives in `src/lib/queryClient.ts` (default `staleTime` 30 s, no retries on 4xx) and is wiped whenever the session ends (logout, rejected refresh, logout in another tab).

The backend base URL is `VITE_API_URL` env var (default `http://localhost:8000`). Login, logout and profile calls live in `src/services/auth.ts`.

### Code splitting

Pages are loaded lazily (`src/lazyPages.ts`, wired in `src/routes.tsx`), so the first download only carries the shell; each page is fetched when first opened and shows a loader meanwhile. **A new page must be added to `lazyPages.ts` with `lazy(() => import(...))`, never imported directly** (a test fails otherwise). React and the router are grouped in their own chunk in `vite.config.ts` so a release doesn't re-download them; MUI is left to split with the pages that use it, since grouping it forced parts only some pages use into the first load. CI enforces a size budget (`bundleBudget` in `package.json`, gzipped: 215 KB for the first download, 60 KB per page chunk; run `pnpm build && pnpm check:bundle` locally). If it fails, find what moved into the first load; raise the number only as a deliberate decision, never to make CI pass. If a page file can't be downloaded (new deploy, dropped connection), `ErrorScreen` asks for a reload: retrying the same import cannot succeed because React caches the failure.

### Render errors

Two `ErrorBoundary` layers (`components/layout/`): one around each page inside `DashboardLayout` (keeps the sidebar working; navigating clears it via `resetKeys`) and one around the whole app in `main.tsx` (full-screen, with a reload button). A crash shows `ErrorScreen`, never a blank page, and never the technical message outside development. Boundaries only catch errors thrown while rendering; failures in event handlers and requests go through React Query's global handling (see below). Unexpected errors are reported through `lib/reportError.ts`, the one place to connect error monitoring.

### Timeouts and cancellation

`apiClient` has a 15 s timeout (`REQUEST_TIMEOUT_MS`), so a hung server ends in an error instead of a spinner that never stops; the message says to check whether an action went through before repeating it. Read calls in `src/services/` take a last `options?: RequestOptions` argument, and every `queryFn` forwards React Query's signal (`queryFn: ({ signal }) => service.list({}, { signal })`), so leaving a screen cancels its in-flight requests. A cancelled request is never shown as an error or retried. Reads are retried by React Query (twice for network/5xx, once for a timeout, never for 4xx); writes are never retried.

### Errors from the server

Failures are reported once, globally: `queryClient` has a `QueryCache` and a `MutationCache` whose `onError` raises an app-wide notification (`lib/notifier.ts`, rendered by `<NotificationHost />`). A 5xx gets a friendly text, a 4xx shows the server's own `detail` (e.g. "the recycler is no longer verified"), 401 is left to the session layer, and a 403 also reloads the profile because the role may have changed. So **a new mutation needs no `onError`**: it just works.

The text comes from the backend's stable error `code` first (`t.apiErrors`, in `es.json`), then its `detail`, then the caller's fallback (`getApiErrorMessage`). When the backend adds a code, add it to `es.json` and to the list in `src/lib/__tests__/apiErrorCodes.test.ts`, which fails until every documented code has a translation. Validation (422) and rate limiting (429) keep their own handling because their message depends on data (which field, how long to wait).

Opt out only when the screen renders the error itself, with `meta`:
- `meta: { silent: true }` — the caller shows its own message (inline error, dialog, snackbar) or, for a query, renders the failure (like the profile).
- `meta: { refreshOnError: [['weighings']] }` — query keys to reload when the action fails, because the data on screen is probably stale (someone else validated it, stock ran out). Works together with `silent`.

A query only notifies on its first failure, never when a background refetch fails and the user already has data. After a mutation that changes other screens' data (validating a weighing moves stock and creates a purchase), invalidate those keys in `onSuccess`.

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
- For code that calls `apiClient`, prefer `mockAdapter` from `src/test/helpers.ts` (fake axios adapter) over `vi.mock`, so interceptors are exercised. Use `vi.mock` for hooks like `useAuth`.
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
- **The API contract is in English** (`status`, `price_per_kg`, `occurred_at`, `pending_validation`, `purchase`, material codes like `plastic`). Catalog codes are stable English; the Spanish text shown to users comes from `es.json` (statuses) or from the API's own `label` (materials, warehouses). Never hardcode a material list: read it from `GET /inventory/materials`, and look statuses up with `getStatusStyle` / colors with `getMaterialColor` (`src/lib/catalog.ts`) so a value this build doesn't know yet renders as its raw code instead of crashing.
- Permission checks go through `useRoles().can(...)`. To gate something new, add a `Permission` in `src/lib/permissions.ts` (with its roles) and a row to the matrix test in `src/lib/__tests__/permissions.test.ts`. Hide actions by not passing their handler / not rendering the button, as the pages already do.
