# superpowers-zh（AI 编程超能力 · 中文增强版）

🌐 **简体中文** | [English (upstream)](https://github.com/obra/superpowers)

> 🦸 **superpowers（116k+ ⭐）完整汉化 + 6 个中国原创 skills** — 让 Claude Code / Copilot CLI / Hermes Agent / Cursor / Windsurf / Kiro / Gemini CLI 等 **17 款 AI 编程工具**真正会干活。从头脑风暴到代码审查，从 TDD 到调试，每个 skill 都是经过实战验证的工作方法论。

Chinese community edition of [superpowers](https://github.com/obra/superpowers) — 20 skills across 16 AI coding tools, including full translations and China-specific development skills.

<!-- 效果对比 -->
<table>
<tr><td>

**没装 superpowers-zh：**
```
你：给用户模块加个批量导出功能
AI：好的，我来实现...（直接开始写代码）
    export async function exportUsers() { ... }
你：等等，格式不对，没分页，大数据量会 OOM...
```

</td><td>

**装了 superpowers-zh：**
```
你：给用户模块加个批量导出功能
AI：在开始实现之前，我需要了解几个关键问题：
    1. 导出格式是 CSV 还是 Excel？
    2. 预计数据量多大？需要异步处理吗？
    3. 有权限要求吗？
    → 给出 2-3 个方案，确认后再动手
```

</td></tr>
</table>

[![GitHub stars](https://img.shields.io/github/stars/jnMetaCode/superpowers-zh?style=social)](https://github.com/jnMetaCode/superpowers-zh)
[![npm version](https://img.shields.io/npm/v/superpowers-zh)](https://www.npmjs.com/package/superpowers-zh)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://makeapullrequest.com)


### 📊 项目规模

| 📦 翻译 Skills | 🇨🇳 中国特色 Skills | 🤖 支持工具 |
|:---:|:---:|:---:|
| **14** | **6** | **Claude Code / Copilot CLI / Hermes Agent / Cursor / Windsurf / Kiro / Gemini CLI / Codex / Aider / Trae / VS Code (Copilot) / DeerFlow / OpenCode / OpenClaw / Qwen Code / Antigravity / Claw Code** |

---

## 这是什么？

[superpowers](https://github.com/obra/superpowers) 是目前最火的 AI 编程 skills 框架（116k+ stars），为 AI 编程工具提供**系统化的工作方法论**。

**superpowers-zh** 在完整翻译的基础上，新增了面向中国开发者的特色 skills。

### 🤖 支持 17 款主流 AI 编程工具

| 工具 | 类型 | 一键安装 | 手动安装 |
|------|------|:---:|:---:|
| [Claude Code](https://claude.ai/code) | CLI | `npx superpowers-zh` | `.claude/skills/` |
| [Copilot CLI](https://githubnext.com/projects/copilot-cli) | CLI | `npx superpowers-zh --tool copilot` | `.claude/skills/` |
| [Hermes Agent](https://github.com/NousResearch/hermes-agent) | CLI | `npx superpowers-zh --tool hermes` | `.hermes/skills/` |
| [Cursor](https://cursor.sh) | IDE | `npx superpowers-zh` | `.cursor/skills/` |
| [Windsurf](https://codeium.com/windsurf) | IDE | `npx superpowers-zh` | `.windsurf/skills/` |
| [Kiro](https://kiro.dev) | IDE | `npx superpowers-zh` | `.kiro/steering/` |
| [Gemini CLI](https://github.com/google-gemini/gemini-cli) | CLI | `npx superpowers-zh` | `.gemini/skills/` |
| [Codex CLI](https://github.com/openai/codex) | CLI | `npx superpowers-zh` | `.codex/skills/` |
| [Aider](https://aider.chat) | CLI | `npx superpowers-zh` | `.aider/skills/` |
| [Trae](https://trae.ai) | IDE | `npx superpowers-zh` | `.trae/skills/` + `.trae/rules/` |
| [VS Code](https://code.visualstudio.com) (Copilot) | IDE 插件 | `npx superpowers-zh` | `.github/superpowers/` |
| [DeerFlow 2.0](https://github.com/bytedance/deer-flow) | Agent 框架 | `npx superpowers-zh` | `skills/custom/` |
| [OpenCode](https://opencode.ai) | CLI | `npx superpowers-zh` | `.opencode/skills/` |
| [OpenClaw](https://github.com/anthropics/openclaw) | CLI | `npx superpowers-zh` | `skills/` |
| [Qwen Code](https://tongyi.aliyun.com/lingma) (通义灵码) | IDE 插件 | `npx superpowers-zh` | `.qwen/skills/` |
| [Antigravity](https://github.com/anthropics/antigravity) | CLI | `npx superpowers-zh` | `.antigravity/skills/` |
| [Claw Code](https://github.com/ultraworkers/claw-code) | CLI (Rust) | `npx superpowers-zh` | `.claw/skills/` |

> 运行 `npx superpowers-zh` 会自动检测你项目中使用的工具，将 20 个 skills 安装到正确位置。

### 翻译的 Skills（14 个）

| Skill | 用途 |
|-------|------|
| **头脑风暴** (brainstorming) | 需求分析 → 设计规格，不写代码先想清楚 |
| **编写计划** (writing-plans) | 把规格拆成可执行的实施步骤 |
| **执行计划** (executing-plans) | 按计划逐步实施，每步验证 |
| **测试驱动开发** (test-driven-development) | 严格 TDD：先写测试，再写代码 |
| **系统化调试** (systematic-debugging) | 四阶段调试法：定位→分析→假设→修复 |
| **请求代码审查** (requesting-code-review) | 派遣审查 agent 检查代码质量 |
| **接收代码审查** (receiving-code-review) | 技术严谨地处理审查反馈，拒绝敷衍 |
| **完成前验证** (verification-before-completion) | 证据先行——声称完成前必须跑验证 |
| **派遣并行 Agent** (dispatching-parallel-agents) | 多任务并发执行 |
| **子 Agent 驱动开发** (subagent-driven-development) | 每个任务一个 agent，两轮审查 |
| **Git Worktree 使用** (using-git-worktrees) | 隔离式特性开发 |
| **完成开发分支** (finishing-a-development-branch) | 合并/PR/保留/丢弃四选一 |
| **编写 Skills** (writing-skills) | 创建新 skill 的方法论 |
| **使用 Superpowers** (using-superpowers) | 元技能：如何调用和优先使用 skills |

### 🇨🇳 中国特色 Skills（6 个）

| Skill | 用途 | 上游有吗？ |
|-------|------|:---:|
| **中文代码审查** (chinese-code-review) | 符合国内团队文化的代码审查规范 | 无 |
| **中文 Git 工作流** (chinese-git-workflow) | 适配 Gitee/Coding/极狐 GitLab | 无 |
| **中文技术文档** (chinese-documentation) | 中文排版规范、中英混排、告别机翻味 | 无 |
| **中文提交规范** (chinese-commit-conventions) | 适配国内团队的 commit message 规范 | 无 |
| **MCP 服务器构建** (mcp-builder) | 构建生产级 MCP 工具，扩展 AI 能力边界 | 无 |
| **工作流执行器** (workflow-runner) | 在 AI 工具内运行多角色 YAML 工作流 | 无 |

---

## 快速开始

### 方式一：npm 安装（推荐）

```bash
cd /your/project
npx superpowers-zh
```

### 方式二：手动安装

```bash
# 克隆仓库
git clone https://github.com/jnMetaCode/superpowers-zh.git

# 复制 skills 到你的项目（选择你使用的工具）
cp -r superpowers-zh/skills /your/project/.claude/skills      # Claude Code / Copilot CLI
cp -r superpowers-zh/skills /your/project/.hermes/skills      # Hermes Agent
cp -r superpowers-zh/skills /your/project/.cursor/skills      # Cursor
cp -r superpowers-zh/skills /your/project/.codex/skills       # Codex CLI
cp -r superpowers-zh/skills /your/project/.kiro/steering      # Kiro
cp -r superpowers-zh/skills /your/project/skills/custom       # DeerFlow 2.0
cp -r superpowers-zh/skills /your/project/.trae/rules         # Trae
cp -r superpowers-zh/skills /your/project/.antigravity        # Antigravity
cp -r superpowers-zh/skills /your/project/.github/superpowers # VS Code (Copilot)
cp -r superpowers-zh/skills /your/project/skills              # OpenClaw
cp -r superpowers-zh/skills /your/project/.windsurf/skills   # Windsurf
cp -r superpowers-zh/skills /your/project/.gemini/skills     # Gemini CLI
cp -r superpowers-zh/skills /your/project/.aider/skills      # Aider
cp -r superpowers-zh/skills /your/project/.opencode/skills   # OpenCode
cp -r superpowers-zh/skills /your/project/.qwen/skills       # Qwen Code
cp -r superpowers-zh/skills /your/project/.claw/skills       # Claw Code（Rust 版）
```

### 方式三：在配置文件中引用

根据你使用的工具，在对应配置文件中引用 skills：

| 工具 | 配置文件 | 说明 |
|------|---------|------|
| Claude Code | `CLAUDE.md` | 项目根目录 |
| Copilot CLI | `CLAUDE.md` | 与 Claude Code 共用插件格式 |
| Hermes Agent | `HERMES.md` 或 `.hermes.md` | 项目根目录，安装时自动生成 |
| Kiro | `.kiro/steering/*.md` | 支持 always/globs/手动三种模式 |
| DeerFlow 2.0 | `skills/custom/*/SKILL.md` | 字节跳动开源 SuperAgent，自动发现自定义 skills |
| Trae | `.trae/rules/project_rules.md` | 项目级规则 |
| Antigravity | `GEMINI.md` 或 `AGENTS.md` | 项目根目录 |
| VS Code | `.github/copilot-instructions.md` | Copilot 自定义指令 |
| Cursor | `.cursor/rules/*.md` | 项目级规则目录 |
| OpenClaw | `skills/*/SKILL.md` | 工作区级 skills 目录，自动发现 |
| Windsurf | `.windsurf/skills/*/SKILL.md` | 项目级 skills 目录 |
| Gemini CLI | `.gemini/skills/*/SKILL.md` | 项目级 skills 目录 |
| Aider | `.aider/skills/*/SKILL.md` | 项目级 skills 目录 |
| OpenCode | `.opencode/skills/*/SKILL.md` | 项目级 skills 目录 |
| Hermes Agent | `.hermes/skills/*/SKILL.md` | 项目级 skills 目录 |
| Qwen Code | `.qwen/skills/*/SKILL.md` | 项目级 skills 目录 |
| Claw Code | `.claw/skills/*/SKILL.md` | Rust 版 CLI agent，兼容 Claude Code 的 SKILL.md 格式 |

> **详细安装指南**：[Kiro](docs/README.kiro.md) · [DeerFlow](docs/README.deerflow.md) · [Trae](docs/README.trae.md) · [Antigravity](docs/README.antigravity.md) · [VS Code](docs/README.vscode.md) · [Codex](docs/README.codex.md) · [OpenCode](docs/README.opencode.md) · [OpenClaw](docs/README.openclaw.md) · [Windsurf](docs/README.windsurf.md) · [Gemini CLI](docs/README.gemini-cli.md) · [Aider](docs/README.aider.md) · [Qwen Code](docs/README.qwen.md) · [Hermes Agent](docs/README.hermes.md)

---

## 对比上游

| 特性 | superpowers (英文) | superpowers-zh (中文) |
|------|-------------------|----------------------|
| Skills 数量 | 14 | **20**（14 翻译 + 6 原创） |
| 语言 | 英文 | 中文（技术术语保留英文） |
| 代码审查规范 | 西方直接风格 | 适配国内团队沟通文化 |
| Git 平台 | GitHub 为主 | GitHub + Gitee + Coding + 极狐 |
| Git 提交规范 | 无 | Conventional Commits 中文适配 |
| 文档规范 | 英文 | 中文排版规范 + 中英混排 |
| MCP 构建 | 无 | MCP 服务器构建方法论 |
| 社区 | Discord | 微信公众号 + 微信群 |

---

## 贡献

欢迎参与！翻译改进、新增 skills、Bug 修复都可以。

### 贡献方向

我们只接收符合 superpowers 定位的 skill——**AI 编程工作流方法论**。好的 skill 应该：

- 教 AI 助手**怎么干活**，而不是某个框架/语言的教程
- 解决上游英文版不覆盖的**中国开发者痛点**
- 有明确的步骤、检查清单、示例，AI 加载后能直接执行

欢迎提 Issue 讨论你的想法！

---

## 交流 · Community

微信公众号 **「AI不止语」**（微信搜索 `AI_BuZhiYu`）— 技术问答 · 项目更新 · 实战文章

| 渠道 | 加入方式 |
|------|---------|
| QQ 群 | [点击加入](https://qm.qq.com/q/EeNQA9xCxy)（群号 1071280067） |
| 微信群 | 关注公众号后回复「群」获取入群方式 |

---

## 致谢

- 原始英文版：[obra/superpowers](https://github.com/obra/superpowers)（MIT 协议）
- 感谢 [@obra](https://github.com/obra) 创建了这个优秀的项目
- 姊妹项目：
  - [ai-coding-guide](https://github.com/jnMetaCode/ai-coding-guide) — AI 编程工具实战指南 — 66 个 Claude Code 技巧 + 9 款工具最佳实践 + 可复制配置模板
  - [agency-agents-zh](https://github.com/jnMetaCode/agency-agents-zh) — 187 个专业角色，让 AI 变成安全工程师、DBA、产品经理等
  - [agency-orchestrator](https://github.com/jnMetaCode/agency-orchestrator) — 多智能体编排引擎 — 用 YAML 编排 187 个角色协作，支持 DeepSeek/Claude/OpenAI/Ollama，零代码
  - [shellward](https://github.com/jnMetaCode/shellward) — AI 智能体安全中间件 — 注入检测、数据防泄露、命令安全、零依赖、MCP Server

---

## 许可证

MIT License — 自由使用，商业或个人均可。

---

<div align="center">

**🦸 AI 编程超能力：让 Claude Code / Hermes Agent / Cursor / Claw Code 等 17 款工具真正会干活**

[Star 本项目](https://github.com/jnMetaCode/superpowers-zh) · [提交 Issue](https://github.com/jnMetaCode/superpowers-zh/issues) · [贡献代码](https://github.com/jnMetaCode/superpowers-zh/pulls)

</div>
