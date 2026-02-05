# FashionTON Wardrobe - Authentication Test Cases

**Priority**: 🔴 Critical (Security Foundation)  
**Last Updated**: 2024

---

## Test Suite Overview

| ID | Test Name | Priority | Status |
|----|-----------|----------|--------|
| TC-AUTH-001 | Telegram WebApp Initialization | Critical | ⏳ |
| TC-AUTH-002 | User Data Retrieval | Critical | ⏳ |
| TC-AUTH-003 | Session Management | Critical | ⏳ |
| TC-AUTH-004 | Session Expiration | High | ⏳ |
| TC-AUTH-005 | Logout Flow | High | ⏳ |
| TC-AUTH-006 | Token Validation | Critical | ⏳ |
| TC-AUTH-007 | Concurrent Sessions | Medium | ⏳ |
| TC-AUTH-008 | Auth Failure Handling | High | ⏳ |

---

## TC-AUTH-001: Telegram WebApp Initialization

### Pre-conditions
- Telegram app installed
- Bot @FashionTONbot configured
- User has Telegram account

### Test Steps
1. Open Telegram
2. Find @FashionTONbot
3. Tap "Start" or menu button
4. Mini App launches

### Expected Results
- [ ] WebApp opens within 2 seconds
- [ ] Telegram native loading spinner shown
- [ ] MainButton (if configured) appears
- [ ] BackButton appears (if applicable)
- [ ] Theme params received (color scheme)

### WebApp Parameters Received
```javascript
{
  initData: "query_id=...&user=...&auth_date=...&hash=...",
  initDataUnsafe: {
    user: {
      id: 123456789,
      first_name: "Jane",
      last_name: "Doe",
      username: "janedoe",
      language_code: "en"
    },
    auth_date: 1234567890,
    hash: "..."
  },
  platform: "ios", // or android, web, etc.
  colorScheme: "light", // or dark
  themeParams: { ... }
}
```

### Platform Detection
| Platform | Expected Behavior |
|----------|-------------------|
| iOS | iOS-style UI, safe area insets |
| Android | Material-style UI, back button support |
| Web | Fallback for desktop Telegram |
| macOS | Desktop-optimized layout |

---

## TC-AUTH-002: User Data Retrieval

### Test Steps
1. Launch Mini App
2. Observe initial loading state
3. Wait for auth completion

### Expected Results
- [ ] User ID retrieved from Telegram
- [ ] User profile data loaded:
  - First name
  - Last name (if available)
  - Username (if available)
  - Profile photo URL (if available)
- [ ] Account created in database (first visit)
- [ ] Existing data loaded (returning user)

### First-Time User Flow
```
1. Telegram auth → User ID: 123456789
2. Check database → User not found
3. Create user record
4. Initialize empty wardrobe
5. Show onboarding (if applicable)
```

### Returning User Flow
```
1. Telegram auth → User ID: 123456789
2. Check database → User found
3. Load user profile
4. Load wardrobe data
5. Show main app
```

---

## TC-AUTH-003: Session Management

### Test Steps
1. Authenticate successfully
2. Use app for 5 minutes
3. Background the app (switch apps)
4. Return to app
5. Kill and reopen app

### Expected Results
- [ ] Session token generated on auth
- [ ] Token stored securely (memory, not localStorage for sensitive)
- [ ] API requests include auth token
- [ ] Background/resume: session valid
- [ ] Reopen: new auth via Telegram (seamless)

### Token Storage
| Data | Storage | Reason |
|------|---------|--------|
| Telegram initData | Memory only | Security - contains hash |
| Session JWT | Memory preferred | Short-lived sessions |
| User ID | Can persist | Non-sensitive |

---

## TC-AUTH-004: Session Expiration

### Test Steps
1. Authenticate successfully
2. Wait for session expiry (or simulate)
3. Attempt API call

### Expected Results
- [ ] Expired session detected (401 response)
- [ ] Automatic re-auth attempted
- [ ] If successful: seamless continuation
- [ ] If failed: show login prompt

### Expiration Scenarios
| Scenario | Expected Behavior |
|----------|-------------------|
| JWT expired (1 hour) | Silent refresh via Telegram |
| Long inactive (> 24h) | Re-authentication required |
| Server restart | Users re-authenticate on next action |

---

## TC-AUTH-005: Logout Flow

### Test Steps
1. Navigate to Settings/Profile
2. Tap "Logout"
3. Confirm logout

### Expected Results
- [ ] Confirmation dialog shown
- [ ] On confirm:
  - Session token invalidated
  - Local data cleared (except cache)
  - User returned to Telegram chat
