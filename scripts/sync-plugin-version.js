#!/usr/bin/env node
// 把 package.json 的发行版号同步到 plugin manifest 和所有技能的 frontmatter。
// 由 npm version 钩子触发，跑在 version commit 创建之前。
// --check 检查一致性；--validate 只验证格式、允许版本漂移。两者均不写文件。
//
// 设计：用 regex 替换而不是 JSON.parse + stringify，目的是保留原文件格式
// （缩进、行内/多行数组、空白等不被破坏）。替换后按 JSON 字段路径验证，避免命中嵌套同名字段。
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const args = process.argv.slice(2);
if (args.length > 1 || (args.length === 1 && !['--check', '--validate'].includes(args[0]))) {
  console.error('Usage: node scripts/sync-plugin-version.js [--check|--validate]');
  process.exit(2);
}
const check = args[0] === '--check';
const validate = args[0] === '--validate';

// targets 字段对齐上游 .version-bump.json 格式（path + field 路径）。
// 顶层用 "version"，嵌套用 dot-path（如 "plugins.0.version"）。
const TARGETS = [
  { path: '.claude-plugin/plugin.json',      field: 'version' },
  { path: '.cursor-plugin/plugin.json',      field: 'version' },
  { path: '.codex-plugin/plugin.json',       field: 'version' },
  { path: '.kimi-plugin/plugin.json',        field: 'version' },
  { path: '.claude-plugin/marketplace.json', field: 'plugins.0.version' },
  { path: 'gemini-extension.json',           field: 'version' },
  { path: '.antigravity-plugin/plugin.json', field: 'version' },
  { path: '.devin-plugin/plugin.json', field: 'version' },
  { path: '.muse-plugin/plugin.json', field: 'version' },
  { path: '.muse-plugin/marketplace.json', field: 'plugins.0.version' },
  { path: '.hermes-plugin/plugin.yaml', field: 'version' },
];

function replaceField(text, field, version) {
  const expected = JSON.parse(text);
  if (field === 'version') expected.version = version;
  else if (field === 'plugins.0.version') expected.plugins[0].version = version;
  else throw new Error(`Unsupported field path: ${field}`);
  const wanted = JSON.stringify(expected);
  // Pick the textual replacement whose entire parsed document equals the
  // requested path update. Other metadata and unrelated plugins stay intact.
  for (const match of text.matchAll(/("version"\s*:\s*)"(?:\\.|[^"\\])*"/g)) {
    const candidate = text.slice(0, match.index) + match[1] + JSON.stringify(version)
      + text.slice(match.index + match[0].length);
    try {
      if (JSON.stringify(JSON.parse(candidate)) === wanted) return candidate;
    } catch {
      // A version-like string inside a string value is not a JSON field.
    }
  }
  throw new Error(`Cannot safely locate field ${field}`);
}

function readField(json, field) {
  if (field === 'version') return json.version;
  if (field === 'plugins.0.version') return json.plugins?.[0]?.version;
  throw new Error(`Unsupported field path: ${field}`);
}

// 先验证所有目标，再写入；损坏的技能元数据不能造成半套版本更新。
const updates = [];
for (const { path: rel, field } of TARGETS) {
  const fullPath = resolve(root, rel);
  const text = readFileSync(fullPath, 'utf8');
  if (rel.endsWith('.yaml')) {
    // Hermes' manifest is flat YAML; change only its scalar version, without
    // introducing a YAML dependency or rewriting unrelated formatting.
    const keys = [...text.matchAll(/^version[ \t]*:/gm)];
    const pattern = /^version:([ \t]*)(["']?)([0-9][0-9A-Za-z.+-]*)\2([ \t]*(?:#[^\r\n]*)?)(\r?)$/gm;
    const values = [...text.matchAll(pattern)];
    if (keys.length !== 1 || values.length !== 1) throw new Error(`${rel}: expected one scalar version`);
    const current = values[0][3];
    if (current !== pkg.version) {
      const updated = text.replace(pattern, (_m, space, quote, _v, comment, cr) =>
        `version:${space}${quote}${pkg.version}${quote}${comment}${cr}`);
      updates.push({ rel, fullPath, current, updated });
    }
    continue;
  }
  const json = JSON.parse(text);
  const current = readField(json, field);
  if (current === pkg.version) continue;

  const updated = replaceField(text, field, pkg.version);
  if (updated === text) {
    throw new Error(`未能在 ${rel} 中定位字段 ${field}`);
  }
  updates.push({ rel, fullPath, current, updated });
}

for (const entry of readdirSync(resolve(root, 'skills'), { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const rel = `skills/${entry.name}/SKILL.md`;
  const fullPath = resolve(root, rel);
  const text = readFileSync(fullPath, 'utf8');
  const frontmatter = /^(---\r?\n)([\s\S]*?)(\r?\n---(?:\r?\n|$))/.exec(text);
  if (!frontmatter) throw new Error(`${rel}: missing frontmatter`);
  const pattern = /^version:([ \t]*)(["']?)([0-9][0-9A-Za-z.+-]*)\2([ \t]*(?:#[^\r\n]*)?)(\r?)$/gm;
  const versions = [...frontmatter[2].matchAll(pattern)];
  const versionKeys = [...frontmatter[2].matchAll(/^version[ \t]*:/gm)];
  if (versionKeys.length !== 1 || versions.length !== 1) {
    throw new Error(`${rel}: expected exactly one parseable top-level version field`);
  }
  const current = versions[0][3];
  if (current === pkg.version) continue;
  const header = frontmatter[2].replace(pattern, (_match, space, quote, _old, comment, cr) =>
    `version:${space}${quote}${pkg.version}${quote}${comment}${cr}`);
  const updated = frontmatter[1] + header + frontmatter[3] + text.slice(frontmatter[0].length);
  updates.push({ rel, fullPath, current, updated });
}

for (const { rel, fullPath, current, updated } of updates) {
  if (!check && !validate) writeFileSync(fullPath, updated, 'utf8');
  console.log(`  ${validate ? 'VALIDATE ' : check ? 'DRIFT ' : ''}${rel}: ${current} -> ${pkg.version}`);
}
if (check && updates.length) process.exitCode = 1;
if (updates.length === 0) console.log(`  plugin and skill versions already at ${pkg.version}`);
