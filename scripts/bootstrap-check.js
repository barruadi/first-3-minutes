#!/usr/bin/env node
// Bootstrap verification script for 3MINUTES
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
let passed = 0;
let failed = 0;
let blocked = 0;

function check(label, fn) {
  try {
    const result = fn();
    if (result === 'BLOCKED') {
      console.log(`  BLOCKED  ${label}`);
      blocked++;
    } else {
      console.log(`  PASS     ${label}`);
      passed++;
    }
  } catch (e) {
    console.log(`  FAIL     ${label}: ${e.message}`);
    failed++;
  }
}

function fileExists(rel) {
  if (!fs.existsSync(path.join(ROOT, rel))) throw new Error(`Missing: ${rel}`);
}

function noFile(rel) {
  const candidates = ['pnpm-lock.yaml', 'yarn.lock', 'bun.lockb'];
  for (const f of candidates) {
    if (fs.existsSync(path.join(ROOT, f))) throw new Error(`Banned lockfile found: ${f}`);
  }
}

function noSecret() {
  const envFile = path.join(ROOT, '.env');
  if (!fs.existsSync(envFile)) return;
  const content = fs.readFileSync(envFile, 'utf-8');
  const patterns = [/GEMINI_API_KEY=.+/, /QR_TOKEN_SECRET=.+/, /POSTGRES_PASSWORD=(?!change_me).+/];
  for (const p of patterns) {
    if (p.test(content)) throw new Error('Possible real secret in .env');
  }
}

console.log('\n=== 3MINUTES Bootstrap Check ===\n');

console.log('-- Structure --');
check('prompts/ exists', () => fileExists('prompts/README.md'));
check('backend/ exists', () => fileExists('backend/app/main.py'));
check('frontend/resident-mobile exists', () => fileExists('frontend/resident-mobile/package.json'));
check('frontend/admin-portal exists', () => fileExists('frontend/admin-portal/package.json'));
check('frontend/guest-webar exists', () => fileExists('frontend/guest-webar/package.json'));
check('frontend/packages/contracts exists', () => fileExists('frontend/packages/contracts/package.json'));
check('frontend/packages/design-tokens exists', () => fileExists('frontend/packages/design-tokens/package.json'));

console.log('\n-- Root files --');
check('.nvmrc exists', () => fileExists('.nvmrc'));
check('.env.example exists', () => fileExists('.env.example'));
check('tsconfig.base.json exists', () => fileExists('tsconfig.base.json'));
check('docker-compose.yml exists', () => fileExists('docker-compose.yml'));

console.log('\n-- Lockfile --');
check('package-lock.json exists (single)', () => fileExists('package-lock.json'));
check('No banned lockfiles', () => noFile());

console.log('\n-- Contract fixtures --');
check('SpatialMap fixture exists', () => fileExists('frontend/packages/contracts/fixtures/spatial-map.valid.json'));
check('DrillMetrics fixture exists', () => fileExists('frontend/packages/contracts/fixtures/drill-metrics.valid.json'));
check('GuestRoute fixture exists', () => fileExists('frontend/packages/contracts/fixtures/guest-route.valid.json'));

console.log('\n-- Secret scan --');
check('No real secrets in .env', () => noSecret());

console.log('\n-- Workspace --');
check('npm workspaces configured', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));
  if (!pkg.workspaces || pkg.workspaces.length < 4) throw new Error('Workspaces not configured');
});

console.log(`\n=== Results: PASS=${passed} FAIL=${failed} BLOCKED=${blocked} ===\n`);
if (failed > 0) process.exit(1);
