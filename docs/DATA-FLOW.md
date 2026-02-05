# Data Processing Documentation - FashionTON Wardrobe

> **Document Version:** 1.0  
> **Last Updated:** February 4, 2026  
> **Classification:** Internal - Data Protection  
> **DPO Review:** Pending

---

## Executive Summary

This document provides a comprehensive overview of how FashionTON Wardrobe collects, processes, stores, and deletes personal data. It serves as our Article 30 Records of Processing Activities and supports our GDPR compliance efforts.

**Key Principles:**
- **Minimal Collection:** We only collect data essential for service operation
- **User Control:** Users can access, modify, and delete their data anytime
- **Security First:** Industry-standard encryption and security practices
- **Transparency:** Clear communication about data practices

---

## 1. Data Inventory

### 1.1 Required Data (Contractual Basis)

| Data Element | Source | Purpose | Retention |
|--------------|--------|---------|-----------|
| Telegram User ID | Telegram OAuth | Authentication, account linking | Until account deletion |
| Telegram Username | Telegram OAuth | Display in app, challenges | Until account deletion |
| First Name | Telegram OAuth | Personalization | Until account deletion |
| Account Creation Date | System generated | Account management | Until account deletion |
| Last Active Timestamp | System generated | Inactive account detection | Until account deletion |

### 1.2 Optional Data (Consent Basis)

| Data Element | Source | Purpose | Retention |
|--------------|--------|---------|-----------|
| Wardrobe Photos | User upload | Core wardrobe feature | Until deleted by user |
| Photo Metadata | User upload/EXIF | Organization, filtering | Until photo deleted |
| Item Categories | User input | Wardrobe organization | Until item deleted |
| Outfit Combinations | User creation | Outfit planning | Until outfit deleted |
| Body Measurements | User input | Size calculator | Until deleted by user |
| Style Preferences | User input | AI recommendations | Until deleted by user |
| Challenge Photos | User upload | Social challenges | 90 days post-challenge |
| Profile Picture | User upload | Public profile | Until deleted by user |

### 1.3 Technical Data (Legitimate Interest)

| Data Element | Source | Purpose | Retention |
|--------------|--------|---------|-----------|
| IP Address | HTTP headers | Security, fraud prevention | 30 days |
| User Agent String | HTTP headers | Optimization, debugging | 90 days |
| Device Type | User Agent parsing | UI optimization | 90 days |
| App Version | WebApp init | Version compatibility | 90 days |
| Session Tokens | System generated | Authentication | Session duration |
| Error Logs | System generated | Debugging, improvement | 30 days |
| Performance Metrics | System generated | Service optimization | 1 year (anonymized) |

### 1.4 Payment Data (Contractual/Legal)

| Data Element | Source | Purpose | Retention |
|--------------|--------|---------|-----------|
| TON Wallet Address | User input | Payment processing | Until account deletion |
| Transaction Hash | TON blockchain | Payment verification | 7 years (legal) |
| Payment Amount | TON blockchain | Billing records | 7 years (legal) |
| Payment Timestamp | System generated | Transaction history | 7 years (legal) |
| Subscription Status | System generated | Access control | Until account deletion |

### 1.5 Data We Do NOT Collect

| Data Category | Reason Not Collected |
|---------------|---------------------|
| Email addresses | Not needed (use Telegram) |
| Phone numbers | Not needed (use Telegram) |
| Physical addresses | Not needed for service |
| Precise geolocation | Not relevant to fashion features |
| Contact lists | Privacy invasive, not needed |
| Government ID | Not required |
| Financial account info | TON wallet handles this |
| Browsing history | Outside app scope |
| Biometric data | Not needed |

---

## 2. Data Flow Diagrams

### 2.1 Authentication Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   User      │────▶│   Telegram   │────▶│   Fashion   │
│  (Telegram) │     │    OAuth     │     │    TON      │
└─────────────┘     └──────────────┘     └─────────────┘
                                                │
                                                ▼
                                        ┌──────────────┐
                                        │  Verify      │
                                        │  Telegram ID │
                                        └──────────────┘
                                                │
                        ┌───────────────────────┼───────────────────────┐
                        ▼                       ▼                       ▼
                ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
                │  New User:   │      │ Existing:    │      │ Generate     │
                │  Create      │      │ Update       │      │ Session      │
                │  Profile     │      │ Last Active  │      │ Token        │
                └──────────────┘      └──────────────┘      └──────────────┘
