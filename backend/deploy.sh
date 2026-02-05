#!/bin/bash
# Deploy to Railway via Git

git init 2>/dev/null
git add .
git commit -m "Fix CORS and add preflight support"

# Railway deploy
railway up

echo "Deployed! Check your Railway dashboard for the URL."
