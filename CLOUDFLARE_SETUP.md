# Cloudflare Pages Environment Variables Setup

## Problem
Web app không đăng nhập được vì Firebase API key không hợp lệ:
```
Firebase: Error (auth/api-key-not-valid.-please-pass-a-valid-api-key.)
```

## Root Cause
- Cloudflare Pages cần environment variables được set trong dashboard
- Script `inject-env.js` sẽ inject các giá trị này vào `dist/env-config.js` khi build
- `index.html` load `env-config.js` để populate `window._env_`

## Solution: Add Environment Variables in Cloudflare Dashboard

### Step 1: Go to Cloudflare Pages Dashboard
1. Login to Cloudflare
2. Go to **Workers & Pages** → Select your project
3. Click **Settings** → **Environment variables**

### Step 2: Add Production Variables
Click **Add variable** và thêm các biến sau:

**⚠️ IMPORTANT: Get real values from:**
- Firebase Console: Project Settings → General
- Backend: Your Render/Railway deployment URL
- Cloudinary: Dashboard → Account Details

```bash
# Backend API
EXPO_PUBLIC_API_URL=https://your-backend.onrender.com

# Firebase Configuration (from Firebase Console)
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key_here
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id

# Cloudinary (for image uploads)
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
```

**⚠️ NEVER commit real API keys to Git!**

### Step 3: Redeploy
Sau khi add variables:
1. Go to **Deployments**
2. Click **···** menu on latest deployment
3. Click **Retry deployment**

## Verification
Sau khi deploy xong, check:

1. **View source** của `https://your-app.pages.dev`:
   - Phải thấy `<script src="/env-config.js"></script>` trong `<head>`

2. **Open** `https://your-app.pages.dev/env-config.js`:
   - Phải thấy giá trị thực, không phải `PLACEHOLDER_`
   ```javascript
   window._env_ = {
     EXPO_PUBLIC_API_URL: "https://your-backend.onrender.com",
     EXPO_PUBLIC_FIREBASE_API_KEY: "real_key_here",
     // ...
   };
   ```

3. **Browser console**:
   ```javascript
   window._env_.EXPO_PUBLIC_FIREBASE_API_KEY
   // Should return real key (not PLACEHOLDER)
   ```

## Files Modified
- ✅ `public/index.html` - Added `<script src="/env-config.js"></script>`
- ✅ `cloudflare-pages.toml` - Documented required env vars
- ✅ `scripts/inject-env.js` - Already working
- ✅ `lib/config.ts` - Already has `getEnv()` to read from `window._env_`

## Security Notes
- Environment variables in Cloudflare are encrypted at rest
- Only set values in Cloudflare dashboard, NOT in code
- Firebase Web API keys are public-facing (OK to expose in frontend)
- BUT still best practice to keep them in env vars for easy rotation

## OTP Timeout Issue
Nếu vẫn gặp lỗi "Phiên đăng nhập không tồn tại hoặc đã hết hạn":
- OTP có TTL = 5 phút trong backend
- Check Redis có chạy đúng không
- Check backend logs: Render dashboard → Logs tab
