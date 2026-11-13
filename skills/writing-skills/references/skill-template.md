## SKILL.md 结构

**Frontmatter（YAML）：**
- 两个必需字段：`name` 和 `description`（完整支持字段参见 [agentskills.io/specification](https://agentskills.io/specification)）
- 总计最多 1024 字符
- `name`：只使用字母、数字和连字符（不要用括号、特殊字符）
- `description`：第三人称，仅描述何时使用（不是做什么）
  - 以"Use when..."开头，聚焦于触发条件
  - 包含具体的症状、场景和上下文
  - **绝不总结技能的流程或工作流**（参见 SDO 章节了解原因）
  - 尽量控制在 500 字符以内

```markdown
---
name: Skill-Name-With-Hyphens
description: Use when [具体的触发条件和症状]
---

# 技能名称

## 概述
这是什么？用 1-2 句话说明核心原则。

## 何时使用
[如果决策不明显，使用小型内联流程图]

症状和用例的要点列表
不适用的场景

## 核心模式（技术/模式类）
前后代码对比

## 快速参考
用于快速浏览常见操作的表格或要点

## 实现
简单模式内联代码
大量参考或可复用工具链接到文件

## 常见错误
常见问题 + 修复方法

## 实际效果（可选）
具体结果
```


