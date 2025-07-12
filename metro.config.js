const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add resolver configuration to handle platform-specific modules
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Exclude react-native-google-mobile-ads on web platform
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];
config.resolver.alias = {
  ...(config.resolver.alias || {}),
};

// Platform-specific module resolution
if (process.env.EXPO_PLATFORM === 'web') {
  config.resolver.alias['react-native-google-mobile-ads'] = require.resolve('./utils/ad-module-web.js');
}

module.exports = config;