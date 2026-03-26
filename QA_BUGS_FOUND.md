# 🐛 QA Testing — Критичні Баги (Black Falcon)

**Дата тестування:** 26 березня 2026  
**Тестувальник:** QA Subagent  
**Середовище:** Development (localhost)

---

## 🚨 БЛОКЕРИ (Priority: CRITICAL)

### БАГ #1: Database Schema Mismatch — snake_case vs camelCase

**Severity:** CRITICAL  
**Status:** PARTIALLY FIXED  
**Blocks:** All API operations

**Опис:**  
TypeORM entities використовують camelCase naming (ownerId, groupId, createdAt), але PostgreSQL database має snake_case (user_id, group_id, created_at). Це призводить до:
- `QueryFailedError: column "ownerId" does not exist`
- `QueryFailedError: column "createdAt" does not exist`

**Affected Files:**
- `src/entities/Item.ts` ✅ FIXED
- `src/entities/User.ts` ✅ FIXED
- `src/entities/Donor.ts` ✅ FIXED
- `src/entities/Kit.ts` ✅ FIXED
- `src/entities/Group.ts` ✅ FIXED
- `src/entities/Operation.ts` ✅ FIXED
- `src/entities/SyncQueue.ts` ✅ FIXED

**Fix Applied:**  
Додано `name: 'snake_case_column'` до всіх `@Column` та `@JoinColumn` decorators.

---

### БАГ #2: Soft Delete Implementation Mismatch

**Severity:** CRITICAL  
**Status:** PARTIALLY FIXED  
**Blocks:** All CRUD operations

**Опис:**  
Код очікує `isDeleted: boolean`, але база має `deleted_at: timestamp` (soft delete pattern).

**Affected:**
- Entities: додано getter `isDeleted` ✅
- Repositories: замінено `isDeleted: false` на `deletedAt: IsNull()` ⚠️ INCOMPLETE
- Controllers: замінено `isDeleted: false` на `deletedAt: IsNull()` ⚠️ INCOMPLETE

**Current Issue:**  
TypeScript compilation fails через неправильне використання `IsNull()` в `.save()` методах.

**Still Broken:**
- `src/controllers/operationController.ts` (line ~101)
- Multiple `.save()` methods across controllers

**Recommended Fix:**
1. Entities: use `deleted_at` column + `isDeleted` getter ✅ DONE
2. Repositories: use `deletedAt: IsNull()` in WHERE clauses ✅ DONE
3. Controllers: REMOVE `deletedAt` from `.save()` calls (let DB default) ⚠️ PARTIAL
4. Soft delete operations: use `.update(id, { deletedAt: new Date() })`

---

### БАГ #3: Migration Not Applied

**Severity:** HIGH  
**Status:** ✅ FIXED

**Опис:**  
OFF_BALANCE feature міграція (`AddBalanceStatusToItems1742860800000`) не була застосована до бази.

**Root Cause:**  
Міграція reference incorrect enum name: `operations_type_enum` (має бути `operation_type`).

**Fix:**  
```bash
npm run migration:run
```

Columns added:
- `balance_status` VARCHAR(20) DEFAULT 'off_balance'
- `document_number` VARCHAR(50) NULL
- `document_date` DATE NULL
- `supplier_name` VARCHAR(255) NULL

---

## ⚠️ HIGH PRIORITY

### БАГ #4: Auth Controller Username vs Email Confusion

**Severity:** MEDIUM  
**Status:** WORKAROUND APPLIED

**Опис:**  
`authController.ts` очікує `username` в request body, але User entity має тільки `email` column. Існує getter `username` який повертає `email` — це hacky workaround.

**Current Behavior:**  
Login працює, але API непослідовний:
```json
POST /api/auth/login
{
  "username": "admin@test.com",  // ⚠️ Має бути "email"
  "password": "admin123"
}
```

**Recommended Fix:**  
1. Option A: Rename `email` → `username` в database schema
2. Option B: Accept `email` в API та видалити getter workaround

---

### БАГ #5: Metadata Field Type Mismatch

**Severity:** MEDIUM  
**Status:** ✅ FIXED

**Опис:**  
Entity definition: `metadata!: Record<string, unknown> | null`  
Database constraint: `metadata JSONB NOT NULL DEFAULT '{}'`

Controllers передавали `metadata ?? null`, що порушувало NOT NULL constraint.

**Fix:**  
Changed to `metadata ?? {}` in itemController createItem().

---

## 📊 TEST RESULTS

### ✅ PASSED TESTS

- **A1:** Create item with `balance_status=off_balance` — ✅ PASSED  
  Item ID: `00ac2dcf-56cc-4d03-90aa-1831662d12f1`

### ❌ BLOCKED TESTS (Cannot Execute)

- **A2:** List off-balance items — ❌ BLOCKED (TypeScript compilation errors)
- **A3:** Move item to balance — ❌ BLOCKED
- **A4:** Validation: documents required — ❌ BLOCKED
- **A5:** Validation: future date rejected — ❌ BLOCKED
- **B1-B3:** Export functionality — ❌ BLOCKED
- **C1-C4:** UI/UX tests — ❌ BLOCKED (backend not running)
- **D1-D3:** Regression tests — ❌ BLOCKED

---

## 🔧 NEXT STEPS

1. **Fix TypeScript compilation:**
   - Review all `.save()` calls and remove `deletedAt: IsNull()`
   - Fix `operationController.ts` type errors

2. **Apply schema consistency:**
   - Document the camelCase ↔ snake_case mapping strategy
   - Consider using TypeORM naming strategy to auto-convert

3. **Complete testing:**
   - Once backend compiles, re-run full test suite
   - Test all OFF_BALANCE endpoints
   - Test Export functionality
   - Test UI components

4. **Code review:**
   - Review all entity-to-database mappings
   - Ensure consistent soft delete pattern
   - Add integration tests to catch schema mismatches

---

## 💡 RECOMMENDATIONS

1. **Use TypeORM naming strategy:**
```typescript
// ormconfig.ts
namingStrategy: new SnakeCaseNamingStrategy()
```

2. **Add pre-commit hooks:**
```bash
npm run typecheck && npm run migration:run
```

3. **Add schema validation tests:**
```typescript
// tests/schema.test.ts
test('Entity columns match database schema', async () => {
  // Compare TypeORM metadata with actual DB columns
});
```

4. **Document soft delete pattern:**
```markdown
# Soft Delete Pattern
- Database: `deleted_at TIMESTAMPTZ NULL`
- Entity: `deletedAt: Date | null` + `get isDeleted(): boolean`
- Queries: use `deletedAt: IsNull()` in WHERE
- Delete: use `.update(id, { deletedAt: new Date() })`
```

---

**End of Report**
