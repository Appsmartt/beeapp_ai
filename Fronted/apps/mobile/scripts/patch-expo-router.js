const fs = require('fs');
const path = require('path');

// Fix Expo Router in npm workspaces by replacing the dynamic env var
// with a hardcoded string literal, satisfying Metro's require.context
const ctxFiles = ['_ctx.android.js', '_ctx.ios.js', '_ctx.web.js', '_ctx-shared.js'];
const localRouterDir = path.resolve(__dirname, '../node_modules/expo-router');
const rootRouterDir = path.resolve(__dirname, '../../../node_modules/expo-router');

const routerDir = fs.existsSync(localRouterDir) ? localRouterDir : rootRouterDir;

if (fs.existsSync(routerDir)) {
  ctxFiles.forEach(file => {
    const filePath = path.join(routerDir, file);
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // If the file is hoisted to the root, we need to point to "../../apps/mobile/app" relative to node_modules/expo-router/
      // If it is in apps/mobile/node_modules, we need to point to "../../app"
      const isRoot = routerDir === rootRouterDir;
      const appPath = isRoot ? '"../../apps/mobile/app"' : '"../../app"';
      
      // Robust replacement: find the first argument of require.context and replace it
      content = content.replace(/require\.context\(\s*[\s\S]*?,\s*true/g, `require.context(\n  ${appPath},\n  true`);
      
      // Robust replacement: find the fourth argument of require.context (import mode) and replace it with "sync"
      content = content.replace(/(true,\s*\/.*?\/,\s*)[\s\S]*?(\s*\);)/g, `$1"sync"$2`);
      
      fs.writeFileSync(filePath, content);
    }
  });
  console.log('✅ Patched expo-router _ctx files for monorepo support (Dir: ' + routerDir + ')');
}
