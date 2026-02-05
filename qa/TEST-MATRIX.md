# FashionTON Wardrobe - Device Testing Matrix

**Purpose**: Comprehensive cross-device and cross-platform testing coverage  
**Last Updated**: 2024

---

## Overview

This matrix defines the complete device and platform coverage required for FashionTON Wardrobe launch. Testing must be performed on physical devices where possible; simulators acceptable for lower priority configurations.

---

## iOS Devices

### High Priority (Must Test)

| Device | OS Version | Screen Size | Status | Notes |
|--------|------------|-------------|--------|-------|
| iPhone 15 Pro | iOS 17.x | 393×852 | ⏳ | Latest flagship, Dynamic Island |
| iPhone 14 | iOS 17.x | 390×844 | ⏳ | Standard size reference |

### Medium Priority (Should Test)

| Device | OS Version | Screen Size | Status | Notes |
|--------|------------|-------------|--------|-------|
| iPhone 12 | iOS 16.x | 390×844 | ⏳ | Older OS support |
| iPhone SE (3rd) | iOS 16.x | 375×667 | ⏳ | Small screen, Touch ID |

### Low Priority (Nice to Test)

| Device | OS Version | Screen Size | Status | Notes |
|--------|------------|-------------|--------|-------|
| iPhone X | iOS 15.x | 375×812 | ⏳ | Notch, older OS |
| iPhone 11 | iOS 16.x | 414×896 | ⏳ | Large screen |

### iOS Testing Notes

- **Dynamic Island**: Ensure no content hidden (iPhone 14 Pro+)
- **Notch**: Safe area insets respected
- **Home Indicator**: Bottom padding adequate
- **Dark Mode**: Test both light and dark themes
- **Text Size**: Test at 100% and 200%
- **Reduced Motion**: Verify app works with setting enabled

---

## Android Devices

### High Priority (Must Test)

| Device | OS Version | Screen Size | Status | Notes |
|--------|------------|-------------|--------|-------|
| Samsung Galaxy S24 | Android 14 | 384×824 dp | ⏳ | Popular flagship |
| Google Pixel 8 | Android 14 | 412×915 dp | ⏳ | Stock Android reference |

### Medium Priority (Should Test)

| Device | OS Version | Screen Size | Status | Notes |
|--------|------------|-------------|--------|-------|
| Samsung Galaxy A54 | Android 13 | 384×824 dp | ⏳ | Mid-range, popular |
| Xiaomi 13 | Android 13 | 393×873 dp | ⏳ | MIUI, different scaling |
| OnePlus 11 | Android 13 | 384×824 dp | ⏳ | OxygenOS |

### Low Priority (Nice to Test)

| Device | OS Version | Screen Size | Status | Notes |
|--------|------------|-------------|--------|-------|
| Samsung Galaxy S21 | Android 12 | 384×824 dp | ⏳ | Older OS version |
| Google Pixel 6a | Android 13 | 412×915 dp | ⏳ | Budget option |

### Android Testing Notes

- **System Navigation**: Test gesture and 3-button nav
- **Notch/Display Cutout**: Safe areas respected
- **Status Bar**: Height varies by OEM
- **Keyboard**: Different heights (Gboard, Samsung, SwiftKey)
- **Permissions**: Runtime permission flows
- **Back Button**: Hardware and gesture back

---

## Screen Size Categories

### Category Breakdown

| Category | Width Range | Example Devices | Priority |
|----------|-------------|-----------------|----------|
| **Small** | 320px - 375px | iPhone SE, older Android | High |
| **Medium** | 376px - 414px | iPhone 12/14, Pixel 8 | Critical |
| **Large** | 415px - 428px | iPhone 14 Pro Max | Medium |
| **Extra Large** | 429px+ | iPhone 15 Pro Max | Low |

### Width Testing Checklist

#### Small Screens (320px - 375px)
- [ ] Grid columns: 2 (wardrobe)
- [ ] Navigation touch targets adequate
- [ ] Text doesn't truncate excessively
- [ ] Modals fit within viewport
- [ ] No horizontal scroll

#### Medium Screens (376px - 414px) ⭐ Primary
- [ ] Grid columns: 3 (wardrobe)
- [ ] Optimal layout balance
- [ ] Images display clearly
- [ ] All CTAs visible without scroll

#### Large Screens (415px - 428px)
- [ ] Grid columns: 3 or 4
- [ ] Increased spacing acceptable
- [ ] No excessive whitespace
- [ ] Typography scales appropriately

---

## OS Version Coverage

### iOS Versions

| Version | Market Share | Support Status | Test Priority |
|---------|--------------|----------------|---------------|
| iOS 17.x | ~60% | Full support | Critical |
| iOS 16.x | ~30% | Full support | High |
| iOS 15.x | ~8% | Best effort | Medium |
| iOS 14.x | < 2% | Not supported | N/A |

### Android Versions

| Version | Market Share | Support Status | Test Priority |
|---------|--------------|----------------|---------------|
| Android 14 | ~25% | Full support | Critical |
| Android 13 | ~35% | Full support | Critical |
| Android 12 | ~20% | Full support | High |
| Android 11 | ~12% | Best effort | Medium |
| Android 10 | ~6% | Not supported | N/A |

