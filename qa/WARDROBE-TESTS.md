# FashionTON Wardrobe - Wardrobe Management Test Cases

**Priority**: 🔴 Critical (Core Feature)  
**Last Updated**: 2024

---

## Test Suite Overview

| ID | Test Name | Priority | Status |
|----|-----------|----------|--------|
| TC-WARD-001 | Add Item to Wardrobe | Critical | ⏳ |
| TC-WARD-002 | Edit Item Details | High | ⏳ |
| TC-WARD-003 | Delete Item | High | ⏳ |
| TC-WARD-004 | View Wardrobe Grid | Critical | ⏳ |
| TC-WARD-005 | Category Filtering | High | ⏳ |
| TC-WARD-006 | Wardrobe Empty State | Medium | ⏳ |
| TC-WARD-007 | Wardrobe Full State (Free Tier) | High | ⏳ |
| TC-WARD-008 | Premium Unlimited Items | Medium | ⏳ |
| TC-WARD-009 | Item Detail View | High | ⏳ |
| TC-WARD-010 | Search/Filter Items | Medium | ⏳ |

---

## TC-WARD-001: Add Item to Wardrobe

### Pre-conditions
- User authenticated
- Image upload permission granted

### Test Steps
1. Launch app → Wardrobe tab
2. Tap floating "+" button
3. Select image from gallery
4. Fill item details:
   ```
   Category: Tops
   Color: Pink (#FF6B9D)
   Brand: Zara
   Size: M
   Season: Summer
   Notes: "Favorite blouse"
   ```
5. Tap "Save Item"

### Expected Results
- [ ] Success animation plays
- [ ] Item appears at top of grid
- [ ] Item count increments
- [ ] Toast: "Item added to wardrobe!"
- [ ] Thumbnail displays correctly

