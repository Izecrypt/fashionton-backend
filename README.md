# FashionTON Wardrobe 👗💎

The first fashion-focused Telegram Mini App in the TON ecosystem. Virtual wardrobe management, AR try-ons, style challenges with TON rewards.

![FashionTON](https://img.shields.io/badge/Powered%20by-TON-blue)
![Telegram](https://img.shields.io/badge/Telegram-Mini%20App-2CA5E0)

## 🎯 Concept

FashionTON Wardrobe combines:
- 👗 **Virtual Wardrobe** - Upload and organize your clothing
- 📸 **AR Try-On** - See outfits before buying
- 📏 **Smart Size Calculator** - Perfect fit recommendations
- 🏆 **Style Challenges** - Daily competitions with TON prizes
- 💎 **Creator Economy** - Tip stylists, earn from your style

## 🚀 Quick Start

```bash
# 1. Clone and install
git clone <repo-url>
cd telegram-mini-app
npm install

# 2. Set up environment
cp .env.example .env.local
# Edit .env.local with your keys

# 3. Run locally
npm run dev

# 4. Deploy
vercel --prod
```

## 📁 Project Structure

```
├── briefs/              # 5-agent team briefs
├── src/                 # Frontend source
│   ├── index.html       # Main mini app
│   ├── styles/          # CSS themes
│   ├── components/      # Reusable UI
│   └── ton-connect.js   # TON integration
├── api/                 # Vercel serverless functions
│   ├── wardrobe/        # Wardrobe CRUD
│   ├── challenges/      # Challenge system
│   ├── size-calculator/ # Size recommendations
│   └── payments/        # TON payments
├── legal/               # Privacy, terms
└── docs/                # Documentation
```

## 🎨 Design System

- **Primary**: Fashion Pink `#FF6B9D`
- **Secondary**: TON Blue `#0088CC`
- **Accent**: Champagne Gold `#FFD700`
- **Style**: Glassmorphism, Instagram-inspired

See `briefs/01-PIXEL-BRIEF.md` for full design specs.

## 🔧 API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/wardrobe` | List user's wardrobe |
| `POST /api/wardrobe` | Add wardrobe item |
| `GET /api/challenges/current` | Today's challenge |
| `POST /api/challenges/entry` | Submit entry |
| `POST /api/size-calculator` | Get size recommendation |
| `POST /api/payments/verify` | Verify TON payment |

See `briefs/02-STACK-BRIEF.md` for full API spec.

## 💎 TON Integration

```javascript
// Initialize TON Connect
const tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
    manifestUrl: 'https://fashionton.app/tonconnect-manifest.json',
    buttonRootId: 'walletContainer'
});

// Premium subscription (10 TON/month)
const transaction = {
    validUntil: Math.floor(Date.now() / 1000) + 600,
    messages: [{
        address: 'YOUR_TON_ADDRESS',
        amount: '10000000000' // 10 TON
    }]
};
```

## 🏆 Challenge System

Daily themed challenges with TON prize pools:
- Users submit outfit photos
- Community votes (likes)
- Winners receive TON automatically
- Creators can earn tips

## 👥 5-Agent Team

| Agent | Role | File |
|-------|------|------|
| Pixel | UI/UX Design | `briefs/01-PIXEL-BRIEF.md` |
| Stack | Backend/API | `briefs/02-STACK-BRIEF.md` |
| Shield | Legal/Compliance | `briefs/03-SHIELD-BRIEF.md` |
| Buzz | Marketing/Growth | `briefs/04-BUZZ-BRIEF.md` |
| Check | QA/Testing | `briefs/05-CHECK-BRIEF.md` |

## 📱 Telegram Bot Setup

1. Message [@BotFather](https://t.me/BotFather)
2. Create new bot: `/newbot`
3. Name: `FashionTON Wardrobe`
4. Username: `@FashionTONbot`
5. Set menu button URL to your deployed app

## 🛡️ Compliance

- ✅ GDPR compliant
- ✅ Data export/deletion
- ✅ COPPA safe (no under-13 tracking)
- ✅ User content licensing
- ✅ TON payment terms

See `briefs/03-SHIELD-BRIEF.md` for full compliance docs.

## 📊 Success Metrics

| Metric | Week 1 | Month 1 | Month 3 |
|--------|--------|---------|---------|
| Users | 500 | 5,000 | 20,000 |
| D1 Retention | 40% | 45% | 50% |
| Premium Conv. | 3% | 5% | 7% |
| TON Volume | $100 | $1,000 | $5,000 |

## 🤝 Contributing

This project uses a 5-agent AI team workflow:
1. Review your agent brief in `briefs/`
2. Work in your assigned phase
3. Coordinate via daily standups
4. Submit for QA review

## 📜 License

MIT License - see [LICENSE](LICENSE)

## 💬 Community

- Telegram: [@FashionTON](https://t.me/FashionTON)
- Twitter: [@FashionTONapp](https://twitter.com/FashionTONapp)
- Discord: [discord.gg/fashionton](https://discord.gg/fashionton)

---

Built with 💎 on TON Blockchain
