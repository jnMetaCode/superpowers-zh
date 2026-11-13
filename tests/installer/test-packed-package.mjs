import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, readdirSync, existsSync, rmSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repo = fileURLToPath(new URL('../..', import.meta.url));
test('real npm archive installs complete skills and runs the installed SDD helpers', t => {
  const temp = mkdtempSync(join(tmpdir(), 'superpowers packed install '));
  t.after(() => rmSync(temp, { recursive: true, force: true }));
  function run(cwd, command, args) {
    const result = spawnSync(command, args, {
      cwd, encoding: 'utf8', timeout: 30000,
      env: { ...process.env, npm_config_cache: join(temp, 'npm-cache') },
    });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    return result.stdout;
  }
  const packed = JSON.parse(run(repo, 'npm', ['pack', '--offline', '--ignore-scripts', '--json', '--pack-destination', temp]));
  run(temp, 'tar', ['-xzf', join(temp, packed[0].filename)]);
  const bundle = join(temp, 'package');
  const project = join(temp, 'project');
  mkdirSync(project);
  writeFileSync(join(project, 'keep.txt'), 'user content\n');
  const installer = join(bundle, 'bin/superpowers-zh.js');
  run(project, process.execPath, [installer, '--tool', 'antigravity']);
  const installed = join(project, '.agents/skills');
  const skillNames = readdirSync(join(repo, 'skills'), { withFileTypes: true })
    .filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
  assert.deepEqual(readdirSync(installed).sort(), skillNames);
  const version = JSON.parse(readFileSync(join(bundle, 'package.json'), 'utf8')).version;
  for (const name of skillNames) {
    const content = readFileSync(join(installed, name, 'SKILL.md'), 'utf8');
    assert.equal(content, readFileSync(join(repo, 'skills', name, 'SKILL.md'), 'utf8'));
    assert.ok(content.split('\n---')[0].includes(`version: "${version}"`), name);
  }
  const files = packed[0].files.map(file => file.path);
  assert.equal(files.some(path => path.includes('__pycache__') || /\.py[co]$/.test(path)), false,
    'Python build caches must not ship in the plugin package');
  for (const path of ['.antigravity-plugin/plugin.json', '.devin-plugin/plugin.json',
    '.muse-plugin/plugin.json', '.hermes-plugin/plugin.yaml', '.hermes-plugin/__init__.py']) {
    assert.ok(files.includes(path), `native plugin file missing from npm package: ${path}`);
  }
  assert.ok(files.includes('skills/subagent-driven-development/scripts/sdd-repo'));
  assert.equal(files.some(path => /^skills\/.*\/(CREATION-LOG|test-[^/]+)\.md$/.test(path)), false);

  run(project, 'git', ['init', '-q']);
  run(project, 'git', ['add', 'keep.txt']);
  run(project, 'git', ['-c', 'user.name=Package Test', '-c', 'user.email=package@example.invalid',
    '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null', 'commit', '-qm', 'fixture']);
  writeFileSync(join(project, 'plan.md'), '# 计划\n\n### 任务A1：中文任务\n保留本段。\n\n### 任务A2：其他任务\n排除本段。\n');
  const start = join(installed, 'executing-plans/scripts/task-start');
  // Marketplace archive extractors can drop Unix executable bits (#2040).
  for (const name of ['task-brief', 'sdd-workspace', 'sdd-repo', 'review-package']) {
    chmodSync(join(installed, 'subagent-driven-development/scripts', name), 0o644);
  }
  const output = run(project, 'bash', [start, 'plan.md', 'A1']);
  const brief = /^brief: (.+)$/m.exec(output)?.[1];
  assert.ok(brief, output);
  assert.equal(readFileSync(brief, 'utf8'), '### 任务A1：中文任务\n保留本段。\n\n');
  assert.match(output, /^base: [0-9a-f]{40}$/m);
  const base = run(project, 'git', ['rev-parse', 'HEAD']).trim();
  writeFileSync(join(project, 'delivered.txt'), 'delivered task\n');
  run(project, 'git', ['add', 'delivered.txt']);
  run(project, 'git', ['-c', 'user.name=Package Test', '-c', 'user.email=package@example.invalid',
    '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null', 'commit', '-qm', 'deliver task']);
  const reviewer = join(installed, 'subagent-driven-development/scripts/review-package');
  const reviewOutput = run(temp, 'bash', [reviewer, '-C', project, 'plan.md', base, 'HEAD']);
  const review = /^wrote (.+): [0-9]+ commit/m.exec(reviewOutput)?.[1];
  assert.ok(review, reviewOutput);
  assert.match(readFileSync(review, 'utf8'), /\+delivered task/);
  const done = join(installed, 'executing-plans/scripts/task-done');
  run(project, 'bash', [done, 'plan.md', 'A1', base, '--', process.execPath, '-e', 'process.exit(0)']);
  const ledger = readFileSync(join(dirname(brief), 'progress.md'), 'utf8');
  assert.match(ledger, /Task A1: complete/);
  run(project, process.execPath, [installer, '--uninstall']);
  assert.equal(existsSync(join(installed, 'subagent-driven-development')), false);
  assert.equal(readFileSync(join(project, 'keep.txt'), 'utf8'), 'user content\n');
  assert.equal(readFileSync(brief, 'utf8').includes('保留本段。'), true);
});
