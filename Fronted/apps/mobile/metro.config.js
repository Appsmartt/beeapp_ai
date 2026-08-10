const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Only watch source directories — NOT node_modules.
//    Metro can RESOLVE modules from nodeModulesPaths without watching them.
//    Watching all of node_modules causes EMFILE (too many open files) on macOS.
config.watchFolders = [
  // Watch shared packages source code so edits trigger hot reload
  path.resolve(workspaceRoot, 'packages'),
  // The projectRoot (apps/mobile) is always watched automatically
];

// 2. Tell Metro where to find modules for resolution (separate from watching)
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Allow hierarchical lookup so Metro reliably resolves hoisted packages
config.resolver.disableHierarchicalLookup = false;

module.exports = config;
