#!/usr/bin/env node
/**
 * debrand.mjs - prepare a playable build for the public portfolio.
 *
 * Removes store redirect links ONLY. Nothing else is touched.
 *
 *   node scripts/debrand.mjs <build.zip|build.html> <slug> [redirectTarget]
 *
 * Writes  play/<slug>.html  and prints a manifest row to paste into index.html.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, extname, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [, , input, slug, redirectTarget = '../index.html'] = process.argv;

if (!input || !slug) {
  console.error('usage: node scripts/debrand.mjs <build.zip|build.html> <slug> [redirectTarget]');
  process.exit(1);
}

// Store-link patterns. Extend this list if a build uses a store we have not seen.
const STORE_PATTERNS = [
  /https?:\/\/play\.google\.com\/store\/apps\/details\?id=[^"'\s)]+/g,
  /https?:\/\/(?:apps|itunes)\.apple\.com\/[^"'\s)]+/g,
  /https?:\/\/www\.amazon\.[a-z.]+\/gp\/product\/[^"'\s)]+/g,
  /https?:\/\/appgallery\.huawei\.com\/[^"'\s)]+/g,
];

// ---- load html -------------------------------------------------------------
let html, tmp;
if (extname(input).toLowerCase() === '.zip') {
  tmp = mkdtempSync(join(tmpdir(), 'debrand-'));
  execFileSync('unzip', ['-o', input, '-d', tmp], { stdio: 'ignore' });
  const walk = (d) => readdirSync(d).flatMap((f) => {
    const p = join(d, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
  const files = walk(tmp);
  const htmlFiles = files.filter((f) => extname(f).toLowerCase() === '.html');
  if (htmlFiles.length !== 1) {
    console.error(`expected exactly one .html in the zip, found ${htmlFiles.length}`);
    console.error(htmlFiles.map((f) => '  ' + f).join('\n'));
    process.exit(1);
  }
  if (files.length !== htmlFiles.length) {
    console.error('WARNING: zip contains non-html files; this script only handles single-file builds.');
    console.error(files.filter((f) => !htmlFiles.includes(f)).map((f) => '  ' + f).join('\n'));
    process.exit(1);
  }
  html = readFileSync(htmlFiles[0], 'utf8');
} else {
  html = readFileSync(input, 'utf8');
}

const before = html.length;

// ---- strip store links -----------------------------------------------------
const found = [];
for (const re of STORE_PATTERNS) {
  html = html.replace(re, (m) => { found.push(m); return redirectTarget; });
}

if (!found.length) {
  console.error('WARNING: no store links found. Either already clean, or the pattern list needs extending.');
} else {
  console.log('removed redirect links:');
  for (const f of found) console.log('  - ' + f);
  console.log(`  -> replaced with: ${redirectTarget}`);
}

// ---- verify ----------------------------------------------------------------
const leaks = [];
for (const re of STORE_PATTERNS) {
  const m = html.match(new RegExp(re.source, 'g'));
  if (m) leaks.push(...m);
}
if (leaks.length) {
  console.error('FAILED verification, store links still present:', leaks);
  process.exit(1);
}

// ---- write -----------------------------------------------------------------
const out = join(ROOT, 'play', `${slug}.html`);
writeFileSync(out, html);
if (tmp) rmSync(tmp, { recursive: true, force: true });

const bytes = Buffer.byteLength(html);
const mb = (bytes / 1024 / 1024).toFixed(2);
console.log(`\nwrote ${out}`);
console.log(`size  ${mb} MB  (${bytes.toLocaleString()} bytes, was ${before.toLocaleString()})`);
console.log(`\nmanifest row:\n  { slug: '${slug}', title: 'TITLE', role: 'WHAT YOU DID', size: '${mb} MB', poster: '' },`);
