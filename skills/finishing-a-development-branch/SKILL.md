---
name: finishing-a-development-branch
description: 当实现完成、所有测试通过、需要决定如何集成这份工作时使用
version: "1.8.0"
license: MIT
metadata:
  hermes:
    tags: [git, workflow]
---

# 收尾一个开发分支

## 概述

**核心原则：** 验证测试 → 检测环境 → 展示选项 → 执行选择 → 清理。

**开始时宣告：** "我正在使用 finishing-a-development-branch 技能来收尾这份工作。"

## 步骤 1：验证测试

运行项目的完整测试套件（`npm test` / `cargo test` / `pytest` / `go test ./...`）。

**如果测试失败**，报告失败并停下——菜单是在测试全绿之后才出现的：

```
测试失败（<N> 个）。完成之前必须先修：

[展示失败详情]
```

**如果测试通过：** 继续步骤 2。

## 步骤 2：检测环境

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
# 现在就捕获 —— 此刻还在工作区里面。步骤 5 会切换目录，
# 而清理（步骤 6）需要这个值
WORKTREE_PATH=$(git rev-parse --show-toplevel)
```

这决定了展示哪种菜单、以及清理方式：

| 状态 | 菜单 | 清理 |
|------|------|------|
| `GIT_DIR == GIT_COMMON`（普通仓库） | 标准 3 个选项 | 无 worktree 可清理 |
| `GIT_DIR != GIT_COMMON`，命名分支 | 标准 3 个选项 | 按来源判断（见步骤 6） |
| `GIT_DIR != GIT_COMMON`，分离 HEAD | 收敛为 2 个选项（不含合并） | 由外部管理——原地别动 |

## 步骤 3：确定基础分支

基础分支就是这份工作从哪儿分出来的那个——通常在计划里、对话里，或者分支的 upstream 里已经写明了。如果还不知道，就问："这个分支是从 <你的最佳猜测> 分出来的，对吗？"**合并之前先确认：合并到错误的基础分支，代价很高。**

## 步骤 4：展示选项

**普通仓库和命名分支 worktree——精确展示这 3 个选项：**

```
实现已完成。你想怎么做？

1. 本地合并回 <base-branch>
2. 推送并创建 Pull Request
3. 保留分支不动（我稍后自己处理）

选哪个？
```

**分离 HEAD——精确展示这 2 个选项：**

```
实现已完成。你当前处于分离 HEAD（由外部管理的工作区）。

1. 作为新分支推送并创建 Pull Request
2. 保持原样（我稍后自己处理）

选哪个？
```

**照原文展示菜单**——简洁，每个选项都来自上面的列表。**丢弃工作只在你的人类伙伴明确提出时才发生**（见下方"如果你的人类伙伴要求丢弃这份工作"）。等他们回答；集成与否是他们的决定。

## 步骤 5：执行选择

### 选项 1：本地合并

```bash
# 切到主仓库根目录，保证 CWD 安全
MAIN_ROOT=$(git -C "$(git rev-parse --git-common-dir)/.." rev-parse --show-toplevel)
cd "$MAIN_ROOT"

# 先合并 —— 在删除任何东西之前先验证合并成功
git checkout <base-branch>
git pull
git merge <feature-branch>

# 在合并结果上验证测试
<测试命令>
```

如果测试在**合并结果**上失败：停下，把 worktree 和分支原地留着，去排查——什么都还没推送，所以这次合并是本地的、可恢复的。

一旦合并结果全绿：清理 worktree（步骤 6），然后删除分支：

```bash
git branch -d <feature-branch>
```

### 选项 2：推送并创建 PR

```bash
git push -u origin <feature-branch>
# 从分离 HEAD 出发时，在远端指定新分支名：
# git push origin HEAD:refs/heads/<new-branch>
```

然后用**代码托管平台**（forge）的工具针对 <base-branch> 创建 pull/merge request——有 CLI 就用它，没有就用推送时大多数平台会打印出来的创建 URL——遵循仓库里已有的 PR 模板与约定（如果有），并把 URL 报告给你的人类伙伴。

**保留 worktree**——你的人类伙伴要在那里根据 PR 反馈继续迭代。

### 选项 3：保持原样

报告："保留分支 <name>。工作树保留在 <path>。"

### 如果你的人类伙伴要求丢弃这份工作

**这条路只作为对"明确要求把工作扔掉"的响应而存在。** 先确认：

```
这将永久删除：
- 分支 <name>
- 所有 commit：<commit 列表>
- 位于 <path> 的工作树

