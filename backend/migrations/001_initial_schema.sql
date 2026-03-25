-- ============================================================
-- Black Falcon МЦ Accounting System — Initial Schema
-- Migration: 001_initial_schema.sql
-- PostgreSQL 13+
-- ============================================================

BEGIN;

-- ============================================================
-- EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- gen_random_uuid()

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE user_role AS ENUM ('admin', 'leader', 'manager');
CREATE TYPE item_status AS ENUM ('government', 'volunteer');
CREATE TYPE operation_type AS ENUM ('receipt', 'transfer', 'write_off', 'adjustment', 'return');
CREATE TYPE operation_status AS ENUM ('pending', 'confirmed', 'cancelled');
CREATE TYPE kit_status AS ENUM ('draft', 'active', 'issued', 'returned', 'written_off');
CREATE TYPE sync_operation AS ENUM ('insert', 'update', 'delete');
CREATE TYPE sync_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- ============================================================
-- TABLE: users
-- Represents admins, leaders, and warehouse managers.
-- Each user owns a warehouse (items belong to their user_id).
-- ============================================================

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    name            VARCHAR(255) NOT NULL,
    role            user_role    NOT NULL DEFAULT 'manager',
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    metadata        JSONB        NOT NULL DEFAULT '{}',
    version         INTEGER      NOT NULL DEFAULT 1,
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT users_email_unique UNIQUE (email)
);

CREATE INDEX idx_users_email     ON users (email)     WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role      ON users (role)      WHERE deleted_at IS NULL;
CREATE INDEX idx_users_is_active ON users (is_active) WHERE deleted_at IS NULL;

-- ============================================================
-- TABLE: donors
-- Tracks donation sources for items and reporting.
-- ============================================================

