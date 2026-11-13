## 技能发现优化（SDO）

**发现至关重要：** 未来的 Claude 需要找到你的技能

### 1. 丰富的描述字段

**目的：** Claude 读取描述来决定为当前任务加载哪些技能。让它能回答："我现在应该读这个技能吗？"

**格式：** 以"Use when..."开头，聚焦于触发条件

**关键：描述 = 何时使用，不是技能做什么**

描述应该只描述触发条件。不要在描述中总结技能的流程或工作流。

**为什么这很重要：** 测试表明，当描述总结了技能的工作流时，Claude 可能会跟随描述而非阅读完整的技能内容。一个写着"任务间进行代码审查"的描述导致 Claude 只做了一次审查，尽管技能的流程图清楚地展示了两次审查（先规格合规再代码质量）。

当描述改为仅"在当前会话中执行包含独立任务的实现计划时使用"（无工作流摘要）时，Claude 正确地阅读了流程图并遵循了两阶段审查流程。

**陷阱：** 总结工作流的描述创建了 Claude 会走的捷径。技能正文变成了 Claude 跳过的文档。

```yaml
# 错误：总结了工作流 - Claude 可能会跟随描述而非阅读技能
description: Use when executing plans - dispatches subagent per task with code review between tasks

# 错误：流程细节太多
description: Use for TDD - write test first, watch it fail, write minimal code, refactor

# 正确：只有触发条件，无工作流摘要
description: Use when executing implementation plans with independent tasks in the current session

# 正确：仅触发条件
description: Use when implementing any feature or bugfix, before writing implementation code
```

**内容：**
- 使用具体的触发条件、症状和场景来表明此技能适用
- 描述问题（竞态条件、行为不一致）而非语言特定的症状（setTimeout、sleep）
- 保持触发条件技术无关，除非技能本身是技术特定的
- 如果技能是技术特定的，在触发条件中明确说明
- 用第三人称写（注入到系统提示中）
- **绝不总结技能的流程或工作流**

```yaml
# 错误：太抽象、模糊，未包含何时使用
description: For async testing

# 错误：第一人称
description: I can help you with async tests when they're flaky

# 错误：提到了技术但技能并非该技术特定的
description: Use when tests use setTimeout/sleep and are flaky

# 正确：以"Use when"开头，描述问题，无工作流
description: Use when tests have race conditions, timing dependencies, or pass/fail inconsistently

# 正确：技术特定的技能带有明确的触发条件
description: Use when using React Router and handling authentication redirects
```

### 2. 关键词覆盖

使用 Claude 会搜索的词语：
- 错误信息："Hook timed out"、"ENOTEMPTY"、"race condition"
- 症状："flaky"、"hanging"、"zombie"、"pollution"
- 同义词："timeout/hang/freeze"、"cleanup/teardown/afterEach"
- 工具：实际命令、库名称、文件类型

### 3. 描述性命名

**使用主动语态，动词优先：**
- ✅ `creating-skills` 而非 `skill-creation`
- ✅ `condition-based-waiting` 而非 `async-test-helpers`

### 4. Token 效率（关键）

**问题：** getting-started 和频繁引用的技能会加载到每个对话中。每个 token 都很重要。

**目标字数：**
- getting-started 工作流：每个 <150 词
- 频繁加载的技能：总计 <200 词
- 其他技能：<500 词（仍要简洁）

**技巧：**

**将细节移到工具帮助中：**
```bash
# 错误：在 SKILL.md 中列出所有参数
search-conversations supports --text, --both, --after DATE, --before DATE, --limit N

# 正确：引用 --help
search-conversations 支持多种模式和过滤器。运行 --help 查看详情。
```

**使用交叉引用：**
```markdown
# 错误：重复工作流细节
搜索时，用模板分派子智能体……
[20 行重复的说明]

# 正确：引用其他技能
始终使用子智能体（节省 50-100 倍上下文）。必需：使用 [other-skill-name] 工作流。
```

**压缩示例：**
```markdown
# 错误：冗长的示例（42 词）
你的搭档："我们之前是怎么处理 React Router 中的认证错误的？"
你：我来搜索过去对话中的 React Router 认证模式。
[用搜索查询分派子智能体："React Router authentication error handling 401"]

# 正确：精简的示例（20 词）
搭档："我们之前是怎么处理 React Router 中的认证错误的？"
你：正在搜索……
[分派子智能体 → 整合]
```

**消除冗余：**
- 不要重复交叉引用的技能中已有的内容
- 不要解释从命令中就能看出的东西
- 不要为同一模式提供多个示例

**验证：**
```bash
wc -w skills/path/SKILL.md
# getting-started 工作流：目标 <150 每个
# 其他频繁加载的：目标总计 <200
```

**用你做的事或核心洞察来命名：**
- ✅ `condition-based-waiting` > `async-test-helpers`
- ✅ `using-skills` 而非 `skill-usage`
- ✅ `flatten-with-flags` > `data-structure-refactoring`
- ✅ `root-cause-tracing` > `debugging-techniques`

**动名词（-ing）适合描述流程：**
- `creating-skills`、`testing-skills`、`debugging-with-logs`
- 主动的，描述你正在进行的操作

### 5. 交叉引用其他技能

**编写引用其他技能的文档时：**

仅使用技能名称，带有明确的必需标记：
- ✅ 好的：`**必需子技能：** 使用 test-driven-development`
- ✅ 好的：`**必需背景：** 你必须理解 systematic-debugging`
- ❌ 差的：`参见 skills/testing/test-driven-development`（不清楚是否必需）
- ❌ 差的：`@skills/testing/test-driven-development/SKILL.md`（强制加载，浪费上下文）

**为什么不用 @ 链接：** `@` 语法会立即强制加载文件，在你需要之前就消耗 200k+ 的上下文。

