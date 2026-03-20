#!/usr/bin/env node

import { existsSync, mkdirSync, cpSync, readdirSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG = JSON.parse(readFileSync(resolve(__dirname, '..', 'package.json'), 'utf8'));
const SKILLS_SRC = resolve(__dirname, '..', 'skills');
const AGENTS_SRC = resolve(__dirname, '..', 'agents');
const PROJECT_DIR = process.cwd();

const TARGETS = [
  { name: 'Claude Code',   dir: '.claude/skills',           detect: '.claude' },
  { name: 'Cursor',        dir: '.cursor/skills',           detect: '.cursor' },
  { name: 'Codex CLI',     dir: '.codex/skills',            detect: '.codex' },
  { name: 'Kiro',          dir: '.kiro/steering',            detect: '.kiro' },
  { name: 'Trae',          dir: '.trae/rules',               detect: '.trae' },
  { name: 'Antigravity',   dir: '.antigravity/skills',       detect: '.antigravity' },
  { name: 'VS Code',       dir: '.github/superpowers',       detect: '.github/copilot-instructions.md' },
];

function countDirs(dir) {
  if (!existsSync(dir)) return 0;
  return readdirSync(dir, { withFileTypes: true }).filter(e => e.isDirectory()).length;
}

function showHelp() {
  console.log(`
  superpowers-zh v${PKG.version} — AI 编程超能力中文版

  用法：
    npx superpowers-zh          安装 skills（及 agents）到当前项目
    npx superpowers-zh --help   显示帮助
    npx superpowers-zh --version 显示版本

  说明：
    自动检测当前项目使用的 AI 编程工具：
    Claude Code / Cursor / Codex / Kiro / Trae / Antigravity / VS Code
    将 ${countDirs(SKILLS_SRC)} 个 skills 安装到对应目录。
    Claude Code 还会额外安装 agents 到 .claude/agents/。
    如果未检测到任何工具，默认安装到 .claude/skills/ 和 .claude/agents/。

  项目：https://github.com/jnMetaCode/superpowers-zh
`);
}

function install() {
 try {
  console.log(`\n  superpowers-zh v${PKG.version} — AI 编程超能力中文版\n`);

  if (!existsSync(SKILLS_SRC)) {
    console.error('  ❌ 错误：skills 源目录不存在，请重新安装 superpowers-zh。');
    process.exit(1);
  }

  console.log(`  源: ${countDirs(SKILLS_SRC)} 个 skills`);
  console.log(`  目标项目: ${PROJECT_DIR}\n`);

  let installed = 0;

  for (const target of TARGETS) {
    const detectPath = resolve(PROJECT_DIR, target.detect);
    const dest = resolve(PROJECT_DIR, target.dir);

    if (existsSync(detectPath)) {
      mkdirSync(dest, { recursive: true });
      cpSync(SKILLS_SRC, dest, { recursive: true });
      const count = countDirs(dest);
      console.log(`  ✅ ${target.name}: ${count} 个 skills -> ${dest}`);
      installed++;

      if (target.name === 'Claude Code' && existsSync(AGENTS_SRC)) {
        const agentsDest = resolve(PROJECT_DIR, '.claude', 'agents');
        mkdirSync(agentsDest, { recursive: true });
        cpSync(AGENTS_SRC, agentsDest, { recursive: true });
      }
    }
  }

  if (installed === 0) {
    const dest = resolve(PROJECT_DIR, '.claude', 'skills');
    mkdirSync(dest, { recursive: true });
    cpSync(SKILLS_SRC, dest, { recursive: true });
    console.log(`  ✅ 默认安装: ${countDirs(dest)} 个 skills -> ${dest}`);

    if (existsSync(AGENTS_SRC)) {
      const agentsDest = resolve(PROJECT_DIR, '.claude', 'agents');
      mkdirSync(agentsDest, { recursive: true });
      cpSync(AGENTS_SRC, agentsDest, { recursive: true });
      console.log(`  ✅ 默认安装: agents -> ${agentsDest}`);
    }
  }

  console.log('\n  安装完成！重启你的 AI 编程工具即可生效。\n');
 } catch (err) {
    console.error(`  ❌ 安装失败：${err.message}`);
    process.exit(1);
 }
}

const arg = process.argv[2];
if (arg === '--help' || arg === '-h') {
  showHelp();
} else if (arg === '--version' || arg === '-v') {
  console.log(PKG.version);
} else if (arg && arg.startsWith('-')) {
  console.warn(`  未知参数: ${arg}\n`);
  showHelp();
  process.exit(1);
} else {
  install();
}
