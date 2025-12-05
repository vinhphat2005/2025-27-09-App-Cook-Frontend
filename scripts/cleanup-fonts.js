const fs = require('fs');
const path = require('path');

// Path to the icon fonts bundled by Metro
const targetDir = path.join(__dirname, '..', 'dist', 'assets', 'node_modules', '@expo', 'vector-icons');

if (fs.existsSync(targetDir)) {
  fs.rmSync(targetDir, { recursive: true, force: true });
  console.log('✅ Removed duplicate icon fonts from dist/assets/node_modules/@expo/vector-icons/');
  console.log('   Icons will now load exclusively from /fonts/*.ttf');
} else {
  console.log('ℹ️ No duplicate icon fonts found - skipping cleanup');
}
