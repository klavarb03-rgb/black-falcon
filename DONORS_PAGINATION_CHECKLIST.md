# Donors Pagination - Quick Test Checklist

## QUICK REFERENCE TESTING CHECKLIST

### Backend API - Basic Functionality
```
PAGINATION PARAMETERS
☐ GET /api/donors → Returns page 1, limit 10
☐ GET /api/donors?page=2 → Returns page 2
☐ GET /api/donors?page=2&limit=5 → Returns page 2, 5 items
☐ Response includes: data[], total, page, limit, totalPages
☐ hasNextPage and hasPrevPage are accurate

INVALID PAGE PARAMETERS
☐ page=0 → 400 error
☐ page=-1 → 400 error
☐ page=invalid → 400 error
☐ page=999 (beyond range) → Empty array or error

INVALID LIMIT PARAMETERS
☐ limit=0 → 400 error
☐ limit=-5 → 400 error
☐ limit=invalid → 400 error
☐ limit=999 → Caps to max allowed (e.g., 100)

EMPTY/NULL PARAMETERS
☐ No params → Defaults to page=1, limit=10
☐ page=null → Defaults to page=1
☐ limit=null → Defaults to 10
```

### Backend API - Edge Cases
```
EMPTY DATA (0 donors)
☐ page=1 → Returns empty array
☐ totalPages=0
☐ hasNextPage=false, hasPrevPage=false

SINGLE PAGE (5 donors, limit=10)
☐ page=1 → Returns all 5 items
☐ totalPages=1
☐ hasNextPage=false
☐ page=2 → Empty array, valid pagination metadata

LAST PAGE (47 donors, limit=10)
☐ page=5 (last) → Returns 7 items
☐ totalPages=5
☐ hasNextPage=false
☐ hasPrevPage=true

FIRST PAGE
☐ page=1 always has hasPrevPage=false
☐ page=1 has hasNextPage=true (if total > limit)
```

### Backend API - Authorization & Performance
```
AUTHORIZATION
☐ No token → 401 Unauthorized
☐ Invalid token → 401 Unauthorized
☐ Unauthorized role → 403 Forbidden
☐ admin/leader/manager → 200 OK
☐ All roles support pagination

PERFORMANCE
☐ page=1 response < 500ms
☐ page=middle response < 500ms
☐ page=last response < 500ms
☐ No N+1 queries
☐ No memory leaks on repeat requests
```

---

### Frontend - UI Controls
```
PAGINATION BUTTONS
☐ Page number buttons render (1, 2, 3... totalPages)
☐ Current page highlighted/disabled
☐ Non-current pages clickable
☐ Next button enabled when hasNextPage=true
☐ Next button disabled when hasNextPage=false
☐ Previous button enabled when hasPrevPage=true
☐ Previous button disabled when hasPrevPage=false

LIMIT SELECTOR
☐ Dropdown shows options (5, 10, 25, 50)
☐ Current limit selected
☐ Changing limit resets to page 1
☐ Data updates immediately with new limit

DISPLAY
☐ "Showing 1-10 of 47" displays correctly
☐ Count updates when limit changes
☐ Loading spinner appears during fetch
☐ Pagination controls disabled while loading
☐ Error message displays on API failure
```

### Frontend - Search Integration
```
SEARCH + PAGINATION
☐ Search filters BEFORE pagination
☐ Pagination applies to filtered results only
☐ Search resets to page 1
☐ Results count updates: "1-10 of 5" when filtered
☐ Pagination controls hide if results fit one page
☐ Clear search returns to page 1
```

### Frontend - State Management
```
URL STATE (if implemented)
☐ ?page=2 loads page 2
☐ ?page=2&limit=10 works correctly
☐ Browser back button works
☐ Page refresh maintains page
☐ URL updates when pagination changes

RAPID CLICKS
☐ Click page 2, then page 3 rapidly → Shows page 3
☐ No race conditions
☐ No duplicate data
☐ UI responsive

DATA CHANGES
☐ New donor added → Count updates on refresh
☐ Donor deleted → Page count adjusts
☐ Donor updated → Updated data shows
☐ Current page remains valid
```

---

### Edge Cases & Error Handling
```
BOUNDARY CONDITIONS
☐ 10 items, limit=10 → 1 page (no pagination needed)
☐ 11 items, limit=10 → 2 pages
☐ 50 items, limit=10 → 5 pages (not 4, not 6)
☐ Last page has fewer items (e.g., 7 of 10)

API ERRORS
☐ 500 error → Shows error message, allows retry
☐ Network timeout → Shows error, allows retry
☐ Malformed response → Graceful fallback
☐ Missing pagination metadata → Handled gracefully

CONCURRENT OPS
☐ Add donor + pagination → Works without issue
☐ Delete donor + pagination → Works without issue
☐ Update donor + pagination → Works without issue
```

---

### Accessibility & Mobile
```
KEYBOARD NAV
☐ Tab through all controls
☐ Enter activates buttons
☐ Focus visible on each element
☐ Logical tab order

SCREEN READER
☐ "Page 2 of 5, current page" announced
☐ "Next page button" labeled correctly
☐ Buttons have aria-labels

MOBILE
☐ Pagination visible on mobile
☐ Buttons easily tappable
☐ No horizontal scrolling
☐ Results count readable
☐ Works on iPhone/Android
```

---

## TEST EXECUTION SUMMARY

| Phase | Tests | Status |
|-------|-------|--------|
| **1** | Backend API Basic | ☐ |
| **2** | Backend API Edge Cases | ☐ |
| **3** | Backend API Auth & Perf | ☐ |
| **4** | Frontend UI Controls | ☐ |
| **5** | Frontend Search & State | ☐ |
| **6** | Error Handling | ☐ |
| **7** | Mobile & Accessibility | ☐ |
| **8** | Cross-browser | ☐ |

### Test Data Setup
- [ ] Create 50+ test donors
- [ ] Include varied names (for sort testing)
- [ ] Include null/empty fields
- [ ] Create timestamps for date sorting

### Sign-off
- [ ] All critical tests passing
- [ ] No blocking issues
- [ ] Performance acceptable (< 500ms)
- [ ] Mobile responsive
- [ ] Accessibility standards met
- [ ] Ready for production

---

## Postman/API Test Examples

```bash
# Test basic pagination
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/donors?page=1&limit=10"

# Test invalid page
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/donors?page=0&limit=10"

# Test different limits
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/donors?page=1&limit=25"

# Test last page
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/donors?page=5&limit=10"
```

