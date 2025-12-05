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

// Step 2a: Add icon fonts CSS from CDN (support all @expo/vector-icons families)
const iconFontsCSS = `
<link href="https://fonts.googleapis.com/css2?family=Material+Icons&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@expo/vector-icons@14.0.2/build/vendor/react-native-vector-icons/Fonts/MaterialIcons.ttf" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@expo/vector-icons@14.0.2/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@expo/vector-icons@14.0.2/build/vendor/react-native-vector-icons/Fonts/FontAwesome.ttf" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@expo/vector-icons@14.0.2/build/vendor/react-native-vector-icons/Fonts/Feather.ttf" />
<style>
  @font-face {
    font-family: 'MaterialIcons';
    src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@14.0.2/build/vendor/react-native-vector-icons/Fonts/MaterialIcons.ttf') format('truetype');
    font-weight: normal;
    font-style: normal;
  }
  @font-face {
    font-family: 'Ionicons';
    src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@14.0.2/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf') format('truetype');
    font-weight: normal;
    font-style: normal;
  }
  @font-face {
    font-family: 'FontAwesome';
    src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@14.0.2/build/vendor/react-native-vector-icons/Fonts/FontAwesome.ttf') format('truetype');
    font-weight: normal;
    font-style: normal;
  }
  @font-face {
    font-family: 'Feather';
    src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@14.0.2/build/vendor/react-native-vector-icons/Fonts/Feather.ttf') format('truetype');
    font-weight: normal;
    font-style: normal;
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

