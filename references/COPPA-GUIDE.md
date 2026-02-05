# COPPA Compliance Guide

## What is COPPA?

The Children's Online Privacy Protection Act (COPPA) is a US federal law that imposes requirements on operators of websites and online services directed to children under 13 years of age.

## Does COPPA Apply to Your App?

COPPA applies if:
1. Your app is directed to children under 13
2. You have actual knowledge that you're collecting data from children under 13
3. Your app uses child-directed features (cartoon characters, simple language, etc.)

## Key Requirements

### 1. Privacy Policy

**Must Include:**
- Name and contact info of operators
- Types of personal information collected
- How the information is used
- Whether information is shared with third parties
- Parental rights (review, delete, refuse further collection)
- How to exercise parental rights
- Data retention policy

**Sample Parental Rights Section:**
```
Parents' Rights

As a parent, you have the right to:
1. Review the personal information we have collected from your child
2. Delete that information
3. Refuse our further collection or use of your child's information

To exercise these rights, contact us at: [email]
```

### 2. Direct Notice to Parents

Before collecting information, you must notify parents directly:

**Required Information:**
- That you want to collect their child's personal information
- The specific information you want to collect
- How it will be used
- How to give consent
- That refusing consent won't disqualify child from activities

**Sample Direct Notice:**
```
Dear Parent,

Your child wants to use [App Name], a fun memory game.

To provide this service, we need to collect:
- A username (chosen by your child)
- Game progress and scores

This information is used to:
- Save game progress
- Display on leaderboards (username only)
- Track achievements

You can:
✓ Give consent and allow access
✓ Refuse consent (your child can still play, but progress won't be saved)

Give consent: [Link]
Questions? Contact us at [email]
```

### 3. Verifiable Parental Consent

You must obtain verifiable consent before collecting personal information from children.

**Acceptable Methods:**
- Signed consent form (print, sign, scan/mail)
- Credit card verification (small charge)
- Video conference with staff
- Government-issued ID verification

**Common for Apps:**
- Email plus verification (send email, parent responds with code)
- Credit card for purchases (implies parental involvement)

### 4. Data Minimization

**Collect Only What's Necessary:**

| Necessary | Unnecessary |
|-----------|-------------|
| Anonymous user ID | Real name |
| Username (chosen) | Email address |
| Game progress | Phone number |
| Score/stats | Physical address |
| Device type (for optimization) | Precise location |
| | Photos/videos |
| | Contact list |

### 5. No Third-Party Tracking

**Prohibited:**
- Behavioral advertising
- Advertising IDs
- Tracking pixels for ads
- Social media plugins that track

**Allowed:**
- Anonymous analytics (no child identification)
- Essential app functionality

## Parental Gates

### For In-App Purchases

**Mathematical Challenge:**
```
┌─────────────────────────────┐
│  Ask a Parent! 👨‍👩‍👧          │
│                             │
│  What is 8 + 7?             │
│                             │
│  [14] [15] [16] [17]        │
│                             │
│  Parents: Enter the answer  │
│  to continue                │
└─────────────────────────────┘
```

**Swipe Pattern:**
```
┌─────────────────────────────┐
│  Ask a Parent! 👨‍👩‍👧          │
│                             │
│  Swipe this arrow →         │
│  to continue                │
└─────────────────────────────┘
```

### Implementation Tips

- Make it clear this is for parents
- Don't make it too easy (avoid 1+1)
- Vary the questions
- Clear "Ask a Parent" messaging

## Data Retention

**Best Practices:**
- Delete data when no longer needed
- Set automatic deletion schedules
- Anonymize data instead of deleting when possible
- Inform parents of retention policy

**Sample Retention Policy:**
```
We retain your child's information:
- Game progress: Until account deletion
- Leaderboard entries: 90 days
- Logs: 30 days

After these periods, data is automatically deleted.
```

## Privacy Policy Template

```html
<!DOCTYPE html>
<html>
<head>
    <title>Privacy Policy - [App Name]</title>
    <style>
        body { font-family: system-ui; max-width: 800px; margin: 40px auto; padding: 20px; }
        h1 { color: #333; }
        h2 { color: #555; margin-top: 30px; }
    </style>
</head>
<body>
    <h1>Privacy Policy for [App Name]</h1>
    <p><strong>Last Updated:</strong> [Date]</p>
    
    <h2>1. Who We Are</h2>
    <p>[App Name] is operated by [Company Name]. We can be reached at [contact email].</p>
    
    <h2>2. Information We Collect</h2>
    <p>We collect the following information from children:</p>
    <ul>
        <li><strong>Username:</strong> A name chosen by the child for display</li>
        <li><strong>Game Progress:</strong> Scores, levels completed, achievements</li>
        <li><strong>Anonymous ID:</strong> A random identifier for account management</li>
    </ul>
    <p>We do NOT collect: real names, email addresses, phone numbers, addresses, photos, or location data.</p>
    
    <h2>3. How We Use Information</h2>
    <p>We use this information to:</p>
    <ul>
        <li>Save game progress</li>
        <li>Display on leaderboards (username only)</li>
        <li>Track achievements</li>
        <li>Improve the app</li>
    </ul>
    
    <h2>4. Information Sharing</h2>
    <p>We do not share personal information with third parties. We do not display advertising.</p>
    
    <h2>5. Parents' Rights</h2>
    <p>Parents have the right to:</p>
    <ul>
        <li>Review the personal information we have collected</li>
        <li>Delete that information</li>
        <li>Refuse further collection or use of information</li>
    </ul>
    <p>To exercise these rights, email us at [contact email] with your child's username.</p>
    
    <h2>6. Data Security</h2>
    <p>We use industry-standard security measures to protect your child's information.</p>
    
    <h2>7. Data Retention</h2>
    <p>We retain information only as long as necessary:</p>
    <ul>
        <li>Game progress: Until account deletion</li>
        <li>Leaderboard entries: 90 days</li>
    </ul>
    
    <h2>8. Changes to This Policy</h2>
    <p>We will notify parents of any material changes to this policy via email or in-app notice.</p>
    
    <h2>9. Contact Us</h2>
    <p>For questions about this privacy policy, contact us at:</p>
    <p>[Company Name]<br>
    [Email Address]</p>
</body>
</html>
```

## Checklist Summary

- [ ] Privacy policy posted and accessible
- [ ] Direct notice to parents before data collection
- [ ] Verifiable parental consent obtained
- [ ] Only necessary data collected
- [ ] No third-party tracking or ads
- [ ] Parental gates for purchases
- [ ] Data retention policy in place
- [ ] Parent rights process documented
- [ ] Contact information provided

## Resources

- [FTC COPPA Guidance](https://www.ftc.gov/business-guidance/privacy-security/childrens-privacy)
- [COPPA FAQs](https://www.ftc.gov/business-guidance/privacy-security/complying-coppa-frequently-asked-questions)
- [iKids Design Guidelines](https://www.ftc.gov/business-guidance/blog/2013/04/complying-coppa-guide-businesses-parents-and-small-entity-compliance-guide)
