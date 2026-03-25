# Database Schema — Black Falcon МЦ Accounting System

PostgreSQL 13+. All primary keys are UUIDs generated with `gen_random_uuid()`.
Every table carries `created_at`, `updated_at` (auto-maintained by trigger), and a
`version` counter for optimistic-locking / sync conflict detection.
Soft-delete tables expose a `deleted_at` timestamp; all relevant indexes filter on
`WHERE deleted_at IS NULL`.

---

## Table Overview

| Table | Purpose |
|---|---|
| `users` | Accounts with roles; each user owns a warehouse |
| `donors` | Donation sources for reporting |
| `item_groups` | Per-user hierarchical category tree (max 4 levels) |
| `items` | МЦ inventory, scoped to a warehouse (user) |
| `operations` | Immutable audit log of all item movements |
| `kit_templates` | Reusable bill-of-materials definitions |
| `kit_template_items` | Line items within a template |
| `kits` | Kit instances assembled from items |
| `kit_items` | Items attached to a specific kit |
| `sync_queue` | Offline-first sync buffer for mobile clients |

---

## Enum Types

```
user_role       : admin | leader | manager
item_status     : government | volunteer
operation_type  : receipt | transfer | write_off | adjustment | return
operation_status: pending | confirmed | cancelled
kit_status      : draft | active | issued | returned | written_off
sync_operation  : insert | update | delete
sync_status     : pending | processing | completed | failed
```

---

## Table Definitions

### users

Represents every account in the system. A `manager` owns a physical warehouse;
`leader` has cross-warehouse visibility; `admin` has full access.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| email | VARCHAR(255) | UNIQUE |
| password_hash | VARCHAR(255) | bcrypt |
| name | VARCHAR(255) | |
| role | user_role | DEFAULT 'manager' |
| is_active | BOOLEAN | DEFAULT TRUE |
| metadata | JSONB | arbitrary extra fields |
| version | INTEGER | optimistic lock |
| deleted_at | TIMESTAMPTZ | soft delete |
| created_at / updated_at | TIMESTAMPTZ | auto |

Indexes: `email`, `role`, `is_active` (all filtered on `deleted_at IS NULL`).

---

### donors

Tracks who donated items, used for reporting and traceability.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| name | VARCHAR(255) | |
| contact_info | JSONB | email, phone, website, etc. |
| notes | TEXT | |
| version | INTEGER | |
| deleted_at | TIMESTAMPTZ | soft delete |

---

### item_groups

Self-referential category tree scoped **per user** (each warehouse manager has
their own tree). Maximum depth is enforced via a CHECK constraint on `level`
(1 = root, 4 = leaf).

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users | ON DELETE CASCADE |
| parent_id | UUID FK → item_groups | NULL for root nodes |
| name | VARCHAR(255) | |
| level | SMALLINT | 1–4, enforced by CHECK |
| version | INTEGER | |
| deleted_at | TIMESTAMPTZ | |

Indexes: `user_id`, `parent_id`, `(user_id, level)`.

---

### items

Core inventory table. An item always belongs to one warehouse (`user_id`).
`status` distinguishes state-issued gear from volunteer donations.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users | ON DELETE RESTRICT |
| group_id | UUID FK → item_groups | ON DELETE SET NULL |
| donor_id | UUID FK → donors | ON DELETE SET NULL |
| name | VARCHAR(255) | full-text indexed (Russian) |
| description | TEXT | |
| status | item_status | government / volunteer |
| quantity | NUMERIC(12,3) | ≥ 0 enforced by CHECK |
| unit | VARCHAR(50) | default 'шт' |
| serial_number | VARCHAR(255) | optional |
| barcode | VARCHAR(255) | optional |
| metadata | JSONB | GIN indexed |
| version | INTEGER | |
| deleted_at | TIMESTAMPTZ | |

Indexes: `user_id`, `group_id`, `donor_id`, `(user_id, status)`, `serial_number`
(partial), full-text on `name`, GIN on `metadata`.

---

### operations

Immutable audit log — **never update or delete rows**. Tracks every quantity
movement. `from_user_id` is NULL for receipts from external donors; `to_user_id`
is NULL for write-offs. At least one of the two must be set (CHECK constraint).

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| type | operation_type | receipt / transfer / write_off / … |
| status | operation_status | DEFAULT 'confirmed' |
| item_id | UUID FK → items | ON DELETE RESTRICT |
| from_user_id | UUID FK → users | nullable |
| to_user_id | UUID FK → users | nullable |
| performed_by | UUID FK → users | who logged the operation |
| quantity | NUMERIC(12,3) | > 0, enforced by CHECK |
| notes | TEXT | |
| document_ref | VARCHAR(255) | e.g., 'ACT-2024-001' |
| performed_at | TIMESTAMPTZ | DEFAULT NOW() |
| metadata | JSONB | |
| version | INTEGER | |

