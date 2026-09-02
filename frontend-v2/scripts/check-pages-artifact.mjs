import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const frontendDir = resolve(scriptDir, '..');
const repoRoot = resolve(frontendDir, '..');
const siteRoot = resolve(frontendDir, process.argv[2] ?? '../_site');
const distRoot = resolve(frontendDir, 'dist');
const expectedLegacyBlob = '09745c497dfd824cdc0c3306535aad3737558844';

function fail(message) {
  console.error(`C0175 artifact integrity failure: ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function gitBlobSha(buffer) {
  const prefix = Buffer.from(`blob ${buffer.length}\0`);
  return createHash('sha1').update(prefix).update(buffer).digest('hex');
}

function listFiles(root) {
  const files = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const fullPath = resolve(directory, entry.name);
      if (entry.isDirectory()) visit(fullPath);
      else if (entry.isFile()) files.push(relative(root, fullPath).replaceAll('\\', '/'));
      else fail(`unsupported artifact entry type at ${fullPath}`);
    }
  };
  visit(root);
  return files.sort();
}

assert(existsSync(siteRoot) && statSync(siteRoot).isDirectory(), `missing Pages artifact directory: ${siteRoot}`);
assert(existsSync(distRoot) && statSync(distRoot).isDirectory(), `missing Vite dist directory: ${distRoot}`);

const sourceLegacyPath = resolve(repoRoot, 'index.html');
const packagedLegacyPath = resolve(siteRoot, 'index.html');
assert(existsSync(sourceLegacyPath), 'repository legacy index.html is missing');
assert(existsSync(packagedLegacyPath), 'packaged legacy index.html is missing');

const sourceLegacy = readFileSync(sourceLegacyPath);
const packagedLegacy = readFileSync(packagedLegacyPath);
const sourceLegacyBlob = gitBlobSha(sourceLegacy);
assert(sourceLegacyBlob === expectedLegacyBlob, `legacy root blob changed: expected ${expectedLegacyBlob}, got ${sourceLegacyBlob}`);
assert(sourceLegacy.equals(packagedLegacy), 'packaged legacy root differs from repository index.html');

const packagedV2Root = resolve(siteRoot, 'v2');
assert(existsSync(packagedV2Root) && statSync(packagedV2Root).isDirectory(), 'packaged /v2/ directory is missing');

const distFiles = listFiles(distRoot);
const packagedV2Files = listFiles(packagedV2Root);
assert(JSON.stringify(packagedV2Files) === JSON.stringify(distFiles), 'packaged /v2/ file manifest differs from Vite dist');
for (const relativePath of distFiles) {
  const source = readFileSync(resolve(distRoot, relativePath));
  const packaged = readFileSync(resolve(packagedV2Root, relativePath));
  assert(source.equals(packaged), `packaged /v2/${relativePath} differs from Vite dist`);
}

const forbiddenRoots = ['.git', '.github', 'frontend-v2', '_site', 'node_modules'];
for (const forbidden of forbiddenRoots) {
  assert(!existsSync(resolve(siteRoot, forbidden)), `forbidden source directory leaked into Pages artifact: ${forbidden}`);
}

const jsAssets = packagedV2Files.filter((file) => file.startsWith('assets/') && file.endsWith('.js'));
const cssAssets = packagedV2Files.filter((file) => file.startsWith('assets/') && file.endsWith('.css'));
assert(jsAssets.length > 0, 'packaged /v2/ has no emitted JavaScript asset');
assert(cssAssets.length > 0, 'packaged /v2/ has no emitted CSS asset');

const artifactManifestSha = createHash('sha256')
  .update(packagedV2Files.map((file) => `${file}:${createHash('sha256').update(readFileSync(resolve(packagedV2Root, file))).digest('hex')}`).join('\n'))
  .digest('hex');

console.log('C0175 Pages artifact integrity');
console.log(`Legacy root Git blob: ${sourceLegacyBlob}`);
console.log(`V2 files verified: ${packagedV2Files.length}`);
console.log(`V2 manifest SHA256: ${artifactManifestSha}`);
console.log('Forbidden source roots: absent');
