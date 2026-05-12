# Superpowers-ZH 中文版 Release Notes

> 本文档记录 `jnMetaCode/superpowers-zh` 中文 fork 自身的 release 历史。
>
> 上游 `obra/superpowers` 的英文 release notes 见 [`RELEASE-NOTES.md`](./RELEASE-NOTES.md)（原样保留，未翻译）。

---

## v1.4.0 (2026-05-12)

本版本核心目标：**修复全量质量审计发现的所有上游漂移 P0 缺陷**。改动全部是"主站有的同步过来"性质，不引入主站没有的新功能。

### 🔴 上游同步：v5.0.6 brainstorm server 拆分（PR #30）

上游 v5.0.6（commit 9e3ed21）把 brainstorm server 的内容目录拆成 `CONTENT_DIR` + `STATE_DIR` peer 结构，但我们的 server 脚本还停在旧 `SCREEN_DIR` 单目录版本，导致 visual brainstorming 教程指向新路径但 server 用旧结构卡死。

- `skills/brainstorming/scripts/server.cjs` — 81 行 cherry-pick 同步
- `skills/brainstorming/scripts/start-server.sh` — 36 行同步
- `skills/brainstorming/scripts/stop-server.sh` — 29 行同步

**修复后：所有 visual brainstorming 用户路径解析正常。**

### 🔴 上游同步：v5.1.0 Code Review 整合（PR #30）

上游 v5.1.0 PR #1299 把 reviewer persona + checklist + dispatch 模板整合到单一 `code-reviewer.md` 实现 self-contained，并把 SKILL.md 里的 `superpowers:code-reviewer` 命名子代理引用改成 `general-purpose` Task + 模板路径形式。我们的版本停留在 v5.0.x 拆分式。

- `skills/requesting-code-review/SKILL.md` 改 4 处：3 处 `superpowers:code-reviewer` 引用清零；占位符从 5 个精简到 4 个对齐上游；"执行计划" 集成段从 "每批（3 个任务）后审查" 改为 "每个任务完成后或在自然 checkpoint 审查"（对齐上游 v5.1.0 subagent 节奏调整）
- `skills/requesting-code-review/code-reviewer.md` 完整重写为 v5.1.0 self-contained 版（H header 6/6 对齐上游）

**修复后：所有走 review 流程的用户得到的指令指向 `general-purpose` Task 而非已废弃的命名子代理。**

### 🔴 上游同步：v5.1.0 worktree 安全修复（PR #28）