### Data Validation
| Field | Valid Input | Invalid Input |
|-------|-------------|---------------|
| Category | tops, bottoms, shoes, accessories | empty, invalid value |
| Color | hex code (#FF6B9D) | invalid hex, too long |
| Brand | alphanumeric, max 50 chars | special chars, >50 chars |
| Size | S, M, L, XL, numeric | empty, >10 chars |
| Notes | optional, max 500 chars | >500 chars |

---

## TC-WARD-002: Edit Item Details

### Pre-conditions
- At least 1 item exists in wardrobe

### Test Steps
1. Navigate to Wardrobe tab
2. Long-press on item OR tap ⋮ menu
3. Select "Edit"
4. Modify fields:
   - Change color: Pink → Blue
   - Update size: M → L
   - Add note: "Great for parties"
5. Tap "Save Changes"

### Expected Results
- [ ] Edit form pre-populated with current values
- [ ] Changes saved within 1 second
- [ ] Grid updates with new color indicator
- [ ] Detail view shows updated info
- [ ] Toast: "Item updated"

### Edge Cases
- [ ] Edit while offline → queue for sync
- [ ] Concurrent edits (last write wins)
- [ ] Cancel edit → no changes saved

---

## TC-WARD-003: Delete Item

### Test Steps
1. Navigate to Wardrobe
2. Long-press item
3. Select "Delete"
4. Confirm deletion in dialog

### Expected Results
- [ ] Confirmation dialog: "Delete this item?"
- [ ] Warning: "This cannot be undone"
- [ ] Item removed from grid with animation
- [ ] Item count decrements
- [ ] Storage space freed
- [ ] Toast: "Item deleted"

### Undo Feature (if implemented)
- [ ] "Undo" button in toast
- [ ] Undo available for 5 seconds
- [ ] Item restored to original position

---

## TC-WARD-004: View Wardrobe Grid

### Test Steps
1. Navigate to Wardrobe tab
2. Observe grid layout
3. Scroll through items
4. Tap on item

### Expected Results - Layout
- [ ] 3-column grid (portrait)
- [ ] 4-column grid (landscape - if supported)
- [ ] Equal spacing between items
- [ ] Rounded corners on thumbnails
- [ ] Category indicator (small icon/badge)

### Expected Results - Interaction
- [ ] Smooth scroll (60fps)
- [ ] Images lazy-load as scrolling
- [ ] Pull-to-refresh updates data
- [ ] Tap opens detail view

### Performance
- [ ] Grid loads < 1s for 20 items
- [ ] Scroll maintains 60fps
- [ ] No layout shift during image load

---

## TC-WARD-005: Category Filtering

### Test Steps
1. Navigate to Wardrobe
2. Tap filter icon / category chips
3. Select "Tops"
4. Observe filtered results
5. Clear filter

### Expected Results
- [ ] Filter chips shown: All | Tops | Bottoms | Shoes | Accessories
- [ ] Active filter highlighted
- [ ] Only matching items displayed
- [ ] Item count updates: "12 Tops"
- [ ] Clear filter returns to all items
- [ ] Filter persists during session

### Category List
| Category | Icon | Description |
|----------|------|-------------|
| All | 👗 | Show everything |
| Tops | 👕 | Shirts, blouses, sweaters |
| Bottoms | 👖 | Pants, skirts, shorts |
| Dresses | 👗 | Full dresses |
| Shoes | 👠 | All footwear |
| Accessories | 💎 | Bags, jewelry, belts |
| Outerwear | 🧥 | Jackets, coats |

---

## TC-WARD-006: Wardrobe Empty State

### Pre-conditions
- New user with 0 items

### Test Steps
1. Create new account / clear all items
2. Navigate to Wardrobe tab

### Expected Results
- [ ] Illustration displayed (empty hanger/closet)
- [ ] Text: "Your wardrobe is empty"
- [ ] Subtext: "Add your first item to get started"
- [ ] Prominent "+ Add Item" CTA button
- [ ] No filter chips shown (nothing to filter)

### Empty State Design
```
[Empty Wardrobe Illustration]

Your wardrobe is empty 👗

Add your first item to start
building your virtual closet

[ + Add First Item ]
```

---

## TC-WARD-007: Wardrobe Full State (Free Tier)

### Pre-conditions
- Free tier user
- 20 items in wardrobe (limit)

### Test Steps
1. Fill wardrobe to 20 items
2. Attempt to add 21st item

### Expected Results
- [ ] Error message: "Free limit reached (20 items)"
- [ ] CTA: "Upgrade for unlimited wardrobe"
- [ ] Existing items remain accessible
- [ ] Can still edit/delete existing items
- [ ] Premium upgrade flow accessible

### Progress Indicator
```
Your Wardrobe
20/20 items  [██████████] Full!

Upgrade to Premium for unlimited storage
```

---

## TC-WARD-008: Premium Unlimited Items

### Pre-conditions
- Premium subscriber

### Test Steps
1. Upgrade to Premium
2. Add 21st, 50th, 100th item

### Expected Results
- [ ] No item limit enforced
- [ ] Progress shows: "75 items" (no limit)
- [ ] Upload continues normally
- [ ] Performance maintained with large wardrobe

### Performance Targets (Large Wardrobe)
| Items | Grid Load | Scroll FPS |
|-------|-----------|------------|
| 50 | < 1.5s | 60fps |
| 100 | < 2s | 60fps |
| 200 | < 3s | 55fps |
| 500+ | Virtual scroll | 60fps |

---

## TC-WARD-009: Item Detail View

### Test Steps
1. Navigate to Wardrobe
2. Tap any item
3. View detail screen
4. Interact with options

### Expected Results - Display
- [ ] Full-size image (swipe to zoom)
- [ ] All metadata displayed:
  - Category icon + name
  - Color swatch
  - Brand name
  - Size
  - Notes (if any)
  - Date added
- [ ] Edit and Delete actions accessible

### Expected Results - Actions
- [ ] Swipe left/right to navigate items
- [ ] Pinch to zoom on image
- [ ] Share button (if implemented)
- [ ] "Use in Outfit" button (if outfit creator exists)

---

## TC-WARD-010: Search/Filter Items

### Test Steps
1. Navigate to Wardrobe
2. Tap search bar
3. Type "Zara"
4. Clear search
5. Type "pink"

### Expected Results
- [ ] Search icon opens search bar
- [ ] Real-time filtering as typing
- [ ] Matches brand names
- [ ] Matches color names
- [ ] Matches category names
- [ ] "No results" state when empty
- [ ] Clear button (X) to reset

### Search Examples
| Query | Should Match |
|-------|--------------|
| "Zara" | All Zara items |
| "pink" | Items with pink color |
| "top" | Category: Tops |
| "summer" | Items with "summer" in notes |
| "m" | Size M (exact match) |

---

## Data Persistence Tests

| ID | Test | Expected Result |
|----|------|-----------------|
| TC-WARD-DATA-001 | App kill → reopen | All items present |
| TC-WARD-DATA-002 | Device restart | Items synced from cloud |
| TC-WARD-DATA-003 | Logout → Login | Items associated with user |
| TC-WARD-DATA-004 | New device login | Wardrobe syncs completely |
| TC-WARD-DATA-005 | Offline add → online | Item syncs when connected |

---

## Accessibility Tests

| ID | Test | Expected Result |
|----|------|-----------------|
| TC-WARD-A11Y-001 | Screen reader labels | All items labeled: "Pink Zara top, size M" |
| TC-WARD-A11Y-002 | Focus indicators | Clear focus ring on selected item |
| TC-WARD-A11Y-003 | Color contrast | Text readable on all backgrounds |
| TC-WARD-A11Y-004 | Touch targets | 44x44px minimum for all buttons |

---

## API Test Samples

```javascript
// GET wardrobe items
describe('GET /api/wardrobe', () => {
  test('returns user wardrobe', async () => {
    const res = await request(app)
      .get('/api/wardrobe')
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.status).toBe(200);
    expect(res.body.items).toBeArray();
    expect(res.body.count).toBeNumber();
    expect(res.body.limit).toBe(20); // Free tier
  });
});

// POST new item
describe('POST /api/wardrobe', () => {
  test('creates wardrobe item', async () => {
    const res = await request(app)
      .post('/api/wardrobe')
      .set('Authorization', `Bearer ${token}`)
      .field('category', 'tops')
      .field('color', '#FF6B9D')
      .attach('image', testImage);
    
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.thumbnailUrl).toBeDefined();
  });
});

// DELETE item
describe('DELETE /api/wardrobe/:id', () => {
  test('removes item', async () => {
    const res = await request(app)
      .delete(`/api/wardrobe/${itemId}`)
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
```

---

*Related Documents:*
- IMAGE-UPLOAD-TESTS.md (Image-specific tests)
- TEST-PLAN.md (Master test strategy)
- EDGE-CASES.md (Edge case scenarios)
