const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Only watch source packages consumed by mobile; watching the entire monorepo
// causes FSEvents exhaustion because it includes every workspace node_modules.
config.watchFolders = [
  path.resolve(workspaceRoot, 'frontend/packages/contracts'),
  path.resolve(workspaceRoot, 'frontend/packages/design-tokens'),
];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

config.resolver.disableHierarchicalLookup = true;

module.exports = config;