```

**Data Transferred:**
- Telegram User ID
- Username
- First Name
- Profile Photo URL (optional)

### 2.2 Photo Upload Flow

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   User      │────▶│   Device     │────▶│  Telegram    │
│  Selects    │     │   Camera/    │     │   Mini App   │
│   Photo     │     │   Gallery    │     │   Interface  │
└─────────────┘     └──────────────┘     └──────────────┘
                                                │
                                                ▼
                                        ┌──────────────┐
                                        │  Client-side │
                                        │  Compression │
                                        └──────────────┘
                                                │
                                                ▼
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  Metadata   │◀────│  Cloudinary  │◀────│   Upload     │
│  Stored in  │     │  (Process &  │     │   to API     │
│  Vercel KV  │     │   Store)     │     │              │
└─────────────┘     └──────────────┘     └──────────────┘
        │
        ▼
┌──────────────┐
│  Image URLs  │
│  Signed for  │
│  Access      │
└──────────────┘
```

**Data Transferred:**
- Image file (compressed)
- Optional: Category tags, item name, description
- Metadata: Upload timestamp, user ID

### 2.3 Challenge Participation Flow

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   User      │────▶│   Select     │────▶│   Submit     │
│  Enters     │     │   Outfit/    │     │   Entry      │
│  Challenge  │     │   Photo      │     │   to API     │
└─────────────┘     └──────────────┘     └──────────────┘
                                                │
                        ┌───────────────────────┼───────────────────────┐
                        ▼                       ▼                       ▼
                ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
                │  Store Entry │      │  Moderation  │      │  Update      │
                │  in Database │      │  Queue       │      │  Challenge   │
                │              │      │  (Auto)      │      │  Stats       │
                └──────────────┘      └──────────────┘      └──────────────┘
```

**Data Transferred:**
- User ID (or anonymous ID)
- Photo reference
- Challenge ID
- Optional: Outfit composition data

### 2.4 Payment Flow

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   User      │────▶│   Connect    │────▶│  Generate    │
│  Initiates  │     │   TON        │     │  Payment     │
│  Payment    │     │   Wallet     │     │  Request     │
└─────────────┘     └──────────────┘     └──────────────┘
                                                │
                                                ▼
                                        ┌──────────────┐
                                        │  User        │
                                        │  Confirms    │
                                        │  in Wallet   │
                                        └──────────────┘
                                                │
                                                ▼
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  Update     │◀────│  Verify on   │◀────│  Transaction │
│  Account    │     │  Blockchain  │     │  Submitted   │
│  Status     │     │              │     │              │
└─────────────┘     └──────────────┘     └──────────────┘
```

**Data Transferred:**
- Wallet address (public)
- Payment amount
- Transaction hash (after confirmation)
- No private keys handled by us

---

## 3. Data Storage Architecture

### 3.1 Primary Storage: Vercel KV

| Data Type | Storage Format | TTL/Expiration |
|-----------|---------------|----------------|
| User Profiles | JSON | No expiration |
| Wardrobe Items | JSON array | No expiration |
| Outfits | JSON array | No expiration |
| Sessions | JWT + Redis | 7 days |
| Rate Limit Counters | String | 1 hour |
| Temporary Upload Tokens | String | 15 minutes |

**Schema Example - User Profile:**
```json
{
  "user_id": "123456789",
  "telegram_id": "123456789",
  "username": "fashionista",
  "first_name": "Anna",
  "profile_photo": "https://...",
  "created_at": "2026-01-15T10:30:00Z",
  "last_active": "2026-02-04T14:22:00Z",
  "settings": {
    "privacy_level": "private",
    "analytics_opt_in": false,
    "notifications_enabled": true
  },
  "subscription": {
    "type": "premium",
    "expires_at": "2026-03-04T00:00:00Z"
  },
  "consent_history": [
    {
      "type": "terms",
      "version": "1.0",
      "accepted_at": "2026-01-15T10:30:00Z"
    },
    {
      "type": "photos",
      "version": "1.0",
      "accepted_at": "2026-01-15T10:35:00Z"
    }
  ]
}
```

**Schema Example - Wardrobe Item:**
```json
{
  "item_id": "uuid-v4",
  "user_id": "123456789",
  "type": "top",
  "category": "blouse",
  "name": "Silk Blouse",
  "colors": ["white", "cream"],
  "seasons": ["spring", "summer"],
  "occasions": ["work", "casual"],
  "images": {
    "original": "https://cdn.../original.jpg",
    "thumbnail": "https://cdn.../thumb.jpg",
    "medium": "https://cdn.../medium.jpg"
  },
  "added_at": "2026-01-20T15:45:00Z",
  "updated_at": "2026-01-20T15:45:00Z",
  "privacy": "private",
  "metadata": {
    "brand": "Zara",
    "size": "M",
    "purchase_date": "2025-12-01"
  }
}
```

