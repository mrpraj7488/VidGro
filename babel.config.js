module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // React Native Reanimated plugin MUST be last
      'react-native-reanimated/plugin',
      // Transform import.meta for compatibility
      ['babel-plugin-transform-import-meta', {
        module: 'ES6'
      }],
      // Additional CommonJS transformation support
      ['@babel/plugin-transform-modules-commonjs', {
        allowTopLevelThis: true,
        loose: true
      }]
    ],
  };
};