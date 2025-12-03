#!/usr/bin/env node

/**
 * Inject environment variables into index.html for web builds
 * This runs AFTER expo export and modifies the dist/index.html file
 */

const fs = require('fs');
const path = require('path');

const envVars = {
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || 'https://app-cook-backend.onrender.com',
  EXPO_PUBLIC_FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  EXPO_PUBLIC_FIREBASE_APP_ID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
  EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME: process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || '',
};

const indexPath = path.join(__dirname, '..', 'dist', 'index.html');

if (!fs.existsSync(indexPath)) {
  console.log('⚠️  dist/index.html not found, skipping env injection');
  process.exit(0);
}

let html = fs.readFileSync(indexPath, 'utf8');

// Inject env vars as inline script in <head>
const envScript = `
<script>
  window._env_ = ${JSON.stringify(envVars, null, 2)};
</script>
`;

// Insert before </head>
html = html.replace('</head>', `${envScript}</head>`);

fs.writeFileSync(indexPath, html);

console.log('✅ Environment variables injected into index.html');
