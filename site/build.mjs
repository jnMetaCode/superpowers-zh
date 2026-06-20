#!/usr/bin/env node
// superpowers-zh 官网生成器 —— 零依赖。
// 服务端生成中/英两套静态页 + 每个 skill 的详情(操作文档)页。
// skill 卡片与详情正文均直接读取 ../skills/*/SKILL.md，与源文件同步、不漂移。

import {
  readFileSync, writeFileSync, mkdirSync, readdirSync,
  existsSync, copyFileSync, rmSync,
} from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { renderMarkdown } from './md.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SKILLS_DIR = join(ROOT, 'skills');
const DIST = join(__dirname, 'dist');
const TEMPLATE = join(__dirname, 'template');
const PKG = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));

// 内容 hash 版本号：styles.css / app.js 内容变化时 URL 自动变（?v=hash），
// 绕过 Cloudflare 边缘缓存，确保 CSS/JS 改动立即生效；内容不变则继续命中缓存。
const cssVer = createHash('sha256').update(readFileSync(join(TEMPLATE, 'styles.css'))).digest('hex').slice(0, 10);
const jsVer = createHash('sha256').update(readFileSync(join(TEMPLATE, 'app.js'))).digest('hex').slice(0, 10);

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ---- frontmatter 解析 ----
function parseFrontmatter(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const out = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w[\w-]*):\s*(.*)$/);
    if (!kv) continue;
    let val = kv[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[kv[1]] = val;
  }
  return out;
}

// ---- skill 展示元数据：中/英标题 + 英文简介 + 分组 ----
const SKILL_META = {
  'using-superpowers':            { group: 'meta',    title: '使用 Superpowers · 引导', titleEn: 'Using Superpowers · Bootstrap', descEn: 'The bootstrap skill — establishes how to discover and invoke skills at the start of every conversation.' },
  'brainstorming':                { group: 'flow',    title: '头脑风暴',           titleEn: 'Brainstorming',            descEn: 'Explore intent, requirements and design before any creative work — feature, component or behavior change.' },
  'writing-plans':                { group: 'flow',    title: '编写实现计划',       titleEn: 'Writing Plans',            descEn: 'Turn a spec into a step-by-step implementation plan before writing any code.' },
  'executing-plans':              { group: 'flow',    title: '执行计划',           titleEn: 'Executing Plans',          descEn: 'Execute a written plan in a separate session with review checkpoints.' },
  'subagent-driven-development':  { group: 'flow',    title: '子代理驱动开发',     titleEn: 'Subagent-Driven Dev',      descEn: 'Run a plan of independent tasks within the current session via subagents.' },
  'dispatching-parallel-agents':  { group: 'flow',    title: '并行代理调度',       titleEn: 'Dispatching Parallel Agents', descEn: 'Fan out 2+ independent tasks with no shared state or ordering dependency.' },
  'workflow-runner':              { group: 'flow',    title: '工作流运行器',       titleEn: 'Workflow Runner',          descEn: 'Run agency-orchestrator YAML workflows directly using the current session LLM — no API key.' },
  'test-driven-development':      { group: 'quality', title: '测试驱动开发 · TDD', titleEn: 'Test-Driven Development',   descEn: 'Write the test before the implementation, for every feature and bug fix.' },
  'systematic-debugging':         { group: 'quality', title: '系统化调试',         titleEn: 'Systematic Debugging',     descEn: 'Reproduce and locate the root cause before proposing any fix.' },
  'verification-before-completion':{ group: 'quality', title: '完成前验证',        titleEn: 'Verification Before Completion', descEn: 'Run verification and back every claim with evidence before saying it is done.' },
  'requesting-code-review':       { group: 'review',  title: '发起代码审查',       titleEn: 'Requesting Code Review',   descEn: 'Validate work against requirements before merging or shipping.' },
  'receiving-code-review':        { group: 'review',  title: '接收代码审查',       titleEn: 'Receiving Code Review',    descEn: 'Apply review feedback with technical rigor — verify, don\'t blindly comply.' },
  'using-git-worktrees':          { group: 'git',     title: 'Git Worktree 隔离',  titleEn: 'Using Git Worktrees',      descEn: 'Start isolated feature work in a dedicated git worktree.' },
  'finishing-a-development-branch':{ group: 'git',    title: '收尾开发分支',       titleEn: 'Finishing a Branch',       descEn: 'Wrap up finished work via structured merge / PR / cleanup options.' },
  'writing-skills':               { group: 'meta',    title: '编写 Skill',         titleEn: 'Writing Skills',           descEn: 'Create, edit and validate skills before deploying them.' },
  'mcp-builder':                  { group: 'meta',    title: 'MCP 服务器构建',     titleEn: 'MCP Builder',              descEn: 'Methodology for building production-grade MCP servers that connect AI to external tools.' },
  'chinese-code-review':          { group: 'china',   title: '中文代码审查',       titleEn: 'Chinese Code Review',      descEn: 'Chinese review phrasing, severity tiers, and common anti-patterns in domestic teams.' },
  'chinese-commit-conventions':   { group: 'china',   title: '中文提交规范',       titleEn: 'Chinese Commit Conventions', descEn: 'Conventional Commits adapted for Chinese, with commitlint / husky / changelog templates.' },
  'chinese-documentation':        { group: 'china',   title: '中文文档排版',       titleEn: 'Chinese Documentation',    descEn: 'CN/EN spacing, punctuation, term preservation and Chinese typography conventions.' },
  'chinese-git-workflow':         { group: 'china',   title: '国内 Git 平台',       titleEn: 'Chinese Git Workflow',     descEn: 'Gitee / Coding.net / JiHu GitLab / CNB access, credentials, CI and mirror sync.' },
};

