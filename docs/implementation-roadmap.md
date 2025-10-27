# Implementation Roadmap

This roadmap sequences the backend and frontend work needed to activate authentication, CRUD APIs, autosave, and merchant portal features.

## Phase 1 – Foundation (Backend)
1. **Auth Middleware**
   - Implement `authRouter` (`POST /login`, `POST /refresh`, `GET /session`).
   - Add JWT verification + tenant lookup middleware; update routes to require auth.
2. **Catalog CRUD**
   - Build new Express routes per `docs/api-crud-extensions.md`.
   - Extend Prisma client with helper services (catalogService, surfaceService).
3. **Gang Sheet CRUD**
   - Add item management + delete endpoints.
   - Tie autosave payload to `autosaveSnapshot` columns (migrate schema).
4. **Design Autosave**
   - Extend `/designs` routes with `{ autosave: true }` handling and `submit`.
   - Run migrations for new columns (autosave timestamps).

## Phase 2 – Front-End Integration
1. **Global Auth Store**
   - Create Pinia store to manage user session (fetch `/api/session`).
   - Update `$api` to refresh tokens when receiving 401.
2. **Catalog Management UI**
   - Replace existing local add/update/remove with API calls.
   - Introduce toast notifications (Vuetify `v-snackbar` or custom composable).
3. **Editor Autosave**
   - Create `useAutosave` composable (debounced) hooking into `editorStore.persistDesign({ autosave: true })`.
   - Add resume prompt on load using `editorStore.designId`.
4. **Gang Sheet Autosave**
   - Auto-sync `gangSheetStore` snapshots; add publish button.
   - Reflect loading/error states (already partially done).

## Phase 3 – Merchant Portal
1. **Prototype Screens**
   - Build static Vue views for the 15 contexts (cards, tables).
   - Wire first few to live data (e.g., queue, pricing rules).
2. **Shortcode Generation**
   - API endpoint `POST /api/shortcodes` storing mapping to tenant/product/surface.
   - Provide embed instructions + analytics logging.
3. **Checkout Integration**
   - Configure proxy route to pass `designId` and line item props back to Shopify.
   - Ensure autosaved design is promoted to `SUBMITTED` before redirect.

## Phase 4 – QA & Release
1. Add unit/integration tests (MSW for front-end, Jest/Supertest for API).
2. Configure CI steps (`npm run db:migrate:deploy`, API container build).
3. Stage environment smoke tests, then production rollout.
