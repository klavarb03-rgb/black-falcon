# Donors Pagination Feature - Test Plan

**Feature**: Implement and test pagination for Donors API and Frontend UI

---

## 1. BACKEND API TESTS (REST API)

### 1.1 Pagination Parameters
- [ ] **Test GET /api/donors with default pagination**
  - Request: `GET /api/donors` (no params)
  - Expected: Returns page 1, default limit (e.g., 10 items)
  - Verify: Response includes `data`, `total`, `page`, `limit`, `totalPages`

- [ ] **Test page parameter variations**
  - [ ] page=1 → Returns first page
  - [ ] page=2 → Returns second page
  - [ ] page=3 → Returns third page
  - [ ] Verify correct items returned for each page

- [ ] **Test limit parameter variations**
  - [ ] limit=5 → Returns max 5 items per page
  - [ ] limit=10 → Returns max 10 items per page
  - [ ] limit=25 → Returns max 25 items per page
  - [ ] Verify correct count in response

- [ ] **Test combined page + limit parameters**
  - [ ] page=2&limit=5 → Returns items 6-10
  - [ ] page=3&limit=10 → Returns items 21-30
  - [ ] Verify offset calculation is correct: `(page-1) * limit`

### 1.2 Response Structure
- [ ] **Verify pagination metadata in response**
  ```json
  {
    "status": "success",
    "data": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 47,
      "totalPages": 5,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
  ```

- [ ] **Verify data array contains correct number of items**
- [ ] **Verify correct total count**
- [ ] **Verify hasNextPage flag is accurate**
- [ ] **Verify hasPrevPage flag is accurate**

### 1.3 Edge Cases - Invalid Parameters

#### Invalid Page Values
- [ ] **page=0** → Should return error 400 (pages start at 1)
- [ ] **page=-1** → Should return error 400
- [ ] **page=invalid** → Should return error 400
- [ ] **page=999** → Should return empty array (or last valid page)

#### Invalid Limit Values
- [ ] **limit=0** → Should return error 400
- [ ] **limit=-5** → Should return error 400
- [ ] **limit=invalid** → Should return error 400
- [ ] **limit=999** → Should cap to max allowed (e.g., 100)
- [ ] **limit=0.5** → Should return error 400 or floor to 1

#### Missing/Null Parameters
- [ ] **page=null** → Defaults to page 1
- [ ] **limit=null** → Defaults to default limit (e.g., 10)
- [ ] **Both null** → Returns first page with default limit

### 1.4 Edge Cases - Data Scenarios

#### Empty Database
- [ ] **0 donors total**
  - [ ] page=1 returns empty array
  - [ ] totalPages = 0
  - [ ] hasNextPage = false
  - [ ] hasPrevPage = false

#### Single Page of Data
- [ ] **5 donors, limit=10**
  - [ ] page=1 returns all 5 items
  - [ ] totalPages = 1
  - [ ] hasNextPage = false
  - [ ] page=2 returns empty array with proper metadata

#### Last Page Boundary
- [ ] **47 donors, limit=10**
  - [ ] page=5 (last page) returns 7 items (47 % 10)
  - [ ] totalPages = 5
  - [ ] hasNextPage = false
  - [ ] hasPrevPage = true

#### First Page
- [ ] **Multiple pages of data**
  - [ ] page=1 always has hasPrevPage = false
  - [ ] page=1 always has hasNextPage = true (if total > limit)

### 1.5 Authorization & Permissions
- [ ] **Unauthenticated request** → Returns 401 Unauthorized
- [ ] **Invalid token** → Returns 401 Unauthorized
- [ ] **User without permission** → Returns 403 Forbidden
- [ ] **Valid admin/leader/manager** → Returns 200 with data
- [ ] **Pagination works for all authorized roles**

### 1.6 Sorting & Filtering with Pagination
- [ ] **Pagination + sort by name (ASC)** → Correct items returned
- [ ] **Pagination + sort by createdAt (DESC)** → Correct items returned
- [ ] **Pagination + search filter** → Correct count and items
- [ ] **Page consistency** → Same page returns same results on retry

### 1.7 Performance Tests
- [ ] **Large dataset (10,000+ donors)**
  - [ ] Response time < 500ms for page 1
  - [ ] Response time < 500ms for middle pages
  - [ ] Response time < 500ms for last page
  - [ ] No N+1 query issues

- [ ] **Memory usage** → No memory leaks with repeated pagination requests

---

## 2. FRONTEND PAGINATION CONTROLS TESTS

### 2.1 Pagination UI Components
- [ ] **Page number buttons render correctly**
  - [ ] Shows page 1, 2, 3, ... totalPages
  - [ ] Current page is highlighted/disabled
  - [ ] Non-current pages are clickable

