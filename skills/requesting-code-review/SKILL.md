---
name: requesting-code-review
description: 完成任务、实现重要功能或合并前使用，用于验证工作成果是否符合要求
version: "1.9.0-rc.1"
license: MIT
metadata:
  hermes:
    tags: [code-review]
---

# 请求代码审查

派遣代码审查子代理，在问题扩散之前发现它们。审查者获得的是精心组织的评估上下文——绝不是你的会话历史。

**核心原则：** 早审查，勤审查。

## 何时请求审查

**必须审查：**
- 子代理驱动开发中每个任务完成后
- 完成重要功能后
- 合并到 main 之前

**可选但有价值：**
- 卡住时（换个视角）
- 重构之前（建立基线）
- 修复复杂 bug 之后

## 如何请求

**1. 获取 git SHA：**
```bash
BASE_SHA=$(git rev-parse HEAD~1)  # 或：git merge-base origin/main HEAD
HEAD_SHA=$(git rev-parse HEAD)
```

**2. 派遣代码审查子代理：**

使用 Task 工具，指定 `general-purpose` 类型，填写 `code-reviewer.md` 中的模板

**占位符说明：**
- `{DESCRIPTION}` - 你刚完成的内容简要说明
- `{PLAN_OR_REQUIREMENTS}` - 预期功能
- `{BASE_SHA}` - 起始提交
- `{HEAD_SHA}` - 结束提交

**3. 处理反馈：**
- Critical 问题立即修复
- Important 问题在继续之前修复
- Minor 问题记录下来稍后处理
- 如果审查者有误，用技术理由反驳

## 示例

```
[刚完成任务 2：添加验证功能]

你：让我在继续之前请求代码审查。

BASE_SHA=$(git log --oneline | grep "Task 1" | head -1 | cut -d' ' -f1)
HEAD_SHA=$(git rev-parse HEAD)

[派遣代码审查子代理]
  DESCRIPTION: 添加了 verifyIndex() 和 repairIndex()，支持 4 种问题类型
  PLAN_OR_REQUIREMENTS: docs/superpowers/plans/deployment-plan.md 中的任务 2
  BASE_SHA: a7981ec
  HEAD_SHA: 3df7661

[子代理返回]:
  优点：架构清晰，测试真实
  问题：
    Important：缺少进度指示器
    Minor：报告间隔使用了魔法数字 (100)
  评估：可以继续

你：[修复进度指示器]
[继续任务 3]
```

## 常见的合理化借口

| 借口 | 现实 |
|------|------|
| "我自己看一下 diff 就行了，不用专门派审查者" | 你是协调者——在自己的会话里读 diff 会烧掉你继续推进工作所需的上下文窗口。派一个审查子智能体：diff 和评估过程都待在它的上下文里，只有结论回到你这里。 |
| "审查者需要我的全部会话历史才能理解这次改动" | 给它精心组织的上下文，绝不给会话历史。这样审查者才会盯着工作成果，而不是你的思考过程。 |

## 红线

**绝不要：**
- 因为"很简单"就跳过审查
- 忽略 Critical 问题
- 带着未修复的 Important 问题继续推进
- 对合理的技术反馈进行争辩

**如果审查者有误：**
- 用技术理由反驳
- 展示证明其可行的代码/测试
- 要求澄清

参见模板：requesting-code-review/code-reviewer.md
