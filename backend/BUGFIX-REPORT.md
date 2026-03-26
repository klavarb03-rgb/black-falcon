# 🐛 Bug Fix Report - TypeScript Compilation Errors

**Date:** 2026-03-26  
**Developer:** Backend Team  
**Status:** ✅ FIXED

---

## 🎯 Problem

TypeScript compilation failed due to incorrect usage of `deletedAt: IsNull()` in `.save()` and `.create()` methods.

**Error:**
```
src/controllers/operationController.ts:101:15 - error TS2769: 
No overload matches this call... 
Type 'IsNull' is not assignable to type 'Date | null'
```

---

## 🔧 Root Cause

`IsNull()` is a TypeORM **query operator** for `.find()` WHERE clauses.  
It cannot be used as a value in `.save()` or `.create()` — TypeScript expects `Date | null`.

**Database behavior:**  
- Column `deletedAt` has `DEFAULT NULL` in schema
- When creating/saving records, omit `deletedAt` — DB will auto-set to `NULL`

---

## ✅ Changes Made

### 1. **operationController.ts** (line ~101)
**Before:**
```typescript
receiverItem = itemRepo2.create({
  name: item.name,
  status: item.status,
  quantity,
  unit: item.unit,
  description: item.description,
  groupId: item.groupId,
  donorId: item.donorId,
  ownerId: toUserId,
  metadata: item.metadata,
  deletedAt: IsNull(),  // ❌ WRONG!
});
```

**After:**
```typescript
receiverItem = itemRepo2.create({
  name: item.name,
  status: item.status,
  quantity,
  unit: item.unit,
  description: item.description,
  groupId: item.groupId,
  donorId: item.donorId,
  ownerId: toUserId,
  metadata: item.metadata,
  // deletedAt omitted — DB default NULL
});
```

### 2. **kitController.ts** (line ~90)
Removed `deletedAt: IsNull()` from `saveTemplate()` call.

### 3. **kitController.ts** (line ~286)
Removed `deletedAt: IsNull()` from `kitRepo.create()` call.

---

## ✅ Verification

```bash
npm run build
# ✅ SUCCESS - NO ERRORS!
```

**Build output:**
- Compiled successfully
- No TypeScript errors
- `dist/` folder generated

---

## 🚀 Deployment

```bash
git add src/controllers/kitController.ts src/controllers/operationController.ts
git commit -m "fix: remove deletedAt from save() methods - TypeScript compilation errors"
git push origin main
```

**Commit:** `fa818b1d`  
**Branch:** `main`

Backend restarted:
```bash
pkill -f "node.*backend"
npm start &
```

**Health check:** ✅ OK  
`GET http://localhost:3000/health`

---

## 📝 Notes

**Correct usage:**
- `.find()` WHERE clause: `{ deletedAt: IsNull() }` ✅
- `.save()` / `.create()`: omit `deletedAt` (DB default) ✅
- Soft delete: `itemRepo.update(id, { deletedAt: new Date() })` ✅
- Restore: `itemRepo.update(id, { deletedAt: null })` ✅

**Files kept unchanged:**
- All `.find()` queries still use `deletedAt: IsNull()` — this is correct!

---

**Status:** CRITICAL BUG FIXED ✅  
**Build:** PASSING ✅  
**Backend:** RUNNING ✅
