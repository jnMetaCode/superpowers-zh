# Superpowers-ZH 中文版 Release Notes

> 本文档记录 `jnMetaCode/superpowers-zh` 中文 fork 自身的 release 历史。
>
> 上游 `obra/superpowers` 的英文 release notes 见 [`RELEASE-NOTES.md`](./RELEASE-NOTES.md)（原样保留，未翻译）。

---

## v1.7.0 (2026-07-13)

### 🆕 新增两款国产 IDE 工具支持（工具数 18 → 20）

- **CodeBuddy**（腾讯 AI IDE，关 #18 / #75）：`.codebuddy/skills/` + `CODEBUDDY.md` bootstrap，加载机制类似 Claude Code。仅项目级（用户级加载路径未证实，暂不做全局）。
- **华为云码道 CodeArts**（关 #20）：`.codeartsdoer/skills/`，**skills-only** 适配（其 bootstrap/指令文件约定未证实，靠 CodeArts 自身 skill 发现；docs 已说明，不自动触发可手动点名 skill）。
- 两者均**逐一核对配置来源**（owner 核实 / 用户实测），不臆造无效路径。工具计数在 README / 站点 / package / FAQ / audit 全量同步。

### 🌐 官网 + README 多语言（新增繁体）

- **官网**（#100）重构为 `LANGS` 语言列表驱动，新增**繁体中文站**（zh-Hant）：63 页（3 语言 × (首页 + 20 skill 详情)），语言切换器 / hreflang / sitemap 齐全；以后加语言只需加一项 + 一个翻译对象。
- **README**（#101）加语言切换栏，新增完整 `README.zh-Hant.md`（353 行对齐，台港自然术语）。
- 繁体均**手写**（台港术语：程式碼 / 專案 / 除錯 / 全域 / 檔案 等），不引入 OpenCC 依赖。日文按定位不纳入本仓库（应作独立 `superpowers-ja`）。

### 🧹 官网下架赞助商展示

- 移除官网与 README 的赞助商板块（含 5Cookie Code 展示卡 / logo / 样式 / 资源），仅保留一行赞助联系方式；官网切自定义域名 `sp.aiolaola.com`。

### 🌍 全局安装（关 #21）

新增 `npx superpowers-zh --global`，一次安装、所有项目共享，解决多项目用户需要逐个项目重复安装的痛点。

- **项目级（默认）不变**：装到 `process.cwd()` 下工具目录（如 `.claude/skills`），仅当前项目生效。
- **全局（`--global`）**：装到工具的**用户级目录**（如 `~/.claude/skills`），所有项目自动共享，更新只需重装一次。**项目级优先、全局兜底**，二者可共存。
- 支持全局的工具（**逐一核对各工具 docs 声明的真实加载路径，不臆造**）：**Claude Code / Codex CLI / Qoder / Windsurf / Qwen Code / OpenClaw / OpenCode**。其中 Codex 全局装到 `~/.agents/skills`（docs 确认 Codex 启动扫描该目录，而非 `~/.codex/skills`）；Claude Code 全局 bootstrap 写 `~/.claude/CLAUDE.md`。
- **Gemini CLI / Antigravity 有意不纳入通用 `--global`**：Gemini 全局走扩展目录 `~/.gemini/extensions/*/skills/` + manifest、Antigravity 全局 skills 路径未在 docs 证实，通用复制机制覆盖不了 —— `--global` 会报错并指向各自 `docs/README.*.md`，避免「装了不生效」。
- 其余工具（Cursor / Kiro / Trae / Aider / DeerFlow / VS Code / Hermes / Claw）规则是项目级或存于应用内设置，`--global` 明确报错并提示改用项目级，绝不写入无效路径。
- 卸载对称支持：`--global --uninstall` 从用户级目录移除 skills 并按哨兵精确清理全局 bootstrap。
- home 目录护栏调整：项目级仍拒绝在 `~` 下裸装（污染所有项目），并在提示里引导改用 `--global`；全局模式本就写用户级目录，跳过该护栏。

### 📊 文案刷新

