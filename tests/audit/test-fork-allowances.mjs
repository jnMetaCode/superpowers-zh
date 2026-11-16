import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { auditDigest, verifiedAllowances } from '../../scripts/audit-fork-allowances.mjs';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'fork-audit-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', args, { cwd: root, stdio: 'pipe' });
  git('init', '-q');
  git('config', 'user.name', 'Audit Fixture');
  git('config', 'user.email', 'audit@example.invalid');
  const source = '---\nname: fixture\nversion: "1.0.0"\n---\n# Original\n';
  const fork = source.replace('# Original', '# Chinese layout');
  writeFileSync(join(root, 'SKILL.md'), source);
  git('add', 'SKILL.md'); git('-c', 'commit.gpgsign=false', 'commit', '-qm', 'upstream fixture');
  git('update-ref', 'refs/remotes/upstream/main', 'HEAD');
  writeFileSync(join(root, 'SKILL.md'), fork);
  mkdirSync(join(root, 'references'));
  const target = '# Relocated guidance\nRead the plan first.\n';
  writeFileSync(join(root, 'references/setup.md'), target);
  const entry = { reason: 'Reviewed layout change', upstreamSha256: auditDigest(source),
    forkSha256: auditDigest(fork), headingDelta: 1, identifiers: ['setup.md'],
    targets: ['references/setup.md'], targetSha256: { 'references/setup.md': auditDigest(target) } };
  const save = () => writeFileSync(join(root, '.upstream-sync.json'), JSON.stringify({ forkAudit: { 'SKILL.md': entry } }));
  save();
  return { root, source, fork, target, entry, save, git };
}

test('accepts exact reviewed fork and relocated content', t => {
  const f = fixture(t); assert.equal(verifiedAllowances(f.root)['SKILL.md'].headingDelta, 1);
});
test('release version changes preserve reviewed skill-body binding', t => {
  const f = fixture(t); writeFileSync(join(f.root, 'SKILL.md'), f.fork.replace('1.0.0', '1.9.0'));
  assert.ok(verifiedAllowances(f.root)['SKILL.md']);
});
test('skill description or body changes invalidate review', t => {
  const f = fixture(t); writeFileSync(join(f.root, 'SKILL.md'), f.fork + 'unreviewed change\n');
  assert.throws(() => verifiedAllowances(f.root), /re-audit required/);
});
test('upstream changes invalidate review', t => {
  const f = fixture(t); writeFileSync(join(f.root, 'SKILL.md'), f.source + 'new upstream rule\n');
  f.git('add', 'SKILL.md'); f.git('-c', 'commit.gpgsign=false', 'commit', '-qm', 'upstream update');
  f.git('update-ref', 'refs/remotes/upstream/main', 'HEAD'); writeFileSync(join(f.root, 'SKILL.md'), f.fork);
  assert.throws(() => verifiedAllowances(f.root), /re-audit required/);
});
test('changed relocated content cannot silently lose rules', t => {
  const f = fixture(t); writeFileSync(join(f.root, 'references/setup.md'), '# Empty\n');
  assert.throws(() => verifiedAllowances(f.root), /Relocated content changed/);
});
test('missing relocated content fails closed', t => {
  const f = fixture(t); rmSync(join(f.root, 'references/setup.md'));
  assert.throws(() => verifiedAllowances(f.root));
});
test('rationale is mandatory', t => {
  const f = fixture(t); f.entry.reason = ''; f.save();
  assert.throws(() => verifiedAllowances(f.root), /Missing fork rationale/);
});
test('invalid heading allowance is rejected', t => {
  const f = fixture(t); f.entry.headingDelta = -1; f.save();
  assert.throws(() => verifiedAllowances(f.root), /Invalid heading delta/);
});
test('identifier allowances require actual relocated targets', t => {
  const f = fixture(t); delete f.entry.targets; f.save();
  assert.throws(() => verifiedAllowances(f.root), /Missing relocated content targets/);
});
