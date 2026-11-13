import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const installer = fileURLToPath(new URL('../../bin/superpowers-zh.js', import.meta.url));
const begin = '<!-- superpowers-zh:begin (do not edit between these markers) -->';
const end = '<!-- superpowers-zh:end -->';
for (const [name, content] of [
  ['nested begin', `${begin}\nold index\n${begin}\nuser content\n${end}\n`],
  ['duplicate end', `${begin}\nold index\n${end}\nuser content\n${end}\n`],
  ['reversed', `${end}\nuser content\n${begin}\n`],
  ['missing end with legacy heading', `${begin}\n# Superpowers-ZH 中文增强版\nuser content\n`],
  ['missing begin with legacy heading', `# Superpowers-ZH 中文增强版\nuser content\n${end}\n`],
]) {
  test(`uninstall preserves ambiguous bootstrap: ${name}`, t => {
    const dir = mkdtempSync(join(tmpdir(), 'bootstrap-uninstall-'));
    t.after(() => rmSync(dir, { recursive: true, force: true }));
    const file = join(dir, 'CODEBUDDY.md');
    writeFileSync(file, content);
    const result = spawnSync(process.execPath, [installer, '--uninstall'], { cwd: dir, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(readFileSync(file, 'utf8'), content);
    assert.match(result.stdout + result.stderr, /边界|哨兵/);
  });
}
test('uninstall preserves bytes outside one valid managed block', t => {
  const dir = mkdtempSync(join(tmpdir(), 'bootstrap-uninstall-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, 'CODEBUDDY.md');
  const head = '# User notes  \n\n\n', tail = '\n\n  indented user text  \n\n';
  writeFileSync(file, head + begin + '\nmanaged index\n' + end + tail);
  const result = spawnSync(process.execPath, [installer, '--uninstall'], { cwd: dir, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(file, 'utf8'), head + tail);
});
