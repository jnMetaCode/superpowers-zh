# Superpowers-ZH 中文版 Release Notes

> 本文档记录 `jnMetaCode/superpowers-zh` 中文 fork 自身的 release 历史。
>
> 上游 `obra/superpowers` 的英文 release notes 见 [`RELEASE-NOTES.md`](./RELEASE-NOTES.md)（原样保留，未翻译）。

---

## v1.3.0 (2026-05-10)

### 跟上游对齐 (v5.1.0)

- **同步上游 v5.1.0 的目录变更**：上游主动删除了 `commands/`（3 个 deprecated stub）和 `agents/code-reviewer.md`（已上升进 `requesting-code-review` skill）。中文 fork 跟随删除以与上游意图对齐。详见上游 [#1188](https://github.com/obra/superpowers/pull/1188) 与 PR #1299。
- **`bin/superpowers-zh.js`** 移除安装时复制 `agents/` 到 `.claude/agents/` 的逻辑，**保留** uninstall 时的清理逻辑（用于已装用户清理残留 `code-reviewer.md`，防止双 source of truth）。
- **`.github/workflows/ci.yml`** 删除 "Validate agents" 验证段（`agents/` 已删，验证空目录无意义）。

### 补齐上游遗漏的根级文件

- **`CLAUDE.md`** —— 上游 contributor 指南（含 anti-slop-PR 规则）的中文翻译，末尾追加中文 fork 自己的 PR 流程说明。
- **`AGENTS.md`** —— 软链接 → `CLAUDE.md`（mode 120000，跟上游一致）。Codex CLI 等工具从 `AGENTS.md` 自动加载等同读取 CLAUDE.md。
  - **Known limitation**：`npm pack` 默认不跟随 symlink，因此 npm publish 出来的 tarball 不包含 AGENTS.md。这不影响实际使用：AGENTS.md 是 Codex CLI 在用户自己项目目录读的文件，不是从 `superpowers-zh` 安装包读的；通过 `git clone` 拿到仓库的贡献者会正确解析 symlink。
- **`RELEASE-NOTES.md`** —— 上游 release notes 原样保留（英文版，1180 行）。
- **`RELEASE-NOTES.zh.md`** —— 本文件，中文 fork 自身 release 记录。
- **`.codex-plugin/plugin.json`** —— Codex CLI plugin manifest（中文版本地化：name/description/displayName 改为中文版，URL 指向 `jnMetaCode/superpowers-zh`）。
- **`.version-bump.json`** —— 上游版本管理配置文件。
- **`scripts/bump-version.sh`** —— 上游版本同步脚本（含 `--check` 漂移检测、`--audit` 仓库审计）。中文版 npm version 钩子继续用 `scripts/sync-plugin-version.js`，bump-version.sh 作为补充工具引入。
- **`assets/app-icon.png`** + **`assets/superpowers-small.svg`** —— Codex marketplace 需要的图标资产。
- **4 个新增上游测试**：`tests/claude-code/test-requesting-code-review.sh`、`tests/claude-code/test-worktree-native-preference.sh`、`tests/opencode/test-bootstrap-caching.{mjs,sh}`。

### 主动修复上游 v5.1.0 的疏忽

- **`.cursor-plugin/plugin.json`** 删除 dangling 的 `"agents": "./agents/"` 和 `"commands": "./commands/"` 两行。上游 v5.1.0 删了目录但忘了同步清理 manifest（git blame 显示这两行从 2026-02-13 加入后从未更新）。中文 fork 主动修掉，并向上游开 issue 提醒。

### 不引入

- 上游 `scripts/sync-to-codex-plugin.sh`（推 OpenAI Codex marketplace 用，硬编码 `prime-radiant-inc/openai-codex-plugins`，中文版用不上）
- 配套测试 `tests/codex-plugin-sync/test-sync-to-codex-plugin.sh`

### 不动（中文版叠加层全部保留）

`bin/` + npx 流程、`docs/` 中文工具文档、4 个 `chinese-*` skill、`mcp-builder`、`workflow-runner`、`README.md` 主推 npx 路径、`.codex/INSTALL.md`、`.opencode/INSTALL.md`、`.gemini/`、`scripts/sync-plugin-version.js` —— 这些是符合"保持上游主流程不变 + 中文版叠加新增"原则的中文 fork 沉淀，全部保留。

---

## v1.2.1 (2026-05-05)

### 修复

- **`--uninstall` 数据丢失边界 case** —— 加哨兵注释 + 保守 fallback，杜绝在某些路径上误删用户数据。

---

## v1.2.0 (2026-05-05)

### 新增

- **`--uninstall` 子命令** —— `npx superpowers-zh --uninstall` 一条命令清理已安装的 skills（#17）。
- **HOME 目录守护** —— uninstall 时强校验工作目录非用户 HOME，杜绝误删全局文件。
- **计数显示修复** —— 安装后输出实际安装的 skill 数量（之前显示固定值）。

---

## v1.1.9 (2026-04-28)

### 修复

- **Claude Code bootstrap 修复** —— npx 安装到 CC 目标时自动补上 `CLAUDE.md` bootstrap，根治 skill 不触发问题（#14）。

### 变更

- **Node 引擎要求** 提升到 `>=20`（Node 14/16/18 均已 EOL）。
- **README 重排**：相关项目表挪到显眼位置；姊妹项目区块独立成"相关项目生态"章节，重点推广 orchestrator。
- **QQ 群** 标识改为 QQ 2群。

---

## v1.1.8 (2026-04-19)

### 新增

- **Claw Code 支持**（第 17 款工具，Rust 版 AI CLI）—— auto-detect `.claw/` 或 `CLAW.md`，支持 `--tool claw/claw-code/clawcode`。
- **CNB（腾讯云原生构建）平台适配** —— `chinese-git-workflow` skill 新增 CNB 章节，含 `.cnb.yml` CI 示例（#6）。

---

## v1.1.0 – v1.1.7 早期开发（2026-03 ~ 2026-04）

中文 fork 在这一时期完成了主要的多工具适配与中文化基建：

- 第 1 款 → 第 16 款工具陆续上线：Claude Code、Cursor、Codex CLI、Gemini CLI、Trae、VS Code (Copilot)、Antigravity、Hermes Agent、Copilot CLI、Windsurf、Aider、OpenCode、Qwen Code（通义灵码）、Kiro、OpenClaw、DeerFlow 2.0
- 4 个中国原创 skill 沉淀：`chinese-code-review`、`chinese-commit-conventions`、`chinese-documentation`、`chinese-git-workflow`
- `mcp-builder`、`workflow-runner` 两个补充 skill
- npx 一条命令自动检测项目工具并安装
- 跨平台兼容性修复：Windows `cpSync` 问题、低版本 Node 兼容、Antigravity/Aider/Gemini CLI 自动生成 bootstrap

---

## v1.0.0 (2026-03-09)

- 中文 fork 初始版本，基于上游 `obra/superpowers` v5.0.0 翻译。
- 完整翻译 14 个上游 skill。
- 首批支持 Claude Code 一种工具。
