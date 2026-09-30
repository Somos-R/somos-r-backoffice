# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## What this is

The **Somos R backoffice**: the administration app for Somos R's own staff (reviewing organization applications, managing users and catalogs, audit log). It is a separate app from the ECA/Association portal (`somos-r-web`), with its own domain, bundle and token audience (`aud=backoffice`), so no administration code ships to customers' browsers. It talks to the backend's `/admin/*` API (mandatory TOTP second factor).

It **copies the architecture and conventions of `somos-r-web`** (React 19 + TypeScript, Vite, MUI v6, React Query, Axios, pnpm, Vitest, axe). Files were copied, not shared through a package, on purpose: each app evolves on its own. When a convention changes in one, decide whether the other follows; nothing keeps them in sync automatically.

## Git workflow — read this first

`main` is protected: it only moves forward through a merged pull request, never a direct push (the very first commit of the repo was the only exception).

- **Never commit directly on `main`.** Before any change, create or switch to a branch (`feature/<slug>`, `fix/<slug>`, `chore/<slug>`).
- **Commit as you go**; don't leave work sitting uncommitted.
- **Push and open a PR** once there's something worth reviewing (a draft is fine while in progress).
- One PR per task, always branched from an up-to-date `main`. Never stack PRs.

## Commands

```bash
pnpm dev                 # Vite dev server
pnpm build               # tsc -b + vite build (needs VITE_API_URL, see below)
pnpm lint
pnpm test                # Vitest (watch)
pnpm test:coverage       # what CI runs; floors in vitest.config.ts
pnpm check:bundle        # after a build: size budget from package.json (bundleBudget)
```

The API URL is `VITE_API_URL`. A production build refuses to build without a real `https` URL (`config/buildEnv.ts`); to try one locally: `ALLOW_LOCAL_API_URL=1 pnpm build`. CI passes a placeholder on pull requests.

## Conventions (same as somos-r-web)

- **All identifiers, comments and file names in English.** User-visible text is Spanish and lives only in `src/assets/i18n/es.json`, read through `t` (`src/lib/i18n.ts`). A test (`noHardcodedText.test.ts`) fails on Spanish written in code.
- **UI primitives**: everything visual goes through `src/components/ui/` (thin typed wrappers of MUI; never import `@mui/material` in feature code). A new or changed primitive needs a test in `__tests__/`. Forms use `FormDrawer`.
- **Accessibility**: axe runs in tests; icon-only buttons need an `aria-label`, one `<h1>` per page, page titles are `h1` and sections `h2`. New screens are added to the axe test.
- **Pages are lazy** and each is its own chunk; CI enforces the bundle budget.
- **Server data**: React Query, with keys, options and invalidation defined once under `src/queries/` (never inline in screens).
- **Errors** are reported once, globally, and unexpected ones go through `lib/reportError.ts`.
- **Permissions** come from the server: the backoffice asks `GET /admin/me` for `capabilities` and only shows what they allow. The UI only hides things: the backend enforces every rule and answers 403.

## HTTP, session and errors

- `apiClient` (`src/lib/apiClient.ts`) injects `Authorization: Bearer <token>` from `lib/session` (a plain module with `subscribe`, tokens under `backoffice_*` keys) and has a 15 s timeout. Read calls in `src/services/` take a last `options?: RequestOptions` and every `queryFn` forwards React Query's `signal`.
- On a 401 it refreshes once against **`/admin/auth/refresh`** (`lib/tokenRefresh.ts`) and replays the request. The refresh is single-flight across requests and tabs (Web Locks) because the backend rotates refresh tokens and revokes the whole session if an old one is reused. If the refresh is rejected the session is cleared. Auth endpoints pass `skipAuthRefresh: true`.
- `queryClient` (`src/lib/queryClient.ts`) reports failures once, globally, through `lib/notifier.ts` and `<NotificationHost />`: a new mutation needs no `onError`. Opt out with `meta: { silent: true }`; `meta: { refreshOnError: [...] }` reloads keys when an action fails. It is wiped when the session ends.
- Error text comes from the backend's stable `code` first (`t.apiErrors` in `es.json`), then its `detail`, then the caller's fallback (`getApiErrorMessage`). When the backend adds a code, add it to `es.json` and to `src/lib/__tests__/apiErrorCodes.test.ts`.

## Sign-in (two factors)

The backend's `/admin/auth/*` flow, in `features/auth/` (`LoginPage` is a small state machine of steps):
1. **Password** (`POST /admin/auth/login`) answers with a short-lived `mfa_token` and `mfa_status`.
2. **`code_required`** → the authenticator's 6-digit code, or (switching mode) one recovery code (`/admin/auth/mfa/verify`). **`enrollment_required`** (the account's first sign-in) → `EnrollStep`: QR + manual key (`/mfa/enroll`, asked **once** by `LoginPage`, never from an effect: two calls would give two different secrets), then the confirmation code (`/mfa/enroll/confirm`).
3. Enrollment returns **recovery codes, shown once** (`SaveCodesStep`). The tokens are held in component state and the session only opens (`useAuth().signIn`) after the person ticks "I saved them", so a screen change can't lose the codes.
4. `mfa_session_expired` at any step sends the person back to the password with a notice. Wrong password/code show the translated backend `code`.

The profile comes from `GET /admin/me` (`useAuth().user`, React Query key `['me']`); its `capabilities` drive `useRoles().can(...)`, the menu and the route guards (`RequirePermission`). To gate a new screen, add its capability to `ServerPermission` in `src/lib/permissions.ts` (the backend announces it in `/admin/me`) and to the route in `src/routes.tsx`. Tokens are kept in localStorage for now (same open decision as the web's FD1). The backend only answers `/admin/*` from allowed networks (`admin_network_denied`).

The QR library (`qrcode.react`) is lazy-loaded with the enrollment step, so it isn't in the first download. `Checkbox` and the extended `Input` (autofill/keyboard hints) are UI primitives with tests. Test fakes: `src/test/fakeAdminApi.tsx`.

## Users module (`/usuarios`, capability `users.manage`)

`features/users/`: list, detail dialog and actions over the backend's `/admin/users`.
- **List**: text search (`q`, debounced, ignored under 2 characters), filter by account type and by state (`active` / `inactive` / `locked` / `pending` map to `is_active`, `locked`, `pending_activation`), server pagination. An account can be in several states at once (`statusesOf`).
- **Detail** (`GET /admin/users/{id}`): the server **audits every open**, so it is fetched each time (`staleTime: 0`). Actions: deactivate (optional reason; also ends every session)/reactivate, unlock, sign out everywhere, resend invitation (only when `pending_activation`), change role (only ECA/Association staff, only roles of their own type from `GET /catalogs/roles`). Deactivating and reactivating ask for confirmation; the caller's own account can't be deactivated (the server refuses too: `cannot_change_own_status`). Values an action needs travel as mutation variables, never read from state the dialog clears right after (a bug the tests caught).
- Not built yet: assigning an organization to staff that has none (`PUT /admin/users/{id}/organization`): it needs an organization picker, which comes with the applications module.

## Status

Tooling, CI, UI primitives, HTTP client, session and refresh, global error handling, two-factor sign-in (TOTP, enrollment with QR, recovery codes), layout with menu and guards by capability, a home screen and the users module. Next, one PR each: applications, catalogs and audit when the backend exposes them (the audit endpoints and organizations picker first) (users first; applications, catalogs and audit when the backend exposes them).
