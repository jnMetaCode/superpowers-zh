## 示例工作流

```
你：我正在用子智能体驱动开发来执行这个计划。

[准备：工作树已核实]
[把计划文件读一遍：docs/superpowers/plans/feature-plan.md]
[解析工作区：bash scripts/sdd-workspace docs/superpowers/plans/feature-plan.md —— 里面没有账本，全新开始]
[为所有任务创建待办]

任务 1：Hook 安装脚本

[对任务 1 运行 task-brief；分派实现者，附带简报 + 报告路径 + 上下文]

实现者："开始之前——这个 hook 应该装在用户级还是系统级？"

你："用户级（~/.config/superpowers/hooks/）"

实现者：[稍后]
  - 实现了 install-hook 命令
  - 加了测试，5/5 通过
  - 自审：发现漏了 --force 标志，已补上
  - 已提交

[运行 review-package PLAN_FILE BASE HEAD；把打印出的路径交给任务审查者去分派]
任务审查者：规格 ✅ —— 所有需求都满足，没有多余的东西。
  优点：测试覆盖良好，代码整洁。问题：无。任务质量：通过。

[账本：Task 1: complete (commits a1b2c3d..d4e5f6a, review clean)]

任务 2：恢复模式

[对任务 2 运行 task-brief；分派实现者，附带简报 + 报告路径 + 上下文]

实现者：[无疑问]
  - 加了 verify/repair 模式
  - 8/8 测试通过
  - 已提交

[运行 review-package PLAN_FILE BASE HEAD；把打印出的路径交给任务审查者去分派]
任务审查者：规格 ❌：
  - 缺失：进度上报（规格说"每 100 项上报一次"）
  问题（Important）：魔法数字（100）

[第 1 轮修复：唤回原实现者，带上这两条发现]
实现者：加了进度上报，把 PROGRESS_INTERVAL 提成了常量。
  重跑了 test/recovery.test.js —— 10/10 通过。修复报告已追加。

[运行 review-package PLAN_FILE FIX_BASE HEAD；分派定向复审]
复审者：缺失进度上报 —— ADDRESSED（src/recovery.js:41）。
  魔法数字 —— ADDRESSED（src/recovery.js:7）。新破坏：无。
  结论：所有发现均已解决。

[账本：Task 2: fix round 1/5 (2 addressed, 0 open; commits d4e5f6a..b7c8d9e)]
[账本：Task 2: complete (commits d4e5f6a..b7c8d9e, review clean)]

...

[所有任务之后]
[运行 review-package PLAN_FILE MERGE_BASE HEAD；分派最终代码审查者，用最强模型]
最终审查者：所有需求都满足。延后的 Minor 已甄别：没有阻塞合并的。

[删除本计划的工作区 —— 现在记录活在 git 里]

搞定！使用 finishing-a-development-branch。
```
