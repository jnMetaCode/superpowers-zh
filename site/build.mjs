#!/usr/bin/env node
// superpowers-zh 官网生成器 —— 零依赖。
// 服务端生成简体/英文/繁体三套静态页 + 每个 skill 的详情(操作文档)页。
// skill 卡片与详情正文均直接读取 ../skills/*/SKILL.md，与源文件同步、不漂移。

import {
  readFileSync, writeFileSync, mkdirSync, readdirSync,
  existsSync, copyFileSync, rmSync,
} from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { execFileSync } from 'child_process';
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
// og 图的内容 hash：社交平台会长期缓存分享图，URL 不变就永远抓不到新图
const ogVer = createHash('sha256').update(readFileSync(join(ROOT, 'assets', 'og-image.jpg'))).digest('hex').slice(0, 10);

// sitemap 的 lastmod 取「这一页对应的源文件最后一次提交的日期」，而不是构建当天。
// 原来 66 条 URL 共用构建日期：页面几个月没动过也天天报「今天改的」。Google 明确
// 说过 lastmod 长期不可靠就会被忽略 —— 那这个字段等于白写。顺带它还让构建不可复现。
//
// 浅克隆（fetch-depth:1）里 git 只有一个提交，按路径查会全部返回同一天；因此部署
// workflow 已改为 fetch-depth: 0。拿不到 git 时回退到构建日期，不让构建失败。
const BUILD_DATE = new Date().toISOString().slice(0, 10);
function lastCommitDate(paths) {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cs', '--', ...paths],
      { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(out) ? out : BUILD_DATE;
  } catch { return BUILD_DATE; }
}

// 从 RELEASE-NOTES.zh.md 读最新版本条目。
// 动机：v1.7.11 的全部意义是「六款工具此前装了不生效，请重装」，而官网此前
// 一个字都没提 —— 上周装过的用户来站上看不到任何提示。版本号不手写，从
// release notes 解析，再与 package.json 交叉校验，两边漂了就构建失败。
function latestRelease() {
  const md = readFileSync(join(ROOT, 'RELEASE-NOTES.zh.md'), 'utf8');
  const m = md.match(/^## v(\d+\.\d+\.\d+)\s*\(([\d-]+)\)/m);
  if (!m) throw new Error('RELEASE-NOTES.zh.md 里找不到形如「## v1.2.3 (2026-01-01)」的最新条目');
  return { version: m[1], date: m[2] };
}
const LATEST = latestRelease();
if (LATEST.version !== PKG.version) {
  throw new Error(`版本漂移：package.json 是 ${PKG.version}，RELEASE-NOTES.zh.md 最新条目是 v${LATEST.version} —— 发版时漏改了一边`);
}

// 首页发布提示条：一句话说清"这一版谁该更新、为什么"，内容摘自 release notes 该版本条目。
// version 必须等于 release notes 最新条目：版本号是自动读的，文案却要手写 ——
// v1.7.13、v1.7.14 发版时都没改，站上一直挂着 v1.7.12 的「技能之间互相调用会失败」。
const RELEASE_BANNER = {
  version: '1.8.0',
  zh: '所有用户建议更新 —— brainstorming 按上游 v7 重写：先弄清你想要什么，一次只问一个问题。另修复 SessionStart hook 在空 PATH 下丢失引导等问题。查看完整更新说明',
  en: 'Update recommended for everyone — brainstorming is rebuilt from upstream v7: it works out what you want first, one question at a time. Also fixes the SessionStart hook losing its bootstrap under an empty PATH, and more. Read the full release notes',
  zht: '所有使用者建議更新 —— brainstorming 按上游 v7 重寫：先弄清你想要什麼，一次只問一個問題。另修復 SessionStart hook 在空 PATH 下遺失引導等問題。檢視完整更新說明',
};
if (RELEASE_BANNER.version !== LATEST.version) {
  throw new Error(`首页发布提示条还是 v${RELEASE_BANNER.version} 的文案，release notes 最新是 v${LATEST.version} —— 发版时更新 site/build.mjs 的 RELEASE_BANNER`);
}

// 页脚二维码的真实像素尺寸，构建时从文件读取（见 imageSize 的注释）
const QR = {
  wechat: imageSize(join(TEMPLATE, 'assets', 'qr-wechat.jpg')),
  douyin: imageSize(join(TEMPLATE, 'assets', 'qr-douyin.png')),
  x:      imageSize(join(TEMPLATE, 'assets', 'qr-x.png')),
};

// SEO：站点根 URL（用于 canonical / hreflang / og:url / sitemap）
const SITE_URL = 'https://sp.aiolaola.com';
// 仓库源码基址（skill 详情页的相对链接解析到这里）
const GH_BLOB = 'https://github.com/jnMetaCode/superpowers-zh/blob/main';

// 读 PNG / JPEG 的真实像素尺寸（零依赖）。
// 用途：<img> 必须带 width+height，浏览器才能在图加载前按宽高比预留位置，
// 否则图一到位就把下面的内容顶下去（CLS）。页脚三个二维码此前只有 width。
// 不写死数字而是读文件：换二维码时属性自动跟着变，不会悄悄变回错的比例。
function imageSize(file) {
  const b = readFileSync(file);
  if (b.length > 24 && b[0] === 0x89 && b[1] === 0x50) {          // PNG: IHDR 定长在头部
    return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  }
  if (b[0] === 0xff && b[1] === 0xd8) {                            // JPEG: 逐段找 SOFn
    let i = 2;
    while (i < b.length - 9) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      // SOF0-SOF3 / SOF5-SOF7 / SOF9-SOF11 / SOF13-SOF15 都带尺寸；DHT(c4)/JPG(c8)/DAC(cc) 不是
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
        return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
      }
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  throw new Error(`无法解析图片尺寸：${file}`);
}

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
  'brainstorming':                { group: 'flow',    title: '头脑风暴',           titleEn: 'Brainstorming',            descEn: 'Find out what your human partner actually wants, and why, before building anything — features, behavior changes, or new work outside software.' },
  'writing-plans':                { group: 'flow',    title: '编写实现计划',       titleEn: 'Writing Plans',            descEn: 'Turn a spec into a step-by-step implementation plan before writing any code.' },
  'executing-plans':              { group: 'flow',    title: '执行计划',           titleEn: 'Executing Plans',          descEn: 'Execute a plan yourself in the current session — inline, with a ledger and one final review.' },
  'subagent-driven-development':  { group: 'flow',    title: '子代理驱动开发',     titleEn: 'Subagent-Driven Dev',      descEn: 'Run a plan of independent tasks within the current session via subagents.' },
  'dispatching-parallel-agents':  { group: 'flow',    title: '并行代理调度',       titleEn: 'Dispatching Parallel Agents', descEn: 'Fan out 2+ independent tasks with no shared state or ordering dependency.' },
  'workflow-runner':              { group: 'flow',    title: '工作流运行器',       titleEn: 'Workflow Runner',          descEn: 'Run agency-orchestrator YAML workflows directly using the current session LLM — no API key.' },
  'test-driven-development':      { group: 'quality', title: '测试驱动开发 · TDD', titleEn: 'Test-Driven Development',   descEn: 'Write the test before the implementation, for every feature and bug fix.' },
  'systematic-debugging':         { group: 'quality', title: '系统化调试',         titleEn: 'Systematic Debugging',     descEn: 'Reproduce and locate the root cause before proposing any fix.' },
  'diagnosing-superpowers':       { group: 'quality', title: '诊断 Superpowers',   titleEn: 'Diagnosing Superpowers',   descEn: 'When a session went wrong, read its transcripts and report what happened with path:line evidence — optionally as an issue.' },
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
  { id: 'all',     zh: '全部',          en: 'All', zht: '全部' },
  { id: 'flow',    zh: '工作流程',      en: 'Workflow', zht: '工作流程' },
  { id: 'quality', zh: '质量 · 测试 · 调试', en: 'Quality', zht: '品質 · 測試 · 除錯' },
  { id: 'review',  zh: '代码审查',      en: 'Code Review', zht: '程式碼審查' },
  { id: 'git',     zh: 'Git · 分支',    en: 'Git', zht: 'Git · 分支' },
  { id: 'meta',    zh: '元 · 构建',     en: 'Meta', zht: '元 · 建構' },
  { id: 'china',   zh: '🇨🇳 中国原创',  en: '🇨🇳 China-native', zht: '🇨🇳 中國原創' },
];

// ---- 支持的工具（与 bin/superpowers-zh.js 的 TARGETS 对齐） ----
// mode 决定安装命令与说明文案：
//   auto   —— installer 有该工具的检测标记，`npx superpowers-zh` 直接识别
//   manual —— 无检测标记（或与别的工具共用目录），必须 --tool 指定
//   global —— 项目级目录不被工具自动加载，只有 --global 装到用户级才生效（Hermes）
// 条目数必须等于对外宣称的工具数（TARGETS 22 条 + Copilot CLI 单独计数 = 23），
// scripts/audit.sh 会卡这一点。
const TOOLS = [
  { name: 'Claude Code',    type: 'CLI',    cmd: 'npx superpowers-zh',                          mode: 'auto' },
  { name: 'Cursor',         type: 'IDE',    cmd: 'npx superpowers-zh',                          mode: 'auto' },
  { name: 'Windsurf',       type: 'IDE',    cmd: 'npx superpowers-zh',                          mode: 'auto', doc: 'windsurf' },
  { name: 'Codex CLI',      type: 'CLI',    cmd: 'npx superpowers-zh',                          mode: 'auto', doc: 'codex' },
  { name: 'Gemini CLI',     type: 'CLI',    cmd: 'npx superpowers-zh',                          mode: 'auto', doc: 'gemini-cli' },
  { name: 'Kiro',           type: 'IDE',    cmd: 'npx superpowers-zh',                          mode: 'auto', doc: 'kiro' },
  { name: 'Trae',           type: 'IDE',    cmd: 'npx superpowers-zh',                          mode: 'auto', doc: 'trae' },
  { name: 'Qoder',          type: 'IDE',    cmd: 'npx superpowers-zh',                          mode: 'auto', doc: 'qoder' },
  { name: 'Aider',          type: 'CLI',    cmd: 'npx superpowers-zh',                          mode: 'auto', doc: 'aider' },
  { name: 'OpenCode',       type: 'CLI',    cmd: 'npx superpowers-zh',                          mode: 'auto', doc: 'opencode' },
  // Qwen Code = QwenLM/qwen-code 这个命令行工具（Gemini CLI 的 fork），不是通义灵码。
  { name: 'Qwen Code',      type: 'CLI',    cmd: 'npx superpowers-zh',                          mode: 'auto', doc: 'qwen' },
  // Antigravity 是 Google 的 AI IDE（antigravity.google），见 docs/README.antigravity.md。
  { name: 'Antigravity',    type: 'IDE',    cmd: 'npx superpowers-zh',                          mode: 'auto', doc: 'antigravity' },
  { name: 'DeerFlow 2.0',   type: 'Agent',  cmd: 'npx superpowers-zh',                          mode: 'auto', doc: 'deerflow' },
  { name: 'VS Code · Copilot', type: 'IDE', cmd: 'npx superpowers-zh',                          mode: 'auto', doc: 'vscode' },
  // Copilot CLI 与 Claude Code 共用 .claude/skills，别名 copilot -> Claude Code，
  // 它自己没有检测标记，所以必须 --tool 指定。
  { name: 'Copilot CLI',    type: 'CLI',    cmd: 'npx superpowers-zh --tool copilot',           mode: 'manual' },
  // Hermes 官方只自动加载 ~/.hermes/skills/，项目级目录要手写 config.yaml 才被发现，
  // 所以这里给的是 --global 的装法（与 README 的一键安装列一致）。
  { name: 'Hermes Agent',   type: 'CLI',    cmd: 'npx superpowers-zh --global --tool hermes',   mode: 'global', doc: 'hermes' },
  { name: 'Claw Code',      type: 'CLI',    cmd: 'npx superpowers-zh',                          mode: 'auto', doc: 'claw' },
  { name: 'OpenClaw',       type: 'CLI',    cmd: 'npx superpowers-zh',                          mode: 'auto', doc: 'openclaw' },
  { name: 'CodeBuddy',      type: 'IDE',    cmd: 'npx superpowers-zh',                          mode: 'auto', doc: 'codebuddy' },
  { name: 'CodeArts',       type: 'IDE',    cmd: 'npx superpowers-zh',                          mode: 'auto', doc: 'codearts' },
  // Cline / Kilo Code 的检测标记是 rules 目录（.clinerules / .kilocode），没建过规则的
  // 项目检测不到，与 README 一致给显式 --tool。
  { name: 'Cline',          type: 'IDE',    cmd: 'npx superpowers-zh --tool cline',             mode: 'manual', doc: 'cline' },
  { name: 'Kilo Code',      type: 'IDE',    cmd: 'npx superpowers-zh --tool kilocode',          mode: 'manual', doc: 'kilocode' },
  { name: 'Crush',          type: 'CLI',    cmd: 'npx superpowers-zh',                          mode: 'auto', doc: 'crush' },
  // ZCode（智谱）只有用户级路径有官方出处（zcode.z.ai/docs/skill），项目级不猜 —— 见 installer 注释
  { name: 'ZCode',          type: 'IDE',    cmd: 'npx superpowers-zh --global --tool zcode',    mode: 'global', doc: 'zcode' },
  { name: 'DeepSeek Harness', type: 'CLI', cmd: 'npx superpowers-zh',                          mode: 'auto', doc: 'deepseek-harness' },
  { name: 'Reasonix',       type: 'CLI',    cmd: 'npx superpowers-zh',                          mode: 'auto', doc: 'reasonix' },
];

