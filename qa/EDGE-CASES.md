# FashionTON Wardrobe - Edge Cases Documentation

**Purpose**: Comprehensive edge case scenarios for robust testing  
**Last Updated**: 2024

---

## Table of Contents
1. [Image Upload Edge Cases](#image-upload-edge-cases)
2. [API Timeout Scenarios](#api-timeout-scenarios)
3. [Concurrent User Actions](#concurrent-user-actions)
4. [Data Corruption Recovery](#data-corruption-recovery)
5. [Network Edge Cases](#network-edge-cases)
6. [Device-Specific Edge Cases](#device-specific-edge-cases)

---

## Image Upload Edge Cases

### EC-IMG-001: Zero-Byte Image File
**Scenario**: User selects corrupted 0-byte file  
**Expected Behavior**: 
- Rejected with clear error: "Invalid image file"
- Upload not attempted
- No server resources consumed

### EC-IMG-002: Maximum Resolution Image
**Scenario**: 100+ megapixel image (e.g., 12000x9000)  
**Expected Behavior**:
- Client-side resize to max 4096x4096 before upload
- Or: Server rejects with "Image too large" message
- Memory usage remains stable

### EC-IMG-003: CMYK Color Space
**Scenario**: Professional print JPG in CMYK  
**Expected Behavior**:
- Automatically converted to RGB
- Or: Rejected with conversion suggestion
- No rendering issues

### EC-IMG-004: Image with Malicious EXIF
**Scenario**: Image with XSS in EXIF metadata  
**Expected Behavior**:
- All EXIF stripped server-side
- No script execution possible
- Safe to display

### EC-IMG-005: Animated WebP/APNG
**Scenario**: User tries to upload animated image  
**Expected Behavior**:
- First frame extracted
- Or: Rejected "Animated images not supported"
- No animation plays in app

### EC-IMG-006: Image Filename Injection
**Scenario**: File named `../../../etc/passwd.jpg`  
**Expected Behavior**:
- Filename sanitized server-side
- Stored with UUID or safe name
- No path traversal possible

### EC-IMG-007: Rapid Fire Uploads
**Scenario**: User taps save 10 times quickly  
**Expected Behavior**:
- Debounce prevents duplicate uploads
- Only one item created
- UI shows "Saving..." to prevent retries

### EC-IMG-008: Storage Provider Outage
**Scenario**: Cloudinary/S3 unavailable  
**Expected Behavior**:
- Graceful error message
- Retry queue for later
- No data loss

---

## API Timeout Scenarios

### EC-API-001: Slow Image Processing
**Scenario**: Background removal takes > 30s  
**Expected Behavior**:
- Async processing initiated
- User sees "Processing..." status
- Item added with placeholder
- Updates when complete (WebSocket/poll)

### EC-API-002: Database Connection Timeout
**Scenario**: Vercel KV temporarily unavailable  
**Expected Behavior**:
- Retry with exponential backoff
- Circuit breaker prevents cascade
- User-friendly error: "Service temporarily unavailable"

### EC-API-003: Payment Verification Delay
**Scenario**: TON blockchain confirmation > 5 minutes  
**Expected Behavior**:
- Status: "Awaiting confirmation"
- Polling continues in background
- User can browse other features
- Notification when confirmed

### EC-API-004: Cold Start Delay
**Scenario**: Serverless function cold start (3-5s)  
**Expected Behavior**:
- Loading state shown
- Request eventually succeeds
- Warm instances for critical paths

### EC-API-005: Rate Limiting Triggered
**Scenario**: User exceeds 100 requests/minute  
**Expected Behavior**:
- 429 Too Many Requests
- Retry-After header
- Exponential backoff in client

---

## Concurrent User Actions

### EC-CON-001: Simultaneous Edit
**Scenario**: User A and User B edit same challenge entry  
**Expected Behavior**:
- Last write wins
- Or: Optimistic locking with conflict warning
- No data corruption

### EC-CON-002: Vote While Counting
**Scenario**: User votes as challenge ends and prizes calculate  
**Expected Behavior**:
- Vote accepted if before timestamp
- Or: Rejected with "Challenge ended"
- Prize calculation uses consistent snapshot

### EC-CON-003: Double Payment Submission
**Scenario**: User double-taps pay button  
**Expected Behavior**:
- Idempotency key prevents duplicate
- Only one transaction created
- Clear confirmation shown

### EC-CON-004: Upload While Deleting
**Scenario**: User deletes item while new upload in progress  
**Expected Behavior**:
- Delete queued after upload completes
- Or: Upload canceled, delete proceeds
- Consistent final state

### EC-CON-005: Rapid Category Filter Switching
**Scenario**: User rapidly taps Tops → Bottoms → Shoes → All  
**Expected Behavior**:
- Debounce/abort previous requests
- Show latest filter result
- No flickering or incorrect data

---

## Data Corruption Recovery

### EC-DATA-001: Corrupted Image Metadata
**Scenario**: Database record has invalid image URL  
**Expected Behavior**:
- Placeholder shown for missing image
- Error logged for admin review
- User can delete/re-upload item

### EC-DATA-002: Partial Upload Record
**Scenario**: Server crash during item creation  
**Expected Behavior**:
- Orphan detection job runs periodically
- Incomplete records cleaned up
- Storage orphaned images purged

### EC-DATA-003: Invalid JSON in Storage
**Scenario**: KV store has malformed user data  
**Expected Behavior**:
- Try-catch with default fallback
- Reset to valid state
- Log error for investigation

### EC-DATA-004: Category Enum Violation
**Scenario**: Item saved with category "invalid_category"  
**Expected Behavior**:
- Validation rejects at API level
- Or: Defaults to "uncategorized"
- No app crash on render

### EC-DATA-005: Clock Skew Issues
**Scenario**: User device clock is 1 day ahead  
**Expected Behavior**:
- Use server time for all timestamps
- Client time only for display formatting
- No challenge timing exploits

---

## Network Edge Cases

### EC-NET-001: Intermittent Connection
**Scenario**: Connection drops every 5 seconds  
**Expected Behavior**:
- Retry with exponential backoff
- Queue non-critical operations
- Show connection status indicator

### EC-NET-002: Very Slow Connection (2G)
**Scenario**: 100kbps connection speed  
**Expected Behavior**:
- Progressive image loading (blur-up)
- Cancelable requests
- Timeout after 30 seconds

### EC-NET-003: Captive Portal
**Scenario**: User on airport WiFi (captive portal)  
**Expected Behavior**:
- Detect non-200 responses
- Show "Internet connection required"
- Don't cache portal HTML as data

### EC-NET-004: IPv6 Only Network
**Scenario**: Network without IPv4  
**Expected Behavior**:
- All services support IPv6
- Or: IPv4 tunnel works
- No connection issues

### EC-NET-005: VPN/Proxy
**Scenario**: User behind corporate proxy  
**Expected Behavior**:
- Standard HTTPS works
- WebSocket connections succeed
- No IP-based blocking issues

---

## Device-Specific Edge Cases

### EC-DEV-001: Low Memory Device
**Scenario**: iPhone with < 100MB RAM available  
**Expected Behavior**:
- Image cache limited
- No large memory allocations
- Graceful degradation (lower res)

### EC-DEV-002: Low Storage Device
**Scenario**: Android with < 500MB free  
**Expected Behavior**:
- Minimal local caching
- Stream instead of download
- Warn if storage critical

### EC-DEV-003: Split-Screen Mode
**Scenario**: Android split-screen with another app  
**Expected Behavior**:
- Responsive layout adapts
- Minimum 320px width supported
- No layout breaks

### EC-DEV-004: Orientation Change During Upload
**Scenario**: User rotates phone while uploading  
**Expected Behavior**:
- Upload continues uninterrupted
- UI adapts to new orientation
- Progress preserved

### EC-DEV-005: Battery Saver Mode
**Scenario**: iOS Low Power Mode active  
**Expected Behavior**:
- Reduce background polling
- Lower animation frame rate
- Still fully functional

### EC-DEV-006: Accessibility Text Size Maximum
**Scenario**: iOS text size at 310%  
**Expected Behavior**:
- All text visible
- Layout doesn't break
- Scrollable content areas

### EC-DEV-007: Screen Reader Active
**Scenario**: VoiceOver/TalkBack enabled  
**Expected Behavior**:
- All interactive elements labeled
- Image descriptions provided
- Logical navigation order

### EC-DEV-008: Reduced Motion Enabled
**Scenario**: User prefers reduced motion  
**Expected Behavior**:
- Disable parallax effects
- Instant transitions instead of animated
- No vestibular triggers

---

## TON Payment Edge Cases

### EC-TON-001: Wallet Disconnect Mid-Transaction
**Scenario**: User disconnects wallet while confirming  
**Expected Behavior**:
- Transaction canceled
- No funds deducted
- Clear error shown

### EC-TON-002: Insufficient Balance (Exact Amount)
**Scenario**: User has exactly 10 TON, tries to send 10 TON  
**Expected Behavior**:
- Rejected: insufficient for gas
- Message: "Need ~0.05 TON for network fee"

### EC-TON-003: Invalid Address Format
**Scenario**: Malformed TON address entered  
**Expected Behavior**:
- Client-side validation
- Error before transaction created
- Clear format guidance

### EC-TON-004: Transaction Timeout
**Scenario**: User doesn't confirm in 10 minutes  
**Expected Behavior**:
- Transaction expires
- ValidUntil enforced
- Can retry with fresh transaction

---

## Recovery Procedures

### Image Upload Recovery
```
1. Detect failure (timeout/error)
2. Save form state locally
3. Allow user to retry
4. On success: clear local state
5. On cancel: keep draft for later
```

### Payment Recovery
```
1. Check transaction status on-chain
2. If pending: wait/notify
3. If failed: allow retry
4. If success but webhook missed: manual verify
5. Update user balance accordingly
```

### Data Sync Recovery
```
1. Detect sync conflict
2. Show both versions to user
3. Allow manual merge
4. Or: server timestamp wins
5. Log conflict for review
```

---

## Edge Case Testing Matrix

| Edge Case | Likelihood | Impact | Test Priority |
|-----------|------------|--------|---------------|
| Zero-byte image | Low | Medium | Medium |
| API timeout | Medium | High | High |
| Concurrent edits | Medium | Medium | Medium |
| Network intermittent | High | Medium | High |
| Double payment | Low | Critical | High |
| Data corruption | Low | High | Medium |
| Low memory | Medium | Medium | Medium |
| Clock skew | Low | Medium | Low |

---

*Related Documents:*
- TEST-PLAN.md (Master test strategy)
- IMAGE-UPLOAD-TESTS.md (Image-specific tests)
- TON-PAYMENT-TESTS.md (Payment edge cases)
