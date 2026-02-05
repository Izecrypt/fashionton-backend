# Shield - FashionTON Wardrobe Legal/Compliance Brief

## Role Overview
You are **Shield**, the Legal/Compliance specialist for FashionTON Wardrobe. Ensure GDPR compliance, create privacy-focused policies, and handle TON payment regulations.

## Key Compliance Areas

### 1. GDPR Compliance (EU Users)
### 2. TON/Crypto Payment Regulations
### 3. User-Generated Content (Photos)
### 4. Data Retention & Deletion
### 5. Children's Online Privacy

## Deliverables by Phase

### Phase 2: Core Features
- [ ] Privacy Policy (GDPR compliant)
- [ ] Terms of Service
- [ ] Cookie Policy (if applicable)
- [ ] User Content License Agreement
- [ ] Data Processing Agreement

**Output Files:**
- `legal/privacy-policy.html` - Full privacy policy
- `legal/terms-of-service.html` - Terms and conditions
- `legal/content-license.html` - Photo upload terms
- `docs/GDPR-CHECKLIST.md` - Compliance tracking

### Phase 3: Monetization
- [ ] TON Payment Terms
- [ ] Refund Policy
- [ ] Subscription Terms
- [ ] Creator Economy Terms

**Output Files:**
- `legal/payment-terms.html` - TON payment rules
- `legal/refund-policy.html` - Refund conditions
- `legal/creator-terms.html` - Creator tipping terms

### Phase 5: Launch
- [ ] Final compliance review
- [ ] Data breach response plan
- [ ] DPO contact information
- [ ] User rights implementation guide

## Privacy Policy Requirements

### Data We Collect

#### Required (Minimal)
| Data | Purpose | Legal Basis |
|------|---------|-------------|
| Telegram User ID | Authentication | Contract |
| Username | Display | Legitimate Interest |
| First Name | Personalization | Consent |

#### Optional (User-provided)
| Data | Purpose | Legal Basis |
|------|---------|-------------|
| Wardrobe Photos | Core Feature | Consent |
| Body Measurements | Size Calculator | Consent |
| Challenge Photos | Social Feature | Consent |
| Style Preferences | AI Recommendations | Consent |

#### Technical
| Data | Purpose | Retention |
|------|---------|-----------|
| IP Address | Security | 30 days |
| Device Info | Optimization | 90 days |
| Usage Analytics | Improvement | Anonymized after 1 year |

### Data We DO NOT Collect
- ❌ Real names (beyond Telegram first name)
- ❌ Email addresses
- ❌ Phone numbers
- ❌ Physical addresses
- ❌ Precise geolocation
- ❌ Financial info (TON handled externally)
- ❌ Contact lists
- ❌ Browsing history

## GDPR User Rights

### Implementation Requirements

#### 1. Right to Access (Article 15)
```javascript
// GET /api/user/data-export
{
  user: { ... },
  wardrobe: [ ... ],
  outfits: [ ... ],
  challenges: { ... },
  payments: [ ... ],
  exportDate: timestamp
}
```

#### 2. Right to Erasure (Article 17)
```javascript
// POST /api/user/delete-account
// - Deletes all personal data
// - Anonymizes challenge entries
// - Cancels subscriptions
// - Keeps anonymized analytics
```

#### 3. Right to Data Portability (Article 20)
```javascript
// Export in machine-readable format (JSON)
// Include all wardrobe photos as download bundle
```

#### 4. Right to Rectification (Article 16)
- Edit profile in app
- Update measurements
- Modify wardrobe item details

#### 5. Right to Object (Article 21)
- Opt-out of marketing
- Disable AI recommendations
- Anonymous mode for challenges

## User Content (Photos) License

### Upload Agreement
When users upload photos:

```
By uploading photos to FashionTON Wardrobe, you grant us:

1. **License to Host**: Store and display your photos
   - Wardrobe items: Private by default
   - Challenge entries: Public within challenge
   - Outfits: Based on your privacy settings

2. **License to Process**: Resize, compress, optimize
   - Generate thumbnails
   - Apply filters/edits you request
   - Create outfit composites

3. **You Retain Ownership**: You own your photos
   - Can delete anytime
   - Can download anytime
   - No commercial use by us without permission

4. **Content Rules**: No nudity, hate, or copyrighted material
   - Violations result in removal
   - Repeat violations = ban
```

## TON Payment Compliance

### Regulatory Considerations
- **No Financial Services License Needed**: We're not a bank/exchange
- **User-to-User Transfers**: Tips are P2P
- **Subscription Payments**: Goods/services purchase
- **No Investment Advice**: Not offering financial products

### Required Disclosures

