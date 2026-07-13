# CodeBuddy 使用指南

[CodeBuddy](https://copilot.tencent.com)（腾讯云 AI 编程助手 / AI IDE）加载 superpowers-zh skills 的方式与 Claude Code 类似：项目根目录的 `CODEBUDDY.md` 作为 bootstrap 引导，skills 放在 `.codebuddy/skills/` 下。

## 一键安装（推荐）

在你的项目根目录运行：

```bash
npx superpowers-zh
```

自动检测到 `.codebuddy/` 或 `CODEBUDDY.md` 时会安装到 CodeBuddy。检测不到时显式指定：

```bash
npx superpowers-zh --tool codebuddy
```

安装内容：

- `.codebuddy/skills/` — 20 个 skill（每个含 `SKILL.md`）
- `CODEBUDDY.md` — bootstrap 引导（已存在则在哨兵注释间追加，不覆盖你的内容）

## Skill 加载优先级

| 位置 | 说明 |
|------|------|
| `.codebuddy/skills/` | 项目级，仅当前项目 |

> 目前仅支持项目级安装。CodeBuddy 的用户级（全局）skills 加载路径尚未验证，确认可行后再补 `--global` 支持。

## 使用

1. 安装完成后**重启 CodeBuddy**。
2. CodeBuddy 读取 `CODEBUDDY.md` 后，会在任务匹配某个 skill 的触发条件时，读取对应的 `.codebuddy/skills/<skill-name>/SKILL.md` 并遵循其流程。
3. 当任务涉及需求分析、TDD、系统化调试、代码审查等场景时，对应 skill 会被引用。

## 卸载

```bash
npx superpowers-zh --uninstall
```

移除 `.codebuddy/skills/` 下的 skills，并按哨兵注释精确切除 `CODEBUDDY.md` 里的 superpowers-zh 段落（不误删你自己的内容）。

## 故障排查

- **skills 没生效**：确认已重启 CodeBuddy；确认 `CODEBUDDY.md` 里存在 `# Superpowers-ZH 中文增强版` 段落。
- **自动检测不到**：用 `npx superpowers-zh --tool codebuddy` 显式指定。

## 反馈

- 提交 Issue：https://github.com/jnMetaCode/superpowers-zh/issues
- 项目主页：https://github.com/jnMetaCode/superpowers-zh
