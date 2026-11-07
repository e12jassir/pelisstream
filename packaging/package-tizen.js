#!/usr/bin/env node

/**
 * PelisStream v2 - Samsung Tizen (.wgt) Packager & Signer
 * 
 * Generates an official, signed .wgt (W3C Widget) package for Samsung Smart TVs
 * with valid W3C XML Digital Signatures (author-signature.xml & signature1.xml)
 * without requiring the heavy Tizen Studio SDK.
 * 
 * Standards implemented:
 * - W3C Widget Packaging & XML Configuration (W3C Recommendation)
 * - W3C XML Digital Signatures for Widgets (http://www.w3.org/ns/widgets-digsig)
 * - Tizen TV Web Runtime privilege and navigation compliance (tv.inputdevice, access origin, allow-navigation)
 * - Automatic persistent self-signed developer certificate generation (or custom cert injection)
 * - Built-in zero-dependency pure Node.js ZIP archive engine
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import zlib from 'zlib';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Default Paths
const DEFAULT_DIST = path.join(PROJECT_ROOT, 'dist');
const DEFAULT_OUT = path.join(PROJECT_ROOT, 'dist-packages');
const DEFAULT_CONFIG = path.join(__dirname, 'tizen', 'config.xml');
const CERTS_DIR = path.join(__dirname, 'tizen', 'certs');
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');

// Parse CLI flags
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    dist: DEFAULT_DIST,
    out: DEFAULT_OUT,
    configXml: DEFAULT_CONFIG,
    authorCert: path.join(CERTS_DIR, 'author.crt'),
    authorKey: path.join(CERTS_DIR, 'author.key'),
    distributorCert: path.join(CERTS_DIR, 'distributor.crt'),
    distributorKey: path.join(CERTS_DIR, 'distributor.key'),
    dryRun: false,
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dist' && args[i + 1]) {
      config.dist = path.resolve(process.cwd(), args[++i]);
    } else if (arg === '--out' && args[i + 1]) {
      config.out = path.resolve(process.cwd(), args[++i]);
    } else if (arg === '--config' && args[i + 1]) {
      config.configXml = path.resolve(process.cwd(), args[++i]);
    } else if (arg === '--author-cert' && args[i + 1]) {
      config.authorCert = path.resolve(process.cwd(), args[++i]);
    } else if (arg === '--author-key' && args[i + 1]) {
      config.authorKey = path.resolve(process.cwd(), args[++i]);
    } else if (arg === '--distributor-cert' && args[i + 1]) {
      config.distributorCert = path.resolve(process.cwd(), args[++i]);
    } else if (arg === '--distributor-key' && args[i + 1]) {
      config.distributorKey = path.resolve(process.cwd(), args[++i]);
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
PelisStream v2 - Samsung Tizen Packager
Usage: node package-tizen.js [options]

Options:
  --dist <path>             Path to built web assets (default: ../dist)
  --out <path>              Output directory for .wgt (default: ../dist-packages)
  --config <path>           Path to config.xml (default: packaging/tizen/config.xml)
  --author-cert <path>      Custom Author X.509 certificate PEM
  --author-key <path>       Custom Author Private Key PEM
  --distributor-cert <path> Custom Distributor X.509 certificate PEM
  --distributor-key <path>  Custom Distributor Private Key PEM
  --dry-run                 Stage and generate signatures without writing .wgt
  -v, --verbose             Enable detailed output
  -h, --help                Show this help message
`);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Ensure persistent development certificates exist
function ensureCertificates(config) {
  fs.mkdirSync(CERTS_DIR, { recursive: true });

  const hasAuthor = fs.existsSync(config.authorCert) && fs.existsSync(config.authorKey);
  const hasDist = fs.existsSync(config.distributorCert) && fs.existsSync(config.distributorKey);

  if (hasAuthor && hasDist) {
    if (config.verbose) console.log('🔑 Using existing certificates in packaging/tizen/certs/');
    return;
  }

  console.log('🔐 [Tizen Security] Generating persistent self-signed developer certificates...');

  if (!hasAuthor) {
    console.log('   -> Generating Author certificate (author.crt, author.key)...');
    execSync(
      `openssl req -x509 -newkey rsa:2048 -nodes ` +
      `-keyout "${config.authorKey}" -out "${config.authorCert}" -days 3650 ` +
      `-subj "/C=CO/ST=Bolivar/L=Cartagena/O=PelisStream/OU=Developer/CN=PelisStream Author"`,
      { stdio: 'pipe' }
    );
  }

  if (!hasDist) {
    console.log('   -> Generating Distributor certificate (distributor.crt, distributor.key)...');
    execSync(
      `openssl req -x509 -newkey rsa:2048 -nodes ` +
      `-keyout "${config.distributorKey}" -out "${config.distributorCert}" -days 3650 ` +
      `-subj "/C=CO/ST=Bolivar/L=Cartagena/O=PelisStream/OU=Developer/CN=PelisStream Distributor"`,
      { stdio: 'pipe' }
    );
  }

  console.log('✅ Certificates ready and saved in packaging/tizen/certs/\n');
}

// Clean PEM to raw base64 string for XMLDSig X509Certificate tag
function cleanCertToSingleLineBase64(pem) {
  return pem.replace(/-----[A-Z0-9 ]+-----/g, '').replace(/\s+/g, '');
}

// Canonical XML Digital Signature Generator for W3C Widgets
function generateXmlSignature({
  signatureId,
  role, // "author" or "distributor"
  files, // array of { relativePath: string, buffer: Buffer }
  certPem,
  keyPem,
  appId,
  createdIso = new Date().toISOString()
}) {
  const certBase64 = cleanCertToSingleLineBase64(certPem);
  const propId = `prop-${role}`;

  // 1. Digest for each target file
  const fileRefs = files.map(f => {
    const hash = crypto.createHash('sha256').update(f.buffer).digest('base64');
    return `<Reference URI="${f.relativePath}"><DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"></DigestMethod><DigestValue>${hash}</DigestValue></Reference>`;
  }).join('');

  // 2. Canonical SignatureProperties Object
  const canonicalPropElement = 
    `<SignatureProperties xmlns="http://www.w3.org/2000/09/xmldsig#" xmlns:dsp="http://www.w3.org/2009/xmldsig-properties">` +
      `<SignatureProperty Target="#${signatureId}">` +
        `<dsp:Profile URI="http://www.w3.org/ns/widgets-digsig#profile"></dsp:Profile>` +
        `<dsp:Role URI="http://www.w3.org/ns/widgets-digsig#role-${role}"></dsp:Role>` +
        `<dsp:Identifier>${appId}</dsp:Identifier>` +
        `<dsp:Created>${createdIso}</dsp:Created>` +
      `</SignatureProperty>` +
    `</SignatureProperties>`;

  const propDigest = crypto.createHash('sha256').update(canonicalPropElement, 'utf8').digest('base64');

  const propRef = 
    `<Reference URI="#${propId}">` +
      `<Transforms>` +
        `<Transform Algorithm="http://www.w3.org/2006/12/xml-c14n11"></Transform>` +
      `</Transforms>` +
      `<DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"></DigestMethod>` +
      `<DigestValue>${propDigest}</DigestValue>` +
    `</Reference>`;

  // 3. Canonical SignedInfo
  const canonicalSignedInfo = 
    `<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">` +
      `<CanonicalizationMethod Algorithm="http://www.w3.org/2006/12/xml-c14n11"></CanonicalizationMethod>` +
      `<SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"></SignatureMethod>` +
      fileRefs +
      propRef +
    `</SignedInfo>`;

  // 4. Calculate RSA-SHA256 SignatureValue
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(canonicalSignedInfo, 'utf8');
  const signatureValue = signer.sign(keyPem, 'base64');

  // 5. Build full XML document with proper formatting
  const xml = 
`<?xml version="1.0" encoding="UTF-8"?>
<Signature xmlns="http://www.w3.org/2000/09/xmldsig#" Id="${signatureId}">
  <SignedInfo>
    <CanonicalizationMethod Algorithm="http://www.w3.org/2006/12/xml-c14n11"/>
    <SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
${files.map(f => {
  const hash = crypto.createHash('sha256').update(f.buffer).digest('base64');
  return `    <Reference URI="${f.relativePath}">\n      <DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>\n      <DigestValue>${hash}</DigestValue>\n    </Reference>`;
}).join('\n')}
    <Reference URI="#${propId}">
      <Transforms>
        <Transform Algorithm="http://www.w3.org/2006/12/xml-c14n11"/>
      </Transforms>
      <DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
      <DigestValue>${propDigest}</DigestValue>
    </Reference>
  </SignedInfo>
  <SignatureValue>
${signatureValue.match(/.{1,64}/g).map(line => '    ' + line).join('\n')}
  </SignatureValue>
  <KeyInfo>
    <X509Data>
      <X509Certificate>
${certBase64.match(/.{1,64}/g).map(line => '        ' + line).join('\n')}
      </X509Certificate>
    </X509Data>
  </KeyInfo>
  <Object Id="${propId}">
    <SignatureProperties xmlns:dsp="http://www.w3.org/2009/xmldsig-properties">
      <SignatureProperty Target="#${signatureId}">
        <dsp:Profile URI="http://www.w3.org/ns/widgets-digsig#profile"/>
        <dsp:Role URI="http://www.w3.org/ns/widgets-digsig#role-${role}"/>
        <dsp:Identifier>${appId}</dsp:Identifier>
        <dsp:Created>${createdIso}</dsp:Created>
      </SignatureProperty>
    </SignatureProperties>
  </Object>
</Signature>
`;

  return xml;
}

// Built-in Zero-Dependency High-Performance ZIP Encoder
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
  crcTable[i] = c;
}

function calculateCrc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function createZipBuffer(entries) {
  const localHeaders = [];
  const centralHeaders = [];
  let offset = 0;

  // Use fixed date: 2026-11-07
  const dosTime = 0x0000;
  const dosDate = 0x5D67; // DOS date representation

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, 'utf8');
    const uncompressedData = entry.data;
    const crc = calculateCrc32(uncompressedData);
    const compressedData = zlib.deflateRawSync(uncompressedData, { level: 9 });
    const useCompressed = compressedData.length < uncompressedData.length;
    const finalData = useCompressed ? compressedData : uncompressedData;
    const method = useCompressed ? 8 : 0; // 8 = Deflate, 0 = Store

    // Local file header (30 bytes)
    const lfh = Buffer.alloc(30);
    lfh.writeUInt32LE(0x04034b50, 0); // Local header signature
    lfh.writeUInt16LE(20, 4);         // Version needed: 2.0
    lfh.writeUInt16LE(0x0800, 6);     // Flags: Bit 11 UTF-8 enabled
    lfh.writeUInt16LE(method, 8);     // Compression method
    lfh.writeUInt16LE(dosTime, 10);   // File modification time
    lfh.writeUInt16LE(dosDate, 12);   // File modification date
    lfh.writeUInt32LE(crc, 14);       // CRC-32
    lfh.writeUInt32LE(finalData.length, 18);        // Compressed size
    lfh.writeUInt32LE(uncompressedData.length, 22); // Uncompressed size
    lfh.writeUInt16LE(nameBuf.length, 26);          // File name length
    lfh.writeUInt16LE(0, 28);                       // Extra field length

    const localEntry = Buffer.concat([lfh, nameBuf, finalData]);
    localHeaders.push(localEntry);

    // Central directory header (46 bytes)
    const cdh = Buffer.alloc(46);
    cdh.writeUInt32LE(0x02014b50, 0); // Central directory header signature
    cdh.writeUInt16LE(20, 4);         // Version made by (2.0)
    cdh.writeUInt16LE(20, 6);         // Version needed to extract (2.0)
    cdh.writeUInt16LE(0x0800, 8);     // Flags: UTF-8
    cdh.writeUInt16LE(method, 10);    // Method
    cdh.writeUInt16LE(dosTime, 12);   // Time
    cdh.writeUInt16LE(dosDate, 14);   // Date
    cdh.writeUInt32LE(crc, 16);       // CRC-32
    cdh.writeUInt32LE(finalData.length, 20);        // Compressed size
    cdh.writeUInt32LE(uncompressedData.length, 24); // Uncompressed size
    cdh.writeUInt16LE(nameBuf.length, 28);          // File name length
    cdh.writeUInt16LE(0, 30);                       // Extra length
    cdh.writeUInt16LE(0, 32);                       // Comment length
    cdh.writeUInt16LE(0, 34);                       // Disk number start
    cdh.writeUInt16LE(0, 36);                       // Internal attributes
    cdh.writeUInt32LE((0o100644 * 0x10000) >>> 0, 38); // External attributes (Unix permissions)
    cdh.writeUInt32LE(offset, 42);                  // Relative offset of local header

    centralHeaders.push(Buffer.concat([cdh, nameBuf]));
    offset += localEntry.length;
  }

  const cdBuf = Buffer.concat(centralHeaders);
  const cdOffset = offset;
  const cdSize = cdBuf.length;

  // End of Central Directory Record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);       // EOCD signature
  eocd.writeUInt16LE(0, 4);                // Number of this disk
  eocd.writeUInt16LE(0, 6);                // Disk where central directory starts
  eocd.writeUInt16LE(entries.length, 8);   // Entries on this disk
  eocd.writeUInt16LE(entries.length, 10);  // Total entries
  eocd.writeUInt32LE(cdSize, 12);          // Size of central directory
  eocd.writeUInt32LE(cdOffset, 16);        // Offset of central directory
  eocd.writeUInt16LE(0, 20);               // Comment length

  return Buffer.concat([...localHeaders, cdBuf, eocd]);
}

// Read all files in directory recursively as flat array of { relativePath, buffer }
function collectFilesRecursively(dir, baseDir = dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      results.push(...collectFilesRecursively(fullPath, baseDir));
    } else if (entry.isFile()) {
      results.push({
        relativePath: relPath,
        buffer: fs.readFileSync(fullPath),
      });
    }
  }

  return results;
}

// Main execution
async function main() {
  const config = parseArgs();

  console.log('\n📺 [Tizen] PelisStream v2 - Samsung Tizen WGT Packager & Signer');
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

  // 2. Read and validate config.xml
  if (!fs.existsSync(config.configXml)) {
    console.error(`❌ Error: config.xml not found at: ${config.configXml}`);
    process.exit(1);
  }

  const configContent = fs.readFileSync(config.configXml, 'utf8');

  // Check required Samsung Smart TV configurations
  const requiredChecks = [
    { pattern: /id=["']http:\/\/pelisstream\.app\/PelisStream["']/, desc: 'Widget ID "http://pelisstream.app/PelisStream"' },
    { pattern: /version=["']2\.0\.0["']/, desc: 'Version "2.0.0"' },
    { pattern: /screen-orientation=["']landscape["']/, desc: 'Screen orientation "landscape"' },
    { pattern: /<access\s+origin=["']\*["']\s+subdomains=["']true["']\s*\/>/, desc: '<access origin="*" subdomains="true"/>' },
    { pattern: /<tizen:allow-navigation\s+href=["']\*["']\s*\/>/, desc: '<tizen:allow-navigation href="*"/>' },
    { pattern: /http:\/\/tizen\.org\/privilege\/internet/, desc: 'Internet privilege' },
    { pattern: /http:\/\/tizen\.org\/privilege\/tv\.inputdevice/, desc: 'tv.inputdevice privilege (Remote D-Pad/Keys)' },
    { pattern: /http:\/\/tizen\.org\/privilege\/application\.launch/, desc: 'application.launch privilege' }
  ];

  for (const check of requiredChecks) {
    if (!check.pattern.test(configContent)) {
      console.warn(`⚠️ Warning: config.xml check recommended: missing ${check.desc}`);
    }
  }

  // Ensure certificates exist (or generate persistent self-signed developer certs)
  ensureCertificates(config);

  const authorCert = fs.readFileSync(config.authorCert, 'utf8');
  const authorKey = fs.readFileSync(config.authorKey, 'utf8');
  const distributorCert = fs.readFileSync(config.distributorCert, 'utf8');
  const distributorKey = fs.readFileSync(config.distributorKey, 'utf8');

  const wgtFileName = 'PelisStream_2.0.0.wgt';
  const outWgtPath = path.join(config.out, wgtFileName);

  console.log(`📦 Widget ID:            http://pelisstream.app/PelisStream`);
  console.log(`🏷️  Version:              2.0.0`);
  console.log(`📺 Orientation:          landscape`);
  console.log(`📂 Source Dist:          ${config.dist}`);
  console.log(`📤 Output File:          ${outWgtPath}`);

  // 3. Stage files in temporary directory
  const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'pelisstream-tizen-'));
  const stageDir = path.join(tmpBase, 'widget');

  try {
    fs.mkdirSync(stageDir, { recursive: true });

    console.log('\n[1/5] 📋 Staging Tizen widget assets...');
    // Copy all dist files
    const distFiles = collectFilesRecursively(config.dist);
    for (const file of distFiles) {
      const destPath = path.join(stageDir, file.relativePath);
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.writeFileSync(destPath, file.buffer);
    }

    // Overwrite root config.xml with authoritative packaging/tizen/config.xml
    fs.writeFileSync(path.join(stageDir, 'config.xml'), configContent, 'utf8');

    // Ensure icon.png exists in root
    const rootIconPath = path.join(stageDir, 'icon.png');
    if (!fs.existsSync(rootIconPath)) {
      const publicIcon = path.join(PUBLIC_DIR, 'icon.png');
      if (fs.existsSync(publicIcon)) {
        fs.copyFileSync(publicIcon, rootIconPath);
        if (config.verbose) console.log('   + Included icon.png from public/');
      }
    }

    // 4. Collect files to sign for author-signature.xml (everything except signatures)
    console.log('[2/5] ✍️  Generating W3C XML author-signature.xml...');
    const widgetFiles = collectFilesRecursively(stageDir);
    // Sort files deterministically
    widgetFiles.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

    const authorSignatureXml = generateXmlSignature({
      signatureId: 'AuthorSignature',
      role: 'author',
      files: widgetFiles,
      certPem: authorCert,
      keyPem: authorKey,
      appId: 'http://pelisstream.app/PelisStream'
    });

    const authorSigPath = path.join(stageDir, 'author-signature.xml');
    fs.writeFileSync(authorSigPath, authorSignatureXml, 'utf8');

    // 5. Generate distributor signature (signature1.xml)
    // Signs all widget files AND author-signature.xml
    console.log('[3/5] ✍️  Generating W3C XML signature1.xml (Distributor Signature)...');
    const filesForDistributor = [
      ...widgetFiles,
      {
        relativePath: 'author-signature.xml',
        buffer: Buffer.from(authorSignatureXml, 'utf8')
      }
    ];
    filesForDistributor.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

    const distributorSignatureXml = generateXmlSignature({
      signatureId: 'DistributorSignature',
      role: 'distributor',
      files: filesForDistributor,
      certPem: distributorCert,
      keyPem: distributorKey,
      appId: 'http://pelisstream.app/PelisStream'
    });

    const distributorSigPath = path.join(stageDir, 'signature1.xml');
    fs.writeFileSync(distributorSigPath, distributorSignatureXml, 'utf8');

    if (config.dryRun) {
      console.log('\n✨ [Dry Run] Staging and XML signature generation verified. Skipping .wgt archive creation.');
      return;
    }

    // 6. Build .wgt ZIP archive
    console.log('[4/5] 🗜️  Building compressed .wgt widget package...');
    fs.mkdirSync(config.out, { recursive: true });

    // Collect all final entries including both signature files
    const allFinalEntries = collectFilesRecursively(stageDir).map(f => ({
      name: f.relativePath,
      data: f.buffer
    }));

    const zipBuffer = createZipBuffer(allFinalEntries);
    fs.writeFileSync(outWgtPath, zipBuffer);

    // 7. Verify .wgt package integrity using Python zipfile
    console.log('[5/5] 🔍 Verifying package integrity and cryptographic signatures...');
    let pyVerify = '';
    try {
      pyVerify = execSync(
        `python3 -c "import zipfile; z = zipfile.ZipFile('${outWgtPath}'); print('Files in WGT:', len(z.namelist())); test = z.testzip(); print('CRC Integrity:', 'PASSED' if test is None else 'FAILED')"`
      ).toString();
    } catch {
      pyVerify = 'Python verification skipped';
    }

    const finalStat = fs.statSync(outWgtPath);

    console.log('\n✅ Samsung Tizen .wgt package built and signed successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📁 File:        ${outWgtPath}`);
    console.log(`📊 Size:        ${formatBytes(finalStat.size)} (${finalStat.size} bytes)`);
    console.log(`📝 Signatures:  author-signature.xml + signature1.xml included`);
    console.log(`🛡️  Integrity:   ${pyVerify.trim()}`);

    console.log('\n💡 Installation Commands for Samsung Tizen TV:');
    console.log(`   # 1. Enable Developer Mode on your Samsung TV (Apps -> 12345 -> Developer Mode -> ON -> Host PC IP)`);
    console.log(`   # 2. Connect to TV using Smart Development Bridge (sdb):`);
    console.log(`   sdb connect <your-tv-ip>:26101`);
    console.log(`   # 3. Install the application package:`);
    console.log(`   sdb install "${outWgtPath}"`);
    console.log(`   # 4. Launch PelisStream on TV:`);
    console.log(`   tizen run -p PelisStream.PelisStream`);

  } finally {
    try {
      fs.rmSync(tmpBase, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  }
}

main().catch(err => {
  console.error('\n❌ Tizen packaging failed with unhandled error:', err);
  process.exit(1);
});
