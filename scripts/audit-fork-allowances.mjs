import { readFileSync, statSync } from 'node:fs';
import { resolve, relative, isAbsolute } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

// Only release-version metadata is ignored; skill descriptions and bodies remain bound.
export function auditDigest(text) {
  const normalized = text.replace(/^(---\r?\n)([\s\S]*?)(\r?\n---)/,
    (_, start, metadata, end) => start + metadata.replace(/^version:[^\r\n]*/m, 'version: <release>') + end);
  return createHash('sha256').update(normalized).digest('hex');
}

export function verifiedAllowances(root, ref = 'upstream/main') {
  const declarations = JSON.parse(readFileSync(resolve(root, '.upstream-sync.json'), 'utf8')).forkAudit || {};
  const verified = {};
  function localPath(file) {
    const path = resolve(root, file);
    const rel = relative(root, path);
    if (!rel || rel.startsWith('../') || isAbsolute(rel)) throw new Error(`Invalid audit path: ${file}`);
    return path;
  }
  for (const [file, entry] of Object.entries(declarations)) {
    if (!entry.reason?.trim()) throw new Error(`Missing fork rationale: ${file}`);
    const upstream = execFileSync('git', ['show', `${ref}:${file}`], { cwd: root, encoding: 'utf8' });
    const ours = readFileSync(localPath(file), 'utf8');
    if (auditDigest(upstream) !== entry.upstreamSha256 || auditDigest(ours) !== entry.forkSha256) {
      throw new Error(`Reviewed fork content changed; re-audit required: ${file}`);
    }
    if (entry.runtime !== undefined && entry.runtime !== true) throw new Error(`Invalid runtime allowance: ${file}`);
    if (entry.headingDelta !== undefined && (!Number.isInteger(entry.headingDelta) || entry.headingDelta < 0)) {
      throw new Error(`Invalid heading delta: ${file}`);
    }
    if (entry.identifiers !== undefined && (!Array.isArray(entry.identifiers) || entry.identifiers.some(x => typeof x !== 'string' || !x))) {
      throw new Error(`Invalid identifier allowance: ${file}`);
    }
    if (entry.identifiers?.length && !entry.targets?.length) throw new Error(`Missing relocated content targets: ${file}`);
    for (const target of entry.targets || []) {
      if (!statSync(localPath(target)).isFile()) throw new Error(`Missing relocated content: ${target}`);
      if (auditDigest(readFileSync(localPath(target), 'utf8')) !== entry.targetSha256?.[target]) {
        throw new Error(`Relocated content changed; re-audit required: ${target}`);
      }
    }
    verified[file] = entry;
  }
  return verified;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { process.stdout.write(JSON.stringify(verifiedAllowances(process.cwd()))); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