- 上游 star 数 233k+ → 250k+（站点、README、package.json description 同步，实测上游已达 252k+）。

## v1.6.1 (2026-07-06)

对齐上游 **v6.1.0 / v6.1.1** 中与我们架构相关的部分。Gemini CLI 移除是上游这两个版本里改动面最大的一项，但它牵涉我们自己的营销文案（"18 款工具"）和安装器逻辑，评估后判定为独立决策，本版本**不包含**，留待单独讨论。

### 🔧 bootstrap 精简（`using-superpowers/SKILL.md`）

翻译并合并上游"更精简的每会话 bootstrap"重写：用简洁描述替换原有的 dot 流程图、去重"指令优先级"与"技能优先级"重复内容、去掉"技能类型"（刚性/灵活）分类章节。保留了我们 fork 特有的中国特色技能路由与多工具平台适配指引（Copilot CLI / Hermes Agent / Qoder 等，上游对应文档已删但我们仍维护）。

### 🐛 Codex 插件清单修复

- `.codex-plugin/plugin.json` 补 `"hooks": {}`：Codex 在清单缺少 `hooks` 字段时会自动 fallback 扫描 `hooks/hooks.json`（我们仓库里其实是 Claude Code 的 SessionStart hook），导致 Codex 用户安装时被错误注册一个不属于它的 hook 并弹出信任提示。声明空的内联 `hooks: {}` 可以阻止这个 fallback。
- `category` 由 `"Coding"` 改为 `"Developer Tools"`，对齐上游修正。
- `references/codex-tools.md` 修正过期的子 agent 结果工具名：`wait` → `wait_agent`（`wait` 现在专指 code-mode 的 `exec/wait`，不是子 agent 结果工具），并补充"implementer/reviewer 完成后应主动 close_agent"的提示。

### 未跟进项（有意为之）

- Codex 官方 marketplace 打包基础设施（`scripts/package-codex-plugin.sh`、`.agents/plugins/marketplace.json`、`tests/codex/`）——我们的分发方式是 `npx superpowers-zh`，不走这条上游官方安装通道。
- `antigravity-tools.md` / `claude-code-tools.md` 的裁剪——我们本来就没有这两个参考文件，无需处理。
- `references/pi-tools.md` 的精简（去掉 read/write/edit/bash 等自证性映射行）——验证时发现上游自己这个 v6.1.1 版本的裁剪会让他们自己的 `tests/pi/test-pi-extension.mjs` 断言（要求文件里出现 write/edit/bash 字样）测试失败，是上游未捕获的回归。为避免把这个 bug 一起同步进来，本版本保留了原有更完整的 pi-tools.md 内容。

## v1.6.0 (2026-06-20)

本版本对齐上游 **v6.0.0** 的实质性 skill / 基础设施变更，并新增两款 harness 支持。

### 🆕 新增 harness 支持

- **Kimi Code**（#59，关 #37）—— 插件清单模型 `.kimi-plugin/plugin.json`：指向现有 `skills/`、`sessionStart` 会话开始自动加载 `using-superpowers`、`skillInstructions` 提供 Kimi 工具映射。安装：Kimi 插件管理器 `/plugins install https://github.com/jnMetaCode/superpowers-zh`。文档见 `docs/README.kimi.md`。
- **Pi (oh-my-pi)**（#60，关 #44）—— 扩展模型：`package.json` 的 `pi` 字段 + `.pi/extensions/superpowers.ts`（注册生命周期钩子，注入 `using-superpowers` bootstrap + Pi 工具映射）。文档见 `docs/README.pi.md`。

### 🔒 brainstorm 可视化伴侣安全模型（#58，同步上游 v6.0.0）

伴侣服务器重写为**每会话密钥**鉴权（`?key=` 或会话 cookie 门禁所有端点）+ 安全响应头（`X-Frame-Options: DENY`、CSP `frame-ancestors 'none'`、`Cross-Origin-Resource-Policy: same-origin` 等），修复旧版无鉴权时本地浏览器可读取屏幕/注入事件的缺口。Token 用 `crypto.randomBytes(32)`、`timingSafeEqual` 比较、token 文件 `0o600`。

