## 最终审查

覆盖整个分支的最终审查也拿到一个审查包：运行 `bash scripts/review-package PLAN_FILE MERGE_BASE HEAD`（从正在执行的项目工作树中，用脚本的绝对路径运行）（MERGE_BASE = 分支起点的那个提交，例如 `git merge-base main HEAD`），把打印出的路径放进最终审查的分派里，这样最终审查者读一个文件就行，不必用 git 命令重新推导整个分支的 diff。用可用的最强模型分派（见"模型选择"），使用 requesting-code-review 的 [code-reviewer.md](../../requesting-code-review/code-reviewer.md)。把它指向账本里那些"延后的 Minor"和"已搁置"的行，让它甄别哪些必须在合并前修掉。

如果覆盖整个分支的最终审查返回了发现，用**一个**修复子智能体带着**完整的**发现清单去分派——不要一条发现一个修复者。逐条发现各派一个修复者，每个都要重建上下文、重跑测试套件；真实会话里，一次最终审查的修复浪潮花掉的成本超过它全部任务的总和。然后对这波修复跑**恰好一次**定向复审（对修复区间跑 `bash scripts/review-package PLAN_FILE FIX_BASE HEAD`（从正在执行的项目工作树中，用脚本的绝对路径运行），用 [re-review-prompt.md](../re-review-prompt.md)）。残留的发现按任务循环里熔断那套来裁定：带裁定搁置，或者对承重项作出裁决并把你的决定记进账本。只有上面那四类才会在这里让你停下。**没有第二波修复**——残留的承重发现会在 finishing-a-development-branch 呈现选项时浮到你人类伙伴面前。

