// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Enable support for web and fix import.meta issues
config.resolver.sourceExts.push('mjs', 'cjs');

// Exclude problematic packages from web builds
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && (
    moduleName.includes('react-native-reanimated') ||
    moduleName.includes('react-native-worklets') ||
    moduleName.includes('react-native-gesture-handler')
  )) {
    // Return empty module for web
    return {
      type: 'empty',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

module.exports = config;
