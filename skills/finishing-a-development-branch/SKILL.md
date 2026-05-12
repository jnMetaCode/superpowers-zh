---
name: finishing-a-development-branch
description: 当实现完成、所有测试通过、需要决定如何集成工作时使用——通过提供合并、PR 或清理等结构化选项来引导开发工作的收尾
---

# 完成开发分支

## 概述

通过提供清晰的选项并执行所选工作流来引导开发工作的收尾。

**核心原则：** 验证测试 → 检测环境 → 展示选项 → 执行选择 → 清理。

**开始时宣布：** "我正在使用 finishing-a-development-branch 技能来完成这项工作。"

## 流程

### 步骤 1：验证测试

**在展示选项之前，验证测试通过：**

```bash
# 运行项目的测试套件
npm test / cargo test / pytest / go test ./...
```

**如果测试失败：**

```
测试失败（<N> 个失败）。必须先修复才能继续：

[显示失败信息]

在测试通过之前无法进行合并/PR。
```

停止。不要继续到步骤 2。

**如果测试通过：** 继续步骤 2。

### 步骤 2：检测环境

**在展示选项之前，先确定工作区状态：**

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
```

这决定了展示哪种菜单、以及清理方式：

| 状态 | 菜单 | 清理 |
|------|------|------|
| `GIT_DIR == GIT_COMMON`（普通仓库） | 标准 4 个选项 | 无 worktree 可清理 |
| `GIT_DIR != GIT_COMMON`，命名分支 | 标准 4 个选项 | 按来源判断（见步骤 6） |
| `GIT_DIR != GIT_COMMON`，分离 HEAD | 收敛 3 个选项（无合并） | 无清理（由外部管理） |

### 步骤 3：确定基础分支

```bash
# 尝试常见的基础分支
git merge-base HEAD main 2>/dev/null || git merge-base HEAD master 2>/dev/null
```

或者询问："这个分支是从 main 分出来的——对吗？"

### 步骤 4：展示选项

**普通仓库和命名分支 worktree —— 准确展示以下 4 个选项：**

```
实现已完成。你想怎么做？

1. 在本地合并回 <base-branch>
2. 推送并创建 Pull Request
3. 保持分支现状（我稍后处理）
4. 丢弃这项工作

选哪个？
```

**分离 HEAD —— 准确展示以下 3 个选项：**

```
实现已完成。你在分离 HEAD 上（由外部管理的工作区）。

1. 作为新分支推送并创建 Pull Request
2. 保持现状（我稍后处理）
3. 丢弃这项工作

选哪个？
```

**不要添加解释** —— 保持选项简洁。

### 步骤 5：执行选择

#### 选项 1：本地合并

```bash
# 切到主仓库根目录，保证 CWD 安全
MAIN_ROOT=$(git -C "$(git rev-parse --git-common-dir)/.." rev-parse --show-toplevel)
cd "$MAIN_ROOT"

# 先合并 —— 在删除任何东西之前先验证合并成功
git checkout <base-branch>
git pull
git merge <feature-branch>

# 在合并结果上验证测试
<test command>

# 合并成功之后再：清理 worktree（步骤 6），然后删除分支
```

然后：清理 worktree（步骤 6），再删除分支：

```bash
git branch -d <feature-branch>
```

#### 选项 2：推送并创建 PR

```bash
# 推送分支
git push -u origin <feature-branch>

# 创建 PR
gh pr create --title "<title>" --body "$(cat <<'EOF'
## 摘要
<2-3 条变更要点>

## 测试计划
- [ ] <验证步骤>
EOF
)"
```

**不要清理 worktree** —— 用户在 PR 反馈迭代时还需要它存活。

#### 选项 3：保持现状

报告："保留分支 <name>。工作树保留在 <path>。"

**不要清理工作树。**

#### 选项 4：丢弃

**先确认：**

```
这将永久删除：
- 分支 <name>
- 所有提交：<commit-list>
- 工作树 <path>

