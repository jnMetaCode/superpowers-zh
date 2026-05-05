#!/usr/bin/env node

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, copyFileSync, lstatSync, realpathSync, rmSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';

// 手动递归复制：跨 Node 版本和操作系统行为一致
// 不使用 cpSync —— 在 Windows + npx 缓存（含 junction）+ Node 16.7-18 下不稳定
function copyDirSync(src, dest) {
  // 解析 junction/symlink，避免 Windows npx 缓存路径下 readdir 返回空
  let realSrc = src;
  try { realSrc = realpathSync(src); } catch {}

  mkdirSync(dest, { recursive: true });
  const entries = readdirSync(realSrc, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === '.DS_Store') continue;
    const srcPath = join(realSrc, entry.name);
    const destPath = join(dest, entry.name);
    let stat;
    try { stat = lstatSync(srcPath); } catch { continue; }
    if (stat.isSymbolicLink()) {
      // 取消引用后按实际类型处理
      try {
        const real = realpathSync(srcPath);
        const realStat = lstatSync(real);
        if (realStat.isDirectory()) copyDirSync(real, destPath);
        else copyFileSync(real, destPath);
      } catch {}
    } else if (stat.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else if (stat.isFile()) {
      copyFileSync(srcPath, destPath);
    }
  }
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG = JSON.parse(readFileSync(resolve(__dirname, '..', 'package.json'), 'utf8'));
const SKILLS_SRC = resolve(__dirname, '..', 'skills');
const AGENTS_SRC = resolve(__dirname, '..', 'agents');
const PROJECT_DIR = process.cwd();

const TARGETS = [
  { name: 'Claude Code',   dir: '.claude/skills',           detect: '.claude' },
  { name: 'Cursor',        dir: '.cursor/skills',           detect: ['.cursor', '.cursorrules'] },
  { name: 'Codex CLI',     dir: '.codex/skills',            detect: '.codex' },
  { name: 'Kiro',          dir: '.kiro/steering',            detect: '.kiro' },
  { name: 'DeerFlow',      dir: 'skills/custom',             detect: 'deer_flow' },
  { name: 'Trae',          dir: '.trae/skills',              detect: '.trae' },
  { name: 'Antigravity',   dir: '.antigravity/skills',       detect: '.antigravity' },
  { name: 'VS Code',       dir: '.github/superpowers',       detect: '.github/copilot-instructions.md' },
  { name: 'OpenClaw',      dir: 'skills',                     detect: '.openclaw' },
  { name: 'Windsurf',      dir: '.windsurf/skills',          detect: '.windsurf' },
  { name: 'Gemini CLI',    dir: '.gemini/skills',            detect: 'GEMINI.md' },
  { name: 'Aider',         dir: '.aider/skills',             detect: '.aider' },
  { name: 'OpenCode',      dir: '.opencode/skills',          detect: '.opencode' },
  { name: 'Qwen Code',     dir: '.qwen/skills',             detect: '.qwen' },
  { name: 'Hermes Agent',  dir: '.hermes/skills',            detect: ['.hermes', 'HERMES.md', '.hermes.md'] },
  { name: 'Claw Code',     dir: '.claw/skills',              detect: ['.claw', 'CLAW.md'] },
];

function countDirs(dir) {
  if (!existsSync(dir)) return 0;
  return readdirSync(dir, { withFileTypes: true }).filter(e => e.isDirectory()).length;
}

function scanSkillEntries(skillsDir) {
  const entries = [];
  if (!existsSync(skillsDir)) return entries;
  for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillFile = resolve(skillsDir, entry.name, 'SKILL.md');
    if (!existsSync(skillFile)) continue;
    const content = readFileSync(skillFile, 'utf8');
    const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
    if (!fmMatch) continue;
    const nameMatch = fmMatch[1].match(/^name:\s*(.+)$/m);
    const descMatch = fmMatch[1].match(/^description:\s*["']?(.+?)["']?\s*$/m);
    if (nameMatch) {
      entries.push({
        name: nameMatch[1].trim(),
        desc: descMatch ? descMatch[1].trim() : '',
      });
    }
  }
  return entries;
}

// 段落哨兵：v1.2.1+ 安装时把追加内容包在两条 HTML 注释之间，
// 让卸载可以精确切除，无需依赖标题层级猜测段尾。
const SENTINEL_BEGIN = '<!-- superpowers-zh:begin (do not edit between these markers) -->';
const SENTINEL_END = '<!-- superpowers-zh:end -->';

function wrapWithSentinel(body) {
  return `${SENTINEL_BEGIN}\n${body.replace(/\n+$/, '')}\n${SENTINEL_END}\n`;
}

function generateTraeBootstrapRule(projectDir) {
  const rulesDir = resolve(projectDir, '.trae', 'rules');
  mkdirSync(rulesDir, { recursive: true });

  const skillEntries = scanSkillEntries(SKILLS_SRC);
  const skillTable = skillEntries.map(s => `| ${s.name} | ${s.desc} |`).join('\n');

  const rule = `---
alwaysApply: true
---

# Superpowers-ZH 中文增强版

你已加载 superpowers-zh 技能框架（${skillEntries.length} 个 skills）。

## 核心规则

1. **收到任务时，先检查是否有匹配的 skill** — 哪怕只有 1% 的可能性也要检查
2. **设计先于编码** — 收到功能需求时，先用 brainstorming skill 做需求分析
3. **测试先于实现** — 写代码前先写测试（TDD）
4. **验证先于完成** — 声称完成前必须运行验证命令

## 可用 Skills

Skills 位于 \`.trae/skills/\` 目录，每个 skill 有独立的 \`SKILL.md\` 文件。

| Skill | 触发条件 |
|-------|---------|
${skillTable}

## 如何使用

当任务匹配某个 skill 的触发条件时，读取对应的 \`.trae/skills/<skill-name>/SKILL.md\` 并严格遵循其流程。
`;

  const rulePath = resolve(rulesDir, 'superpowers-zh.md');
  writeFileSync(rulePath, rule, 'utf8');
  console.log(`  ✅ Trae: bootstrap rule -> ${rulePath}`);
}

function generateAntigravityBootstrap(projectDir) {
  const skillEntries = scanSkillEntries(SKILLS_SRC);
  const skillList = skillEntries.map(s => `- **${s.name}**: ${s.desc}`).join('\n');

  const content = `# Superpowers-ZH 中文增强版

本项目已安装 superpowers-zh 技能框架（${skillEntries.length} 个 skills）。

## 核心规则

1. **收到任务时，先检查是否有匹配的 skill** — 哪怕只有 1% 的可能性也要检查
2. **设计先于编码** — 收到功能需求时，先用 brainstorming skill 做需求分析
3. **测试先于实现** — 写代码前先写测试（TDD）
4. **验证先于完成** — 声称完成前必须运行验证命令

## 可用 Skills

Skills 位于 \`.antigravity/skills/\` 目录，每个 skill 有独立的 \`SKILL.md\` 文件。

${skillList}

## 如何使用

当任务匹配某个 skill 时，读取对应的 \`.antigravity/skills/<skill-name>/SKILL.md\` 并严格遵循其流程。
`;

  // 写入 .antigravity/rules.md（不覆盖用户已有的 GEMINI.md / AGENTS.md）
  const rulePath = resolve(projectDir, '.antigravity', 'rules.md');
  writeFileSync(rulePath, content, 'utf8');
  console.log(`  ✅ Antigravity: bootstrap rule -> ${rulePath}`);
}

function generateAiderBootstrap(projectDir) {
  const skillEntries = scanSkillEntries(SKILLS_SRC);
  const skillList = skillEntries.map(s => `- **${s.name}**: ${s.desc}`).join('\n');

  const content = `# Superpowers-ZH 工作方法论

本项目使用 superpowers-zh 技能框架（${skillEntries.length} 个 skills）。

## 核心规则

1. **收到任务时，先检查是否有匹配的 skill** — 哪怕只有 1% 的可能性也要检查
2. **设计先于编码** — 收到功能需求时，先用 brainstorming skill 做需求分析
3. **测试先于实现** — 写代码前先写测试（TDD）
4. **验证先于完成** — 声称完成前必须运行验证命令

## 可用 Skills

Skills 位于 \`.aider/skills/\` 目录，每个 skill 有独立的 \`SKILL.md\` 文件。

${skillList}

## 如何使用

当任务匹配某个 skill 时，读取对应的 \`.aider/skills/<skill-name>/SKILL.md\` 并严格遵循其流程。
`;

  // 写入 CONVENTIONS.md（Aider 原生支持自动加载此文件）
  // 如果已有 CONVENTIONS.md，追加而不覆盖
  const convPath = resolve(projectDir, 'CONVENTIONS.md');
  if (existsSync(convPath)) {
    const existing = readFileSync(convPath, 'utf8');
    if (!existing.includes('superpowers-zh')) {
      writeFileSync(convPath, existing.replace(/\s+$/, '') + '\n\n' + wrapWithSentinel(content), 'utf8');
      console.log(`  ✅ Aider: 追加 skills 引用 -> ${convPath}`);
    } else {
      console.log(`  ✅ Aider: CONVENTIONS.md 已包含 superpowers-zh 引用`);
    }
  } else {
    writeFileSync(convPath, wrapWithSentinel(content), 'utf8');
    console.log(`  ✅ Aider: bootstrap -> ${convPath}`);
  }
}

function generateGeminiBootstrap(projectDir) {
  const skillEntries = scanSkillEntries(SKILLS_SRC);
  const skillList = skillEntries.map(s => `- **${s.name}**: ${s.desc}`).join('\n');

  const content = `# Superpowers-ZH 中文增强版

本项目已安装 superpowers-zh 技能框架（${skillEntries.length} 个 skills）。

## 核心规则

1. **收到任务时，先检查是否有匹配的 skill** — 哪怕只有 1% 的可能性也要检查
2. **设计先于编码** — 收到功能需求时，先用 brainstorming skill 做需求分析
3. **测试先于实现** — 写代码前先写测试（TDD）
4. **验证先于完成** — 声称完成前必须运行验证命令

## 可用 Skills

Skills 位于 \`.gemini/skills/\` 目录，每个 skill 有独立的 \`SKILL.md\` 文件。

${skillList}

## 如何使用

当任务匹配某个 skill 时，读取对应的 \`.gemini/skills/<skill-name>/SKILL.md\` 并严格遵循其流程。
`;

  // 写入 GEMINI.md（如果已存在则追加）
  const geminiPath = resolve(projectDir, 'GEMINI.md');
  if (existsSync(geminiPath)) {
    const existing = readFileSync(geminiPath, 'utf8');
    if (!existing.includes('superpowers-zh')) {
      writeFileSync(geminiPath, existing.replace(/\s+$/, '') + '\n\n' + wrapWithSentinel(content), 'utf8');
      console.log(`  ✅ Gemini CLI: 追加 skills 引用 -> ${geminiPath}`);
    } else {
      console.log(`  ✅ Gemini CLI: GEMINI.md 已包含 superpowers-zh 引用`);
    }
  } else {
    writeFileSync(geminiPath, wrapWithSentinel(content), 'utf8');
    console.log(`  ✅ Gemini CLI: bootstrap -> ${geminiPath}`);
  }
}

function generateHermesBootstrap(projectDir) {
  const skillEntries = scanSkillEntries(SKILLS_SRC);
  const skillList = skillEntries.map(s => `- **${s.name}**: ${s.desc}`).join('\n');

  const content = `# Superpowers-ZH 中文增强版

本项目已安装 superpowers-zh 技能框架（${skillEntries.length} 个 skills）。

## 核心规则

1. **收到任务时，先检查是否有匹配的 skill** — 哪怕只有 1% 的可能性也要检查
2. **设计先于编码** — 收到功能需求时，先用 brainstorming skill 做需求分析
3. **测试先于实现** — 写代码前先写测试（TDD）
4. **验证先于完成** — 声称完成前必须运行验证命令

## 工具映射

技能中引用的 Claude Code 工具名称对应 Hermes Agent 的等价工具：
- \`Read\` → \`read_file\`
- \`Write\` → \`write_file\`
- \`Edit\` → \`patch\`
- \`Bash\` → \`terminal\`
- \`Grep\` / \`Glob\` → \`search_files\`
- \`Skill\` → \`skill_view\`
- \`Task\`（子智能体） → \`delegate_task\`
- \`WebSearch\` → \`web_search\`
- \`WebFetch\` → \`web_extract\`
- \`TodoWrite\` → \`todo\`

## 可用 Skills

Skills 位于 \`.hermes/skills/\` 目录，每个 skill 有独立的 \`SKILL.md\` 文件。

${skillList}

## 如何使用

当任务匹配某个 skill 时，使用 \`skill_view\` 加载对应 skill 并严格遵循其流程。
`;

  // 写入 HERMES.md（如果已存在则追加）
  const hermesPath = resolve(projectDir, 'HERMES.md');
  if (existsSync(hermesPath)) {
    const existing = readFileSync(hermesPath, 'utf8');
    if (!existing.includes('superpowers-zh')) {
      writeFileSync(hermesPath, existing.replace(/\s+$/, '') + '\n\n' + wrapWithSentinel(content), 'utf8');
      console.log(`  ✅ Hermes Agent: 追加 skills 引用 -> ${hermesPath}`);
    } else {
      console.log(`  ✅ Hermes Agent: HERMES.md 已包含 superpowers-zh 引用`);
    }
  } else {
    writeFileSync(hermesPath, wrapWithSentinel(content), 'utf8');
    console.log(`  ✅ Hermes Agent: bootstrap -> ${hermesPath}`);
  }
}

function generateClaudeCodeBootstrap(projectDir) {
  const skillEntries = scanSkillEntries(SKILLS_SRC);
  const skillList = skillEntries.map(s => `- **${s.name}**: ${s.desc}`).join('\n');

  const content = `# Superpowers-ZH 中文增强版

本项目已安装 superpowers-zh 技能框架（${skillEntries.length} 个 skills）。

## 核心规则

1. **收到任务时，先检查是否有匹配的 skill** — 哪怕只有 1% 的可能性也要检查
2. **设计先于编码** — 收到功能需求时，先用 brainstorming skill 做需求分析
3. **测试先于实现** — 写代码前先写测试（TDD）
4. **验证先于完成** — 声称完成前必须运行验证命令

## 可用 Skills

Skills 位于 \`.claude/skills/\` 目录，每个 skill 有独立的 \`SKILL.md\` 文件。

${skillList}

## 如何使用

当任务匹配某个 skill 时，使用 \`Skill\` 工具加载对应 skill 并严格遵循其流程。绝不要用 Read 工具读取 SKILL.md 文件。

如果你认为哪怕只有 1% 的可能性某个 skill 适用于你正在做的事情，你必须调用该 skill 检查。
`;

  const mdPath = resolve(projectDir, 'CLAUDE.md');
  if (existsSync(mdPath)) {
    const existing = readFileSync(mdPath, 'utf8');
    if (!existing.includes('superpowers-zh')) {
      writeFileSync(mdPath, existing.replace(/\s+$/, '') + '\n\n' + wrapWithSentinel(content), 'utf8');
      console.log(`  ✅ Claude Code: 追加 skills 引用 -> ${mdPath}`);
    } else {
      console.log(`  ✅ Claude Code: CLAUDE.md 已包含 superpowers-zh 引用`);
    }
  } else {
    writeFileSync(mdPath, wrapWithSentinel(content), 'utf8');
    console.log(`  ✅ Claude Code: bootstrap -> ${mdPath}`);
  }
}

// 工具名称别名映射（用户输入 -> TARGETS.name）
const TOOL_ALIASES = {
  'claude':       'Claude Code',
  'claude-code':  'Claude Code',
  'claudecode':   'Claude Code',
  'copilot':      'Claude Code',
  'copilot-cli':  'Claude Code',
  'cursor':       'Cursor',
  'codex':        'Codex CLI',
  'kiro':         'Kiro',
  'deerflow':     'DeerFlow',
  'trae':         'Trae',
  'antigravity':  'Antigravity',
  'vscode':       'VS Code',
  'vs-code':      'VS Code',
  'openclaw':     'OpenClaw',
  'windsurf':     'Windsurf',
  'gemini':       'Gemini CLI',
  'gemini-cli':   'Gemini CLI',
  'aider':        'Aider',
  'opencode':     'OpenCode',
  'qwen':         'Qwen Code',
  'qwen-code':    'Qwen Code',
  'hermes':       'Hermes Agent',
  'hermes-agent': 'Hermes Agent',
  'claw':         'Claw Code',
  'claw-code':    'Claw Code',
  'clawcode':     'Claw Code',
};

function showHelp() {
  const toolNames = [...new Set(Object.values(TOOL_ALIASES))];
  console.log(`
  superpowers-zh v${PKG.version} — AI 编程超能力中文版

  用法：
    npx superpowers-zh                   自动检测工具并安装
    npx superpowers-zh --tool cursor     指定工具安装（检测不到时使用）
    npx superpowers-zh --uninstall       卸载当前目录下的 superpowers-zh
    npx superpowers-zh --force           允许在用户主目录(~)安装（默认拒绝）
    npx superpowers-zh --help            显示帮助
    npx superpowers-zh --version         显示版本

  支持的工具名：
    ${Object.keys(TOOL_ALIASES).join(', ')}

  说明：
    自动检测当前项目使用的 AI 编程工具，将 ${countDirs(SKILLS_SRC)} 个 skills 安装到对应目录。
    如果自动检测不到，请用 --tool 指定你的工具，例如：
      npx superpowers-zh --tool cursor
      npx superpowers-zh --tool trae

    误装到主目录可以这样清理：
      cd ~ && npx superpowers-zh --uninstall

  项目：https://github.com/jnMetaCode/superpowers-zh
`);
}

function installForTarget(target) {
  const dest = resolve(PROJECT_DIR, target.dir);
  const srcCount = countDirs(SKILLS_SRC);
  mkdirSync(dest, { recursive: true });
  copyDirSync(SKILLS_SRC, dest);
  const totalAfter = countDirs(dest);
  if (srcCount > 0 && totalAfter === 0) {
    throw new Error(
      `复制 skills 失败：源目录 ${SKILLS_SRC} 有 ${srcCount} 个 skill，但目标 ${dest} 为空。` +
      `\n  这通常是 npx 缓存目录权限或路径问题。请尝试：\n` +
      `    1. 清理缓存后重试: npm cache clean --force && npx superpowers-zh\n` +
      `    2. 或全局安装: npm i -g superpowers-zh && superpowers-zh\n` +
      `    3. 或手动克隆复制: 见 https://github.com/jnMetaCode/superpowers-zh#方式二手动安装`
    );
  }
  console.log(`  ✅ ${target.name}: ${srcCount} 个 skills -> ${dest}`);

  if (target.name === 'Trae') {
    generateTraeBootstrapRule(PROJECT_DIR);
  }

  if (target.name === 'Antigravity') {
    generateAntigravityBootstrap(PROJECT_DIR);
  }

  if (target.name === 'Aider') {
    generateAiderBootstrap(PROJECT_DIR);
  }

  if (target.name === 'Gemini CLI') {
    generateGeminiBootstrap(PROJECT_DIR);
  }

  if (target.name === 'Hermes Agent') {
    generateHermesBootstrap(PROJECT_DIR);
  }

  if (target.name === 'Claude Code') {
    generateClaudeCodeBootstrap(PROJECT_DIR);
    if (existsSync(AGENTS_SRC)) {
      const agentsDest = resolve(PROJECT_DIR, '.claude', 'agents');
      mkdirSync(agentsDest, { recursive: true });
      copyDirSync(AGENTS_SRC, agentsDest);
    }
  }
}

function isHomeDir(p) {
  const home = homedir();
  if (!home) return false;
  try {
    return realpathSync(p) === realpathSync(home);
  } catch { return resolve(p) === resolve(home); }
}

// 卸载支持：完整删除的 bootstrap 文件、需要清理段落的 bootstrap 文件
const BOOTSTRAP_DELETE = [
  '.trae/rules/superpowers-zh.md',
  '.antigravity/rules.md',
];
const BOOTSTRAP_CLEAN_SECTION = [
  'CLAUDE.md',
  'GEMINI.md',
  'HERMES.md',
  'CONVENTIONS.md',
];
const BOOTSTRAP_SECTION_MARKERS = [
  '# Superpowers-ZH 中文增强版',
  '# Superpowers-ZH 工作方法论',
];

// v1.1.x 安装的旧 bootstrap 没有 sentinel，只能凭模板末尾固定句子识别段尾。
// 这些短语必须出现在 superpowers 段最后一行，且足够独特不易在用户内容里重合。
const FALLBACK_TAIL_HINTS = [
  '你必须调用该 skill 检查。',
  '严格遵循其流程。',
];

function writeOrDelete(filePath, head, tail) {
  const headTrim = head.replace(/\s+$/, '');
  const tailTrim = tail.replace(/^\s+/, '');
  let body = headTrim;
  if (headTrim && tailTrim) body += '\n\n' + tailTrim;
  else body += tailTrim;
  body = body.replace(/\s+$/, '');
  if (body.length === 0) {
    rmSync(filePath);
  } else {
    writeFileSync(filePath, body + '\n', 'utf8');
  }
}

function cleanBootstrapSection(filePath) {
  if (!existsSync(filePath)) return false;
  const content = readFileSync(filePath, 'utf8');

  // 1. 哨兵模式（v1.2.1+）— 精确切除
  const sBegin = content.indexOf(SENTINEL_BEGIN);
  if (sBegin !== -1) {
    const sEnd = content.indexOf(SENTINEL_END, sBegin + SENTINEL_BEGIN.length);
    if (sEnd !== -1) {
      writeOrDelete(filePath, content.slice(0, sBegin), content.slice(sEnd + SENTINEL_END.length));
      return true;
    }
  }

  // 2. 标题 marker（v1.1.x 安装的）— 找下一个 \n# 一级标题做段尾
  let idx = -1;
  for (const marker of BOOTSTRAP_SECTION_MARKERS) {
    const i = content.indexOf(marker);
    if (i !== -1 && (idx === -1 || i < idx)) idx = i;
  }
  if (idx === -1) return false;

  let end = -1;
  const nextHeading = content.indexOf('\n# ', idx + 1);
  if (nextHeading !== -1) end = nextHeading + 1;

  // 3. 一级标题找不到 — 用末尾固定短语做兜底
  if (end === -1) {
    for (const hint of FALLBACK_TAIL_HINTS) {
      const i = content.lastIndexOf(hint);
      if (i > idx) {
        const nl = content.indexOf('\n', i + hint.length);
        const after = nl !== -1 ? nl + 1 : content.length;
        if (after > end) end = after;
      }
    }
  }

  // 4. 都找不到 — 数据安全，跳过 + 警告
  if (end === -1) {
    console.warn(`  ⚠️  ${filePath}: 无法可靠识别 superpowers-zh 段尾，已跳过以避免数据丢失。`);
    console.warn(`     请手动编辑此文件并删除以 "${BOOTSTRAP_SECTION_MARKERS[0]}" 开头的整段。`);
    return false;
  }

  writeOrDelete(filePath, content.slice(0, idx), content.slice(end));
  return true;
}

function uninstallForTarget(target, srcSkillNames) {
  const dest = resolve(PROJECT_DIR, target.dir);
  if (!existsSync(dest)) return 0;
  let removed = 0;
  for (const entry of readdirSync(dest, { withFileTypes: true })) {
    if (entry.isDirectory() && srcSkillNames.has(entry.name)) {
      rmSync(resolve(dest, entry.name), { recursive: true, force: true });
      removed++;
    }
  }
  // 如果目录已空（或仅剩 .DS_Store），顺手清掉，避免留下空骨架
  try {
    if (existsSync(dest)) {
      const left = readdirSync(dest).filter(n => n !== '.DS_Store');
      if (left.length === 0) rmSync(dest, { recursive: true, force: true });
    }
  } catch {}
  return removed;
}

function uninstall() {
  console.log(`\n  superpowers-zh v${PKG.version} — 卸载\n`);
  console.log(`  目标项目: ${PROJECT_DIR}\n`);

  if (!existsSync(SKILLS_SRC)) {
    console.error('  ❌ 错误：skills 源目录不存在，无法识别要卸载的 skill 名单。');
    process.exit(1);
  }

  const srcSkillNames = new Set(
    readdirSync(SKILLS_SRC, { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(e => e.name)
  );

  let totalSkills = 0;
  for (const target of TARGETS) {
    const removed = uninstallForTarget(target, srcSkillNames);
    if (removed > 0) {
      console.log(`  ✅ ${target.name}: 移除 ${removed} 个 skills <- ${resolve(PROJECT_DIR, target.dir)}`);
      totalSkills += removed;
    }
  }

  // 顺带清理 .claude/agents 下我们装过的 agent（agents 源是平铺的文件，例如 code-reviewer.md）
  const agentsDest = resolve(PROJECT_DIR, '.claude', 'agents');
  if (existsSync(AGENTS_SRC) && existsSync(agentsDest)) {
    const srcAgentNames = new Set(readdirSync(AGENTS_SRC).filter(n => n !== '.DS_Store'));
    let agentsRemoved = 0;
    for (const entry of readdirSync(agentsDest)) {
      if (srcAgentNames.has(entry)) {
        rmSync(resolve(agentsDest, entry), { recursive: true, force: true });
        agentsRemoved++;
      }
    }
    if (agentsRemoved > 0) console.log(`  ✅ Claude Code agents: 移除 ${agentsRemoved} 个 -> ${agentsDest}`);
    try {
      const left = readdirSync(agentsDest).filter(n => n !== '.DS_Store');
      if (left.length === 0) rmSync(agentsDest, { recursive: true, force: true });
    } catch {}
  }

  let bootstrapsRemoved = 0;
  for (const rel of BOOTSTRAP_DELETE) {
    const full = resolve(PROJECT_DIR, rel);
    if (existsSync(full)) {
      rmSync(full);
      console.log(`  ✅ 删除 bootstrap: ${full}`);
      bootstrapsRemoved++;
    }
  }
  for (const rel of BOOTSTRAP_CLEAN_SECTION) {
    const full = resolve(PROJECT_DIR, rel);
    if (cleanBootstrapSection(full)) {
      console.log(`  ✅ 清理 bootstrap: ${full}`);
      bootstrapsRemoved++;
    }
  }

  if (totalSkills === 0 && bootstrapsRemoved === 0) {
    console.log('  ⚠️  未在当前目录找到 superpowers-zh 安装痕迹。');
  } else {
    console.log(`\n  卸载完成。共移除 ${totalSkills} 个 skill 目录、${bootstrapsRemoved} 个 bootstrap 文件。\n`);
  }
}

function install(forceToolName, force) {
 try {
  console.log(`\n  superpowers-zh v${PKG.version} — AI 编程超能力中文版\n`);

  if (!existsSync(SKILLS_SRC)) {
    console.error('  ❌ 错误：skills 源目录不存在，请重新安装 superpowers-zh。');
    process.exit(1);
  }

  if (!force && isHomeDir(PROJECT_DIR)) {
    console.error(
`  ⚠️  当前目录是用户主目录: ${PROJECT_DIR}

  superpowers-zh 应该装到具体项目目录，而不是 ~/。
  在主目录安装会把 skills 和 bootstrap 文件（CLAUDE.md / HERMES.md 等）
  写入你的 home，污染所有项目。

  请先 cd 到项目目录：
    cd /path/to/your/project
    npx superpowers-zh

  如果你确实要在主目录安装（不推荐），加 --force：
    npx superpowers-zh --force

  如果你已经在主目录误装过，可以用 --uninstall 清理：
    npx superpowers-zh --uninstall
`);
    process.exit(1);
  }

  console.log(`  源: ${countDirs(SKILLS_SRC)} 个 skills`);
  console.log(`  目标项目: ${PROJECT_DIR}\n`);

  // --tool 指定安装
  if (forceToolName) {
    const target = TARGETS.find(t => t.name === forceToolName);
    if (!target) {
      console.error(`  ❌ 未知工具: ${forceToolName}`);
      process.exit(1);
    }
    installForTarget(target);
    console.log('\n  安装完成！重启你的 AI 编程工具即可生效。\n');
    return;
  }

  // 自动检测
  let installed = 0;

  for (const target of TARGETS) {
    const detects = Array.isArray(target.detect) ? target.detect : [target.detect];
    const found = detects.some(d => existsSync(resolve(PROJECT_DIR, d)));
    if (found) {
      installForTarget(target);
      installed++;
    }
  }

  if (installed === 0) {
    console.log('  ⚠️  未检测到任何已知的 AI 编程工具。\n');
    console.log('  如果你使用的是 Cursor、Trae 等工具，请用 --tool 指定：');
    console.log('    npx superpowers-zh --tool cursor');
    console.log('    npx superpowers-zh --tool trae\n');
    console.log('  现在将默认安装到 .claude/skills/（兼容 Claude Code / OpenClaw）\n');

    const dest = resolve(PROJECT_DIR, '.claude', 'skills');
    mkdirSync(dest, { recursive: true });
    copyDirSync(SKILLS_SRC, dest);
    console.log(`  ✅ 默认安装: ${countDirs(dest)} 个 skills -> ${dest}`);

    generateClaudeCodeBootstrap(PROJECT_DIR);

    if (existsSync(AGENTS_SRC)) {
      const agentsDest = resolve(PROJECT_DIR, '.claude', 'agents');
      mkdirSync(agentsDest, { recursive: true });
      copyDirSync(AGENTS_SRC, agentsDest);
      console.log(`  ✅ 默认安装: agents -> ${agentsDest}`);
    }
  }

  console.log('\n  安装完成！重启你的 AI 编程工具即可生效。\n');
 } catch (err) {
    console.error(`  ❌ 安装失败：${err.message}`);
    process.exit(1);
 }
}

const args = process.argv.slice(2);
const helpIdx = args.findIndex(a => a === '--help' || a === '-h');
const versionIdx = args.findIndex(a => a === '--version' || a === '-v');
const toolIdx = args.findIndex(a => a === '--tool' || a === '-t');
const uninstallIdx = args.findIndex(a => a === '--uninstall' || a === '-u');
const forceIdx = args.findIndex(a => a === '--force' || a === '-f');
const force = forceIdx !== -1;

if (helpIdx !== -1) {
  showHelp();
} else if (versionIdx !== -1) {
  console.log(PKG.version);
} else if (uninstallIdx !== -1) {
  uninstall();
} else if (toolIdx !== -1) {
  const toolArg = args[toolIdx + 1];
  if (!toolArg) {
    console.error('  ❌ --tool 需要指定工具名，例如: --tool cursor\n');
    showHelp();
    process.exit(1);
  }
  const toolName = TOOL_ALIASES[toolArg.toLowerCase()];
  if (!toolName) {
    console.error(`  ❌ 未知工具: ${toolArg}`);
    console.error(`  支持的工具: ${Object.keys(TOOL_ALIASES).join(', ')}\n`);
    process.exit(1);
  }
  install(toolName, force);
} else if (args.length > 0 && args[0].startsWith('-') && forceIdx === -1) {
  console.warn(`  未知参数: ${args[0]}\n`);
  showHelp();
  process.exit(1);
} else {
  install(undefined, force);
}
