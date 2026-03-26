# 🔧 Quick Fix Checklist — Black Falcon

**QA Test Status:** 1/15 PASSED, 14/15 BLOCKED  
**Blocker:** TypeScript compilation errors

---

## ⚡ URGENT FIXES (30-60 min)

### 1. Fix TypeScript Compilation Errors

**Problem:** `operationController.ts` and other controllers have type errors with `IsNull()` in `.save()` methods.

**Quick Fix:**
```bash
cd ~/black-falcon/backend

# Find all problematic save() calls
grep -rn "save({" src/controllers/ | grep -A10 "deletedAt"

# Manual fix: Remove `deletedAt: IsNull()` from ALL .save() calls
# Example:
# ❌ await repo.save({ name: "test", deletedAt: IsNull() })
# ✅ await repo.save({ name: "test" })  // DB default = NULL
```

**Files to check:**
- `src/controllers/operationController.ts` (line ~101)
- `src/controllers/donorController.ts`
- `src/controllers/groupController.ts`
- `src/controllers/kitController.ts`

**Verify:**
```bash
npm run dev
# Should see: [server] Running on http://0.0.0.0:3000
```

---

### 2. Verify All Entities Have Correct Column Names

**Already Fixed (double-check):**
```typescript
// ✅ All entities should have:
@Column({ type: 'uuid', name: 'user_id' })
ownerId!: string;

@CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
createdAt!: Date;

@Column({ type: 'timestamptz', nullable: true, name: 'deleted_at' })
deletedAt!: Date | null;
```

**Test:**
```bash
curl -X POST http://localhost:3000/api/items \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","status":"volunteer","quantity":1,"unit":"pcs"}'
# Should return: {"status":"success","data":{...}}
```

---

### 3. Test OFF_BALANCE Endpoint

**Once backend compiles:**
```bash
# Login
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@test.com","password":"admin123"}' \
  -s | jq -r '.accessToken')

# Test off-balance list
curl -X GET "http://localhost:3000/api/items/off-balance" \
  -H "Authorization: Bearer $TOKEN" -s | jq .

# Should return items with balance_status='off_balance'
```

---

## 🔍 MEDIUM PRIORITY (1-2 hours)

### 4. Add TypeORM Naming Strategy

**Add to `ormconfig.ts`:**
```typescript
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

const AppDataSource = new DataSource({
  // ... existing config
  namingStrategy: new SnakeNamingStrategy(),
});
```

**Install:**
```bash
npm install typeorm-naming-strategies
```

**Benefit:** Auto-converts camelCase ↔ snake_case, eliminates manual `name:` mappings.

---

### 5. Document Soft Delete Pattern

**Create `docs/SOFT_DELETE.md`:**
```markdown
# Soft Delete Pattern

## Database
- Column: `deleted_at TIMESTAMPTZ NULL`
- Default: NULL (active records)
- Deleted: NOW() timestamp

## Entity
@Column({ type: 'timestamptz', nullable: true, name: 'deleted_at' })
deletedAt!: Date | null;

get isDeleted(): boolean {
  return this.deletedAt !== null;
}

## Queries
// List active records
repo.find({ where: { deletedAt: IsNull() } })

// Soft delete
repo.update(id, { deletedAt: new Date() })

// Hard delete (avoid)
repo.delete(id)
```

---

### 6. Run Full QA Test Suite

**After backend compiles:**
```bash
cd ~/black-falcon

# Test API endpoints
bash tests/api_tests.sh

# Test UI (manual)
open http://localhost:5173
# - Check Dashboard off-balance counter
# - Check Items table badges
# - Test "Оформити документи" modal
# - Test Excel/PDF export buttons
```

---

## 📋 LONG-TERM (Post-MVP)

### 7. Add Automated Tests

**Integration tests:**
```typescript
// tests/items.test.ts
describe('Items API', () => {
  test('Create off-balance item', async () => {
    const res = await request(app)
      .post('/api/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test', status: 'volunteer', quantity: 1 });
    
    expect(res.status).toBe(201);
    expect(res.body.data.balance_status).toBe('off_balance');
  });
});
```

---

### 8. Add CI/CD Checks

**.github/workflows/ci.yml:**
```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install dependencies
        run: npm ci
      - name: TypeScript check
        run: npm run typecheck
      - name: Run migrations
        run: npm run migration:run
      - name: Run tests
        run: npm test
```

---

## ✅ VERIFICATION

**Before marking as DONE:**

1. ✅ Backend compiles without errors (`npm run dev`)
2. ✅ Login works (`POST /api/auth/login`)
3. ✅ Create item works (`POST /api/items`)
4. ✅ List off-balance items works (`GET /api/items/off-balance`)
5. ✅ Move to balance works (`PUT /api/items/:id/move-to-balance`)
6. ✅ Export Excel works (`GET /api/reports/export/excel`)
7. ✅ Export PDF works (`GET /api/reports/export/pdf`)
8. ✅ UI loads without errors (http://localhost:5173)
9. ✅ Dashboard shows correct off-balance count
10. ✅ Items table displays balance badges

**Then:**
```bash
cd ~/black-falcon
git add .
git commit -m "fix: resolve schema mismatch and soft delete issues

- Fixed all TypeORM entity column name mappings (snake_case)
- Standardized soft delete pattern (deleted_at timestamp)
- Applied OFF_BALANCE migration
- Fixed metadata NOT NULL constraint
- Updated repositories and controllers to use IsNull() correctly

QA Status: 15/15 tests passed
Closes #5"

git push origin main
```

---

**Estimated Total Time:** 2-3 hours  
**Priority:** URGENT (blocks production deployment)  
**Owner:** Backend team lead
