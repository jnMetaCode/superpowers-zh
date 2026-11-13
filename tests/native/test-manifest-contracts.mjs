import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root = fileURLToPath(new URL('../..', import.meta.url));
test('Muse declares every fork skill and invokes SessionStart with Bash', () => {
  const manifest = JSON.parse(readFileSync(join(root, '.muse-plugin/plugin.json'), 'utf8'));
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  assert.equal(manifest.name, pkg.name);
  assert.equal(manifest.version, pkg.version);
  const skills = readdirSync(join(root, 'skills'), { withFileTypes: true }).filter(x => x.isDirectory()).map(x => x.name).sort();
  assert.deepEqual(manifest.capabilities.skills.map(x => x.id).sort(), skills);
  for (const skill of manifest.capabilities.skills) assert.ok(existsSync(join(root, skill.path)), skill.path);
  assert.deepEqual(manifest.capabilities.hooks[0].command, ['bash', 'hooks/session-start']);
});
test('publishing sync requires an explicit destination before authentication or network calls', () => {
  const env = { ...process.env };
  delete env.SUPERPOWERS_CODEX_TARGET_REPO;
  const result = spawnSync('bash', [join(root, 'scripts/sync-to-codex-plugin.sh'), '--dry-run'], { env, encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Set SUPERPOWERS_CODEX_TARGET_REPO explicitly/);
});
for (const dest of ['../../outside', '/tmp/outside']) {
  test(`publishing destination cannot escape the target plugin directory: ${dest}`, () => {
    const result = spawnSync('bash', [join(root, 'scripts/sync-to-codex-plugin.sh'), '--dry-run'], {
      env: { ...process.env, SUPERPOWERS_CODEX_TARGET_REPO: 'example/test-target', SUPERPOWERS_CODEX_DEST_REL: dest }, encoding: 'utf8',
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Destination must be plugins\/NAME/);
  });
}
