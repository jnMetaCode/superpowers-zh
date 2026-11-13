import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const manifests = ['.claude-plugin/plugin.json', '.cursor-plugin/plugin.json', '.codex-plugin/plugin.json',
  '.kimi-plugin/plugin.json', '.claude-plugin/marketplace.json', 'gemini-extension.json',
  '.antigravity-plugin/plugin.json', '.devin-plugin/plugin.json', '.muse-plugin/plugin.json', '.muse-plugin/marketplace.json'];
const skills = ['one', 'newly-added'];
function fixture(t, version = '1.8.1') {
  const temp = mkdtempSync(join(tmpdir(), 'superpowers release versions '));
  t.after(() => rmSync(temp, { recursive: true, force: true }));
  const root = join(temp, 'project');
  mkdirSync(join(root, 'scripts'), { recursive: true });
  copyFileSync(join(repo, 'scripts/sync-plugin-version.js'), join(root, 'scripts/sync-plugin-version.js'));
  const pkg = JSON.parse(readFileSync(join(repo, 'package.json'), 'utf8'));
  pkg.version = version;
  writeFileSync(join(root, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
  for (const path of manifests) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    copyFileSync(join(repo, path), join(root, path));
  }
  mkdirSync(join(root, '.hermes-plugin'), { recursive: true });
  copyFileSync(join(repo, '.hermes-plugin/plugin.yaml'), join(root, '.hermes-plugin/plugin.yaml'));
  for (const name of skills) {
    mkdirSync(join(root, 'skills', name), { recursive: true });
    writeFileSync(join(root, 'skills', name, 'SKILL.md'), `---\nname: ${name}\ndescription: trigger\nversion: "1.0.0"\nlicense: MIT\n---\n\n# Body\nversion: "9.9.9" is an example; keep it.\n`);
  }
  return { root, temp };
}
function run(root, cmd, args, temp = dirname(root)) {
  const result = spawnSync(cmd, args, { cwd: root, encoding: 'utf8', timeout: 30000,
    env: { ...process.env, npm_config_cache: join(temp, 'npm-cache'), npm_config_ignore_scripts: 'false', npm_config_git_tag_version: 'true' } });
  assert.ifError(result.error);
  return result;
}
function sync(root, args = []) { return run(root, process.execPath, ['scripts/sync-plugin-version.js', ...args]); }
function snapshot(root) {
  const files = {};
  function visit(dir) {
    for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
      if (entry.name === '.git') continue;
      const rel = join(dir, entry.name);
      if (entry.isDirectory()) visit(rel);
      else files[rel] = readFileSync(join(root, rel), 'base64');
    }
  }
  visit(''); return files;
}
test('sync discovers all skills and changes only their frontmatter version', t => {
  const { root } = fixture(t);
  const result = sync(root);
  assert.equal(result.status, 0, result.stderr);
  for (const name of skills) {
    const text = readFileSync(join(root, 'skills', name, 'SKILL.md'), 'utf8');
    assert.match(text, /\nversion: "1\.8\.1"\nlicense:/);
    assert.match(text, /version: "9\.9\.9" is an example; keep it\./);
  }
  for (const path of manifests) {
    const json = JSON.parse(readFileSync(join(root, path), 'utf8'));
    assert.equal(path.includes('marketplace') ? json.plugins[0].version : json.version, '1.8.1');
  }
  const before = snapshot(root);
  assert.match(readFileSync(join(root, '.hermes-plugin/plugin.yaml'), 'utf8'), /^version: "1\.8\.1"$/m);
  assert.equal(sync(root).status, 0);
  assert.deepEqual(snapshot(root), before, 'repeat synchronization must be byte-idempotent');
});
test('--check rejects drift and never rewrites any file', t => {
  const { root } = fixture(t);
  const before = snapshot(root);
  const result = sync(root, ['--check']);
  assert.equal(result.status, 1);
  assert.deepEqual(snapshot(root), before);
  assert.equal(sync(root).status, 0);
  const clean = snapshot(root);
  assert.equal(sync(root, ['--check']).status, 0);
  assert.deepEqual(snapshot(root), clean);
});
test('a malformed skill prevents partial release metadata writes', t => {
  const { root } = fixture(t);
  writeFileSync(join(root, 'skills/one/SKILL.md'), '---\nname: one\ndescription: trigger\n---\nbody\n');
  const before = snapshot(root);
  assert.notEqual(sync(root).status, 0);
  assert.deepEqual(snapshot(root), before);
});
test('duplicate version keys are rejected even when one value is malformed', t => {
  const { root } = fixture(t);
  const path = join(root, 'skills/one/SKILL.md');
  writeFileSync(path, readFileSync(path, 'utf8').replace('license: MIT', 'version: invalid\nlicense: MIT'));
  const before = snapshot(root);
  const result = sync(root);
  assert.notEqual(result.status, 0, 'ambiguous metadata must not be published');
  assert.deepEqual(snapshot(root), before, 'validation must finish before writes');
});
for (const path of ['.claude-plugin/plugin.json', '.claude-plugin/marketplace.json']) {
  test(`sync updates the intended version when nested metadata comes first: ${path}`, t => {
    const { root } = fixture(t);
    const full = join(root, path);
    let original = JSON.parse(readFileSync(full, 'utf8'));
    if (path.includes('marketplace')) {
      original.plugins[0] = { metadata: { version: '3.2.1' }, ...original.plugins[0] };
      original.plugins.push({ name: 'unrelated', version: '5.6.7' });
    } else {
      original = { metadata: { version: '3.2.1' }, ...original };
    }
    writeFileSync(full, JSON.stringify(original, null, 2) + '\n');
    const expected = structuredClone(original);
    if (path.includes('marketplace')) expected.plugins[0].version = '1.8.1';
    else expected.version = '1.8.1';
    const result = sync(root);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(readFileSync(full, 'utf8')), expected);
    assert.equal(sync(root, ['--check']).status, 0);
  });
}
test('npm version commits skill metadata together with plugin manifests', t => {
  const { root, temp } = fixture(t, '1.8.0');
  for (const args of [['init', '-q'], ['config', 'user.name', 'Version Test'], ['config', 'user.email', 'version-test@example.invalid'],
    ['config', 'commit.gpgsign', 'false'], ['config', 'tag.gpgsign', 'false'], ['add', '.'], ['commit', '-qm', 'fixture']]) {
    const result = run(root, 'git', args, temp); assert.equal(result.status, 0, result.stderr);
  }
  const result = run(root, 'npm', ['version', '1.8.1'], temp);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  for (const name of skills) {
    const committed = run(root, 'git', ['show', `HEAD:skills/${name}/SKILL.md`]);
    assert.equal(committed.status, 0, committed.stderr);
    assert.match(committed.stdout, /\nversion: "1\.8\.1"\n/);
  }
  const status = run(root, 'git', ['status', '--porcelain']);
  assert.equal(status.stdout, '', 'version hook must stage all modified release metadata');
});

