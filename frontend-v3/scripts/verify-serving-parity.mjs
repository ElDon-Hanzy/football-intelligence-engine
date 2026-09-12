import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../..');
const requireDeployAllowed = process.env.C0255_REQUIRE_DEPLOY_ALLOWED !== '0';
const manifestFiles = [
  'runtime-manifests/fpl-api.production.json',
  'runtime-manifests/fpl-v3-workspace-api.production.json',
];

const failures = [];
for (const relativeManifestPath of manifestFiles) {
  const manifestPath = resolve(repoRoot, relativeManifestPath);
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const sourcePath = resolve(repoRoot, manifest.repository.path);
  const source = await readFile(sourcePath);
  const header = Buffer.from(`blob ${source.byteLength}\0`);
  const gitBlobSha = createHash('sha1').update(header).update(source).digest('hex');

  if (gitBlobSha !== manifest.repository.git_blob_sha) {
    failures.push(`${manifest.function} repository blob changed: manifest=${manifest.repository.git_blob_sha} actual=${gitBlobSha}`);
  }
  if (manifest.parity_status !== 'GREEN') {
    failures.push(`${manifest.function} runtime/source parity is ${manifest.parity_status}`);
  }
  if (requireDeployAllowed && manifest.public_v3_deploy_allowed !== true) {
    failures.push(`${manifest.function} does not authorize public V3 deployment`);
  }
}

if (failures.length) {
  console.error('C0255 serving parity gate: BLOCKED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `C0255 serving parity gate: PASS (${requireDeployAllowed ? 'deployment authorization required' : 'source/runtime parity only'})`,
);