输入 'discard' 以确认。
```

等待**这个精确的**确认词。收到之后：

```bash
MAIN_ROOT=$(git -C "$(git rev-parse --git-common-dir)/.." rev-parse --show-toplevel)
cd "$MAIN_ROOT"
```

然后清理 worktree（步骤 6），再强制删除分支：

```bash
git branch -D <feature-branch>
```

## 步骤 6：清理工作区

**只对选项 1 和已确认的丢弃执行。** 选项 2 和 3 始终保留 worktree。两个调用方都已经切到主仓库根目录了——移除 worktree 必须从 worktree 外面执行——因此这里使用**步骤 2 里捕获的** `GIT_DIR` / `GIT_COMMON` / `WORKTREE_PATH`，也就是那次目录切换之前的值。

> ⚠️ **不要在这里重新计算这些值。** 此刻 `git rev-parse --show-toplevel` 返回的是主仓库根目录，不是 worktree 路径 —— 溯源判断会永远匹配不上，清理会静默空转，随后分支删除还会因为 worktree 仍挂着而失败。

**如果 `GIT_DIR == GIT_COMMON`：** 普通仓库，无 worktree 可清理。结束。

**如果 `WORKTREE_PATH` 在 `.worktrees/` 或 `worktrees/` 之下：** 这是 Superpowers 创建的 worktree——我们负责清理：

```bash
git worktree remove "$WORKTREE_PATH"
git worktree prune  # 自愈：清理任何过期的注册记录
```

**如果删除被拒绝**（`contains modified or untracked files`）：这个 worktree 里存着**别处都不存在**的文件 —— 未提交的计划、笔记或草稿。**绝不要自作主张加 `--force`。** 把利害关系摆给你的人类伙伴看，然后问他：

```bash
git -C "$WORKTREE_PATH" status --porcelain -uall
```

```
worktree 删除被拒绝 —— 这些文件从未被提交：

<文件列表>

1. 先把它们提交到 <branch>，再做清理
2. 把它们移到 <主仓库根目录>
3. 删掉它们（不可恢复）

选哪个？
```

按他选的做完，再删除 worktree。

**否则：** 这个工作区归宿主环境所有——原地别动。如果你的平台提供了工作区退出工具，用它。

## 快速参考

| 选项 | 合并 | 推送 | 保留工作树 | 清理分支 |
|------|------|------|-----------|---------|
| 1. 本地合并 | 是 | - | - | 是 |
| 2. 创建 PR | - | 是 | 是 | - |
| 3. 保持原样 | - | - | 是 | - |
| 丢弃（仅在明确要求时） | - | - | - | 是（强制） |

## 常见的合理化借口

| 借口 | 现实 |
|------|------|
| "测试这个会话早先通过过" | 在**你即将集成的那棵树上**跑测试套件。一次绿色运行只能证明它当时跑的那棵树。 |
| "他们显然是想合并的" | 集成是你人类伙伴的决定。把菜单摆出来，然后等。 |
| "他们看起来对这个功能收工了——我提议丢弃吧" | 菜单就是原文那样，不多不少。丢弃只在你的人类伙伴用明确的话提出时才发生。 |
| "'嗯，删掉吧'算确认了" | 只有输入 `discard` 这个词才授权删除。 |
| "PR 已经开了，worktree 现在是碍事的垃圾" | PR 反馈要在那个 worktree 里修。它得留到工作落地为止。 |
| "另外那个 worktree 看着像过期的——我顺手也清了" | 只清理 `.worktrees/` 或 `worktrees/` 之下的 worktree。其余的都属于宿主环境。 |
| "合并结果的失败大概是偶发的" | 合并结果失败会让一切停下。在你排查期间，分支和 worktree 原地不动。 |
| "基础分支明显就是 main" | 确认分叉点，或者直接问。合并到错误的基础分支，代价很高。 |
| "推送被拒了——force-push 一下就好" | 推送被拒意味着远端动过了。去排查；只有在你人类伙伴明确要求时才 force-push。 |
| "删除被拒绝了 —— 加 `--force` 只是把清理做完而已" | 被拒绝恰恰说明有文件只存在于那个 worktree 里。`--force` 会不可恢复地删掉它们。先问你的人类伙伴。 |
