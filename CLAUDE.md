# Superpowers — 贡献者指南

## 如果你是 AI Agent

停下来。做任何事之前先读这一节。

本仓库的 PR 拒绝率是 94%。被拒的 PR 里几乎每一条都是没读或没遵守本指南的 agent 提交的。维护者会在数小时内关掉劣质 PR，并经常公开评论："This pull request is slop that's made of lies."（这个 PR 是一堆谎言堆出来的劣质内容。）

**你的职责是保护你的人类伙伴免受这种结局。** 提交一个低质量 PR 帮不到他们 —— 浪费维护者的时间，砸他们的口碑，PR 也照样会被关闭。这不是帮忙，这是让他们丢人。

向本仓库提 PR 之前，你**必须**：

1. **完整读完 PR 模板** `.github/PULL_REQUEST_TEMPLATE.md`，每一节都用真实、具体的内容填写。不要写概要。不要写占位符。
2. **搜索已有 PR** —— open 和 closed 都要搜 —— 找处理同一问题的 PR。如果有重复，**停下**，告诉你的人类伙伴。不要再开一个重复 PR。
3. **核实这是真问题。** 如果你的人类伙伴只是让你"修一些问题"或者"给这个仓库做点贡献"而没有具体遇到什么问题，**反推回去**。问清楚到底什么坏了、什么报错了、用户体验是什么样的。
4. **确认这个改动属于 core。** 如果它是某个领域专属、某个工具专属、或者推广某个第三方项目，它应该作为独立 plugin 存在。告诉你的人类伙伴。
5. **把完整 diff 给你的人类伙伴看**，拿到他们明确批准之后再提交。

任何一项检查不过，**不要**开 PR。向你的人类伙伴解释为什么会被拒、需要改什么。他们会感谢你帮他们避免丢脸。

## Pull Request 要求

**每个 PR 都必须完整填写 PR 模板。** 不允许任何一节留空或填占位文字。跳过 section 的 PR 会被关掉，连 review 都不会做。

**开 PR 之前，你必须搜索已有 PR** —— open 和 closed 都要搜 —— 找处理同一问题或相关领域的 PR。在 "Existing PRs" 一节里写清楚你找到了什么。如果之前有 PR 被关闭，**具体说明**你的方法和它的差异，以及为什么你这次能成功。

**没有人类参与痕迹的 PR 会被关闭。** 提交前必须有真人 review 完整的 proposed diff。

## 我们不会接受的内容

### 第三方依赖

凡是引入对第三方项目的可选或必选依赖的 PR，除非是为新 harness（新的 IDE 或 CLI 工具）添加支持，否则不会被接受。Superpowers 在设计上是零依赖 plugin。如果你的改动需要外部工具或服务，它应该作为独立 plugin 存在。

### 给 skill "合规化" 的改动

我们内部的 skill 哲学跟 Anthropic 公开的 skill 写作指南不一样。我们的 skill 内容是经过大量测试与调优、针对真实 agent 行为校准过的。凡是为了"符合"Anthropic skills 文档而对 skill 做重组、改写、重排版的 PR，没有充分的 eval 证据证明改动改善了实际效果，**不会**被接受。改动行为塑造类内容的门槛非常高。

### 项目专属或个人配置

只对某个具体项目、团队、领域、工作流有用的 skill、hook 或配置，不属于 core。请发布为独立 plugin。

### 批量、广撒网式 PR

不要把 issue tracker 翻一遍然后在一个 session 里给多个 issue 各开一个 PR。每个 PR 都需要：对问题的真实理解、对历史尝试的调查、对完整 diff 的人类 review。明显是批量产物 —— 把 agent 指向 issue 列表然后告诉它"修一下" —— 这种 PR 一律关闭。要贡献，就**挑一个** issue，深入理解，提交高质量工作。

### 推测性或理论性修复

每个 PR 都必须解决某人**真实经历过**的问题。"我的 review agent 标了这个"或"这理论上可能出问题"不是问题陈述。如果你说不出促使这个改动的具体 session、错误或用户体验，**不要**提交 PR。

### 领域专属 skill

