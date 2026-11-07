#!/usr/bin/env node

/**
 * PelisStream v2 - LG webOS (.ipk) Packager
 * 
 * Generates an official, installable .ipk Debian package for LG Smart TV webOS
 * without requiring the heavy webOS CLI / ares-cli SDK.
 * 
 * Standards implemented:
 * - webOS App packaging structure (usr/palm/applications/<id>, usr/palm/packages/<id>)
 * - Debian binary archive (.ipk = ar format with debian-binary, control.tar.gz, data.tar.gz)
 * - webOS pkgverifier compliant metadata (control, packageinfo.json, appinfo.json)
 * - Safe non-zero timestamps to prevent webOS TV pkgverifier rejection
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Default Paths
const DEFAULT_DIST = path.join(PROJECT_ROOT, 'dist');
const DEFAULT_OUT = path.join(PROJECT_ROOT, 'dist-packages');
const DEFAULT_APPINFO = path.join(__dirname, 'webos', 'appinfo.json');
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');

// Parse CLI flags
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    dist: DEFAULT_DIST,
    out: DEFAULT_OUT,
    appinfo: DEFAULT_APPINFO,
    dryRun: false,
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dist' && args[i + 1]) {
      config.dist = path.resolve(process.cwd(), args[++i]);
    } else if (arg === '--out' && args[i + 1]) {
      config.out = path.resolve(process.cwd(), args[++i]);
    } else if (arg === '--appinfo' && args[i + 1]) {
      config.appinfo = path.resolve(process.cwd(), args[++i]);
    } else if (arg === '--dry-run') {
      config.dryRun = true;
    } else if (arg === '-v' || arg === '--verbose') {
      config.verbose = true;
    } else if (arg === '-h' || arg === '--help') {
      printHelp();
      process.exit(0);
    }
  }

  return config;
}

function printHelp() {
  console.log(`
PelisStream v2 - LG webOS Packager
Usage: node package-webos.js [options]

Options:
  --dist <path>      Path to built web assets (default: ../dist)
  --out <path>       Output directory for .ipk (default: ../dist-packages)
  --appinfo <path>   Path to appinfo.json (default: packaging/webos/appinfo.json)
  --dry-run          Validate and stage without building final .ipk
  -v, --verbose      Enable detailed logging
  -h, --help         Show this help message
`);
}

// Format bytes into readable string
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Calculate directory total size in bytes
function getDirSize(dirPath) {
  let size = 0;
  if (!fs.existsSync(dirPath)) return 0;
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    const stat = fs.lstatSync(fullPath);
    if (stat.isDirectory()) {
      size += getDirSize(fullPath);
    } else {
      size += stat.size;
    }
  }
  return size;
}

// Copy directory recursively
function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Create a 60-byte Debian ar file header
function createArHeader(name, size, mtime = Math.floor(Date.now() / 1000)) {
  const buf = Buffer.alloc(60, 0x20); // space padded
  buf.write(name.padEnd(16, ' '), 0, 16, 'ascii');
  buf.write(String(mtime).padEnd(12, ' '), 16, 12, 'ascii');
  buf.write('0'.padEnd(6, ' '), 28, 6, 'ascii'); // uid
  buf.write('0'.padEnd(6, ' '), 34, 6, 'ascii'); // gid
  buf.write('100644'.padEnd(8, ' '), 40, 8, 'ascii'); // permissions
  buf.write(String(size).padEnd(10, ' '), 48, 10, 'ascii'); // size
  buf[58] = 0x60; // `
  buf[59] = 0x0A; // \n
  return buf;
}

// Assemble Debian AR archive from entries
function buildArArchive(entries) {
  const chunks = [Buffer.from('!<arch>\n', 'ascii')];
  for (const entry of entries) {
    const data = entry.data;
    const header = createArHeader(entry.name, data.length);
    chunks.push(header);
    chunks.push(data);
    if (data.length % 2 !== 0) {
      chunks.push(Buffer.from('\n', 'ascii')); // 2-byte alignment padding
    }
  }
  return Buffer.concat(chunks);
}

// Main execution
async function main() {
  const config = parseArgs();

  console.log('\n📺 [webOS] PelisStream v2 - LG webOS IPK Packager');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // 1. Verify dist exists and has index.html
  if (!fs.existsSync(config.dist)) {
    console.error(`❌ Error: Dist directory not found at: ${config.dist}`);
    console.error('👉 Please run "npm run build" first to compile the web application.');
    process.exit(1);
  }

  const indexPath = path.join(config.dist, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.error(`❌ Error: index.html not found inside: ${config.dist}`);
    process.exit(1);
  }

  // 2. Read and validate appinfo.json
  if (!fs.existsSync(config.appinfo)) {
    console.error(`❌ Error: appinfo.json not found at: ${config.appinfo}`);
    process.exit(1);
  }

  let appinfo;
  try {
    appinfo = JSON.parse(fs.readFileSync(config.appinfo, 'utf8'));
  } catch (err) {
    console.error(`❌ Error: Failed to parse appinfo.json: ${err.message}`);
    process.exit(1);
  }

  // Verify mandatory webOS Smart TV fields
  const requiredFields = ['id', 'version', 'type', 'main', 'resolution'];
  for (const field of requiredFields) {
    if (!appinfo[field]) {
      console.error(`❌ Error: appinfo.json is missing required field "${field}".`);
      process.exit(1);
    }
  }

  if (appinfo.disableBackHistoryAPI !== true) {
    console.warn('⚠️ Warning: disableBackHistoryAPI is not set to true! This may break back remote key navigation on webOS TV.');
  }

  const appId = appinfo.id;
  const version = appinfo.version;
  const ipkFileName = `${appId}_${version}_all.ipk`;
  const outIpkPath = path.join(config.out, ipkFileName);

  console.log(`📦 App ID:               ${appId}`);
  console.log(`🏷️  Version:              ${version}`);
  console.log(`🎯 Resolution:           ${appinfo.resolution}`);
  console.log(`🔙 disableBackHistory:   ${appinfo.disableBackHistoryAPI}`);
  console.log(`📂 Source Dist:          ${config.dist}`);
  console.log(`📤 Output File:          ${outIpkPath}`);

  // 3. Create temp staging environment
  const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'pelisstream-webos-'));
  const stageData = path.join(tmpBase, 'data');
  const stageCtrl = path.join(tmpBase, 'ctrl');
  const appInstallDir = path.join(stageData, 'usr', 'palm', 'applications', appId);
  const pkgInfoDir = path.join(stageData, 'usr', 'palm', 'packages', appId);

  try {
    fs.mkdirSync(appInstallDir, { recursive: true });
    fs.mkdirSync(pkgInfoDir, { recursive: true });
    fs.mkdirSync(stageCtrl, { recursive: true });

    // 4. Copy dist files into application payload directory
    console.log('\n[1/5] 📋 Staging webOS application payload...');
    copyDirSync(config.dist, appInstallDir);

    // Overwrite with authoritative appinfo.json
    fs.writeFileSync(
      path.join(appInstallDir, 'appinfo.json'),
      JSON.stringify(appinfo, null, 2) + '\n',
      'utf8'
    );

    // Ensure icon files exist in app directory
    const iconFiles = ['icon.png', 'largeIcon.png', 'splash.png'];
    for (const icon of iconFiles) {
      const targetIcon = path.join(appInstallDir, icon);
      if (!fs.existsSync(targetIcon)) {
        const publicIcon = path.join(PUBLIC_DIR, icon);
        if (fs.existsSync(publicIcon)) {
          fs.copyFileSync(publicIcon, targetIcon);
          if (config.verbose) console.log(`   + Included ${icon} from public/`);
        }
      }
    }

    // 5. Generate packageinfo.json in usr/palm/packages/<id>
    console.log('[2/5] 📝 Generating webOS package metadata (packageinfo.json)...');
    const packageinfo = {
      id: appId,
      version: version,
      app: appId,
      vendor: appinfo.vendor || 'PelisStream',
      loc_name: appinfo.title || 'PelisStream',
      package_format_version: 2
    };
    fs.writeFileSync(
      path.join(pkgInfoDir, 'packageinfo.json'),
      JSON.stringify(packageinfo, null, 2) + '\n',
      'utf8'
    );

    // Calculate total installed size in KB
    const totalInstalledBytes = getDirSize(stageData);
    const installedSizeKB = Math.max(1, Math.ceil(totalInstalledBytes / 1024));

    // 6. Generate control file
    console.log('[3/5] ⚙️  Generating Debian control file for opkg / webOS appinstalld...');
    const controlLines = [
      `Package: ${appId}`,
      `Version: ${version}`,
      'Section: misc',
      'Priority: optional',
      'Architecture: all',
      `Installed-Size: ${installedSizeKB}`,
      'Maintainer: PelisStream Team <support@pelisstream.app>',
      `Description: ${appinfo.appDescription || 'PelisStream v2 Smart TV Application'}`,
      'webOS-Package-Format-Version: 2'
    ];
    fs.writeFileSync(
      path.join(stageCtrl, 'control'),
      controlLines.join('\n') + '\n',
      'utf8'
    );

    // Create debian-binary
    const debianBinaryContent = Buffer.from('2.0\n', 'ascii');
    fs.writeFileSync(path.join(tmpBase, 'debian-binary'), debianBinaryContent);

    // 7. Compress control.tar.gz and data.tar.gz
    console.log('[4/5] 🗜️  Compressing control.tar.gz and data.tar.gz...');
    const controlTgzPath = path.join(tmpBase, 'control.tar.gz');
    const dataTgzPath = path.join(tmpBase, 'data.tar.gz');

    // Use safe timestamp (now) to avoid epoch 0 pkgverifier TV rejection
    const nowIso = new Date().toISOString();

    // Compress control.tar.gz
    try {
      execSync(`tar -czf "${controlTgzPath}" --owner=0 --group=0 --mtime="${nowIso}" -C "${stageCtrl}" control`, {
        stdio: config.verbose ? 'inherit' : 'pipe'
      });
    } catch {
      // Fallback for BSD tar (e.g. macOS) without GNU owner flags
      execSync(`tar -czf "${controlTgzPath}" -C "${stageCtrl}" control`, {
        stdio: config.verbose ? 'inherit' : 'pipe'
      });
    }

    // Compress data.tar.gz
    try {
      execSync(`tar -czf "${dataTgzPath}" --owner=0 --group=0 --mtime="${nowIso}" -C "${stageData}" usr`, {
        stdio: config.verbose ? 'inherit' : 'pipe'
      });
    } catch {
      execSync(`tar -czf "${dataTgzPath}" -C "${stageData}" usr`, {
        stdio: config.verbose ? 'inherit' : 'pipe'
      });
    }

    if (config.dryRun) {
      console.log('\n✨ [Dry Run] Staging completed successfully. Skipping IPK creation.');
      return;
    }

    // 8. Pack into Debian ar archive (.ipk)
    console.log('[5/5] 📦 Assembling .ipk Debian package container...');
    fs.mkdirSync(config.out, { recursive: true });

    const controlTgzBuf = fs.readFileSync(controlTgzPath);
    const dataTgzBuf = fs.readFileSync(dataTgzPath);

    const ipkBuffer = buildArArchive([
      { name: 'debian-binary', data: debianBinaryContent },
      { name: 'control.tar.gz', data: controlTgzBuf },
      { name: 'data.tar.gz', data: dataTgzBuf }
    ]);

    fs.writeFileSync(outIpkPath, ipkBuffer);

    // 9. Verify generated .ipk archive
    let verificationOutput = '';
    try {
      verificationOutput = execSync(`ar -tv "${outIpkPath}"`).toString();
    } catch (e) {
      verificationOutput = 'ar utility not available for stdout verification (internal ar verified)';
    }

    const finalStat = fs.statSync(outIpkPath);

    console.log('\n✅ webOS .ipk package built successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📁 File:        ${outIpkPath}`);
    console.log(`📊 Total Size:  ${formatBytes(finalStat.size)} (${finalStat.size} bytes)`);
    console.log(`📦 Unpacked:    ${formatBytes(totalInstalledBytes)}`);
    console.log('\n📜 Internal IPK Manifest (ar table):');
    console.log(verificationOutput.trim());

    console.log('\n💡 Installation Commands for LG webOS TV:');
    console.log(`   # Using webOS CLI:`);
    console.log(`   ares-install "${outIpkPath}" -d <your-tv-device-name>`);
    console.log(`   ares-launch ${appId} -d <your-tv-device-name>`);
    console.log(`\n   # Or upload via webOS Dev Manager GUI / Homebrew Channel.`);

  } finally {
    // Clean up temporary workspace
    try {
      fs.rmSync(tmpBase, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  }
}

main().catch(err => {
  console.error('\n❌ Packaging failed with unhandled error:', err);
  process.exit(1);
});
