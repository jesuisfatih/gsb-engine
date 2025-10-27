# Draft & Autosave Flow (Design + Gang Sheet)

## Schema Additions
- `DesignDocument`:
  - `status` already exists; use `DRAFT`, `SUBMITTED`, `APPROVED`.
  - Add `autosaveSnapshot` JSONB (optional) or reuse `snapshot` + `updatedAt`.
  - Add `autosaveAt TIMESTAMPTZ`.
- `GangSheet`:
  - Add `autosaveSnapshot JSONB`, `autosaveAt TIMESTAMPTZ`.
  - Ensure `status` column reflects workflow (`Draft`, `Ready`, `Locked`).

## API Updates
- `PATCH /api/designs/:id` accepts `{ autosave: true }` flag to distinguish auto-save vs manual save.  
  - Auto-save updates `autosaveSnapshot` + `autosaveAt` but leaves `status` = `DRAFT`.
  - Manual save (submit) copies autosave snapshot into canonical `snapshot`, bumps `status`.
- `PATCH /api/gang-sheets/:id` similarly handles `{ autosave: true }`.
- `GET /api/designs/:id` returns both canonical snapshot and latest autosave to allow resume prompts.
- Add `POST /api/designs/:id/submit` to transition to `SUBMITTED`.

## Front-End
### Editor (DTF)
- Debounced `persistDesign({ autosave: true })` called every N seconds or on significant changes.
- On load, if `autosaveAt > updatedAt`, prompt user to resume autosave or discard.
- Provide manual “Submit design” button that calls `POST /api/designs/:id/submit`.

### Gang Sheet Panel
- Watch `gangSheetStore` placements/utilisation. After each change, call `syncSheet` with `autosave: true`.
- Add banner if autosave differs from committed snapshot and allow “Publish layout”.

## UX Notes
- Show `Saving…` indicator during autosave; once complete, display “Saved at HH:MM”.
- When offline API fails, keep local autosave queue and retry.

With these changes, both DTF designs and gang sheets maintain draft state safely with server-side persistence.
