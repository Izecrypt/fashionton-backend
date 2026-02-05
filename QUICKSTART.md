# FashionTON Wardrobe - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Environment Setup

```bash
# Install dependencies
npm install

# Or use yarn
yarn install
```

### Step 2: Configure Environment

```bash
# Copy example env file
cp .env.example .env.local

# Edit .env.local with your values:
```

```env
# Telegram Bot (from @BotFather)
TELEGRAM_BOT_TOKEN=your_bot_token

# TON Connect (from tonconsole.com)
TON_MANIFEST_URL=https://your-domain.com/tonconnect-manifest.json

# Cloudinary (for image uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Vercel KV (database)
KV_URL=your_kv_url
KV_REST_API_URL=your_kv_rest_url
KV_REST_API_TOKEN=your_kv_token
```

### Step 3: Run Development Server

```bash
# Start local dev server
npm run dev

# App will be at http://localhost:3000
```

### Step 4: Test in Telegram

1. Open Telegram Web App: https://web.telegram.org
2. Find your bot (@FashionTONbot)
3. Start the bot
4. Open the Mini App

### Step 5: Deploy

```bash
# Deploy to Vercel
vercel --prod

# Update BotFather with production URL
# Set Menu Button URL: https://your-domain.com
```

## 📋 Development Checklist

### Phase 1: Foundation (Days 1-2)
- [ ] Project scaffold complete
- [ ] Telegram auth working
- [ ] Image upload to Cloudinary
- [ ] Basic UI layout

### Phase 2: Core Features (Days 3-7)
- [ ] Wardrobe CRUD working
- [ ] Outfit creator functional
- [ ] Size calculator accurate
- [ ] Challenge system live

### Phase 3: Monetization (Days 8-10)
- [ ] TON Connect integrated
- [ ] Premium subscription flow
- [ ] Creator tipping working
- [ ] Payment verification

### Phase 4: Polish (Days 11-13)
- [ ] AR try-on (if implemented)
- [ ] All animations smooth
- [ ] Mobile optimized
- [ ] QA passed

### Phase 5: Launch (Days 14-15)
- [ ] BotFather configured
- [ ] Legal pages live
- [ ] Marketing ready
- [ ] 🚀 LAUNCH!

## 🐛 Common Issues

### Issue: Telegram auth not working
**Fix**: Ensure `initData` is being passed correctly:
```javascript
const initData = Telegram.WebApp.initData;
const user = verifyTelegramWebAppData(initData);
```

### Issue: Image uploads failing
**Fix**: Check Cloudinary config:
- Upload preset must allow unsigned uploads
- CORS enabled on Cloudinary
- File size < 10MB

### Issue: TON payments not processing
**Fix**: 
- Verify manifest URL is accessible
- Check wallet has sufficient balance
- Ensure testnet vs mainnet match

### Issue: Slow load times
**Fix**:
- Enable image lazy loading
- Use Cloudinary transformations
- Implement API caching

## 🧪 Testing Commands

```bash
# Run unit tests
npm test

# Run E2E tests
npm run test:e2e

# Test TON payments (testnet)
npm run test:ton

# Load test API
npm run test:load
```

## 📚 Resources

- [Telegram Mini Apps Docs](https://core.telegram.org/bots/webapps)
- [TON Connect Docs](https://docs.ton.org/develop/dapps/ton-connect/)
- [Vercel KV Docs](https://vercel.com/docs/storage/vercel-kv)
- [Cloudinary Docs](https://cloudinary.com/documentation)

## 💬 Need Help?

- Check agent briefs in `briefs/` folder
- Review test cases in `qa/`
- Ask in Telegram community

---

Happy building! 👗💎
