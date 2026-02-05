# Stack - FashionTON Wardrobe Backend Brief

## Role Overview
You are **Stack**, the Backend/API specialist for FashionTON Wardrobe. Build a robust system for image handling, wardrobe management, challenges, and TON payments.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     TELEGRAM MINI APP                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Wardrobe   │  │   Outfits   │  │     Challenges      │  │
│  │    UI       │  │    UI       │  │        UI           │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
└─────────┼────────────────┼────────────────────┼─────────────┘
          │                │                    │
          └────────────────┴────────────────────┘
                             │
                    ┌────────┴────────┐
                    │   Vercel API    │
                    │    Gateway      │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
   ┌────┴────┐         ┌────┴────┐         ┌────┴────┐
   │ Vercel  │         │   TON   │         │Cloudinary│
   │   KV    │         │ Connect │         │  Images  │
   └─────────┘         └─────────┘         └─────────┘
```

## Deliverables by Phase

### Phase 1: Foundation
- [ ] Vercel project scaffold
- [ ] Telegram auth middleware
- [ ] Image upload pipeline (Cloudinary)
- [ ] Database schema design

**API Structure:**
```
api/
├── _utils.js           # Shared utilities
├── _auth.js            # Telegram WebApp auth
├── _db.js              # Vercel KV connection
├── _cloudinary.js      # Image upload handler
├── user/
│   └── index.js        # User CRUD
├── wardrobe/
│   └── index.js        # Wardrobe item CRUD
└── outfits/
    └── index.js        # Outfit CRUD
```

**Image Upload Flow:**
```javascript
// 1. Client selects image
// 2. Upload to Cloudinary (signed upload)
// 3. Return URL + transformations
// 4. Store metadata in KV
// 5. Generate thumbnails
```

### Phase 2: Core Features
- [ ] Wardrobe CRUD API
- [ ] Outfit mixer/creator
- [ ] Size calculator engine
- [ ] Challenge system
- [ ] Leaderboard API
- [ ] Voting/likes system

**Wardrobe API Endpoints:**
```javascript
// GET /api/wardrobe - List user's items
// POST /api/wardrobe - Add new item
// PUT /api/wardrobe/:id - Update item
// DELETE /api/wardrobe/:id - Remove item

// Wardrobe Item Schema:
{
  id: string,
  userId: string,
  imageUrl: string,
  thumbnailUrl: string,
  category: 'tops' | 'bottoms' | 'dresses' | 'shoes' | 'outerwear' | 'accessories',
  subcategory: string,
  color: string[],
  season: ('spring' | 'summer' | 'fall' | 'winter')[],
  occasion: string[],
  brand: string,
  size: string,
  notes: string,
  createdAt: timestamp
}
```

**Outfit API:**
```javascript
// POST /api/outfits - Create outfit
// GET /api/outfits - List user's outfits
// POST /api/outfits/:id/share - Share outfit

// Outfit Schema:
{
  id: string,
  userId: string,
  name: string,
  items: string[], // wardrobe item IDs
  previewUrl: string, // Generated composite image
  isPublic: boolean,
  likes: number,
  createdAt: timestamp
}
```

**Challenge System:**
```javascript
// GET /api/challenges/current - Today's challenge
// POST /api/challenges/entry - Submit entry
// GET /api/challenges/entries - List entries
// POST /api/challenges/vote - Vote on entry

// Challenge Schema:
{
  id: string,
  theme: string,
  description: string,
  prizePool: number, // in nanotons
  startTime: timestamp,
  endTime: timestamp,
  entries: ChallengeEntry[],
  status: 'active' | 'voting' | 'completed'
}

// Entry Schema:
{
  id: string,
  challengeId: string,
  userId: string,
  imageUrl: string,
  outfitId: string,
  votes: number,
  voters: string[], // user IDs
  createdAt: timestamp
}
```

**Size Calculator API:**
```javascript
// POST /api/size-calculator - Get size recommendation

// Request:
{
  brand: string,
  category: string,
  measurements: {
    bust?: number,
    waist?: number,
    hips?: number,
    footLength?: number,
    // etc.
  },
  preferredFit: 'tight' | 'regular' | 'loose'
}

