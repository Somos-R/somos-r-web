# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git workflow — read this first

`main` is protected: it only moves forward through a merged pull request, never a direct push.

- **Never commit directly on `main`.** Before starting any change — including a quick fix — create or switch to a branch (`feature/<slug>`, `fix/<slug>`, `chore/<slug>`).
- **Commit as you go.** Don't let a session end with unstaged or uncommitted changes sitting in the working tree "to commit later." If the work isn't finished, commit it as WIP on the branch anyway — an uncommitted working tree is not a save point.
- **Push and open a PR** once there's something worth reviewing, rather than leaving finished work local-only. A draft PR is fine if it's still in progress.
- **Pull requests are ALWAYS written in Spanish**: the title and the whole description (what it does, what to review, how it was verified), in every PR you open or edit, whoever you are (human or agent). Code, identifiers, file names and code comments stay in English (see Code Rules). If you find a PR in English, rewrite it.
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

`App.tsx` reads `isAuthenticated` from `useAuth()` (a session exists) and shows a loader until the user profile arrives, because roles come from the server. Authenticated routes render inside `DashboardLayout` (Sidebar + Header + `<Outlet />`). Unauthenticated requests redirect to `/login`. Routes come from `APP_ROUTES` in `src/routes.tsx` (one list feeds both the router and the sidebar); each one is wrapped in `<RequirePermission>`, which shows a 403 screen (or redirects `/` to the user's first allowed page). Public routes (`/login`, `/forgot-password`, `/activate`, `/reset-password`, `/verify-email`, `/solicitud`) sit outside the session gate.

### State layers

| Concern | Tool |
|---|---|
| Session (access + refresh tokens) | `src/lib/session.ts` — plain module with `subscribe`, no state library |
| Auth (user profile) | React Query, key `['me']`, read through `useAuth()` in `src/hooks/useAuth.ts` |
| Permission checks | `useRoles().can('weighings.review')` — ask for a capability, never compare `user.role`. The list of capabilities comes from the server: `GET /auth/me` returns `capabilities` (evaluated with the same rule that protects the endpoints), stored on the profile (`user.capabilities`). `src/lib/permissions.ts` only maps screen-level permissions onto them (`dashboard.view` = `weighings.view`, etc.). To gate something new, the backend must expose the capability first. It only decides what the UI shows: the backend enforces every rule and answers 403 |
| Server data | TanStack React Query — `useQuery` / `useMutation` |
| API calls | Axios — `apiClient` in `src/lib/apiClient.ts` |

`apiClient` injects `Authorization: Bearer <token>` from `lib/session`. Access tokens are short-lived (30 minutes today, set by the backend): on a 401 it refreshes once (`lib/tokenRefresh.ts`, single-flight across requests and tabs, because the backend revokes the whole session if a rotated refresh token is reused) and replays the request. If the refresh is rejected the session is cleared and the router sends the user to `/login`. Auth endpoints pass `skipAuthRefresh: true`.

`queryClient` lives in `src/lib/queryClient.ts` (default `staleTime` 30 s, no retries on 4xx) and is wiped whenever the session ends (logout, rejected refresh, logout in another tab).

The backend base URL is the `VITE_API_URL` env var (default `http://localhost:8000` in development only). A production build **refuses to build** without a real `https` URL, or with one pointing at localhost (`config/buildEnv.ts`, wired in `vite.config.ts`): the value is compiled into the bundle, so a wrong one would ship to every user. To try a production build locally on purpose: `ALLOW_LOCAL_API_URL=1 pnpm build`. The Dockerfile has no default; CI passes a placeholder on pull requests (nothing is published) and requires the `VITE_API_URL` repository variable on pushes to `main`. Login, logout and profile calls live in `src/services/auth.ts`.

### Server data: `src/queries/`

Every query is defined once, in `src/queries/`, never inline in a screen (a test enforces it):
- `keys.ts`: the `queryKeys` factory. First element = resource root (`weighings`, `inventory`, `transactions`, `recyclers`, `catalogs`); keys carry every input of the request. Catalogs have their own root so refreshing inventory never refetches materials.
- `<resource>.ts`: `queryOptions` factories (`weighingsQueries.list(filters)`, `catalogQueries.materials()`...). Screens do `useQuery(weighingsQueries.stats())`, or `useQuery({ ...catalogQueries.materials(), enabled: open })` to override.
- `config.ts`: `STALE_TIME` per kind of data (catalogs 10 min, document types never); everything else uses the 30 s default.
- `invalidation.ts`: the `AFFECTED` table says what goes stale after each action. Use it for both `onSuccess` (`invalidateAffected(queryClient, AFFECTED.weighingReviewed)`) and `meta.refreshOnError: AFFECTED.weighingReviewed`. A new action = a new entry there, not ad-hoc `invalidateQueries` calls.

### Lists: the server paginates and filters

Never load "all" rows and filter in the browser: the API returns one page (`limit`/`offset`, at most 100) plus the `total` for the current filters. The pattern (see Weighings, Inventory, Transactions, Recyclers):
- The screen owns `usePagination()` and the filter state, sends `limit`/`offset` and the filters to the service, and calls `pagination.clamp(total)` during render (so a page that stops existing falls back to the last one).
- Changing a filter calls `pagination.resetPage()`.
- The query uses `placeholderData: keepPreviousData` (the old page stays, dimmed, while the next one loads) and puts the filters and page in its key under `queryKeys.<resource>.list(...)`, so invalidating the resource root still reloads it.
- The table is controlled: it receives the page's rows and a `PaginationProps` (`toPaginationProps(pagination, total)`); the count shown is the server `total`, never `data.length`.
- Counts and totals (dashboard, "pending" cards) come from the server: `list({ ..., limit: 1 }).total` or the stats endpoints, never from filtering a page.
- Filter options come from the catalogs (`catalogQueries.materials()/warehouses()`), not from the rows on screen.
- Text search happens on the server: `GET /users?q=` (contains, no case or accents, 2 characters minimum). The box keeps its own state and the query gets `useDebouncedValue(search.trim())` (300 ms), so it is one request per pause in typing; changing the text calls `pagination.resetPage()`. The same for weighings (`GET /weighings?q=`: name or document of whoever delivered, registered or not) and staff.

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

### ECA ↔ Association links (`/vinculaciones`)

Many-to-many, **always started by the ECA and decided by the Association**; either side can end an active link, and the ECA can cancel its own pending request. The server announces `links.view` (both organization admins), `links.request` (ECA admin) and `links.decide` (Association admin); the page picks its side from them, never from the user type.
- **ECA** (`EcaLinks`): "my links" (filter by state; a rejection shows its reason) and the **directory** of approved associations (`GET /directory/associations`, name search debounced, ignored under 2 characters), each with the state of the link. "Request" is offered only where there is no link or it was rejected/removed ("request again"); a pending or active one has nothing to ask.
- **Association** (`AssociationLinks`): the requests ECAs made (starts on *pending*, which is what needs an answer): accept, reject (optional reason of up to 200 characters that the ECA sees) and end an active link. No directory: an Association never starts a link.
- Ending a link or cancelling a request asks for confirmation. Every action reloads **links and directory** (the directory carries each link's state), reports its own result, and on failure reloads too: a refusal usually means the other side already answered (`link_not_pending`).
- The other organization is shown as a name and a city only (that is all the server gives).

### Weighings: an ECA receives material from whoever brings it

The weighing form (`RegisterWeighingDrawer` + `PersonPicker`) doesn't pick the recycler from a list: it **identifies them by document** (`GET /recyclers/lookup?document=&id_type=`; `id_type` is sent whenever the operator chose one, to avoid matches between different kinds of document). A registered recycler of *any* association (or none) shows their association and how they relate to this ECA (`affiliation`: `linked`, `unlinked_association`, `independent`), which decides whether the weighing reaches an association; a deactivated account is refused up front. If there is no such recycler (404 `recycler_not_found`) the weighing is registered as an **unregistered seller** with their name and document. The create payload has **exactly one** of `recycler_id` or `seller` (the types enforce it). Weighings, therefore, may have `recycler: null` with `seller_*` fields: never assume a recycler when rendering. The list filters by `affiliation` and searches by `q`.

### Application to join Somos R (`/solicitud`, public)

**Temporary, for testing.** The real application form will live on the Somos R website, not in this app: `somos-r-web` is only for accepted, already registered users. This page exists so the flow can be tried end to end against the backend without a login (it is not linked from the login screen). When the website takes over, remove it (route, `features/application/`, `lazyPages` entry and texts) or keep only what the website still needs; the backend endpoints (`/applications`) stay the same either way.

An organization (Association or ECA) applies without an account (`features/application/`, loaded on demand like a page). **Without a token** it starts one: type, organization name, the applicant's name and email, optional NIT and the data-treatment consent (`POST /applications`, always answered the same so nobody can tell which emails applied; the link comes by email). **With `?token=`** (the emailed link) it opens that application: `useUrlToken` removes the token from the address bar at once and it lives only in memory, so reloading needs the link again (`POST /applications/access-link` asks for another; the previous one stops working).
- The token goes in the `X-Application-Token` header of every call (`services/applications.ts`, with `skipAuthRefresh`: a 401 here is a bad link, never an expired session) and is **not** part of the query key (`applicationsQueries.current`, `gcTime: 0`).
- The server decides what can be done: `can_edit` enables the fields, `can_submit` the Send button, `missing_fields` marks what is empty. `PATCH` sends only what changed and an emptied optional field as `null`. Send is disabled while there are unsaved changes and asks for confirmation (it locks the application; first send plus two corrections).
- A bad or expired link (401 `invalid_application_link`) shows an explanation and asks for a new one.
- The consent text (`solicitud.consent.text`) is shown by the web and the backend stores its version (`APPLICATION_CONSENT_VERSION`): **if the text changes, tell the backend to bump the version**. The current wording is provisional and needs legal review.
- **Documents** (`ApplicationDocuments`): the list of documents Somos R asks for is a catalog it edits from the backoffice, so the web never fixes it: every slot (label, required or not) is drawn from `GET /applications/current/documents`. One file per document (`PUT /applications/current/documents/{code}`, multipart field `file`; uploading again replaces it and sends it back to `pending`; `DELETE` removes it); only PDF, PNG or JPG up to 5 MB, checked in the client first as a courtesy (the backend decides by the file's content). A missing required document comes in `missing_fields` as `documents:<code>` and is named with the label the server gives it; it blocks sending. Each document carries the reviewer's verdict (`status`, `review_comment`), shown when the application comes back with corrections. The backend does not let the applicant download or preview the file: only name, size and status are shown.
- Not yet: nothing on the review side lives in this app: Somos R reviews from the backoffice.

### Identity QR in the weighing form

The operator can scan the recycler's QR instead of typing the document (`QrScannerDialog`, opened from `PersonPicker`). The QR carries only a document, in this exact text: `somosr:recycler:<document type>:<document number>`, e.g. `somosr:recycler:CC:1020304050` (`lib/identityQr.ts` reads and writes it; **whoever generates the QR, the mobile app or the backend, must use it**). Scanning is the same as typing: it fills the form and calls `GET /recyclers/lookup` with that document, so a QR grants nothing by itself and the server still answers who the person is, their association, registry status and link with the ECA. A QR of another kind, or with a document type this system does not know, is reported and scanning continues; an unregistered document continues as an unregistered seller.
- The camera is read locally with `jsqr` (its own lazy chunk, ~48 KB gzipped, downloaded only when someone scans); nothing is recorded or sent. The camera is released whenever the scanner closes. Browsers only give the camera to secure pages: it works on `https` and on `localhost`, and anywhere else the dialog says so and the operator searches by document.
- If a signed token replaces the document (US-0.17, not defined yet), only `identityQr.ts` and the lookup request change.

### Staff invitations (`/personal`)

Organization admins (`staff.view` / `staff.invite`, announced by the server) see the people of their own organization and invite more: `POST /users/invitations` creates the account **without a password** and emails a one-time link (48 h) that opens `/activate` (`SetPasswordPage`). Nobody types another person's password. `pending_activation` marks people who were invited and haven't chosen one yet: only they get "resend invitation". Admins also **deactivate and reactivate** their people (`staff.manage`, `PATCH /users/{id}/status {is_active, reason?}`): deactivating asks for confirmation with an optional reason (200 characters) and ends the person's sessions; reactivating is one step; nobody gets the action on their own row (`cannot_change_own_status`), and a failure reloads the list (the person was probably changed by someone else). The role selector only offers the roles of the admin's own organization (`user_type_code` in `GET /catalogs/roles`); the server rejects the rest with `invalid_role`.

## UI Component System

All reusable primitives live in `src/components/ui/` and are exported from `index.ts`. Every component is a thin, typed wrapper around MUI — never import from `@mui/material` directly inside feature code; always go through `src/components/ui/`.

Available primitives: `Button`, `Checkbox`, `Input`, `Select`, `Dialog`/`DialogTitle`/`DialogContent`/`DialogActions`, `FormDrawer`, `Badge`, `Card`/`CardContent`/`CardHeader`, `Table`/`TableHead`/`TableBody`/`TableRow`/`TableCell`/`TableContainer`/`TablePagination`, `Alert`, `Snackbar`.

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

**Coverage is enforced in CI** (`vitest run --coverage`, floors in `vitest.config.ts`: overall, `features/`, `components/ui/`, `lib/`). Feature behaviour is tested through the whole app (`src/__tests__/App.*.test.tsx`, with the fake axios adapter, not MSW), so interceptors, permissions and the query layer run for real. If CI reports a threshold failure, add tests; raise the floors as coverage grows, never lower them to pass.

## End-to-end tests

`e2e/` holds Playwright tests that drive the **production build** in a real browser (`pnpm test:e2e`; first time: `pnpm exec playwright install chromium`). The build is made with a fake API URL and every request is answered at the network level by `e2e/fakeApi.ts`, a small stateful stand-in (a recycler verified in one step is verified in the next), so no backend is needed. It covers what unit tests can't: the real bundle, lazy chunks, router, session in localStorage and the flow across screens (Association verifies a recycler → ECA registers a weighing → validates it), and the unregistered-seller weighing. Add a flow here when a change crosses screens; keep single-screen behaviour in Vitest. The fake API only mirrors the contract the app uses: when the backend contract changes, update it together with `src/test/fakeApi.tsx`. A test against a real ephemeral backend is a later step (needs the backend repo in CI and a seed script).

## Accessibility

Every screen and overlay is checked with axe-core in `src/__tests__/a11y.test.tsx` (runs in CI with the rest of the tests), and keyboard/focus behaviour in `src/__tests__/keyboard.test.tsx`. **A new screen, dialog or drawer must be added to `a11y.test.tsx`** (the shared fake API is in `src/test/fakeApi.tsx`). Whole-page renders also enforce one `<h1>`, a `<main>` and content inside landmarks; jsdom can't check color contrast, so review that by eye. The rules that keep it passing:
- Icon-only buttons need an `aria-label`; a spinner is `<Loader />` (named), never a bare `CircularProgress`.
- A select or field without a visible label needs an `aria-label` (`inputProps={{ 'aria-label': ... }}`); an icon-only table header cell gets `visuallyHidden` text (`lib/a11y.ts`).
- Heading outline: the page title is `component="h1"`, sections/dialog titles are `h2`; numbers in stat cards are `p`, not headings.
- Menu entries are real links (`RouterLink`) with `aria-current="page"`. Public screens render inside `<main>` (`AuthShell`).
- `DashboardLayout` gives keyboard users a "skip to content" link, sets the tab title per screen and moves focus to the content on navigation (not on first load).

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

**A test enforces this** (`src/__tests__/noHardcodedText.test.ts`): it scans the source and fails, listing file and line, if it finds Spanish written directly in JSX text, text-like props (`label`, `title`, `placeholder`, `helperText`…), `message:` properties, `setXxxError('...')` calls, strings rendered from a ternary in JSX (`{busy ? 'Guardando' : 'Guardar'}`), or any string with accents or Spanish function words. Move the text to `es.json` and read it through `t`. Repeated words like "Cancelar", "Acciones", "Bodega" live in `t.common`.

When adding new screens or UI text:
1. Add the string to the correct section in `es.json` (or create a new section for a new feature).
2. Reference it via `t.<section>.<key>` — never inline the string in the component.

## Code Rules

- **All identifiers, variable names, comments, and file/folder names must be in English.** This includes feature folders (`recyclers/`, `inventory/`), component files (`RecyclersTable.tsx`), service files (`recyclers.ts`), and exported types (`Recycler`, `InventoryItem`). User-visible strings (labels, messages, placeholders) are the only exception — those go in `es.json`.
- Any new or modified `src/components/ui/` component requires a unit test.
- Use `FormDrawer` for all forms — do not build one-off inline form UIs in feature components.
- **The API contract is in English** (`status`, `price_per_kg`, `occurred_at`, `pending_validation`, `purchase`, material codes like `plastic`). Catalog codes are stable English; the Spanish text shown to users comes from `es.json` (statuses) or from the API's own `label` (materials, warehouses). Never hardcode a material list: read it from `GET /inventory/materials`, and look statuses up with `getStatusStyle` / colors with `getMaterialColor` (`src/lib/catalog.ts`) so a value this build doesn't know yet renders as its raw code instead of crashing.
- Permission checks go through `useRoles().can(...)`. To gate something new, add the capability's name to `ServerPermission` in `src/lib/permissions.ts` (once the backend announces it in `/auth/me`), give it to the roles in `src/test/capabilities.ts` (transcribed from the backend) and add a row to the matrix test in `src/lib/__tests__/permissions.test.ts`. Hide actions by not passing their handler / not rendering the button, as the pages already do.