---

## Telegram Client Versions

| Client | Version | Platform | Priority |
|--------|---------|----------|----------|
| Telegram iOS | 10.x+ | iOS | Critical |
| Telegram Android | 10.x+ | Android | Critical |
| Telegram Desktop | 4.x+ | macOS/Windows | Low |
| Telegram Web | Latest | Web | Low |
| Telegram macOS | 10.x+ | macOS | Low |

---

## Browser Engine Coverage

| Engine | Platform | WebView Version | Priority |
|--------|----------|-----------------|----------|
| WKWebView | iOS | iOS bundled | Critical |
| Chrome WebView | Android | 120+ | Critical |
| Chrome WebView | Android | 110-119 | High |

---

## Testing Scenarios by Device

### Camera/Photo Selection

| Device | Camera Access | Gallery Access | HEIC Support |
|--------|---------------|----------------|--------------|
| iPhone 15 Pro | ✅ | ✅ | ✅ |
| iPhone 14 | ✅ | ✅ | ✅ |
| iPhone SE | ✅ | ✅ | ✅ |
| Samsung S24 | ✅ | ✅ | ✅ |
| Pixel 8 | ✅ | ✅ | ❌ |
| Xiaomi 13 | ✅ | ✅ | ❌ |

### Performance Benchmarks by Device

| Device | Target Load | Critical Load | Notes |
|--------|-------------|---------------|-------|
| iPhone 15 Pro | < 1.5s | < 2s | High-end |
| iPhone 14 | < 2s | < 3s | Standard |
| iPhone SE | < 2.5s | < 4s | Older hardware |
| Samsung S24 | < 1.5s | < 2s | High-end |
| Samsung A54 | < 2.5s | < 4s | Mid-range |
| Xiaomi 13 | < 2s | < 3s | Varies by MIUI |

---

## Test Matrix Template

### Functional Testing

| Feature | iPhone 15 Pro | iPhone 14 | iPhone SE | S24 | Pixel 8 | A54 |
|---------|---------------|-----------|-----------|-----|---------|-----|
| Image Upload | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Wardrobe Grid | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Category Filter | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Size Calculator | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Challenges | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| TON Payment | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Leaderboard | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |

### UI/UX Testing

| Check | iPhone 15 Pro | iPhone 14 | iPhone SE | S24 | Pixel 8 | A54 |
|-------|---------------|-----------|-----------|-----|---------|-----|
| Safe Areas | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Dark Mode | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Font Scaling | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Touch Targets | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Scroll Performance | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Loading States | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |

---

## Accessibility Testing Matrix

| Feature | VoiceOver (iOS) | TalkBack (Android) | Switch Control |
|---------|-----------------|-------------------|----------------|
| Navigation | ⏳ | ⏳ | ⏳ |
| Image Upload | ⏳ | ⏳ | ⏳ |
| Form Labels | ⏳ | ⏳ | ⏳ |
| Error Messages | ⏳ | ⏳ | ⏳ |
| Focus Management | ⏳ | ⏳ | ⏳ |

---

## Network Condition Testing

| Condition | iOS | Android | Test Cases |
|-----------|-----|---------|------------|
| WiFi (Fast) | ⏳ | ⏳ | All features |
| 4G LTE | ⏳ | ⏳ | Upload, payments |
| 3G | ⏳ | ⏳ | Graceful degradation |
| 2G/Edge | ⏳ | ⏳ | Timeout handling |
| Offline | ⏳ | ⏳ | Error states |
| Intermittent | ⏳ | ⏳ | Retry logic |

---

## Testing Tools

### Physical Device Testing
- **BrowserStack**: Cloud device access
- **Sauce Labs**: Cross-browser testing
- **AWS Device Farm**: Automated device testing

### Local Testing
- **iOS Simulator**: Xcode
- **Android Emulator**: Android Studio
- **Chrome DevTools**: Responsive mode

### Telegram-Specific
- **BotFather**: Test bot configuration
- **Telegram Web App Tester**: Debug mode

---

## Sign-off Criteria

| Priority | Required Pass Rate | Devices |
|----------|-------------------|---------|
| Critical | 100% | iPhone 14, iPhone 15 Pro, S24, Pixel 8 |
| High | 95% | iPhone 12, iPhone SE, A54 |
| Medium | 90% | Other tested devices |

---

## Device Testing Checklist

Before launch, verify:

- [ ] All critical devices tested
- [ ] All high priority devices tested
- [ ] iOS 16+ compatibility verified
- [ ] Android 12+ compatibility verified
- [ ] Screen sizes 320px-428px covered
- [ ] Dark mode tested on all platforms
- [ ] Accessibility features tested
- [ ] Performance targets met on all critical devices
- [ ] No critical bugs on any device

---

*Related Documents:*
- TEST-PLAN.md (Master test strategy)
- PERFORMANCE-BENCHMARKS.md (Speed targets by device)
