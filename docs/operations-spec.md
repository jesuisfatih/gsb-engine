# Merchant Operations Spec (Phase 3 – Group 2)

This document describes the data model and API contracts required to power the merchant-facing production dashboards:

1. Gang Sheet Batch Board
2. DTF Order Queue
3. Supplier Routing preferences
4. Audit & notification history
5. Soft-delete support for catalog assets

The goal is to have the backend ready before the merchant portal UIs are implemented.

---

## 1. Schema extensions

### 1.1 Soft delete on catalog/template assets
Add `deletedAt TIMESTAMPTZ` (nullable) to the following tables:

| Table            | Notes                                                |
|------------------|------------------------------------------------------|
| `Product`        | Filter `WHERE deletedAt IS NULL` for normal queries. |
| `Surface`        | Surface removal should set `deletedAt` and cascade.  |
| `Template`       | Past revisions stay accessible for audit.            |
| `AssetLibraryItem` | Optional for logo/font management.                  |

API impact: existing `DELETE` endpoints become soft-delete (`UPDATE ... SET deletedAt = now()`), add `?includeDeleted=true` query for admin tools. `restore` endpoints can clear `deletedAt`.

### 1.2 `DesignDocument` enrichments
Add:

- `previewUrl TEXT` (already present but ensure it is populated after submit).
- `submittedAt TIMESTAMPTZ` (nullable) – set when `/designs/:id/submit` is called.
- `sourceShortcodeHandle TEXT` (nullable) – trace storefront entry point.

### 1.3 `GangSheet` workflow
Extend with:

- `status TEXT` (`draft`, `ready`, `queued`, `in_production`, `shipped`, `archived`).
- `queuedAt`, `inProductionAt`, `shippedAt` timestamps.
- `supplierId` nullable FK to `SupplierProfile`.
- `previewUrl` (2D pack preview PNG).

### 1.4 Production jobs
`Job` already exists. Add:

- `assignedTo TEXT` (user id) nullable.
- `notes TEXT` (production comments).
- `metadata JSONB` for misc label info.
- `deletedAt TIMESTAMPTZ` for soft delete/cancelled jobs.

### 1.5 Notifications
New table `Notification`:

| Column        | Type        | Notes                                         |
|---------------|-------------|-----------------------------------------------|
| `id`          | TEXT (cuid) |                                               |
| `tenantId`    | TEXT        |                                               |
| `userId`      | TEXT        | Recipient (nullable for tenant-wide).         |
| `kind`        | TEXT        | e.g. `design_submitted`, `gangsheet_ready`.   |
| `payload`     | JSONB       | Reference info (designId, jobId, message).    |
| `isRead`      | BOOLEAN     | Default `false`.                              |
| `createdAt`   | TIMESTAMPTZ |                                               |
| `readAt`      | TIMESTAMPTZ | Nullable.                                     |

### 1.6 AuditLog enrichment
Ensure `AuditLog` contains:

- `event` (`design.submit`, `gangsheet.status_change`, `supplier.update`, etc.).
- `entity`, `entityId` (already present).
- `diff JSONB` – structured previous/new values.
- `tenantId` (already optional). Ensure indexes exist for `tenantId + createdAt`.

### 1.7 Supplier routing matrices
`SupplierProfile` already exists. Add join table:

```
model SupplierRoutingRule {
  id           String   @id @default(cuid())
  tenantId     String
  supplierId   String
  technique    String
  region       String?
  minQty       Int?     // optional thresholds
  maxQty       Int?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  tenant   Tenant          @relation(fields: [tenantId], references: [id])
  supplier SupplierProfile @relation(fields: [supplierId], references: [id])

  @@index([tenantId, technique, region])
}
```

Used to preselect supplier when job/gang sheet is created.

### 1.8 Print-ready exports
Introduce `DesignOutput` table for final artifacts:

```
model DesignOutput {
  id         String   @id @default(cuid())
  designId   String
  kind       String   // e.g. PACK_PDF, MOCKUP_2D, MOCKUP_3D
  url        String
  metadata   Json?
  createdAt  DateTime @default(now())
  tenantId   String

  design DesignDocument @relation(fields: [designId], references: [id])
  tenant Tenant         @relation(fields: [tenantId], references: [id])

  @@index([designId, kind])
}
```

Allows storing multiple previews/mockups per design.

---

## 2. API endpoints

### 2.1 Production queue / jobs