// ---- 双语文案 ----
// ---- 赞助商（与 README / README.zh-Hant 的赞助商区块同源；改这里也要同步改 README） ----
// 注意：链接是赞助方的推广链接，外链一律带 rel="sponsored nofollow noopener"。
const SPONSORS = [
  {
    // 旗舰位：赞助商页顶部整块大图 + 两版 README 顶部优先展示。
    // 旗舰卡读 img（大 banner），不读 logo —— 见下方 assertSponsors 的校验。
    tier: 'flagship',
    img: 'apinebula.png', w: 1269, h: 337, code: 'agent',
    url: 'https://apinebula.ai/1Axi9F',
    name: { zh: 'APINEBULA', en: 'APINEBULA', zht: 'APINEBULA' },
    tagline: {
      zh: '一个接口，接入全球顶尖 AI 模型',
      en: 'One API for the world\u2019s leading AI models',
      zht: '一個介面，接入全球頂尖 AI 模型',
    },
    alt: {
      zh: 'APINEBULA —— 企业级 AI 聚合平台，一个接口接入 Claude、GPT、Gemini 等全球顶尖模型，价格低至 1 折',
      en: 'APINEBULA — enterprise AI aggregation platform with one API for Claude, GPT, Gemini and other leading models, from 10% of list price',
      zht: 'APINEBULA —— 企業級 AI 聚合平台，一個介面接入 Claude、GPT、Gemini 等全球頂尖模型，價格低至 1 折',
    },
    desc: {
      zh: '感谢 APINEBULA 大屏赞助本项目！APINEBULA 是银河录像局旗下的企业级 AI 聚合平台，背靠大平台资源，面向开发者、团队与企业用户提供稳定、高性价比的大模型 API 接入服务。平台聚合 Claude、GPT、Gemini 等主流满血模型，一个接口接入全球顶尖 AI 大模型，各大模型价格低至 1 折起，支持企业级高并发、正式合同、对公打款与开票服务，适合 AI 编程、Agent 开发、业务系统集成等多种场景！',
      en: 'Thanks to APINEBULA for its banner sponsorship of this project. APINEBULA is an enterprise AI aggregation platform from Galaxy Video Bureau. Backed by large-platform resources, it gives developers, teams and enterprises stable, cost-effective large-model API access. The platform aggregates full-capability Claude, GPT, Gemini and other leading models through one API, with pricing from 10% of list price. It supports enterprise concurrency, formal contracts, corporate payments and invoicing for AI coding, agent development, business-system integration and more.',
      zht: '感謝 APINEBULA 大屏贊助本專案！APINEBULA 是銀河錄像局旗下的企業級 AI 聚合平台，背靠大型平台資源，面向開發者、團隊與企業使用者提供穩定、高性價比的大型模型 API 接入服務。平台聚合 Claude、GPT、Gemini 等主流滿血模型，一個介面接入全球頂尖 AI 大型模型，各大模型價格低至 1 折起，支援企業級高併發、正式合約、對公付款與開票服務，適合 AI 編程、Agent 開發、業務系統整合等多種場景！',
    },
    perk: {
      zh: '🎁 通过本页链接注册并在充值时填写优惠码 agent，可享 9 折优惠',
      en: '🎁 Sign up via this link and enter code agent when topping up for 10% off',
      zht: '🎁 透過本頁連結註冊並在儲值時填寫優惠碼 agent，可享 9 折優惠',
    },
    perkShort: {
      zh: '充值时使用优惠码 agent 享 9 折',
      en: '10% off top-ups with code agent',
      zht: '儲值時使用優惠碼 agent 享 9 折',
    },
  },
  {
    tier: 'standard',
    img: '88api.jpg', w: 1254, h: 1254, code: '',
    logo: '88api.jpg',
    url: 'https://88api.ai/sign-up?aff=MvTX',
    name: { zh: '88API Token聚合平台', en: '88API Token Aggregation Platform', zht: '88API Token 聚合平台' },
    alt: {
      zh: '88API Token聚合平台 —— 聚合语言、编程、图片、视频与语音模型的一站式 AI API 平台',
      en: '88API Token Aggregation Platform — one-stop AI APIs for language, coding, image, video and speech models',
      zht: '88API Token 聚合平台 —— 聚合語言、編程、圖片、影片與語音模型的一站式 AI API 平台',
    },
    desc: {
      zh: '🧠 聚合 GPT、Claude、Gemini、Grok、DeepSeek、Kimi、GLM 等语言与编程模型；\n🎨 图片模型：GPT-Image、Gemini、Grok 等；\n🎬 视频模型：Seedance、Veo、MiniMax H3、Kling、Grok 等；\n🎙️ 语音能力：Whisper、TTS 等。从文案、出图、改图，到视频生成与配音',
      en: '🧠 GPT, Claude, Gemini, Grok, DeepSeek, Kimi, GLM and other language and coding models;\n🎨 Image models: GPT-Image, Gemini, Grok and more;\n🎬 Video models: Seedance, Veo, MiniMax H3, Kling, Grok and more;\n🎙️ Speech: Whisper, TTS and more—from copywriting, image generation and editing to video generation and voice-over',
      zht: '🧠 聚合 GPT、Claude、Gemini、Grok、DeepSeek、Kimi、GLM 等語言與編程模型；\n🎨 圖片模型：GPT-Image、Gemini、Grok 等；\n🎬 影片模型：Seedance、Veo、MiniMax H3、Kling、Grok 等；\n🎙️ 語音能力：Whisper、TTS 等。從文案、出圖、改圖，到影片生成與配音',
    },
    perk: {
      zh: '🎁新用户注册送体验额度，可以检测模型能力。站内有人工客服值守！',
      en: '🎁New users receive trial credit to evaluate model capabilities. Live human support is available!',
      zht: '🎁新使用者註冊即送體驗額度，可以檢測模型能力。站內有人工客服值守！',
    },
    note: {
      zh: '👉香港正规企业运营 稳定供应 全绿满血 不降智 提供发票',
      en: '👉Operated by a registered Hong Kong company · Stable supply · Full-capability models · No quality reduction · Invoices available',
      zht: '👉香港正規企業營運 穩定供應 全綠滿血 不降智 提供發票',
    },
    perkShort: {
      zh: '新用户注册送体验额度',
      en: 'Trial credit for new users',
      zht: '新使用者註冊即送體驗額度',
    },
  },
  {
    tier: 'standard',
    img: 'cubence.jpg', w: 800, h: 333, code: 'AGENCY',
    logo: 'logo-cubence-icon.png',
    url: 'https://cubence.com/signup?code=SCW29JP9',
    name: { zh: 'Cubence', en: 'Cubence', zht: 'Cubence' },
    tagline: {
      zh: '专业 AI API 网关 · 支持 Claude Code / Codex / Gemini',
      en: 'AI API gateway · Claude Code / Codex / Gemini',
      zht: '專業 AI API 閘道 · 支援 Claude Code / Codex / Gemini',
    },
    alt: {
      zh: 'Cubence — 专业 AI API 网关，稳定高效的 API 中转服务，支持 Claude Code、Codex、Gemini 等多种模型',
      en: 'Cubence — AI API gateway with stable relay service for Claude Code, Codex, Gemini and more',
      zht: 'Cubence — 專業 AI API 閘道，穩定高效的 API 中轉服務，支援 Claude Code、Codex、Gemini 等多種模型',
    },
    desc: {
      zh: '专业 AI API 网关，致力于提供稳定、高效的 API 中转服务。自 2025 年 9 月运营至今，支持 Claude Code、Codex、Gemini 等多种模型。',
      en: 'A professional AI API gateway focused on stable, efficient relay service. Running since September 2025, with support for Claude Code, Codex, Gemini and more.',
      zht: '專業 AI API 閘道，致力於提供穩定、高效的 API 中轉服務。自 2025 年 9 月營運至今，支援 Claude Code、Codex、Gemini 等多種模型。',
    },
    perk: {
      zh: '🎁 本项目用户专属优惠码 AGENCY，通过本页链接注册首次购买 9 折',
      en: '🎁 Code AGENCY for this project\u2019s users — 10% off your first purchase via this link',
      zht: '🎁 本專案使用者專屬優惠碼 AGENCY，透過本頁連結註冊首次購買 9 折',
    },
    perkShort: { zh: '首次购买 9 折优惠', en: '10% off your first purchase', zht: '首次購買 9 折優惠' },
  },
  {
    tier: 'standard',
    img: 'volcengine.png', w: 840, h: 200, code: '',
    logo: 'logo-volcengine-icon.png',
    url: 'https://www.volcengine.com/activity/ai618?utm_source=OWO&utm_medium=devrel-1&utm_campaign=hw&utm_term=superpowers-zh&utm_content=hw',
    name: { zh: '字节火山引擎', en: 'Volcano Engine by ByteDance', zht: '字節火山引擎' },
    tagline: {
      zh: '火山方舟 Agent/Coding Plan 国模套餐首购 9.9',
      en: 'Volcano Ark Agent/Coding Plans for Chinese models at ¥9.9 (first purchase)',
      zht: '火山方舟 Agent/Coding Plan 國模套餐首購 9.9',
    },
    alt: {
      zh: '字节火山引擎 —— 火山方舟 Agent/Coding Plan 国模套餐首购 9.9，注册免费领 2500w Token',
      en: 'Volcano Engine by ByteDance — Volcano Ark Agent/Coding Plans for Chinese models at ¥9.9 (first purchase), with 25M free tokens on sign-up',
      zht: '字節火山引擎 —— 火山方舟 Agent/Coding Plan 國模套餐首購 9.9，註冊免費領 2500w Token',
    },
    desc: {
      zh: '火山方舟 Agent/Coding Plan 国模套餐首购 9.9，支持 GLM-5.3、Kimi-K3、DeepSeek、MiniMax、Doubao 等，注册免费领 2500w Token，统一 API，适配编码与智能体开发。',
      en: 'Volcano Ark Agent/Coding Plans for Chinese models at ¥9.9 on first purchase, covering GLM-5.3, Kimi-K3, DeepSeek, MiniMax, Doubao and more. Get 25M free tokens on sign-up. One unified API, built for coding and agent development.',
      zht: '火山方舟 Agent/Coding Plan 國模套餐首購 9.9，支援 GLM-5.3、Kimi-K3、DeepSeek、MiniMax、Doubao 等，註冊免費領 2500w Token，統一 API，適配編碼與智慧體開發。',
    },
    perk: {
      zh: '🎁 注册免费领 2500w Token，立即前往火山引擎活动页面',
      en: '🎁 Get 25M free tokens on sign-up — head to the Volcano Engine campaign page',
      zht: '🎁 註冊免費領 2500w Token，立即前往火山引擎活動頁面',
    },
    perkShort: { zh: '注册免费领 2500w Token', en: '25M free tokens on sign-up', zht: '註冊免費領 2500w Token' },
  },
  {
    tier: 'standard',
    img: 'infistar.jpg', w: 1269, h: 337, code: '',
    logo: 'logo-infistar-icon.png',
    url: 'https://www.infistar.cc/register?aff=PDVTM2VS&ref_source=link',
    name: { zh: 'Infistar.cc 无限星河', en: 'Infistar.cc', zht: 'Infistar.cc 無限星河' },
    alt: {
      zh: 'Infistar.cc 无限星河 —— 全模型 API 服务，一个 API Key 接入 Claude、ChatGPT、Gemini、Kimi、GLM、DeepSeek，价格低至官方渠道 1 折',
      en: 'Infistar.cc — all-model API service: one API key for Claude, ChatGPT, Gemini, Kimi, GLM and DeepSeek, from 10% of official pricing',
      zht: 'Infistar.cc 無限星河 —— 全模型 API 服務，一個 API Key 接入 Claude、ChatGPT、Gemini、Kimi、GLM、DeepSeek，價格低至官方渠道 1 折',
    },
    desc: {
      zh: '提供高可用模型通道与多节点冗余，一个 API Key 接入 Claude、ChatGPT、Gemini、Kimi、GLM、DeepSeek 等模型，价格低至官方渠道 1 折；适配 Claude Code、Codex、Cursor、Windsurf、Kiro 等 AI 编程工具。',
      en: 'High-availability model channels with multi-node redundancy. One API key provides access to Claude, ChatGPT, Gemini, Kimi, GLM, DeepSeek and more from 10% of official pricing, with support for Claude Code, Codex, Cursor, Windsurf and Kiro.',
      zht: '提供高可用模型通道與多節點冗餘，一個 API Key 接入 Claude、ChatGPT、Gemini、Kimi、GLM、DeepSeek 等模型，價格低至官方渠道 1 折；適配 Claude Code、Codex、Cursor、Windsurf、Kiro 等 AI 編程工具。',
    },
    perk: {
      zh: '🎁 通过本页链接注册并完成首次调用，即可领取 5 美元等值测试额度',
      en: '🎁 Sign up via this link and make your first call to claim $5 in test credit',
      zht: '🎁 透過本頁連結註冊並完成首次呼叫，即可領取 5 美元等值測試額度',
    },
    perkShort: {
      zh: '注册并完成首次调用领 5 美元等值测试额度',
      en: '$5 test credit after your first call',
      zht: '註冊並完成首次呼叫領 5 美元等值測試額度',
    },
  },
];

// 赞助位是付费展示位，图挂了就是事故。旗舰卡读 img、常规卡读 logo，两条路径
// 各自需要的字段不同 —— 把 tier 从 flagship 改成 standard 而忘了配 logo，
// 页面上就是一个静默的碎图。构建时直接拦下来，不让它上线。
// 工具墙上挂的每个文档链接都必须真的存在 —— 官网链到 GitHub 上一个不存在的
// docs/README.*.md，就是又一条「编造出处」，而这正是本仓已经栽过的坑。
function assertToolDocs() {
  for (const x of TOOLS) {
    if (!x.doc) continue;
    const f = join(ROOT, 'docs', `README.${x.doc}.md`);
    if (!existsSync(f)) throw new Error(`工具 ${x.name} 的文档不存在：docs/README.${x.doc}.md`);
  }
}
assertToolDocs();

function assertSponsors() {
  for (const s of SPONSORS) {
    const need = s.tier === 'flagship' ? ['img', 'w', 'h', 'desc'] : ['logo', 'desc'];
    const missing = need.filter(k => !s[k]);
    if (missing.length) {
      throw new Error(`赞助商 ${s.name?.zh || '?'}（tier: ${s.tier}）缺字段：${missing.join(', ')}`);
    }
    for (const f of [s.img, s.logo].filter(Boolean)) {
      if (!existsSync(join(ROOT, 'assets', 'sponsors', f))) {
        throw new Error(`赞助商 ${s.name?.zh || '?'} 的素材不存在：assets/sponsors/${f}`);
      }
      // 声明的 w/h 必须与素材真实尺寸一致 —— 换了图忘了改数字，页面就按错的宽高比预留位置
      if (f === s.img) {
        const real = imageSize(join(ROOT, 'assets', 'sponsors', f));
        if (real.w !== s.w || real.h !== s.h) {
          throw new Error(`赞助商 ${s.name?.zh || '?'} 的 banner 尺寸对不上：声明 ${s.w}×${s.h}，实际 ${real.w}×${real.h}`);
        }
      }
    }
    const textKeys = s.tier === 'flagship'
      ? ['name', 'tagline', 'alt', 'desc', 'perk', 'perkShort']
      : ['name', 'alt', 'desc', 'perk', 'perkShort'];   // 常规卡不展示 tagline
    for (const k of textKeys) {
      for (const lang of ['zh', 'en', 'zht']) {
        if (!s[k]?.[lang]) throw new Error(`赞助商 ${s.name?.zh || '?'} 的 ${k} 缺 ${lang} 文案`);
      }
    }
  }
}
assertSponsors();

