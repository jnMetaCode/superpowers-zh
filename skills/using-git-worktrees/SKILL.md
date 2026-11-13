---
name: using-git-worktrees
description: 当需要开始与当前工作区隔离的功能开发，或在执行实现计划之前使用——通过原生工具或 git worktree 回退机制确保隔离工作区存在
version: "1.8.0"
license: MIT
metadata:
  hermes:
    tags: [git, workflow]
---

# 使用 Git 工作树

## 概述

确保工作发生在隔离的工作区中。优先使用你的平台的原生 worktree 工具。仅在没有原生工具可用时，再回退到手动 git worktree。

**核心原则：** 先检测现有隔离。然后用原生工具。再回退到 git。绝不与 harness 对抗。

**开始时宣布：** "我正在使用 using-git-worktrees 技能来建立一个隔离的工作区。"

## 步骤 0：检测现有隔离

**创建任何东西之前，先检查你是否已经在一个隔离的工作区里。**

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
BRANCH=$(git branch --show-current)
```

**Submodule 守卫：** 在 git submodule 内 `GIT_DIR != GIT_COMMON` 也为真。在判定"已经在 worktree 内"之前，先确认你不在 submodule 里：

```bash
# 如果这条命令返回路径，说明你在 submodule 里，不是 worktree —— 按普通仓库处理
git rev-parse --show-superproject-working-tree 2>/dev/null
```

**如果 `GIT_DIR != GIT_COMMON`（且不是 submodule）：** 你已经在一个 linked worktree 内。跳到步骤 2（项目设置）。**不要**再创建一个 worktree。

按分支状态报告：

- 在某个分支上："已经在隔离工作区 `<path>`，分支 `<name>`。"
- 分离 HEAD："已经在隔离工作区 `<path>`（分离 HEAD，由外部管理）。完成时需要创建分支。"

**如果 `GIT_DIR == GIT_COMMON`（或在 submodule 内）：** 你在一个普通的仓库检出里。

用户是否已经在你的 instructions 里表明过 worktree 偏好？如果没有，创建 worktree 之前先征求同意：

> "你希望我搭一个隔离的 worktree 吗？它能保护你当前分支不被改动。"

如果用户已声明过偏好，直接遵循，不再询问。如果用户拒绝同意，原地工作并跳到步骤 2。

## 步骤 1：创建隔离工作区

**你有两种机制。按这个顺序尝试。**

### 1a. 原生 Worktree 工具（首选）

用户已经请求隔离工作区（步骤 0 已获同意）。你是否已经有创建 worktree 的方法？可能是名为 `EnterWorktree`、`WorktreeCreate` 的工具、`/worktree` 命令，或 `--worktree` 标志。如果有，用它，然后跳到步骤 2。

原生工具自动处理目录放置、分支创建和清理。在你已经有原生工具的情况下使用 `git worktree add`，会创建你的 harness 看不到也无法管理的"幻影状态"。

只有在没有原生 worktree 工具可用时，才进入步骤 1b。

### 1b. Git Worktree 回退

**只在步骤 1a 不适用时使用** —— 你没有可用的原生 worktree 工具。手动用 git 创建 worktree。

#### 目录选择

按以下优先级。明确的用户偏好始终优先于观察到的文件系统状态。

1. **检查你的 instructions 里是否声明过 worktree 目录偏好。** 如果用户已指定，不再询问直接用。

2. **检查是否存在项目本地的 worktree 目录：**

   ```bash
   ls -d .worktrees 2>/dev/null     # 首选（隐藏目录）
   ls -d worktrees 2>/dev/null      # 备选
   ```

   找到就用。如果两者都存在，`.worktrees` 优先。

3. **如果没有其他可参考的信息**，默认用项目根目录下的 `.worktrees/`。

#### 安全验证（仅项目本地目录）

**创建 worktree 前必须验证目录已被忽略：**

```bash
git check-ignore -q .worktrees 2>/dev/null || git check-ignore -q worktrees 2>/dev/null
```

**如果未被忽略：** 添加到 .gitignore，提交该改动，然后继续。

**为什么关键：** 防止 worktree 内容被意外提交到仓库。

#### 创建工作树

```bash
# 根据选定位置确定路径
path="$LOCATION/$BRANCH_NAME"

git worktree add "$path" -b "$BRANCH_NAME"
cd "$path"
```

**沙盒回退：** 如果 `git worktree add` 因权限错误（沙盒拒绝）失败，告诉用户沙盒阻止了 worktree 创建，你将在当前目录原地工作。然后原地运行 setup 和基线测试。

## 步骤 2：项目设置

自动检测并运行相应的设置命令：

```bash
# Node.js
if [ -f package.json ]; then npm install; fi

# Rust
if [ -f Cargo.toml ]; then cargo build; fi

# Python
if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
if [ -f pyproject.toml ]; then poetry install; fi

# Go
if [ -f go.mod ]; then go mod download; fi
```

## 步骤 3：验证基线干净

运行测试确保工作区初始状态干净：

```bash
# 使用项目对应的命令
npm test / cargo test / pytest / go test ./...
```

**如果测试失败：** 报告失败，询问是继续还是排查。

**如果测试通过：** 报告就绪。

### 报告

```
工作树已就绪：<full-path>
测试通过（<N> 个测试，0 个失败）
准备实现 <feature-name>
```

## 快速参考

| 情况 | 操作 |
|------|------|
| 已在 linked worktree 内 | 跳过创建（步骤 0） |
| 在 submodule 内 | 按普通仓库处理（步骤 0 守卫） |
| 有原生 worktree 工具 | 用它（步骤 1a） |
| 没有原生工具 | git worktree 回退（步骤 1b） |
| `.worktrees/` 存在 | 用它（验证已忽略） |
| `worktrees/` 存在 | 用它（验证已忽略） |
| 两者都存在 | 用 `.worktrees/` |
| 都不存在 | 检查 instructions 文件，再默认 `.worktrees/` |
| 目录未被忽略 | 添加到 .gitignore + 提交 |
| 创建时权限错误 | 沙盒回退，原地工作 |
| 基线测试失败 | 报告失败 + 询问 |
| 无 package.json/Cargo.toml | 跳过依赖安装 |

## 常见的合理化借口

| 借口 | 现实 |
|------|------|
| "我显然不在 worktree 里，不用检查" | 跑步骤 0。宿主环境创建的隔离和 submodule 都能骗过肉眼；只有检测命令能定论。 |
| "`git worktree add` 比去找原生工具快" | 原生工具（如 `EnterWorktree`）掌管位置、分支和清理。绕过它是**第一大错误** —— 会造出你的宿主环境看不见也管不了的幽灵状态。 |
| "这个 worktree 目录肯定已经被忽略了" | 跑 `git check-ignore`。一个没被忽略的 worktree 目录会把整棵树提交进仓库。 |
| "目录名随便取都行" | 明确指示 > 已存在的项目内目录 > `.worktrees/` 默认值。 |
| "工作区是全新的，基线测试可以先放放" | 基线不干净会让之后每一次失败都含义不明。现在就跑测试；越过失败继续是你人类伙伴的决定。 |
