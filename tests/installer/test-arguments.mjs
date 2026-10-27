import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const installer = join(root, 'bin/superpowers-zh.js');

function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'superpowers-arguments-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(join(dir, '.claude/skills/brainstorming'), { recursive: true });
  writeFileSync(join(dir, '.claude/skills/brainstorming/SKILL.md'), 'existing installed skill\n');
  writeFileSync(join(dir, 'user.txt'), 'keep this file\n');
  return dir;
}

function snapshot(dir, prefix = '') {
  const files = {};
  for (const entry of readdirSync(join(dir, prefix), { withFileTypes: true })) {
    const rel = join(prefix, entry.name);
    if (entry.isDirectory()) Object.assign(files, snapshot(dir, rel));
    else files[rel] = readFileSync(join(dir, rel), 'base64');
  }
  return files;
}

function run(dir, args) {
  const result = spawnSync(process.execPath, [installer, ...args], {
    cwd: dir, encoding: 'utf8', timeout: 15000,
  });
  assert.ifError(result.error);
  return result;
}

// A typo must not install into the wrong scope or uninstall an existing copy.
for (const args of [
  ['--tool', 'claude', '--gloabl'],
  ['--gloabl', '-t', 'claude'],
  ['--gloabl'],
  ['--uninstall', '--gloabl'],
]) {
  test(`rejects ${args.join(' ')} without changing project files`, t => {
    const dir = fixture(t);
    const before = snapshot(dir);
    const result = run(dir, args);
    assert.deepEqual(snapshot(dir), before, 'invalid arguments must not write or delete files');
    assert.equal(result.status, 1);
    assert.match(result.stdout + result.stderr, /未知参数: --gloabl/);
  });
}

test('valid short tool option still installs and uninstalls skills', t => {
  const dir = fixture(t);
  assert.equal(run(dir, ['-t', 'claude']).status, 0);
  const skill = join(dir, '.claude/skills/brainstorming/SKILL.md');
  assert.equal(readFileSync(skill, 'utf8'), readFileSync(join(root, 'skills/brainstorming/SKILL.md'), 'utf8'));
  assert.equal(run(dir, ['--uninstall']).status, 0);
  assert.equal(existsSync(skill), false);
  assert.equal(readFileSync(join(dir, 'user.txt'), 'utf8'), 'keep this file\n');
});

test('help and version remain read-only', t => {
  const dir = fixture(t);
  const before = snapshot(dir);
  assert.equal(run(dir, ['--help']).status, 0);
  const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;
  const result = run(dir, ['--version']);
  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), version);
  assert.deepEqual(snapshot(dir), before);
});
