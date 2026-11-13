---
name: using-superpowers
description: 在开始任何对话时使用——确立如何查找和使用技能，要求在任何响应（包括澄清性问题）之前调用 Skill 工具
version: "1.9.0-rc.1"
license: MIT
metadata:
  hermes:
    tags: [meta, getting-started]
---

<SUBAGENT-STOP>
如果你是作为子智能体被分派来执行特定任务的，忽略此技能。
</SUBAGENT-STOP>

<EXTREMELY-IMPORTANT>
如果你认为哪怕只有 1% 的可能性某个技能适用于你正在做的事情，你绝对必须调用该技能。

如果一个技能适用于你的任务，你没有选择。你必须使用它。

这不可协商。你不能通过合理化来逃避。
</EXTREMELY-IMPORTANT>

## 规则

**在任何响应或操作之前调用相关或被请求的技能**——包括澄清性问题、探索代码库、或查看文件之前。如果调用后发现技能不适合当前情况，你不需要使用它。

**在进入 EnterPlanMode 之前：** 如果你还没有头脑风暴过，先调用头脑风暴技能。

然后宣布"使用 [技能] 来 [目的]"，并严格遵循该技能。如果它有检查清单，为每个条目创建一个待办。

## 技能优先级

当多个技能都适用时，流程技能优先——它们决定处理方式，然后由实现技能（前端设计等）负责执行。头脑风暴和系统化调试是 Superpowers 中最常见的流程技能，但这条规则适用于任何流程技能。

- "让我们构建 X" → 先用 brainstorming，再用实现技能。
- "修复这个 bug" → 先用 systematic-debugging，再用领域技能。

## 红线

这些想法意味着停下——你在合理化：

| 想法 | 现实 |
|------|------|
| "这只是一个简单的问题" | 问题就是任务。检查技能。 |
| "我需要先了解更多上下文" | 技能检查在澄清性问题之前。 |
| "让我先探索一下代码库" | 技能告诉你如何探索。先检查。 |
| "我可以快速查一下 git/文件" | 文件缺少对话上下文。检查技能。 |
| "让我先收集信息" | 技能告诉你如何收集信息。 |
| "这不需要正式的技能" | 如果技能存在，就使用它。 |
| "我记得这个技能" | 技能会迭代更新。阅读当前版本。 |
| "这不算一个任务" | 行动 = 任务。检查技能。 |
| "技能太小题大做了" | 简单的事会变复杂。使用它。 |
| "让我先做这一件事" | 在做任何事之前先检查。 |
| "这样做感觉很高效" | 无纪律的行动浪费时间。技能防止这一点。 |
| "我知道那是什么意思" | 知道概念 ≠ 使用技能。调用它。 |

## 平台适配

如果你的运行环境在下面列出，请阅读对应的参考文件获取特殊说明：

- Claude Code：`references/claude-code-tools.md`
- Codex：`references/codex-tools.md`
- Pi：`references/pi-tools.md`
- Antigravity：`references/antigravity-tools.md`
- Copilot CLI：`references/copilot-tools.md`
- Hermes Agent：`references/hermes-tools.md`
- Qoder：`references/qoder-tools.md`
- Muse：`references/muse-tools.md`

Gemini CLI 用户通过 GEMINI.md 自动获得 `references/gemini-tools.md` 的工具映射。

## 中国特色技能路由

> 🇨🇳 **本节是 superpowers-zh 的增量内容，上游 obra/superpowers 没有。**
> 用于说明本 fork 原创的 chinese-* 系列 skill 何时使用。其余各节均为逐节翻译。

这 4 个 chinese-* 是**参考资料，不是工作流** —— 话术模板、排版约定、平台配置差异。
它们**只在用户显式调用时才加载**，不要根据上下文自动触发：上下文里多一份排版参考
不会让你写得更好，只会挤掉真正需要的内容。

| 用户显式说 | 加载技能 | 里面是什么 |
|------|---------|---------|
| `/chinese-code-review` | **chinese-code-review** | 中文 review 话术模板、分级标注、国内团队常见反模式应对 |
| `/chinese-git-workflow` | **chinese-git-workflow** | Gitee / Coding.net / 极狐 GitLab / CNB 的 SSH、凭据、CI 接入差异 |
| `/chinese-documentation` | **chinese-documentation** | 中英文空格、全半角标点、术语保留、中文文案排版指北约定 |
| `/chinese-commit-conventions` | **chinese-commit-conventions** | Conventional Commits 中文适配、commitlint / husky 中文模板 |

用户没点名就不要主动拉进来。反过来，用户点名了就照它执行，不要因为"看起来只是格式问题"
而跳过。

它们与翻译技能**叠加使用**，不互斥：用户要求做中文 review 时，是
requesting-code-review（流程）**加上** chinese-code-review（风格），不是二选一。

> 这个「只在显式调用时加载」是刻意决定，不是漏写（见 commit `392ff75`）。改动它需要
> eval 证据 —— 参见 PR #123 与本仓 CLAUDE.md「Skill 改动需要 eval」。

## 用户指令

用户指令（CLAUDE.md、AGENTS.md、GEMINI.md 等、直接请求）优先于技能，技能又优先于默认行为。只有当你的人类伙伴明确告诉你跳过时，才能跳过技能工作流或指令。
