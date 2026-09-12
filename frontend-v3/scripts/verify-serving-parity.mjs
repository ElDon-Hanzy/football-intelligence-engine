import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../..');
const manifestPath = resolve(repoRoot, 'runtime-manifests/fpl-api.production.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const sourcePath = resolve(repoRoot, manifest.repository.path);
const source = await readFile(sourcePath);

const header = Buffer.from(`blob ${source.byteLength}\0`);
const gitBlobSha = createHash('sha1').update(header).update(source).digest('hex');

const failures = [];
if (gitBlobSha !== manifest.repository.git_blob_sha) {
  failures.push(`repository fpl-api blob changed: manifest=${manifest.repository.git_blob_sha} actual=${gitBlobSha}`);
}
if (manifest.parity_status !== 'GREEN') {
  failures.push(`runtime/source parity is ${manifest.parity_status}`);
}
if (manifest.public_v3_deploy_allowed !== true) {
  failures.push('public V3 deploy is not authorized by the serving parity manifest');
}

if (failures.length) {
  console.error('C0255 serving parity gate: BLOCKED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('C0255 serving parity gate: PASS');