- [ ] Or: App closes (Mini App behavior)

### Data Cleanup
| Data | Action |
|------|--------|
| Session token | Delete |
| User preferences | Delete |
| Cached images | Keep (non-sensitive) |
| Draft uploads | Delete |

---

## TC-AUTH-006: Token Validation

### Security Tests

| ID | Test | Expected Result |
|----|------|-----------------|
| TC-AUTH-SEC-001 | Invalid hash | Rejected, error logged |
| TC-AUTH-SEC-002 | Expired initData | Rejected (auth_date too old) |
| TC-AUTH-SEC-003 | Tampered user ID | Hash validation fails |
| TC-AUTH-SEC-004 | Replay attack | Same initData rejected if reused |
| TC-AUTH-SEC-005 | Missing hash | Request rejected |

### Hash Validation
```javascript
// Server-side validation
const validateTelegramAuth = (initData) => {
  const secret = crypto.createHmac('sha256', 'WebAppData')
    .update(BOT_TOKEN).digest();
  
  const checkString = Object.keys(data)
    .filter(k => k !== 'hash')
    .sort()
    .map(k => `${k}=${data[k]}`)
    .join('\n');
  
  const hash = crypto.createHmac('sha256', secret)
    .update(checkString).digest('hex');
  
  return hash === data.hash;
};
```

---

## TC-AUTH-007: Concurrent Sessions

### Test Steps
1. Open Mini App on Device A
2. Open Mini App on Device B (same Telegram account)
3. Perform actions on both

### Expected Results
- [ ] Both sessions valid independently
- [ ] Data syncs across devices
- [ ] No session conflicts
- [ ] Last write wins for edits

---

## TC-AUTH-008: Auth Failure Handling

### Failure Scenarios

| Scenario | User Experience |
|----------|-----------------|
| Network offline | "No connection. Check your internet." |
| Telegram API error | "Authentication failed. Please retry." |
| Bot misconfiguration | Error page with contact support |
| Invalid initData | "Security check failed. Restart app." |
| Server error (500) | "Something went wrong. Try again." |

### Error Recovery
- [ ] Retry button on all errors
- [ ] Auto-retry on network errors (3 attempts)
- [ ] Clear error messages
- [ ] Option to report issue

---

## Authentication State Machine

```
┌─────────────┐
│    IDLE     │
└──────┬──────┘
       │ Open Mini App
       ▼
┌─────────────┐
│ INITIALIZING│
└──────┬──────┘
       │ Telegram auth
       ▼
┌─────────────┐     ┌─────────────┐
│AUTHENTICATED│────▶│   LOADING   │
└──────┬──────┘     │   (data)    │
       │            └──────┬──────┘
       │                   │
       │                   ▼
       │            ┌─────────────┐
       │            │    READY    │
       │            └─────────────┘
       │ Logout / Expire
       ▼
┌─────────────┐
│  LOGGED OUT │
└─────────────┘
```

---

## API Authentication Tests

```javascript
describe('Authentication', () => {
  test('valid Telegram auth creates session', async () => {
    const initData = generateValidInitData();
    
    const res = await request(app)
      .post('/api/auth/telegram')
      .send({ initData });
    
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.id).toBeDefined();
  });
  
  test('invalid hash rejected', async () => {
    const initData = generateTamperedInitData();
    
    const res = await request(app)
      .post('/api/auth/telegram')
      .send({ initData });
    
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid authentication');
  });
  
  test('expired initData rejected', async () => {
    const initData = generateExpiredInitData();
    
    const res = await request(app)
      .post('/api/auth/telegram')
      .send({ initData });
    
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Authentication expired');
  });
  
  test('protected route requires auth', async () => {
    const res = await request(app)
      .get('/api/wardrobe');
    
    expect(res.status).toBe(401);
  });
});
```

---

## Auth Testing Checklist

- [ ] Test on iOS Telegram
- [ ] Test on Android Telegram
- [ ] Test on Telegram Desktop (web behavior)
- [ ] Test with new Telegram user
- [ ] Test with existing user
- [ ] Test after Telegram app update
- [ ] Test with slow network
- [ ] Test with airplane mode
- [ ] Verify hash validation server-side
- [ ] Test session expiration
- [ ] Verify no sensitive data in localStorage

---

*Related Documents:*
- TEST-PLAN.md (Master test strategy)
- SECURITY-AUDIT.md (Security deep dive)
- EDGE-CASES.md (Auth edge cases)