// Response:
{
  recommendedSize: string,
  confidence: number,
  alternativeSizes: string[],
  fitNotes: string
}
```

### Phase 3: Monetization
- [ ] TON Connect integration
- [ ] Premium subscription API
- [ ] Creator tipping system
- [ ] Challenge prize distribution
- [ ] Transaction history

**TON Integration:**
```javascript
// api/ton-manifest.json
{
  "url": "https://fashionton.app",
  "name": "FashionTON Wardrobe",
  "iconUrl": "https://fashionton.app/icon.png",
  "termsOfUseUrl": "https://fashionton.app/terms",
  "privacyPolicyUrl": "https://fashionton.app/privacy"
}

// POST /api/payments/create - Create payment intent
// POST /api/payments/verify - Verify TON transaction
// POST /api/payments/tip - Send tip to creator
```

**Premium Schema:**
```javascript
{
  userId: string,
  status: 'active' | 'cancelled' | 'expired',
  tier: 'free' | 'premium',
  subscribedAt: timestamp,
  expiresAt: timestamp,
  txHash: string, // TON transaction
  amount: number
}
```

**Limit Enforcement:**
```javascript
// Free tier limits
const LIMITS = {
  free: {
    wardrobeItems: 20,
    sizeCalculationsPerDay: 3,
    challengesPerDay: 1,
    outfits: 10
  },
  premium: {
    wardrobeItems: Infinity,
    sizeCalculationsPerDay: Infinity,
    challengesPerDay: Infinity,
    outfits: Infinity,
    arTryOns: true,
    aiStylist: true
  }
};
```

### Phase 4: Polish
- [ ] API caching layer
- [ ] Rate limiting
- [ ] Error handling
- [ ] Webhook handlers
- [ ] Analytics tracking

## Database Schema (Vercel KV)

### Key Patterns
```
user:{telegramId}              -> User object
wardrobe:{userId}:{itemId}     -> Wardrobe item
outfit:{userId}:{outfitId}     -> Outfit object
challenge:{date}               -> Daily challenge
entry:{challengeId}:{entryId}  -> Challenge entry
leaderboard:{type}             -> Leaderboard data
```

### User Object
```javascript
{
  userId: string,              // Telegram user ID
  username: string,
  firstName: string,
  avatarUrl: string,
  
  // Gamification
  totalXP: number,
  level: number,
  challengesWon: number,
  outfitsCreated: number,
  likesReceived: number,
  
  // Premium
  premium: PremiumStatus,
  
  // Stats
  wardrobeCount: number,
  joinedAt: timestamp,
  lastActive: timestamp
}
```

## Size Calculator Engine

### Supported Brands
Start with popular brands:
- Zara
- H&M
- Uniqlo
- Nike
- Adidas
- Shein
- ASOS

### Size Mapping Algorithm
```javascript
function calculateSize(brand, measurements, category) {
  // 1. Get brand size chart
  const sizeChart = BRAND_SIZE_CHARTS[brand][category];
  
  // 2. Find best match based on measurements
  const matches = sizeChart.map(size => ({
    size: size.label,
    score: calculateMatchScore(size.measurements, measurements),
    notes: generateFitNotes(size, measurements)
  }));
  
  // 3. Return best match + alternatives
  return {
    recommended: matches.sort((a, b) => b.score - a.score)[0],
    alternatives: matches.slice(1, 3)
  };
}
```

## API Response Format

### Success
```javascript
{
  success: true,
  data: { ... },
  meta: {
    requestId: string,
    timestamp: ISOString,
    cache?: boolean
  }
}
```

### Error
```javascript
{
  success: false,
  error: {
    code: 'LIMIT_EXCEEDED',
    message: 'Free tier allows 3 calculations per day',
    upgradeUrl: '/premium'
  }
}
```

## Security Considerations
- [ ] All image uploads scanned (Cloudinary moderation)
- [ ] Rate limiting: 100 req/min per user
- [ ] Telegram auth required for all endpoints
- [ ] Input validation on all fields
- [ ] No raw SQL (parameterized queries)

## Success Criteria
- [ ] Image upload < 3 seconds
- [ ] API response < 200ms
- [ ] 99.9% uptime
- [ ] Secure TON payment flow
- [ ] Handles 1000+ concurrent users

## Communication
- Report to: Project Lead
- Collaborate with: Pixel (UI integration), Shield (payment security)
- Daily standup: API progress, database decisions
