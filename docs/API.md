# FashionTON Wardrobe API Documentation

Complete API reference for FashionTON Wardrobe backend.

## Base URL

```
Production:  https://fashionton.app/api
Development: http://localhost:3000/api
```

## Authentication

All API endpoints require Telegram WebApp authentication via the `X-Telegram-Init-Data` header.

```javascript
// Include this header with every request
headers: {
  'X-Telegram-Init-Data': window.Telegram.WebApp.initData
}
```

## Response Format

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "requestId": "req_abc123_1699900000000",
    "timestamp": "2024-01-15T10:30:00.000Z",
    ...
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": { ... } // Optional
  },
  "meta": {
    "requestId": "req_abc123_1699900000000",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or missing Telegram authentication |
| `INVALID_INPUT` | 400 | Request validation failed |
| `NOT_FOUND` | 404 | Resource not found |
| `LIMIT_EXCEEDED` | 403 | Free tier limit reached |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
| `UPLOAD_FAILED` | 400 | Image upload failed |
| `ALREADY_VOTED` | 409 | User already voted in this challenge |
| `SELF_VOTE_NOT_ALLOWED` | 403 | Cannot vote for own entry |
| `DUPLICATE_ENTRY` | 409 | User already submitted entry to this challenge |
| `CANNOT_DELETE` | 403 | Cannot delete entry after submission phase |

---

## User API

### GET /api/user

Get current user's profile and stats.

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `includeStats` | boolean | `true` | Include user statistics |

#### Response

```json
{
  "success": true,
  "data": {
    "userId": "123456789",
    "username": "fashionista",
    "firstName": "Jane",
    "lastName": "Doe",
    "avatarUrl": "https://t.me/i/userpic/...",
    "isPremium": false,
    "languageCode": "en",
    "joinedAt": 1699900000000,
    "lastActive": 1699999999999,
    "isNewUser": false,
    "stats": {
      "totalXP": 250,
      "level": 3,
      "challengesWon": 2,
      "outfitsCreated": 15,
      "likesReceived": 47,
      "wardrobeCount": 18,
      "categoryCounts": {
        "tops": 5,
        "bottoms": 4,
        "dresses": 2,
        "shoes": 3,
        "outerwear": 2,
        "accessories": 2,
        "total": 18
      }
    }
  },
  "meta": {
    "requestId": "req_...",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### POST /api/user

Create or update user profile.

#### Request Body

```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "avatarUrl": "https://example.com/avatar.jpg",
  "languageCode": "en"
}
```

#### Response (201 Created for new user, 200 OK for update)

```json
{
  "success": true,
  "data": {
    "userId": "123456789",
    "username": "fashionista",
    "firstName": "Jane",
    "lastName": "Doe",
    "avatarUrl": "https://example.com/avatar.jpg",
    "isPremium": false,
    "languageCode": "en",
    "joinedAt": 1699900000000,
    "isNewUser": true
  },
  "meta": {
    "isNewUser": true,
    "message": "User created successfully",
    "requestId": "req_...",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### DELETE /api/user

Delete user account and all associated data (GDPR compliance).

#### Request Body

```json
{
  "confirmDelete": true
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "message": "Account and all associated data deleted successfully",
    "deletedAt": "2024-01-15T10:30:00.000Z",
    "deletedItems": {
      "wardrobeItems": 18,
      "outfits": 15
    }
  },
  "meta": {
    "requestId": "req_...",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

---

## Wardrobe API

### GET /api/wardrobe

List user's wardrobe items with optional filtering.

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `category` | string | - | Filter by category (tops, bottoms, dresses, shoes, outerwear, accessories) |
| `limit` | number | 20 | Items per page (max 100) |
| `offset` | number | 0 | Pagination offset |

#### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "item_abc123_1699900000000",
      "userId": "123456789",
      "imageUrl": "https://res.cloudinary.com/.../image.jpg",
      "thumbnailUrl": "https://res.cloudinary.com/.../thumb.jpg",
      "category": "tops",
      "subcategory": "t-shirt",
      "colors": ["white", "blue"],
      "season": ["spring", "summer"],
      "occasion": ["casual", "sport"],
      "brand": "Nike",
      "size": "M",
      "notes": "Favorite workout shirt",
      "isFavorite": true,
      "createdAt": 1699900000000,
      "updatedAt": 1699900000000
    }
  ],
  "meta": {
    "pagination": {
      "total": 18,
      "limit": 20,
      "offset": 0,
      "hasMore": false
    },
    "requestId": "req_...",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### POST /api/wardrobe

Add a new item to the wardrobe.

#### Request Body

**Option 1: Upload via Base64**
```json
{
  "imageBase64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ...",
  "category": "tops",
  "subcategory": "t-shirt",
  "colors": ["white", "navy"],
  "season": ["spring", "summer"],
  "occasion": ["casual"],
  "brand": "Zara",
  "size": "M",
  "notes": "Great for summer days",
  "isFavorite": false
}
```

**Option 2: Use existing image URL**
```json
{
  "imageUrl": "https://res.cloudinary.com/.../existing-image.jpg",
  "thumbnailUrl": "https://res.cloudinary.com/.../thumb.jpg",
  "category": "shoes",
  "colors": ["black"],
  "brand": "Nike",
  "size": "42"
}
```

#### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `imageBase64` | string | * | Base64 encoded image (if no imageUrl) |
| `imageUrl` | string | * | Existing image URL (if no imageBase64) |
| `category` | string | **Yes** | One of: tops, bottoms, dresses, shoes, outerwear, accessories |
| `subcategory` | string | No | e.g., t-shirt, jeans, sneakers |
| `colors` | string[] | No | Array of color names |
| `season` | string[] | No | spring, summer, fall, winter |
| `occasion` | string[] | No | casual, formal, sport, party, etc. |
| `brand` | string | No | Brand name (max 100 chars) |
| `size` | string | No | Size label (max 20 chars) |
| `notes` | string | No | Personal notes (max 1000 chars) |
| `isFavorite` | boolean | No | Mark as favorite |

#### Response (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "item_xyz789_1700000000000",
    "userId": "123456789",
    "imageUrl": "https://res.cloudinary.com/.../image.jpg",
    "thumbnailUrl": "https://res.cloudinary.com/.../thumb.jpg",
    "category": "tops",
    "subcategory": "t-shirt",
    "colors": ["white", "navy"],
    "season": ["spring", "summer"],
    "occasion": ["casual"],
    "brand": "Zara",
    "size": "M",
    "notes": "Great for summer days",
    "isFavorite": false,
    "createdAt": 1700000000000,
    "updatedAt": 1700000000000
  },
  "meta": {
    "message": "Item added to wardrobe successfully",
    "xpEarned": 10,
    "requestId": "req_...",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Free Tier Limit

Free users can add up to 20 wardrobe items. Premium users have unlimited items.

```json
{
  "success": false,
  "error": {
    "code": "LIMIT_EXCEEDED",
    "message": "Free tier allows 20 wardrobe items. Upgrade to premium for unlimited items.",
    "details": {
      "upgradeUrl": "/premium"
    }
  },
  "meta": {
    "requestId": "req_...",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### PUT /api/wardrobe/:id

Update an existing wardrobe item.

#### URL Parameters

| Parameter | Description |
|-----------|-------------|
| `id` | Wardrobe item ID |

#### Request Body

Only include fields you want to update:

```json
{
  "category": "outerwear",
  "colors": ["black", "grey"],
  "brand": "Uniqlo",
  "size": "L",
  "isFavorite": true
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "id": "item_xyz789_1700000000000",
    "userId": "123456789",
    "imageUrl": "https://res.cloudinary.com/.../image.jpg",
    "thumbnailUrl": "https://res.cloudinary.com/.../thumb.jpg",
    "category": "outerwear",
    "colors": ["black", "grey"],
    "brand": "Uniqlo",
    "size": "L",
    "isFavorite": true,
    "updatedAt": 1700000100000
  },
  "meta": {
    "message": "Item updated successfully",
    "requestId": "req_...",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### DELETE /api/wardrobe/:id

Remove an item from the wardrobe.

#### URL Parameters

| Parameter | Description |
|-----------|-------------|
| `id` | Wardrobe item ID |

#### Response

```json
{
  "success": true,
  "data": {
    "deletedItemId": "item_xyz789_1700000000000",
    "message": "Item removed from wardrobe successfully"
  },
  "meta": {
    "requestId": "req_...",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

---

## Challenge System API

### Challenge Lifecycle

```
Day 0 00:00 - Challenge opens (24h submission)
Day 1 00:00 - Submission closes, voting opens (24h)
Day 2 00:00 - Voting closes, winners announced
Day 2 01:00 - Prizes distributed, new challenge opens
```

---

### GET /api/challenges/current

Get the current active challenge with user's entry status.

#### Response

```json
{
  "success": true,
  "data": {
    "id": "challenge_abc123_1700000000000",
    "theme": "Summer Vibes ☀️",
    "description": "Show your best summer look!",
    "prizePool": "50000000000",
    "status": "active",
    "phase": "entry",
    "startTime": 1700000000000,
    "endTime": 1700086400000,
    "votingEndTime": 1700172800000,
    "timeRemaining": 82800000,
    "entryCount": 42,
    "userEntry": {
      "id": "entry_xyz789_1700000000000",
      "photoUrl": "https://res.cloudinary.com/.../entry.jpg",
      "votes": 0,
      "rank": null
    },
    "hasSubmitted": true,
    "hasVoted": false,
    "votedFor": null,
    "entries": []
  },
  "meta": {
    "requestId": "req_...",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

**Note:** Entries are only visible during voting phase or after completion.

---

### GET /api/challenges/:id

Get specific challenge details with all entries and leaderboard.

#### URL Parameters

| Parameter | Description |
|-----------|-------------|
| `id` | Challenge ID |

#### Response

```json
{
  "success": true,
  "data": {
    "id": "challenge_abc123_1700000000000",
    "theme": "Summer Vibes ☀️",
    "description": "Show your best summer look!",
    "prizePool": "50000000000",
    "status": "voting",
    "startTime": 1700000000000,
    "endTime": 1700086400000,
    "votingEndTime": 1700172800000,
    "entryCount": 42,
    "entries": [
      {
        "id": "entry_001_1700000000000",
        "userId": "123456789",
        "username": "fashionista",
        "photoUrl": "https://res.cloudinary.com/.../entry1.jpg",
        "votes": 15,
        "rank": 1,
        "isOwnEntry": false,
        "isVotedFor": true
      }
    ],
    "userVote": {
      "entryId": "entry_001_1700000000000",
      "timestamp": 1700100000000
    }
  },
  "meta": {
    "requestId": "req_...",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### GET /api/challenges

List recent challenges (paginated).

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 10 | Challenges to return (max 50) |

#### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "challenge_abc123_1700000000000",
      "theme": "Summer Vibes ☀️",
      "description": "Show your best summer look!",
      "prizePool": "50000000000",
      "status": "completed",
      "startTime": 1700000000000,
      "endTime": 1700086400000,
      "entryCount": 42
    }
  ],
  "meta": {
    "requestId": "req_...",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### POST /api/challenges

Create a new challenge (Admin only).

#### Request Body

```json
{
  "theme": "Summer Vibes ☀️",
  "description": "Show your best summer look!",
  "prizePool": 50000000000,
  "duration": 86400000,
  "startTime": 1700000000000
}
```

#### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `theme` | string | **Yes** | Challenge theme (3-100 chars) |
| `description` | string | **Yes** | Challenge description (10-500 chars) |
| `prizePool` | number | No | Prize pool in nanoton (default: 50 TON) |
| `duration` | number | No | Entry phase duration in ms (default: 24h) |
| `startTime` | number | No | Start timestamp (default: now) |

#### Response (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "challenge_xyz789_1700000000000",
    "theme": "Summer Vibes ☀️",
    "description": "Show your best summer look!",
    "prizePool": "50000000000",
    "status": "active",
    "startTime": 1700000000000,
    "endTime": 1700086400000,
    "votingEndTime": 1700172800000,
    "entryCount": 0,
    "createdAt": 1700000000000,
    "createdBy": "123456789"
  },
  "meta": {
    "message": "Challenge created successfully",
    "requestId": "req_...",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

---

## Challenge Entry API

### POST /api/challenges/entry

Submit an entry to the current challenge.

#### Request Body

```json
{
  "photoBase64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ...",
  "outfitId": "outfit_abc123_1700000000000"
}
```

Or with pre-uploaded image:

```json
{
  "photoUrl": "https://res.cloudinary.com/.../entry.jpg",
  "outfitId": "outfit_abc123_1700000000000"
}
```

#### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `photoBase64` | string | * | Base64 encoded photo |
| `photoUrl` | string | * | Pre-uploaded photo URL |
| `outfitId` | string | No | Optional linked outfit ID |

#### Response (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "entry_xyz789_1700000000000",
    "challengeId": "challenge_abc123_1700000000000",
    "photoUrl": "https://res.cloudinary.com/.../entry.jpg",
    "outfitId": "outfit_abc123_1700000000000",
    "createdAt": 1700000000000,
    "xpEarned": 25,
    "message": "Entry submitted successfully!"
  },
  "meta": {
    "message": "Entry submitted successfully",
    "requestId": "req_...",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Errors

- `DUPLICATE_ENTRY` (409) - User already has an entry in this challenge
- Content moderation may reject inappropriate images

---

### DELETE /api/challenges/entry/:id

Remove an entry (only allowed during entry phase).

#### URL Parameters

| Parameter | Description |
|-----------|-------------|
| `id` | Entry ID |

#### Response

```json
{
  "success": true,
  "data": {
    "deletedEntryId": "entry_xyz789_1700000000000",
    "message": "Entry deleted successfully"
  },
  "meta": {
    "requestId": "req_...",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

---

## Voting API

### POST /api/challenges/vote

Cast a vote for an entry.

#### Request Body

```json
{
  "entryId": "entry_xyz789_1700000000000"
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "vote": {
      "userId": "123456789",
      "challengeId": "challenge_abc123_1700000000000",
      "entryId": "entry_xyz789_1700000000000",
      "timestamp": 1700000000000
    },
    "entry": {
      "id": "entry_xyz789_1700000000000",
      "votes": 16
    },
    "message": "Vote cast successfully!"
  },
  "meta": {
    "requestId": "req_...",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Voting Rules

- One vote per user per challenge
- Cannot vote for own entry
- Votes cannot be changed
- Rate limit: 1 vote per second

#### Errors

- `ALREADY_VOTED` (409) - User already voted in this challenge
- `SELF_VOTE_NOT_ALLOWED` (403) - Cannot vote for own entry
- `RATE_LIMITED` (429) - Voting too fast

---

### GET /api/challenges/votes

Get user's vote status for current challenge.

#### Response

```json
{
  "success": true,
  "data": {
    "challengeId": "challenge_abc123_1700000000000",
    "hasVoted": true,
    "vote": {
      "entryId": "entry_xyz789_1700000000000",
      "timestamp": 1700000000000
    }
  },
  "meta": {
    "requestId": "req_...",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

---

## Leaderboard API

### GET /api/leaderboard/global

Get global leaderboard sorted by total XP.

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 50 | Users to return (max 100) |
| `offset` | number | 0 | Pagination offset |

#### Response

```json
{
  "success": true,
  "data": {
    "leaderboard": [
      {
        "userId": "123456789",
        "username": "fashionista",
        "avatarUrl": "https://t.me/i/userpic/...",
        "totalXP": 2500,
        "level": 10,
        "challengesWon": 5,
        "rank": 1,
        "isCurrentUser": false
      }
    ],
    "pagination": {
      "total": 150,
      "limit": 50,
      "offset": 0,
      "hasMore": true
    },
    "userRank": 42
  },
  "meta": {
    "requestId": "req_...",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### GET /api/leaderboard/weekly

Get weekly leaderboard (resets every Monday 00:00 UTC).

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 50 | Users to return (max 100) |
| `offset` | number | 0 | Pagination offset |

#### Response

```json
{
  "success": true,
  "data": {
    "leaderboard": [
      {
        "userId": "123456789",
        "username": "fashionista",
        "avatarUrl": "https://t.me/i/userpic/...",
        "weeklyXP": 500,
        "rank": 1,
        "isCurrentUser": false
      }
    ],
    "pagination": {
      "total": 80,
      "limit": 50,
      "offset": 0,
      "hasMore": true
    },
    "userRank": 15,
    "nextReset": 1700611200000,
    "timeRemaining": 432000000
  },
  "meta": {
    "requestId": "req_...",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### GET /api/leaderboard/challenge/:id

Get challenge-specific leaderboard sorted by votes.

#### URL Parameters

| Parameter | Description |
|-----------|-------------|
| `id` | Challenge ID |

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 50 | Entries to return (max 100) |

#### Response

```json
{
  "success": true,
  "data": {
    "challengeId": "challenge_abc123_1700000000000",
    "theme": "Summer Vibes ☀️",
    "status": "completed",
    "prizePool": "50000000000",
    "leaderboard": [
      {
        "entryId": "entry_001_1700000000000",
        "userId": "123456789",
        "username": "fashionista",
        "photoUrl": "https://res.cloudinary.com/.../entry.jpg",
        "votes": 150,
        "rank": 1,
        "prizeWon": "25000000000",
        "isWinner": true,
        "isCurrentUser": false
      }
    ],
    "userEntry": {
      "rank": 5,
      "votes": 45,
      "prizeWon": "1250000000"
    },
    "totalEntries": 42
  },
  "meta": {
    "requestId": "req_...",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

---

## Winners API

### GET /api/challenges/winners/:id

Get winners for a completed challenge.

#### URL Parameters

| Parameter | Description |
|-----------|-------------|
| `id` | Challenge ID |

#### Response (Completed Challenge)

```json
{
  "success": true,
  "data": {
    "challengeId": "challenge_abc123_1700000000000",
    "status": "completed",
    "isFinal": true,
    "distributedAt": 1700172800000,
    "totalPrizeDistributed": "50000000000",
    "winners": [
      {
        "rank": 1,
        "entryId": "entry_001_1700000000000",
        "userId": "123456789",
        "username": "fashionista",
        "votes": 150,
        "prizeWon": "25000000000",
        "percentage": 50
      },
      {
        "rank": 2,
        "entryId": "entry_002_1700000000000",
        "userId": "987654321",
        "username": "styleicon",
        "votes": 100,
        "prizeWon": "15000000000",
        "percentage": 30
      },
      {
        "rank": 3,
        "entryId": "entry_003_1700000000000",
        "userId": "456789123",
        "username": "trendsetter",
        "votes": 75,
        "prizeWon": "7500000000",
        "percentage": 15
      }
    ]
  },
  "meta": {
    "requestId": "req_...",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Response (Active/Voting Challenge)

```json
{
  "success": true,
  "data": {
    "challengeId": "challenge_abc123_1700000000000",
    "status": "voting",
    "isFinal": false,
    "currentStandings": [
      {
        "rank": 1,
        "entryId": "entry_001_1700000000000",
        "userId": "123456789",
        "username": "fashionista",
        "votes": 150,
        "photoUrl": "https://res.cloudinary.com/.../entry.jpg"
      }
    ]
  },
  "meta": {
    "requestId": "req_...",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### POST /api/challenges/close

Close challenge and distribute prizes (Admin/Cron only).

#### Request Body

```json
{
  "challengeId": "challenge_abc123_1700000000000",
  "forceClose": false,
  "autoCreateNext": true
}
```

#### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `challengeId` | string | No | Challenge to close (defaults to current) |
| `forceClose` | boolean | No | Force close even if voting not ended |
| `autoCreateNext` | boolean | No | Auto-create next challenge (default: true) |

#### Response

```json
{
  "success": true,
  "data": {
    "challengeId": "challenge_abc123_1700000000000",
    "status": "completed",
    "totalEntries": 42,
    "prizePool": "50000000000",
    "totalDistributed": "50000000000",
    "winners": [
      {
        "rank": 1,
        "entryId": "entry_001_1700000000000",
        "userId": "123456789",
        "username": "fashionista",
        "votes": 150,
        "prizeWon": "25000000000",
        "xpAwarded": 500
      }
    ],
    "message": "Challenge closed and prizes distributed successfully"
  },
  "meta": {
    "requestId": "req_...",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

---

## Prize Distribution

### Distribution Formula (50 TON Example)

| Rank | Percentage | Prize (TON) |
|------|------------|-------------|
| 1st | 50% | 25 TON |
| 2nd | 30% | 15 TON |
| 3rd | 15% | 7.5 TON |
| 4th | 2.5% | 1.25 TON |
| 5th | 2.5% | 1.25 TON |
| 6-10th | Split remaining | Equal share |

---

## XP Rewards

| Action | XP Earned |
|--------|-----------|
| Add wardrobe item | 10 XP |
| Submit challenge entry | 25 XP |
| Cast a vote | 5 XP |
| Win 1st place | 500 XP |
| Win 2nd place | 300 XP |
| Win 3rd place | 150 XP |
| Top 10 finish | 50 XP |

---

## Cron Job

### GET /api/cron/challenge

Automated challenge lifecycle management. Runs daily at 00:00 UTC.

**Headers:**
```
X-Cron-Secret: your-cron-secret
```

This endpoint:
1. Checks current challenge status
2. Transitions entry → voting → completed
3. Calculates winners and distributes prizes
4. Creates new daily challenge
5. Resets weekly leaderboard on Mondays

---

## Image Upload (Cloudinary)

### Client-Side Upload

For better performance, upload images directly to Cloudinary from the client:

```javascript
// 1. Get upload signature from your backend
const response = await fetch('/api/upload/signature', {
  headers: {
    'X-Telegram-Init-Data': window.Telegram.WebApp.initData
  }
});
const { signature, timestamp, apiKey, cloudName, folder } = await response.json();

// 2. Upload to Cloudinary
const formData = new FormData();
formData.append('file', file);
formData.append('api_key', apiKey);
formData.append('timestamp', timestamp);
formData.append('signature', signature);
formData.append('folder', folder);
formData.append('upload_preset', 'fashionton_uploads');

const uploadResponse = await fetch(
  `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
  {
    method: 'POST',
    body: formData
  }
);

const { secure_url } = await uploadResponse.json();
```

### Image Transformations

Cloudinary supports on-the-fly image transformations:

| Transformation | URL Example |
|----------------|-------------|
| Thumbnail (300x300) | `/image/upload/w_300,h_300,c_fill/q_auto/...` |
| Medium (800px width) | `/image/upload/w_800,q_auto/...` |
| Square crop | `/image/upload/w_600,h_600,c_crop/...` |

---

## CORS

All API endpoints support Cross-Origin Resource Sharing:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Telegram-Init-Data, X-Cron-Secret
```

---

## Rate Limiting

Default rate limits:
- 100 requests per minute per user
- 10 image uploads per minute per user
- 1 vote per second per user

Rate limit headers (when applicable):
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1700000000
```

---

## Environment Variables

Required environment variables for the API:

```env
# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token

# Vercel KV
KV_REST_API_URL=https://your-kv-url.vercel-storage.com
KV_REST_API_TOKEN=your_token

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_UPLOAD_PRESET=fashionton_uploads

# Admin & Cron
ADMIN_USER_IDS=123456789,987654321
CRON_SECRET=your-secure-cron-secret

# TON (for future prize distribution)
TON_WALLET_ADDRESS=your_ton_wallet_address
```

---

## SDK Examples

### JavaScript/TypeScript

```typescript
class FashionTONAPI {
  private baseURL: string;
  private initData: string;

  constructor(baseURL: string, initData: string) {
    this.baseURL = baseURL;
    this.initData = initData;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Init-Data': this.initData,
        ...options.headers
      }
    });
    return response.json();
  }

  // User
  getUser() {
    return this.request('/user');
  }

  updateUser(data: Partial<User>) {
    return this.request('/user', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  deleteUser() {
    return this.request('/user', {
      method: 'DELETE',
      body: JSON.stringify({ confirmDelete: true })
    });
  }

  // Wardrobe
  getWardrobe(category?: string) {
    const params = category ? `?category=${category}` : '';
    return this.request(`/wardrobe${params}`);
  }

  addItem(item: NewWardrobeItem) {
    return this.request('/wardrobe', {
      method: 'POST',
      body: JSON.stringify(item)
    });
  }

  updateItem(id: string, updates: Partial<WardrobeItem>) {
    return this.request(`/wardrobe/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  deleteItem(id: string) {
    return this.request(`/wardrobe/${id}`, {
      method: 'DELETE'
    });
  }

  // Challenges
  getCurrentChallenge() {
    return this.request('/challenges/current');
  }

  getChallenge(id: string) {
    return this.request(`/challenges/${id}`);
  }

  submitEntry(photoUrl: string, outfitId?: string) {
    return this.request('/challenges/entry', {
      method: 'POST',
      body: JSON.stringify({ photoUrl, outfitId })
    });
  }

  deleteEntry(entryId: string) {
    return this.request(`/challenges/entry/${entryId}`, {
      method: 'DELETE'
    });
  }

  vote(entryId: string) {
    return this.request('/challenges/vote', {
      method: 'POST',
      body: JSON.stringify({ entryId })
    });
  }

  getMyVote() {
    return this.request('/challenges/votes');
  }

  // Leaderboards
  getGlobalLeaderboard(limit?: number, offset?: number) {
    const params = new URLSearchParams();
    if (limit) params.set('limit', limit.toString());
    if (offset) params.set('offset', offset.toString());
    return this.request(`/leaderboard/global?${params}`);
  }

  getWeeklyLeaderboard(limit?: number, offset?: number) {
    const params = new URLSearchParams();
    if (limit) params.set('limit', limit.toString());
    if (offset) params.set('offset', offset.toString());
    return this.request(`/leaderboard/weekly?${params}`);
  }

  getChallengeLeaderboard(challengeId: string) {
    return this.request(`/leaderboard/challenge/${challengeId}`);
  }

  getWinners(challengeId: string) {
    return this.request(`/challenges/winners/${challengeId}`);
  }
}

// Usage
const api = new FashionTONAPI(
  'https://fashionton.app/api',
  window.Telegram.WebApp.initData
);

const challenge = await api.getCurrentChallenge();
const leaderboard = await api.getGlobalLeaderboard(50);
```

---

## Changelog

### v2.0.0 (Phase 2 - Challenge System)
- Daily fashion challenges with TON prizes
- Challenge entry submission with photo upload
- Voting system with one-vote-per-user enforcement
- Global and weekly leaderboards
- Automatic prize distribution
- Challenge lifecycle automation via cron
- XP rewards system

### v1.0.0 (Phase 1)
- User authentication via Telegram WebApp
- User profile CRUD operations
- Wardrobe item CRUD operations
- Cloudinary image upload integration
- GDPR-compliant account deletion

## Size Calculator API

### GET /api/size-calculator

Get list of supported brands and categories.

#### Response

```json
{
  "success": true,
  "data": {
    "brands": [
      { "key": "zara", "name": "Zara", "region": "EU", "categories": ["tops", "bottoms", "dresses", "shoes"] },
      { "key": "nike", "name": "Nike", "region": "US", "categories": ["tops", "bottoms", "dresses", "shoes"] }
    ],
    "categories": ["tops", "bottoms", "dresses", "shoes"],
    "totalBrands": 11
  },
  "meta": {
    "message": "List of supported brands and categories",
    "requestId": "req_...",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### POST /api/size-calculator

Calculate recommended size based on measurements.

#### Request Body

```json
{
  "brand": "zara",
  "category": "dresses",
  "measurements": {
    "bust": 86,
    "waist": 68,
    "hips": 94,
    "height": 165
  },
  "preferredFit": "regular"
}
```

#### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `brand` | string | **Yes** | Brand key (zara, nike, hm, uniqlo, etc.) |
| `category` | string | **Yes** | Category (tops, bottoms, dresses, shoes) |
| `measurements` | object | **Yes** | Body measurements in cm |
| `measurements.bust` | number | *Conditional* | Bust/chest circumference (required for tops, dresses) |
| `measurements.waist` | number | *Conditional* | Waist circumference (required for tops, bottoms, dresses) |
| `measurements.hips` | number | *Conditional* | Hip circumference (required for bottoms, dresses) |
| `measurements.footLength` | number | *Conditional* | Foot length in cm (required for shoes) |
| `preferredFit` | string | No | Fit preference: `tight`, `regular` (default), `loose` |

#### Response

```json
{
  "success": true,
  "data": {
    "recommendedSize": "M",
    "confidence": 0.92,
    "alternativeSizes": ["S"],
    "sizeChart": {
      "S": { "bust": "82-86", "waist": "64-68" },
      "M": { "bust": "86-90", "waist": "68-72" },
      "L": { "bust": "90-94", "waist": "72-76" }
    },
    "fitNotes": "Size M is a perfect match for your measurements. Regular fit will provide a comfortable, standard fit.",
    "measurements": {
      "provided": { "bust": 86, "waist": 68, "hips": 94 },
      "matched": {
        "bust": { "provided": 86, "range": "86-90", "score": 0.95 },
        "waist": { "provided": 68, "range": "68-72", "score": 0.90 }
      }
    },
    "brand": {
      "name": "Zara",
      "region": "EU"
    }
  },
  "meta": {
    "requestId": "req_...",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Supported Brands

| Brand | Key | Region |
|-------|-----|--------|
| Zara | `zara` | EU |
| H&M | `hm` | EU |
| Uniqlo | `uniqlo` | JP |
| Nike | `nike` | US |
| Adidas | `adidas` | US |
| ASOS | `asos` | UK |
| Shein | `shein` | CN |
| Mango | `mango` | EU |
| Topshop | `topshop` | UK |
| Forever 21 | `forever21` | US |
| GAP | `gap` | US |

---

## Daily Check-in API

### GET /api/checkin

Get user's check-in status, streak, and history.

#### Response

```json
{
  "success": true,
  "data": {
    "currentStreak": 7,
    "longestStreak": 14,
    "lastCheckIn": "2024-01-15",
    "totalCheckins": 45,
    "canCheckInToday": true,
    "today": "2024-01-15",
    "nextReward": {
      "type": "streak_milestone",
      "daysRequired": 14,
      "reward": "2-Week Streak Badge",
      "xpBonus": 250,
      "daysRemaining": 7
    },
    "recentHistory": [
      { "date": "2024-01-14", "streak": 6, "xpAwarded": 60 },
      { "date": "2024-01-13", "streak": 5, "xpAwarded": 50 }
    ],
    "streakAtRisk": false
  },
  "meta": {
    "message": "You can check in today!",
    "requestId": "req_...",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### POST /api/checkin

Record daily check-in and earn XP.

#### Response (Success)

```json
{
  "success": true,
  "data": {
    "checkIn": {
      "date": "2024-01-15",
      "streak": 7,
      "xpAwarded": 110,
      "breakdown": {
        "base": 50,
        "streakBonus": 60
      }
    },
    "stats": {
      "currentStreak": 7,
      "longestStreak": 14,
      "totalCheckins": 45,
      "totalXP": 1250,
      "level": 5,
      "leveledUp": false
    },
    "nextReward": {
      "type": "streak_milestone",
      "daysRequired": 14,
      "reward": "2-Week Streak Badge",
      "xpBonus": 250,
      "daysRemaining": 7
    },
    "message": "🔥 7 day streak! You're on fire!"
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Response (Already Checked In)

```json
{
  "success": false,
  "error": {
    "code": "ALREADY_CHECKED_IN",
    "message": "You have already checked in today. Come back tomorrow!"
  },
  "meta": { ... }
}
```

---

## XP & Leveling API

### GET /api/xp

Get user's XP, level, and progression info.

#### Response

```json
{
  "success": true,
  "data": {
    "current": {
      "level": 5,
      "title": "Fashionista",
      "totalXP": 1250,
      "perks": ["Title: Fashionista", "Early access to challenges"]
    },
    "next": {
      "level": 6,
      "title": "Style Icon",
      "xpRequired": 2000,
      "xpNeeded": 750,
      "progressPercent": 37,
      "perks": ["+15 wardrobe slots", "Custom profile badge"]
    },
    "progress": {
      "current": 250,
      "target": 1000,
      "percent": 25
    },
    "allLevels": [
      { "level": 1, "xp": 0, "title": "Fashion Newbie", "perks": ["Starter wardrobe"] },
      { "level": 2, "xp": 100, "title": "Style Explorer", "perks": ["+5 wardrobe slots"] },
      { "level": 3, "xp": 250, "title": "Trendsetter", "perks": ["Title: Stylist"] },
      { "level": 4, "xp": 500, "title": "Wardrobe Wizard", "perks": ["+10 wardrobe slots"] },
      { "level": 5, "xp": 1000, "title": "Fashionista", "perks": ["Title: Fashionista", "Early access to challenges"] }
    ],
    "recentHistory": [
      { "action": "CHECKIN", "name": "Daily Check-in", "xp": 110, "timestamp": 1705315800000 },
      { "action": "UPLOAD_ITEM", "name": "Upload Wardrobe Item", "xp": 25, "timestamp": 1705314000000 }
    ],
    "actionRewards": [
      { "action": "CHECKIN", "name": "Daily Check-in", "xp": 50, "cooldown": 0, "once": false },
      { "action": "UPLOAD_ITEM", "name": "Upload Wardrobe Item", "xp": 25, "cooldown": 0, "once": false },
      { "action": "CREATE_OUTFIT", "name": "Create Outfit", "xp": 50, "cooldown": 60000, "once": false },
      { "action": "WIN_CHALLENGE", "name": "Win Challenge", "xp": 100, "cooldown": 0, "once": false },
      { "action": "SHARE_OUTFIT", "name": "Share Outfit", "xp": 25, "cooldown": 300000, "once": false },
      { "action": "COMPLETE_PROFILE", "name": "Complete Profile", "xp": 100, "cooldown": 0, "once": true }
    ]
  },
  "meta": {
    "message": "Level 5 - Fashionista",
    "requestId": "req_...",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### POST /api/xp

Award XP for specific actions.

#### Request Body

```json
{
  "action": "CREATE_OUTFIT"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `action` | string | **Yes** | Action type (CHECKIN, UPLOAD_ITEM, CREATE_OUTFIT, etc.) |
| `xp` | number | No | Custom XP amount (for special cases) |

#### Actions

| Action | XP | Cooldown | Description |
|--------|-----|----------|-------------|
| `CHECKIN` | 50 | None | Daily check-in |
| `UPLOAD_ITEM` | 25 | None | Upload wardrobe item |
| `CREATE_OUTFIT` | 50 | 1 min | Create an outfit |
| `WIN_CHALLENGE` | 100 | None | Win a challenge |
| `SHARE_OUTFIT` | 25 | 5 min | Share outfit externally |
| `COMPLETE_PROFILE` | 100 | One-time | Complete user profile |

#### Response

```json
{
  "success": true,
  "data": {
    "awarded": {
      "action": "CREATE_OUTFIT",
      "name": "Create Outfit",
      "xp": 50
    },
    "stats": {
      "oldLevel": 5,
      "newLevel": 6,
      "oldXP": 1950,
      "newXP": 2000,
      "leveledUp": true,
      "xpToNextLevel": 1500
    },
    "message": "🎉 Level Up! You are now level 6!"
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

---

## Changelog

### v1.2.0 (Phase 2 - Size Calculator & Gamification)
- Size Calculator API with 11+ brand size charts
- Daily Check-in API with streak tracking
- XP & Leveling System API
- Level perks and progression