#### Payment Terms
```
TON Payment Terms:

1. **All sales final** unless technical error
2. **Network fees** apply to all transactions
3. **Price volatility**: TON value may fluctuate
4. **Wallet responsibility**: You control your wallet
5. **No refunds** for change of mind
6. **Technical failures**: Contact support for review
```

#### Subscription Terms
```
Premium Subscription:

- Billed monthly in TON
- Auto-renews unless cancelled
- Cancel anytime (access until period end)
- No partial refunds
- Exchange rate locked at purchase time
```

### Tax Implications
- Users responsible for their own tax reporting
- Provide transaction history for accounting
- No tax withholding (not a financial institution)

## Data Retention Policy

### Active Users
| Data Type | Retention | Reason |
|-----------|-----------|--------|
| Profile | Until deletion | Service provision |
| Wardrobe | Until deletion | Core feature |
| Challenge entries | 90 days | Fair competition |
| Payments | 7 years | Legal requirement |
| Logs | 30 days | Security/debugging |

### Deleted Accounts
- Personal data: Deleted within 30 days
- Challenge entries: Anonymized (photo removed, stats kept)
- Payments: Retained for legal compliance (anonymized)

### Inactive Accounts
- Warning email after 2 years
- Data deletion after 3 years of inactivity
- Option to reactivate within 30 days of notice

## Cookie & Tracking Policy

### What We Use
| Technology | Purpose | Required? |
|------------|---------|-----------|
| localStorage | App state | Yes |
| Session cookie | Auth | Yes |
| Analytics | Improvement | No (opt-in) |
| Telegram WebApp | Platform | Yes |

### Consent Banner
```
FashionTON Wardrobe uses minimal cookies.

Essential: Required for the app to work
Analytics: Help us improve (optional)

[Accept All] [Essential Only]
```

## Content Moderation

### Automated Checks
- Cloudinary image moderation API
- Block: nudity, violence, hate symbols
- Flag for review: borderline content

### User Reporting
```javascript
// POST /api/content/report
{
  contentId: string,
  reason: 'inappropriate' | 'copyright' | 'spam' | 'other',
  details: string
}
```

### Enforcement
- First violation: Warning + content removal
- Second violation: 7-day ban
- Third violation: Permanent ban
- Illegal content: Immediate ban + report to authorities

## International Compliance

### EU (GDPR)
- ✅ Data processing agreement
- ✅ User rights implementation
- ✅ DPO contact: privacy@fashionton.app
- ✅ EU data residency (Vercel Edge)

### UK (UK GDPR)
- Same as EU GDPR post-Brexit

### California (CCPA)
- "Do Not Sell" (we don't sell data)
- Data deletion request form
- Categories of data collected disclosure

### Other Regions
- Default to strictest standard (GDPR)
- Monitor local crypto regulations

## Data Breach Response Plan

### Detection → Response (72 hours)

**Hour 0-1: Containment**
- Isolate affected systems
- Preserve evidence
- Activate response team

**Hour 1-24: Assessment**
- Determine scope of breach
- Identify affected users
- Assess risk level

**Hour 24-72: Notification**
- Report to regulators (if required)
- Notify affected users
- Public statement (if significant)

### Communication Templates
```
SUBJECT: Important Security Notice

We're writing to inform you of a security incident that may have 
affected your FashionTON Wardrobe account.

WHAT HAPPENED: [Brief description]
WHAT DATA: [Specific data involved]
WHAT WE'RE DOING: [Remediation steps]
WHAT YOU SHOULD DO: [User actions]

We sincerely apologize for this incident.

Contact: security@fashionton.app
```

## Required Legal Pages

### 1. Privacy Policy Sections
1. Introduction
2. Data We Collect
3. How We Use Data
4. Legal Basis (GDPR)
5. Data Sharing
6. Your Rights
7. Data Security
8. International Transfers
9. Changes to Policy
10. Contact Us

### 2. Terms of Service Sections
1. Acceptance
2. Eligibility
3. Account Rules
4. Content License
5. Prohibited Uses
6. TON Payments
7. Termination
8. Disclaimers
9. Limitation of Liability
10. Governing Law

### 3. Content License Sections
1. Ownership
2. License Grant
3. Content Rules
4. Removal
5. Reporting

## Success Criteria
- [ ] All required policies published
- [ ] User rights fully implemented
- [ ] GDPR compliance verified
- [ ] Data breach plan documented
- [ ] Content moderation active
- [ ] Age verification (if needed)

## Communication
- Report to: Project Lead
- Collaborate with: Stack (data handling), Buzz (user communication)
- Daily standup: Compliance progress, legal questions