const GROUPS = [
  { id: 'all',     zh: '全部',          en: 'All' },
  { id: 'flow',    zh: '工作流程',      en: 'Workflow' },
  { id: 'quality', zh: '质量 · 测试 · 调试', en: 'Quality' },
  { id: 'review',  zh: '代码审查',      en: 'Code Review' },
  { id: 'git',     zh: 'Git · 分支',    en: 'Git' },
  { id: 'meta',    zh: '元 · 构建',     en: 'Meta' },
  { id: 'china',   zh: '🇨🇳 中国原创',  en: '🇨🇳 China-native' },
];

// ---- 支持的工具（与 bin/superpowers-zh.js 的 TARGETS 对齐） ----
const TOOLS = [
  { name: 'Claude Code',    type: 'CLI',    cmd: 'npx superpowers-zh',                auto: true },
  { name: 'Cursor',         type: 'IDE',    cmd: 'npx superpowers-zh',                auto: true },
  { name: 'Windsurf',       type: 'IDE',    cmd: 'npx superpowers-zh',                auto: true },
  { name: 'Codex CLI',      type: 'CLI',    cmd: 'npx superpowers-zh',                auto: true },
  { name: 'Gemini CLI',     type: 'CLI',    cmd: 'npx superpowers-zh',                auto: true },
  { name: 'Kiro',           type: 'IDE',    cmd: 'npx superpowers-zh',                auto: true },
  { name: 'Trae',           type: 'IDE',    cmd: 'npx superpowers-zh',                auto: true },
  { name: 'Qoder',          type: 'IDE',    cmd: 'npx superpowers-zh',                auto: true },
  { name: 'Aider',          type: 'CLI',    cmd: 'npx superpowers-zh',                auto: true },
  { name: 'OpenCode',       type: 'CLI',    cmd: 'npx superpowers-zh',                auto: true },
  { name: 'Qwen Code',      type: 'IDE',    cmd: 'npx superpowers-zh',                auto: true },
  { name: 'Antigravity',    type: 'CLI',    cmd: 'npx superpowers-zh',                auto: true },
  { name: 'DeerFlow 2.0',   type: 'Agent',  cmd: 'npx superpowers-zh',                auto: true },
  { name: 'VS Code · Copilot', type: 'IDE', cmd: 'npx superpowers-zh',                auto: true },
  { name: 'Copilot CLI',    type: 'CLI',    cmd: 'npx superpowers-zh --tool copilot', auto: false },
  { name: 'Hermes Agent',   type: 'CLI',    cmd: 'npx superpowers-zh --tool hermes',  auto: false },
  { name: 'Claw Code',      type: 'CLI',    cmd: 'npx superpowers-zh --tool claw',    auto: false },
  { name: 'OpenClaw',       type: 'CLI',    cmd: 'npx superpowers-zh',                auto: true },
];

