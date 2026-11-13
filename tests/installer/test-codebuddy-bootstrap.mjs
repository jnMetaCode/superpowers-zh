import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const installer = resolve('bin/superpowers-zh.js');
const begin = '<!-- superpowers-zh:begin (do not edit between these markers) -->';
const end = '<!-- superpowers-zh:end -->';
for (const globalInstall of [false, true]) {
for (const [name, initial, shouldUpdate] of [
  ['refresh stale managed index', `user before\n${begin}\nold superpowers-zh index\n${end}\nuser after\n`, true],
  ['user trailing spaces and blank lines stay byte-identical', 'user notes with Markdown hard break  \n\n\n', true],
  ['reversed markers preserve user text', `${end}\nuser notes\n${begin}\n`, false],
  ['plain mention does not suppress bootstrap', 'user mentions superpowers-zh here\n', true],
  ['legacy unmarked bootstrap is preserved', '# Superpowers-ZH 中文增强版\nold superpowers-zh index\nuser notes\n', false],
  ['duplicate markers preserve user text', `${begin}\nold superpowers-zh index\n${end}\n${end}\nuser notes\n`, false],
  ['incomplete markers preserve user text', `user before\n${begin}\nold superpowers-zh index\n`, false],
]) {
  test(`${globalInstall ? 'global' : 'project'}: ${name}`, t => {
    const dir = mkdtempSync(join(tmpdir(), 'codebuddy-upgrade-'));
    t.after(() => rmSync(dir, { recursive: true, force: true }));
    const home = join(dir, 'isolated-user');
    const memoryDir = globalInstall ? join(home, '.codebuddy') : dir;
    mkdirSync(memoryDir, { recursive: true });
    const preloader = join(dir, 'os-stub.cjs');
    writeFileSync(preloader, 'require("node:os").homedir = () => process.env.CODEBUDDY_TEST_USER; require("node:module").syncBuiltinESMExports();');
    const path = join(memoryDir, 'CODEBUDDY.md'); writeFileSync(path, initial);
    function install() {
      const result = spawnSync(process.execPath, ['--require', preloader, installer, ...(globalInstall ? ['--global'] : []), '--tool', 'codebuddy'], { cwd: dir, env: { ...process.env, CODEBUDDY_TEST_USER: home }, encoding: 'utf8', timeout: 15000 });
      assert.equal(result.status, 0, result.stdout + result.stderr);
    }
    install(); const after = readFileSync(path, 'utf8');
    if (shouldUpdate) {
      assert.match(after, /\*\*brainstorming\*\*/);
      assert.equal(after.split(begin).length, 2);
      if (initial.includes(end)) {
        assert.ok(after.startsWith('user before\n')); assert.ok(after.endsWith('\nuser after\n'));
      } else assert.ok(after.startsWith(initial));
    } else assert.equal(after, initial);
    install(); assert.equal(readFileSync(path, 'utf8'), after);
  });
}
}
