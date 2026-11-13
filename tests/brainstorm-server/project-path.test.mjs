import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const launcher = fileURLToPath(new URL('../../skills/brainstorming/scripts/start-server.sh', import.meta.url));
for (const project of ['.', 'nested/new project']) {
  test(`launcher resolves project path before changing directory: ${project}`, t => {
    const dir = mkdtempSync(join(tmpdir(), 'brainstorm-path-'));
    t.after(() => rmSync(dir, { recursive: true, force: true }));
    const bin = join(dir, 'bin'), capture = join(dir, 'capture');
    mkdirSync(bin);
    // Replace only the server process. No socket is opened; real launcher path handling runs.
    writeFileSync(join(bin, 'node'), '#!/bin/sh\nprintf "%s\\n" "$BRAINSTORM_DIR" "$BRAINSTORM_PORT_FILE" "$BRAINSTORM_TOKEN_FILE" > "$PATH_CAPTURE"\n', { mode: 0o755 });
    const result = spawnSync('bash', [launcher, '--project-dir', project, '--foreground'], {
      cwd: dir, encoding: 'utf8', timeout: 10000,
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, PATH_CAPTURE: capture },
    });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    const paths = readFileSync(capture, 'utf8').trim().split('\n');
    const root = realpathSync(join(dir, project));
    for (const path of paths) {
      assert.ok(isAbsolute(path), `relative path reached server: ${path}`);
      assert.ok(path.startsWith(join(root, '.superpowers/brainstorm') + '/'), path);
    }
  });
}
