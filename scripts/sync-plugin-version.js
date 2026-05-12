#!/usr/bin/env node
// 把 package.json 的 version 同步到所有 plugin manifest（含嵌套字段）。
// 由 npm version 钩子触发，跑在 version commit 创建之前。
//
// 设计：用 regex 替换而不是 JSON.parse + stringify，目的是保留原文件格式
// （缩进、行内/多行数组、空白等不被破坏）。每种 field 路径对应一个专用 regex。
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));

// targets 字段对齐上游 .version-bump.json 格式（path + field 路径）。
// 顶层用 "version"，嵌套用 dot-path（如 "plugins.0.version"）。
const TARGETS = [
  { path: '.claude-plugin/plugin.json',      field: 'version' },
  { path: '.cursor-plugin/plugin.json',      field: 'version' },
  { path: '.codex-plugin/plugin.json',       field: 'version' },
  { path: '.claude-plugin/marketplace.json', field: 'plugins.0.version' },
  { path: 'gemini-extension.json',           field: 'version' },
];

function buildPattern(field) {
  if (field === 'version') {
    return /("version"\s*:\s*")[^"]+(")/;
  }
  if (field === 'plugins.0.version') {
    // 锚定到 "plugins": [ { ... 第一个对象内的 version 字段
    return /("plugins"\s*:\s*\[\s*\{[\s\S]*?"version"\s*:\s*")[^"]+(")/;
  }
  throw new Error(`Unsupported field path: ${field}`);
}

function readField(json, field) {
  if (field === 'version') return json.version;
  if (field === 'plugins.0.version') return json.plugins?.[0]?.version;
  throw new Error(`Unsupported field path: ${field}`);
}

let touched = 0;
for (const { path: rel, field } of TARGETS) {
  const fullPath = resolve(root, rel);
  const text = readFileSync(fullPath, 'utf8');
  const json = JSON.parse(text);
  const current = readField(json, field);
  if (current === pkg.version) continue;

  const pattern = buildPattern(field);
  const updated = text.replace(pattern, `$1${pkg.version}$2`);
  if (updated === text) {
    throw new Error(`未能在 ${rel} 中定位字段 ${field}`);
  }
  writeFileSync(fullPath, updated, 'utf8');
  console.log(`  ${rel} (${field}): ${current} -> ${pkg.version}`);
  touched++;
}
if (touched === 0) console.log(`  plugin manifests already at ${pkg.version}`);