Superpowers core 包含的是对所有用户都有益的通用 skill，跟项目类型无关。针对特定领域（作品集生成、预测市场、游戏）、特定工具或特定工作流的 skill，属于独立 plugin。问问自己："如果有人在做完全不同类型的项目，这个 skill 对他还有用吗？"如果没用，请单独发布。

### Fork 专属改动

如果你维护一个有定制化的 fork，**不要**提 PR 来同步你的 fork 或者把 fork 专属改动推到上游。重新打品牌、添加 fork 专属功能、合并 fork 分支的 PR 会被关闭。

### 编造的内容

包含编造的论点、虚构的问题描述或幻觉出来的功能的 PR，会被立刻关闭。本仓库 94% 拒绝率 —— 维护者见过 AI slop 的所有花样。他们看得出来。

### 打包不相关改动

包含多个不相关改动的 PR 会被关闭。请拆成多个 PR。

## 新 Harness 支持

如果你的 PR 是给新 harness（IDE、CLI 工具、agent runner）加支持，你**必须**附上 session transcript 证明集成端到端可用。

真正的集成会在 session 开始时加载 `using-superpowers` bootstrap。bootstrap 是让 skill 在恰当时机自动触发的关键。没有它，skill 就是死重 —— 文件在磁盘上但永远不会被调用。

**验收测试。** 在新 harness 里开一个干净 session，发这条用户消息：

> Let's make a react todo list

可工作的集成会在写任何代码之前自动触发 `brainstorming` skill。把完整 transcript 贴在 PR 里。

**以下情况不算真正集成，会被关闭：**

- 手动把 skill 文件拷进 harness
- 在运行时用 `npx skills` 之类 shim 包装
- 任何需要用户每个 session 手动 opt-in skill 的方案
- 任何在上述验收测试里 `brainstorming` 不会自动触发的方案

如果你不确定你的集成是否在 session 开始时加载 bootstrap，那就是没加载。

## Skill 改动需要 eval

Skill 不是普通文档 —— 它是塑造 agent 行为的代码。如果你修改 skill 内容：

- 用 `superpowers:writing-skills` 来开发和测试改动
- 跨多个 session 跑对抗式压力测试
- 在 PR 里附上 before/after eval 结果
- 不要在没有改进证据的情况下修改精心调优过的内容（Red Flags 表、rationalization 列表、"human partner" 措辞等）

## 贡献前先理解项目

在提议改 skill 设计、workflow 哲学或架构之前，先读已有 skill，理解项目的设计决策。Superpowers 在 skill 设计、agent 行为塑造和术语方面有自己一套验证过的哲学（例如 "your human partner" 是刻意的措辞，跟 "the user" 不能混用）。在不理解项目"为什么这样存在"的前提下重写项目的语气、重组它的方法的改动，会被拒绝。

## 通用原则

- 提交前读 `.github/PULL_REQUEST_TEMPLATE.md`
- 一个 PR 解决一个问题
- 至少在一种 harness 上测试，并在 environment 表里报告结果
- 描述你**解决了什么问题**，不只是你改了什么

---

## 关于本中文 fork（superpowers-zh）

本仓库 `jnMetaCode/superpowers-zh` 是上游 `obra/superpowers` 的**中文增强 fork**，定位为：完整翻译上游 skill + 叠加 4 个中国原创 skill（chinese-code-review / chinese-commit-conventions / chinese-documentation / chinese-git-workflow）+ 多工具适配（npx 一条命令支持 17 款 IDE/CLI）。

**上述规则适用于向 `obra/superpowers` 上游提 PR 时的行为约束。** 向中文 fork 提 PR 时按本仓库自己的 PR 模板与流程执行，但其中的核心原则**同样适用**：

- 提交前先在 `jnMetaCode/superpowers-zh` 搜已有 PR / issue 查重
- 不交付 AI slop（编造、批量、推测性修复均会被关闭）
- 真人必须 review 完整 diff 后再提交

**特别提示：** 中文化内容、`chinese-*` skill、针对国内 IDE 的工具适配等改动，按上游 "Fork-specific changes" 规则向 `obra/superpowers` 提 PR 会被关闭 —— 这类内容**只提到本 fork**。