输入 'discard' 确认。
```

等待精确的确认。

确认后：

```bash
MAIN_ROOT=$(git -C "$(git rev-parse --git-common-dir)/.." rev-parse --show-toplevel)
cd "$MAIN_ROOT"
```

然后：清理 worktree（步骤 6），再强制删除分支：

```bash
git branch -D <feature-branch>
```

### 步骤 6：清理工作区

**只对选项 1 和 4 执行。** 选项 2 和 3 始终保留 worktree。

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
WORKTREE_PATH=$(git rev-parse --show-toplevel)
```

**如果 `GIT_DIR == GIT_COMMON`：** 普通仓库，无 worktree 可清理。结束。

**如果 worktree 路径在 `.worktrees/`、`worktrees/` 或 `~/.config/superpowers/worktrees/` 之下：** 这是 Superpowers 创建的 worktree —— 我们负责清理。

```bash
MAIN_ROOT=$(git -C "$(git rev-parse --git-common-dir)/.." rev-parse --show-toplevel)
cd "$MAIN_ROOT"
git worktree remove "$WORKTREE_PATH"
git worktree prune  # 自愈：清理任何过期的注册记录
```

**否则：** 这个工作区由宿主环境（harness）管理。**不要**移除它。如果你的平台提供了工作区退出工具，用它。否则原样保留工作区。

## 快速参考

| 选项 | 合并 | 推送 | 保留工作树 | 清理分支 |
|------|------|------|-----------|---------|
| 1. 本地合并 | ✓ | - | - | ✓ |
| 2. 创建 PR | - | ✓ | ✓ | - |
| 3. 保持现状 | - | - | ✓ | - |
| 4. 丢弃 | - | - | - | ✓（强制） |

## 常见错误

**跳过测试验证**

- **问题：** 合并损坏的代码、创建失败的 PR
- **修复：** 在提供选项前始终验证测试

**开放式问题**

- **问题：** "接下来该做什么？" → 含糊不清
- **修复：** 准确展示 4 个结构化选项（分离 HEAD 时是 3 个）

**为选项 2 清理 worktree**

- **问题：** 删掉用户 PR 迭代还需要的 worktree
- **修复：** 只在选项 1 和 4 时清理

**先删分支再删 worktree**

- **问题：** `git branch -d` 失败，因为 worktree 还引用着该分支
- **修复：** 先合并，再删 worktree，最后删分支

**在 worktree 内部跑 `git worktree remove`**

- **问题：** 当 CWD 在被删除的 worktree 内时，命令静默失败
- **修复：** 跑 `git worktree remove` 前先 `cd` 到主仓库根目录

**清理 harness 拥有的 worktree**

- **问题：** 移除 harness 创建的 worktree 会造成幻影状态
- **修复：** 只清理 `.worktrees/`、`worktrees/` 或 `~/.config/superpowers/worktrees/` 下的 worktree

**丢弃时不确认**

- **问题：** 意外删除工作成果
- **修复：** 要求输入 'discard' 确认

## 红线

**绝不：**

- 在测试失败时继续
- 合并前不验证合并结果上的测试
- 不确认就删除工作成果
- 未经明确请求就强制推送
- 在确认合并成功之前移除 worktree
- 清理不是你创建的 worktree（按来源判断）
- 在 worktree 内部跑 `git worktree remove`

**始终：**

- 在提供选项前验证测试
- 展示菜单前检测环境
- 准确展示 4 个选项（分离 HEAD 时是 3 个）
- 选项 4 要求输入确认
- 只在选项 1 和 4 时清理 worktree
- 移除 worktree 前 `cd` 到主仓库根目录
- 移除后跑 `git worktree prune`

## 集成

**被以下技能调用：**

- **subagent-driven-development**（步骤 7）- 所有任务完成后
- **executing-plans**（步骤 5）- 所有批次完成后

**配合使用：**

- **using-git-worktrees** - 清理由该技能创建的工作树
