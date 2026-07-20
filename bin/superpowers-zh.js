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
const PROJECT_DIR = process.cwd();

// 历史遗留 agent 文件名 — 用于 --uninstall 清理已装用户机器上的残留。
// 上游 v5.1.0 把 agents/code-reviewer.md 上升进 requesting-code-review skill，
// agents/ 目录已删，但旧版本装过的用户机器上仍有残留文件需要清理。
const LEGACY_AGENT_FILENAMES = ['code-reviewer.md'];

// 每个工具：项目级 dir（相对 cwd）+ 可选 global 配置。
// global 存在 = 该工具有稳定的「用户级 skills 目录」，可全局安装（所有项目共享）：
//   global.dir     用户级 skills 目录（相对 home）
//   global.detect  home 下用于自动检测该工具是否安装的标记目录
//   global.boot    可选，用户级 bootstrap 文件（相对 home）；无则仅靠 skill 自动发现
// 无 global 的工具（Cursor/Kiro/Trae/Aider/DeerFlow/VS Code/Hermes/Claw）规则是项目级、
// 或存在于应用内设置，没有稳定的用户级 skills 加载路径 —— --global 会明确拒绝而非写无效路径。
const TARGETS = [
  { name: 'Claude Code',   dir: '.claude/skills',           detect: '.claude',                        global: { dir: '.claude/skills',         detect: '.claude',         boot: '.claude/CLAUDE.md' } },
  { name: 'Cursor',        dir: '.cursor/skills',           detect: ['.cursor', '.cursorrules'] },
  // Codex 全局：docs 确认 Codex 启动时扫描 ~/.agents/skills/（不是 ~/.codex/skills），
  // 直接把每个 skill 复制到 ~/.agents/skills/<skill>/ 正好命中它的扁平扫描。
  { name: 'Codex CLI',     dir: '.codex/skills',            detect: '.codex',                         global: { dir: '.agents/skills',         detect: '.codex' } },
  { name: 'Kiro',          dir: '.kiro/steering',            detect: '.kiro' },
  { name: 'DeerFlow',      dir: 'skills/custom',             detect: 'deer_flow' },
  { name: 'Trae',          dir: '.trae/skills',              detect: '.trae' },
  // Antigravity 无 global：其全局 skills 加载路径未在 docs 证实（全局规则走 ~/.gemini/GEMINI.md），
  // 不确认能生效就不写，避免「装了不生效」。用户用项目级安装。
  { name: 'Antigravity',   dir: '.agents/skills',            detect: '.agents' },
  { name: 'VS Code',       dir: '.github/superpowers',       detect: '.github/copilot-instructions.md' },
  { name: 'OpenClaw',      dir: 'skills',                     detect: '.openclaw',                     global: { dir: '.openclaw/skills',       detect: '.openclaw' } },
  { name: 'Windsurf',      dir: '.windsurf/skills',          detect: '.windsurf',                      global: { dir: '.windsurf/skills',       detect: '.windsurf' } },
  // Gemini 无 global：其全局加载是「扩展目录」~/.gemini/extensions/*/skills/ + gemini-extension.json，
  // 不是简单复制到 ~/.gemini/skills，通用 --global 覆盖不了。见 docs/README.gemini-cli.md。
  { name: 'Gemini CLI',    dir: '.gemini/skills',            detect: 'GEMINI.md' },
  { name: 'Aider',         dir: '.aider/skills',             detect: '.aider' },
  { name: 'OpenCode',      dir: '.opencode/skills',          detect: '.opencode',                      global: { dir: '.config/opencode/skills', detect: '.config/opencode' } },
  { name: 'Qwen Code',     dir: '.qwen/skills',             detect: '.qwen',                           global: { dir: '.qwen/skills',           detect: '.qwen' } },
  { name: 'Hermes Agent',  dir: '.hermes/skills',            detect: ['.hermes', 'HERMES.md', '.hermes.md'] },
  { name: 'Claw Code',     dir: '.claw/skills',              detect: ['.claw', 'CLAW.md'] },
  { name: 'Qoder',         dir: '.qoder/skills',             detect: '.qoder',                         global: { dir: '.qoder/skills',          detect: '.qoder' } },
  { name: 'Qoder CN',      dir: '.qoder-cn/skills',          detect: '.qoder-cn',                      global: { dir: '.qoder-cn/skills',       detect: '.qoder-cn' } },
  { name: 'CodeBuddy',     dir: '.codebuddy/skills',         detect: ['.codebuddy', 'CODEBUDDY.md'] },
  // 华为云码道（CodeArts Doer）：skills 放 .codeartsdoer/skills/（用户在 #20 确认）。
  // 仅 skills-only —— 其 bootstrap/指令文件约定未证实，靠 CodeArts 自身 skill 发现；
  // 若不自动触发需在对话里手动点名 skill（docs 已说明）。
  { name: 'CodeArts',      dir: '.codeartsdoer/skills',      detect: '.codeartsdoer' },
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

function generateQoderBootstrap(baseDir, isGlobal, targetName) {
  // 仅向触发安装的变体写入，避免为未使用的变体创建空骨架目录
  const variant = targetName === 'Qoder CN' ? '.qoder-cn' : '.qoder';
  const skillEntries = scanSkillEntries(SKILLS_SRC);
  const skillTable = skillEntries.map(s => `| ${s.name} | ${s.desc} |`).join('\n');

  // 对全局安装，baseDir 已为 homedir()
  const rulesDir = resolve(baseDir, variant, 'rules');
  mkdirSync(rulesDir, { recursive: true });

  const scope = isGlobal ? `你已全局加载 superpowers-zh 技能框架（${variant} 变体），所有项目共享` : `你已加载 superpowers-zh 技能框架（${variant} 变体）`;
  const skillsRef = isGlobal ? `~/${variant}/skills/` : `${variant}/skills/`;

  // Qoder rules schema（来源：社区实际样本，docs.qoder.com/zh/user-guide/rules 没公开）
  // trigger: always_on  → "始终生效"，适用于所有智能会话和内联对话
  // trigger: model_decision + description: ...  → 模型按描述自主决定
  // trigger: manual  → 仅 @rule 手动触发
  const rule = `---
trigger: always_on
alwaysApply: true
---

# Superpowers-ZH 中文增强版

${scope}（${skillEntries.length} 个 skills）。

## 核心规则

1. **收到任务时，先检查是否有匹配的 skill** — 哪怕只有 1% 的可能性也要检查
2. **设计先于编码** — 收到功能需求时，先用 brainstorming skill 做需求分析
3. **测试先于实现** — 写代码前先写测试（TDD）
4. **验证先于完成** — 声称完成前必须运行验证命令

## 可用 Skills

Skills 位于 \`${skillsRef}\` 目录，每个 skill 有独立的 \`SKILL.md\` 文件。

| Skill | 触发条件 |
|-------|---------|
${skillTable}

## 如何使用

当任务匹配某个 skill 的触发条件时，读取对应的 \`${skillsRef}<skill-name>/SKILL.md\` 并严格遵循其流程。也可输入 \`/<skill-name>\` 显式调用。
`;

  const rulePath = resolve(rulesDir, 'superpowers-zh.md');
  writeFileSync(rulePath, rule, 'utf8');
  console.log(`  ✅ Qoder: bootstrap rule -> ${rulePath}`);
}

function generateAntigravityBootstrap(baseDir, isGlobal) {
  const skillEntries = scanSkillEntries(SKILLS_SRC);
  const skillList = skillEntries.map(s => `- **${s.name}**: ${s.desc}`).join('\n');
  const scope = isGlobal ? '已全局安装 superpowers-zh 技能框架，所有项目共享' : '本项目已安装 superpowers-zh 技能框架';
  const skillsRef = isGlobal ? '~/.agents/skills/' : '.agents/skills/';

  const content = `# Superpowers-ZH 中文增强版

${scope}（${skillEntries.length} 个 skills）。

## 核心规则

1. **收到任务时，先检查是否有匹配的 skill** — 哪怕只有 1% 的可能性也要检查
2. **设计先于编码** — 收到功能需求时，先用 brainstorming skill 做需求分析
3. **测试先于实现** — 写代码前先写测试（TDD）
4. **验证先于完成** — 声称完成前必须运行验证命令

## 可用 Skills

Skills 位于 \`${skillsRef}\` 目录，每个 skill 有独立的 \`SKILL.md\` 文件。

${skillList}

## 如何使用

当任务匹配某个 skill 时，读取对应的 \`${skillsRef}<skill-name>/SKILL.md\` 并严格遵循其流程。
`;

  // 写入 .agents/rules.md（不覆盖用户已有的 GEMINI.md / AGENTS.md）；全局装到 ~/.agents/rules.md
  const rulePath = resolve(baseDir, '.agents', 'rules.md');
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

function generateGeminiBootstrap(baseDir, isGlobal) {
  const skillEntries = scanSkillEntries(SKILLS_SRC);
  const skillList = skillEntries.map(s => `- **${s.name}**: ${s.desc}`).join('\n');
  const scope = isGlobal ? '已全局安装 superpowers-zh 技能框架，所有项目共享' : '本项目已安装 superpowers-zh 技能框架';
  const skillsRef = isGlobal ? '~/.gemini/skills/' : '.gemini/skills/';

  const content = `# Superpowers-ZH 中文增强版

${scope}（${skillEntries.length} 个 skills）。

## 核心规则

1. **收到任务时，先检查是否有匹配的 skill** — 哪怕只有 1% 的可能性也要检查
2. **设计先于编码** — 收到功能需求时，先用 brainstorming skill 做需求分析
3. **测试先于实现** — 写代码前先写测试（TDD）
4. **验证先于完成** — 声称完成前必须运行验证命令

## 可用 Skills

Skills 位于 \`${skillsRef}\` 目录，每个 skill 有独立的 \`SKILL.md\` 文件。

${skillList}

## 如何使用

当任务匹配某个 skill 时，读取对应的 \`${skillsRef}<skill-name>/SKILL.md\` 并严格遵循其流程。
`;

  // 写入 GEMINI.md（如果已存在则追加）；全局装到 ~/.gemini/GEMINI.md
  const geminiPath = isGlobal ? resolve(baseDir, '.gemini', 'GEMINI.md') : resolve(baseDir, 'GEMINI.md');
  mkdirSync(dirname(geminiPath), { recursive: true });
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

function generateClaudeCodeBootstrap(baseDir, isGlobal) {
  const skillEntries = scanSkillEntries(SKILLS_SRC);
  const skillList = skillEntries.map(s => `- **${s.name}**: ${s.desc}`).join('\n');
  const scope = isGlobal ? '已全局安装 superpowers-zh 技能框架，所有项目共享' : '本项目已安装 superpowers-zh 技能框架';
  const skillsRef = isGlobal ? '~/.claude/skills/' : '.claude/skills/';

  const content = `# Superpowers-ZH 中文增强版

${scope}（${skillEntries.length} 个 skills）。

## 核心规则

1. **收到任务时，先检查是否有匹配的 skill** — 哪怕只有 1% 的可能性也要检查
2. **设计先于编码** — 收到功能需求时，先用 brainstorming skill 做需求分析
3. **测试先于实现** — 写代码前先写测试（TDD）
4. **验证先于完成** — 声称完成前必须运行验证命令

## 可用 Skills

Skills 位于 \`${skillsRef}\` 目录，每个 skill 有独立的 \`SKILL.md\` 文件。

${skillList}

## 如何使用

当任务匹配某个 skill 时，使用 \`Skill\` 工具加载对应 skill 并严格遵循其流程。绝不要用 Read 工具读取 SKILL.md 文件。

如果你认为哪怕只有 1% 的可能性某个 skill 适用于你正在做的事情，你必须调用该 skill 检查。
`;

  const mdPath = isGlobal ? resolve(baseDir, '.claude', 'CLAUDE.md') : resolve(baseDir, 'CLAUDE.md');
  mkdirSync(dirname(mdPath), { recursive: true });
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

// CodeBuddy（腾讯 AI IDE）—— 加载机制类似 Claude Code：项目根 CODEBUDDY.md 作 bootstrap，
// skills 放 .codebuddy/skills/。仅项目级（其用户级 skills 加载路径未证实，暂不做全局）。
function generateCodeBuddyBootstrap(baseDir) {
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

Skills 位于 \`.codebuddy/skills/\` 目录，每个 skill 有独立的 \`SKILL.md\` 文件。

${skillList}

## 如何使用

当任务匹配某个 skill 时，读取对应的 \`.codebuddy/skills/<skill-name>/SKILL.md\` 并严格遵循其流程。
`;

  const mdPath = resolve(baseDir, 'CODEBUDDY.md');
  if (existsSync(mdPath)) {
    const existing = readFileSync(mdPath, 'utf8');
    if (!existing.includes('superpowers-zh')) {
      writeFileSync(mdPath, existing.replace(/\s+$/, '') + '\n\n' + wrapWithSentinel(content), 'utf8');
      console.log(`  ✅ CodeBuddy: 追加 skills 引用 -> ${mdPath}`);
    } else {
      console.log(`  ✅ CodeBuddy: CODEBUDDY.md 已包含 superpowers-zh 引用`);
    }
  } else {
    writeFileSync(mdPath, wrapWithSentinel(content), 'utf8');
    console.log(`  ✅ CodeBuddy: bootstrap -> ${mdPath}`);
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
  'qoder':        'Qoder',
  'qoder-cn':        'Qoder CN',
  'codebuddy':    'CodeBuddy',
  'codebuddy-code': 'CodeBuddy',
  'codebuddycode': 'CodeBuddy',
  'codebuddy-cn': 'CodeBuddy',
  'codearts':     'CodeArts',
  'codeartsdoer': 'CodeArts',
  'codearts-doer': 'CodeArts',
  'huawei':       'CodeArts',
};

function showHelp() {
  const toolNames = [...new Set(Object.values(TOOL_ALIASES))];
  console.log(`
  superpowers-zh v${PKG.version} — AI 编程超能力中文版

  用法：
    npx superpowers-zh                   项目级：自动检测工具并装到当前目录
    npx superpowers-zh --global          全局：装到 ~/，所有项目共享（推荐多项目用户）
    npx superpowers-zh --tool cursor     指定工具安装（检测不到时使用）
    npx superpowers-zh --global -t claude 全局 + 指定工具
    npx superpowers-zh --uninstall       卸载当前目录（加 --global 卸载全局）
    npx superpowers-zh --force           允许在用户主目录(~)做项目级安装（默认拒绝）
    npx superpowers-zh --help            显示帮助
    npx superpowers-zh --version         显示版本

  支持的工具名：
    ${Object.keys(TOOL_ALIASES).join(', ')}

  支持全局安装的工具（其余工具规则为项目级，--global 会提示改用项目级）：
    ${TARGETS.filter(t => t.global).map(t => t.name).join('、')}

  说明：
    项目级：把 ${countDirs(SKILLS_SRC)} 个 skills 装到当前项目对应目录（如 .claude/skills）。
    全局：把 skills 装到用户级目录（如 ~/.claude/skills），一次安装所有项目可用，
          skills 更新时也只需重装一次。项目级优先、全局兜底，二者可共存。

    卸载：
      npx superpowers-zh --uninstall            清理当前项目
      npx superpowers-zh --global --uninstall   清理全局安装

  项目：https://github.com/jnMetaCode/superpowers-zh
`);
}

function installForTarget(target, baseDir, isGlobal) {
  const relDir = isGlobal ? target.global.dir : target.dir;
  const dest = resolve(baseDir, relDir);
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
  const scopeTag = isGlobal ? '[全局]' : '[项目]';
  console.log(`  ✅ ${target.name} ${scopeTag}: ${srcCount} 个 skills -> ${dest}`);

  if (target.name === 'Trae') {
    generateTraeBootstrapRule(baseDir);
  }

  if (target.name === 'Qoder' || target.name === 'Qoder CN') {
    generateQoderBootstrap(baseDir, isGlobal, target.name);
  }

  if (target.name === 'Antigravity') {
    generateAntigravityBootstrap(baseDir, isGlobal);
  }

  if (target.name === 'Aider') {
    generateAiderBootstrap(baseDir);
  }

  if (target.name === 'Gemini CLI') {
    generateGeminiBootstrap(baseDir, isGlobal);
  }

  if (target.name === 'Hermes Agent') {
    generateHermesBootstrap(baseDir);
  }

  if (target.name === 'Claude Code') {
    generateClaudeCodeBootstrap(baseDir, isGlobal);
  }

  if (target.name === 'CodeBuddy') {
    generateCodeBuddyBootstrap(baseDir);
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
  '.qoder/rules/superpowers-zh.md',
  '.qoder-cn/rules/superpowers-zh.md',
  '.agents/rules.md',
];
const BOOTSTRAP_CLEAN_SECTION = [
  'CLAUDE.md',
  'GEMINI.md',
  'HERMES.md',
  'CONVENTIONS.md',
  'CODEBUDDY.md',
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

// 全局安装的 bootstrap 文件（相对 home）— 与 install 全局分支写入的路径对应。
// 仅 Claude Code（~/.claude/CLAUDE.md，全局记忆已证实）和 Qoder/Qoder CN（~/.qoder[−cn]/rules/，镜像其项目机制）
// 会写全局 bootstrap；其余全局工具靠 skill 自动发现，无 bootstrap 需清理。
const GLOBAL_BOOTSTRAP_DELETE = ['.qoder/rules/superpowers-zh.md', '.qoder-cn/rules/superpowers-zh.md'];
const GLOBAL_BOOTSTRAP_CLEAN_SECTION = ['.claude/CLAUDE.md'];

function uninstallForTarget(target, srcSkillNames, baseDir, isGlobal) {
  const relDir = isGlobal ? (target.global && target.global.dir) : target.dir;
  if (!relDir) return 0;
  const dest = resolve(baseDir, relDir);
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

function uninstall(isGlobal) {
  const baseDir = isGlobal ? homedir() : PROJECT_DIR;
  console.log(`\n  superpowers-zh v${PKG.version} — 卸载（${isGlobal ? '全局' : '项目级'}）\n`);
  console.log(`  目标: ${baseDir}\n`);

  if (!existsSync(SKILLS_SRC)) {
    console.error('  ❌ 错误：skills 源目录不存在，无法识别要卸载的 skill 名单。');
    process.exit(1);
  }

  const srcSkillNames = new Set(
    readdirSync(SKILLS_SRC, { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(e => e.name)
  );

  const pool = isGlobal ? GLOBAL_TARGETS : TARGETS;
  let totalSkills = 0;
  for (const target of pool) {
    const removed = uninstallForTarget(target, srcSkillNames, baseDir, isGlobal);
    if (removed > 0) {
      const relDir = isGlobal ? target.global.dir : target.dir;
      console.log(`  ✅ ${target.name}: 移除 ${removed} 个 skills <- ${resolve(baseDir, relDir)}`);
      totalSkills += removed;
    }
  }

  // 清理 .claude/agents 下旧版本装过的 legacy agent（v1.2.x 及之前会装 code-reviewer.md，
  // v1.3.0 起跟随上游 v5.1.0 移除）。即使 agents/ 源目录已删，已装用户跑 --uninstall 仍应能清干净。
  const agentsDest = resolve(baseDir, '.claude', 'agents');
  if (existsSync(agentsDest)) {
    let agentsRemoved = 0;
    for (const entry of readdirSync(agentsDest)) {
      if (LEGACY_AGENT_FILENAMES.includes(entry)) {
        rmSync(resolve(agentsDest, entry), { recursive: true, force: true });
        agentsRemoved++;
      }
    }
    if (agentsRemoved > 0) console.log(`  ✅ Claude Code agents: 移除 ${agentsRemoved} 个旧版残留 -> ${agentsDest}`);
    try {
      const left = readdirSync(agentsDest).filter(n => n !== '.DS_Store');
      if (left.length === 0) rmSync(agentsDest, { recursive: true, force: true });
    } catch {}
  }

  const deleteList = isGlobal ? GLOBAL_BOOTSTRAP_DELETE : BOOTSTRAP_DELETE;
  const cleanList = isGlobal ? GLOBAL_BOOTSTRAP_CLEAN_SECTION : BOOTSTRAP_CLEAN_SECTION;
  let bootstrapsRemoved = 0;
  for (const rel of deleteList) {
    const full = resolve(baseDir, rel);
    if (existsSync(full)) {
      rmSync(full);
      console.log(`  ✅ 删除 bootstrap: ${full}`);
      bootstrapsRemoved++;
    }
  }
  for (const rel of cleanList) {
    const full = resolve(baseDir, rel);
    if (cleanBootstrapSection(full)) {
      console.log(`  ✅ 清理 bootstrap: ${full}`);
      bootstrapsRemoved++;
    }
  }

  if (totalSkills === 0 && bootstrapsRemoved === 0) {
    console.log(`  ⚠️  未在${isGlobal ? '用户主目录' : '当前目录'}找到 superpowers-zh 安装痕迹。`);
  } else {
    console.log(`\n  卸载完成。共移除 ${totalSkills} 个 skill 目录、${bootstrapsRemoved} 个 bootstrap 文件。\n`);
  }
}

// 支持全局安装的工具（有稳定的用户级 skills 目录）
const GLOBAL_TARGETS = TARGETS.filter(t => t.global);

function install(forceToolName, force, isGlobal) {
 try {
  console.log(`\n  superpowers-zh v${PKG.version} — AI 编程超能力中文版\n`);

  if (!existsSync(SKILLS_SRC)) {
    console.error('  ❌ 错误：skills 源目录不存在，请重新安装 superpowers-zh。');
    process.exit(1);
  }

  const baseDir = isGlobal ? homedir() : PROJECT_DIR;

  // 项目级安装（默认）：拒绝在 home 根目录乱装（会污染所有项目）。
  // 全局安装（--global）：本就写到 ~/.claude/skills 等用户级目录，是正当行为，跳过该护栏。
  if (!isGlobal && !force && isHomeDir(PROJECT_DIR)) {
    console.error(
`  ⚠️  当前目录是用户主目录: ${PROJECT_DIR}

  superpowers-zh 项目级安装应该装到具体项目目录，而不是 ~/。
  在主目录安装会把 skills 和 bootstrap 文件（CLAUDE.md / HERMES.md 等）
  写入你的 home，污染所有项目。

  如果你想让 skills 对所有项目生效，用全局安装（推荐）：
    npx superpowers-zh --global            # 自动检测已装工具
    npx superpowers-zh --global --tool claude

  或先 cd 到项目目录做项目级安装：
    cd /path/to/your/project && npx superpowers-zh

  如果你确实要在主目录做项目级安装（不推荐），加 --force：
    npx superpowers-zh --force
`);
    process.exit(1);
  }

  console.log(`  源: ${countDirs(SKILLS_SRC)} 个 skills`);
  console.log(`  模式: ${isGlobal ? '全局（所有项目共享，装到 ~/）' : '项目级'}`);
  console.log(`  目标: ${baseDir}\n`);

  // --tool 指定安装
  if (forceToolName) {
    const target = TARGETS.find(t => t.name === forceToolName);
    if (!target) {
      console.error(`  ❌ 未知工具: ${forceToolName}`);
      process.exit(1);
    }
    if (isGlobal && !target.global) {
      // 部分工具（如 Gemini CLI 的扩展目录）有专属全局方式，但与通用 --global 复制机制不同，
      // 指向对应 docs；其余工具规则为项目级或存于应用内设置，无稳定用户级路径。
      const docSlug = { 'Gemini CLI': 'gemini-cli', 'Antigravity': 'antigravity', 'Trae': 'trae', 'Aider': 'aider', 'Hermes Agent': 'hermes', 'Kiro': 'kiro' }[target.name];
      console.error(
`  ❌ ${target.name} 不支持通用全局安装（--global）。

  该工具没有通用 --global 能覆盖的稳定用户级 skills 路径${docSlug ? `（可能有专属全局方式，见 docs/README.${docSlug}.md）` : '（规则为项目级或存于应用内设置）'}。
  请改用项目级安装：
    cd /path/to/your/project && npx superpowers-zh --tool ${forceToolName.toLowerCase().replace(/ .*/, '')}

  支持通用全局安装的工具：${GLOBAL_TARGETS.map(t => t.name).join('、')}
`);
      process.exit(1);
    }
    installForTarget(target, baseDir, isGlobal);
    console.log('\n  安装完成！重启你的 AI 编程工具即可生效。\n');
    return;
  }

  // 自动检测
  let installed = 0;
  const pool = isGlobal ? GLOBAL_TARGETS : TARGETS;

  for (const target of pool) {
    const detectMarker = isGlobal ? target.global.detect : target.detect;
    const detects = Array.isArray(detectMarker) ? detectMarker : [detectMarker];
    const found = detects.some(d => existsSync(resolve(baseDir, d)));
    if (found) {
      installForTarget(target, baseDir, isGlobal);
      installed++;
    }
  }

  if (installed === 0) {
    // 检测落空时不再静默装 Claude Code —— 否则 Antigravity / Trae 等
    // 不会在项目里留下检测目录的工具，会被误装成 Claude（见 issue #33）。
    // 改为明确报错并教用户用 --tool 显式指定。
    const where = isGlobal ? '你的用户主目录(~)' : '当前目录';
    const flag = isGlobal ? '--global ' : '';
    console.log(`  ⚠️  未在${where}检测到任何已知 AI 编程工具的标记。\n`);
    console.log('  为避免装错工具，未做任何安装。请用 --tool 显式指定你的工具，例如：\n');
    console.log(`    npx superpowers-zh ${flag}--tool claude        # Claude Code / Copilot CLI`);
    if (isGlobal) {
      console.log(`    npx superpowers-zh ${flag}--tool codex         # Codex CLI`);
      console.log(`    npx superpowers-zh ${flag}--tool qoder         # Qoder\n`);
      console.log(`  支持全局安装的工具：${GLOBAL_TARGETS.map(t => t.name).join('、')}\n`);
    } else {
      console.log(`    npx superpowers-zh ${flag}--tool antigravity   # Google Antigravity`);
      console.log(`    npx superpowers-zh ${flag}--tool trae          # Trae`);
      console.log(`    npx superpowers-zh ${flag}--tool cursor        # Cursor\n`);
      console.log(`  全部可用别名：${Object.keys(TOOL_ALIASES).join(', ')}\n`);
    }
    process.exit(1);
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
const globalIdx = args.findIndex(a => a === '--global' || a === '-g');
const force = forceIdx !== -1;
const isGlobal = globalIdx !== -1;

// 已知无参数值的开关，用于校验未知参数（--tool 后面跟工具名不算未知参数）
const KNOWN_FLAGS = new Set(['--help', '-h', '--version', '-v', '--uninstall', '-u', '--force', '-f', '--global', '-g', '--tool', '-t']);

if (helpIdx !== -1) {
  showHelp();
} else if (versionIdx !== -1) {
  console.log(PKG.version);
} else if (uninstallIdx !== -1) {
  uninstall(isGlobal);
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
  install(toolName, force, isGlobal);
} else {
  // 校验未知参数（--tool 的值已在上面分支处理，走到这里说明没有 --tool）
  const unknown = args.find(a => a.startsWith('-') && !KNOWN_FLAGS.has(a));
  if (unknown) {
    console.warn(`  未知参数: ${unknown}\n`);
    showHelp();
    process.exit(1);
  }
  install(undefined, force, isGlobal);
}
