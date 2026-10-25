/** Distribute the same immutable character source to the Website. No network, deployment or auth. */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
const [targetArg, commit] = process.argv.slice(2);
if (!targetArg || !/^[a-f0-9]{40}$/.test(commit || '')) throw new Error('Usage: node scripts/export-mora-alive.mjs <website-checkout> <immutable-source-sha>');
const target = resolve(targetArg);
if (target === process.cwd() || !existsSync(resolve(target, 'package.json'))) throw new Error('Target must be a separate existing Website checkout');
const paths = ['components/mora/alive/CharacterScene.tsx', 'components/mora/alive/characterForm.ts', 'components/mora/alive/characterMaterials.ts', 'components/mora/alive/characterGlow.ts', 'components/mora/alive/MoraAliveView.tsx', 'components/mora/alive/MoraAlive.module.css', 'lib/mora/alive/engine.ts', 'public/brand/saimor-sigil-alive-256.png'];
const files = {};
for (const path of paths) {
  const bytes = execFileSync('git', ['show', `${commit}:${path}`], { maxBuffer: 1024 * 1024 });
  mkdirSync(dirname(resolve(target, path)), { recursive: true }); writeFileSync(resolve(target, path), bytes);
  files[path] = createHash('sha256').update(bytes).digest('hex');
}
const manifest = { canonicalRepository: 'Saimor-world/mora-ui', sourceCommit: commit, files, note: 'Generated from immutable canonical source. Do not edit mirrored files; change upstream and re-export.' };
mkdirSync(resolve(target, 'docs/mora-alive'), { recursive: true });
writeFileSync(resolve(target, 'docs/mora-alive/SOURCE.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ sourceCommit: commit, exported: paths.length }));
