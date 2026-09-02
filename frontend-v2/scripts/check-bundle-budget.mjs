import { gzipSync } from 'node:zlib';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const assetDir = new URL('../dist/assets/', import.meta.url);
const limits = {
  jsRaw: 450 * 1024,
  jsGzip: 140 * 1024,
  cssGzip: 15 * 1024,
  initialGzip: 160 * 1024,
};

const files = readdirSync(assetDir, { withFileTypes: true }).filter((entry) => entry.isFile());
let jsRaw = 0;
let jsGzip = 0;
let cssGzip = 0;

for (const entry of files) {
  const bytes = readFileSync(join(assetDir.pathname, entry.name));
  const gzip = gzipSync(bytes).byteLength;
  if (entry.name.endsWith('.js')) {
    jsRaw += bytes.byteLength;
    jsGzip += gzip;
  }
  if (entry.name.endsWith('.css')) cssGzip += gzip;
}

const initialGzip = jsGzip + cssGzip;
const rows = [
  ['JS raw', jsRaw, limits.jsRaw],
  ['JS gzip', jsGzip, limits.jsGzip],
  ['CSS gzip', cssGzip, limits.cssGzip],
  ['Initial JS+CSS gzip', initialGzip, limits.initialGzip],
];

console.log('C0175 bundle budget');
for (const [label, value, limit] of rows) {
  console.log(`${label}: ${(value / 1024).toFixed(1)} KiB / ${(limit / 1024).toFixed(1)} KiB`);
}

const failed = rows.filter(([, value, limit]) => value > limit);
if (failed.length) {
  console.error(`Bundle budget exceeded: ${failed.map(([label]) => label).join(', ')}`);
  process.exit(1);
}
