# TASK-B001: PostgreSQL Schema Design

## Task Description

Design and implement PostgreSQL database schema for Black Falcon МЦ accounting system.

## Requirements

1. **Tables needed:**
   - users (admin, leader, manager roles)
   - items (МЦ inventory)
   - operations (transfers, write-offs)
   - item_groups (hierarchical categories, 4 levels max)
   - kits (bill of materials)
   - kit_templates (reusable kit definitions)
   - donors (for reporting)
   - sync_queue (for offline/online sync)

2. **Key constraints:**
   - Items belong to specific warehouse (user)
   - Items have status: 'government' or 'volunteer'
   - Operations track all item movements
   - Groups are per-user (not global)
   - Soft deletes where appropriate
   - Version tracking for sync

3. **Deliverables:**
   - migrations/001_initial_schema.sql
   - migrations/seed_test_data.sql
   - docs/DATABASE_SCHEMA.md

## Schema Design Guidelines

- Use UUID for primary keys (better for distributed system)
- Include created_at, updated_at timestamps
- Add indexes for common queries
- Foreign keys with appropriate CASCADE rules
- Consider PostgreSQL-specific features (JSONB for metadata)

Please create the complete schema with all tables, constraints, and indexes.