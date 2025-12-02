# 🚀 Deploy Frontend to Cloudflare Pages

## Quick Start

### 1. Build for Production
```bash
npm run build:web
```

Tạo folder `dist/` với static files.

### 2. Deploy to Cloudflare Pages

#### Via Dashboard (Recommended)
1. Truy cập https://dash.cloudflare.com
2. **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
3. Select repo: `2025-27-09-App-Cook-Frontend`
4. Configure:
   - **Build command:** `npm run build:web`
   - **Build output:** `dist`
   - **Node version:** 20

5. Add Environment Variables (from `.env.cloudflare`):
   ```
   EXPO_PUBLIC_API_URL=https://your-app.onrender.com
   EXPO_PUBLIC_FIREBASE_API_KEY=...
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
   EXPO_PUBLIC_FIREBASE_APP_ID=...
   ```

6. **Save and Deploy** ✅

#### Via Wrangler CLI
```bash
# Install
npm install -g wrangler

# Login
wrangler login

# Deploy
npm run build:web
wrangler pages deploy dist --project-name=app-cook
```

### 3. Get Your URL
```
https://app-cook.pages.dev
```

### 4. Update Backend CORS
Add to Render environment variables:
```
FRONTEND_URL=https://app-cook.pages.dev
```

## 📱 Local Development
```bash
# Web
npm run web

# iOS
npm run ios

# Android
npm run android
```

## ✅ Verify Deployment
1. Open `https://app-cook.pages.dev`
2. Test login, create dish, search, favorites
3. Check DevTools Network tab for API calls

## 📚 Full Documentation
See `../2025-27-09-App-Cook-Backend/DEPLOY_GUIDE.md` for complete guide.
