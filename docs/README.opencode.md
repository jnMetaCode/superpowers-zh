# Superpowers 中文版 — OpenCode 安装指南

在 [OpenCode.ai](https://opencode.ai) 中使用 superpowers-zh 的完整指南。

## 安装

OpenCode V2 需要 2.0.4 或更高版本。

### OpenCode V1

在 `opencode.json`（全局或项目级）的 `plugin` 数组中添加：

```json
{
  "plugin": ["superpowers@git+https://github.com/jnMetaCode/superpowers-zh.git"]
}
```

### OpenCode V2（2.0.4 或更高版本）

使用 V2 插件配置（注意键名是 `plugins`）：

```json
{
  "plugins": ["superpowers@git+https://github.com/jnMetaCode/superpowers-zh.git"]
}
```

如果是 V2 的本地安装，配置的应当是包含 `index.js` 的仓库目录。OpenCode 2.0.4 和 2.0.7 会拒绝直接配置成 JavaScript 文件路径。通过自动发现找到的插件符号链接仍然受支持。

重启 OpenCode。V2 使用 `opencode` 命令；`opencode2` 可能作为别名可用。插件会通过 OpenCode 的插件管理器安装，并注册所有 skills。

验证方式：问 "告诉我你有哪些 superpowers"

### 从旧版符号链接安装方式迁移（V1）

如果你之前使用 `git clone` 和符号链接安装过 superpowers，请移除旧的配置：

```bash
# 移除旧的符号链接
rm -f ~/.config/opencode/plugins/superpowers.js
rm -rf ~/.config/opencode/skills/superpowers

# 可选：移除克隆的仓库
rm -rf ~/.config/opencode/superpowers

# 如果你在 opencode.json 中为 superpowers 添加过 skills.paths，请将其移除
```

然后按照上面的安装步骤操作。

## 使用

### 查找 Skills

使用 OpenCode 原生的 `skill` 工具列出所有可用 skills：

```
use skill tool to list skills
```

### 加载 Skill

```
use skill tool to load brainstorming
```

### 个人 Skills

在 `~/.config/opencode/skills/` 中创建你自己的 skills：

```bash
mkdir -p ~/.config/opencode/skills/my-skill
```

创建 `~/.config/opencode/skills/my-skill/SKILL.md`：

```markdown
---
name: my-skill
description: 当 [条件] 时使用 - [功能描述]
---

# 我的 Skill

[你的 skill 内容]
```

### 项目 Skills

在项目的 `.opencode/skills/` 目录中创建项目级 skills。

**V2 的 Skill 优先级：** 项目 skills > 个人 skills > Superpowers skills。在实测的 V1 1.18.31 上，当个人或项目 skill 与自带的 Superpowers skill 同名时，Superpowers 的那个优先；个人和项目 skill 请使用不同的名字。这次迁移没有改变这一行为。

## 更新

OpenCode 通过一个基于 git 的包说明（package spec）安装 Superpowers。有些 OpenCode 和 Bun 版本会把解析出的 git 依赖锁定在 lockfile 或缓存里，所以重启不一定能拿到 Superpowers 的最新提交。如果更新没有生效，清掉 OpenCode 的包缓存，或重新安装插件。

要固定到特定版本，在包说明后面加上标签或提交（V1 的 `plugin` 键和 V2 的 `plugins` 键写法相同）：

```json
{
  "plugin": ["superpowers@git+https://github.com/jnMetaCode/superpowers-zh.git#v1.7.14"]
}
```

在 V2 上，要固定到包含 V2 插件的版本（v1.7.13 之后的版本）；v1.7.13 及更早的发布只能在 V1 上加载。

## 工作原理

插件做两件事，按 OpenCode 的版本使用各自的 API：

1. **注册 skills 目录**，让 OpenCode 无需符号链接或手动配置就能发现所有 superpowers skills。
    - **V1：** 通过 `config` hook，注入到 `config.skills.paths`
    - **V2：** 通过 `setup()` 函数，使用 `ctx.skill.transform()`（V2 原生 API，已确认运行时生效）
2. **注入引导上下文**，附带按版本区分的工具映射：V1 会话拿到下面的 V1 工具名，V2 会话拿到 V2 工具名。
    - **V1：** 通过 `experimental.chat.messages.transform` hook
    - **V2：** 通过 `ctx.session.hook()` 注册 `context`、`compaction` 和 `generate` 三种请求，使正常对话、压缩和显式生成都携带一致的引导前缀，避免压缩请求丢失前缀而使提示词缓存失效。

控制者会话会在临时的模型上下文里收到 using-superpowers 引导内容。被委派出去的子会话仍能使用原生 skills，但不会收到控制者的引导内容。没有父会话的手动 fork 保持控制者行为。当 V2 原生压缩保留了较早的用户消息时（默认的 `compaction.keep.tokens` 预算），引导内容会放进检查点之前保留下来的第一条用户消息里，和未压缩的会话一样。当压缩移除了所有用户消息时，插件会在检查点之后追加一条临时的引导消息。无论哪种情况，保存的历史都不会改变。

如果会话查询失败，插件会在这次请求里保留引导内容，并在下一次请求时重试。查询失败不会被缓存成控制者判定。

### 工具映射

Skill 用动作来表述，而不是点名某一个运行时的工具。引导内容会把这些动作映射到你所用的 OpenCode 版本实际提供的工具上。

**V1（`opencode` 1.x）：**

- 「创建一条待办」/「在待办列表里标记完成」→ `todowrite`
- `Subagent (general-purpose):` 模板 → OpenCode 的 `task` 工具，传 `subagent_type: "general"`（探索代码库时用 `"explore"`）
- 「调用一个 skill」→ OpenCode 的原生 `skill` 工具，传裸技能名称（如 `superpowers:brainstorming` 或 `superpowers-zh:brainstorming` → `name: "brainstorming"`）
- 「读取文件」→ `read`
- 「创建文件」/「编辑文件」/「删除文件」→ `apply_patch`
- 「运行 shell 命令」→ `bash`
- 「搜索文件内容」/「按文件名查找」→ `grep`、`glob`
- 「抓取 URL」→ `webfetch`

**V2（`opencode` 2.0.4 或更高版本；`opencode2` 可能作为别名可用）：**

- 「创建一条待办」→ V2 没有任何形式的待办工具；映射会让模型改为在一个 markdown 文件（或运行环境自带的计划功能）里跟踪计划
- `Subagent (general-purpose):` 模板 → OpenCode 的 `subagent` 工具，传 `agent: "general"`（或 `"explore"`）；传 `sessionID` 可以继续之前的子智能体
- 「调用一个 skill」→ OpenCode 的原生 `skill` 工具，传裸技能 ID（如 `superpowers:brainstorming` 或 `superpowers-zh:brainstorming` → `id: "brainstorming"`）
- 「读取文件」→ `read`
- 「创建、编辑或删除文件」→ 有 `patch` 时用 `patch` 并传 `patchText`；否则用 `write` 创建或覆盖文件、`edit` 做定点修改、`shell` 删除文件
- 「运行 shell 命令」→ `shell`（`command`、`workdir`、`timeout`、`background`）
- 「搜索文件内容」/「按文件名查找」→ `grep`、`glob`
- 「抓取 URL」→ `webfetch`
- 「搜索网络」→ `websearch`

简单说，V2 把 `task` 改名为 `subagent`（智能体名称从 `subagent_type` 挪到了 `agent`，继续会话改为带 `sessionID` 重新调用），`apply_patch` 改名为 `patch`，`bash` 改名为 `shell`，并且完全去掉了待办工具。可用的写入类工具取决于所选模型：`patch` 只对选定的 GPT 模型 ID 可用，其他模型使用 `write` 和 `edit`。

（V1 清单已对照安装好的 OpenCode 1.18.x CLI 的工具清单核实；V2 清单已对照 OpenCode 2.0.4 和 2.0.7 的宿主契约核实。以上核实由上游 obra/superpowers 完成。）

## 故障排查

### 插件未加载

**V1：** 检查 OpenCode 日志：

```
opencode run --print-logs "hello" 2>&1 | grep -i superpowers
```

**V2：** 插件在后台服务进程里加载，它的日志只有加上 `--standalone` 时 `--print-logs` 才会显示：

```
opencode run --standalone --print-logs "hello" 2>&1 | grep -i superpowers
```

或者查看 `~/.local/share/opencode/log/opencode.log`，过滤 `role=server`。

同时确认 `opencode.json` 中的插件路径正确，并且运行的是较新版本的 OpenCode。

### Windows 安装问题

部分 Windows 版 OpenCode 对基于 git 的插件说明存在上游安装器问题，包括 `git+https` URL 的缓存路径问题，以及 Bun 找不到 `git.exe`（即使它在普通终端里能用）。如果 OpenCode 装不上插件，可以试试用系统的 npm 安装，再让 OpenCode 指向本地包：

```powershell
npm install superpowers@git+https://github.com/jnMetaCode/superpowers-zh.git --prefix "$HOME\.config\opencode"
```

然后按你的 OpenCode 版本，在 `opencode.json` 里使用已安装包的绝对路径。OpenCode 不展开 `~`；`~/...` 这样的条目会被当成包名，而不是本地目录。

**V1：**

```json
{
  "plugin": ["C:\\Users\\<you>\\.config\\opencode\\node_modules\\superpowers"]
}
```

**V2（2.0.4 或更高版本）：**

```json
{
  "plugins": ["C:\\Users\\<you>\\.config\\opencode\\node_modules\\superpowers"]
}
```

### Skills 未找到

1. 使用 OpenCode 的 `skill` 工具列出可用 skills
2. 检查插件是否正确加载（见上）
3. 每个 skill 需要包含有效 YAML frontmatter 的 `SKILL.md` 文件

### 引导内容没有出现

- **V1：** 检查 OpenCode 版本是否支持 `experimental.chat.messages.transform` hook。修改配置后重启 OpenCode。
- **V2：** 插件使用 `ctx.session.hook()` 在 `context`、`compaction` 和 `generate` 请求中注入引导内容。用 `opencode api get /api/plugin` 确认插件已加载。修改配置后用 `opencode service restart` 重启。`opencode2` 命令可能作为别名可用。

## 获取帮助

- 提交 Issue：https://github.com/jnMetaCode/superpowers-zh/issues
- 项目主页：https://github.com/jnMetaCode/superpowers-zh
- OpenCode V2 文档：https://opencode.ai/v2/docs/
- OpenCode V1 文档：https://opencode.ai/docs/