### 3.2 Image Storage: Cloudinary

| Image Type | Transformations | Access Control |
|------------|-----------------|----------------|
| Original | None | Signed URL only |
| Medium (display) | 800px max, quality 80 | Signed URL only |
| Thumbnail | 200px square, quality 60 | Signed URL only |

**Security Measures:**
- Images uploaded with unique, unguessable filenames
- Access via time-limited signed URLs
- No public direct access to storage
- Automatic virus scanning on upload
- Image moderation API for content filtering

### 3.3 Analytics Storage (Optional)

| Data Type | Storage | Anonymization | Retention |
|-----------|---------|---------------|-----------|
| Page views | Vercel Analytics | Aggregated | 1 year |
| Feature usage | Mixpanel (opt-in) | User ID hashed | 2 years |
| Error reports | Sentry | PII scrubbed | 90 days |

---

## 4. Data Retention & Deletion

### 4.1 Retention Schedule

| Data Category | Active User | Inactive (2+ years) | Deleted Account |
|---------------|-------------|---------------------|-----------------|
| Profile | Until deletion | 3 years total | 30 days |
| Wardrobe Photos | Until deletion | 3 years total | 30 days |
| Measurements | Until deletion | Deleted | 30 days |
| Challenge Entries | 90 days post | Anonymized | Anonymized |
| Payment Records | 7 years | 7 years | 7 years (anonymized) |
| Security Logs | 30 days | 30 days | 30 days |
| Session Data | 7 days | N/A | Immediate |
| Analytics | 1 year | Anonymized | Anonymized |

### 4.2 Deletion Procedures

#### User-Initiated Account Deletion

```
Step 1: Soft Delete (Immediate)
- Mark account as "pending_deletion"
- Hide all content from UI
- Revoke all active sessions
- Cancel Premium subscription
- Send confirmation to user

Step 2: Grace Period (0-7 days)
- User can cancel deletion via login
- Data remains but hidden
- No new data accepted

Step 3: Hard Delete (30 days)
- Delete user profile from KV
- Delete wardrobe items
- Delete measurements
- Delete style preferences
- Schedule photo deletion from Cloudinary
- Anonymize challenge entries
- Retain anonymized payment records

Step 4: Final Cleanup (31-37 days)
- Purge photos from Cloudinary
- Remove from backup systems
- Log deletion completion
```

#### Individual Data Deletion

| Action | User Control | Deletion Time |
|--------|--------------|---------------|
| Delete single photo | Wardrobe → Delete | Immediate |
| Delete outfit | Outfits → Delete | Immediate |
| Delete measurement | Size Calculator → Clear | Immediate |
| Clear search history | Settings → Clear History | Immediate |
| Revoke consent | Settings → Privacy | Immediate effect |

### 4.3 Backup Policy

| Backup Type | Frequency | Retention | Encrypted |
|-------------|-----------|-----------|-----------|
| Database snapshot | Daily | 30 days | ✅ Yes |
| Cross-region replica | Real-time | Until deleted | ✅ Yes |
| Disaster recovery | Weekly | 90 days | ✅ Yes |

**Note:** Backups are purged of deleted user data within 30 days of account deletion.

---

## 5. Third-Party Processors

### 5.1 Data Processors

| Processor | Purpose | Data Transferred | Location | DPA Status |
|-----------|---------|------------------|----------|------------|
| Vercel | Hosting, KV storage | All user data | EU/US | ✅ Signed |
| Cloudinary | Image hosting | Photos only | US | ✅ Signed |
| Telegram | Authentication | Auth tokens | EU | N/A (platform) |
| TON Foundation | Payment processing | Wallet addresses | Global | N/A (blockchain) |

### 5.2 Sub-processors

| Sub-processor | Used By | Purpose | Data Access |
|---------------|---------|---------|-------------|
| AWS | Vercel | Infrastructure | Encrypted data |
| Cloudflare | Vercel | CDN, Security | Encrypted traffic |

### 5.3 Data Processing Agreements

All processors have signed Data Processing Agreements (DPAs) that require:
- Processing only on documented instructions
- Confidentiality obligations
- Security measures implementation
- Sub-processor governance
- Assistance with user rights requests
- Return/deletion of data on termination
- Audit rights

---

## 6. Security Measures

### 6.1 Technical Measures

