---
name: workflow-runner
description: "在 Claude Code / OpenClaw / Cursor 中直接运行 agency-orchestrator YAML 工作流——无需 API key，使用当前会话的 LLM 作为执行引擎。当用户提供 .yaml 工作流文件或要求多角色协作完成任务时触发。"
version: "1.0.0"
license: MIT
metadata:
  hermes:
    tags: [execution, workflow]
---

# 工作流执行器：在 AI 工具内运行多角色编排

直接在当前会话中执行 agency-orchestrator 的 YAML 工作流，无需配置 API key。当前 LLM 就是执行引擎——依次扮演每个角色完成任务。

## 适用场景

- 用户提供了一个 `.yaml` 工作流文件（如 `运行 workflows/story-creation.yaml`）
- 用户要求多个角色协作完成任务（如"用产品经理和架构师一起评审这个 PRD"）
- 用户安装了 `agency-agents-zh` 并希望直接在 AI 工具内编排多角色

## 执行流程（5 步）

按以下顺序执行，不要跳步：

### 第 1 步：解析工作流

用 Read 工具读取用户指定的 YAML 文件，提取以下字段：

```yaml
name: "工作流名称"
agents_dir: "agency-agents-zh"    # 角色定义目录
inputs:                            # 输入变量
  - name: xxx
    required: true/false
    default: "默认值"
steps:                             # 执行步骤
  - id: step_id
    role: "category/agent-name"    # 角色路径
    task: "任务描述 {{变量}}"       # 支持模板变量
    output: variable_name          # 输出变量名
    depends_on: [other_step_id]    # 依赖关系
```

**忽略 `llm`、`concurrency`、`timeout`、`retry` 配置**——Skill 模式使用当前会话的 LLM，这些字段仅用于 CLI 模式。

**定位角色目录**：用 Bash `test -d` 按以下顺序检查，用第一个存在的：
1. 当前工作目录下的 `{agents_dir}/`（如 `./agency-agents-zh/`）
2. `../{agents_dir}/`（上级目录）
3. 相对于 YAML 文件所在目录的 `{agents_dir}/`
4. `node_modules/agency-agents-zh/`

如果全部找不到，**停止执行**并提示用户：
```
找不到角色目录。请先安装：
  git clone --depth 1 https://github.com/jnMetaCode/agency-agents-zh.git
  或：npm install agency-agents-zh
```

### 第 2 步：收集输入

- 对每个 `required: true` 的输入，检查用户消息中是否已提供值
- 未提供的必填输入：**立即向用户询问**，不要猜测或用空值
- 有 `default` 的可选输入：使用默认值
- 无默认值的可选输入：设为空字符串

### 第 3 步：构建执行顺序

根据 `depends_on` 进行拓扑排序，将步骤分成多个层级：

- **无 depends_on 的步骤** → 第 1 层
- **depends_on 全部在第 N 层或之前的步骤** → 第 N+1 层
- **同一层内的步骤**互不依赖，可并行

在回复中展示执行计划：
```
执行计划（共 N 步）：
  第 1 层: [step_id] — 角色名
  第 2 层: [step_a, step_b] — 并行
  第 3 层: [step_id] — 角色名
```

### 第 4 步：逐层执行

对每一层：

#### 4a. 预读角色文件

用 Read 工具读取该层所有步骤的角色 `.md` 文件：`{角色目录}/{role}.md`

从文件中提取：
- **角色名**：frontmatter 中的 `name` 字段
- **角色 system prompt**：第二个 `---` 之后的全部 markdown 内容

#### 4b. 渲染 task 模板

将 task 中的 `{{变量名}}` 替换为：
- 来自 inputs 的用户输入值
- 来自前序步骤 output 的结果文本

#### 4c. 执行

**单步骤层**：直接在主会话中扮演该角色执行。格式：

```
### Step N/Total: step_id（角色名）

[以该角色身份完成 task，使用角色的专业知识和沟通风格]
```

**多步骤层（并行）**：使用 Agent 工具为每个步骤启动子代理。每个子代理的 prompt 必须包含：
- 角色文件的**完整文本内容**（不是路径——子代理可能无法读文件）
- 渲染后的 task 文本
- 指令："以上是你的角色定义，请以该角色身份完成以下任务，直接输出结果"

#### 4d. 保存输出到上下文

如果 step 有 `output` 字段，将该步骤的输出文本存入变量上下文，供后续步骤的 `{{变量}}` 使用。

### 第 5 步：保存结果并展示

用 Write 工具将结果保存到文件：

```
.ao-output/{工作流名称}-{YYYY-MM-DD}/
├── steps/
│   ├── 1-{step_id}.md       # 每步的输出
│   ├── 2-{step_id}.md
│   └── ...
├── summary.md                # 最后一步的完整输出（最终成果）
└── metadata.json             # 基本元数据
```

metadata.json 格式：
```json
{
  "name": "工作流名称",
  "date": "2026-03-22",
  "success": true,
  "steps": [
    {"id": "step_id", "role": "category/agent", "status": "completed"},
    ...
  ]
}
```

执行完毕后，向用户展示：
1. 最终成果（summary.md 的内容）
2. 文件保存位置
3. 执行了几个步骤

## 重要规则

<HARD-GATE>
- 每个步骤都必须真正扮演对应角色，使用该角色的专业知识和沟通风格，不能泛泛回答
- 角色切换必须明确——每步开始时标注角色名
- 不要跳过步骤或合并步骤，严格按 DAG 层级顺序执行
- 如果角色文件找不到，告知用户并建议安装 agency-agents-zh
- 不要在没有读取角色 .md 文件的情况下执行步骤——必须先 Read 再执行
</HARD-GATE>

## 没有 YAML 文件时的快捷模式

如果用户没有指定 YAML 文件，但描述了需要多角色协作的任务：

1. 根据用户描述，**自动生成** YAML 工作流定义
2. 展示给用户确认
3. 确认后按上述流程执行

示例：
- 用户说"帮我用叙事学家和心理学家写个故事" → 生成 story-creation 类似的工作流
- 用户说"让产品经理和架构师评审这个 PRD" → 生成 product-review 类似的工作流

## 故障处理

- **角色文件不存在**：提示用户运行 `ao init` 或 `npm install agency-agents-zh`
- **模板变量未定义**：检查上下文，如果是必填输入则向用户询问
- **步骤执行失败**：标记该步骤为失败，跳过所有依赖它的下游步骤，继续执行其他独立步骤