// ---- 双语文案 ----
const T = {
  zh: {
    htmlLang: 'zh-CN',
    title: 'superpowers-zh · AI 编程超能力中文增强版',
    desc: 'superpowers（233k+ ⭐）完整汉化 + 4 个中国原创 skills，一条 npx 命令为 18 款 AI 编程工具装上系统化工作方法论。',
    nav: { why: '特性', install: '安装', skills: 'Skills', tools: '支持工具', faq: 'FAQ', github: 'GitHub ↗' },
    heroBadge: 'superpowers 233k+ ⭐ · 完整汉化 + 中国原创',
    heroH1: '给你的 AI 编程工具<br>装上<span class="grad">真正会干活</span>的超能力',
    heroLead: '{n} 个经过实战验证的工作方法论 skill —— 从头脑风暴到 TDD，从系统化调试到代码审查。<br>一条命令，自动识别项目里的工具并安装。',
    heroBtn1: '查看安装命令', heroBtn2: 'GitHub 源码',
    stats: ['Skills', '中国原创', '支持工具', '当前版本'],
    whyTitle: '为什么选择 superpowers-zh？',
    whySub: '不是又一套提示词模板 —— 是让 AI 真正按工程方法干活的系统化能力。',
    plTitle: '一条龙工作流，每一步都有 skill 把关',
    plSub: 'skill 之间彼此衔接，AI 会在合适的节点自动触发对应方法论。',
    cmpTitle: '装上之后，AI 不再"上来就写"',
    cmpBad: '❌ 没装', cmpGood: '✅ 装了 superpowers-zh',
    cmpBadPre: '你：给用户模块加个批量导出功能\nAI：好的，我来实现……（直接开写）\n    export async function exportUsers() { … }\n你：等等，格式不对，没分页，\n    大数据量会 OOM……',
    cmpGoodPre: '你：给用户模块加个批量导出功能\nAI：先理清需求 —— 导出格式？数据量级？\n    要分页/流式吗？要权限校验吗？\n    （触发 brainstorming）\n    → 写计划 → TDD → 验证 → 审查',
    instTitle: '选你的工具，拿到安装命令',
    instSub: '大多数工具 <code>npx superpowers-zh</code> 会自动识别项目目录并安装；识别不出的用 <code>--tool</code> 指定。',
    instLabel: '我用的是',
    instNoteAuto: '在你的项目根目录运行，<b>自动识别 {name}</b> 并安装。安装后重启工具即可生效。',
    instNoteManual: '{name} 无法自动识别，需用 <code>--tool</code> 显式指定。在项目根目录运行，安装后重启工具即可生效。',
    skTitle: '{n} 个 Skill，覆盖开发全流程',
    skSub: '点击任意卡片查看完整操作文档。',
    skSearch: '搜索 skill…（如 调试 / review / TDD）',
    skEmpty: '没有匹配的 skill。',
    skDetail: '查看文档 →',
    tagCn: '中国原创',
    ucTitle: '典型使用场景', ucSub: '每个场景背后都是一组协同工作的 skill。',
    toolsTitle: '一套 skill，18 款工具通用', toolsSub: '换工具不用换习惯，方法论跟着你走。',
    faqTitle: '常见问题',
    bookTitle: '装好之后，配上方法论效率翻倍',
    bookDesc: '《AI 编程实战 · 方法论三卷书》—— 10 个 AI 编程工具完整教程 + 真实踩坑。在线书 + PDF，永久免费。',
    bookBtn: '免费阅读 ↗',
    sponsorTitle: '赞助商',
    sponsorDesc: '稳定高速的 API 中继服务，为 Claude Code、Codex 等平台提供 API 中继与 AI 生图服务。',
    sponsorCta: '🙏 想出现在这里？联系 <b>jnMetaCode@qq.com</b>',
    ctaTitle: '准备好让 AI 真正会干活了吗？',
    ctaDesc: '一条命令，{n} 个实战方法论装进你的工具。免费、开源、零依赖。',
    ctaBtn1: '查看安装命令', ctaBtn2: '⭐ Star on GitHub',
    footCols: [
      { h: '产品', links: [['特性', '#why'], ['Skills', '#skills'], ['支持工具', '#tools'], ['FAQ', '#faq']] },
      { h: '资源', links: [['GitHub', 'https://github.com/jnMetaCode/superpowers-zh'], ['npm', 'https://www.npmjs.com/package/superpowers-zh'], ['方法论三卷书', 'https://book.aibuzhiyu.com/']] },
      { h: '生态', links: [['aiOlaOla · 从零学会 AI 编程', 'https://aiolaola.com/'], ['X / Twitter', 'https://x.com/jnMetaCode'], ['公众号 AI不止语', 'https://aiolaola.com/'], ['姐妹项目', 'https://github.com/jnMetaCode']] },
      { h: '社区', links: [['提交 Issue', 'https://github.com/jnMetaCode/superpowers-zh/issues'], ['贡献指南', 'https://github.com/jnMetaCode/superpowers-zh/blob/main/CLAUDE.md'], ['联系邮箱', 'mailto:jnMetaCode@qq.com']] },
    ],
    footTag: 'AI 编程超能力 · 中文增强版 · MIT License',
    copyright: '© 2026 superpowers-zh · MIT License',
    followUs: '扫码关注', qrWechat: '公众号 · AI不止语', qrDouyin: '抖音 · @AI不止语（AIBZY）',
    copy: '复制', copied: '已复制 ✓',
    backToSkills: '← 返回全部 Skill',
    detailInstall: '安装此 skill',
    detailSource: '在 GitHub 查看源文件 ↗',
    features: [
      { icon: '🧠', t: '20 个实战方法论', d: '不是 prompt 模板，是经过跨会话对抗式压力测试调优的工作方法论 —— 从头脑风暴到 TDD、调试、代码审查。' },
      { icon: '🔌', t: '18 款工具通用', d: '一套 skill，Claude Code / Cursor / Codex / Gemini CLI / Windsurf… 全适配，换工具不用换习惯。' },
      { icon: '⚡', t: '一条命令安装', d: 'npx superpowers-zh 自动识别项目里用的是哪款工具并安装，零配置，装完重启即生效。' },
      { icon: '🇨🇳', t: '中国原创 Skills', d: '中文代码审查话术、中文提交规范、中文文档排版、国内 Git 平台（Gitee/Coding/极狐）配置 —— 上游没有。' },
      { icon: '📖', t: '完整汉化上游', d: '同步 obra/superpowers（233k+ ⭐），核心 skill 全部中文母语化，不是机翻，是逐条校准。' },
      { icon: '🔓', t: '零依赖 · MIT 开源', d: '纯 Markdown skill，不引入任何外部依赖、不联网、不上传代码，按需触发零运行时开销。' },
    ],
    pipeline: [
      { n: '头脑风暴', d: '动手前先理清意图与需求' },
      { n: '写计划', d: '把需求拆成可执行步骤' },
      { n: 'TDD', d: '先写测试再写实现' },
      { n: '系统化调试', d: '先复现定位再改' },
      { n: '代码审查', d: '合并前严谨验收' },
      { n: '完成前验证', d: '用证据证明真的好了' },
    ],
    usecases: [
      { tag: '开发新功能', skills: 'brainstorming → writing-plans → TDD', desc: 'AI 先反问需求、写出实现计划，再用测试驱动落地，而不是上来就糊一坨代码。' },
      { tag: '修 Bug', skills: 'systematic-debugging', desc: '强制先复现、定位根因，再提修复方案 —— 杜绝"猜一个改一下"的瞎试循环。' },
      { tag: '提交 / 合并前', skills: 'verification-before-completion → code-review', desc: '必须跑验证命令、拿证据说话，再走一轮代码审查，才允许声称"完成"。' },
      { tag: '国内团队协作', skills: 'chinese-commit-conventions → chinese-code-review', desc: '中文 commit 规范 + 分级 review 话术，配 Gitee / Coding / 极狐 GitLab 工作流。' },
    ],
    faq: [
      { q: 'superpowers-zh 是免费的吗？', a: '完全免费。MIT 协议开源，永久免费，不含任何付费墙或订阅。' },
      { q: '支持哪些 AI 编程工具？', a: '共 18 款：Claude Code、Cursor、Windsurf、Codex CLI、Gemini CLI、Kiro、Trae、Qoder、Aider、OpenCode、Qwen Code、Antigravity、DeerFlow、VS Code(Copilot)、Copilot CLI、Hermes Agent、Claw Code、OpenClaw。' },
      { q: 'superpowers-zh 有哪些独特价值？', a: '一套完整中文化的系统工作方法论：从头脑风暴、规划、TDD 到调试、代码审查，每个 skill 都是实战验证的工作流；并叠加 4 个面向中国开发者的原创 skill（中文代码审查 / Git 工作流 / 文档规范 / 提交规范），适配 18 款 AI 编程工具。MIT 协议开源，永久免费。' },
      { q: '安装后怎么生效？', a: 'npx 会把 skill 文件装到你项目对应工具的目录（如 .claude/skills/），重启 AI 工具后，它会在恰当时机自动触发相应 skill —— 无需你每次手动调用。' },
      { q: '会拖慢我的 AI 吗？会上传代码吗？', a: '不会。skill 是按需触发的纯 Markdown，零运行时、不联网、不上传任何代码或数据，全程在本地。' },
      { q: '怎么更新或卸载？', a: '更新：重新运行 npx superpowers-zh 覆盖即可。卸载：npx superpowers-zh --uninstall 清理已安装的 skill 与 bootstrap 文件。' },
    ],
  },
  en: {
    htmlLang: 'en',
    title: 'superpowers-zh · Battle-tested AI coding skills (CN-enhanced)',
    desc: 'Full Chinese localization of superpowers (233k+ ⭐) plus 4 China-native skills. One npx command installs systematic workflow methodology into 18 AI coding tools.',
    nav: { why: 'Features', install: 'Install', skills: 'Skills', tools: 'Tools', faq: 'FAQ', github: 'GitHub ↗' },
    heroBadge: 'superpowers 233k+ ⭐ · Full CN localization + China-native skills',
    heroH1: 'Give your AI coding tools<br>superpowers that <span class="grad">actually ship</span>',
    heroLead: '{n} battle-tested workflow skills — from brainstorming to TDD, systematic debugging to code review.<br>One command auto-detects your tool and installs.',
    heroBtn1: 'Get the command', heroBtn2: 'GitHub',
    stats: ['Skills', 'China-native', 'Tools', 'Version'],
    whyTitle: 'Why superpowers-zh?',
    whySub: 'Not another prompt-template pack — real engineering methodology that makes AI work properly.',
    plTitle: 'An end-to-end workflow, every step guarded by a skill',
    plSub: 'Skills chain together; the AI triggers the right methodology at the right moment.',
    cmpTitle: 'After install, AI stops "coding before thinking"',
    cmpBad: '❌ Without', cmpGood: '✅ With superpowers-zh',
    cmpBadPre: 'You: Add bulk export to the users module\nAI: Sure, implementing… (starts coding)\n    export async function exportUsers() { … }\nYou: Wait — wrong format, no paging,\n    it OOMs on large data…',
    cmpGoodPre: 'You: Add bulk export to the users module\nAI: First, the requirements — what format?\n    What data volume? Paging/streaming?\n    Permission checks? (triggers brainstorming)\n    → plan → TDD → verify → review',
    instTitle: 'Pick your tool, get the command',
    instSub: 'For most tools <code>npx superpowers-zh</code> auto-detects the project and installs; otherwise pass <code>--tool</code>.',
    instLabel: "I'm using",
    instNoteAuto: 'Run it in your project root — it <b>auto-detects {name}</b> and installs. Restart the tool to take effect.',
    instNoteManual: '{name} can\'t be auto-detected; pass <code>--tool</code> explicitly. Run in the project root, then restart the tool.',
    skTitle: '{n} skills, covering the whole dev workflow',
    skSub: 'Click any card for the full operating doc.',
    skSearch: 'Search skills… (e.g. debug / review / TDD)',
    skEmpty: 'No matching skills.',
    skDetail: 'Read docs →',
    tagCn: 'China-native',
    ucTitle: 'Typical use cases', ucSub: 'Each scenario is backed by a set of cooperating skills.',
    toolsTitle: 'One skill set, 18 tools', toolsSub: 'Switch tools without switching habits — the methodology follows you.',
    faqTitle: 'FAQ',
    bookTitle: 'Pair it with the methodology for 2× efficiency',
    bookDesc: '"AI Coding in Practice · The Three-Volume Methodology" — full tutorials for 10 AI coding tools plus real-world pitfalls. Online book + PDF, free forever.',
    bookBtn: 'Read free ↗',
    sponsorTitle: 'Sponsors',
    sponsorDesc: 'A fast, reliable API relay for Claude Code, Codex and more — API relay and AI image generation.',
    sponsorCta: '🙏 Want to appear here? Contact <b>jnMetaCode@qq.com</b>',
    ctaTitle: 'Ready to make your AI actually ship?',
    ctaDesc: 'One command installs {n} battle-tested skills into your tool. Free, open-source, zero-dependency.',
    ctaBtn1: 'Get the command', ctaBtn2: '⭐ Star on GitHub',
    footCols: [
      { h: 'Product', links: [['Features', '#why'], ['Skills', '#skills'], ['Tools', '#tools'], ['FAQ', '#faq']] },
      { h: 'Resources', links: [['GitHub', 'https://github.com/jnMetaCode/superpowers-zh'], ['npm', 'https://www.npmjs.com/package/superpowers-zh'], ['Methodology book', 'https://book.aibuzhiyu.com/']] },
      { h: 'Ecosystem', links: [['aiOlaOla', 'https://aiolaola.com/'], ['X / Twitter', 'https://x.com/jnMetaCode'], ['Sister projects', 'https://github.com/jnMetaCode']] },
      { h: 'Community', links: [['Open an Issue', 'https://github.com/jnMetaCode/superpowers-zh/issues'], ['Contributing', 'https://github.com/jnMetaCode/superpowers-zh/blob/main/CLAUDE.md'], ['Contact', 'mailto:jnMetaCode@qq.com']] },
    ],
    footTag: 'AI coding superpowers · Chinese-enhanced · MIT License',
    copyright: '© 2026 superpowers-zh · MIT License',
    followUs: 'Follow us', qrWechat: 'WeChat · AI不止语', qrDouyin: 'Douyin · @AI不止语 (AIBZY)',
    copy: 'Copy', copied: 'Copied ✓',
    backToSkills: '← Back to all skills',
    detailInstall: 'Install this skill set',
    detailSource: 'View source on GitHub ↗',
    features: [
      { icon: '🧠', t: '20 battle-tested methods', d: 'Not prompt templates — workflow methodology hardened by cross-session adversarial testing, from brainstorming to TDD, debugging and review.' },
      { icon: '🔌', t: 'Works in 18 tools', d: 'One skill set for Claude Code / Cursor / Codex / Gemini CLI / Windsurf and more. Switch tools, keep your habits.' },
      { icon: '⚡', t: 'One-command install', d: 'npx superpowers-zh auto-detects your tool and installs. Zero config; restart to take effect.' },
      { icon: '🇨🇳', t: 'China-native skills', d: 'Chinese code-review phrasing, commit conventions, doc typography, and domestic Git platforms (Gitee/Coding/JiHu) — not in upstream.' },
      { icon: '📖', t: 'Fully localized upstream', d: 'Tracks obra/superpowers (233k+ ⭐); every core skill localized into native Chinese — calibrated, not machine-translated.' },
      { icon: '🔓', t: 'Zero-dep · MIT', d: 'Pure Markdown skills. No external deps, no network, no code upload. Triggered on demand with zero runtime cost.' },
    ],
    pipeline: [
      { n: 'Brainstorm', d: 'Clarify intent before coding' },
      { n: 'Plan', d: 'Break work into steps' },
      { n: 'TDD', d: 'Test first, then implement' },
      { n: 'Debug', d: 'Reproduce & locate first' },
      { n: 'Review', d: 'Rigorous pre-merge check' },
      { n: 'Verify', d: 'Prove it with evidence' },
    ],
    usecases: [
      { tag: 'New feature', skills: 'brainstorming → writing-plans → TDD', desc: 'AI questions the requirements, writes a plan, then builds test-first — instead of dumping code immediately.' },
      { tag: 'Fixing a bug', skills: 'systematic-debugging', desc: 'Forces reproduce-and-locate-root-cause before any fix — no more "guess and tweak" loops.' },
      { tag: 'Before merge', skills: 'verification-before-completion → code-review', desc: 'Must run verification with evidence, then a review pass, before claiming "done".' },
      { tag: 'CN team workflow', skills: 'chinese-commit-conventions → chinese-code-review', desc: 'Chinese commit conventions + tiered review phrasing, wired for Gitee / Coding / JiHu GitLab.' },
    ],
    faq: [
      { q: 'Is superpowers-zh free?', a: 'Completely free. MIT-licensed open source, forever, with no paywall or subscription.' },
      { q: 'Which AI coding tools are supported?', a: '18 tools: Claude Code, Cursor, Windsurf, Codex CLI, Gemini CLI, Kiro, Trae, Qoder, Aider, OpenCode, Qwen Code, Antigravity, DeerFlow, VS Code (Copilot), Copilot CLI, Hermes Agent, Claw Code, OpenClaw.' },
      { q: 'What makes superpowers-zh unique?', a: 'A fully localized, battle-tested methodology framework for Chinese developers: brainstorming, planning, TDD, debugging, and code-review skills, plus 4 China-native skills (code review / Git workflow / docs / commit conventions), adapted for 18 AI coding tools. MIT-licensed and free forever.' },
      { q: 'How does it take effect after install?', a: 'npx installs skill files into your tool\'s directory (e.g. .claude/skills/). After restarting your AI tool, it auto-triggers the right skill at the right moment — no manual invocation needed.' },
      { q: 'Will it slow my AI down or upload my code?', a: 'No. Skills are on-demand Markdown: zero runtime, no network, no code or data upload — everything stays local.' },
      { q: 'How do I update or uninstall?', a: 'Update: re-run npx superpowers-zh to overwrite. Uninstall: npx superpowers-zh --uninstall removes installed skills and bootstrap files.' },
    ],
  },
};

