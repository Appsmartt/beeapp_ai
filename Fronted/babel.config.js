module.exports = function (api) {
  api.cache(true);
  
  // This root Babel config ensures that hoisted packages in npm workspaces (like expo-router)
  // are properly transpiled with the Expo preset, allowing environment variables like
  // EXPO_ROUTER_APP_ROOT to be correctly injected into the generated _ctx files.
  process.env.EXPO_ROUTER_APP_ROOT = './apps/mobile/app';
  
  return {
    presets: ['babel-preset-expo'],
  };
};
