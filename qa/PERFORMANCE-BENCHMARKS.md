# FashionTON Wardrobe - Performance Benchmarks

**Purpose**: Define measurable performance targets for launch readiness  
**Last Updated**: 2024

---

## Overview

FashionTON Wardrobe targets fashion-conscious mobile users who expect instant, Instagram-like experiences. These benchmarks ensure the app feels fast, responsive, and premium.

---

## Load Time Targets

### App Initialization

| Metric | Target | Critical | Measurement |
|--------|--------|----------|-------------|
| **First Paint** | < 1.0s | < 1.5s | First pixel rendered |
| **First Contentful Paint** | < 1.5s | < 3.0s | First content visible |
| **Time to Interactive** | < 2.5s | < 5.0s | App responds to input |
| **Wardrobe Grid Visible** | < 2.0s | < 4.0s | Items displayed |

### Image Upload Performance

| Image Size | Target | Critical | Includes |
|------------|--------|----------|----------|
| **1 MB** | < 3s | < 5s | Upload + thumbnail |
| **5 MB** | < 5s | < 8s | Upload + thumbnail |
| **10 MB** | < 8s | < 12s | Upload + processing |
| **HEIC conversion** | +2s | +4s | Additional processing |

### Navigation Performance

| Navigation | Target | Critical | Notes |
|------------|--------|----------|-------|
| **Tab switch** | < 300ms | < 500ms | Instant feel |
| **Page transition** | < 400ms | < 700ms | With animation |
| **Modal open** | < 200ms | < 400ms | No perceived delay |
| **Back navigation** | < 200ms | < 400ms | Instant restore |

---

## API Response Targets

### Core Endpoints

| Endpoint | Target | Critical | Notes |
|----------|--------|----------|-------|
| **User auth** | < 500ms | < 1s | Telegram validation |
| **Wardrobe list** | < 300ms | < 1s | 20 items |
| **Wardrobe list (cached)** | < 100ms | < 200ms | Local data |
| **Add item** | < 1s | < 2s | Including storage |
| **Delete item** | < 300ms | < 1s | Soft delete |
| **Update item** | < 300ms | < 1s | Metadata only |

### Challenge System

| Endpoint | Target | Critical | Notes |
|----------|--------|----------|-------|
| **Current challenge** | < 500ms | < 1s | With entries |
| **Submit entry** | < 1s | < 2s | Upload + save |
| **Vote** | < 200ms | < 500ms | Instant feedback |
| **Leaderboard** | < 500ms | < 1s | Top 100 |
| **Leaderboard (scroll)** | < 300ms | < 1s | Pagination |

### Size Calculator & Payments

| Endpoint | Target | Critical | Notes |
|----------|--------|----------|-------|
| **Size calculation** | < 1s | < 3s | AI/algorithm |
| **TON payment verify** | < 2s | < 5s | Blockchain |
| **Wallet connection** | < 3s | < 5s | TON Connect |

---

## Animation Performance Targets

### Frame Rate Requirements

| Animation | Target FPS | Minimum FPS | Notes |
|-----------|------------|-------------|-------|
| **Scroll (wardrobe)** | 60fps | 30fps | Smooth feel |
| **Page transitions** | 60fps | 30fps | Premium experience |
| **Modal animations** | 60fps | 30fps | No jank |
| **Loading spinners** | 60fps | 30fps | Consistent |
| **Image zoom** | 60fps | 30fps | Pinch/pan |
| **Pull-to-refresh** | 60fps | 30fps | Fluid motion |

### Animation Durations

| Animation | Duration | Easing |
|-----------|----------|--------|
| **Modal open** | 250ms | ease-out |
| **Modal close** | 200ms | ease-in |
| **Page transition** | 300ms | ease-in-out |
| **Toast display** | 300ms | ease-out |
| **Toast hide** | 200ms | ease-in |
| **Button press** | 100ms | ease |
| **Success checkmark** | 500ms | ease-out |

---

## Memory Usage Limits

### JavaScript Heap

| State | Target | Critical | Notes |
|-------|--------|----------|-------|
| **Initial load** | < 30MB | < 50MB | After initialization |
| **Wardrobe (20 items)** | < 50MB | < 80MB | With thumbnails |
| **Wardrobe (100 items)** | < 80MB | < 120MB | Virtual scroll recommended |
| **Challenge (100 entries)** | < 60MB | < 100MB | Images optimized |
| **Peak usage** | < 100MB | < 150MB | During upload |

### Image Cache

| Cache Type | Target Size | Eviction Strategy |
|------------|-------------|-------------------|
| **Thumbnails** | < 20MB | LRU, max 100 items |
| **Full images** | < 30MB | LRU, max 20 items |
| **Total image cache** | < 50MB | Age-based cleanup |

### Memory Leak Detection

| Scenario | Memory Growth | Action |
|----------|---------------|--------|
| Navigate tabs 10x | < 5MB | Acceptable |
| Upload 10 images | < 20MB temporary | Should GC |
| Scroll wardrobe 5min | < 10MB | Acceptable |
| Background 5min | Should decrease | Release resources |

