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

## Status

Scaffolding only: tooling, CI, UI primitives, theme, error handling and a placeholder page. Next, in separate PRs: HTTP client and session (`/admin/auth/*`), sign-in with TOTP enrollment/verification, layout and guards, then the modules (users first; applications, catalogs and audit when the backend exposes them).
