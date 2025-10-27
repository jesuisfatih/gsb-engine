# CRUD Extensions: Catalog & Gang Sheets + Autosave Requirements

## Catalog Management
### API
- `GET /api/catalog/:id` – single product with surfaces/variants.
- `POST /api/catalog` – create new product (tenant-scoped); validates surfaces.
- `PATCH /api/catalog/:id` – update metadata, add/remove surfaces.
- `DELETE /api/catalog/:id` – soft delete (archive flag).
- `POST /api/catalog/:id/surfaces` – create surface.
- `PATCH /api/catalog/:id/surfaces/:surfaceId` – update surface metrics.
- `DELETE /api/catalog/:id/surfaces/:surfaceId` – remove surface.

Add Prisma access control to ensure super admins touch global entries (`tenantId null`) while merchants mutate their own.

### Front-End
- Update `catalogStore` actions to call the new endpoints (create/update/delete).
- Provide optimistic UI with rollback on failure.
- Surface toast notifications for operations (success/error).

## Gang Sheet Manager
### API
- `DELETE /api/gang-sheets/:id` – remove sheet (with cascading `gang_sheet_items`).
- `POST /api/gang-sheets/:id/items` – add item (design placement).
- `PATCH /api/gang-sheets/:id/items/:itemId` – update quantity/position.
- `DELETE /api/gang-sheets/:id/items/:itemId`.

Autosave: `PATCH /api/gang-sheets/:id` already exists; ensure it accepts `status`, `quantity`, `supplier`.

### Front-End
- `gangSheetStore` to call delete/item endpoints.
- Confirm dialogs before destructive actions; toast feedback.
- Auto-save stage snapshot when utilization or layout changes (debounced).

## Autosave & Draft Modules
- Introduce `AutoSaveManager` composable that:
  - Watches editor changes.
  - Debounces `editorStore.persistDesign`.
  - Reports saving state to UI.
- Add draft state column (`DesignDocument.status = DRAFT`) and treat unsaved new designs as drafts until explicitly submitted.
- For gang sheets, mark `status = Draft` until final submission; autosave should keep snapshot + layout current.

Next steps: implement these routes in Express, update Prisma schema if needed (`gang_sheet_items` table currently stores placements), and refactor Pinia stores to use new methods.
