import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const script = resolve('tests/skill-size/test-skill-size.sh');
for (const [name, body, expected] of [
  ['19999 ASCII bytes', 'x'.repeat(19999), 0],
  ['20000 ASCII bytes', 'x'.repeat(20000), 1],
  ['20001 ASCII bytes', 'x'.repeat(20001), 1],
  ['19999 UTF-8 bytes', '中'.repeat(6666) + 'x', 0],
  ['20000 UTF-8 bytes', '中'.repeat(6666) + 'xx', 1],
  ['20001 UTF-8 bytes', '中'.repeat(6667), 1],
  ['empty skills directory', null, 1],
  ['missing skills directory', undefined, 1],
]) {
  test(name, () => {
    const root = mkdtempSync(join(tmpdir(), 'skill-size boundary '));
    try {
      if (body !== undefined) mkdirSync(join(root, 'skills'), { recursive: true });
      if (body != null) {
        const dir = join(root, 'skills', 'name with spaces');
        mkdirSync(dir);
        writeFileSync(join(dir, 'SKILL.md'), body);
      }
      const result = spawnSync('bash', [script, root], { encoding: 'utf8' });
      assert.equal(result.status, expected, result.stdout + result.stderr);
      assert.match(result.stdout, expected ? /FAIL:/ : /PASS:/);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
}