// ---- 读取 skills（含正文） ----
function loadSkills() {
  const skills = [];
  for (const entry of readdirSync(SKILLS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const file = join(SKILLS_DIR, entry.name, 'SKILL.md');
    if (!existsSync(file)) continue;
    const raw = readFileSync(file, 'utf8');
    const fm = parseFrontmatter(raw);
    const meta = SKILL_META[entry.name] || { title: entry.name, titleEn: entry.name, descEn: '', group: 'flow' };
    skills.push({
      name: fm.name || entry.name,
      title: meta.title, titleEn: meta.titleEn,
      group: meta.group,
      desc: (fm.description || '').trim(),
      descEn: meta.descEn || '',
      china: meta.group === 'china',
      raw,
    });
  }
  const order = GROUPS.map(g => g.id);
  skills.sort((a, b) => {
    if (a.name === 'using-superpowers') return -1;
    if (b.name === 'using-superpowers') return 1;
    return order.indexOf(a.group) - order.indexOf(b.group);
  });
  return skills;
}

// ---- 公共布局 ----
// base: 资源相对前缀（'' / '../' / '../../'）；langHref: 切换语言的目标 URL
function layout({ lang, base, title, desc, body, langHref, extraHead = '' }) {
  const t = T[lang];
  const other = lang === 'zh' ? 'EN' : '中文';
  return `<!DOCTYPE html>
<html lang="${t.htmlLang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-L02QK4EVDL"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-L02QK4EVDL');</script>
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<link rel="icon" href="/assets/app-icon.png">
<link rel="stylesheet" href="/styles.css?v=${cssVer}">
<script>(function(){try{var m=localStorage.getItem('sp-theme');if(m==='light')document.documentElement.setAttribute('data-theme','light');}catch(e){}})();</script>
${extraHead}</head>
<body>
<header class="nav">
  <a class="brand" href="${base}index.html">
    <img src="/assets/superpowers-small.svg" alt="" width="26" height="26">
    <span>superpowers<b>-zh</b></span>
  </a>
  <nav>
    <a href="${base}index.html#why">${t.nav.why}</a>
    <a href="${base}index.html#install">${t.nav.install}</a>
    <a href="${base}index.html#skills">${t.nav.skills}</a>
    <a href="${base}index.html#faq">${t.nav.faq}</a>
    <a href="https://github.com/jnMetaCode/superpowers-zh" target="_blank" rel="noopener">${t.nav.github}</a>
    <a class="lang-switch" href="${langHref}">${other}</a>
    <button class="theme-btn" id="themeBtn" aria-label="theme" title="切换主题">◐</button>
  </nav>
</header>
${body}
<footer>
  <div class="foot-qr">
    <h4 class="qr-title">${t.followUs}</h4>
    <div class="qr-row">
      <figure class="qr-card"><img src="/assets/qr-wechat.jpg" alt="${esc(t.qrWechat)}" width="158" loading="lazy"><figcaption>${t.qrWechat}</figcaption></figure>
      <figure class="qr-card"><img src="/assets/qr-douyin.jpg" alt="${esc(t.qrDouyin)}" width="158" loading="lazy"><figcaption>${t.qrDouyin}</figcaption></figure>
    </div>
  </div>
  <div class="foot-inner foot-cols">
    <div class="foot-brand">
      <strong>superpowers<b>-zh</b></strong>
      <span>${t.footTag}</span>
    </div>
    ${t.footCols.map(col => `<div class="foot-col"><h4>${col.h}</h4>${col.links.map(l => `<a href="${l[1]}"${l[1].startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${l[0]}</a>`).join('')}</div>`).join('')}
  </div>
  <p class="copyright">${t.copyright}</p>
</footer>
<script src="/app.js?v=${jsVer}"></script>
</body>
</html>`;
}

// ---- 首页正文 ----
function renderLanding(skills, lang) {
  const t = T[lang];
  const total = skills.length;
  const cnCount = skills.filter(s => s.china).length;
  const toolData = JSON.stringify(TOOLS.map(x => ({ name: x.name, cmd: x.cmd, auto: x.auto })));
  const fill = (s, map) => s.replace(/\{(\w+)\}/g, (_, k) => map[k]);

  const cards = skills.map(s => {
    const title = lang === 'zh' ? s.title : s.titleEn;
    const d = lang === 'zh' ? s.desc : (s.descEn || s.desc);
    return `
      <a class="card" href="skills/${esc(s.name)}.html" data-group="${s.group}" data-name="${esc(s.name)}" data-title="${esc(title)}">
        <div class="card-head"><h3>${esc(title)}</h3>${s.china ? `<span class="tag tag-cn">${t.tagCn}</span>` : ''}</div>
        <code class="card-id">${esc(s.name)}</code>
        <p>${esc(d)}</p>
        <span class="card-more">${t.skDetail}</span>
      </a>`;
  }).join('');

  const filters = GROUPS.map((g, i) =>
    `<button class="chip${i === 0 ? ' active' : ''}" data-filter="${g.id}">${lang === 'zh' ? g.zh : g.en}</button>`).join('');
  const toolOpts = TOOLS.map((x, i) => `<option value="${i}">${esc(x.name)}${x.auto ? '' : '（--tool）'}</option>`).join('');
  const toolWall = TOOLS.map(x => `<div class="tool-pill"><span class="tool-name">${esc(x.name)}</span><span class="tool-type">${esc(x.type)}</span></div>`).join('');
  const feats = t.features.map(f => `<article class="feat"><div class="feat-icon">${f.icon}</div><h3>${esc(f.t)}</h3><p>${esc(f.d)}</p></article>`).join('');
  const pipe = t.pipeline.map((p, i) => `<div class="pl-step"><div class="pl-num">${i + 1}</div><div class="pl-body"><b>${esc(p.n)}</b><span>${esc(p.d)}</span></div></div>${i < t.pipeline.length - 1 ? '<div class="pl-arrow">→</div>' : ''}`).join('');
  const ucs = t.usecases.map(u => `<article class="usecase"><span class="uc-tag">${esc(u.tag)}</span><code class="uc-skills">${esc(u.skills)}</code><p>${esc(u.desc)}</p></article>`).join('');
  const faqs = t.faq.map(f => `<details class="faq-item"><summary>${esc(f.q)}</summary><div class="faq-a">${esc(f.a)}</div></details>`).join('');

  return `
<main id="top">
  <section class="hero">
    <div class="badge">${t.heroBadge}</div>
    <h1>${t.heroH1}</h1>
    <p class="lead">${fill(t.heroLead, { n: total })}</p>
    <div class="cmd-hero" data-copy="npx superpowers-zh"><code>$ npx superpowers-zh</code><button class="copy-btn">${t.copy}</button></div>
    <div class="hero-cta">
      <a class="btn btn-primary" href="#install">${t.heroBtn1}</a>
      <a class="btn btn-ghost" href="https://github.com/jnMetaCode/superpowers-zh" target="_blank" rel="noopener">${t.heroBtn2}</a>
    </div>
    <div class="stats">
      <div><b>${total}</b><span>${t.stats[0]}</span></div>
      <div><b>${cnCount}</b><span>${t.stats[1]}</span></div>
      <div><b>18</b><span>${t.stats[2]}</span></div>
      <div><b>v${PKG.version}</b><span>${t.stats[3]}</span></div>
    </div>
  </section>

  <section id="why" class="why">
    <h2 class="section-title">${t.whyTitle}</h2>
    <p class="section-sub">${t.whySub}</p>
    <div class="feat-grid">${feats}</div>
  </section>

  <section class="pipeline">
    <h2 class="section-title">${t.plTitle}</h2>
    <p class="section-sub">${t.plSub}</p>
    <div class="pl-track">${pipe}</div>
  </section>

  <section class="compare">
    <h2 class="section-title">${t.cmpTitle}</h2>
    <div class="compare-grid">
      <div class="compare-col bad"><div class="compare-label">${t.cmpBad}</div><pre>${esc(t.cmpBadPre)}</pre></div>
      <div class="compare-col good"><div class="compare-label">${t.cmpGood}</div><pre>${esc(t.cmpGoodPre)}</pre></div>
    </div>
  </section>

  <section id="install" class="install">
    <h2 class="section-title">${t.instTitle}</h2>
    <p class="section-sub">${t.instSub}</p>
    <div class="install-box">
      <label for="toolSel">${t.instLabel}</label>
      <select id="toolSel">${toolOpts}</select>
      <div class="cmd-out" data-copy="npx superpowers-zh"><code id="cmdText">npx superpowers-zh</code><button class="copy-btn">${t.copy}</button></div>
      <p class="install-note" id="installNote"></p>
    </div>
  </section>

  <section id="skills" class="skills">
    <h2 class="section-title">${fill(t.skTitle, { n: total })}</h2>
    <p class="section-sub">${t.skSub}</p>
    <div class="skill-controls">
      <input id="search" type="search" placeholder="${esc(t.skSearch)}" autocomplete="off">
      <div class="chips">${filters}</div>
    </div>
    <div class="grid" id="grid">${cards}</div>
    <p class="empty" id="empty" hidden>${t.skEmpty}</p>
  </section>

  <section class="usecases">
    <h2 class="section-title">${t.ucTitle}</h2>
    <p class="section-sub">${t.ucSub}</p>
    <div class="uc-grid">${ucs}</div>
  </section>

  <section id="tools" class="tools">
    <h2 class="section-title">${t.toolsTitle}</h2>
    <p class="section-sub">${t.toolsSub}</p>
    <div class="tool-wall">${toolWall}</div>
  </section>

  <section id="faq" class="faq">
    <h2 class="section-title">${t.faqTitle}</h2>
    <div class="faq-list">${faqs}</div>
  </section>

  <section class="book"><div class="book-inner"><div>
    <h2>${t.bookTitle}</h2><p>${t.bookDesc}</p>
    <a class="btn btn-primary" href="https://book.aibuzhiyu.com/" target="_blank" rel="noopener">${t.bookBtn}</a>
  </div></div></section>

  <section class="sponsor">
    <h2 class="section-title">${t.sponsorTitle}</h2>
    <a class="sponsor-card" href="https://www.5cookie.cc/sign-up?aff=Pj7u" target="_blank" rel="noopener">
      <img src="assets/sponsors/5cookie-code.png" alt="5Cookie Code" width="160">
      <div><b>5Cookie Code</b><span>${t.sponsorDesc}</span></div>
    </a>
    <p class="sponsor-cta">${t.sponsorCta}</p>
  </section>

  <section class="cta"><div class="cta-inner">
    <h2>${t.ctaTitle}</h2><p>${fill(t.ctaDesc, { n: total })}</p>
    <div class="cta-cmd" data-copy="npx superpowers-zh"><code>$ npx superpowers-zh</code><button class="copy-btn">${t.copy}</button></div>
    <div class="hero-cta">
      <a class="btn btn-primary" href="#install">${t.ctaBtn1}</a>
      <a class="btn btn-ghost" href="https://github.com/jnMetaCode/superpowers-zh" target="_blank" rel="noopener">${t.ctaBtn2}</a>
    </div>
  </div></section>
</main>
<script>window.__TOOLS__=${toolData};window.__I18N__={auto:${JSON.stringify(t.instNoteAuto)},manual:${JSON.stringify(t.instNoteManual)},copy:${JSON.stringify(t.copy)},copied:${JSON.stringify(t.copied)}};</script>`;
}

// ---- skill 详情(操作文档)页正文 ----
function renderDetail(skill, lang) {
  const t = T[lang];
  const title = lang === 'zh' ? skill.title : skill.titleEn;
  const bodyHtml = renderMarkdown(skill.raw);
  const cnNotice = lang === 'en'
    ? '<div class="doc-notice">📖 This skill\'s content is written in Chinese — superpowers-zh is a Chinese-localized toolkit.</div>'
    : '';
  const srcUrl = `https://github.com/jnMetaCode/superpowers-zh/blob/main/skills/${skill.name}/SKILL.md`;
  return `
<main class="doc">
  <a class="doc-back" href="index.html#skills">${t.backToSkills}</a>
  <header class="doc-head">
    <div class="doc-titles">
      <h1>${esc(title)}</h1>
      <code>${esc(skill.name)}</code>
      ${skill.china ? `<span class="tag tag-cn">${t.tagCn}</span>` : ''}
    </div>
    <p class="doc-lead">${esc(lang === 'zh' ? skill.desc : (skill.descEn || skill.desc))}</p>
    <div class="doc-actions">
      <div class="cmd-out doc-cmd" data-copy="npx superpowers-zh"><code>$ npx superpowers-zh</code><button class="copy-btn">${t.copy}</button></div>
      <a class="btn btn-ghost" href="${srcUrl}" target="_blank" rel="noopener">${t.detailSource}</a>
    </div>
  </header>
  ${cnNotice}
  <article class="doc-body">${bodyHtml}</article>
  <a class="doc-back" href="index.html#skills">${t.backToSkills}</a>
</main>
<script>window.__I18N__={copy:${JSON.stringify(t.copy)},copied:${JSON.stringify(t.copied)}};</script>`;
}

// ---- 构建 ----
function build() {
  const skills = loadSkills();
  rmSync(DIST, { recursive: true, force: true });
  mkdirSync(join(DIST, 'assets', 'sponsors'), { recursive: true });
  mkdirSync(join(DIST, 'skills'), { recursive: true });
  mkdirSync(join(DIST, 'en', 'skills'), { recursive: true });

  // 资源
  copyFileSync(join(TEMPLATE, 'styles.css'), join(DIST, 'styles.css'));
  copyFileSync(join(TEMPLATE, 'app.js'), join(DIST, 'app.js'));
  copyFileSync(join(ROOT, 'assets', 'app-icon.png'), join(DIST, 'assets', 'app-icon.png'));
  copyFileSync(join(ROOT, 'assets', 'superpowers-small.svg'), join(DIST, 'assets', 'superpowers-small.svg'));
  copyFileSync(join(ROOT, 'assets', 'sponsors', '5cookie-code.png'), join(DIST, 'assets', 'sponsors', '5cookie-code.png'));
  copyFileSync(join(TEMPLATE, 'assets', 'qr-wechat.jpg'), join(DIST, 'assets', 'qr-wechat.jpg'));
  copyFileSync(join(TEMPLATE, 'assets', 'qr-douyin.jpg'), join(DIST, 'assets', 'qr-douyin.jpg'));

  // 中文站（根）
  writeFileSync(join(DIST, 'index.html'), layout({
    lang: 'zh', base: '', title: T.zh.title, desc: T.zh.desc,
    body: renderLanding(skills, 'zh'), langHref: 'en/index.html',
  }));
  // 英文站（/en/）
  writeFileSync(join(DIST, 'en', 'index.html'), layout({
    lang: 'en', base: '../', title: T.en.title, desc: T.en.desc,
    body: renderLanding(skills, 'en'), langHref: '../index.html',
  }));

  // 详情(操作文档)页 ×2 语言
  for (const s of skills) {
    writeFileSync(join(DIST, 'skills', `${s.name}.html`), layout({
      lang: 'zh', base: '../', title: `${s.title} · superpowers-zh`, desc: s.desc,
      body: renderDetail(s, 'zh'), langHref: `../en/skills/${s.name}.html`,
    }));
    writeFileSync(join(DIST, 'en', 'skills', `${s.name}.html`), layout({
      lang: 'en', base: '../../', title: `${s.titleEn} · superpowers-zh`, desc: s.descEn || s.desc,
      body: renderDetail(s, 'en'), langHref: `../../skills/${s.name}.html`,
    }));
  }

  // 收集所有生成页面里的内联 <script> 内容，算 SHA-256 作为 CSP hash 白名单。
  // 本站脚本由本生成器产出（可信），用 hash 即可严格禁用 'unsafe-inline'/'unsafe-eval'
  // 而不误伤自有内联脚本——注入的外来脚本则被 CSP 拦截。
  const scriptHashes = new Set();
  const collectScriptHashes = (dir) => {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, ent.name);
      if (ent.isDirectory()) { collectScriptHashes(p); continue; }
      if (!ent.name.endsWith('.html')) continue;
      const html = readFileSync(p, 'utf8');
      for (const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
        scriptHashes.add("'sha256-" + createHash('sha256').update(m[1], 'utf8').digest('base64') + "'");
      }
    }
  };
  collectScriptHashes(DIST);

  // 严格 CSP：脚本仅允许 'self' + 本站内联脚本的 hash（含 GA 内联配置块，自动收集）；
  // 样式仅 'self'；禁用插件/内联事件；锁死 base-uri 与 frame 祖先。
  // Google Analytics (gtag) 需放行 googletagmanager（加载器）与 analytics（上报）域名。
  const GA_SCRIPT = 'https://www.googletagmanager.com';
  const GA_CONNECT = 'https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com';
  const csp = [
    "default-src 'self'",
    "script-src 'self' " + GA_SCRIPT + ' ' + [...scriptHashes].join(' '),
    "style-src 'self'",
    "img-src 'self' data: https://www.google-analytics.com https://www.googletagmanager.com",
    "font-src 'self'",
    "connect-src 'self' " + GA_CONNECT,
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
  ].join('; ');

  // Cloudflare Pages：全站安全响应头（/*）+ 缓存策略（静态资源长缓存，HTML 不缓存）
  writeFileSync(join(DIST, '_headers'),
    '/*\n' +
    '  Content-Security-Policy: ' + csp + '\n' +
    '  X-Content-Type-Options: nosniff\n' +
    '  X-Frame-Options: DENY\n' +
    '  Referrer-Policy: no-referrer\n' +
    '  Cross-Origin-Opener-Policy: same-origin\n' +
    '  Permissions-Policy: geolocation=(), microphone=(), camera=()\n' +
    '/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n' +
    '/styles.css\n  Cache-Control: public, max-age=86400\n' +
    '/app.js\n  Cache-Control: public, max-age=86400\n' +
    '/*.html\n  Cache-Control: public, max-age=0, must-revalidate\n');

  const pages = 2 + skills.length * 2;
  console.log(`✅ 生成 ${pages} 个页面：中/英首页 + ${skills.length} 个 skill × 2 语言详情页 → ${DIST}`);
}

build();