Indexes: `item_id`, `from_user_id`, `to_user_id`, `performed_by`, `type`,
`performed_at DESC`, `status` (partial, pending only).

---

### kit_templates

Reusable bill-of-materials definitions created by leaders or admins. A template
describes *what kind* of items are needed (by category or name), not specific
items from inventory.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| created_by | UUID FK → users | ON DELETE RESTRICT |
| name | VARCHAR(255) | |
| description | TEXT | |
| metadata | JSONB | |
| version | INTEGER | |
| deleted_at | TIMESTAMPTZ | |

---

### kit_template_items

Each row is one line in a kit template. `group_id` optionally ties the line to
a category in the user's item group tree.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| template_id | UUID FK → kit_templates | ON DELETE CASCADE |
| group_id | UUID FK → item_groups | ON DELETE SET NULL, nullable |
| item_name | VARCHAR(255) | human-readable description |
| quantity | NUMERIC(12,3) | > 0 |
| unit | VARCHAR(50) | |
| notes | TEXT | |

---

### kits

A kit instance assembled from actual inventory items. Optionally linked to a
`kit_template`. Scoped to the manager's warehouse via `user_id`.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users | ON DELETE RESTRICT |
| template_id | UUID FK → kit_templates | ON DELETE SET NULL, nullable |
| name | VARCHAR(255) | |
| status | kit_status | draft → active → issued / returned / written_off |
| issued_to | VARCHAR(255) | recipient name |
| issued_at | TIMESTAMPTZ | when issued |
| notes | TEXT | |
| metadata | JSONB | |
| version | INTEGER | |
| deleted_at | TIMESTAMPTZ | |

---

### kit_items

Junction table linking a kit to specific inventory items. Unique constraint on
`(kit_id, item_id)` prevents duplicate rows.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| kit_id | UUID FK → kits | ON DELETE CASCADE |
| item_id | UUID FK → items | ON DELETE RESTRICT |
| quantity | NUMERIC(12,3) | > 0 |
| notes | TEXT | |

---

### sync_queue

Mobile clients record changes locally and push entries here. The sync service
processes rows in `created_at` order and marks them `completed` or `failed`.
`client_version` is compared against the server's `version` column to detect
conflicts.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users | ON DELETE CASCADE |
| entity_type | VARCHAR(100) | 'item', 'operation', 'kit', etc. |
| entity_id | UUID | target row PK |
| operation | sync_operation | insert / update / delete |
| payload | JSONB | full or partial row data |
| client_version | INTEGER | used for conflict detection |
| status | sync_status | pending → processing → completed / failed |
| error_message | TEXT | set on failure |
| retry_count | SMALLINT | |
| processed_at | TIMESTAMPTZ | |

Indexes: `(user_id, status)` partial, `(entity_type, entity_id)`, `created_at ASC`
partial on pending.

---

## Key Design Decisions

### UUID Primary Keys
All PKs use `gen_random_uuid()` (built-in since PostgreSQL 13, no extension).
UUIDs allow mobile clients to generate IDs offline before syncing.

### Soft Deletes
Tables that support soft-delete carry `deleted_at`. All indexes and queries
filter `WHERE deleted_at IS NULL`. Hard deletes are only used internally (e.g.,
cascade on `kit_items` when a kit is hard-deleted, which never happens in
normal flow).

### Optimistic Locking (`version`)
Each sync-enabled table has an integer `version` incremented automatically by
trigger on every UPDATE. The sync service uses this to detect write conflicts:
if `client_version != server.version`, the record was changed server-side since
the client last saw it.

### Immutable Operations Log
The `operations` table is append-only by convention. Application code must
never issue UPDATE or DELETE on this table. Corrections are made by inserting
a compensating operation (e.g., an `adjustment` with a negative intent encoded
in notes).

### Per-User Item Groups
`item_groups` is scoped to `user_id`. Each warehouse manager maintains their
own category tree independently. There are no global/shared categories.

### JSONB Metadata
`metadata` JSONB columns on `users`, `items`, `operations`, `kits`, and
`kit_templates` store optional, schema-flexible attributes (e.g., item
physical properties, custom tags) without requiring schema migrations.

---

## Entity Relationship Diagram (text)

```
users ──< item_groups (self-ref parent_id)
users ──< items ──< kit_items >── kits ──> kit_templates ──< kit_template_items
users ──< operations (from/to/performed_by)
users ──< kits
users ──< sync_queue
donors ──< items
item_groups ──< items
```

---

## Migration Files

| File | Description |
|---|---|
| `migrations/001_initial_schema.sql` | Creates all tables, types, indexes, and triggers |
| `migrations/seed_test_data.sql` | Inserts representative test data (4 users, items, operations, kits) |