### 🔧 其它 v6 同步

- **using-git-worktrees / finishing-a-development-branch**（#57）—— 移除已废弃的全局 worktree 目录 `~/.config/superpowers/worktrees/`，对齐 v6.0.0。
- **hooks/session-start**（#58）—— 移除 legacy `~/.config/superpowers/skills` 迁移警告，输出补 `| cat`。
- **opencode 测试**（#72）—— 修复 `setup.sh` 拷贝不存在的 `lib/` 导致的测试飘红。

> SDD（subagent-driven-development）的 v6 重写为性能/成本优化，需专门 eval 验证，故本版本暂未纳入（详见 #19）。

## v1.5.0 (2026-05-21)

### 🆕 Qoder 适配（第 18 款工具，#26、#34）

Qoder 是阿里推出的 AI IDE，社区有多个用户提需求要求支持。本版本完成端到端适配：

- `bin/superpowers-zh.js` — `TARGETS` 加 Qoder（`dir: .qoder/skills`，`detect: .qoder`），`TOOL_ALIASES` 加 `qoder`
- `generateQoderBootstrap()` — 生成 `.qoder/rules/superpowers-zh.md`（`trigger: always_on` + `alwaysApply: true`），让"先头脑风暴 / 先 TDD / 先验证"等核心规则每个会话自动加载，**不依赖模型对 description 的隐式匹配**
- `skills/using-superpowers/references/qoder-tools.md` — 新增工具映射 reference（Qoder 大部分工具与 Claude Code 同名，只有 `EnterPlanMode/ExitPlanMode` → `EnterSpecMode/ExitSpecMode` 一个差异；附 Quest MCP 工具清单）
- `docs/README.qoder.md` — 完整安装/使用/卸载/故障排查指南
- `scripts/audit.sh` — `TOOLS` 数组加 qoder，CI 自动跑 18 款工具的 install/idempotent/uninstall 回归

**安装方法：**

```bash
cd /your/qoder-project
npx superpowers-zh --tool qoder     # 显式
# 或在有 .qoder/ 的项目里：
npx superpowers-zh                  # 自动检测
```

装完重启 Qoder，输入 `/` 即可看到 20 个 skill。

### ⚠️ Qoder Rules schema 来源说明

Qoder Rules 的 frontmatter schema（`trigger: always_on` / `model_decision` / `manual`）**官方文档（docs.qoder.com/zh/user-guide/rules）目前未公开**。本次实现的 schema 来自 GitHub 上 4 份真实社区样本（`python-office`、`termiClaude`、`QoderTest`、`TelegramFileServer`）的交叉验证。

如果 Qoder 后续改了 schema，生成的 rule 文件可能需要打开 Qoder Settings → Rules 重新选择"始终生效"类型。

### 🔧 文案对齐

- README、CLAUDE.md、package.json description：17 款 → 18 款
- 3 个 plugin manifest（`.claude-plugin/{plugin,marketplace}.json`、`.cursor-plugin/plugin.json`）description 同步

### 设计取舍：为什么用 always_on bootstrap 而非裸 skill

社区有用户（@Yanyz-ok）建议"按 AI 编程工具拆分/重写 skill"。我们刻意**不走这条路**：

1. **skill 是工作方法论，不是工具实现** —— "先写测试再写代码"这个约束在 Claude Code、Qoder、Hermes 上落地工具不同，但方法论不变。重写会让 17 份 SKILL.md 维护负担 ×17 但本质增量 0。
2. **平台内置工具 vs skill 是嵌套关系，不是替代关系** —— Qoder/Quest 的 `search_codebase`、`update_memory` 解决"怎么做"，skill 解决"什么时候做"，模型不会混淆。
3. **上游 superpowers 明确禁止"无 eval 证据的工具专属重写"** —— fork 守同样规矩。

工具映射写在 `references/qoder-tools.md` + `docs/README.qoder.md` 里就够了，不需要每个 skill 内部复制一遍。详见 issue #26 完整讨论。

### Refs

- closes #26（建议新增 qoder 的支持）
- closes #34（建议支持 qoder，#26 重复）

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
