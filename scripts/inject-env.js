#!/usr/bin/env node

/**
 * Inject environment variables into env-config.js for web builds
 * This runs AFTER expo export and modifies dist/env-config.js and dist/index.html
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

// Step 1: Replace placeholders in env-config.js
const envConfigPath = path.join(__dirname, '..', 'dist', 'env-config.js');
if (!fs.existsSync(envConfigPath)) {
  console.log('⚠️  dist/env-config.js not found, skipping env injection');
  process.exit(0);
}

let content = fs.readFileSync(envConfigPath, 'utf8');
Object.keys(envVars).forEach(key => {
  const placeholder = `PLACEHOLDER_${key.replace('EXPO_PUBLIC_', '')}`;
  const value = envVars[key];
  content = content.replace(new RegExp(placeholder, 'g'), value);
});
fs.writeFileSync(envConfigPath, content);
console.log('✅ Environment variables injected into env-config.js');

// Step 2: Add script tag to index.html
const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
if (!fs.existsSync(indexPath)) {
  console.log('⚠️  dist/index.html not found, skipping script injection');
  process.exit(0);
}

let html = fs.readFileSync(indexPath, 'utf8');

// Step 2a: Add icon fonts CSS with @font-face from local files (copied to public/fonts/)
// CRITICAL: Font-family names MUST match what @expo/vector-icons uses internally!
// Check node_modules/@expo/vector-icons/build/{IconSet}.js for exact fontFamily parameter
const iconFontsCSS = `
<style>
  @font-face {
    font-family: 'material';
    src: url('/fonts/MaterialIcons.ttf') format('truetype');
    font-weight: normal;
    font-style: normal;
    font-display: swap;
  }
  @font-face {
    font-family: 'material-community';
    src: url('/fonts/MaterialCommunityIcons.ttf') format('truetype');
    font-weight: normal;
    font-style: normal;
    font-display: swap;
  }
  @font-face {
    font-family: 'ionicons';
    src: url('/fonts/Ionicons.ttf') format('truetype');
    font-weight: normal;
    font-style: normal;
    font-display: swap;
  }
  @font-face {
    font-family: 'feather';
    src: url('/fonts/Feather.ttf') format('truetype');
    font-weight: normal;
    font-style: normal;
    font-display: swap;
  }
  @font-face {
    font-family: 'FontAwesome';
    src: url('/fonts/FontAwesome.ttf') format('truetype');
    font-weight: normal;
    font-style: normal;
    font-display: swap;
  }
  @font-face {
    font-family: 'anticon';
    src: url('/fonts/AntDesign.ttf') format('truetype');
    font-weight: normal;
    font-style: normal;
    font-display: swap;
  }
  @font-face {
    font-family: 'entypo';
    src: url('/fonts/Entypo.ttf') format('truetype');
    font-weight: normal;
    font-style: normal;
    font-display: swap;
  }
</style>
`.trim();

if (!html.includes('MaterialIcons')) {
  html = html.replace('<head>', `<head>${iconFontsCSS}`);
}

// Step 2b: Add env-config.js script
if (!html.includes('env-config.js')) {
  // Insert <script src="/env-config.js"></script> before </head>
  html = html.replace('</head>', '<script src="/env-config.js"></script></head>');
  fs.writeFileSync(indexPath, html);
  console.log('✅ Added env-config.js script tag to index.html');
} else {
  console.log('ℹ️  env-config.js already loaded in index.html');
}

console.log('   Variables:', Object.keys(envVars).map(k => `${k}=${envVars[k] ? '✓' : '✗'}`).join(', '));

