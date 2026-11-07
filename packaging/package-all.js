#!/usr/bin/env node

/**
 * PelisStream v2 - Unified Smart TV Packager (webOS + Tizen)
 * 
 * Runs automated packaging for both LG webOS (.ipk) and Samsung Tizen (.wgt)
 * and produces release packages ready for TV deployment.
 */

import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const webosScript = path.join(__dirname, 'package-webos.js');
const tizenScript = path.join(__dirname, 'package-tizen.js');

console.log('🚀 PelisStream v2 - Smart TV Unified Packaging Suite');
console.log('Target Platforms: LG webOS (.ipk) & Samsung Tizen (.wgt)');
console.log('══════════════════════════════════════════════════════════════\n');

// 1. Run webOS packaging
const webosResult = spawnSync('node', [webosScript, ...process.argv.slice(2)], {
  stdio: 'inherit'
});

if (webosResult.status !== 0) {
  console.error('\n❌ webOS packaging failed.');
  process.exit(webosResult.status || 1);
}

// 2. Run Tizen packaging
console.log('\n');
const tizenResult = spawnSync('node', [tizenScript, ...process.argv.slice(2)], {
  stdio: 'inherit'
});

if (tizenResult.status !== 0) {
  console.error('\n❌ Tizen packaging failed.');
  process.exit(tizenResult.status || 1);
}

console.log('\n══════════════════════════════════════════════════════════════');
console.log('🎉 ALL SMART TV PACKAGES GENERATED AND SIGNED SUCCESSFULLY!');
console.log('══════════════════════════════════════════════════════════════\n');
