# FashionTON Wardrobe - Image Upload Test Cases

**Priority**: 🔴 Critical (Core Feature)  
**Last Updated**: 2024

---

## Test Suite Overview

| ID | Test Name | Priority | Status |
|----|-----------|----------|--------|
| TC-IMG-001 | Upload Valid Image (JPG) | Critical | ⏳ |
| TC-IMG-002 | Upload Valid Image (PNG) | Critical | ⏳ |
| TC-IMG-003 | Upload iPhone HEIC Photo | High | ⏳ |
| TC-IMG-004 | Large File Handling (>10MB) | High | ⏳ |
| TC-IMG-005 | Invalid File Type Rejection | Critical | ⏳ |
| TC-IMG-006 | Network Interruption Recovery | High | ⏳ |
| TC-IMG-007 | Background Removal | Medium | ⏳ |
| TC-IMG-008 | Thumbnail Generation | High | ⏳ |
| TC-IMG-009 | Multiple Concurrent Uploads | Medium | ⏳ |
| TC-IMG-010 | App Kill During Upload | High | ⏳ |

---

## TC-IMG-001: Upload Valid Image (JPG)

### Pre-conditions
- User authenticated via Telegram
- Camera/gallery permissions granted
- Network connection stable

### Test Steps
1. Navigate to Wardrobe tab
2. Tap "+" (Add Item) button
3. Select "Take Photo" or "Choose from Gallery"
4. Select a JPG image (1-5MB, 1080x1080)
5. Choose category: "Tops"
6. Add details:
   - Color: Pink (#FF6B9D)
   - Brand: Zara
   - Size: M
7. Tap "Save"

### Expected Results
- [ ] Upload progress indicator displayed
- [ ] Progress updates smoothly (0% → 100%)
- [ ] Image uploads successfully
- [ ] Thumbnail generated and displayed
- [ ] Item appears in wardrobe grid within 3 seconds
- [ ] Full-size image accessible via tap
- [ ] Success toast notification shown

### Pass Criteria
All expected results met within 3 seconds

---

## TC-IMG-002: Upload Valid Image (PNG)

### Pre-conditions
- Same as TC-IMG-001

### Test Steps
1. Navigate to Wardrobe tab
2. Tap "+" button
3. Select PNG image with transparency (2-8MB)
4. Choose category: "Dresses"
5. Add color: Blue (#0088CC)
6. Tap "Save"

### Expected Results
- [ ] PNG transparency preserved in display
- [ ] Upload completes successfully
- [ ] Thumbnail generated (transparency → white background)
- [ ] Item appears in wardrobe grid

### Pass Criteria
All expected results met, transparency handled correctly

---

## TC-IMG-003: Upload iPhone HEIC Photo

### Pre-conditions
- iOS device (iPhone 12+)
- HEIC image captured with camera

### Test Steps
1. On iPhone, open FashionTON
2. Navigate to Wardrobe tab
3. Tap "+" button
4. Select "Photo Library"
5. Choose HEIC image (iPhone native format)
6. Complete item details
7. Tap "Save"

### Expected Results
- [ ] HEIC format accepted OR automatically converted
- [ ] If converted: no quality loss visible
- [ ] Upload progress shown
- [ ] Item saved successfully
- [ ] Image displays correctly in grid

### Edge Cases
- [ ] iOS Live Photo (should extract still frame)
- [ ] iCloud-stored HEIC (should download first)

---

## TC-IMG-004: Large File Handling (>10MB)

### Pre-conditions
- Image file > 10MB (e.g., 16MP camera photo)

### Test Steps
1. Navigate to Wardrobe
2. Tap "+" button
3. Select large image file (12MB, 4000x3000)
4. Add item details
5. Tap "Save"

### Expected Results (Option A: Client-Side Compression)
- [ ] Compression dialog shown
- [ ] Image compressed to < 5MB before upload
- [ ] Upload proceeds normally
- [ ] Quality acceptable (no visible pixelation)

### Expected Results (Option B: Server-Side Handling)
- [ ] Upload accepted
- [ ] Server processes large file
- [ ] Response within 5 seconds
- [ ] Multiple sizes generated

### Expected Results (Option C: Rejection)
- [ ] Clear error message: "Image too large (max 10MB)"
- [ ] Suggestion: "Try cropping or using a smaller image"
- [ ] User can select different image

---

## TC-IMG-005: Invalid File Type Rejection

### Pre-conditions
- Files: PDF, GIF, BMP, TIFF, .exe, .zip

### Test Steps
1. Navigate to Wardrobe
2. Tap "+" button
3. Attempt to select invalid file type

### Expected Results
- [ ] File picker filters non-image types (iOS/Android native)
- [ ] If selected via other means: error shown
- [ ] Error message: "Please select JPG, PNG, or HEIC"
- [ ] No upload attempted
- [ ] User returned to selection screen

### Test Data
| File Type | Expected Behavior |
|-----------|-------------------|
| photo.pdf | Rejected with error |
| image.gif | Rejected (no GIF support) |
| doc.exe | Rejected (security) |
| archive.zip | Rejected |
| vector.svg | Rejected (convert to PNG first) |

---

## TC-IMG-006: Network Interruption Recovery

### Pre-conditions
- Network connection initially stable
- Image selected and upload started

### Test Steps
1. Start image upload (progress at 30%)
2. Enable airplane mode / disconnect WiFi
3. Wait 10 seconds
4. Reconnect network

### Expected Results
- [ ] Error toast: "Upload failed - network error"
- [ ] Retry button available
- [ ] Item NOT added to wardrobe (incomplete)
- [ ] On retry: upload resumes or restarts
- [ ] If resume: progress continues from last point
- [ ] If restart: progress resets to 0%

### Critical Check
- No duplicate items created on retry

---

## TC-IMG-007: Background Removal

### Pre-conditions
- Premium user (or feature enabled)
- Background removal API configured

### Test Steps
1. Navigate to Wardrobe
2. Tap "+" button
3. Select photo with busy background
4. Enable "Remove Background" option
5. Tap "Save"

### Expected Results
- [ ] Processing indicator shown
- [ ] Background removed within 5 seconds
- [ ] Subject isolated cleanly
- [ ] Transparent background (PNG output)
- [ ] Item displays on app background

### Quality Checks
- [ ] Hair/fur edges handled
- [ ] No background artifacts
- [ ] Subject fully preserved

---

## TC-IMG-008: Thumbnail Generation

### Pre-conditions
- Image upload successful

### Test Steps
1. Upload full-size image (2000x2000)
2. Navigate to wardrobe grid
3. Tap item to view detail

### Expected Results
- [ ] Grid thumbnail: 300x300px generated
- [ ] Detail view: 800x800px version loaded
- [ ] Full image: Original available on request
- [ ] Progressive loading (blur → sharp)
- [ ] All thumbnails cached

### Performance Targets
| Image Size | Thumbnail Time |
|------------|----------------|
| 1MB | < 1s |
| 5MB | < 2s |
| 10MB | < 3s |

---

## TC-IMG-009: Multiple Concurrent Uploads

### Pre-conditions
- 3-5 images selected for batch upload

### Test Steps
1. Navigate to Wardrobe
2. Tap "+" button
3. Select multiple photos (batch mode)
4. Add details for each
5. Tap "Save All"

### Expected Results
- [ ] All uploads queued
- [ ] Progress shown per image
- [ ] Parallel processing (max 3 concurrent)
- [ ] All items appear in wardrobe
- [ ] Individual success/failure per image
- [ ] If one fails: others continue

---

## TC-IMG-010: App Kill During Upload

### Pre-conditions
- Upload in progress (50%)

### Test Steps
1. Start image upload
2. While uploading: kill app (swipe away)
3. Reopen app

### Expected Results
- [ ] Upload terminated server-side after timeout
- [ ] No partial/corrupt data saved
- [ ] User can retry upload
- [ ] No duplicate items on retry

---

## Image Security Tests

| ID | Test | Expected Result |
|----|------|-----------------|
| TC-IMG-SEC-001 | EXIF data stripped | No location/camera metadata in stored image |
| TC-IMG-SEC-002 | NSFW detection | Inappropriate content blocked with warning |
| TC-IMG-SEC-003 | Signed URLs | All image URLs signed and time-limited |
| TC-IMG-SEC-004 | Direct URL access | Images not accessible without auth |

---

## Error Message Validation

| Scenario | Expected Message |
|----------|------------------|
| No file selected | "Please select an image" |
| File too large | "Image too large (max 10MB)" |
| Invalid format | "Please use JPG, PNG, or HEIC" |
| Network error | "Upload failed. Check connection and retry" |
| Server error | "Something went wrong. Please try again" |
| Storage full | "Storage limit reached. Upgrade or delete items" |

---

## Automation Candidates

```javascript
// Example API test for image upload
const uploadTest = async () => {
  const formData = new FormData();
  formData.append('image', testImageJpg);
  formData.append('category', 'tops');
  formData.append('color', '#FF6B9D');
  
  const response = await fetch('/api/wardrobe', {
    method: 'POST',
    body: formData,
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  
  assert(response.status === 200);
  assert(response.data.thumbnailUrl);
  assert(response.data.id);
};
```

---

*Related Documents:*
- TEST-PLAN.md (Master test strategy)
- EDGE-CASES.md (Edge case scenarios)
- PERFORMANCE-BENCHMARKS.md (Speed targets)
