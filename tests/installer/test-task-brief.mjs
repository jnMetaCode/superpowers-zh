import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const script = fileURLToPath(new URL('../../skills/subagent-driven-development/scripts/task-brief', import.meta.url));
for (const id of ['1', 'A1', '2.1']) {
  test(`Chinese task heading retains no-space ID ${id}`, t => {
    const result = extract(t, `### 任务${id}：目标\n保留。\n### 任务${id}b：其他\n排除。\n`, id);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.text, `### 任务${id}：目标\n保留。\n`);
  });
}
function extract(t, plan, id) {
  const dir = mkdtempSync(join(tmpdir(), 'brief-regression-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const source = join(dir, 'plan.md'), out = join(dir, 'brief.md');
  writeFileSync(source, plan);
  const result = spawnSync('bash', [script, source, id, out], { encoding: 'utf8' });
  return { ...result, text: existsSync(out) ? readFileSync(out, 'utf8') : '', exists: existsSync(out) };
}
for (const word of ['Task', '任务']) {
  for (const id of ['A1', '6b', '2.1']) {
    test(`${word}: exact ID ${id}`, t => {
      const result = extract(t, `### ${word} ${id}：目标\n保留。\n### ${word} ${id}b：其他\n排除。\n`, id);
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.text, `### ${word} ${id}：目标\n保留。\n`);
    });
  }
  test(`${word}: task 6 excludes sibling 6b`, t => {
    const result = extract(t, `## ${word} 6\n目标\n## ${word} 6b\n其他\n`, '6');
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.text, `## ${word} 6\n目标\n`);
  });
  test(`${word}: unclosed fence must not leak subsequent tasks`, t => {
    const result = extract(t, `## ${word} 1\n目标\n${String.fromCharCode(96).repeat(3)}js\n代码\n## ${word} 2\n其他\n`, '1');
    assert.equal(result.status, 4);
    assert.equal(result.exists, false);
  });
}
