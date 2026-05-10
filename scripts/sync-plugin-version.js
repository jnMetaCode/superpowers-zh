#!/usr/bin/env node
// 把 package.json 的 version 同步到 plugin manifest
// 由 npm version 钩子触发，跑在 version commit 创建之前
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const targets = [
  '.claude-plugin/plugin.json',
  '.cursor-plugin/plugin.json',
  '.codex-plugin/plugin.json',
];

let touched = 0;
for (const rel of targets) {
  const path = resolve(root, rel);
  const text = readFileSync(path, 'utf8');
  const json = JSON.parse(text);
  if (json.version === pkg.version) continue;
  // 只替换顶层 version 字段一行，保留原文件其他字段的格式（数组单行/多行、缩进等）
  const updated = text.replace(/("version":\s*")[^"]+(")/, `$1${pkg.version}$2`);
  if (updated === text) {
    throw new Error(`未能在 ${rel} 中定位 version 字段`);
  }
  writeFileSync(path, updated, 'utf8');
  console.log(`  ${rel}: ${json.version} -> ${pkg.version}`);
  touched++;
}
if (touched === 0) console.log(`  plugin manifests already at ${pkg.version}`);
