# FashionTON Backend Deployment

## Option 1: Railway (Recommended) - Manual Deploy

### Step 1: Push to GitHub
```bash
cd ~/Desktop/telegram-mini-app/backend
git init
git add .
git commit -m "Initial backend"
# Create GitHub repo and push
```

### Step 2: Deploy via Railway Dashboard
1. Go to https://railway.app/new
2. Select "Deploy from GitHub repo"
3. Connect your GitHub account
4. Select the backend repo
5. Add environment variables:
   - `UPSTASH_REDIS_REST_URL` = `https://ultimate-ape-39168.upstash.io`
   - `UPSTASH_REDIS_REST_TOKEN` = `AZkAAAIncDIxZjNkMTFjMTYyYzQ0ZWY4YTgxNDgwNjMwMTc5ZDVmMHAyMzkxNjg`
   - `TELEGRAM_BOT_TOKEN` = `8045165561:AAGOknrIrvhNo5eG8SGX06bbY49aMN0Xfq4`
6. Click Deploy

Your backend will be live at: `https://fashionton-backend.up.railway.app`

---

## Option 2: Render - Blueprint Deploy

1. Go to https://dashboard.render.com/blueprints
2. Click "New Blueprint Instance"
3. Connect your GitHub repo
4. Render will read `render.yaml` and auto-configure
5. Deploy!

---

## Option 3: Fly.io - CLI Deploy

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Launch app
cd ~/Desktop/telegram-mini-app/backend
fly launch --name fashionton-backend

# Set secrets
fly secrets set UPSTASH_REDIS_REST_URL="https://ultimate-ape-39168.upstash.io"
fly secrets set UPSTASH_REDIS_REST_TOKEN="AZkAAAIncDIxZjNkMTFjMTYyYzQ0ZWY4YTgxNDgwNjMwMTc5ZDVmMHAyMzkxNjg"
fly secrets set TELEGRAM_BOT_TOKEN="8045165561:AAGOknrIrvhNo5eG8SGX06bbY49aMN0Xfq4"

# Deploy
fly deploy
```

---

## Option 4: Local Test (Development)

```bash
cd ~/Desktop/telegram-mini-app/backend
npm install
npm start

# Test in browser:
# http://localhost:3000
```

---

## After Deployment

Once your backend is live, update the frontend:

1. **Copy your backend URL** (e.g., `https://fashionton-backend.up.railway.app`)

2. **Update frontend API client**:
   Edit `public/js/api-client.js`:
   ```javascript
   return 'https://YOUR-BACKEND-URL/api';
   ```

3. **Redeploy frontend to Vercel**:
   ```bash
   cd ~/Desktop/telegram-mini-app
   npx vercel@latest --token=NmaXF5vI95ixx7msiARubV6y --yes --prod
   ```

---

## Testing the API

Once deployed, test with curl:

```bash
# Health check
curl https://YOUR-BACKEND-URL/

# Get leaderboard
curl https://YOUR-BACKEND-URL/api/leaderboard/global

# Get current challenge
curl https://YOUR-BACKEND-URL/api/challenges/current
```