CREATE TABLE donors (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name         VARCHAR(255) NOT NULL,
    contact_info JSONB        NOT NULL DEFAULT '{}',
    notes        TEXT,
    version      INTEGER      NOT NULL DEFAULT 1,
    deleted_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_donors_name ON donors (name) WHERE deleted_at IS NULL;

-- ============================================================
-- TABLE: item_groups
-- Hierarchical category tree, scoped per user, max 4 levels.
-- level=1 is root; level=4 is a leaf.
-- ============================================================

CREATE TABLE item_groups (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    parent_id  UUID         REFERENCES item_groups (id) ON DELETE SET NULL,
    name       VARCHAR(255) NOT NULL,
    level      SMALLINT     NOT NULL DEFAULT 1,
    version    INTEGER      NOT NULL DEFAULT 1,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT item_groups_level_range CHECK (level BETWEEN 1 AND 4)
);

CREATE INDEX idx_item_groups_user_id   ON item_groups (user_id)   WHERE deleted_at IS NULL;
CREATE INDEX idx_item_groups_parent_id ON item_groups (parent_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_item_groups_level     ON item_groups (user_id, level) WHERE deleted_at IS NULL;

-- ============================================================
-- TABLE: items
-- МЦ inventory. Each item belongs to a warehouse (user_id).
-- ============================================================

CREATE TABLE items (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID          NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    group_id      UUID          REFERENCES item_groups (id) ON DELETE SET NULL,
    donor_id      UUID          REFERENCES donors (id) ON DELETE SET NULL,
    name          VARCHAR(255)  NOT NULL,
    description   TEXT,
    status        item_status   NOT NULL DEFAULT 'volunteer',
    quantity      NUMERIC(12,3) NOT NULL DEFAULT 0,
    unit          VARCHAR(50)   NOT NULL DEFAULT 'шт',
    serial_number VARCHAR(255),
    barcode       VARCHAR(255),
    metadata      JSONB         NOT NULL DEFAULT '{}',
    version       INTEGER       NOT NULL DEFAULT 1,
    deleted_at    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT items_quantity_non_negative CHECK (quantity >= 0)
);

CREATE INDEX idx_items_user_id      ON items (user_id)      WHERE deleted_at IS NULL;
CREATE INDEX idx_items_group_id     ON items (group_id)     WHERE deleted_at IS NULL;
CREATE INDEX idx_items_donor_id     ON items (donor_id)     WHERE deleted_at IS NULL;
CREATE INDEX idx_items_status       ON items (user_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_items_serial       ON items (serial_number) WHERE serial_number IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_items_name_search  ON items USING gin (to_tsvector('russian', name));
CREATE INDEX idx_items_metadata     ON items USING gin (metadata);

-- ============================================================
-- TABLE: operations
-- Tracks all item movements: receipts, transfers, write-offs.
-- from_user_id and to_user_id are nullable to support
-- external receipts (no from) and write-offs (no to).
-- ============================================================

CREATE TABLE operations (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type           operation_type   NOT NULL,
    status         operation_status NOT NULL DEFAULT 'confirmed',
    item_id        UUID             NOT NULL REFERENCES items (id) ON DELETE RESTRICT,
    from_user_id   UUID             REFERENCES users (id) ON DELETE SET NULL,
    to_user_id     UUID             REFERENCES users (id) ON DELETE SET NULL,
    performed_by   UUID             NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    quantity       NUMERIC(12,3)    NOT NULL,
    notes          TEXT,
    document_ref   VARCHAR(255),
    performed_at   TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    metadata       JSONB            NOT NULL DEFAULT '{}',
    version        INTEGER          NOT NULL DEFAULT 1,
    created_at     TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ      NOT NULL DEFAULT NOW(),

    CONSTRAINT operations_quantity_positive CHECK (quantity > 0),
    CONSTRAINT operations_transfer_has_from_or_to CHECK (
        NOT (from_user_id IS NULL AND to_user_id IS NULL)
    )
);

CREATE INDEX idx_operations_item_id      ON operations (item_id);
CREATE INDEX idx_operations_from_user    ON operations (from_user_id) WHERE from_user_id IS NOT NULL;
CREATE INDEX idx_operations_to_user      ON operations (to_user_id)   WHERE to_user_id IS NOT NULL;
CREATE INDEX idx_operations_performed_by ON operations (performed_by);
CREATE INDEX idx_operations_type         ON operations (type);
CREATE INDEX idx_operations_performed_at ON operations (performed_at DESC);
CREATE INDEX idx_operations_status       ON operations (status)       WHERE status = 'pending';

-- ============================================================
-- TABLE: kit_templates
-- Reusable kit definitions (bill of materials templates).
-- ============================================================

CREATE TABLE kit_templates (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by  UUID         NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    metadata    JSONB        NOT NULL DEFAULT '{}',
    version     INTEGER      NOT NULL DEFAULT 1,
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_kit_templates_created_by ON kit_templates (created_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_kit_templates_name       ON kit_templates (name)        WHERE deleted_at IS NULL;

-- ============================================================
-- TABLE: kit_template_items
-- Line items within a kit template (expected components).
-- References item_groups rather than specific items so a
-- template describes what *category* of item is needed.
-- ============================================================

CREATE TABLE kit_template_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID          NOT NULL REFERENCES kit_templates (id) ON DELETE CASCADE,
    group_id    UUID          REFERENCES item_groups (id) ON DELETE SET NULL,
    item_name   VARCHAR(255)  NOT NULL,
    quantity    NUMERIC(12,3) NOT NULL DEFAULT 1,
    unit        VARCHAR(50)   NOT NULL DEFAULT 'шт',
    notes       TEXT,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT kit_template_items_quantity_positive CHECK (quantity > 0)
);

CREATE INDEX idx_kit_template_items_template ON kit_template_items (template_id);

-- ============================================================
-- TABLE: kits
-- Actual kit instances. May be based on a template or ad-hoc.
-- Scoped to the user (warehouse) that assembled it.
-- ============================================================

CREATE TABLE kits (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    template_id UUID        REFERENCES kit_templates (id) ON DELETE SET NULL,
    name        VARCHAR(255) NOT NULL,
    status      kit_status   NOT NULL DEFAULT 'draft',
    issued_to   VARCHAR(255),
    issued_at   TIMESTAMPTZ,
    notes       TEXT,
    metadata    JSONB       NOT NULL DEFAULT '{}',
    version     INTEGER     NOT NULL DEFAULT 1,
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_kits_user_id     ON kits (user_id)     WHERE deleted_at IS NULL;
CREATE INDEX idx_kits_template_id ON kits (template_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_kits_status      ON kits (user_id, status) WHERE deleted_at IS NULL;

-- ============================================================
-- TABLE: kit_items
-- Actual items included in a specific kit instance.
-- ============================================================

CREATE TABLE kit_items (
    id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    kit_id     UUID          NOT NULL REFERENCES kits (id) ON DELETE CASCADE,
    item_id    UUID          NOT NULL REFERENCES items (id) ON DELETE RESTRICT,
    quantity   NUMERIC(12,3) NOT NULL DEFAULT 1,
    notes      TEXT,
    created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT kit_items_quantity_positive CHECK (quantity > 0),
    CONSTRAINT kit_items_unique UNIQUE (kit_id, item_id)
);

CREATE INDEX idx_kit_items_kit_id  ON kit_items (kit_id);
CREATE INDEX idx_kit_items_item_id ON kit_items (item_id);

-- ============================================================
-- TABLE: sync_queue
-- Offline-first sync buffer. Mobile clients queue changes here;
-- the sync service processes them in order.
-- ============================================================

CREATE TABLE sync_queue (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID          NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    entity_type   VARCHAR(100)  NOT NULL,   -- 'item', 'operation', 'kit', etc.
    entity_id     UUID          NOT NULL,
    operation     sync_operation NOT NULL,
    payload       JSONB          NOT NULL DEFAULT '{}',
    client_version INTEGER       NOT NULL DEFAULT 1,
    status        sync_status    NOT NULL DEFAULT 'pending',
    error_message TEXT,
    retry_count   SMALLINT       NOT NULL DEFAULT 0,
    processed_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sync_queue_user_status   ON sync_queue (user_id, status) WHERE status IN ('pending', 'failed');
CREATE INDEX idx_sync_queue_entity        ON sync_queue (entity_type, entity_id);
CREATE INDEX idx_sync_queue_pending_order ON sync_queue (created_at ASC) WHERE status = 'pending';

-- ============================================================
-- TRIGGER: auto-update updated_at on every row change
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'users', 'donors', 'item_groups', 'items',
        'operations', 'kit_templates', 'kit_template_items',
        'kits', 'kit_items', 'sync_queue'
    ]
    LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_%s_updated_at
             BEFORE UPDATE ON %I
             FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
            t, t
        );
    END LOOP;
END;
$$;

-- ============================================================
-- TRIGGER: increment version on update (optimistic locking)
-- Applies to tables that participate in sync.
-- ============================================================

CREATE OR REPLACE FUNCTION increment_version()
RETURNS TRIGGER AS $$
BEGIN
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'users', 'donors', 'item_groups', 'items',
        'operations', 'kit_templates', 'kits', 'sync_queue'
    ]
    LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_%s_version
             BEFORE UPDATE ON %I
             FOR EACH ROW EXECUTE FUNCTION increment_version()',
            t, t
        );
    END LOOP;
END;
$$;

COMMIT;
