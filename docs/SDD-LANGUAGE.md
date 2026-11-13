# SDD 的中文简报、报告与提交信息

本文对应 [#116](https://github.com/jnMetaCode/superpowers-zh/issues/116) 和 [#132](https://github.com/jnMetaCode/superpowers-zh/issues/132)，提供显式配置方法。它不是这两个问题已在所有工具和模型中修复的声明。

## 本次任务要求中文产出

在写计划之前，把以下要求直接发给控制者：

```text
本次任务的计划正文、任务简报、实现报告和审查结论使用简体中文。
分派每个实现者和审查者时，将这项语言要求放进实际发送的 prompt；
不要只让子智能体依赖父会话的语言偏好。
代码、标识符、命令、路径、原始测试输出及流程状态标记保留原样。
提交信息遵循项目现有规范；项目允许中文时，使用 Conventional Commits，
保留 type 和 scope，subject 和 body 使用中文。
```

如需整套中文提交格式参考，可显式调用 `/chinese-commit-conventions`。该技能默认不会自动触发，调用它也不能替代向子智能体传递本次任务的语言要求。

## 已有英文简报怎么办

`skills/subagent-driven-development/scripts/task-brief` 抽取计划中的任务原文，不负责翻译。先检查计划文件的对应任务；如果计划本身是英文，应先确认中文计划内容再重新生成简报。修改简报不会反向更新计划。

在项目根目录运行，替换下面的绝对路径：

```bash
bash /绝对路径/superpowers-zh/skills/subagent-driven-development/scripts/task-brief docs/superpowers/plans/你的计划.md 1
```

打开命令输出的文件路径，确认正文与计划任务相同。如果计划任务为中文而抽出的正文变成英文，请保留两份文件作为复现材料。

## 仍然产出英文时

请记录工具与版本、模型、superpowers-zh 的安装来源与版本、计划文件语言，以及实际发送给子智能体的 prompt。附上脱敏后的 `task-N-brief.md`、`task-N-report.md`、审查结论和提交标题，区分哪些文件全英文、哪些中英混杂。

验收应分别检查：简报是否忠实抽取中文计划、报告和审查说明是否中文、提交标题是否遵循项目约定，以及 `DONE` 等流程标记是否保留。一次成功不足以证明跨工具修复；#116 之前的提示词修改因无法复现、无可测收益而被回滚，应在报告者的工具与模型组合中重新验证。
