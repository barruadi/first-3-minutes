#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const cacheKeyIndex = path.join(root, 'node_modules/metro-cache-key/src/index.js');
if (fs.existsSync(cacheKeyIndex)) {
  const src = fs.readFileSync(cacheKeyIndex, 'utf8');
  if (!src.includes('exports.default = getCacheKey')) {
    fs.appendFileSync(cacheKeyIndex, '\nexports.default = getCacheKey;\n');
    console.log('[postinstall] Patched metro-cache-key default export');
  }
}
