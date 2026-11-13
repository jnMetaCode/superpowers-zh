# Superpowers 中文版 — Antigravity 安装指南

在 [Google Antigravity](https://antigravity.google)（Google AI IDE）中使用 superpowers-zh 的完整指南。

## 快速安装

```bash
cd /your/project
npx superpowers-zh --tool antigravity
```

这是项目级 skills 复制安装，不是 `agy` 原生全局插件导入。

## Antigravity CLI 原生插件迁移（#135）

官方 CLI 支持从已有的 Claude Code 或 Gemini CLI 安装迁移插件：

```bash
agy --version
agy plugin import --help
# 已通过 Claude Code 插件渠道安装 superpowers-zh 时：
agy plugin import claude
# 或：已通过 Gemini CLI extension 渠道安装时：
agy plugin import gemini
agy plugin list --json
```

按命令的交互提示检查迁移对象。`import claude` / `import gemini` 面向已有安装，不是给 `npx` 复制的技能注册全局插件；如果源工具中没有安装本插件，先按本仓对应工具指南安装。不要为尝试迁移而混用两套源安装。

官方当前说明将原生插件放在 `~/.gemini/config/plugins/`，并由 `agy plugin list --json` 报告实际路径、启用状态和组件名称。以命令报告为准，不要手动复制到旧文档中的内部缓存路径。

此处仅补齐官方迁移方式，**本仓已补齐原生 manifest、版本同步与分发，但尚未完成该路径的端到端验收，#135 不能据此视为已修复**。验收需保留完整记录：

1. 源工具插件版本、`agy` 版本、迁移命令和输出。
2. 插件列表中出现已启用的 superpowers-zh，且能看到 `using-superpowers` 和 `brainstorming`。
3. 在干净项目里新开会话，发送 `Let's make a react todo list`；在写代码前自动进入 brainstorming，不能靠手动调用技能通过验收。

迁移完成后，原生插件应通过 `agy` 管理：

```bash
agy plugin list
agy plugin disable superpowers-zh
agy plugin enable superpowers-zh
agy plugin uninstall superpowers-zh
```

上面的名称须与实际列表一致；`npx superpowers-zh --uninstall` 只处理复制安装，不负责卸载 `agy` 管理的原生插件。

来源：[官方插件与迁移命令](https://antigravity.google/docs/plugins#cli-shell-subcommands-agy-plugin)、[Gemini CLI 迁移说明](https://antigravity.google/docs/cli/gcli-migration/)。核对日期：2026-11-12。

## 手动安装

```bash
git clone https://github.com/jnMetaCode/superpowers-zh.git
mkdir -p /your/project/.agents/skills
cp -r superpowers-zh/skills/* /your/project/.agents/skills/
```

## 工作原理

官方规则指南列出 `AGENTS.md`、`GEMINI.md` 和 `.agents/rules/*.md` 等规则入口；本页不假定它们存在固定优先级，也不假定 `CLAUDE.md` 会被读取。详见[官方规则说明](https://www.antigravity.google/docs/rules-workflows?tab=ide)。

### 推荐配置方式

**方式一**：在项目根目录创建 `GEMINI.md`：

```markdown
# GEMINI.md

使用 .agents/ 目录下的 superpowers skills 来指导工作流程。
优先使用 brainstorming（头脑风暴）开始新任务。

Skills 列表参见 .agents/ 目录。
```

**方式二**：在 `AGENTS.md` 中引用（多工具共享）：

```markdown
# AGENTS.md

本项目使用 superpowers-zh skills 框架。
Skills 位于 .agents/（Antigravity）或 .claude/skills/（Claude Code）目录下。
```

### 工具映射

CLI 的任务跟踪和子智能体工具映射见 [antigravity-tools.md](../skills/using-superpowers/references/antigravity-tools.md)。其他操作使用当前会话实际暴露的工具；不要假定 Claude Code 的工具名称会自动适配。

## 使用

Antigravity 支持 Agent Manager 并行执行多个 agent：
- 与 superpowers-zh 的「派遣并行 Agent」skill 理念一致
- 可以同时调度多个 skill 处理不同任务

## 全局规则

个人级别的全局规则放在：
```
~/.gemini/GEMINI.md
~/.gemini/AGENTS.md
```

## 更新

```bash
cd /your/project
npx superpowers-zh
```

## 获取帮助

- 提交 Issue：https://github.com/jnMetaCode/superpowers-zh/issues
- Antigravity 文档：https://antigravity.google/docs/rules-workflows
