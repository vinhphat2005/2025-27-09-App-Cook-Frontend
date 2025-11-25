module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Only enable reanimated plugin for native platforms
      process.env.EXPO_PUBLIC_PLATFORM !== 'web' && 'react-native-reanimated/plugin',
    ].filter(Boolean),
  };
};