---

## Network Performance

### Bandwidth Optimization

| Resource | Target | Method |
|----------|--------|--------|
| **Initial bundle** | < 300KB | Code splitting |
| **Lazy chunks** | < 100KB each | Route splitting |
| **Thumbnails** | < 50KB each | WebP, 300x300 |
| **Full images** | < 500KB each | Progressive JPEG |
| **API responses** | < 10KB typical | JSON compression |

### Request Optimization

| Metric | Target | Implementation |
|--------|--------|----------------|
| **Concurrent requests** | Max 6 | HTTP/2 or queue |
| **Duplicate requests** | 0 | Request deduplication |
| **Prefetching** | Smart | Route-based prefetch |
| **CDN cache hit** | > 90% | Aggressive caching |

### Offline Support

| Feature | Offline Behavior |
|---------|------------------|
| **Wardrobe view** | Show cached data |
| **Image display** | Show cached thumbnails |
| **Add item** | Queue for upload |
| **Edit item** | Queue for sync |
| **Voting** | Queue or block |

---

## Battery Efficiency

### Power Usage

| Activity | Target Impact | Notes |
|----------|---------------|-------|
| **Idle** | Minimal | No background polling |
| **Scrolling** | Low | 60fps with GPU |
| **Uploading** | Medium | Expected high usage |
| **Location (future)** | On-demand only | No continuous tracking |

### Battery Saver Compatibility

| Mode | Behavior |
|------|----------|
| **iOS Low Power** | Reduce animations, slower polling |
| **Android Battery Saver** | Reduce sync frequency |

---

## Performance Testing Tools

### Measurement Tools

| Tool | Purpose |
|------|---------|
| **Lighthouse** | Overall performance score |
| **WebPageTest** | Real device performance |
| **Chrome DevTools** | Runtime profiling |
| **Safari Web Inspector** | iOS performance |
| **React DevTools Profiler** | Component render time |

### Monitoring

| Metric | Tool | Alert Threshold |
|--------|------|-----------------|
| **API response time** | Vercel Analytics | > 1s p95 |
| **Error rate** | Sentry | > 0.1% |
| **Core Web Vitals** | Google Search Console | LCP > 2.5s |

---

## Performance Budget

### Bundle Size Budgets

| Chunk | Budget | Warning | Error |
|-------|--------|---------|-------|
| **Main entry** | 150KB | 180KB | 200KB |
| **Wardrobe** | 80KB | 100KB | 120KB |
| **Challenges** | 60KB | 80KB | 100KB |
| **Size Calculator** | 50KB | 70KB | 90KB |
| **TON Connect** | 100KB | 120KB | 150KB |
| **Total initial** | 300KB | 350KB | 400KB |

### Image Size Budgets

| Type | Budget | Format |
|------|--------|--------|
| **Thumbnail** | 30KB | WebP |
| **Grid display** | 50KB | WebP |
| **Detail view** | 200KB | Progressive JPEG |
| **Full resolution** | 500KB | Original |

---

## Performance Checklist

### Before Release

- [ ] Lighthouse score > 90 on mobile
- [ ] First Paint < 1.5s on 4G
- [ ] Time to Interactive < 3s on 4G
- [ ] 60fps maintained during scroll
- [ ] API p95 latency < 500ms
- [ ] Bundle size < 300KB initial
- [ ] Memory usage < 100MB stable
- [ ] No memory leaks detected
- [ ] Offline mode functional
- [ ] Reduced motion supported

### Continuous Monitoring

- [ ] Daily Lighthouse CI checks
- [ ] Error rate monitoring
- [ ] API latency dashboards
- [ ] Real user metrics (RUM)
- [ ] Bundle size tracking

---

## Device-Specific Targets

### iPhone 15 Pro (Reference High-End)

| Metric | Target |
|--------|--------|
| First Paint | < 0.8s |
| TTI | < 1.5s |
| Scroll FPS | 60fps sustained |
| Upload 1MB | < 2s |

### iPhone SE (Reference Mid-Range)

| Metric | Target |
|--------|--------|
| First Paint | < 1.5s |
| TTI | < 3s |
| Scroll FPS | 55fps |
| Upload 1MB | < 4s |

### Samsung A54 (Reference Mid-Range Android)

| Metric | Target |
|--------|--------|
| First Paint | < 1.5s |
| TTI | < 3s |
| Scroll FPS | 55fps |
| Upload 1MB | < 4s |

---

## Regression Testing

### Performance Regression Scenarios

| Change Type | Test |
|-------------|------|
| **New dependency** | Bundle size check |
| **New image asset** | Compression check |
| **API change** | Latency check |
| **New animation** | FPS check |
| **Database change** | Query performance |

---

*Related Documents:*
- TEST-PLAN.md (Master test strategy)
- TEST-MATRIX.md (Device-specific targets)
- PRE-LAUNCH-CHECKLIST.md (Performance verification)