- [ ] **Next button behavior**
  - [ ] Enabled when hasNextPage = true
  - [ ] Disabled when hasNextPage = false
  - [ ] Clicking advances to next page

- [ ] **Previous button behavior**
  - [ ] Enabled when hasPrevPage = true
  - [ ] Disabled when hasPrevPage = false
  - [ ] Clicking goes to previous page

- [ ] **Limit selector dropdown**
  - [ ] Options: 5, 10, 25, 50 (or configured values)
  - [ ] Current limit is selected
  - [ ] Changing limit resets to page 1
  - [ ] Data updates with new limit

- [ ] **"Jump to page" input field**
  - [ ] User can enter page number
  - [ ] Enter key navigates to that page
  - [ ] Invalid page numbers show error
  - [ ] Out-of-range pages clamp to valid range

### 2.2 Display & Feedback
- [ ] **Results count displays correctly**
  - [ ] Shows "Showing 1-10 of 47" format
  - [ ] Count updates when limit changes
  - [ ] Count updates when pagination changes

- [ ] **Loading indicator appears**
  - [ ] Shows spinner when fetching page
  - [ ] Pagination controls disabled during load
  - [ ] Search/filter disabled during load

- [ ] **Error message displays**
  - [ ] Shows error if pagination fails
  - [ ] User can retry pagination
  - [ ] Previous data remains visible while error shown

### 2.3 Search + Pagination Integration
- [ ] **Search filters results BEFORE pagination**
  - [ ] Search for "John" with 47 donors → Shows filtered count
  - [ ] Pagination applies to filtered results
  - [ ] Page 1 shows first 10 filtered results
  - [ ] Switching pages updates filtered results

- [ ] **Search resets to page 1**
  - [ ] User on page 3, enters search → Resets to page 1
  - [ ] Clear search → Returns to previous page (or page 1)

- [ ] **Results count updates with search**
  - [ ] "Showing 1-10 of 5" when search filters to 5 items
  - [ ] Pagination controls hide if search results fit one page

### 2.4 URL State Management (if applicable)
- [ ] **Page query parameter in URL**
  - [ ] ?page=2 loads page 2
  - [ ] ?page=2&limit=10 loads page 2 with limit 10
  - [ ] Back button navigates to previous page
  - [ ] Page refreshes maintains current page

- [ ] **URL updates on pagination change**
  - [ ] Clicking page 2 updates URL to ?page=2
  - [ ] Browser history allows back/forward

### 2.5 Mobile Responsiveness
- [ ] **Pagination controls visible on mobile**
  - [ ] Page buttons stack or use dropdown on small screens
  - [ ] Next/Previous buttons easily tappable
  - [ ] Limit selector accessible on mobile

- [ ] **Results count readable on mobile**
- [ ] **No horizontal scrolling needed**
- [ ] **Table/list scrolls independently if needed**

---

## 3. EDGE CASES & ERROR SCENARIOS

### 3.1 Network & API Errors
- [ ] **API returns 500 error**
  - [ ] Shows error message to user
  - [ ] Pagination controls disabled
  - [ ] Previous data remains visible
  - [ ] User can retry

- [ ] **Network timeout**
  - [ ] Shows timeout error after 10s
  - [ ] Retry button available
  - [ ] Doesn't lose current page state

- [ ] **Malformed API response**
  - [ ] Missing `pagination` object
  - [ ] Missing `data` array
  - [ ] Invalid `totalPages` value
  - [ ] Graceful fallback to no pagination

### 3.2 Rapid Pagination Clicks
- [ ] **User clicks page 2, then page 3 rapidly**
  - [ ] Final result shows page 3 (not page 2)
  - [ ] No race condition errors
  - [ ] Only latest request result displayed

- [ ] **User clicks next/previous multiple times**
  - [ ] Requests queued or debounced
  - [ ] UI stays responsive
  - [ ] Final page is correct

### 3.3 Data Mutation During Pagination
- [ ] **New donor added while viewing page 2**
  - [ ] Page count updates on next API call
  - [ ] Current page still valid
  - [ ] No data duplication

- [ ] **Donor deleted while on page 3**
  - [ ] Page count updates
  - [ ] If last item deleted, may shift pages
  - [ ] No missing items in results

- [ ] **Donor updated while viewing it**
  - [ ] Updated data shows on next load
  - [ ] Pagination position maintained

### 3.4 Boundary Conditions
- [ ] **Items per page = Total items**
  - [ ] Single page with all items
  - [ ] Pagination controls hidden or disabled
  - [ ] Next/Previous buttons disabled

- [ ] **Off-by-one errors**
  - [ ] 10 donors, limit=5 → 2 pages, not 3
  - [ ] 11 donors, limit=5 → 3 pages (page 3 has 1 item)
  - [ ] 50 donors, limit=10 → page 5 is not page 4