| Layer | Measure | Implementation |
|-------|---------|----------------|
| Transport | TLS 1.3 | All HTTPS connections |
| Storage | AES-256 | At-rest encryption |
| Authentication | Telegram OAuth | No password storage |
| API | Rate limiting | 100 req/min per user |
| Images | Signed URLs | 1-hour expiration |
| Sessions | JWT | 7-day expiration, HttpOnly |

### 6.2 Organizational Measures

| Measure | Status | Details |
|---------|--------|---------|
| Access control | ✅ | Role-based, least privilege |
| Staff confidentiality | ✅ | NDAs signed |
| Security training | 🚧 | Quarterly planned |
| Incident response | ✅ | Documented plan |
| Regular audits | 🚧 | Annual penetration testing |

### 6.3 Data Breach Response

See detailed plan in `/docs/GDPR-CHECKLIST.md` Section 5.

**Key Points:**
- 72-hour notification to DPA if high risk
- User notification if high risk to rights/freedom
- Documented breach register
- Post-incident review process

---

## 7. User Rights Implementation

### 7.1 Right to Access (Export)

**Endpoint:** `GET /api/user/export`

**Process:**
1. User requests export in Settings
2. System verifies Telegram authentication
3. Async job collects all user data
4. Creates ZIP with:
   - `data.json` - All structured data
   - `photos/` - All wardrobe images
   - `receipts/` - Payment records
   - `README.txt` - Human-readable guide
5. Sends download link (24-hour expiry)
6. Logs export for audit trail

**Timeline:** Within 30 days (automated, usually within minutes)

### 7.2 Right to Erasure

**Endpoint:** `POST /api/user/delete-account`

**Process:**
1. User initiates deletion in Settings
2. Re-authentication required
3. Shows impact summary (what will be deleted)
4. User confirms with understanding
5. Soft delete immediately
6. 7-day grace period (can cancel)
7. Hard delete after 30 days
8. Confirmation sent to user

**Timeline:** Complete within 30 days

### 7.3 Right to Rectification

**In-App Editing:**
- Profile: Settings → Edit Profile
- Wardrobe: Item → Edit
- Measurements: Size Calculator → Update

**Timeline:** Immediate for in-app changes

### 7.4 Right to Data Portability

**Format:** JSON + image files
**Structure:** Standardized schema for easy transfer
**API:** Available for direct transfer to other services

---

## 8. Data Protection Impact Assessment (DPIA)

### 8.1 High-Risk Processing: Photo Upload

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Unauthorized photo access | Low | High | Encryption, signed URLs, access controls |
| Inappropriate content | Medium | Medium | Auto-moderation, user reporting |
| Data breach | Low | High | Encryption, monitoring, incident response |
| Misuse by third parties | Low | Medium | Strict DPA, no data selling |

### 8.2 DPIA Conclusion

Residual risk after mitigation: **LOW**
- Acceptable risk level
- Monitoring in place
- Regular review scheduled

---

## 9. Compliance Monitoring

### 9.1 Regular Reviews

| Review Type | Frequency | Owner | Last Completed |
|-------------|-----------|-------|----------------|
| Data inventory | Quarterly | DPO | 2026-02-04 |
| Retention compliance | Monthly | Stack | 2026-02-04 |
| Access log review | Monthly | Security | 2026-02-04 |
| Third-party audit | Annually | DPO | Pending |
| Full GDPR audit | Annually | DPO | Pending |

### 9.2 Metrics Tracked

| Metric | Target | Current |
|--------|--------|---------|
| Data export requests | < 24hr response | N/A (no requests) |
| Deletion completion | < 30 days | N/A (no requests) |
| Security incidents | 0 | 0 |
| DPA compliance | 100% | 100% |
| User consent rate | Track | Baseline |

---

## 10. Change Log

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-02-04 | Initial documentation | Shield |

---

## 11. Related Documents

- `/legal/privacy-policy.html` - User-facing privacy policy
- `/legal/terms-of-service.html` - Terms of service
- `/legal/content-license.html` - Content license agreement
- `/docs/GDPR-CHECKLIST.md` - GDPR compliance checklist
- `/references/COPPA-GUIDE.md` - Children's privacy guide
- `/references/AGENT-WORKFLOWS.md` - Team workflows

---

## 12. Contact

**Data Protection Officer:** privacy@fashionton.app  
**Technical Questions:** stack@fashionton.app  
**Security Issues:** security@fashionton.app

---

**Document Classification:** Internal - Data Protection  
**Next Review Date:** 2026-05-04 (Quarterly)