const T = {
  zh: {
    htmlLang: 'zh-CN',
    title: 'superpowers-zh · AI 编程超能力中文增强版',
    desc: 'superpowers（300k+ ⭐）完整汉化 + {cnCount} 个中国原创 skills，一条 npx 命令为 {toolCount} 款 AI 编程工具装上系统化工作方法论。',
    nav: { why: '特性', install: '安装', skills: 'Skills', tools: '支持工具', faq: 'FAQ', sponsors: '赞助商', learn: '学习 ↗', github: 'GitHub ↗' },
    heroBadge: 'superpowers 300k+ ⭐ · 完整汉化 + 中国原创',
    heroH1: '给你的 AI 编程工具<br>装上<span class="grad">真正会干活</span>的超能力',
    heroLead: '{n} 个经过实战验证的工作方法论 skill —— 从头脑风暴到 TDD，从系统化调试到代码审查。<br>一条命令，自动识别项目里的工具并安装。',
    heroBtn1: '查看安装命令', heroBtn2: 'GitHub 源码',
    stats: ['Skills', '中国原创', '支持工具', '当前版本'],
    skipToMain: '跳到主要内容',
    ogAlt: 'superpowers-zh —— AI 编程超能力中文增强版，一条 npx 命令为 {toolCount} 款 AI 编程工具装上系统化工作方法论',
    ogLocale: 'zh_CN',
    toolDocHint: '{name} 的专属安装指南',
    whyTitle: '为什么选择 superpowers-zh？',
    whySub: '不是又一套提示词模板 —— 是让 AI 真正按工程方法干活的系统化能力。',
    plTitle: '一条龙工作流，每一步都有 skill 把关',
    plSub: 'skill 之间彼此衔接，AI 会在合适的节点自动触发对应方法论。',
    cmpTitle: '装上之后，AI 不再"上来就写"',
    cmpBad: '❌ 没装', cmpGood: '✅ 装了 superpowers-zh',
    cmpBadPre: '你：给用户模块加个批量导出功能\nAI：好的，我来实现……（直接开写）\n    export async function exportUsers() { … }\n你：等等，格式不对，没分页，\n    大数据量会 OOM……',
    cmpGoodPre: '你：给用户模块加个批量导出功能\nAI：（触发 brainstorming）先问一句：\n    上次要导出用户数据，是谁、拿去做什么？\n你：运营每周导一次，几十万行，给 BI 用\nAI：我复述一下理解，你确认了再动手\n    → 写计划 → TDD → 验证 → 审查',
    instTitle: '选你的工具，拿到安装命令',
    instSub: '大多数工具 <code>npx superpowers-zh</code> 会自动识别项目目录并安装；识别不出的用 <code>--tool</code> 指定。',
    instLabel: '我用的是',
    instNoteAuto: '在你的项目根目录运行，<b>自动识别 {name}</b> 并安装。安装后重启工具即可生效。',
    instNoteManual: '{name} 无法自动识别，需用 <code>--tool</code> 显式指定。在项目根目录运行，安装后重启工具即可生效。',
    instNoteGlobal: '{name} 只会自动加载用户级目录，项目级要手写配置才生效 —— 所以直接用 <code>--global</code> 装到用户级，在任意目录运行即可。',
    skTitle: '{n} 个 Skill，覆盖开发全流程',
    skSub: '点击任意卡片查看完整操作文档。',
    skSearch: '搜索 skill…（如 调试 / review / TDD）',
    skEmpty: '没有匹配的 skill。',
    skDetail: '查看文档 →',
    tagCn: '中国原创',
    ucTitle: '典型使用场景', ucSub: '每个场景背后都是一组协同工作的 skill。',
    toolsTitle: '一套 skill，{toolCount} 款工具通用', toolsSub: '换工具不用换习惯，方法论跟着你走。',
    faqTitle: '常见问题',
    sponsorCta: '了解详情 ↗',
    sponsorNote: '以上为赞助商推广链接。',
    sp: {
      nav: '赞助商',
      title: '赞助商 · superpowers-zh',
      desc: 'superpowers-zh 免费开源、零依赖，由社区赞助商共同支持。本页列出全部赞助商及其为本项目用户提供的专属福利。',
      badge: '开源 · 社区支持',
      h1: '感谢每一位支持者',
      lead: 'superpowers-zh 是一个面向中文开发者的开源项目 —— 永久免费、MIT 协议、零依赖，不设付费墙。它由社区与赞助商共同支撑：本页的赞助位是付费展示位，也正是它们让项目能持续维护下去。我们把每一份支持，都视作让项目走得更远的力量。',
      becomeBtn: '♡ 成为赞助商',
      backBtn: '← 返回首页',
      expand: '展开全部 ∨',
      collapse: '收起 ∧',
      emptyTitle: '旗舰位虚位以待',
      emptyDesc: '本页顶部整块大图展位 + 专属行动按钮，同时在两版 README 顶部优先展示。长期合作可谈，邮件聊聊。',
      emptyBtn: '申请旗舰位 →',
      flagTitle: '旗舰赞助商',
      flagSub: '深度合作伙伴，长期为项目提供关键支持。旗舰位虚位以待，欢迎申请。',
      moreTitle: '更多赞助商',
      moreSub: '感谢这些持续支持本项目、并为用户提供专属优惠的赞助商。',
      visitFlag: '使用专属优惠访问 →',
      copyHint: '点击优惠码一键复制。',
      faqTitle: '常见问题',
      faq: [
        { q: '如何成为 superpowers-zh 的赞助商？', a: '邮件联系 jnMetaCode@qq.com，说明你的产品、目标人群和想要的展位形式。我们会回复可选方案、素材要求和上线时间。' },
        { q: '有哪些合作方案？', a: '分旗舰位与常规位两档：旗舰位在本页顶部单独成块展示，常规位在「更多赞助商」卡片区。两档都含 GitHub 简繁双版 README 展位与官网三语站点露出。具体以邮件沟通为准。' },
        { q: '谈完多久可以上线？', a: '素材齐全后改动会随下一次站点构建发布 —— 本站接的是仓库自动部署，推送即上线，通常当天可见。' },
        { q: '需要准备哪些素材？', a: '一张横版 banner（旗舰位约 1269×337，常规位约 800×368，JPG / PNG）、一句话定位、一段 100 字左右的介绍、落地链接，以及给本项目用户的专属优惠码或福利（可选）。常规位还需一枚方形小图标（约 36×36 显示）。' },
      ],
      listTitle: '当前赞助商',
      listSub: '感谢他们持续支持本项目，并为本项目用户提供专属福利。',
      perkTitle: '专属福利汇总',
      perkSub: '通过本页链接注册即可享受下列福利。',
      thSponsor: '赞助商', thPerk: '专属福利', thCode: '优惠码', thGo: '前往',
      goto: '前往 ↗', noCode: '—',
      benefitTitle: '成为赞助商可以获得什么',
      benefitSub: '面向 AI 编程开发者的精准展位 —— GitHub + 官网双通道曝光。',
      benefits: [
        { icon: '📖', t: 'GitHub README 展位', d: '在简体 / 繁体两版 README 顶部展示 banner + 介绍文案，覆盖 GitHub 上的全部访客。' },
        { icon: '🌐', t: '官网赞助商页展示', d: '官网赞助商页展示，导航栏常驻入口，中文 / EN / 繁體三语站点全部覆盖。' },
        { icon: '🎯', t: '精准开发者受众', d: '本项目用户是正在用 Claude Code / Cursor / Codex 等 {toolCount} 款 AI 编程工具的开发者 —— 模型与 API 服务的直接买家。' },
        { icon: '🎁', t: '专属优惠码展示', d: '你的专属优惠码 / 福利会在赞助商页的「福利汇总」表里单独列出，方便用户直接使用。' },
      ],
      ctaTitle: '想出现在这里？',
      ctaDesc: '欢迎邮件联系，我们会把展位形式、素材要求和上线时间一次说清。',
      ctaBtn: '✉ jnMetaCode@qq.com',
    },
    bookTitle: '装好之后，配上方法论效率翻倍',
    bookDesc: '《AI 编程实战 · 方法论三卷书》—— 10 个 AI 编程工具完整教程 + 真实踩坑。在线书 + PDF，永久免费。',
    bookBtn: '免费阅读 ↗',
    aiolaolaBtn: '免费学 AI 编程 · aiOlaOla ↗',
    ctaTitle: '准备好让 AI 真正会干活了吗？',
    ctaDesc: '一条命令，{n} 个实战方法论装进你的工具。免费、开源、零依赖。',
    ctaBtn1: '查看安装命令', ctaBtn2: '⭐ Star on GitHub',
    footCols: [
      { h: '产品', links: [['特性', '#why'], ['Skills', '#skills'], ['支持工具', '#tools'], ['FAQ', '#faq'], ['赞助商', 'sponsors.html']] },
      { h: '资源', links: [['GitHub', 'https://github.com/jnMetaCode/superpowers-zh'], ['npm', 'https://www.npmjs.com/package/superpowers-zh'], ['方法论三卷书', 'https://book.aibuzhiyu.com/']] },
      { h: '生态', links: [['aiOlaOla · 从零学会 AI 编程', 'https://aiolaola.com/?utm_source=sp1'], ['X / Twitter', 'https://x.com/jnMetaCode'], ['公众号 AI不止语', 'https://aiolaola.com/'], ['姐妹项目', 'https://github.com/jnMetaCode']] },
      { h: '社区', links: [['提交 Issue', 'https://github.com/jnMetaCode/superpowers-zh/issues'], ['贡献指南', 'https://github.com/jnMetaCode/superpowers-zh/blob/main/CLAUDE.md'], ['联系邮箱', 'mailto:jnMetaCode@qq.com']] },
    ],
    footTag: 'AI 编程超能力 · 中文增强版 · MIT License',
    copyright: '© 2026 superpowers-zh · MIT License',
    followUs: '扫码关注', qrWechat: '公众号 · AI不止语', qrDouyin: '抖音 · @AI不止语（AIBZY）', qrX: 'X / Twitter · @jnMetaCode',
    copy: '复制', copied: '已复制 ✓',
    backToSkills: '← 返回全部 Skill',
    detailInstall: '安装此 skill',
    detailSource: '在 GitHub 查看源文件 ↗',
    features: [
      { icon: '🧠', t: '{n} 个实战方法论', d: '不是 prompt 模板，是经过跨会话对抗式压力测试调优的工作方法论 —— 从头脑风暴到 TDD、调试、代码审查。' },
      { icon: '🔌', t: '{toolCount} 款工具通用', d: '一套 skill，Claude Code / Cursor / Codex / Gemini CLI / Windsurf… 全适配，换工具不用换习惯。' },
      { icon: '⚡', t: '一条命令安装', d: 'npx superpowers-zh 自动识别项目里用的是哪款工具并安装，零配置，装完重启即生效。' },
      { icon: '🇨🇳', t: '中国原创 Skills', d: '中文代码审查话术、中文提交规范、中文文档排版、国内 Git 平台（Gitee/Coding/极狐）配置 —— 上游没有。' },
      { icon: '📖', t: '完整汉化上游', d: '同步 obra/superpowers（300k+ ⭐），核心 skill 全部中文母语化，不是机翻，是逐条校准。' },
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
      { q: '支持哪些 AI 编程工具？', a: '共 {toolCount} 款：Claude Code、Cursor、Windsurf、Codex CLI、Gemini CLI、Kiro、Trae、Qoder、CodeBuddy（腾讯）、CodeArts（华为云码道）、Aider、OpenCode、Qwen Code、Antigravity、DeerFlow、VS Code(Copilot)、Copilot CLI、Hermes Agent、Claw Code、OpenClaw、Cline、Kilo Code、Crush、ZCode（智谱）、DeepSeek Harness、Reasonix。' },
      { q: 'superpowers-zh 有哪些独特价值？', a: '一套完整中文化的系统工作方法论：从头脑风暴、规划、TDD 到调试、代码审查，每个 skill 都是实战验证的工作流；并叠加 {cnCount} 个面向中国开发者的原创 skill（中文代码审查 / Git 工作流 / 文档规范 / 提交规范），适配 {toolCount} 款 AI 编程工具。MIT 协议开源，永久免费。' },
      { q: '安装后怎么生效？怎么确认装好了？', a: '重启 AI 工具，开一个新会话。npx 会把 skill 和引导文件装进工具对应的目录（如 .claude/skills/），工具启动时加载引导，之后会在恰当时机自动触发相应 skill，无需你每次手动调用。确认方法：在新会话里说「我想做个记账小程序」，装好的话它会先问你问题、弄清你想要什么，而不是直接开始写代码。' },
      { q: '能一次装好、所有项目都用吗？（全局安装）', a: '能。npx superpowers-zh --global 装到工具的用户级目录（如 ~/.claude/skills），所有项目自动共享，更新时只需重装一次。项目级优先、全局兜底，二者可共存。支持全局的工具（15 款，均为各工具文档确认的加载路径）：Claude Code / Codex CLI / Qoder / Windsurf / Qwen Code / OpenClaw / OpenCode / Hermes Agent / CodeBuddy / CodeArts / Crush / ZCode / DeepSeek Harness / Reasonix / TRAE CN；其余工具（含 Gemini / Antigravity，有各自专属全局方式）请在项目内安装或参考对应文档。' },
      { q: '会拖慢我的 AI 吗？会上传代码吗？', a: '不会。skill 是按需触发的纯 Markdown，零运行时、不联网、不上传任何代码或数据，全程在本地。' },
      { q: '怎么更新或卸载？', a: '按你当初的安装方式来，更新后都要重启工具。npx 项目级：在项目里重新运行 npx superpowers-zh 即更新到最新，npx superpowers-zh --uninstall 卸载。npx 全局：npx superpowers-zh --global 更新，npx superpowers-zh --global --uninstall 卸载。Claude Code 插件市场：先 claude plugin marketplace update superpowers-zh，再 claude plugin update superpowers-zh@superpowers-zh；卸载用 claude plugin uninstall superpowers-zh@superpowers-zh。Codex 插件、Gemini 扩展等工具自带的安装方式，按下方「支持工具」里对应工具的文档操作。' },
      { q: '装了没生效怎么办？', a: '先确认三件事：用的是哪种安装方式；是否最新（npx 安装直接重跑一次即可，插件市场用 claude plugin list 看版本）；装完是否重启并开了新会话。同一个项目里不要用插件市场和 npx 给 Claude Code 各装一份。仍然不行，可以让 diagnosing-superpowers 技能分析出问题的那次会话，它会整理成报告。到 GitHub 提 issue 时请附上：工具名和版本、安装命令、操作系统、你输入了什么、它实际做了什么。' },
    ],
  },
  en: {
    htmlLang: 'en',
    title: 'superpowers-zh · Battle-tested AI coding skills (CN-enhanced)',
    desc: 'Full Chinese localization of superpowers (300k+ ⭐) plus {cnCount} China-native skills. One npx command installs systematic workflow methodology into {toolCount} AI coding tools.',
    nav: { why: 'Features', install: 'Install', skills: 'Skills', tools: 'Tools', faq: 'FAQ', sponsors: 'Sponsors', learn: 'Learn ↗', github: 'GitHub ↗' },
    heroBadge: 'superpowers 300k+ ⭐ · Full CN localization + China-native skills',
    heroH1: 'Give your AI coding tools<br>superpowers that <span class="grad">actually ship</span>',
    heroLead: '{n} battle-tested workflow skills — from brainstorming to TDD, systematic debugging to code review.<br>One command auto-detects your tool and installs.',
    heroBtn1: 'Get the command', heroBtn2: 'GitHub',
    stats: ['Skills', 'China-native', 'Tools', 'Version'],
    skipToMain: 'Skip to main content',
    ogAlt: 'superpowers-zh — battle-tested AI coding skills, Chinese-enhanced; one npx command for {toolCount} AI coding tools',
    ogLocale: 'en_US',
    toolDocHint: 'Install guide for {name}',
    whyTitle: 'Why superpowers-zh?',
    whySub: 'Not another prompt-template pack — real engineering methodology that makes AI work properly.',
    plTitle: 'An end-to-end workflow, every step guarded by a skill',
    plSub: 'Skills chain together; the AI triggers the right methodology at the right moment.',
    cmpTitle: 'After install, AI stops "coding before thinking"',
    cmpBad: '❌ Without', cmpGood: '✅ With superpowers-zh',
    cmpBadPre: 'You: Add bulk export to the users module\nAI: Sure, implementing… (starts coding)\n    export async function exportUsers() { … }\nYou: Wait — wrong format, no paging,\n    it OOMs on large data…',
    cmpGoodPre: 'You: Add bulk export to the users module\nAI: (triggers brainstorming) One question:\n    who exported user data last time, and why?\nYou: Ops, weekly, ~300k rows, for BI\nAI: Here is what I understand — confirm first\n    → plan → TDD → verify → review',
    instTitle: 'Pick your tool, get the command',
    instSub: 'For most tools <code>npx superpowers-zh</code> auto-detects the project and installs; otherwise pass <code>--tool</code>.',
    instLabel: "I'm using",
    instNoteAuto: 'Run it in your project root — it <b>auto-detects {name}</b> and installs. Restart the tool to take effect.',
    instNoteManual: '{name} can\'t be auto-detected; pass <code>--tool</code> explicitly. Run in the project root, then restart the tool.',
    instNoteGlobal: '{name} only auto-loads its user-level directory — a project-level install needs manual config. Install with <code>--global</code> instead; run it from anywhere.',
    skTitle: '{n} skills, covering the whole dev workflow',
    skSub: 'Click any card for the full operating doc.',
    skSearch: 'Search skills… (e.g. debug / review / TDD)',
    skEmpty: 'No matching skills.',
    skDetail: 'Read docs →',
    tagCn: 'China-native',
    ucTitle: 'Typical use cases', ucSub: 'Each scenario is backed by a set of cooperating skills.',
    toolsTitle: 'One skill set, {toolCount} tools', toolsSub: 'Switch tools without switching habits — the methodology follows you.',
    faqTitle: 'FAQ',
    sponsorCta: 'Learn more ↗',
    sponsorNote: 'Links above are sponsored links.',
    sp: {
      nav: 'Sponsors',
      title: 'Sponsors · superpowers-zh',
      desc: 'superpowers-zh is free, open source and dependency-free, supported by community sponsors. This page lists every sponsor and the perks they offer to users of this project.',
      badge: 'Open source · Community backed',
      h1: 'Thanks to everyone who backs this project',
      lead: 'superpowers-zh is an open source project for Chinese-speaking developers — free forever, MIT licensed, dependency-free, no paywall. It is kept going by its community and its sponsors: the slots on this page are paid placements, and they are what makes continued maintenance possible. Every bit of support takes the project further.',
      becomeBtn: '♡ Become a sponsor',
      backBtn: '← Back to home',
      expand: 'Read more ∨',
      collapse: 'Show less ∧',
      emptyTitle: 'The flagship slot is open',
      emptyDesc: 'A full-width banner block at the top of this page with its own call-to-action button, plus priority placement at the top of both READMEs. Long-term partnerships welcome — drop us an email.',
      emptyBtn: 'Apply for the flagship slot →',
      flagTitle: 'Flagship sponsor',
      flagSub: 'A long-term partner backing this project. The flagship slot is open — get in touch.',
      moreTitle: 'More sponsors',
      moreSub: 'Thanks to everyone backing this project and offering perks to its users.',
      visitFlag: 'Claim the offer →',
      copyHint: 'Click a code to copy it.',
      faqTitle: 'FAQ',
      faq: [
        { q: 'How do I become a sponsor?', a: 'Email jnMetaCode@qq.com with your product, target audience and the placement you have in mind. We will reply with options, asset specs and timing.' },
        { q: 'What tiers are there?', a: 'Two: flagship, which gets its own block at the top of this page, and standard, which appears in the sponsor card grid. Both include placement in the Simplified and Traditional Chinese READMEs on GitHub and across all three site locales. Exact terms are settled over email.' },
        { q: 'How soon does it go live?', a: 'Once assets are in, the change ships with the next site build — the site deploys straight from the repo, so it is usually live the same day.' },
        { q: 'What assets do you need?', a: 'A landscape banner (around 1269×337 for the flagship slot, 800×368 for standard, JPG / PNG), a one-line positioning statement, a short paragraph of copy, a landing URL, and optionally a promo code or perk for this project\u2019s users. Standard slots also need a square icon (shown at 36×36).' },
      ],
      listTitle: 'Current sponsors',
      listSub: 'Thanks for backing this project — and for the perks they offer to its users.',
      perkTitle: 'All perks at a glance',
      perkSub: 'Sign up through the links on this page to claim them.',
      thSponsor: 'Sponsor', thPerk: 'Perk', thCode: 'Code', thGo: 'Go',
      goto: 'Visit ↗', noCode: '—',
      benefitTitle: 'What sponsors get',
      benefitSub: 'A focused placement in front of AI-coding developers — on GitHub and on the site.',
      benefits: [
        { icon: '📖', t: 'GitHub README placement', d: 'Banner plus copy at the top of both the Simplified and Traditional Chinese READMEs, seen by every GitHub visitor.' },
        { icon: '🌐', t: 'Website placement', d: 'Listed on the sponsors page, reachable from the main nav on every page, across all three locales (CN / EN / TW).' },
        { icon: '🎯', t: 'A developer audience', d: 'Our users are developers running Claude Code, Cursor, Codex and 23 other AI coding tools — direct buyers of model and API services.' },
        { icon: '🎁', t: 'Your promo code, listed', d: 'Your code or offer gets its own row in the perks table on this page, ready for users to copy.' },
      ],
      ctaTitle: 'Want your logo here?',
      ctaDesc: 'Drop us an email and we will walk you through placements, assets and timing in one go.',
      ctaBtn: '✉ jnMetaCode@qq.com',
    },
    bookTitle: 'Pair it with the methodology for 2× efficiency',
    bookDesc: '"AI Coding in Practice · The Three-Volume Methodology" — full tutorials for 10 AI coding tools plus real-world pitfalls. Online book + PDF, free forever.',
    bookBtn: 'Read free ↗',
    aiolaolaBtn: 'Learn AI coding free · aiOlaOla ↗',
    ctaTitle: 'Ready to make your AI actually ship?',
    ctaDesc: 'One command installs {n} battle-tested skills into your tool. Free, open-source, zero-dependency.',
    ctaBtn1: 'Get the command', ctaBtn2: '⭐ Star on GitHub',
    footCols: [
      { h: 'Product', links: [['Features', '#why'], ['Skills', '#skills'], ['Tools', '#tools'], ['FAQ', '#faq'], ['Sponsors', 'sponsors.html']] },
      { h: 'Resources', links: [['GitHub', 'https://github.com/jnMetaCode/superpowers-zh'], ['npm', 'https://www.npmjs.com/package/superpowers-zh'], ['Methodology book', 'https://book.aibuzhiyu.com/']] },
      { h: 'Ecosystem', links: [['aiOlaOla', 'https://aiolaola.com/?utm_source=sp1'], ['X / Twitter', 'https://x.com/jnMetaCode'], ['Sister projects', 'https://github.com/jnMetaCode']] },
      { h: 'Community', links: [['Open an Issue', 'https://github.com/jnMetaCode/superpowers-zh/issues'], ['Contributing', 'https://github.com/jnMetaCode/superpowers-zh/blob/main/CLAUDE.md'], ['Contact', 'mailto:jnMetaCode@qq.com']] },
    ],
    footTag: 'AI coding superpowers · Chinese-enhanced · MIT License',
    copyright: '© 2026 superpowers-zh · MIT License',
    followUs: 'Follow us', qrWechat: 'WeChat · AI不止语', qrDouyin: 'Douyin · @AI不止语 (AIBZY)', qrX: 'X / Twitter · @jnMetaCode',
    copy: 'Copy', copied: 'Copied ✓',
    backToSkills: '← Back to all skills',
    detailInstall: 'Install this skill set',
    detailSource: 'View source on GitHub ↗',
    features: [
      { icon: '🧠', t: '{n} battle-tested methods', d: 'Not prompt templates — workflow methodology hardened by cross-session adversarial testing, from brainstorming to TDD, debugging and review.' },
      { icon: '🔌', t: 'Works in {toolCount} tools', d: 'One skill set for Claude Code / Cursor / Codex / Gemini CLI / Windsurf and more. Switch tools, keep your habits.' },
      { icon: '⚡', t: 'One-command install', d: 'npx superpowers-zh auto-detects your tool and installs. Zero config; restart to take effect.' },
      { icon: '🇨🇳', t: 'China-native skills', d: 'Chinese code-review phrasing, commit conventions, doc typography, and domestic Git platforms (Gitee/Coding/JiHu) — not in upstream.' },
      { icon: '📖', t: 'Fully localized upstream', d: 'Tracks obra/superpowers (300k+ ⭐); every core skill localized into native Chinese — calibrated, not machine-translated.' },
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
      { q: 'Which AI coding tools are supported?', a: '{toolCount} tools: Claude Code, Cursor, Windsurf, Codex CLI, Gemini CLI, Kiro, Trae, Qoder, CodeBuddy (Tencent), CodeArts (Huawei), Aider, OpenCode, Qwen Code, Antigravity, DeerFlow, VS Code (Copilot), Copilot CLI, Hermes Agent, Claw Code, OpenClaw, Cline, Kilo Code, Crush, ZCode (Zhipu), DeepSeek Harness, Reasonix.' },
      { q: 'What makes superpowers-zh unique?', a: 'A fully localized, battle-tested methodology framework for Chinese developers: brainstorming, planning, TDD, debugging, and code-review skills, plus {cnCount} China-native skills (code review / Git workflow / docs / commit conventions), adapted for {toolCount} AI coding tools. MIT-licensed and free forever.' },
      { q: 'How does it take effect, and how do I check it works?', a: 'Restart your AI tool and open a new session. npx installs the skills and bootstrap files into your tool\'s directory (e.g. .claude/skills/); the tool loads the bootstrap at startup and then triggers the right skill at the right moment, with no manual invocation. To check: in a new session, say "Let\'s make a react todo list". If it is installed, it asks you questions to work out what you want before writing any code.' },
      { q: 'Can I install once for all projects? (global install)', a: 'Yes. npx superpowers-zh --global installs into the tool\'s user-level directory (e.g. ~/.claude/skills), shared across all projects; you only re-install once to update. Project-level takes precedence, global is the fallback — they coexist. Tools with global support (15 in total, all verified load paths per each tool\'s docs): Claude Code / Codex CLI / Qoder / Windsurf / Qwen Code / OpenClaw / OpenCode / Hermes Agent / CodeBuddy / CodeArts / Crush / ZCode / DeepSeek Harness / Reasonix / TRAE CN; other tools (incl. Gemini / Antigravity, which have their own global methods) should be installed per-project or via their docs.' },
      { q: 'Will it slow my AI down or upload my code?', a: 'No. Skills are on-demand Markdown: zero runtime, no network, no code or data upload — everything stays local.' },
      { q: 'How do I update or uninstall?', a: 'Use the same channel you installed with, and restart the tool afterwards. npx (project): re-run npx superpowers-zh in the project to get the latest; npx superpowers-zh --uninstall to remove. npx (global): npx superpowers-zh --global to update; npx superpowers-zh --global --uninstall to remove. Claude Code plugin marketplace: claude plugin marketplace update superpowers-zh, then claude plugin update superpowers-zh@superpowers-zh; remove with claude plugin uninstall superpowers-zh@superpowers-zh. For a tool\'s own channel (Codex plugin, Gemini extension, and so on), follow that tool\'s guide under Tools below.' },
      { q: 'It is installed but nothing happens. What now?', a: 'Check three things: which channel you installed with; that it is current (for npx, just re-run it; for the plugin marketplace, check the version in claude plugin list); and that you restarted and opened a new session. Don\'t install it for Claude Code twice in one project (marketplace plus npx). If it still fails, ask the diagnosing-superpowers skill to analyze the session that went wrong; it writes up a report. When opening a GitHub issue, include: tool and version, install command, OS, what you typed, and what it actually did.' },
    ],
  },
  zht: {
    htmlLang: 'zh-Hant',
    title: 'superpowers-zh · AI 編程超能力中文增強版',
    desc: 'superpowers（300k+ ⭐）完整漢化 + {cnCount} 個中國原創 skills，一條 npx 命令為 {toolCount} 款 AI 編程工具裝上系統化工作方法論。',
    nav: { why: '特性', install: '安裝', skills: 'Skills', tools: '支援工具', faq: 'FAQ', sponsors: '贊助商', learn: '學習 ↗', github: 'GitHub ↗' },
    heroBadge: 'superpowers 300k+ ⭐ · 完整漢化 + 中國原創',
    heroH1: '給你的 AI 編程工具<br>裝上<span class="grad">真正會幹活</span>的超能力',
    heroLead: '{n} 個經過實戰驗證的工作方法論 skill —— 從頭腦風暴到 TDD，從系統化除錯到程式碼審查。<br>一條命令，自動識別專案裡的工具並安裝。',
    heroBtn1: '查看安裝命令', heroBtn2: 'GitHub 原始碼',
    stats: ['Skills', '中國原創', '支援工具', '目前版本'],
    skipToMain: '跳到主要內容',
    ogAlt: 'superpowers-zh —— AI 編程超能力中文增強版，一條 npx 命令為 {toolCount} 款 AI 編程工具裝上系統化工作方法論',
    ogLocale: 'zh_TW',
    toolDocHint: '{name} 的專屬安裝指南',
    whyTitle: '為什麼選擇 superpowers-zh？',
    whySub: '不是又一套提示詞範本 —— 是讓 AI 真正按工程方法幹活的系統化能力。',
    plTitle: '一條龍工作流，每一步都有 skill 把關',
    plSub: 'skill 之間彼此銜接，AI 會在合適的節點自動觸發對應方法論。',
    cmpTitle: '裝上之後，AI 不再「上來就寫」',
    cmpBad: '❌ 沒裝', cmpGood: '✅ 裝了 superpowers-zh',
    cmpBadPre: '你：給使用者模組加個批次匯出功能\nAI：好的，我來實作……（直接開寫）\n    export async function exportUsers() { … }\n你：等等，格式不對，沒分頁，\n    大量資料會 OOM……',
    cmpGoodPre: '你：給使用者模組加個批次匯出功能\nAI：（觸發 brainstorming）先問一句：\n    上次要匯出使用者資料，是誰、拿去做什麼？\n你：營運每週匯一次，幾十萬行，給 BI 用\nAI：我複述一下理解，你確認了再動手\n    → 寫計畫 → TDD → 驗證 → 審查',
    instTitle: '選你的工具，拿到安裝命令',
    instSub: '大多數工具 <code>npx superpowers-zh</code> 會自動識別專案目錄並安裝；識別不出的用 <code>--tool</code> 指定。',
    instLabel: '我用的是',
    instNoteAuto: '在你的專案根目錄執行，<b>自動識別 {name}</b> 並安裝。安裝後重啟工具即可生效。',
    instNoteManual: '{name} 無法自動識別，需用 <code>--tool</code> 顯式指定。在專案根目錄執行，安裝後重啟工具即可生效。',
    instNoteGlobal: '{name} 只會自動載入使用者級目錄，專案級要手寫設定才生效 —— 所以直接用 <code>--global</code> 裝到使用者級，在任意目錄執行即可。',
    skTitle: '{n} 個 Skill，覆蓋開發全流程',
    skSub: '點擊任意卡片查看完整操作文件。',
    skSearch: '搜尋 skill…（如 除錯 / review / TDD）',
    skEmpty: '沒有符合的 skill。',
    skDetail: '查看文件 →',
    tagCn: '中國原創',
    ucTitle: '典型使用場景', ucSub: '每個場景背後都是一組協同工作的 skill。',
    toolsTitle: '一套 skill，{toolCount} 款工具通用', toolsSub: '換工具不用換習慣，方法論跟著你走。',
    faqTitle: '常見問題',
    sponsorCta: '了解詳情 ↗',
    sponsorNote: '以上為贊助商推廣連結。',
    sp: {
      nav: '贊助商',
      title: '贊助商 · superpowers-zh',
      desc: 'superpowers-zh 免費開源、零依賴，由社群贊助商共同支持。本頁列出全部贊助商及其為本專案使用者提供的專屬福利。',
      badge: '開源 · 社群支持',
      h1: '感謝每一位支持者',
      lead: 'superpowers-zh 是一個面向中文開發者的開源專案 —— 永久免費、MIT 協議、零依賴，不設付費牆。它由社群與贊助商共同支撐：本頁的贊助位是付費展示位，也正是它們讓專案能持續維護下去。我們把每一份支持，都視作讓專案走得更遠的力量。',
      becomeBtn: '♡ 成為贊助商',
      backBtn: '← 返回首頁',
      expand: '展開全部 ∨',
      collapse: '收起 ∧',
      emptyTitle: '旗艦位虛位以待',
      emptyDesc: '本頁頂部整塊大圖展位 + 專屬行動按鈕，同時在兩版 README 頂部優先展示。長期合作可談，郵件聊聊。',
      emptyBtn: '申請旗艦位 →',
      flagTitle: '旗艦贊助商',
      flagSub: '深度合作夥伴，長期為專案提供關鍵支持。旗艦位虛位以待，歡迎申請。',
      moreTitle: '更多贊助商',
      moreSub: '感謝這些持續支持本專案、並為使用者提供專屬優惠的贊助商。',
      visitFlag: '使用專屬優惠訪問 →',
      copyHint: '點選優惠碼一鍵複製。',
      faqTitle: '常見問題',
      faq: [
        { q: '如何成為 superpowers-zh 的贊助商？', a: '郵件聯絡 jnMetaCode@qq.com，說明你的產品、目標人群和想要的展位形式。我們會回覆可選方案、素材要求和上線時間。' },
        { q: '有哪些合作方案？', a: '分旗艦位與常規位兩檔：旗艦位在本頁頂部單獨成塊展示，常規位在「更多贊助商」卡片區。兩檔都含 GitHub 簡繁雙版 README 展位與官網三語站點露出。具體以郵件溝通為準。' },
        { q: '談完多久可以上線？', a: '素材齊全後改動會隨下一次站點構建釋出 —— 本站接的是倉庫自動部署，推送即上線，通常當天可見。' },
        { q: '需要準備哪些素材？', a: '一張橫版 banner（旗艦位約 1269×337，常規位約 800×368，JPG / PNG）、一句話定位、一段 100 字左右的介紹、落地連結，以及給本專案使用者的專屬優惠碼或福利（可選）。常規位還需一枚方形小圖示（約 36×36 顯示）。' },
      ],
      listTitle: '目前贊助商',
      listSub: '感謝他們持續支持本專案，並為本專案使用者提供專屬福利。',
      perkTitle: '專屬福利彙總',
      perkSub: '透過本頁連結註冊即可享受下列福利。',
      thSponsor: '贊助商', thPerk: '專屬福利', thCode: '優惠碼', thGo: '前往',
      goto: '前往 ↗', noCode: '—',
      benefitTitle: '成為贊助商可以獲得什麼',
      benefitSub: '面向 AI 編程開發者的精準展位 —— GitHub + 官網雙通道曝光。',
      benefits: [
        { icon: '📖', t: 'GitHub README 展位', d: '在簡體 / 繁體兩版 README 頂部展示 banner + 介紹文案，覆蓋 GitHub 上的全部訪客。' },
        { icon: '🌐', t: '官網贊助商頁展示', d: '官網贊助商頁展示，導覽列常駐入口，中文 / EN / 繁體三語站點全部覆蓋。' },
        { icon: '🎯', t: '精準開發者受眾', d: '本專案使用者是正在用 Claude Code / Cursor / Codex 等 {toolCount} 款 AI 編程工具的開發者 —— 模型與 API 服務的直接買家。' },
        { icon: '🎁', t: '專屬優惠碼展示', d: '你的專屬優惠碼 / 福利會在贊助商頁的「福利彙總」表裡單獨列出，方便使用者直接使用。' },
      ],
      ctaTitle: '想出現在這裡？',
      ctaDesc: '歡迎郵件聯絡，我們會把展位形式、素材要求和上線時間一次說清。',
      ctaBtn: '✉ jnMetaCode@qq.com',
    },
    bookTitle: '裝好之後，配上方法論效率翻倍',
    bookDesc: '《AI 編程實戰 · 方法論三卷書》—— 10 個 AI 編程工具完整教程 + 真實踩坑。線上書 + PDF，永久免費。',
    bookBtn: '免費閱讀 ↗',
    aiolaolaBtn: '免費學 AI 編程 · aiOlaOla ↗',
    ctaTitle: '準備好讓 AI 真正會幹活了嗎？',
    ctaDesc: '一條命令，{n} 個實戰方法論裝進你的工具。免費、開源、零依賴。',
    ctaBtn1: '查看安裝命令', ctaBtn2: '⭐ Star on GitHub',
    footCols: [
      { h: '產品', links: [['特性', '#why'], ['Skills', '#skills'], ['支援工具', '#tools'], ['FAQ', '#faq'], ['贊助商', 'sponsors.html']] },
      { h: '資源', links: [['GitHub', 'https://github.com/jnMetaCode/superpowers-zh'], ['npm', 'https://www.npmjs.com/package/superpowers-zh'], ['方法論三卷書', 'https://book.aibuzhiyu.com/']] },
      { h: '生態', links: [['aiOlaOla · 從零學會 AI 編程', 'https://aiolaola.com/?utm_source=sp1'], ['X / Twitter', 'https://x.com/jnMetaCode'], ['公眾號 AI不止語', 'https://aiolaola.com/'], ['姊妹專案', 'https://github.com/jnMetaCode']] },
      { h: '社群', links: [['提交 Issue', 'https://github.com/jnMetaCode/superpowers-zh/issues'], ['貢獻指南', 'https://github.com/jnMetaCode/superpowers-zh/blob/main/CLAUDE.md'], ['聯絡信箱', 'mailto:jnMetaCode@qq.com']] },
    ],
    footTag: 'AI 編程超能力 · 中文增強版 · MIT License',
    copyright: '© 2026 superpowers-zh · MIT License',
    followUs: '掃碼關注', qrWechat: '公眾號 · AI不止語', qrDouyin: '抖音 · @AI不止語（AIBZY）', qrX: 'X / Twitter · @jnMetaCode',
    copy: '複製', copied: '已複製 ✓',
    backToSkills: '← 返回全部 Skill',
    detailInstall: '安裝此 skill',
    detailSource: '在 GitHub 查看原始檔 ↗',
    features: [
      { icon: '🧠', t: '{n} 個實戰方法論', d: '不是 prompt 範本，是經過跨會話對抗式壓力測試調優的工作方法論 —— 從頭腦風暴到 TDD、除錯、程式碼審查。' },
      { icon: '🔌', t: '{toolCount} 款工具通用', d: '一套 skill，Claude Code / Cursor / Codex / Gemini CLI / Windsurf… 全適配，換工具不用換習慣。' },
      { icon: '⚡', t: '一條命令安裝', d: 'npx superpowers-zh 自動識別專案裡用的是哪款工具並安裝，零設定，裝完重啟即生效。' },
      { icon: '🇨🇳', t: '中國原創 Skills', d: '中文程式碼審查話術、中文提交規範、中文文件排版、國內 Git 平台（Gitee/Coding/極狐）設定 —— 上游沒有。' },
      { icon: '📖', t: '完整漢化上游', d: '同步 obra/superpowers（300k+ ⭐），核心 skill 全部中文母語化，不是機翻，是逐條校準。' },
      { icon: '🔓', t: '零依賴 · MIT 開源', d: '純 Markdown skill，不引入任何外部依賴、不連網、不上傳程式碼，按需觸發零執行時開銷。' },
    ],
    pipeline: [
      { n: '頭腦風暴', d: '動手前先理清意圖與需求' },
      { n: '寫計畫', d: '把需求拆成可執行步驟' },
      { n: 'TDD', d: '先寫測試再寫實作' },
      { n: '系統化除錯', d: '先重現定位再改' },
      { n: '程式碼審查', d: '合併前嚴謹驗收' },
      { n: '完成前驗證', d: '用證據證明真的好了' },
    ],
    usecases: [
      { tag: '開發新功能', skills: 'brainstorming → writing-plans → TDD', desc: 'AI 先反問需求、寫出實作計畫，再用測試驅動落地，而不是上來就糊一坨程式碼。' },
      { tag: '修 Bug', skills: 'systematic-debugging', desc: '強制先重現、定位根因，再提修復方案 —— 杜絕「猜一個改一下」的瞎試迴圈。' },
      { tag: '提交 / 合併前', skills: 'verification-before-completion → code-review', desc: '必須跑驗證命令、拿證據說話，再走一輪程式碼審查，才允許聲稱「完成」。' },
      { tag: '國內團隊協作', skills: 'chinese-commit-conventions → chinese-code-review', desc: '中文 commit 規範 + 分級 review 話術，配 Gitee / Coding / 極狐 GitLab 工作流。' },
    ],
    faq: [
      { q: 'superpowers-zh 是免費的嗎？', a: '完全免費。MIT 協議開源，永久免費，不含任何付費牆或訂閱。' },
      { q: '支援哪些 AI 編程工具？', a: '共 {toolCount} 款：Claude Code、Cursor、Windsurf、Codex CLI、Gemini CLI、Kiro、Trae、Qoder、CodeBuddy（騰訊）、CodeArts（華為雲碼道）、Aider、OpenCode、Qwen Code、Antigravity、DeerFlow、VS Code(Copilot)、Copilot CLI、Hermes Agent、Claw Code、OpenClaw、Cline、Kilo Code、Crush、ZCode（智谱）、DeepSeek Harness、Reasonix。' },
      { q: 'superpowers-zh 有哪些獨特價值？', a: '一套完整中文化的系統工作方法論：從頭腦風暴、規劃、TDD 到除錯、程式碼審查，每個 skill 都是實戰驗證的工作流；並疊加 {cnCount} 個面向中國開發者的原創 skill（中文程式碼審查 / Git 工作流 / 文件規範 / 提交規範），適配 {toolCount} 款 AI 編程工具。MIT 協議開源，永久免費。' },
      { q: '安裝後怎麼生效？怎麼確認裝好了？', a: '重啟 AI 工具，開一個新會話。npx 會把 skill 和引導檔案裝進工具對應的目錄（如 .claude/skills/），工具啟動時載入引導，之後會在恰當時機自動觸發相應 skill，無需你每次手動呼叫。確認方法：在新會話裡說「我想做個記帳小程式」，裝好的話它會先問你問題、弄清你想要什麼，而不是直接開始寫程式碼。' },
      { q: '能一次裝好、所有專案都用嗎？（全域安裝）', a: '能。npx superpowers-zh --global 裝到工具的使用者級目錄（如 ~/.claude/skills），所有專案自動共享，更新時只需重裝一次。專案級優先、全域兜底，二者可共存。支援全域的工具（15 款，均為各工具文件確認的載入路徑）：Claude Code / Codex CLI / Qoder / Windsurf / Qwen Code / OpenClaw / OpenCode / Hermes Agent / CodeBuddy / CodeArts / Crush / ZCode / DeepSeek Harness / Reasonix / TRAE CN；其餘工具（含 Gemini / Antigravity，有各自專屬全域方式）請在專案內安裝或參考對應文件。' },
      { q: '會拖慢我的 AI 嗎？會上傳程式碼嗎？', a: '不會。skill 是按需觸發的純 Markdown，零執行時、不連網、不上傳任何程式碼或資料，全程在本機。' },
      { q: '怎麼更新或解除安裝？', a: '按你當初的安裝方式來，更新後都要重啟工具。npx 專案級：在專案裡重新執行 npx superpowers-zh 即更新到最新，npx superpowers-zh --uninstall 解除安裝。npx 全域：npx superpowers-zh --global 更新，npx superpowers-zh --global --uninstall 解除安裝。Claude Code 外掛市集：先 claude plugin marketplace update superpowers-zh，再 claude plugin update superpowers-zh@superpowers-zh；解除安裝用 claude plugin uninstall superpowers-zh@superpowers-zh。Codex 外掛、Gemini 擴充等工具自帶的安裝方式，按下方「支援工具」裡對應工具的文件操作。' },
      { q: '裝了沒生效怎麼辦？', a: '先確認三件事：用的是哪種安裝方式；是否最新（npx 安裝直接重跑一次即可，外掛市集用 claude plugin list 看版本）；裝完是否重啟並開了新會話。同一個專案裡不要用外掛市集和 npx 給 Claude Code 各裝一份。仍然不行，可以讓 diagnosing-superpowers 技能分析出問題的那次會話，它會整理成報告。到 GitHub 提 issue 時請附上：工具名和版本、安裝指令、作業系統、你輸入了什麼、它實際做了什麼。' },
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

// ---- 文案数量：从源头计算，不在三语文案里手写 ----
// {toolCount} = TOOLS 条目数（audit.sh 卡死它等于 installer 宣称的产品数），
// {cnCount} = 中国原创分组的 skill 数。{n}（skill 总数）仍在渲染时按需填充。
// 此前工具数在 T 里手写了 20 处，audit 只覆盖其中标语与 FAQ，标题和特性卡改漏也照样通过。
function fillCounts(skills) {
  const map = { toolCount: TOOLS.length, cnCount: skills.filter(s => s.china).length };
  // 数字能自动算，但紧跟着的枚举清单仍是手写的：数量对不上就构建失败，不让两者各说各话
  const walk = (o, path) => {
    for (const k of Object.keys(o)) {
      const v = o[k];
      if (v && typeof v === 'object') { walk(v, `${path}.${k}`); continue; }
      if (typeof v !== 'string') continue;
      const tools = v.match(/\{toolCount\} (?:款：|tools: )(.+)$/);
      if (tools) {
        const n = tools[1].replace(/[。.]$/, '').split(/、|, /).length;
        if (n !== map.toolCount) throw new Error(`${path}.${k} 枚举了 ${n} 款工具，TOOLS 有 ${map.toolCount} 款`);
      }
      const cn = v.match(/\{cnCount\}[^（(]*[（(]([^）)]+)[）)]/);
      if (cn) {
        const n = cn[1].split(' / ').length;
        if (n !== map.cnCount) throw new Error(`${path}.${k} 枚举了 ${n} 个中国原创 skill，实际有 ${map.cnCount} 个`);
      }
      o[k] = v.replace(/\{(toolCount|cnCount)\}/g, (_, x) => map[x]);
    }
  };
  walk(T, 'T');
}

// ---- 多语言配置：新增语言只需往这里加一项 + 写一个 T.<code> 翻译对象 ----
// dir: 该语言站点子目录（根语言为 ''）；hreflang: SEO 语言标记；label: 语言切换器显示名
const LANGS = [
  { code: 'zh',  dir: '',          label: '中文', hreflang: 'zh-CN' },
  { code: 'en',  dir: 'en/',       label: 'EN',   hreflang: 'en' },
  { code: 'zht', dir: 'zh-Hant/',  label: '繁體', hreflang: 'zh-Hant' },
];
const DEFAULT_DIR = LANGS[0].dir; // 根语言（zh）用于 x-default

// ---- 公共布局 ----
// pageClean: 语言无关的 canonical 后缀（首页 ''；skill 页 'skills/<name>'）
// pageFile:  语言无关的文件后缀，用于语言切换链接（首页 ''；skill 页 'skills/<name>.html'）
// base: 资源相对前缀（'' / '../' / '../../'），仅用于品牌链接等相对引用
function layout({ lang, base, title, desc, body, pageClean = '', pageFile = '', extraHead = '' }) {
  const t = T[lang];
  const curDir = LANGS.find(l => l.code === lang).dir;
  const canonical = `/${curDir}${pageClean}`;
  const altLinks = LANGS
    .map(l => `<link rel="alternate" hreflang="${l.hreflang}" href="${SITE_URL}/${l.dir}${pageClean}">`)
    .join('\n') + `\n<link rel="alternate" hreflang="x-default" href="${SITE_URL}/${DEFAULT_DIR}${pageClean}">`;
  const langSwitch = LANGS
    .filter(l => l.code !== lang)
    .map(l => `<a class="lang-switch" href="/${l.dir}${pageFile}">${l.label}</a>`)
    .join('');
  return `<!DOCTYPE html>
<html lang="${t.htmlLang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="baidu-site-verification" content="codeva-5WLzyP9gcN">
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-L02QK4EVDL"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-L02QK4EVDL');</script>
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE_URL}${canonical}">
${altLinks}
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${SITE_URL}${canonical}">
<meta property="og:image" content="${SITE_URL}/assets/og-image.jpg?v=${ogVer}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(t.ogAlt)}">
<meta property="og:site_name" content="superpowers-zh">
<meta property="og:locale" content="${t.ogLocale}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${SITE_URL}/assets/og-image.jpg?v=${ogVer}">
<meta name="theme-color" content="#0a0b10">
<link rel="icon" href="/assets/app-icon.png">
<link rel="stylesheet" href="/styles.css?v=${cssVer}">
<script>(function(){try{var m=localStorage.getItem('sp-theme');if(m==='light')document.documentElement.setAttribute('data-theme','light');}catch(e){}})();</script>
${extraHead}</head>
<body>
<a class="skip-link" href="#main">${t.skipToMain}</a>
<header class="nav">
  <a class="brand" href="${base}index.html">
    <img src="/assets/superpowers-small.svg" alt="" width="26" height="26">
    <span>superpowers<b>-zh</b></span>
  </a>
  <nav>
    <a href="${base}index.html#why">${t.nav.why}</a>
    <a href="${base}index.html#install">${t.nav.install}</a>
    <a href="${base}index.html#skills">${t.nav.skills}</a>
    <a href="${base}index.html#tools">${t.nav.tools}</a>
    <a href="${base}index.html#faq">${t.nav.faq}</a>
    <a href="${base}sponsors.html"${pageClean === 'sponsors' ? ' class="active" aria-current="page"' : ''}>${t.nav.sponsors}</a>
    <a href="https://aiolaola.com/?utm_source=sp1" target="_blank" rel="noopener">${t.nav.learn}</a>
    <a href="https://github.com/jnMetaCode/superpowers-zh" target="_blank" rel="noopener">${t.nav.github}</a>
    ${langSwitch}
    <button class="theme-btn" id="themeBtn" aria-label="theme" title="切换主题">◐</button>
  </nav>
</header>
${body}
<footer>
  <div class="foot-qr">
    <h4 class="qr-title">${t.followUs}</h4>
    <div class="qr-row">
      <figure class="qr-card"><img src="/assets/qr-wechat.jpg" alt="${esc(t.qrWechat)}" width="${QR.wechat.w}" height="${QR.wechat.h}" loading="lazy"><figcaption>${t.qrWechat}</figcaption></figure>
      <figure class="qr-card"><img src="/assets/qr-douyin.png" alt="${esc(t.qrDouyin)}" width="${QR.douyin.w}" height="${QR.douyin.h}" loading="lazy"><figcaption>${t.qrDouyin}</figcaption></figure>
      <figure class="qr-card"><a href="https://x.com/jnMetaCode" target="_blank" rel="noopener"><img src="/assets/qr-x.png" alt="${esc(t.qrX)}" width="${QR.x.w}" height="${QR.x.h}" loading="lazy"></a><figcaption><a href="https://x.com/jnMetaCode" target="_blank" rel="noopener">${t.qrX}</a></figcaption></figure>
    </div>
  </div>
  <div class="foot-inner foot-cols">
    <div class="foot-brand">
      <strong>superpowers<b>-zh</b></strong>
      <span>${t.footTag}</span>
    </div>
    ${t.footCols.map(col => `<div class="foot-col"><h4>${col.h}</h4>${col.links.map(l => {
      const ext = l[1].startsWith('http');
      // 站内相对链接（如 sponsors.html）要按当前页面深度补 base；'#' 锚点与外链原样
      const href = (ext || l[1].startsWith('#') || l[1].startsWith('mailto:')) ? l[1] : base + l[1];
      return `<a href="${href}"${ext ? ' target="_blank" rel="noopener"' : ''}>${l[0]}</a>`;
    }).join('')}</div>`).join('')}
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
  const toolData = JSON.stringify(TOOLS.map(x => ({ name: x.name, cmd: x.cmd, mode: x.mode })));
  const fill = (s, map) => s.replace(/\{(\w+)\}/g, (_, k) => map[k]);

  const cards = skills.map(s => {
    const title = lang === 'en' ? s.titleEn : s.title;
    const d = lang === 'en' ? (s.descEn || s.desc) : s.desc;
    return `
      <a class="card" href="skills/${esc(s.name)}.html" data-group="${s.group}" data-name="${esc(s.name)}" data-title="${esc(title)}">
        <div class="card-head"><h3${zhCnAttr(lang, lang !== 'en')}>${esc(title)}</h3>${s.china ? `<span class="tag tag-cn">${t.tagCn}</span>` : ''}</div>
        <code class="card-id">${esc(s.name)}</code>
        <p${zhCnAttr(lang, lang !== 'en' || !s.descEn)}>${esc(d)}</p>
        <span class="card-more">${t.skDetail}</span>
      </a>`;
  }).join('');

  const filters = GROUPS.map((g, i) =>
    `<button class="chip${i === 0 ? ' active' : ''}" data-filter="${g.id}">${g[lang]}</button>`).join('');
  const modeTag = { auto: '', manual: '（--tool）', global: '（--global）' };
  const toolOpts = TOOLS.map((x, i) => `<option value="${i}">${esc(x.name)}${modeTag[x.mode] || ''}</option>`).join('');
  // 有专属安装文档的工具，pill 直接链过去 —— docs/ 里 22 份指南此前在官网零暴露，
  // 而「为什么要重装 / 旧布局怎么清 / 该不该用 --global」的答案全在那里。
  const toolWall = TOOLS.map(x => {
    const inner = `<span class="tool-name">${esc(x.name)}</span><span class="tool-type">${esc(x.type)}</span>`;
    return x.doc
      ? `<a class="tool-pill has-doc" href="${GH_BLOB}/docs/README.${x.doc}.md" target="_blank" rel="noopener" title="${esc(fill(t.toolDocHint, { name: x.name }))}">${inner}<span class="tool-doc" aria-hidden="true">↗</span></a>`
      : `<div class="tool-pill">${inner}</div>`;
  }).join('');
  const feats = t.features.map(f => `<article class="feat"><div class="feat-icon">${f.icon}</div><h3>${esc(fill(f.t, { n: total }))}</h3><p>${esc(f.d)}</p></article>`).join('');
  const pipe = t.pipeline.map((p, i) => `<div class="pl-step"><div class="pl-num">${i + 1}</div><div class="pl-body"><b>${esc(p.n)}</b><span>${esc(p.d)}</span></div></div>${i < t.pipeline.length - 1 ? '<div class="pl-arrow">→</div>' : ''}`).join('');
  const ucs = t.usecases.map(u => `<article class="usecase"><span class="uc-tag">${esc(u.tag)}</span><code class="uc-skills">${esc(u.skills)}</code><p>${esc(u.desc)}</p></article>`).join('');
  const faqs = t.faq.map(f => `<details class="faq-item"><summary>${esc(f.q)}</summary><div class="faq-a">${esc(f.a)}</div></details>`).join('');

  return `
<main id="main">
  <section class="hero">
    <div class="badge">${t.heroBadge}</div>
    <h1>${t.heroH1}</h1>
    <p class="lead">${fill(t.heroLead, { n: total })}</p>
    <div class="cmd-hero" data-copy="npx superpowers-zh"><code>$ npx superpowers-zh</code><button class="copy-btn">${t.copy}</button></div>
    <div class="hero-cta">
      <a class="btn btn-primary" href="#install">${t.heroBtn1}</a>
      <a class="btn btn-ghost" href="https://github.com/jnMetaCode/superpowers-zh" target="_blank" rel="noopener">${t.heroBtn2}</a>
    </div>
    <a class="release-note" href="${GH_BLOB}/RELEASE-NOTES.zh.md" target="_blank" rel="noopener">
      <span class="rn-ver">v${LATEST.version}</span>
      <span class="rn-text">${esc(RELEASE_BANNER[lang])}</span>
      <span class="rn-go" aria-hidden="true">→</span>
    </a>
    <div class="stats">
      <div><b>${total}</b><span>${t.stats[0]}</span></div>
      <div><b>${cnCount}</b><span>${t.stats[1]}</span></div>
      <div><b>${TOOLS.length}</b><span>${t.stats[2]}</span></div>
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
    <a class="btn btn-primary" href="https://aiolaola.com/?utm_source=sp1" target="_blank" rel="noopener">${t.aiolaolaBtn}</a>
    <a class="btn btn-ghost" href="https://book.aibuzhiyu.com/" target="_blank" rel="noopener">${t.bookBtn}</a>
  </div></div></section>

  <section class="cta"><div class="cta-inner">
    <h2>${t.ctaTitle}</h2><p>${fill(t.ctaDesc, { n: total })}</p>
    <div class="cta-cmd" data-copy="npx superpowers-zh"><code>$ npx superpowers-zh</code><button class="copy-btn">${t.copy}</button></div>
    <div class="hero-cta">
      <a class="btn btn-primary" href="#install">${t.ctaBtn1}</a>
      <a class="btn btn-ghost" href="https://github.com/jnMetaCode/superpowers-zh" target="_blank" rel="noopener">${t.ctaBtn2}</a>
    </div>
  </div></section>
</main>
<script>window.__TOOLS__=${toolData};window.__I18N__={auto:${JSON.stringify(t.instNoteAuto)},manual:${JSON.stringify(t.instNoteManual)},global:${JSON.stringify(t.instNoteGlobal)},copy:${JSON.stringify(t.copy)},copied:${JSON.stringify(t.copied)}};</script>`;
}

// ---- 赞助商独立页 ----
// 首页不放任何赞助内容，全部收敛到这一页：旗舰位 → 常规位 → 福利汇总 → FAQ → 赞助权益。
// tier: 'flagship' 的赞助商单独成块；没有 flagship 时该区块整体不渲染。
function renderSponsors(lang) {
  const t = T[lang];
  const sp = t.sp;
  const flagship = SPONSORS.filter(x => x.tier === 'flagship');
  const standard = SPONSORS.filter(x => x.tier !== 'flagship');

  const flagCards = flagship.map(s => `
    <article class="sponsor sponsor-flag">
      <a class="sponsor-shot" href="${esc(s.url)}" target="_blank" rel="sponsored nofollow noopener">
        <img src="/assets/sponsors/${s.img}" alt="${esc(s.alt[lang])}" width="${s.w}" height="${s.h}" loading="lazy">
      </a>
      <div class="flag-body">
        <h3>${esc(s.name[lang])}</h3>
        <p class="flag-tag">${esc(s.tagline[lang])}</p>
        <p class="flag-desc">${esc(s.desc[lang])}</p>
        <div class="flag-foot">
          <span class="sponsor-perk">${esc(s.perk[lang])}</span>
          <a class="btn btn-primary" href="${esc(s.url)}" target="_blank" rel="sponsored nofollow noopener">${esc(sp.visitFlag)}</a>
        </div>
      </div>
    </article>`).join('');

  const cards = standard.map(s => `
    <article class="sponsor-card">
      <a class="sc-head" href="${esc(s.url)}" target="_blank" rel="sponsored nofollow noopener">
        <span class="sc-logo"><img src="/assets/sponsors/${s.logo}" alt="" width="36" height="36" loading="lazy"></span>
        <b>${esc(s.name[lang])}</b>
        <span class="sc-ext" aria-hidden="true">↗</span>
      </a>
      <p class="sc-desc">${esc(s.desc[lang])}</p>
      <button class="sc-toggle" type="button" aria-expanded="false" hidden>${esc(sp.expand)}</button>
      <p class="sc-perk">${esc(s.perk[lang])}</p>
      ${s.note ? `<p class="sc-note">${esc(s.note[lang])}</p>` : ''}
      <a class="sc-go" href="${esc(s.url)}" target="_blank" rel="sponsored nofollow noopener">${esc(sp.goto)}</a>
    </article>`).join('');

  const rows = SPONSORS.map(s => `
      <tr>
        <td><b>${esc(s.name[lang])}</b></td>
        <td>${esc(s.perkShort[lang])}</td>
        <td>${s.code
          ? `<span class="code-chip" data-copy="${esc(s.code)}"><code>${esc(s.code)}</code><button class="copy-btn" aria-label="${t.copy}">\u29c9</button></span>`
          : sp.noCode}</td>
        <td><a href="${esc(s.url)}" target="_blank" rel="sponsored nofollow noopener">${sp.goto}</a></td>
      </tr>`).join('');

  const faqs = sp.faq.map(f =>
    `<details class="faq-item"><summary>${esc(f.q)}</summary><div class="faq-a">${esc(f.a)}</div></details>`).join('');

  const benefits = sp.benefits.map(b =>
    `<article class="feat"><div class="feat-icon">${b.icon}</div><h3>${esc(b.t)}</h3><p>${esc(b.d)}</p></article>`).join('');

  // 没有 flagship 时不留白，改渲染一张「虚位以待」招商卡
  const flagSection = `
  <section class="sp-tier">
    <h2 class="tier-title">${esc(sp.flagTitle)}</h2>
    <p class="tier-sub">${esc(sp.flagSub)}</p>
    ${flagship.length ? flagCards : `
    <div class="flag-empty">
      <h3>${esc(sp.emptyTitle)}</h3>
      <p>${esc(sp.emptyDesc)}</p>
      <a class="btn btn-primary" href="mailto:jnMetaCode@qq.com">${esc(sp.emptyBtn)}</a>
    </div>`}
  </section>
`;

  const moreSection = standard.length ? `
  <section class="sp-tier">
    <h2 class="tier-title">${esc(flagship.length ? sp.moreTitle : sp.listTitle)}</h2>
    <p class="tier-sub">${esc(flagship.length ? sp.moreSub : sp.listSub)}</p>
    <div class="sponsor-cards">${cards}</div>
  </section>
` : '';

  return `
<main id="main">
  <section class="hero sp-hero">
    <div class="badge">${sp.badge}</div>
    <h1>${esc(sp.h1)}</h1>
    <p class="lead">${esc(sp.lead)}</p>
    <div class="hero-cta">
      <a class="btn btn-primary" href="mailto:jnMetaCode@qq.com">${esc(sp.becomeBtn)}</a>
      <a class="btn btn-ghost" href="index.html">${esc(sp.backBtn)}</a>
    </div>
  </section>
${flagSection}${moreSection}
  <section class="sp-perks">
    <h2 class="section-title">${esc(sp.perkTitle)}</h2>
    <p class="section-sub">${esc(sp.perkSub)}${sp.copyHint ? ' ' + esc(sp.copyHint) : ''}</p>
    <div class="sp-table-wrap">
      <table class="sp-table">
        <thead><tr><th>${esc(sp.thSponsor)}</th><th>${esc(sp.thPerk)}</th><th>${esc(sp.thCode)}</th><th>${esc(sp.thGo)}</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <p class="sponsor-note">${t.sponsorNote}</p>
  </section>

  <section class="faq">
    <h2 class="section-title">${esc(sp.faqTitle)}</h2>
    <div class="faq-list">${faqs}</div>
  </section>

  <section class="why sp-benefits">
    <h2 class="section-title">${esc(sp.benefitTitle)}</h2>
    <p class="section-sub">${esc(sp.benefitSub)}</p>
    <div class="feat-grid">${benefits}</div>
  </section>

  <section class="cta"><div class="cta-inner">
    <h2>${esc(sp.ctaTitle)}</h2><p>${esc(sp.ctaDesc)}</p>
    <div class="hero-cta">
      <a class="btn btn-primary" href="mailto:jnMetaCode@qq.com">${esc(sp.ctaBtn)}</a>
      <a class="btn btn-ghost" href="index.html">${esc(sp.backBtn)}</a>
    </div>
  </div></section>
</main>
<script>window.__I18N__={copy:${JSON.stringify(t.copy)},copied:${JSON.stringify(t.copied)},expand:${JSON.stringify(sp.expand)},collapse:${JSON.stringify(sp.collapse)}};</script>`;
}

// ---- JSON-LD 结构化数据 ----
// 站上有 7 条 FAQ、完整的软件信息与 21 个 skill 文档页，却没有任何结构化标记：
// 搜索引擎拿不到富摘要，AI 抓取时只能从正文里猜。
//
// 关于 CSP：ld+json 是**数据块不是可执行脚本**，浏览器不会执行它，爬虫读的也是
// HTML 源码而非执行结果 —— 所以不需要进 script-src 的 hash 白名单。
//
// 关于 </script> 逃逸：JSON.stringify 不转义 '<'，正文里若出现 </script> 就会
// 提前闭合标签。统一把 < 转成 \u003c，这是 JSON 字符串里的合法写法。
function ldJson(obj) {
  return `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;
}

function homeSchema(lang, t, skills) {
  const url = SITE_URL + (lang === 'zh' ? '/' : lang === 'en' ? '/en/' : '/zh-Hant/');
  return ldJson({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite', '@id': url + '#website', url, name: 'superpowers-zh',
        description: t.desc, inLanguage: t.htmlLang,
      },
      {
        '@type': 'SoftwareApplication', '@id': url + '#software',
        name: 'superpowers-zh', description: t.desc, url,
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'macOS, Windows, Linux',
        softwareVersion: PKG.version,
        image: `${SITE_URL}/assets/og-image.jpg`,
        license: 'https://opensource.org/licenses/MIT',
        codeRepository: 'https://github.com/jnMetaCode/superpowers-zh',
        downloadUrl: 'https://www.npmjs.com/package/superpowers-zh',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        author: { '@type': 'Person', name: 'jnMetaCode', url: 'https://github.com/jnMetaCode' },
      },
      {
        '@type': 'FAQPage', '@id': url + '#faq',
        mainEntity: t.faq.map(f => ({
          '@type': 'Question', name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
    ],
  });
}

function skillSchema(skill, lang, t) {
  const base = SITE_URL + (lang === 'zh' ? '' : lang === 'en' ? '/en' : '/zh-Hant');
  return ldJson({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'TechArticle',
        headline: lang === 'en' ? skill.titleEn : skill.title,
        description: lang === 'en' ? (skill.descEn || skill.desc) : skill.desc,
        url: `${base}/skills/${skill.name}`,
        inLanguage: 'zh-CN',                       // 正文一律中文，英文站也是（页面顶部有提示）
        isPartOf: { '@id': base + '/#website' },
        license: 'https://opensource.org/licenses/MIT',
        author: { '@type': 'Person', name: 'jnMetaCode' },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'superpowers-zh', item: base + '/' },
          { '@type': 'ListItem', position: 2, name: t.nav.skills, item: base + '/#skills' },
          { '@type': 'ListItem', position: 3, name: lang === 'en' ? skill.titleEn : skill.title },
        ],
      },
    ],
  });
}

// skill 标题/简介在非简体界面里可能仍是简体源文（繁体界面全部沿用，英文界面缺 descEn 时回退），
// 给这些元素单独标 zh-CN，读屏和字体选择才不会按页面语言去读简体字。
const zhCnAttr = (lang, isSource) => (lang !== 'zh' && isSource ? ' lang="zh-CN"' : '');

// ---- skill 详情(操作文档)页正文 ----
function renderDetail(skill, lang) {
  const t = T[lang];
  const title = lang === 'en' ? skill.titleEn : skill.title;
  // 传入该 skill 在仓库里的目录 URL：SKILL.md 里指向兄弟文件的相对链接
  // （implementer-prompt.md、../requesting-code-review/code-reviewer.md 等）
  // 站点上并不存在，必须解析成 GitHub 地址，否则全是死链。
  const bodyHtml = renderMarkdown(skill.raw, `${GH_BLOB}/skills/${skill.name}/`, 1);
  const cnNotice = lang === 'en'
    ? '<div class="doc-notice">📖 This skill\'s content is written in Chinese — superpowers-zh is a Chinese-localized toolkit.</div>'
    : lang === 'zht'
      ? '<div class="doc-notice">📖 本頁導覽使用繁體中文；技能標題、簡介與正文沿用簡體中文原文，與倉庫同步。</div>'
      : '';
  const srcUrl = `${GH_BLOB}/skills/${skill.name}/SKILL.md`;
  return `
<main id="main" class="doc">
  <a class="doc-back" href="../index.html#skills">${t.backToSkills}</a>
  <header class="doc-head">
    <div class="doc-titles">
      <h1${zhCnAttr(lang, lang !== 'en')}>${esc(title)}</h1>
      <code>${esc(skill.name)}</code>
      ${skill.china ? `<span class="tag tag-cn">${t.tagCn}</span>` : ''}
    </div>
    <p class="doc-lead"${zhCnAttr(lang, lang !== 'en' || !skill.descEn)}>${esc(lang === 'en' ? (skill.descEn || skill.desc) : skill.desc)}</p>
    <div class="doc-actions">
      <div class="cmd-out doc-cmd" data-copy="npx superpowers-zh"><code>$ npx superpowers-zh</code><button class="copy-btn">${t.copy}</button></div>
      <a class="btn btn-ghost" href="${srcUrl}" target="_blank" rel="noopener">${t.detailSource}</a>
    </div>
  </header>
  ${cnNotice}
  <article class="doc-body" lang="zh-CN">${bodyHtml}</article>
  <a class="doc-back" href="../index.html#skills">${t.backToSkills}</a>
</main>
<script>window.__I18N__={copy:${JSON.stringify(t.copy)},copied:${JSON.stringify(t.copied)}};</script>`;
}

// ---- 构建 ----
function build() {
  const skills = loadSkills();
  fillCounts(skills);
  for (const g of GROUPS) {
    const missing = LANGS.filter(l => !g[l.code]).map(l => l.code);
    if (missing.length) throw new Error(`GROUPS「${g.id}」缺少语言标签：${missing.join('/')}`);
  }
  rmSync(DIST, { recursive: true, force: true });
  mkdirSync(join(DIST, 'assets'), { recursive: true });
  mkdirSync(join(DIST, 'skills'), { recursive: true });
  mkdirSync(join(DIST, 'en', 'skills'), { recursive: true });

  // 资源
  copyFileSync(join(TEMPLATE, 'styles.css'), join(DIST, 'styles.css'));
  copyFileSync(join(TEMPLATE, 'app.js'), join(DIST, 'app.js'));
  copyFileSync(join(ROOT, 'assets', 'app-icon.png'), join(DIST, 'assets', 'app-icon.png'));
  copyFileSync(join(ROOT, 'assets', 'og-image.jpg'), join(DIST, 'assets', 'og-image.jpg'));
  copyFileSync(join(ROOT, 'assets', 'superpowers-small.svg'), join(DIST, 'assets', 'superpowers-small.svg'));
  copyFileSync(join(TEMPLATE, 'assets', 'qr-wechat.jpg'), join(DIST, 'assets', 'qr-wechat.jpg'));
  copyFileSync(join(TEMPLATE, 'assets', 'qr-douyin.png'), join(DIST, 'assets', 'qr-douyin.png'));
  copyFileSync(join(TEMPLATE, 'assets', 'qr-x.png'), join(DIST, 'assets', 'qr-x.png'));
  mkdirSync(join(DIST, 'assets', 'sponsors'), { recursive: true });
  for (const s of SPONSORS) {
    for (const f of [s.img, s.logo].filter(Boolean)) {
      copyFileSync(join(ROOT, 'assets', 'sponsors', f), join(DIST, 'assets', 'sponsors', f));
    }
  }

  // ---- 每种语言生成首页 + 全部 skill 详情页 ----
  for (const L of LANGS) {
    const t = T[L.code];
    const dirParts = L.dir ? [L.dir.replace(/\/$/, '')] : [];
    // base = 相对**当前语言根**的前缀：首页 ''、skill 详情页 '../'。
    // （早先写成相对站点根，导致 /en/ 与 /zh-Hant/ 页面的导航/品牌链接全部跳回中文首页）
    const homeBase = '';
    mkdirSync(join(DIST, ...dirParts, 'skills'), { recursive: true });
    // 首页
    writeFileSync(join(DIST, ...dirParts, 'index.html'), layout({
      lang: L.code, base: homeBase, title: t.title, desc: t.desc,
      body: renderLanding(skills, L.code), pageClean: '', pageFile: '',
      extraHead: homeSchema(L.code, t, skills) + '\n',
    }));
    // 赞助商页（每种语言一份，与首页同级）
    writeFileSync(join(DIST, ...dirParts, 'sponsors.html'), layout({
      lang: L.code, base: homeBase, title: t.sp.title, desc: t.sp.desc,
      body: renderSponsors(L.code), pageClean: 'sponsors', pageFile: 'sponsors.html',
    }));
    // skill 详情页
    for (const s of skills) {
      const title = L.code === 'en' ? s.titleEn : s.title;
      const desc = L.code === 'en' ? (s.descEn || s.desc) : s.desc;
      writeFileSync(join(DIST, ...dirParts, 'skills', `${s.name}.html`), layout({
        lang: L.code, base: '../',
        title: `${title} · superpowers-zh`, desc,
        body: renderDetail(s, L.code),
        pageClean: `skills/${s.name}`, pageFile: `skills/${s.name}.html`,
        extraHead: skillSchema(s, L.code, t) + '\n',
      }));
    }
  }

  // ---- 404 页 ----
  // Cloudflare Pages：根目录存在 404.html 时，任何未匹配到静态文件的路径都会
  // 返回它并带 **真正的 HTTP 404**（而非默认把首页当 SPA 兜底返回 200——那会让
  // Google 把无数不存在的 URL 当成首页的重复页/软 404）。noindex 防止 404 页本身被收录。
  // base 用 '/'：这一个文件会被任意深度的路径命中，导航链接必须是绝对路径。
  writeFileSync(join(DIST, '404.html'), layout({
    lang: 'zh', base: '/',
    title: '页面找不到 (404) · superpowers-zh',
    desc: '你访问的页面不存在或已被移动。',
    extraHead: '<meta name="robots" content="noindex">\n',
    pageClean: '', pageFile: '',
    body: `<main id="main" class="doc nf">
  <div class="nf-code">404</div>
  <h1>这个页面找不到了</h1>
  <p class="nf-lead">链接可能已过期或被移动。下面几个入口也许是你要找的：</p>
  <p class="nf-links">
    <a class="btn btn-primary" href="/">返回首页</a>
    <a class="btn btn-ghost" href="/#skills">浏览全部 Skill</a>
    <a class="btn btn-ghost" href="/#install">安装命令</a>
  </p>
  <p class="nf-alt" lang="en">Page not found. <a href="/en/">Go to the English home page</a></p>
  <p class="nf-alt" lang="zh-Hant">找不到這個頁面。<a href="/zh-Hant/">前往繁體中文首頁</a></p>
</main>`,
  }));

  // ---- SEO: robots.txt + sitemap.xml ----
  writeFileSync(join(DIST, 'robots.txt'),
    'User-agent: *\nAllow: /\n\nSitemap: ' + SITE_URL + '/sitemap.xml\n');

  // ---- AEO: llms.txt + llms-full.txt ----
  // 为什么做这个：本站的读者一大半不是人，是 AI 助手 —— 有人在 Claude / ChatGPT 里
  // 问「superpowers-zh 是什么、怎么装」，助手就来抓。它现在得爬 66 个页面才能拼出
  // 全貌，多数情况下只抓首页就走，于是回答里缺一半信息。
  // llms.txt（llmstxt.org 约定）给它一份「一次读完就懂」的索引；llms-full.txt 直接
  // 把所有 SKILL.md 正文拼全，让它不用逐页爬。
  // Cloudflare 的「面向代理的 Markdown」是同一件事的付费版（Pro 套餐），这里自己做。
  // 注意：robots.txt 必须放行这两个文件 —— 上面那份是 Allow: / ，已覆盖。
  const skillLine = s => `- [${s.title}](${SITE_URL}/skills/${s.name}): ${s.desc.replace(/\s+/g, ' ').slice(0, 180)}`;
  const byGroup = g => skills.filter(s => s.group === g);
  const llms = [
    '# superpowers-zh',
    '',
    `> obra/superpowers 的中文增强 fork：${skills.length} 个塑造 AI 编程助手行为的 skill，含 ${skills.filter(s => s.china).length} 个中国特色 skill，一条 npx 命令适配 ${TOOLS.length} 款 IDE / CLI。`,
    '',
    '安装（自动检测当前项目使用的工具）：',
    '',
    '```bash',
    'npx superpowers-zh              # 项目级',
    'npx superpowers-zh --global     # 全局，所有项目共享',
    '```',
    '',
    'skill 不是文档，是**行为塑造代码**：装好后由工具的 bootstrap 自动触发，',
    '例如用户说「做个 react todo list」时会先触发 brainstorming，而不是直接写代码。',
    '',
    '仓库：https://github.com/jnMetaCode/superpowers-zh',
    'npm：https://www.npmjs.com/package/superpowers-zh',
    '全文（所有 skill 正文）：' + SITE_URL + '/llms-full.txt',
    '',
    `从这里开始：[使用 Superpowers · 引导](${SITE_URL}/skills/using-superpowers) —— 它说明如何查找和调用其余 ${skills.filter(s => s.name !== 'using-superpowers').length} 个 skill。`,
    '',
  ];
  for (const g of GROUPS) {
    const list = byGroup(g.id);
    if (!list.length) continue;
    llms.push('## ' + g.zh, '');
    for (const sk of list) llms.push(skillLine(sk));
    llms.push('');
  }
  llms.push('## 其他', '', `- [赞助商](${SITE_URL}/sponsors): 支持本项目的公司与优惠`, `- [English](${SITE_URL}/en/): English version`, '');
  writeFileSync(join(DIST, 'llms.txt'), llms.join('\n'));

  // llms-full.txt：索引 + 全部 SKILL.md 正文。去掉 frontmatter（对读者无意义），
  // 每篇前加一个 H1 分隔，便于模型定位。
  const full = [llms.join('\n'), '', '---', '', '# 全部 skill 正文', ''];
  for (const sk of skills) {
    full.push('', '---', '', `# ${sk.title}（${sk.name}）`, '',
      `来源：${SITE_URL}/skills/${sk.name}`, '',
      sk.raw.replace(/^---\n[\s\S]*?\n---\n?/, '').trim(), '');
  }
  writeFileSync(join(DIST, 'llms-full.txt'), full.join('\n'));

  const today = new Date().toISOString().slice(0, 10);
  // 每条 URL 记下它「内容来自哪些源文件」，据此取 lastmod：
  //   skill 详情页 -> 该 skill 目录；首页 / 赞助页 -> 生成器与模板（文案都写在里面）
  const tmplPaths = ['site/build.mjs', 'site/template'];
  const urls = [];
  for (const L of LANGS) {
    urls.push({ u: `/${L.dir}`, src: tmplPaths });
    urls.push({ u: `/${L.dir}sponsors`, src: [...tmplPaths, 'assets/sponsors'] });
    for (const s of skills) urls.push({ u: `/${L.dir}skills/${s.name}`, src: [`skills/${s.name}`] });
  }
  const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map(({ u, src }) => `  <url><loc>${SITE_URL}${u}</loc><lastmod>${lastCommitDate(src)}</lastmod><changefreq>weekly</changefreq><priority>${u === '/' ? '1.0' : (u.endsWith('/') ? '0.8' : '0.7')}</priority></url>`).join('\n') +
    '\n</urlset>\n';
  writeFileSync(join(DIST, 'sitemap.xml'), sitemap);

  // 结构化数据一旦转义写错（引号、</script>、CJK），浏览器和爬虫都只是**静默忽略**，
  // 页面看不出任何异常。所以构建时逐页把它 JSON.parse 一遍，坏了就直接失败。
  const validateLd = (dir) => {
    let n = 0;
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const f = join(dir, ent.name);
      if (ent.isDirectory()) { n += validateLd(f); continue; }
      if (!ent.name.endsWith('.html')) continue;
      const html = readFileSync(f, 'utf8');
      for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
        try { JSON.parse(m[1]); n++; }
        catch (e) { throw new Error(`${f} 里的 JSON-LD 不是合法 JSON：${e.message}`); }
      }
    }
    return n;
  };
  const ldCount = validateLd(DIST);

  // 漏填的占位符或缺键的文案（模板里变成 undefined）同样不会报错，只会原样上线。
  // 只查站点自有文案页（skill 正文可能合法含 {name} 之类示例），并去掉无 type 的内联 <script>：
  // 前端 i18n 模板（如 {name}）是交给 app.js 在浏览器里填的。
  for (const f of [...LANGS.flatMap(l => [`${l.dir}index.html`, `${l.dir}sponsors.html`]), 'llms.txt', '404.html']) {
    const text = readFileSync(join(DIST, f), 'utf8').replace(/<script>[\s\S]*?<\/script>/g, '');
    const bad = text.match(/\{(?:toolCount|cnCount|n|name|tools)\}|>undefined<|\bundefined (?:款|tools|个|個)/);
    if (bad) throw new Error(`${f} 含未填充的文案：${bad[0]}`);
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
      // 下方 CSP 的 style-src 不放行内联样式：style="" 上线后静默失效（404 页曾因此整页错位）
      if (/<[^>]+\sstyle="/.test(html)) throw new Error(`${p} 含 style="" 属性，会被 CSP 拦截，请改用 styles.css 里的类`);
      for (const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
        scriptHashes.add("'sha256-" + createHash('sha256').update(m[1], 'utf8').digest('base64') + "'");
      }
    }
  };
  collectScriptHashes(DIST);

  // 严格 CSP：脚本仅允许 'self' + 本站内联脚本的 hash（含 GA 内联配置块，自动收集）；
  // 样式仅 'self'；禁用插件/内联事件；锁死 base-uri 与 frame 祖先。
  // Google Analytics (gtag) 需放行 googletagmanager（加载器）与 analytics（上报）域名。
  // Cloudflare Web Analytics 的 beacon 是 **Cloudflare 在边缘注入的**，不是我们写进
  // 页面的 —— 所以它照样受本站 CSP 约束。此前 script-src 没放行它，浏览器直接拒绝
  // 执行，统计一条数据都收不到：面板开着，实际全黑。
  //   加载器 https://static.cloudflareinsights.com/beacon.min.js
  //   上报   https://cloudflareinsights.com/cdn-cgi/rum （POST / sendBeacon）
  // 为什么要救它而不是关掉它：本站主力受众在国内，而 GA 的 google-analytics.com
  // 在国内不可达 —— 只留 GA 等于对主要用户群没有任何数据。两个都留，互为兜底。
  const CF_SCRIPT = 'https://static.cloudflareinsights.com';
  const CF_CONNECT = 'https://cloudflareinsights.com';
  const GA_SCRIPT = 'https://www.googletagmanager.com';
  const GA_CONNECT = 'https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com';
  const csp = [
    "default-src 'self'",
    "script-src 'self' " + GA_SCRIPT + ' ' + CF_SCRIPT + ' ' + [...scriptHashes].join(' '),
    "style-src 'self'",
    "img-src 'self' data: https://www.google-analytics.com https://www.googletagmanager.com",
    "font-src 'self'",
    "connect-src 'self' " + GA_CONNECT + ' ' + CF_CONNECT,
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
  ].join('; ');

  // Cloudflare Pages：全站安全响应头 + 缓存策略。
  // 默认 /* 不缓存（must-revalidate）——这样 clean URL 的 HTML（/、/skills/x、
  // /en/x，均不带 .html）也能即时更新，不会被边缘缓存旧内容。
  // 带内容 hash 版本号的资源（styles.css?v= / app.js?v=）与 /assets/* 由更具体
  // 规则覆盖为长缓存 immutable（内容变 → URL 变 → 自动取新）。
  writeFileSync(join(DIST, '_headers'),
    '/*\n' +
    '  Content-Security-Policy: ' + csp + '\n' +
    '  X-Content-Type-Options: nosniff\n' +
    '  X-Frame-Options: DENY\n' +
    '  Referrer-Policy: no-referrer\n' +
    '  Cross-Origin-Opener-Policy: same-origin\n' +
    '  Permissions-Policy: geolocation=(), microphone=(), camera=()\n' +
    '  Cache-Control: no-store\n' +
    '/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n' +
    '/styles.css\n  Cache-Control: public, max-age=31536000, immutable\n' +
    '/app.js\n  Cache-Control: public, max-age=31536000, immutable\n');

  const pages = LANGS.length * (2 + skills.length);
  console.log(`   结构化数据：${ldCount} 个 JSON-LD 块，均通过 JSON.parse 校验`);
  console.log(`✅ 生成 ${pages} 个页面：${LANGS.length} 语言（${LANGS.map(l => l.code).join('/')}）× (首页 + 赞助商页 + ${skills.length} 个 skill 详情页) → ${DIST}`);
}

build();
