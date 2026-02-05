# FashionTON Backend

Backend API for FashionTON Wardrobe - deployed on Railway.

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your credentials

# Run locally
npm run dev
```

## Deployment to Railway

### 1. Create Railway Account
- Go to https://railway.app
- Sign up (GitHub login recommended)

### 2. Create Project
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
cd backend
railway init

# Deploy
railway up
```

### 3. Add Environment Variables
In Railway dashboard, add:
- `TELEGRAM_BOT_TOKEN` - From @BotFather
- `UPSTASH_REDIS_REST_URL` - From Upstash
- `UPSTASH_REDIS_REST_TOKEN` - From Upstash

### 4. Get Domain
Railway provides a free domain like:
`https://fashionton-backend.up.railway.app`

## API Endpoints

### Health
- `GET /` - Health check

### User
- `GET /api/user` - Get profile (auth required)
- `POST /api/user` - Create profile (auth required)

### Wardrobe
- `GET /api/wardrobe?category=&limit=&offset=` - List items (auth)
- `POST /api/wardrobe` - Add item (auth)
- `PUT /api/wardrobe/:id` - Update item (auth)
- `DELETE /api/wardrobe/:id` - Delete item (auth)

### Challenges
- `GET /api/challenges/current` - Get current challenge
- `GET /api/challenges/:id/entries` - Get entries
- `POST /api/challenges/entry` - Submit entry (auth)
- `POST /api/challenges/vote` - Vote (auth)

### Check-in
- `GET /api/checkin` - Check status (auth)
- `POST /api/checkin` - Daily check-in (auth)

### Leaderboard
- `GET /api/leaderboard/global` - Global leaderboard

### Size Calculator
- `POST /api/size-calculator` - Calculate size

## Authentication

All protected endpoints require header:
```
X-Telegram-Init-Data: <telegram_web_app_init_data>
```

Get this from `window.Telegram.WebApp.initData` in the frontend.

## Database

Uses Upstash Redis (free tier):
- User profiles: `user:{userId}`
- Wardrobe items: `wardrobe:{userId}`
- Challenge entries: `challenge:{challengeId}:entries`
- Check-ins: `checkin:{userId}:{date}`

## Free Tier Limits

**Railway**: $5/month free, sleeps after inactivity  
**Upstash Redis**: 10,000 requests/day free

Perfect for MVP and testing!