test('npm version rejects malformed skill metadata before changing package.json', t => {
  const { root } = fixture(t, '1.8.0');
  writeFileSync(join(root, 'skills/one/SKILL.md'), '---\nname: one\n---\nbody\n');
  for (const args of [['init', '-q'], ['config', 'user.name', 'Version Test'], ['config', 'user.email', 'version-test@example.invalid'],
    ['config', 'commit.gpgsign', 'false'], ['add', '.'], ['commit', '-qm', 'fixture']]) {
    const result = run(root, 'git', args); assert.equal(result.status, 0, result.stderr);
  }
  const before = snapshot(root);
  const result = run(root, 'npm', ['version', '1.8.1']);
  assert.notEqual(result.status, 0);
  assert.deepEqual(snapshot(root), before, 'failed release must leave all metadata byte-identical');
  assert.equal(run(root, 'git', ['status', '--porcelain']).stdout, '');
});

test('--validate accepts version drift without modifying files', t => {
  const { root } = fixture(t);
  const before = snapshot(root);
  const result = sync(root, ['--validate']);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(snapshot(root), before);
});

const jqAvailable = spawnSync('jq', ['--version'], { encoding: 'utf8' }).status === 0;
test('legacy registry fields are data, not jq expressions', { skip: !jqAvailable }, t => {
  const { root } = fixture(t, '1.8.0');
  const config = JSON.parse(readFileSync(join(repo, '.version-bump.json'), 'utf8'));
  config.files[0].field = 'version | .';
  writeFileSync(join(root, '.version-bump.json'), JSON.stringify(config));
  copyFileSync(join(repo, 'scripts/bump-version.sh'), join(root, 'scripts/bump-version.sh'));
  const before = snapshot(root);
  const result = run(root, 'bash', ['scripts/bump-version.sh', '1.8.1']);
  assert.notEqual(result.status, 0);
  assert.deepEqual(snapshot(root), before, 'an invalid field must not rewrite package.json as a JSON string');
});
for (const mode of ['--check', '--audit']) {
  test(`legacy ${mode} rejects partially invalid registry without false success`, { skip: !jqAvailable }, t => {
    const { root } = fixture(t, '1.8.0');
    assert.equal(sync(root).status, 0);
    const config = JSON.parse(readFileSync(join(repo, '.version-bump.json'), 'utf8'));
    config.files.push(42);
    writeFileSync(join(root, '.version-bump.json'), JSON.stringify(config));
    copyFileSync(join(repo, 'scripts/bump-version.sh'), join(root, 'scripts/bump-version.sh'));
    const before = snapshot(root);
    const result = run(root, 'bash', ['scripts/bump-version.sh', mode]);
    assert.notEqual(result.status, 0);
    assert.deepEqual(snapshot(root), before);
  });
}
test('legacy bump validates every registry entry before any write', { skip: !jqAvailable }, t => {
  const { root } = fixture(t, '1.8.0');
  const config = JSON.parse(readFileSync(join(repo, '.version-bump.json'), 'utf8'));
  config.files.push({ path: 'extra.json', field: 'version' });
  writeFileSync(join(root, '.version-bump.json'), JSON.stringify(config));
  writeFileSync(join(root, 'extra.json'), '{ invalid JSON\n');
  copyFileSync(join(repo, 'scripts/bump-version.sh'), join(root, 'scripts/bump-version.sh'));
  const before = snapshot(root);
  const result = run(root, 'bash', ['scripts/bump-version.sh', '1.8.1']);
  assert.notEqual(result.status, 0);
  assert.deepEqual(snapshot(root), before, 'a later malformed registry entry must not leave earlier manifests updated');
});
for (const version of ['1.8.1junk', '01.8.1', '1.8.1-01', '1.8.1+']) {
  test(`legacy bump rejects invalid version without writes: ${version}`, { skip: !jqAvailable }, t => {
    const { root } = fixture(t, '1.8.0');
    copyFileSync(join(repo, '.version-bump.json'), join(root, '.version-bump.json'));
    copyFileSync(join(repo, 'scripts/bump-version.sh'), join(root, 'scripts/bump-version.sh'));
    const before = snapshot(root);
    const result = run(root, 'bash', ['scripts/bump-version.sh', version]);
    assert.notEqual(result.status, 0);
    assert.deepEqual(snapshot(root), before);
  });
}
test('legacy audit propagates version drift and never modifies files', {
  skip: jqAvailable ? false : 'jq is required by the existing bash updater',
}, t => {
  const { root } = fixture(t, '1.8.0');
  copyFileSync(join(repo, '.version-bump.json'), join(root, '.version-bump.json'));
  copyFileSync(join(repo, 'scripts/bump-version.sh'), join(root, 'scripts/bump-version.sh'));
  const before = snapshot(root);
  const drift = run(root, 'bash', ['scripts/bump-version.sh', '--audit']);
  assert.equal(drift.status, 1, drift.stdout + drift.stderr);
  assert.deepEqual(snapshot(root), before);
  assert.equal(sync(root).status, 0);
  const clean = snapshot(root);
  const audited = run(root, 'bash', ['scripts/bump-version.sh', '--audit']);
  assert.equal(audited.status, 0, audited.stdout + audited.stderr);
  assert.deepEqual(snapshot(root), clean);
});
test('legacy bump accepts prerelease and build metadata', { skip: !jqAvailable }, t => {
  const { root } = fixture(t, '1.8.0');
  copyFileSync(join(repo, '.version-bump.json'), join(root, '.version-bump.json'));
  copyFileSync(join(repo, 'scripts/bump-version.sh'), join(root, 'scripts/bump-version.sh'));
  const version = '1.9.0-rc.1+build.7';
  const result = run(root, 'bash', ['scripts/bump-version.sh', version]);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version, version);
  assert.equal(sync(root, ['--check']).status, 0);
});
test('npm package contains synchronized skill versions and plugin metadata', t => {
  const { root, temp } = fixture(t);
  assert.equal(sync(root).status, 0);
  const packed = run(root, 'npm', ['pack', '--offline', '--ignore-scripts', '--json', '--pack-destination', temp]);
  assert.equal(packed.status, 0, packed.stdout + packed.stderr);
  const [info] = JSON.parse(packed.stdout);
  const archive = join(temp, info.filename);
  const unpacked = join(temp, 'unpacked');
  mkdirSync(unpacked);
  const extracted = run(root, 'tar', ['-xzf', archive, '-C', unpacked]);
  assert.equal(extracted.status, 0, extracted.stderr);
  const packageRoot = join(unpacked, 'package');
  const version = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8')).version;
  assert.equal(version, '1.8.1');
  for (const name of skills) {
    const text = readFileSync(join(packageRoot, 'skills', name, 'SKILL.md'), 'utf8');
    assert.match(text, /\nversion: "1\.8\.1"\n/);
    assert.match(text, /version: "9\.9\.9" is an example; keep it\./);
  }
  // Kimi 的原生 manifest 通过 Git 插件渠道分发，不在 npm files 清单内。
  const shippedManifests = manifests.filter(path => path !== '.kimi-plugin/plugin.json');
  for (const path of shippedManifests) {
    const json = JSON.parse(readFileSync(join(packageRoot, path), 'utf8'));
    assert.equal(path.includes('marketplace') ? json.plugins[0].version : json.version, version);
  }
});

test('legacy bash updater also checks and synchronizes skill release metadata', {
  skip: jqAvailable ? false : 'jq is required by the existing bash updater',
}, t => {
  const { root } = fixture(t, '1.8.0');
  copyFileSync(join(repo, '.version-bump.json'), join(root, '.version-bump.json'));
  copyFileSync(join(repo, 'scripts/bump-version.sh'), join(root, 'scripts/bump-version.sh'));
  const before = snapshot(root);
  const drift = run(root, 'bash', ['scripts/bump-version.sh', '--check']);
  assert.equal(drift.status, 1, drift.stdout + drift.stderr);
  assert.deepEqual(snapshot(root), before);
  const bumped = run(root, 'bash', ['scripts/bump-version.sh', '1.8.1']);
  assert.equal(bumped.status, 0, bumped.stdout + bumped.stderr);
  assert.equal(sync(root, ['--check']).status, 0);
  for (const name of skills) {
    assert.match(readFileSync(join(root, 'skills', name, 'SKILL.md'), 'utf8'), /\nversion: "1\.8\.1"\n/);
  }
});