- `GET /api/jobs?status=QUEUED&technique=dtf` – list jobs with filters, include `design`, `outputs`, `assignedTo`.
- `PATCH /api/jobs/:id` – update status (`QUEUED → IN_PRODUCTION`, etc.), assign operator, add notes.
- `POST /api/jobs/:id/labels` – generate label/packing slip (returns printable PDF URL).
- `DELETE /api/jobs/:id` – soft delete (`deletedAt = now()`).

### 2.2 Gang sheet board

- `GET /api/gang-sheets?status=ready` – include utilization %, `previewUrl`, supplier info.
- `POST /api/gang-sheets/:id/status` – body `{ status, supplierId? }`, toggles timestamps (`queuedAt`, `inProductionAt`, `shippedAt`).
- `POST /api/gang-sheets/:id/preview` – generate pack preview URL from stored layout (async job).

### 2.3 Supplier routing admin

- `GET /api/suppliers/routing` – list per technique/region.
- `POST /api/suppliers/routing` – create/update rules.
- `DELETE /api/suppliers/routing/:id` – remove rule.

### 2.4 Notifications

- `GET /api/notifications?unread=true` – list latest events (filter by userId if set, fallback tenant).
- `POST /api/notifications/:id/read` – set `isRead`, `readAt`.
- Hooks: when `/designs/:id/submit` or `/gang-sheets/:id/status` called, enqueue notification + audit log entry.

### 2.5 Audit log

- `GET /api/audit?entity=DesignDocument&entityId=...` – paginated log entries.
- Search filters: `event`, `actorUserId`, date range.

### 2.6 Soft delete

- `DELETE /api/catalog/:id` – sets `deletedAt`, returns 204.
- `PATCH /api/catalog/:id/restore` – clears `deletedAt`.
- Similar for templates, surfaces.

---

## 3. Mockup & preview pipeline (backend responsibilities)

1. When `editorStore.persistDesign({ autosave: false })` is called and design is submitted:
   - Generate high-res PNG via Konva (already available synchronously).
   - Create async job for advanced renders (e.g. Cloudinary template or custom worker) and store results in `DesignOutput` with kinds `MOCKUP_2D`, `MOCKUP_3D`, `PRINT_READY_PDF`.
   - Attach `previewUrl` in `DesignDocument` for quick access.
2. Gang sheet `pack` preview:
   - After auto-pack, render layout to PNG + PDF stored under `DesignOutput` kind `GANG_SHEET_PACK` and reference via `GangSheet.previewUrl`.
3. Portal UI consumes `DesignOutput` to show thumbnails in queue cards.

---

## 4. Frontend consumption overview

### 4.1 Gang Sheet Board

`GET /api/gang-sheets?status=draft|ready|queued` returns:

```jsonc
{
  "id": "gs_123",
  "name": "Sheet #GS-120",
  "status": "ready",
  "widthIn": 22,
  "heightIn": 24,
  "utilization": 0.62,
  "previewUrl": "https://cdn/...",
  "queuedAt": "...",
  "supplier": { "id": "...", "name": "PrintHouse LA" }
}
```

### 4.2 DTF Order Queue

`GET /api/jobs?technique=dtf&status=QUEUED` returns job cards with design preview and line-item properties:

```jsonc
{
  "id": "job_45",
  "status": "QUEUED",
  "priority": 1,
  "design": {
    "id": "abc123",
    "previewUrl": "https://cdn/...",
    "submittedAt": "..."
  },
  "outputs": [
    { "kind": "PRINT_READY_PDF", "url": "https://cdn/...pdf" }
  ],
  "properties": {
    "Design ID": "abc123",
    "Technique": "DTF"
  }
}
```

### 4.3 Notifications

UI polls or subscribes to `GET /api/notifications?unread=true`, showing toast/inbox when new `isRead=false` items exist.

---

## 5. Implementation sequence for Group 2

1. Apply Prisma migrations:
   - Soft delete columns, GangSheet status fields, `DesignOutput`, `Notification`, `SupplierRoutingRule`.
2. Expose REST endpoints listed above (reusing `requireAuthMiddleware` + tenant context).
3. Update existing services (`catalogService`, `gangSheetStore`, etc.) to respect `deletedAt` and new statuses.
4. Hook editor submit flow to create `DesignOutput` and enqueue notifications/audit entries.
5. Build front-end merchant pages:
   - `merchant/gang-sheet-board.vue`
   - `merchant/dtf-queue.vue`
   - `merchant/supplier-routing.vue`
   - `merchant/audit-log.vue`
   - Notification bell/inbox component.

---

This spec ensures backend contracts are stable before the merchant portal UI work begins. Once the schema and API layers are implemented (Phase 3 – Group 2), the Vue admin screens can be built on top without revisiting core logic.