- [ ] **Zero-based vs one-based indexing**
  - [ ] API uses 1-based pages (page 1, page 2, etc.)
  - [ ] Frontend displays correctly
  - [ ] No off-by-one in item numbers

### 3.5 Concurrent Operations
- [ ] **Pagination + Add donor simultaneously**
  - [ ] Add completes, pagination still works
  - [ ] New donor doesn't appear on current page
  - [ ] Refresh shows updated count

- [ ] **Pagination + Delete donor simultaneously**
  - [ ] Delete completes, pagination still works
  - [ ] Item count updates correctly

---

## 4. ACCESSIBILITY & USABILITY

### 4.1 Keyboard Navigation
- [ ] **Tab through pagination controls**
  - [ ] All buttons/inputs focusable
  - [ ] Focus visible on each element
  - [ ] Logical tab order

- [ ] **Enter key activates buttons**
- [ ] **Arrow keys navigate page buttons** (optional)
- [ ] **Screen reader announces**
  - [ ] "Page 2 of 5, current page" for active button
  - [ ] "Next page button" for next button
  - [ ] "Showing 1-10 of 47 results"

### 4.2 Semantic HTML
- [ ] **Pagination uses `<nav>` or appropriate container**
- [ ] **Buttons have clear `aria-label` attributes**
- [ ] **Current page button has `aria-current="page"`**
- [ ] **Limit selector has associated `<label>`**

### 4.3 User Experience
- [ ] **Clear indication of current page**
- [ ] **Disabled buttons look disabled**
- [ ] **Feedback on pagination action**
  - [ ] Page changes immediately (optimistic update)
  - [ ] Or shows loading state
- [ ] **Help text for limit selector** (if needed)

---

## 5. TEST EXECUTION CHECKLIST

### Environment Setup
- [ ] Local backend running on port 3000
- [ ] Frontend running (dev/prod build)
- [ ] Database seeded with 50+ test donors
- [ ] Auth token obtained for testing
- [ ] Test users with different roles (admin, leader, manager, staff)

### Test Data
- [ ] Create 50 donors with various names (sorted test)
- [ ] Include donors with special characters in names
- [ ] Include donors with null/empty fields
- [ ] Create donors at known timestamps for date-sort tests

### Test Tools
- [ ] Postman/Insomnia for API testing
- [ ] Browser DevTools for frontend testing
- [ ] Network tab to verify request/response
- [ ] Console for error messages
- [ ] React DevTools to inspect component state

### Manual Test Execution
- [ ] **Phase 1**: Backend API tests (1.1 - 1.7)
- [ ] **Phase 2**: Frontend UI tests (2.1 - 2.5)
- [ ] **Phase 3**: Edge case tests (3.1 - 3.5)
- [ ] **Phase 4**: Accessibility tests (4.1 - 4.3)
- [ ] **Phase 5**: Cross-browser testing (Chrome, Safari, Firefox)

### Regression Testing
- [ ] Search still works with pagination
- [ ] Create/Edit/Delete donors still works with pagination
- [ ] Donor report (GET /api/donors/:id/report) unaffected
- [ ] User permissions still enforced

### Sign-off Criteria
- [ ] ✅ All backend tests passing
- [ ] ✅ All frontend tests passing
- [ ] ✅ No critical issues found
- [ ] ✅ Performance benchmarks met (< 500ms)
- [ ] ✅ Accessibility standards met (WCAG 2.1 AA)
- [ ] ✅ Mobile responsive verified
- [ ] ✅ Documentation updated

---

## 6. API IMPLEMENTATION REQUIREMENTS (Reference)

When implementing pagination, ensure the following:

### Backend Changes Needed
1. **Update getDonors endpoint** to accept `page` and `limit` query parameters
2. **Calculate offset**: `offset = (page - 1) * limit`
3. **Query database** with LIMIT and OFFSET
4. **Return response with pagination metadata**
5. **Validate parameters** (page ≥ 1, limit > 0, limit ≤ 100)
6. **Handle edge cases** (empty results, last page)

### Frontend Changes Needed
1. **Update donorService.getDonors()** to accept pagination params
2. **Create PaginationControls component** (or use UI library)
3. **Update DonorsScreen** to manage page/limit state
4. **Implement loading state** during pagination
5. **Handle API errors** gracefully
6. **Display results metadata** (current page, total, etc.)
7. **Integrate with search** (reset to page 1 on search)
8. **Optional**: URL state management (query params)

---

## Notes & Observations

- **Current Implementation**: No pagination exists. All donors returned at once.
- **Frontend Search**: Currently client-side filtering. Consider server-side with pagination.
- **Performance**: With pagination, should handle 10K+ donors efficiently.
- **Database**: Ensure proper indexing for pagination queries (createdAt, status, etc.)
- **API Version**: Consider if this should be in v1 or v2 of API

