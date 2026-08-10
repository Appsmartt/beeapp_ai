const path = require('path');

module.exports = function (api) {
  api.cache(true);
  
  // Use absolute path to guarantee Babel finds the app directory regardless of hoisting
  process.env.EXPO_ROUTER_APP_ROOT = path.resolve(__dirname, 'app');
  
  return {
    presets: ['babel-preset-expo'],
    // Required by react-native-reanimated (drag & drop); must stay last
    plugins: ['react-native-reanimated/plugin'],
  };
};
