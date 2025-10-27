# Front-End Integration Plan

Now that the API skeleton exists, the Vuexy front-end needs to source data from it.  
This document details the changes required per module.

## 1. Shared HTTP Client
* Create a thin wrapper around `fetch`/`ofetch` that injects:
  - `Authorization` header (once auth is implemented).
  - `X-Tenant-Id` (temporary until session-based context is delivered).
* Handle JSON responses, errors, and automatic retries for idempotent requests.

## 2. Pinia Stores

| Store | Action | API Mapping | Notes |
|-------|--------|-------------|-------|
| `catalogStore` | `fetchCatalog()` | `GET /api/catalog?includeVariants=true&includeSurfaces=true` | Merge global + tenant results; cache by tenant. |
| `editorStore` | `saveDesign()` | `POST /api/designs` | Persist snapshot after autosave. Store returned `id` for subsequent `PATCH`. |
| `editorStore` | `updateDesign()` | `PATCH /api/designs/:id` | Trigger on every snapshot debounce. |
| `gangSheetStore` | `createSheet()` | `POST /api/gang-sheets` | Push gang sheet payload (utilization, preview). |
| `gangSheetStore` | `listSheets()` | `GET /api/gang-sheets` | Populate sidebar with server state. |
| `pricingStore` (new) | `quote()` | `POST /api/pricing/quote` | Replace local heuristics with server calculation. |

Each store should surface request state (`loading`, `error`) to the UI for toasts/spinners.

## 3. Admin Consoles
* **Super Admin** – add pages that call future endpoints (`/api/tenants`, `/api/plans`, `/api/suppliers`). For now, wire catalog & template management to `POST/PUT /api/catalog/...` once implemented.
* **Merchant Admin** – enable CRUD modals that call catalog/design endpoints above. Provide optimistic updates, fallback to refetch on failure.

## 4. Authentication Hooks
* After auth is integrated, store the active tenant & user metadata in a global Pinia store.  
* Update the HTTP client to attach tokens/cookies so API guards can validate role permissions.

## 5. Development Workflow
1. Start API locally: `npm run api:dev` (port 4000).  
2. Run front-end: `npm run dev`.  
3. Configure Vite proxy to forward `/api` to `http://localhost:4000` (add to `vite.config.ts`).  
4. Update `.env` / Vite env with `VITE_API_BASE_URL` if direct fetch is preferred.

## 6. Testing
* Add MSW handlers that mock the new endpoints for component tests.  
* For integration tests, spin up a test database and run migrations prior to executing Playwright/Cypress suites.

## 7. Current Wiring
* `catalogStore.ensureLoaded()` now calls `GET /api/catalog` and falls back to the seed dataset on failure, normalising surface dimensions client-side.
* `editorStore.persistDesign()` sends design snapshots to `POST /api/designs` (or `PATCH /api/designs/:id`) and `addToCart()` reuses the saved preview.
* `gangSheetStore.ensureLoaded()` hydrates gang sheets from `GET /api/gang-sheets`, with `createSheet`/`syncSheet` persisting via the corresponding POST/PATCH endpoints.
* UI panels surface loading/error states so merchants understand when the app is working offline.

Following this plan will remove the temporary in-memory data stores and align the UI with real tenant-aware data.
