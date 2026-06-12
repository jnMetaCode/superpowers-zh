# Superpowers 中文版 — Antigravity 安装指南

在 [Google Antigravity](https://antigravity.google)（Google AI IDE）中使用 superpowers-zh 的完整指南。

## 快速安装

```bash
cd /your/project
npx superpowers-zh
```

安装脚本会自动检测 `.agents/` 目录并将 skills 复制到该目录。

## 手动安装

```bash
git clone https://github.com/jnMetaCode/superpowers-zh.git
mkdir -p /your/project/.agents/skills
cp -r superpowers-zh/skills/* /your/project/.agents/skills/
```

## 工作原理

Antigravity 支持多种规则文件格式：

| 文件 | 优先级 | 说明 |
|------|--------|------|
| `GEMINI.md` | 最高 | Antigravity 专属规则 |
| `AGENTS.md` | 中 | 通用规则（Antigravity、Cursor、Claude Code 共享） |
| `.agents/rules.md` | 中 | 项目级规则目录 |
| `CLAUDE.md` | 低 | 也会被自动读取 |

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

Antigravity 使用 Gemini 模型，工具名称与 Claude Code 不同：

| Claude Code | Antigravity (Gemini) |
|-------------|---------------------|
| `Read` | `read_file` |
| `Write` | `write_file` |
| `Edit` | `replace` |
| `Bash` | `run_shell_command` |
| `Skill` | `activate_skill` |

Skills 中的 Claude Code 工具名称会被 Antigravity 自动适配。

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
