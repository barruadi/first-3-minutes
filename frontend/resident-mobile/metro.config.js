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
  // @react-native/* packages (e.g. virtualized-lists) are nested inside
  // react-native's own node_modules and not hoisted in this monorepo setup.
  path.resolve(workspaceRoot, 'node_modules/react-native/node_modules'),
];

config.resolver.disableHierarchicalLookup = true;

// Exclude node_modules inside watched packages — their .bin symlinks resolve
// into the root node_modules and confuse Metro's TreeFS deduplication.
config.resolver.blockList = [
  new RegExp(
    `${path.resolve(workspaceRoot, 'frontend/packages').replace(/[/\\]/g, '[/\\\\]')}/[^/]+/node_modules/.*`
  ),
];

// TypeScript ESM packages use '.js' extensions on imports (e.g. './tokens.js')
// but the actual files are '.ts'. Metro needs a custom resolver to handle this.
const { resolve: metroResolve } = require('metro-resolver');
config.resolver.resolveRequest = (context, moduleName, platform) => {
  try {
    return context.resolveRequest(context, moduleName, platform);
  } catch (e) {
    if (moduleName.endsWith('.js')) {
      const tsName = moduleName.slice(0, -3);
      for (const ext of ['.ts', '.tsx']) {
        try {
          return context.resolveRequest(context, tsName + ext, platform);
        } catch {}
        try {
          return context.resolveRequest(context, tsName, platform);
        } catch {}
      }
    }
    throw e;
  }
};

module.exports = config;