上游 v5.1.0 [#991](https://github.com/obra/superpowers/issues/991) 修复了两类 worktree 安全问题：subagent 嵌套创建 + cleanup 误删 harness-managed workspace。

- `skills/using-git-worktrees/SKILL.md` 全面重构：新增 Step 0 检测现有隔离（GIT_DIR/GIT_COMMON + submodule 守卫 + 同意流程）；Step 1 重组为 1a Native Tools + 1b Git Worktree Fallback + 沙盒回退；删除旧"示例工作流"段（含 `/Users/jesse` 硬编码）
- `skills/finishing-a-development-branch/SKILL.md` 全面重构：新增 Step 2 检测环境（三态表）；旧 Step 2-5 重编号为 3-6；Step 4 新增分离 HEAD 3 选项变体；Step 5 Option 1 重写（MAIN_ROOT cwd safety + merge→verify→cleanup→delete 严格排序）；Step 6 清理范围限定在 `.worktrees/` / `worktrees/` / `~/.config/superpowers/worktrees/`，外部 harness-managed workspace 一律不动

**修复后：subagent 不再嵌套创建 worktree；清理不会误删 harness-managed workspace。**

### 🔴 平台兼容性修复：Windows Cursor hook 回归（PR #30）

`hooks/hooks-cursor.json` 的 command 之前被本地改成直接调 unix shell `./hooks/session-start`，丢失上游的 polyglot wrapper `./hooks/run-hook.cmd session-start`，Windows + Cursor 组合用户 hook 完全不触发。

- 1 行恢复上游 polyglot wrapper

**修复后：Windows Cursor 用户 hook 正常触发。**

### 🆕 防回归基建：CI 自动漂移检测（PR #31）

新增 `scripts/audit.sh` + `.github/workflows/audit.yml`，每次 PR 自动跑 4 类共 90+ 项检查：

1. 静态校验（JSON parse / SKILL.md frontmatter / symlink / hook 可执行性）
2. Installer 功能（17 款工具装/重装/卸载全跑）
3. 上游对齐（hooks 4 文件 + brainstorm scripts 3 文件 + 14 翻译 skill 结构层级 + code-reviewer.md self-contained 结构）
4. 交叉引用（README → docs/ 链接 + skill 间引用 + 装完后 .claude/skills/using-superpowers/SKILL.md 路径解析）

WARN（不阻塞）vs FAIL（阻塞）分级：本次"4 个 P0 漂"事件如果当时有这个 audit 在 CI 跑，PR 阶段就会被拦下。

**未来意义：维护者下次手抖把 `hooks-cursor.json` 改坏 / 上游同步漏一项，CI 立刻拦下。**

### 🔧 工具链小修

- `scripts/sync-plugin-version.js` 加入 `gemini-extension.json`（之前漏掉，导致 gemini extension manifest 卡在 1.1.6 老版本）
- `package.json` 的 `version` 钩子 git add 列表同步更新

### 安装路径方针澄清

本版本明确：**有官方 plugin marketplace 的工具（Claude Code / Codex CLI / OpenCode / VS Code）首选 marketplace 路径**，npx `superpowers-zh` 主要服务没有 marketplace 的工具（Cursor / Trae / Kiro / Gemini CLI / Hermes / Aider / Antigravity / Windsurf / Qwen / Claw / OpenClaw / DeerFlow 共 13 款）。fork 不再尝试给 marketplace 工具加 npx 路径的"完整支持"——它们走主站路径即可。

### 不在本版本范围

- `executing-plans/SKILL.md` 我们扩写了 105 行中文示例（主动选择，保留——是 fork 的中文优化，非漂移）
- `using-superpowers/SKILL.md` 的"中国特色技能路由"段（fork 增量，保留）
- 各 reviewer-prompt.md 翻译差异（结构对齐，纯翻译漂移，无行为 bug）
- open issues #18/#21/#26/#20（fork 增量需求，按方针延后）

### Refs

- PR #28（worktree 安全修复）
- PR #30（brainstorm scripts + code-reviewer 整合 + hooks-cursor + SKILL.md 引用）
- PR #31（audit script + CI workflow）
- issue #19 跟踪上游 v5.0.6 / v5.1.0 同步 → 关键项目全部覆盖

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

- **`.cursor-plugin/plugin.json`** 删除 dangling 的 `"agents": "./agents/"` 和 `"commands": "./commands/"` 两行。上游 v5.1.0 删了目录但忘了同步清理 manifest（git blame 显示这两行从 2026-02-13 加入后从未更新）。中文 fork 主动修掉（向上游开 issue 是后续动作）。

### 修中文版自己的老漂移（PR #23）

- **`.claude-plugin/marketplace.json`** 的 `plugins[0].version` 卡在 `1.1.8` 的老漂移修复（追上其他 4 个 manifest，1.3.0 release 时统一升到 1.3.0）。原因是中文版简化版 `sync-plugin-version.js` 之前只 match 顶层 `"version":` 字段，跳过嵌套位置；导致 Claude Code marketplace 用户看到的 plugin 版本一直停在 1.1.8，跟 npm 包真实版本不同步。
- **`scripts/sync-plugin-version.js`** 增强为支持嵌套字段路径（`plugins.0.version`）。`TARGETS` 改为对象数组 `{ path, field }`，对齐上游 `.version-bump.json` 格式。仍使用 regex 替换而非 JSON re-stringify，保留原文件格式（缩进、行内/多行数组等不被破坏）。

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
