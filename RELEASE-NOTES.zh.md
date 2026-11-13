# Superpowers-ZH 中文版 Release Notes

> 本文档记录 `jnMetaCode/superpowers-zh` 中文 fork 自身的 release 历史。
>
> 上游 `obra/superpowers` 的英文 release notes 见 [`RELEASE-NOTES.md`](./RELEASE-NOTES.md)（原样保留，未翻译）。

---

## 未发布

- 旧版发版脚本通过参数将字段路径和值作为 jq 数据传递，避免错误字段被解释成表达式并改坏 manifest；非法路径在写入前被拒绝。

- 修复只读版本检查与审计忽略登记表解析错误的问题：完整读取成功后才执行检查，避免部分有效配置掩盖后续错误并返回成功。

- 旧版发版预检覆盖完整版本登记表：后续新增 manifest 损坏或缺失时，在首次写入前退出，避免前面的文件已升级、后面的文件失败。

- 旧版 bash 发版入口在写文件前验证完整 SemVer，拒绝尾随垃圾、非法前导零及不完整构建后缀，防止把错误版本写入整套元数据。

- 修复旧版 `bump-version.sh --audit` 在检测到版本漂移后仍返回成功的问题；现在保留审计输出并传播失败状态，避免自动化误判。

- 补齐原生 Hermes / Muse / Antigravity / Devin manifest 与 Hermes bootstrap，统一使用 fork 名称、发行版本及全部 21 个技能；版本同步、npm 分发和 CI 已覆盖新增渠道。Hermes 使用现有 Node 工具维护 YAML 版本，无需新增 YAML 解析依赖。真实 CLI 会话仍待验收，详见 [原生插件说明](docs/NATIVE-PLUGINS.md)。
- 接入 Codex 专用打包和同步脚本：同步目标必须显式指定且限定在目标仓库的 `plugins/NAME` 内；排除官网和其他 harness 文件。修复 ZIP 时间戳受本机时区影响的问题，隔离仓库中的打包及 linked-worktree 回归通过；没有执行真实推送或发布。
- 基于 5 次基线中均提前提出方案的观察，为 brainstorming 补充「原因未知时首条回复」结构约定；新增 5 个独立样本均先问原因且不提前提方案，另有简单任务、明确跳过讨论和已知原因的边界样本。该结果仅覆盖当前模型及这些场景，不等同完整原生会话验收。
- 排除 Hermes 测试生成的 Python 字节码缓存，避免其随 npm 包分发。

- 发版增加只读预检：`npm version` 在修改 package.json 前验证技能与插件元数据，旧版 bash 入口也先预检，避免因格式错误留下部分版本更新。

- 修复无效参数被卸载分支忽略的问题：工具名缺失、不存在、重复指定或出现不支持的位置参数时，在任何安装/卸载操作前退出，避免错误命令删除已有安装。

- 修复卸载清理的用户内容保护：托管标记重复、嵌套、缺失或顺序错误时保留原文并提示；正常清理只切除托管区段，保留外部缩进、Markdown 行尾空格及空行。

- 修复版本同步正则误改嵌套 `metadata.version` 的问题：保留文本格式，并按完整 JSON 语义确认只修改指定的发行版本字段；覆盖普通插件及含多个插件的 marketplace。

- 修复 `task-start` 调用 `task-brief`、`task-done` 调用 `sdd-workspace` 在市场解包器丢失执行权限时报 `Permission denied`（退出码 126）：改为通过 Bash 调用。新增真实 npm 压缩包的解包、安装、中文任务简报、审查包、完成记账及卸载验证，并模拟全部 SDD helper 执行位丢失。

- 对齐上游 v7.0.2 在本 fork 已采用渠道的实现：brainstorming 中文行为翻译、SDD 仓库保护与 `-C` / Windows 路径、Pi 每轮 bootstrap 与技能过滤、OpenCode 三类请求注入及裸 skill ID、Copilot PowerShell hook 和无子进程 SessionStart。保留中文任务标题、fork 元数据和既有安装渠道差异。系统调试的开发日志及压力提示已移至 tests，避免随技能安装。
- 同步清单和逐项验证见 [v7.0.2 同步报告](docs/evals/upstream-v7.0.2-sync.json)。实现已落地，但真实网络、原生 Windows、完整模型压力评估仍有验证缺口；本节不代表已发布或全环境验收通过。

- 同步上游 v7.0.2 的脑暴服务器相对路径修复：在切换脚本目录前解析 `--project-dir`，覆盖当前目录和含空格的嵌套目录。两项无需监听端口的启动路径回归通过；真实服务器网络测试仍受本地沙箱限制。

- 部分同步上游 v7.0.2 的任务简报修复：支持 A1 / 6b / 2.1 等编号、精确区分相邻任务，并拒绝未闭合代码围栏吞入后续任务的简报。保留中文「任务」标题；英文和中文共 10 项回归通过。本项不表示 v7.0.2 全量同步完成。

- 修复 #137 所述的技能版本字段长期停在 `1.0.0`：发布脚本动态同步全部技能的 frontmatter 到包版本，CI 检查漂移，`npm version` 同时提交这些字段。旧安装需在新版本发布后更新，不会自动改写。

- 更新 brainstorming：先读取项目背景再提问，显式请求时不再主动建议跳过；实现方案先独立讨论，小改动也写短设计并获批，再进入计划。保留中文“你看着办/你定吧”的语境说明。
- 将 SDD 与 writing-skills 的详细指导移到按需读取的 references，删除 executing-plans 的重复示例；增加小于 20,000 UTF-8 字节的技能预算及边界回归。这是保守预算，不代表所有工具都按字节截断。
- 补齐贡献者身份、真人摘要和不加载插件时的对照结果；诊断报告统一使用 Bug 模板，摘要占位时保留草稿。中文 fork 原有贡献政策保留。
- 修正 SDD 审查包的调用目录说明：保持项目工作树为当前目录，通过技能脚本绝对路径调用。
- 同轮安装器修复：指定工具或卸载时，也会在写入前拒绝未知参数；简繁 README 的手动安装路径与引导说明已校正。

评估与适用范围：[brainstorming](docs/evals/brainstorming-v7.0.1.json)、[技能拆分](docs/evals/skill-splitting-v7.0.1.json)、[诊断报告](docs/evals/diagnosis-report-v7.0.1.json)。本节不代表已发布新版本。

## v1.8.0 (2026-10-19)

**同步上游 v7.0.0，所有用户建议更新。** brainstorming 按上游从头重写，另有一批 hook、脚本和示例修复。

### 🔁 brainstorming 重写：先弄清你想要什么

- 先判断"我到底知道多少"：要紧的信息都在请求里（"把图标改成矢车菊蓝"），就直接做；缺了东西才开始对话
- 第一条消息只有两件事：告诉你可以跳过提问让它直接开始，以及一个让你开始描述的开放问题
- 每条消息只问一个问题，先让你描述，只在你卡住时才给选项；你说"你猜一个吧""你觉得呢"，它就直接提方案
- 理解一部分就复述一部分（约 200-300 字），标明哪些是它的猜测，请你纠正
- 意图清楚后再定规模：快速明确的任务 / 小改动（对话里定）/ 需要书面设计的项目，你可以推翻
- 书面设计交给你之前，先由一个扮演该领域建造者的子代理检查（builder check），只把必须由你回答的问题一次性带回来；取代原来的 spec 审查（`spec-document-reviewer-prompt.md` 已删除，新增 `builder-check-prompt.md`）
- 不再限于软件：一场分享、一门生意、一次装修也适用
- 硬门槛保留：完整描述获批之前不构建；唯一例外是你同意的一次性 spike，要保留它的代码算新需求

**本 fork 的补充（上游没有）：** 中文里"你看着办""你定吧"是请它拿主意，不是让它跳过提问直接动手。eval 中未加这句说明时，智能体两次把"反正你看着办吧"当成跳过流程、未经批准就开始写代码；补充后复测未再出现。

**eval 摘要：** 8 个场景（含非软件、施压、spike、"你看着办"），对比旧中文版、新中文版和上游英文原文，被测模型 claude-opus-5-5。新中文版与英文原文表现一致，都明显优于旧版：旧版普遍先给 A–E 选项菜单、一条消息问多个问题；新版一次一个开放问题并分块复述。受账号额度限制，每组样本为 1–2 次。

### 🐛 修复

- **SessionStart hook**：Claude Code 以空 PATH 启动 hook 时，不再因找不到 `dirname`/`cat` 而丢失 bootstrap；Windows 上不再误选 WSL 启动器或执行当前目录下的同名程序，hook 退出码不再丢失（同步上游 v7）
- **executing-plans**：测试成功但没有输出时，`task-done` 也会记账（此前返回 1 且不记账）
- **subagent-driven-development**：`sdd-workspace` 不再覆盖你自己的 `.superpowers/sdd/.gitignore`；Windows Git Bash 下计划标记改为仓库相对路径
- **视觉伴侣**：内容里的 `$&`、`$'` 等不再被当作替换模式篡改
- **带参数调用 skill**：Claude Code 会把正文里的 `$1` 等替换成参数。requesting-code-review 的 BASE_SHA 示例（同步上游），以及本 fork 的 chinese-code-review（参数化查询示例）、chinese-commit-conventions（husky 命令）都已改写；CI 新增检查防止再出现
- **systematic-debugging**：诊断示例只报告变量是否设置，不再把凭据值打印到日志
- **OpenCode 文档**：「固定到特定版本」示例此前写 `#v1.7.13`，这个 tag 不存在，照抄会安装失败；已改为 `#v1.7.14`，audit 会检查文档引用的 tag 是否存在
- **发版脚本**：`npm version` 同步了 `.kimi-plugin/plugin.json` 的版本号，但没把它加入提交

### 🌐 官网

- 繁体界面的分类标签与简介修正；skill 数、工具数、中国原创数改为构建时自动生成
- 404 页的样式此前被 CSP 拦截而错位，已修复，并加上英文与繁体提示
- 首页发布提示条此前一直显示 v1.7.12 的内容，已更正，并改为发版时必须同步更新（否则构建失败）
- FAQ 补充：各安装方式（npx 项目级 / 全局 / Claude Code 插件市场）的更新与卸载、装完怎么确认生效、没生效怎么排查
- skill 详情页：`<HARD-GATE>` 等标签块此前结构错误（结束标签落进段落，后面整页被嵌进去），现在显示为带标签名的提示框，`<Good>`/`<Bad>` 正反例分别标绿、标红
- 浅色主题：代码块文字此前几乎看不见（对比度 1.33:1），链接、行内代码、标签、页脚文字也偏淡，已全部调到 4.5:1 以上
- 手机端：此前 320px 宽度下 16 个页面需要横向滑动，现在全部 70 个页面都不会

### 📦 包体积

删除 5 张已无引用的赞助商图片，Sidrune 横幅从 924 KB 压到 19 KB（显示效果不变）。

---

## v1.7.14 (2026-09-26)

**同步上游 v6.4.2（含 v6.4.1），OpenCode 用户尤其建议更新。** 对应 [#133](https://github.com/jnMetaCode/superpowers-zh/issues/133)、[#131](https://github.com/jnMetaCode/superpowers-zh/issues/131)。

### ✨ 新 skill：diagnosing-superpowers（第 21 个）

会话跑偏时——重复劳动、无视计划、太慢、太贵、某个技能没触发——让它读磁盘上的会话记录，按 7 个维度并行分析，出一份**每条结论都带 `path:line`** 的报告；需要时整理成 issue、打包脱敏材料。它只报告发生了什么，不替你诊断 skill 本身。

与上游唯一的有意偏离：**issue 目标是本仓 `jnMetaCode/superpowers-zh`**，不是 obra/superpowers——你跑的是译文，问题先在这里分流，确认是上游行为再转报。

### 🔁 executing-plans 重写：内联执行

从「单独会话 + 检查点」改成**在当前会话里自己当实现者**：`task-start` 取简报和 BASE，`task-done` 跑测试、只有通过才记账本，最后派一个最强模型做整分支审查。与 SDD 共用工作区和账本，中途可以换执行方式。遇到计划缺陷**自己裁决并记账**，只有 4 类硬停止。

旧版里本 fork 自加的「常见异常处理」（计划有误就停下问）与此直接冲突，已删除。

### ✂️ writing-plans：更短的计划

- 步骤只写实现者**无法自己决定**的东西：签名、文件、规格取值、测试断言；函数体由实现者写
- 新增「审查重点」：规格隐含、但没有测试覆盖的 5 个最可能伤人的输入，交给最终审查逐条检查
- 自检新增「比例」：计划比规格长好几倍，就是把程序抄了一遍
- 执行交接改为「子代理驱动 / 原生执行」二选一，并要求先审阅计划

### 其他上游变更

- **brainstorming**：「建立共同理解」——先弄清意图并写回给你确认；HARD-GATE 按路径细分（架构级：设计批准只许写规格，规格批准只许写计划）
- **code-reviewer**：规格是愿景文档，规格没提的行为按正常人的期待来判；列出「不予判断的项」交执行者裁决
- **TDD**：宣称完成前跑整个项目测试套件，看到的失败必须写进报告
- **SDD**：`sdd-workspace` 解决同名计划（`docs/a/plan.md` vs `docs/b/plan.md`）共用工作区的问题；`review-package` 拒绝空区间和非后代 HEAD
- 技能自带脚本一律经解释器调用（`bash scripts/…`）——有些插件打包器会去掉可执行位
- 新增 Claude Code、Muse 工具参考；SessionStart hook 支持 Muse

### 🐛 OpenCode 工具映射过期（#131）

插件还停在 v5.0.7：告诉模型用 `@mention` 派子代理——那是 TUI 里用户的输入方式，模型没有这个工具。现已换成上游 v6.4.2 插件：V1 映射到 `task` + `subagent_type`，V2（OpenCode 2.0.4+）映射到 `subagent`，并通过 `setup()` 原生注册 skill；新增根目录 `index.js` 供 V2 目录形式加载。安装文档同步更新。

### 🐛 visual-companion.md 一直是旧版

中文版比 v6.3.0 还旧：教你读 `$SCREEN_DIR/.server-info`，而实际脚本写的是 `$STATE_DIR/server-info`；缺 `--open`、会话 key、4 小时空闲超时等说明。标题数没变，所以 audit 看不出来。已整篇按上游重译。

### 已知问题（上游未修，原样同步）

- `task-done` 在测试命令**完全没有输出**时会误判失败（上游 #2385）
- `task-done` 账本记的是日志最后一行，`node --test` 会记成 `# duration_ms …`（上游 #2342）

---

## v1.7.13 (2026-09-08)

**只有 TRAE 国内版用户需要更新。** 处理 [#35](https://github.com/jnMetaCode/superpowers-zh/issues/35) 时发现 Trae 此前**完全没有全局安装**，而国内版的全局目录还跟国际版不同构。

### 🐛 TRAE CN 全局目录是 `~/.trae-cn/skills`，不是 `~/.trae/skills`

[TRAE CN 官方文档「技能所在目录」](https://docs.trae.cn/ide/skills)：

| 作用域 | 路径 |
|---|---|
| 全局（macOS/Linux） | `~/.trae-cn/skills` |
| 全局（Windows） | `%userprofile%/.trae-cn/skills` |
| 项目 | 项目所在路径下的 `.trae/skills/` 目录 |

全局是 **`.trae-cn`**，差一个后缀就是又一次「装了 20 个文件、工具一个都不读」。而[国际版文档](https://docs.trae.ai/ide/skills)**没有给出全局路径** —— 按本仓一贯口径不猜，所以国际版不做全局。

```bash
npx superpowers-zh --tool trae             # 项目级，两版通用（.trae/skills/）
npx superpowers-zh --global --tool traecn  # 全局，仅国内版（~/.trae-cn/skills/）
```

别名 `traecn` / `trae-cn` / `trae-china`。`%userprofile%` 就是主目录，两平台在「主目录下的 `.trae-cn/skills`」这点上同构，不需要 `dirWin`。

**为什么单独成一条而不是挂到 Trae 上**：挂上去，国际版用户跑 `--global --tool trae` 就会装进一个 TRAE 根本不扫的目录 —— 正是这个 issue 想避免的事。项目级两版同构，仍由 `--tool trae` 一条覆盖。

### 🐛 拒绝文案说了假话

全局-only 工具的项目级拒绝此前是一段写死的通用文案，内容是 ZCode 的情况（「项目级导入是应用内 UI 动作、不暴露磁盘路径」）。**这对 TRAE CN 是假的** —— 它的项目级路径文档写得清清楚楚。

改成按工具可覆盖，TRAE CN 现在说的是真实原因：

```
❌ TRAE CN 不支持项目级安装。

  TRAE CN 的项目级技能目录与国际版 TRAE 相同（.trae/skills/），
  已经由 Trae 这一条覆盖，请直接用：
    npx superpowers-zh --tool trae
  本条目只用于 TRAE CN 独有的**全局**目录（~/.trae-cn/skills）。
```

### 🧮 工具数仍是 26，不是 27

`TRAE CN` 在安装器里占一条，但它是**同一个 IDE 的国内发行版**，单独成条只为承载独有的全局路径。计进产品数就是灌水，站点工具墙还会出现两张同名 Trae 卡片让人不知道点哪个。

新增 `editionOf` 标记，audit 的计数口径把这类条目排掉 —— 这是 Copilot CLI 那条例外（共用 `.claude/skills` 但单独计数）的镜像另一半。

### 🛡️ 门禁自己的两个 bug

| 问题 | 后果 |
|---|---|
| `verify-release` J 节用 `$( )` 取全局-only 工具名 | 含空格的「TRAE CN」被词分割成 `trae` + `cn` 两个不存在的目标，门禁自己造了两条假失败 |
| 外链验活不带 User-Agent | `docs.trae.cn` 对默认 curl UA 一律 400、带浏览器 UA 返回 200，新文档的引用被误判成死链 |

加 UA **不是**放宽判活口径：400 仍算死链，只是不再因为「对方不接待 curl」而误判。往文档里塞一条 `reasonix.io` 的真 404 做负向测试，照样被抓。

另外补了一条 dot 流程图门禁：graphviz 遇到「边引用了未声明的节点」不报错、只会静默新建一个孤儿框。同步上游 v6.3.0 时改了 SDD 流程图的节点文案，正是这个场景。

`audit` 163 pass / 0 warn，`verify-release` 163 → **164 pass**。

---

## v1.7.12 (2026-09-07)

**通过 Claude Code 插件市场安装的用户请更新。** 本版修的是一个「装了，但技能之间互相调不动」的问题，
并新增三款工具支持：**ZCode（智谱）**、**DeepSeek Harness** 与 **Reasonix**，工具数 23 → 26。

### 🐛 插件模式下跨技能调用全部失败（[#116 之外最实的一条：#124](https://github.com/jnMetaCode/superpowers-zh/issues/124)）

报告人给的证据完整到可以直接复现（v1.7.10 / 插件市场安装 / Windows）：

    Skill("superpowers:systematic-debugging")     -> Unknown skill
    Skill("superpowers-zh:systematic-debugging")  -> 正常加载

Claude Code 按「**<插件名>:<技能名>**」注册插件技能，而本插件在
`.claude-plugin/plugin.json` 里叫 `superpowers-zh`。可我们的 skill 正文里照抄了上游的
`superpowers:` 前缀 —— 实测全仓 `superpowers-zh:` **0 处**、`superpowers:` **32 处**，
分布在 11 个文件。凡是 skill A 让你去用 skill B 的地方，插件用户都会撞上 Unknown skill。

**但没有按报告里建议的换成 `superpowers-zh:`。** 本 fork 有两条分发路径，命名空间不同：

| 分发方式 | 技能怎么调 |
|---|---|
| 插件市场 | `superpowers-zh:<name>` |
| `npx superpowers-zh` → `.claude/skills/` | **裸名**（项目级技能） |

证据是安装器自己生成的 bootstrap —— 它列的就是裸名。也就是说那 32 处**在两种模式下
都是错的**；只改成 `superpowers-zh:` 等于修好插件模式、又给主分发路径挖一个反向的坑。

改成**裸技能名**：npx 模式直接正确；插件模式下模型按后缀匹配得到
`superpowers-zh:xxx`，而不是照着一个确定不存在的全限定名去调。

另有 1 处特例：`copilot-tools.md` 里那句是举例说明「插件智能体」的命名形式，且
`code-reviewer` 在本 fork 根本不是技能，改成通用写法 `<插件名>:<智能体名>`。

### 🐛 Crush 在 Windows 上装到了它不扫描的目录

[Crush README](https://github.com/charmbracelet/crush) 的 Agent Skills 一节写明
Windows 走 `%LOCALAPPDATA%\crush\skills\`（它给 Windows 用户的上手命令就是
`mkdir "$env:LOCALAPPDATA\crush\skills"`），而我们两个平台都装 `~/.config/crush/skills`。

**而我们自己的 `docs/README.crush.md` 早就写对了** —— 又一次「文档描述的是意图，
代码做的是另一回事」，与 v1.7.10 修 Aider 时同一句话。

`global` 支持可选的 `dirWin`，按平台选路。OpenCode 的 `.config/` **没动**：其官方文档
没有任何 Windows 专属说明，没证据就不猜路径。

### 🐛 render-graphs.js：取上游的两处修复，但不跟它改 ESM

上游 v6.3.0 改了三处，我们只取两处：

| 上游改动 | 我们 | 理由 |
|---|---|---|
| `execSync('dot -Tsvg')` → `execFileSync('dot', [...])` | ✅ | 安全加固，不过 shell |
| `execSync('which dot')` → `execFileSync('dot', ['-V'])` | ✅ | **Windows 修复** —— `which` 在 Windows 上不是命令 |
| CommonJS → ESM | ❌ | 这脚本会被拷进**用户项目**执行，Node 判定模块类型看用户项目的 package.json。Node 22.7+ 有 ESM 自动探测所以看不出问题，但本仓 engines 是 `node>=20`，Node 20 无探测，在普通 CommonJS 项目里直接加载失败 |

实测（`--no-experimental-detect-command` 模拟 Node 20）：上游版报
`To load an ES module, set "type": "module"` + SyntaxError，我们改后版本正常执行。

### 🔄 对齐上游 v6.3.0：13 个镜像文件、+415 / -44 行正文

旧门禁对已翻译的文件只比「标题数」—— 标题不变，正文改多少行都看不见。上游 v6.3.0
给 skill 正文加了 415 行，我们这边一声不吭。这一版补了基线文件
`.upstream-sync.json` 之后，第一次量出了这个缺口，并分四批补完：

| 文件 | 上游改动 | 这次同步了什么 |
|---|---|---|
| `brainstorming/SKILL.md` | +108 / -9 | 重译到 v6.3.0：Three Paths 结构、危险信号表、每条路径各自的检查清单 |
| `using-superpowers/references/codex-tools.md` | +70 / -1 | 我们原来只有 2 节 25 行，上游是 5 节；顺带修掉 `close_agent` 在 V1/V2 里的错误行 |
| `using-superpowers/references/hermes-tools.md` | +56 | 换成上游的 6 节版本，只保留一条声明过的 fork 注记 |
| `finishing-a-development-branch/SKILL.md` | +24 | 工作树删除被拒时的处理：绝不自作主张 `--force` |
| `implementer-prompt.md` / `re-review-prompt.md` / `code-reviewer.md` | +30 | 三份子智能体提示词统一加上「**你不派发子智能体**」契约 |
| `subagent-driven-development/SKILL.md` | +89 / -24 | 控制者从「遇事问人」改成「**自行裁决 + 记账**」（见下） |
| `task-reviewer-prompt.md` | +22 | 审查者不派子智能体；证据读不到 ≠ 证据不存在；打包分派要逐文件对 diff |
| `writing-plans/SKILL.md` / `using-superpowers/SKILL.md` / `visual-companion.md` | +9 / -4 | 计划模板新增 Spec 字段；Hermes 工具参考入口；Copilot CLI 后台启动说明 |

其中 SDD 那条是行为塑造上最实的一处改动。旧版本里，控制者一遇到「审查发现」与
「计划原文」冲突就停下来问人类伙伴；v6.3.0 改成由控制者自己裁决，每条裁决以
`Ruling: <决定> — <为什么> — <错了的代价>` 记进账本，收尾时汇总成「我作出的裁决」
交回来。只留四类硬停止：不可逆或破坏性操作、涉及安全的动作、工作树之外按惯例
该先问一声的副作用（合并 / 推送共享分支 / 发布）、以及坏到每条路都只能靠猜的计划。
理由是上游写在正文里的一句话：**一个错误的裁决，代价是看得见也撤得掉的返工；
一个停在问题上的会话，代价是一整天，而且什么也换不来。**

配套的流程图节点也跟着改了（「询问人类伙伴以哪个为准」→「对冲突作出裁决，把裁决
记进账本」），预检扫描的产出从一句结论改成一张必须逐行填的表。

**唯一有意不同步的是 `writing-skills/render-graphs.js` 的 CJS → ESM**，理由见上一节。
这条分歧写进了 `.upstream-sync.json` 的 evidence 字段，免得下次同步时被当成遗漏又"修"一遍。

### 🆕 新增 ZCode（智谱）支持 —— 只做全局，因为项目级路径官方从未公开（[#95](https://github.com/jnMetaCode/superpowers-zh/issues/95) [#120](https://github.com/jnMetaCode/superpowers-zh/issues/120)）

```bash
npx superpowers-zh --global --tool zcode     # -> ~/.zcode/skills/
```

[#120](https://github.com/jnMetaCode/superpowers-zh/issues/120) 附了一份完整补丁，写着装到
`.zcode/skills` + 写 `.zcode/AGENTS.md`。**没有采纳** —— 提交者自己写明那是「让 AI 按
zcode 的目录结构适配」生成的，而官方文档里查无此路径。

[ZCode 官方技能文档](https://zcode.z.ai/docs/skill)（中英文版一致）只给出一个磁盘路径：

    ZCode Agent 的用户级技能目录：~/.zcode/skills/<skill-name>/SKILL.md

项目级在文档里是**应用内的 UI 导入动作**（设置 → 技能 → 导入，可选「链接到来源目录」或
「复制成 ZCode 内部副本」，导入目标可选「全局」或「当前项目」），**从不暴露项目级磁盘
路径**。`.zcode/AGENTS.md` 同样查无实据 —— AGENTS.md 在 ZCode 里确实是六类扩展之一，
但位置与作用域文档页没写明。

所以项目级安装被**明确拒绝**（退出码 1、项目里零写入），并指向 `--global`：

    ❌ ZCode 不支持项目级安装。
      其官方文档只给出用户级技能目录，项目级导入是应用内的 UI 动作、不暴露磁盘路径。
      猜一个路径装进去只会「装了不生效」，所以这里直接拒绝。

猜路径的代价这仓已经付过三次（Codex 项目级、Windsurf 全局、VS Code），这次不付第四次。

技能装好后在 ZCode 里用 `$skill-name` 调用（设置 → 技能 里可查看与启停）。因为不写
bootstrap，**不会自动触发**，需要显式调用 —— 这个限制写在 `docs/README.zcode.md` 里。
若你查到 ZCode 的项目级路径或 AGENTS.md 的确切位置，欢迎开 issue，我们会补上。

工具数 23 → **24**，支持全局安装的工具 11 → **12**。

### 🆕 新增 DeepSeek Harness（dsh）支持（[#122](https://github.com/jnMetaCode/superpowers-zh/issues/122)）

```bash
npx superpowers-zh                          # 自动检测 .dsh/
npx superpowers-zh --global --tool dsh      # -> ~/.dsh/skills/ + ~/.dsh/AGENTS.md
```

与 ZCode 相反，这款**四条路径全部有一手出处**，所以项目级与全局都支持：

| 内容 | 路径 | 出处 |
|---|---|---|
| skills（项目级） | `.dsh/skills/` | `docs/subsystems/skills.md` 的 Local discovery priority 表 rank 100 |
| skills（全局） | `~/.dsh/skills/` | shell-env 文档：`dshHome \| $DSH_HOME, then ~/.dsh` |
| 引导（项目级） | 项目根 `AGENTS.md` | `instructionFileCandidates` 默认 `['AGENTS.md', 'CLAUDE.md']` |
| 引导（全局） | `~/.dsh/AGENTS.md` | user-global 指令文件为 `$DSH_HOME/AGENTS.md` |

**装过 Antigravity 或 Codex 的项目其实已经被覆盖一半**：dsh 的技能发现 rank 200 是
`.agents/skills`，正是那两款用的目录。文档里写明了别重复装。同理 dsh 也读 `CLAUDE.md`，
装过 Claude Code 的项目引导那半已生效 —— 但 `.claude/skills` 不在 dsh 的技能根列表里，
技能仍需单独装。

### 🆕 新增 Reasonix 支持（[#42](https://github.com/jnMetaCode/superpowers-zh/issues/42)）

```bash
npx superpowers-zh                           # 自动检测 .reasonix/ 或 reasonix.toml
npx superpowers-zh --global --tool reasonix
```

[Reasonix](https://reasonix.io/)（esengine/DeepSeek-Reasonix）是 DeepSeek 原生的终端 coding
agent。#42 的 issue 模板整个没填，但产品是真实存在的，官方文档也齐全：

| 内容 | 路径 | 出处 |
|---|---|---|
| skills（项目级） | `.reasonix/skills/` | `docs/CONFIG_PATHS.zh-CN.md`：项目本地 settings / skills / commands 位于项目 `.reasonix/` |
| skills（全局 macOS/Linux） | `~/.reasonix/skills/` | 同上：全局 skills = `<Reasonix home>/skills/` |
| skills（全局 **Windows**） | `%APPDATA%\reasonix\skills\` | 同上 Reasonix home 表：Windows 为 `%APPDATA%\reasonix`，**与 Unix 不同构** |
| 引导（项目级） | 项目根 `REASONIX.md` | `docs/GUIDE.zh-CN.md`：常驻指令分层加载 `REASONIX.md` / `AGENTS.md` / `CLAUDE.md` |

Windows 路径走上一版为 Crush 加的 `dirWin` 机制。**全局安装不写引导文件**：官方说
「用户全局文件先加载」但没写明那个文件的确切路径，不确认就不写 —— 全局仍装 skills，
只是不自动触发，想要自动触发用项目级安装。

### 🐛 在管理员 PowerShell 里跑，会把 skills 装进 C:\Windows\System32（[#125](https://github.com/jnMetaCode/superpowers-zh/issues/125)）

issue 正文只有一张截图、模板全空。但那张截图把事情说清楚了：

    PS C:\Windows\system32> npx superpowers-zh --tool trae
      模式: 项目级
      目标: C:\Windows\System32
      ✅ Trae [项目]: 20 个 skills -> C:\Windows\System32\.trae\skills
      ✅ Trae: bootstrap rule -> C:\Windows\System32\.trae\rules\superpowers-zh.md

**管理员权限打开的 PowerShell，默认工作目录就是 `C:\Windows\System32`。** 用户在那里
直接跑 npx，我们就老老实实把 20 个 skill 目录写进了 Windows 系统目录。

我们本来就有「拒绝装进用户主目录」的护栏（`--force` 可绕过），却从没拦过系统目录。
现在补上，且**不提供 --force 绕过** —— 装到系统目录没有任何正当用途，给个开关只会
让人照着开关走。

    ⚠️  当前目录是系统目录: C:\Windows\System32
      常见原因：**用管理员权限打开的 PowerShell / cmd，默认工作目录就是
      C:\Windows\System32**，直接在里面跑 npx 就会装到这里（issue #125）。
      正确做法 —— 先切到你的项目目录： cd D:\path\to\your\project

覆盖 Windows（`%SystemRoot%`、`%ProgramFiles%`、`%ProgramData%`、盘符根）与
Unix（`/`、`/usr`、`/etc`、`/bin`、`/sbin`、`/var`、`/opt`、`/System`、`/Library`）。
主目录与系统临时目录豁免（各有自己的处理）。

> 关于截图里那个「检测到当前版本文件损坏」弹窗：那是 TRAE 自己的完整性检查提示，
> **我们没有证据表明它是本次安装导致的**，所以不宣称因果。能确认并已修的是：
> 我们不该往系统目录写东西。

### 🛡️ 这一版新增 / 修好的门禁

每条都做过反向验证（把问题造回去，必须报错）：

| 门禁 | 堵的是 |
|---|---|
| skill 正文禁止出现 `superpowers:` 前缀 | 上游正文里全是它，每次同步都会带回来 |
| Windows 专属全局路径（platform 打桩跑真实代码） | 「只在某个平台不生效」的 bug，在 macOS 上跑一万次也测不出 |
| 11 款全局工具卸载零残留 + **不误删用户自有文件** | 此前只测了 1 款；「误删」一款都没测过 |
| 上游同步基线 `.upstream-sync.json` + 正文级漂移计量 | 上游改了 415 行正文，旧门禁一个字都没说 |
| 全局-only 工具的项目级必须明确拒绝（rc≠0 + 零写入） | 猜一个项目级路径装进去 = 第四次「装了不生效」 |
| 系统目录护栏（Unix + win32 打桩双向验证） | 管理员终端默认 cwd 就是 System32（#125） |
| audit 3c-bis 的静默分支改为显式 warn | 上游一发新版，检查条数就悄悄少一条 |

`verify-release` 115 → **163 pass**，`audit` 162 pass / 0 warn。

### 🌐 官网（不影响安装包）

本版官网侧改动较多，逐条见提交历史：版本提示条（此前站上对「谁该重装」零表述）、
22 份工具文档入口、JSON-LD 结构化数据、1200×630 分享大图、可访问性修复
（57 个页面两个 h1 / 搜索框焦点被抹掉 / 全站无 skip link）、sitemap 的 lastmod
不再谎报「今天改的」、抖音二维码 177 KB → 31 KB。

---

## v1.7.11 (2026-08-28)

**Codex CLI / VS Code / Windsurf / Qwen Code / DeerFlow / Claw Code 用户请重新安装。**

v1.7.10 那次核查查出三款装错，当时的结论是「既然错过一次，就该问一句还有几个」。这一版把**剩下没查过的全部查完了** —— 逐款对官方文档（拿不到文档的对源码），一款一款过。

结果：又是四款「装了完全不生效」。都是我们自己写的路径，都没查过官方文档。

### 🐛 Codex CLI：项目级装到了 Codex 从不扫描的目录

[官方 skills 文档](https://developers.openai.com/codex/skills)给出的扫描目录**完整清单**：

    $CWD/.agents/skills、$CWD/../.agents/skills、$REPO_ROOT/.agents/skills
    $HOME/.agents/skills、/etc/codex/skills、内置 skill

**没有 `.codex/skills`。** 而我们项目级正是装到那里。

讽刺的是全局（`~/.agents/skills`）一直是对的，原注释还专门写明「不是 `~/.codex/skills`」—— 说明当初查过全局，却没顺手核一下项目级。

已改为 `.agents/skills`，并在安装时清理旧位置（只清我们装的，用户自己放在 `.codex/skills` 下的不动，已实测）。与 Antigravity 共用 `.agents/skills` 是 Agent Skills 开放约定，不是冲突。

**这个改动还牵出一个既有 bug：自动检测有顺序依赖。** 检测原来是边装边判的 —— Codex 装完会创建 `.agents/`，循环走到 Antigravity（`detect: '.agents'`）时它就被误判成「项目里有这个工具」，于是多装一份。任何「装了 A 会创建 B 的检测标记」的组合都会中招。改为**先把所有工具的检测结果一次算完再开始装**：检测必须基于安装前的项目状态。

### 🐛 VS Code (Copilot)：装的 20 个文件，Copilot 一个都不读

[官方文档](https://code.visualstudio.com/docs/copilot/customization/custom-instructions)明确 Copilot 只自动读这几处：

    .github/copilot-instructions.md / AGENTS.md / CLAUDE.md   （始终生效）
    .github/instructions/*.instructions.md                    （按 applyTo 匹配）

我们把 20 个 skill 拷进 `.github/superpowers/` —— **不在其中**，而且装完什么引导都不写。

旧文档更说明问题：它写着「建议你创建 `.github/copilot-instructions.md` 引用这些 skills」并给了示例 —— **我们知道需要引导，却让用户自己动手**，而绝大多数人不会照做。

现在自动生成 `.github/instructions/superpowers-zh.instructions.md`（`applyTo: "**"`，约 4.5 KB 的索引），正文仍留在 `.github/superpowers/` 按需读取 —— 与 Cline / Kilo / Kiro 同一套「常驻只放索引」的思路。**刻意不动用户的 `copilot-instructions.md`**，那是他们的文件。

### 🐛 Windsurf：`--global` 装在 Windsurf 不读的地方

[官方文档](https://docs.windsurf.com/windsurf/cascade/skills)写明两个路径**不同构**：

| | 路径 |
|---|---|
| 项目级 | `.windsurf/skills/<name>/` ✅ 我们是对的 |
| 用户级 | `~/.codeium/windsurf/skills/<name>/` ❌ 我们装到了 `~/.windsurf/skills` |

**测试为什么没抓到：只验退出码，不验落盘位置。** 装到错目录退出码照样是 0 —— 「跑通了」不等于「装对了」。已补 `GLOBAL_DIR` 断言：每款全局工具逐个断言 skill 真落在官方读的那个目录，外加一条自检（以后加全局工具不能漏断言）。双向验证过：把路径改回旧值立刻报错。

### 🐛 DeerFlow：检测标记根本不存在（Aider 同款）

安装路径 `skills/custom/` 是对的（官方文档确认自动扫描 `["skills/public", "skills/custom"]` 两个写死的目录）。但 `detect` 写的是 `deer_flow` —— 用 GitHub API 列了 deer-flow main 分支顶层目录：

    .agent .github backend contracts deploy docker docs frontend plans
    pr-build scripts skills tests

**没有 `deer_flow`。** 与 Aider 的 `.aider` 是同一个毛病：真实检出从来没被自动检测到过。改认 `skills/public`（skills 机制本身、随仓库版本控制，任何检出都有），`deer_flow` 保留作 1.x 兼容。

顺带删掉文档里那段 `export DEERFLOW_SKILLS_DIR=...` —— **官方文档里没有这个环境变量**，目录是写死的。

### 🐛 Qwen Code：缺 bootstrap（skill 是死重）+ 我们把产品搞混了

路径是对的，但两个问题：

**① 产品搞混。** 文档标题写「Qwen Code (通义灵码)」、链接指向 `tongyi.aliyun.com`。实际 Qwen Code 是 [QwenLM/qwen-code](https://github.com/QwenLM/qwen-code) 这个**命令行工具**（Gemini CLI 的 fork）；通义灵码是阿里的 IDE 插件，**是另一个产品**，路径完全不同 —— 照我们的文档去配通义灵码是配不通的。与 [#119](https://github.com/jnMetaCode/superpowers-zh/issues/119) 的 Qoder 表是同一类错误：把两个产品面混成一份说明。

**② 只装 skills、不写 bootstrap。** Claude 写 `CLAUDE.md`、Gemini 写 `GEMINI.md`，而 Qwen Code 的对应物 `QWEN.md` 我们完全没用。按上游的原则：没有 bootstrap，skill 就是死重 —— 文件在磁盘上但很少被调用。已补（项目级写 `./QWEN.md`，全局写 `~/.qwen/QWEN.md`，已有文件用哨兵注释追加而非覆盖），并补上全局卸载的残留缺口。

### 🆕 Claw Code：补 bootstrap + 补文档（23 款里唯一没有安装文档的一款）

路径拿到了源码级证据（`ultraworkers/claw-code` 的 `rust/crates/plugins/src/lib.rs` 明写发现 `.claw/skills`、`.omc/skills`、`.agents/skills`；`USAGE.md` 列出指令文件优先级 `CLAUDE.md > CLAW.md > AGENTS.md`）。补上 `CLAW.md` bootstrap 与 `docs/README.claw.md`，并写明一条实用提醒：claw 也扫 `.agents/skills`，装过 Antigravity 的项目其实已经能读到，重复装会加载两份。

### 🆕 CodeBuddy / CodeArts 补 `--global`（全局支持 9 → 11 款）

两款的用户级路径此前都写着「尚未验证」，现已拿到官方出处：

| 工具 | 用户级路径 | 出处 |
|---|---|---|
| CodeBuddy（腾讯） | `~/.codebuddy/skills/` + `~/.codebuddy/CODEBUDDY.md` | [codebuddy.cn/docs/cli/codebuddy-dir](https://www.codebuddy.cn/docs/cli/codebuddy-dir) |
| CodeArts（华为云码道） | `~/.codeartsdoer/skills/` | 华为云官方用户指南 |

支持通用全局安装的工具由 9 款增至 **11 款**：Claude Code · Codex CLI · Qoder · Windsurf · Qwen Code · OpenClaw · OpenCode · Crush · Hermes Agent · CodeBuddy · CodeArts。

### 🐛 4 条死链，其中 2 条是编造出来的仓库地址

核查 OpenClaw 时发现文档链的是 `github.com/anthropics/openclaw` —— **那个仓库不存在**。顺手全仓扫了一遍外链，45 条里 4 条是死的：

| 原链接 | 状态 | 改为 |
|---|---|---|
| github.com/anthropics/openclaw | 404，仓库不存在 | github.com/openclaw/openclaw |
| github.com/anthropics/antigravity | 404，且 Antigravity 是**谷歌**的产品 | antigravity.google |
| huaweicloud.com/product/codeartsdoer.html | 404，产品页改版 | codearts.huaweicloud.com |
| docs.codeium.com/windsurf | Windsurf 已迁走 | docs.windsurf.com/… |

前两条是**编造出来的出处**。这比没有出处更坏：它让人以为核实过了。已固化成外链验活门禁（两遍制：并行快扫出嫌疑名单，再串行复核，两遍都判死才算死 —— 一个会误报的门禁比没有门禁更糟，人会学会忽略它）。

### 🌐 官网：工具墙停在 20 款，三处文案自己打自己

首页统计块写「20 支持工具」，同一屏的标题写「23 款工具通用」，FAQ 又枚举了 23 款。根因是文案计数跟着 installer 改到了 23，而 `site/build.mjs` 的工具数组从来没人补 —— **Cline / Kilo Code / Crush 的用户在安装命令下拉里找不到自己的工具**。

- 工具列表 20 → 23，统计块改成从列表长度算，不再硬编码
- 修 4 条错的：Claw Code 已能自动检出（不必再 `--tool claw`）、Hermes 改给 `--global`（项目级给了等于给「装了不生效」）、Qwen Code 类型 IDE → CLI、Antigravity 类型 CLI → IDE
- FAQ「支持全局」清单 7 → 11 款（三语同步）
- skill 详情页 **6 条死链**：`SKILL.md` 里指向兄弟文件的相对链接（`implementer-prompt.md`、`../requesting-code-review/code-reviewer.md` 等）站点上没有这些 `.md`，`../` 开头的 404，其余被渲染器打成 `href="#"` —— 点了没反应，比 404 还难查。现在解析到 GitHub 源文件
- 新增赞助商独立页，导航栏补当前页高亮

### 🛡️ 测试与门禁

这一版查出的问题，旧门禁一个都发现不了。逐条补上，并全部做过**反向验证**（把问题造回去，必须报错）：

| 新增门禁 | 堵的是 |
|---|---|
| 全局工具落盘位置断言 | Windsurf 那类「退出码 0 但装错目录」 |
| 外链验活（两遍制） | 编造出来的仓库地址 |
| 官网工具列表条目数 = TARGETS + 1 | 官网列表跟不上 installer |
| 官网全局清单必须覆盖每个 `global:` 目标 | FAQ 停在 7 款 |
| `grep -P` / 全角括号吞变量名 两条 shell 坑 | 我自己写出来的静默失效检查 |

`verify-release.sh` 101 → **115 pass**；`audit.sh` → **170 pass**。

### 📋 这一轮六款，六种失效方式

| 工具 | 路径对吗 | 失效方式 |
|---|---|---|
| Codex CLI | ❌ 项目级 | 装到从不被扫描的目录 |
| VS Code | ❌ | 位置不在官方读取清单里，且不写引导 |
| Windsurf | ❌ 仅全局 | 用户级路径与项目级不同构 |
| DeerFlow | ✅ | 检测标记不存在，从没被自动检测到 |
| Qwen Code | ✅ | 无 bootstrap，skill 是死重；文档搞混产品 |
| Claw Code | ✅ | 无 bootstrap、无文档 |

**共同点：全部是我们自己写的，全部没查过官方文档。** 现在每条路径在代码注释里都带出处链接与核对结论 —— 下次改之前先看那行注释。

---

## v1.7.10 (2026-08-12)

**Aider 和 Kiro 用户请重新安装。** 本版本源于一次对「我们自己那层工具支持」的系统核查 —— 起因是 v1.7.9 修 Hermes 时发现：我们从支持它起就装错了目录。既然错过一次，就该问一句**还有几个**。

答案是：又查出三个，全部是我们自己写的、全部没查过官方文档。

### 🐛 Aider：两个错叠在一起，等于完全不可用

**① 真实的 Aider 项目从来没被自动检测到过。**

检测标记写的是 `.aider`，即要求存在一个 `.aider/` **目录** —— 而 Aider 根本不创建这个目录。它在项目根留下的是 `.aider.` 前缀的产物：`.aider.conf.yml`、`.aider.chat.history.md`、`.aider.tags.cache.v3/`。

实测：造一个含这三样的真实 Aider 项目跑 `npx superpowers-zh`，输出「未检测到任何已知 AI 编程工具」。而文档一直写着「会自动检测 `.aider.conf.yml` 文件」—— **文档描述的是意图，代码做的是另一回事。**

已改为认这四个标记。

**② `CONVENTIONS.md` 不会被 Aider 自动加载。**

代码注释和文档都断言「Aider 原生支持自动加载此文件」。[官方文档](https://aider.chat/docs/usage/conventions.html)说的是反的：必须 `aider --read CONVENTIONS.md`，或在 `.aider.conf.yml` 里写 `read: CONVENTIONS.md`。

最糟的是文档「Skills 未生效」排障的第 3 条写着「Aider 会自动读取 CONVENTIONS.md，无需额外配置」—— **用户卡住时来查文档，看到的正好是让他继续卡住的那句。**

改法照搬 v1.7.9 的 Hermes：装完打印可直接用的两种激活方式，**不替用户改 `.aider.conf.yml`**（那是他们的文件）。

### 🐛 Kiro：错的方向正好相反 —— 每一轮烧 335 KB

[Kiro 官方文档](https://kiro.dev/docs/steering/)明确：`.kiro/steering/` 下的文件**默认就是 `inclusion: always`**，"loaded into every Kiro interaction automatically"。

而我们把 20 个 skill 的正文整个装了进去。实测 **47 个 md、335 KB，每一轮对话全量进上下文**。

讽刺的是这个问题我们早解过 —— 当初给 Cline / Kilo Code 做适配时专门设计了「常驻位置只放索引、正文按需读取」（那次是 182 KB）。只是没意识到 Kiro 的 steering 是同一性质。现在照搬：

| | v1.7.9 | v1.7.10 |
|---|---|---|
| steering 常驻 | 47 个 md / 335 KB | **1 个索引 / 4.4 KB** |
| skill 正文 | `.kiro/steering/<name>/` | `.kiro/skills/<name>/`（按需读取） |

**76 倍。** 升级路径是这次最要紧的一块：老用户通常直接重装而不会先卸载，不清旧布局的话新旧两份并存、335 KB 一点没减 —— 那就等于没修。所以安装时先清 `.kiro/steering/` 下与我们 skill 同名的目录，并打印清理了几个。**你自己写的 steering 文件不会被动**，已实测。

另外文档里写的加载模式 `alwaysApply: true` / `globs: "*.ts"` —— 这两个键 **Kiro 文档里根本不存在**，是 Cursor / Trae 的约定被误写成了 Kiro 的。Kiro 实际用 `inclusion` / `fileMatchPattern`。已按官方文档重写整篇。

### 🐛 Qoder：工具映射表是编的（[#119](https://github.com/jnMetaCode/superpowers-zh/issues/119)）

报告人说 Qoder IDE 里没有 `general-purpose` 子智能体，而我们的 `qoder-tools.md` 白纸黑字写着有。查该文件的引入 commit —— **没有引用任何来源**。

对照 [Qoder 官方子代理文档](https://docs.qoder.com/zh/cli/subagent)，4 行错了 2 行：`Explore → explore-agent`、`Plan → plan-agent` 都是错的，文档里就是**同名**；「Qoder 有内置 `code-reviewer`」也是编的（文档里的 `api-reviewer` 是用户自建示例）。

但最关键的不是这几行 —— **那张表根本没标适用范围**。官方文档只覆盖 Qoder CLI，报告人用的是 Qoder IDE，两个产品面本来就不同，而我们的表让 IDE 用户当成了权威。已补适用范围、来源链接、核对日期，和一节 IDE/CLI 差异说明。

### 🛡️ 把「拿代码测代码」的盲区堵上

Aider 那个 bug 能在 90 项全绿的情况下活下来，是因为测试写的是 `mkdir .aider` 然后断言认出 Aider —— **拿代码测代码，真实标记一个都没测。**

已补：

- Aider 的三个真实标记进检测测试；`case` 分支加 `*.yml`（`.aider.conf.yml` 是文件不是目录，用目录冒充等于测了个假场景）
- Kiro 两条硬回归守卫：steering 下**只能有 1 个 md**、常驻总字节 **< 20 KB**；外加升级路径断言（旧布局必须清掉、用户文件必须保留）。双向验证过 —— 模拟退回旧布局，两条断言都会失败

`verify-release.sh` 90 → **101 pass**。

### 📋 四个工具，四种失效方式

| 工具 | 错法 | 后果 |
|---|---|---|
| Hermes（v1.7.9 已修） | 装到不被读的目录 | 完全不生效 |
| Aider | 检测标记不存在 + 断言文件会自动加载 | 检测不到 + 装了不生效 |
| Kiro | 正文放进每轮常驻的目录 | 每轮烧 335 KB |
| Qoder | 映射表照着别家约定编 | 用户按错的工具名调用 |

**四个都是我们自己那层写的，四个都没查官方文档。** 这已经不是个案。剩余工具的核查还在继续，会在后续版本陆续修。

### ✅ 发版前门禁

- `audit.sh` 166 pass / 0 warn / 0 fail
- `verify-release.sh` 101 pass / 0 fail

---

## v1.7.9 (2026-08-11)

**如果你在用 Hermes Agent，请重新安装。** 本版本之前我们对 Hermes 的支持是**坏的** —— 不是"不好用"，是装完完全不生效。

### 🐛 Hermes：我们一直装错了目录（[#45](https://github.com/jnMetaCode/superpowers-zh/issues/45)）

报告人说「项目级 `.hermes/skills/` 里的 20 个 skill 全部返回 404，必须手动复制到 `~/.hermes/skills/` 才被识别」。查[官方文档](https://hermes-agent.nousresearch.com/docs/user-guide/features/skills)核实，他是对的：

> Hermes 只自动加载 `~/.hermes/skills/`（原文称其为 "the primary directory and source of truth"），**项目级目录不会被自动发现**；外部目录必须写进 `~/.hermes/config.yaml` 的 `skills.external_dirs`。

而我们从支持 Hermes 起就只装项目级 `.hermes/skills/` —— **那个目录 Hermes 根本不读**。装了 20 个 skill，一个都不生效，比不支持更糟：用户以为装好了。

**改法：**

- **全局成为推荐装法** —— `npx superpowers-zh --global --tool hermes` 装到 `~/.hermes/skills/`，装完即生效，`skills_list` 直接能看到 20 个 skill
- **项目级保留**（skills 可以随仓库分发），但装完打印**可直接粘贴**的配置片段，带绝对路径：

  ```yaml
  skills:
    external_dirs:
      - /your/project/.hermes/skills
  ```

  **我们不替你改 `config.yaml`** —— 那是你的文件。文档里特意写明「配置里不存在的路径会被静默跳过」，所以写错不会报错、只会"没生效"，这个坑值得先说。

**过程中拦住了一次自己猜路径：** 第一版全局实现把 `HERMES.md` 引导文件写到了 `$HOME` 根目录。Hermes 的用户级指令文件约定**没有公开文档** —— 那是在猜路径 + 污染用户主目录。已改为全局模式不写 bootstrap，并在文档里说明理由。实测：全局装完 `$HOME` 根目录 0 个新文件、卸载 0 残留。

### 🔧 发版工具：`bump-version.sh` 缺 jq 时会静默改错

本次发版时踩到：机器上没有 `jq`，脚本不报错退出，而是每个文件打一行 `command not found` 后**继续往下跑**，最后以 `unbound variable` 收场 —— 版本号一个都没写进去，但输出里混着 "Done."。已加前置检查：缺 `jq` 直接退出并给出安装命令。

### ℹ️ #45 的后半部分未动（说明理由）

#45 还提到 7 个 skill 文件里有 24 处硬编码的 Claude 工具名（`TodoWrite` / `Read` / `Bash` 等）。**本次不动**，理由：那属于行为塑造内容，且 `references/hermes-tools.md` 已有完整映射表。正确解法是强化「查映射表」的引用，而不是把正文改成某个 harness 专属的工具名 —— 那会伤到其余 22 款工具。

### ✅ 发版前门禁

- `audit.sh` 166 pass / 0 warn / 0 fail
- `verify-release.sh` 90 pass / 0 fail（`--global` 支持清单 6 → 7 款，新增 hermes）

---

## v1.7.8 (2026-08-08)

本版本源于一次**定位核查**：按「superpowers-zh 只是完整翻译上游 + 增加更多工具支持」这个定位，逐层比对我们与 [obra/superpowers](https://github.com/obra/superpowers) 的差异。结论是**定位基本站得住，但不完全** —— 查出 5 处偏离，全部修掉。

### 🔍 核查方法

1. **文件级**：上游 `skills/` 与我们逐文件比对，分出「仅上游有」「仅我们有」
2. **内容级**：14 个翻译 skill 各自比对标题数（排除代码围栏）、表格行数、列表项数
3. **溯源**：每处差异追查来源 —— 是声明过的 fork 增量，还是漏译／漏同步

### 🐛 修掉的 5 处偏离

**① `antigravity-tools.md` 上游有、我们没有**

而 installer 里明明支持 Antigravity —— 该工具用户拿不到任何工具映射。影响是实质的：**Antigravity 没有 todo 工具**（`manage_task` 管的是后台进程），没这份映射，所有说「创建待办」的 skill 在它上面都会走偏。已翻译补入，并按上游同序列入平台适配清单。

**② `finishing-a-development-branch` 漏同步 3 个 commit**

C 块时的 commit 清单不全，漏了 `fbb6dba` / `bcfe798` / `9dff1a9`。其中 `9dff1a9` 是**行为变更**：上游把菜单从 4 个选项减为 3 个，**删掉了「丢弃这份工作」**，丢弃改为只在人类伙伴明确提出时才走的独立小节；基础分支判定也从盲跑 `merge-base` 改为「先确认，合并到错分支代价很高」。已照上游当前状态整体重译（一次拿到全部 4 个 commit），并断言 D 块的 worktree 修复完整保留。

**③ `writing-plans` 漏译整节** —— 上游的 `Task Right-Sizing`（任务边界怎么划）我们完全没有。

**④ `writing-skills` 四个问题** —— 漏译 H2 整节 `Match the Form to the Failure`（含「禁令在塑形类问题上会反噬」的实测结论）、漏译 H3 `Micro-Test Wording Before Full Scenarios`、**两个连续小节都编号为 4**、节名仍是过时的「Claude 搜索优化（CSO）」（上游早已改名 SDO），正文两处引用一并同步。

**⑤ fork 增量插在了上游步骤序列中间**

`executing-plans` 把「处理常见异常」插成步骤 3，于是上游的 `Step 3: Complete Development` 被挤成我们的「步骤 4」；`Remember` 也从上游的 6 条被加到 7 条。**这不是「不影响上游」，是改了上游的结构编号。**

改为**外挂式**：增量移出步骤序列、挂在「何时停下来求助」之后（它本就是那节三种情形的展开），步骤编号恢复 1/2/3，`Remember` 恢复 6 条。

### 🛡️ 让「不影响上游」成为可执行的检查

README 声明会漂移，所以新增 **audit 3c-bis**：

> 翻译 skill 的标题数必须等于「上游标题数 + 本文件里带标注的增量节数」

增量节靠正文里一行标注声明（`本节是 superpowers-zh 的增量内容`），标注与内容同处一文件、不会各自漂移。**未标注就多出章节 = 隐性分叉，直接 FAIL。** 已双向验证：偷偷加一节会被拦下并给出可操作提示，加标注后放行。

目前全仓仅 2 处带标注的增量：`executing-plans` 的「常见异常处理」、`using-superpowers` 的「中国特色技能路由」。

### 🐛 修掉一个让守卫从未生效的 bug

3c-bis 第一次测试**没拦住**。查出原因：`grep -c` 匹配到 0 个时输出 `"0"` 但**退出码为 1**，写成 `$(grep -c ... || echo 0)` 会拼出 `"0\n0"`，后续整数比较直接报错、检查静默失效。改用 `; true` 只吞退出码。

全仓扫同一模式，**测试辅助里也有 3 处**（上游同样有）：`test-helpers.sh` 的 `assert_count`、`test-subagent-driven-development-integration.sh` 的 `task_count` / `todo_count`。后果是这些断言**永远无法正常失败** —— 模式没匹配到时比较报错而非判定失败。三处一并修掉并加注释。（`tests/` 不进 npm 包，仅开发使用。）

修复后 audit 由 154 升到 **166 pass** —— 因为 3c-bis 现在真的对 14 个 skill 都跑了。

### ✅ 核查后的定位现状

**纯增量部分（符合定位）：**
- 6 个 fork 专属 skill：`chinese-*` ×4 + `mcp-builder` + `workflow-runner`
- 3 个 fork 专属 references：`copilot` / `hermes` / `qoder`（我们支持、上游不支持或已删的 harness）
- 2 处带标注的翻译 skill 内增量

**14 个翻译 skill 的上游各节现已全部逐节对应。**

`scripts/audit.sh` **166 pass / 0 warn / 0 fail**、`scripts/verify-release.sh` **90 pass / 0 fail**。

---

## v1.7.7 (2026-08-08)

### 🆕 新增 Crush 适配（工具数 22 → 23，关 #40）

查权威源（[charmbracelet/crush](https://github.com/charmbracelet/crush) repo 文档）确认：Crush 遵循 **Agent Skills 开放标准**，项目级**自动发现**四个目录，无需任何配置：

```
.crush/skills    .agents/skills    .claude/skills    .cursor/skills
```

用户级为 `~/.config/crush/skills`，因此**支持 `--global`**。

> ⚠️ **一个重要副作用：** 已经为 Claude Code / Cursor / Codex / Antigravity 装过 superpowers-zh 的用户，**Crush 现在就已经能读到那些 skills** —— 此时**不要**再装 `--tool crush`，否则同一批 skills 会有两份被重复加载。[docs/README.crush.md](https://github.com/jnMetaCode/superpowers-zh/blob/main/docs/README.crush.md) 里给了确认命令。

skills-only 适配，不需要 bootstrap；**不动你的 `crush.json`**（四个自动发现目录已够用）。实测：装 20 skills / 二次装幂等 / 卸载零残留且正确保留用户的 `crush.json`；`--global` 装到 `~/.config/crush/skills` 并可干净卸载。

### 🎯 上个版本新加的计数检查，第一次在真实改动里生效

加 Crush 时漏改了 `site/build.mjs` 的 5 处计数（三语言标语 + FAQ 枚举）。v1.7.3 引入的 audit Category 5 **直接 FAIL 拦下**：

```
❌ 计数不一致: site/build.mjs「官网简体标语」= 22，应为 23
❌ 计数不一致: site/build.mjs「官网 FAQ 枚举」= 22，应为 23
... 共 5 条
```

已补 site 18 处并重建，三语言首页 23 计数、0 残留、Crush 均已出现。

### 🔧 `verify-release.sh` 有同样的漂移问题，已修

它有自己独立的覆盖清单 —— 加新工具时不进去就**静默不测**。本次 Crush 就是这样：分数仍是 82，因为压根没测它。

- `SPEC` / `DETECT` / `GLOBAL_OK` 三处补 Crush
- 顺带发现 B 段还漏了 **3 个工具**的检测标记：DeerFlow（`deer_flow`）、VS Code（`.github/copilot-instructions.md`）、Gemini CLI（`GEMINI.md`）—— 后两个是**文件而非目录**，原先的 DETECT 循环一律 `mkdir`，现按扩展名区分创建方式
- **新增 G 段自检**：`SPEC` 覆盖数必须等于 installer 宣称的工具数；`DETECT` 覆盖的工具名集合必须包含全部 `TARGETS` 名字（用**集合比对**而非数条数 —— 一个工具可以有多个检测标记，数数会误判）

覆盖从 **82 项升到 90 项**。

### ✅ 验证

`scripts/audit.sh` **152 pass / 0 warn / 0 fail**、`scripts/verify-release.sh` **90 pass / 0 fail**。

---

## v1.7.6 (2026-08-08)

**上游 v6.2.0 对齐完成** —— [#19](https://github.com/jnMetaCode/superpowers-zh/issues/19) 的 C 块收尾，`scripts/audit.sh` 的上游结构漂移告警**清零**。

### 🧾 盘点先行：其中 3 项不是风格性改动

C 块表面上是 14 个 `refactor(skills)` commit（"drop social proof"、"drop The Bottom Line"、"fold into rationalization table"），看着像上游在统一自己的文风。开工前做了逐 commit 盘点，判定标准定为**「删掉的文字里有没有别处没写的规则」**——结论纠正了原本的假设：

- **`cfb6281`** 新增了一张 rationalization 表（2 行**全新规则**），替换掉「与工作流的集成」那份清单
- **`03147d2`** 给 `executing-plans` 加了「先确保隔离工作区」作为**步骤 1**（SDD 那一半已随 A 块完成）
- **`bc86802`** 把「常见错误」5 个小节 + 「红线」Never/Always 双清单压成 5 行表，**规则一条不少**——这也是此前唯一有客观漂移证据的 skill

### ✂️ 其余各项逐条核实后才删

| skill | 删掉的 | 规则去哪了 |
|---|---|---|
| `receiving-code-review` | 「底线」 | 概述已有「核心原则：先验证再实施。先提问再假设」 |
| `writing-skills` | 「总结」 | 铁律节 + TDD 循环表已完整承载 |
| `writing-plans` | 「注意事项」 | 精确路径 / `Run:` / 预期输出 三条都**内建在任务结构模板**里——上游是把「告知」改成「示范」 |
| `brainstorming` | 「核心原则」6 条 | 5 条已在流程详述逐条体现；YAGNI 按上游移到「探索方案」的使用现场 |
| `systematic-debugging` | 「实际效果」+ 社会证明句 | 核心原则行保留；「相关技能」块折入第四阶段「验证修复」 |
| `dispatching-parallel-agents` | 「核心优势」「实际效果」 | 验证节保留 |
| `verification-before-completion` | 「为什么这很重要」「底线」 | 「证据先于宣称」核心原则行保留 |
| `executing-plans` | 质量宣称、「集成」 | 按上游改写为平铺平台清单 |

### ✅ 验证

**结构**：10 个 skill 的 H2 数与上游逐一对齐（8 个完全相同、2 个差 1）；`executing-plans` / `using-git-worktrees` / `requesting-code-review` 的 `superpowers:` 引用集与上游**完全一致**。

**行为 eval —— 两轮共 11 题全对。** 专门考被删段落里的规则是否仍生效：原生 worktree 工具 vs `git worktree add`（答出「第一大错误」与「幽灵状态」）、跳过 `check-ignore` 的后果、目录名优先级、基线失败能否继续、能否无证据宣称完成、审查建议有疑问时该照做还是反驳、能否先打补丁再查根因、能否自己读 diff 代替派审查者（命中 `cfb6281` 新增表行）、方案里的「以后可能用得上」怎么处理（命中 YAGNI 新落点）。

**回归**：`scripts/audit.sh` **150 pass / 0 warn / 0 fail**、`scripts/verify-release.sh` **82 pass / 0 fail**。

> audit PASS 由 152 降至 150 —— 上游有意删除的两个「集成」节里各有 `superpowers:` 引用，Category 4b 因此少 2 项检查；引用集已核对与上游一致。

---

## v1.7.5 (2026-08-07)

对齐上游 v6.2.0 的 **B 块 + D 块**（[#19](https://github.com/jnMetaCode/superpowers-zh/issues/19)）。

### 🐛 worktree 清理静默空转（真 bug，我们与上游同样存在）

`finishing-a-development-branch` 的步骤 6 在步骤 5 已经 `cd` 到主仓库根之后，才用 `git rev-parse --show-toplevel` 重算 `WORKTREE_PATH` —— 于是拿到主根路径，`.worktrees/` 溯源判断**永远匹配不上**，清理静默空转，随后分支删除还会因为 worktree 仍挂着而失败。上游记录说测试对象不得不偏离 skill 原文才能跑通。

修法：步骤 2 趁还在工作区内就捕获，步骤 6 消费该值并加显式警告说明为何不能重算；去掉步骤 6 冗余的 `MAIN_ROOT` 推导与 `cd`；选项 2 补上菜单已声称的分离 HEAD 推送变体。

**已实际复现验证**（临时仓库 + `.worktrees/feature`）：旧逻辑算得 `main` → 溯源未命中 → 清理空转；新逻辑捕获到 `main/.worktrees/feature` → 命中 → `worktree remove` 与 `branch -D` 均成功。

### 🐛 我们把 Gemini 的子智能体支持写错了

`gemini-tools.md` 原文称 Gemini CLI 没有 Task 等价物、依赖子智能体的 skill「退化为 `executing-plans` 单会话执行」。**这是错的** —— Gemini CLI 通过 `invoke_agent`（`agent_name: "generalist"`，也可用 `@generalist` 聊天语法）支持子智能体，且支持同一响应内多调用并行分派。

这个错误会让 Gemini CLI 用户的 `subagent-driven-development` / `dispatching-parallel-agents` / `requesting-code-review` 全部瘸腿。按上游重写（33 → 62 行），补齐指令文件层级加载、`~/.gemini/skills` 与 `~/.agents/skills` 优先级、模板填写、并行分派，以及此前缺失的 20 个工具名。已全仓扫描确认无别处重复该说法。

### 🔄 `testing-anti-patterns.md` → `writing-good-tests.md`

上游把 299 行的反模式枚举重写为 198 行的**两条原则**：

- **原则 1「点名它要抓的破坏」** —— 写测试体前先答"什么生产改动会让它失败，那是 bug 还是决定"。含镜像断言、变更探测器、测行为不测文本、测你的代码不测框架
- **原则 2「跑真东西」** —— mock 不配拥有断言、在正确层级 mock、替身要具体、完整镜像真实数据、生产类只承载生产方法
- 新增**变异检查**：收尾前在脑中变异生产代码，每种现实变异都应至少让一个测试失败
- 触发条件放宽到「编写或修改**任何**测试时」

TDD SKILL.md 同步：删掉「为什么顺序很重要」整节长散文（论点折进合理化借口表，5 行扩写）、删掉末尾已失效的「测试反模式」一节。

### 🔧 audit 结构漂移度量修正（此前一直在虚报欠账）

`audit.sh` 用 `grep -cE '^#{1,4} '` 数标题，但这会把 ``` 围栏内的 shell 注释（`# 运行测试`）当成 markdown 标题 —— 多几行 bash 注释就能凭空造出「结构漂移」。

用正确口径（awk 逐行跟踪围栏）重算 14 个 skill，3 条告警里 **2 条是假阳性**：

| skill | 旧口径 | 新口径 |
|---|---|---|
| `executing-plans` | 9/16 **WARN** | 9/11 pass |
| `finishing-a-development-branch` | 21/31 **WARN** | 14/17 pass |
| `using-git-worktrees` | 21/28 WARN | 14/21 **WARN（真漂移）** |

双向验证：给 `brainstorming` 加 5 个真标题会触发告警，加 5 行围栏内 shell 注释不触发。

### ✅ 验证

- 两个新/改文件章节均与上游一一对应；`writing-good-tests.md` 指标精确一致（12 bold 要点 / 11 行表格 / 11 条危险信号 / 14 项代码记号）
- **行为 eval 8 个判断场景：8/8 全对**。附带一个有价值的对照：agent 拿不到 `writing-good-tests.md`、只能退回 SKILL.md 四条摘要时得分 6/8 —— 错的恰好是只存在于参考文件里的两条规则（部分 mock 静默失败、琐碎转发 getter 不配有测试）。说明参考文件承载着摘要覆盖不到的承重规则。
- `scripts/audit.sh` **152 pass / 1 warn / 0 fail**（原 150/3）、`scripts/verify-release.sh` **82 pass / 0 fail**

---

## v1.7.4 (2026-08-07)

### 🔄 SDD 同步上游 v6.2.0：plan 作用域工作区 + 基于唤回的修复循环（#19 A 块）

对齐上游 `subagent-driven-development` 的 6 个 commit。这是 [#19](https://github.com/jnMetaCode/superpowers-zh/issues/19) 拆分后的 A 块 —— 注意 v1.7.1 刚对齐过 SDD，本次是那之后的**新增量**。

**为什么脚本与文档必须整块一起改：** 我们的 SKILL.md 里写的是旧签名 `review-package BASE HEAD`。脚本换成 plan 作用域签名后若不同步改文档，agent 会照旧签名调用直接吃 usage 错误 —— 比不同步更糟。

**plan 作用域工作区（结构性修复）**

原先所有计划共用 `.superpowers/sdd/` 一个目录，一份过期账本被误读成当前进度会让控制者**跳过整段任务序列**（上游称之为观察到的最昂贵失败）。现在每个计划一个 `.superpowers/sdd/<计划文件名>/`，从结构上消除误读。账本新增身份行 `# SDD ledger — plan: <路径>`。

- `sdd-workspace` / `review-package` 在我们这边与上游 v6.1.1 字节一致（从未汉化），直接取上游版
- `task-brief` 只手工应用上游那两处改动，**保留 fork 适配**（awk 同时匹配 `Task N` 与 `任务 N`，因为本仓库 writing-plans 产出中文标题）

**SKILL.md 全面重写（平铺 14 节 → 生命周期结构）**

- **修复循环**：一轮 = 一次修复分派 + 一次定向复审，每任务上限五轮。第 1-3 轮**唤回原实现者**（context 完整），第 4-5 轮换全新实现者 + 高一档模型
- **熔断**：第 5 轮仍有未解决发现则停止分派，逐条裁定 —— 搁置（附裁定）或在承重项上 BLOCKED。只在上限处裁定，提早裁定等于换名字的预先定性
- Minor 发现与「计划要求的」发现两条路在循环外
- 新增「常见的合理化借口」表取代原「红线」清单
- 新增 `re-review-prompt.md`（106 行全文翻译）

### 🧹 清除 v1.7.1 遗留的生成产物

三个 SDD 文件末尾都残留着 `</content>` —— v1.7.1 那次重写（PR #108, `d7885ca`）留下的，上游没有。这些文件会整体进 agent 的 prompt，属于污染。已全部清除并全仓扫描确认无同类残留。

### ✅ 验证（含行为 eval）

**结构性核对**
- 章节结构与上游 14 节一一对应；`superpowers:` 引用集与上游完全一致
- 26 项关键技术记号（脚本签名、账本行格式、四种状态、`ADDRESSED`/`NOT ADDRESSED`、数值门槛）逐一确认存在，无漏译
- 两个 dot 图节点/边数与上游精确一致（6/6 与 23/28），且**无幽灵节点、无孤立节点** —— 手工翻译 dot 标签最易在边里写错，会静默产生幽灵节点

**脚本实测**（临时 git 仓库）
- 两个计划各得独立目录；往 A 计划写 ledger 后 B 计划目录仍为空（关键回归）
- `.gitignore` 落在 `.superpowers/sdd/` 层且 `git status` 干净
- 中文「任务 2」与英文「Task 3」经新路径均抽取成功
- `review-package` 旧签名正确报 usage 错误

**行为 eval —— 新机制 7 个场景全对**

考察译文是否真的传达了新规则（第 2 轮该唤回还是换新、第 4 轮模型档位、第 5 轮能否再开一轮、承重发现该搁置还是停下、Minor 走哪条路、遇到别的计划的账本怎么办、控制者能否自己修）：**7/7 正确**，连「运行环境无法唤回时才改派全新实现者」这个细节都答出。

**集成 eval —— 真实 agent 的准备阶段**

用 `tests/subagent-driven-dev/go-fractals` 脚手架跑真实执行的准备阶段，验证 agent 是否按**新签名**调脚本（旧习惯可能让它省掉 `PLAN_FILE`）：

- ✔ 实际调用 `sdd-workspace plan.md`，带上了 PLAN_FILE 参数
- ✔ 同时检查了 plan 作用域账本**和**旧扁平路径的游离账本
- ✔ 账本第一行为正确的身份行
- ✔ 工作区落在 `.superpowers/sdd/plan/`，未在旧扁平路径写账本
- ✔ 起飞前冲突扫描产出 5 条**打包成一次**的提问（而非逐条打断）
- ✔ 建了 10 条待办，并按指令在分派实现者前停下

**回归**：`scripts/audit.sh` 150 pass / 0 fail、`scripts/verify-release.sh` 82 pass / 0 fail。SDD 已从 audit 的上游漂移警告里消失（结构层级现已对齐）。

> audit PASS 由 153 降至 150，是上游有意删除 Integration 一节（原列 `executing-plans` / `test-driven-development` / `writing-plans` 三个引用）导致 Category 4b 少 3 项引用检查，非静默跳过。

---

## v1.7.3 (2026-08-07)

### 🐛 同步上游两处纯代码修复（对齐 v6.1.1 → v6.2.0 时挑出）

两个文件在我们这边都与上游 v6.1.1 **字节一致**（从未汉化改动），因此可直接取上游版 —— 无需翻译、无需 eval。

- **`hooks/hooks.json` 加 `"shell": "bash"`**（上游 `5151e7a`）：SessionStart hook 在 Windows 上原先不经 Git Bash 分发。我们的 hooks.json 与上游除这一行外完全相同。这条直接改善 Windows 用户的 bootstrap 可靠性 —— **bootstrap 不加载，skill 就是死重**。
- **`skills/systematic-debugging/find-polluter.sh`**（上游 `6015d37`、`c8921b5`）：修三个真 bug，已逐个实测新旧版对比：
  - pattern 带 `./` 前缀时匹配不到（`find .` 输出 `./` 前缀路径）：旧 1 个 → 新 2 个
  - `-path` 的 `**/` 无法匹配零层目录，`src/**/*.test.ts` 漏掉 `src/top.test.ts`：旧 1 个 → 新 2 个
  - 完全无匹配时计数为 1 而非 0（`echo` 空串仍算一行）：旧 1 → 新 0

### 🧪 新增工具计数一致性检查（audit Category 5，+24 项）

加一款工具要同步简繁 README（各 6 处）、`package.json`、`CLAUDE.md`、`site/build.mjs`（三语言 15 处）、3 份 plugin manifest —— v1.7.2 全靠人工 grep 才没漏。现在从 installer 的 `TARGETS` 推导期望值并逐处断言，另加两条结构性检查：README 工具表行数必须等于宣称数、Category 2 实际测试的工具数必须等于宣称数（**宣称了就必须测**）。

已验证会拦：把标题改成 23 款、删掉一行工具表，两种漂移都被抓到。

口径写进注释：`TARGETS` 是「安装目标」共 21 个；Copilot CLI 与 CC 共用 `.claude/skills`（别名映射过去）不占独立条目，但文案里作为独立产品单独计数，所以「文案数 = TARGETS 数 + 1 = 22」。

### 🐛 修 bash 3.2 下 CJK 报错信息乱码

macOS 自带 bash 3.2.57 解析标识符时不识别多字节字符，`$file「` 会把「的首字节 `0xE3` 吞进变量名，导致变量展开为空且字符被截断。报错信息变成「计数不一致: ����= ��应为 22」—— **只在检查失败时才暴露，写检查的人看不到**。

复现：`bash -c 'f=README.md; echo "文件: $f「标签」结束"'` → `文件: ��标签」结束`

修法是给紧跟 CJK 标点的变量加花括号。全仓扫描 `$var` 紧跟非 ASCII 字节的模式，命中 3 处（audit.sh 2 处、verify-release.sh 1 处 —— 后者因为检测项一直全通过，从没暴露过）。

### 🧹 其他

- `.gitignore` 补上 `.cline/`、`.clinerules/`、`.kilocode/` —— 与 `.trae/`、`.qoder/` 一致，避免在本仓库内自测安装器留下未跟踪文件。
- 官网 `site/build.mjs` 工具计数 20 → 22，三语言 FAQ 枚举补入 Cline、Kilo Code（v1.7.2 发了但站点没跟）。

### ✅ 验证

- `scripts/audit.sh`：**153 pass / 0 fail**（3 项 warn 为上游漂移，见 #19）
- `scripts/verify-release.sh`：**82 pass / 0 fail**
- SessionStart hook 冒烟：退出码 0，输出正确的 SessionStart JSON
- npm 包端到端：pack → 从 tarball 安装 → 真实跑安装器 → 卸载零残留

> ⚠️ audit 的上游漂移 warn 从 2 条变 3 条（新增 `using-git-worktrees`），且 `executing-plans` / `finishing-a-development-branch` 的上游 H 值有变化 —— 这是本次 `git fetch upstream` 把对比基准从旧快照更新到 **v6.2.0** 导致的，不是代码改动引起。

---

## v1.7.2 (2026-08-07)

### 🆕 新增 Cline 与 Kilo Code 适配（工具数 20 → 22，关 #112、#88）

两款都是 VS Code 扩展，加载的是 **rules 而非懒加载的 skills** —— rules 会并入**每一轮** system prompt。照搬「把 20 个 SKILL.md 复制进规则目录」会让每轮对话背着 **182 KB** 常驻开销（Cline 官方也提示规则超约 300 行后遵守度下降）。

改用仓库既有的 **Trae 模式**：规则目录只放一份索引（核心规则 + 20 个 skill 的名称/触发条件表，实测 **4.5 KB**，比全量塞入小 40 倍），skills 本体放各自 `skills/` 目录由 agent 按需读取。

- **Cline**：skills → `.cline/skills/`，索引 → `.clinerules/superpowers-zh.md`。不写 YAML frontmatter —— Cline 目前只支持 `paths` 一个条件字段，无 frontmatter 即始终生效。索引保持在 `.clinerules/` 根层单文件（子目录是否递归扫描官方未说明）。
- **Kilo Code**：skills → `.kilocode/skills/`，索引 → `.kilocode/rules/superpowers-zh.md`。**有意不走 v7 推荐的 `.kilo/rules/` + `kilo.jsonc`** —— 后者需把路径登记进用户的 `kilo.jsonc`（带注释的 JSONC，安装器安全合并容易改坏用户配置）。官方明确 `.kilocode/rules/` 向后兼容且零配置生效，故选它；docs 里写明了想迁到 v7 该改哪一行，以及万一没生效如何反馈。
- 两者均**无 `--global`**：Cline 全局 rules 路径随 OS 变（`~/Documents/Cline/Rules`，Linux/WSL 还有 `~/Cline/Rules` 回退），Kilo 全局同样要走 `kilo.jsonc` 登记 —— 不是通用复制机制能可靠命中的，`--global` 明确拒绝并指向 docs，绝不写无效路径。
- 路径依据：[docs.cline.bot](https://docs.cline.bot/customization/cline-rules)、[kilo.ai](https://kilo.ai/docs/customize/custom-rules)。

### 🔧 检测落空时给出针对性建议（关 #48）

装了 opencode / codex 但项目里没留下标记目录时，原先只报「未检测到任何已知 AI 编程工具」，用户无从判断下一步。

- 新增 PATH 探测：检测落空时扫 PATH 找已安装的 CLI，直接打印可复制的 `--tool` 命令。
- **只提示、不自动安装** —— 自动装错工具正是 #33 修掉的问题：PATH 上装了不代表这个项目要用它。
- `isOnPath()` 只查文件是否存在，**不 spawn 进程**（不在用户机器上执行探测命令）；Windows 下遍历 `PATHEXT`。
- `--global` 模式只建议支持全局的工具，不推荐装不了的。
- 健壮性已测：`PATH` 为空 / 含空段 / 未定义三种退化情形均优雅退出 1，无未捕获异常。

### 📄 文档

- **补充 plugin marketplace 安装方式（关 #39）**：`.claude-plugin/marketplace.json` 从 v1.7.x 起就存在且可用，但 README 从未写过怎么用。已实测 `plugin validate` / `marketplace add jnMetaCode/superpowers-zh`（GitHub 直连克隆）/ `plugin install` 全链路通过，安装缓存内含全部 20 个 SKILL.md。简繁 README 新增「方式二」，原手动安装与配置文件引用顺延为方式三 / 四。
- **修正 Copilot CLI 在 Windows 的工具面（关 #93）**：`copilot-tools.md` 原先只记 `bash` + `async:true` 一套，但 Windows 实测（Copilot CLI 1.0.69-1）注册的是 `powershell` + `detach`，没有 `bash`/`async` 家族。现拆成两张表并注明「两套不会同时出现」，补充两个坑：`.sh` 需显式走 Git Bash；`stop_powershell` 停不掉 `detach:true` 的进程，需按真实 Windows PID（非 MSYS PID）`Stop-Process`。
- 新增 `docs/README.cline.md`、`docs/README.kilocode.md`。
- 修正 installer 报错文案里失效的章节锚点（改为指向父级 `#快速开始`，不再依赖会变的章节编号）。
- 计数 20 → 22 同步：简繁 README、`package.json`、`CLAUDE.md`、3 份 plugin manifest。

### ✅ 验证

- `scripts/audit.sh`：**130 pass / 0 fail**（2 项 warn 为既有上游漂移，见 #19）
- 发版前深度验证（比 audit 严，断言实际落盘而非只看退出码）：**82 项全通过**
  - 22 款工具：装 → 断言 20 个 skill 落盘 → 二次装幂等 → 卸载后零残留；无 `skills/skills` 嵌套
  - 19 个检测标记逐一验证只触发预期工具，既有 20 款检测结果与改动前一致
  - `--global`：7 款成功、14 款明确拒绝且退出码 1；拒绝信息引用的 8 份 docs 均存在
  - bootstrap 索引断言：表行数 = 20、无空 description、Cline 无 frontmatter、路径指向正确
- **npm 包端到端**：`npm pack` → 从 tarball 装 → 用打包后的二进制真实跑 Cline 自动检测 → 20 skills + 索引生成 → 卸载零残留

---

## v1.7.0 (2026-07-13)

### 🆕 新增两款国产 IDE 工具支持（工具数 18 → 20）

- **CodeBuddy**（腾讯 AI IDE，关 #18 / #75）：`.codebuddy/skills/` + `CODEBUDDY.md` bootstrap，加载机制类似 Claude Code。仅项目级（用户级加载路径未证实，暂不做全局）。
- **华为云码道 CodeArts**（关 #20）：`.codeartsdoer/skills/`，**skills-only** 适配（其 bootstrap/指令文件约定未证实，靠 CodeArts 自身 skill 发现；docs 已说明，不自动触发可手动点名 skill）。
- 两者均**逐一核对配置来源**（owner 核实 / 用户实测），不臆造无效路径。工具计数在 README / 站点 / package / FAQ / audit 全量同步。

### 🌐 官网 + README 多语言（新增繁体）

- **官网**（#100）重构为 `LANGS` 语言列表驱动，新增**繁体中文站**（zh-Hant）：63 页（3 语言 × (首页 + 20 skill 详情)），语言切换器 / hreflang / sitemap 齐全；以后加语言只需加一项 + 一个翻译对象。
- **README**（#101）加语言切换栏，新增完整 `README.zh-Hant.md`（353 行对齐，台港自然术语）。
- 繁体均**手写**（台港术语：程式碼 / 專案 / 除錯 / 全域 / 檔案 等），不引入 OpenCC 依赖。日文按定位不纳入本仓库（应作独立 `superpowers-ja`）。

### 🧹 官网下架赞助商展示

- 移除官网与 README 的赞助商板块（含 5Cookie Code 展示卡 / logo / 样式 / 资源），仅保留一行赞助联系方式；官网切自定义域名 `sp.aiolaola.com`。

### 🌍 全局安装（关 #21）

新增 `npx superpowers-zh --global`，一次安装、所有项目共享，解决多项目用户需要逐个项目重复安装的痛点。

- **项目级（默认）不变**：装到 `process.cwd()` 下工具目录（如 `.claude/skills`），仅当前项目生效。
- **全局（`--global`）**：装到工具的**用户级目录**（如 `~/.claude/skills`），所有项目自动共享，更新只需重装一次。**项目级优先、全局兜底**，二者可共存。
- 支持全局的工具（**逐一核对各工具 docs 声明的真实加载路径，不臆造**）：**Claude Code / Codex CLI / Qoder / Windsurf / Qwen Code / OpenClaw / OpenCode**。其中 Codex 全局装到 `~/.agents/skills`（docs 确认 Codex 启动扫描该目录，而非 `~/.codex/skills`）；Claude Code 全局 bootstrap 写 `~/.claude/CLAUDE.md`。
- **Gemini CLI / Antigravity 有意不纳入通用 `--global`**：Gemini 全局走扩展目录 `~/.gemini/extensions/*/skills/` + manifest、Antigravity 全局 skills 路径未在 docs 证实，通用复制机制覆盖不了 —— `--global` 会报错并指向各自 `docs/README.*.md`，避免「装了不生效」。
- 其余工具（Cursor / Kiro / Trae / Aider / DeerFlow / VS Code / Hermes / Claw）规则是项目级或存于应用内设置，`--global` 明确报错并提示改用项目级，绝不写入无效路径。
- 卸载对称支持：`--global --uninstall` 从用户级目录移除 skills 并按哨兵精确清理全局 bootstrap。
- home 目录护栏调整：项目级仍拒绝在 `~` 下裸装（污染所有项目），并在提示里引导改用 `--global`；全局模式本就写用户级目录，跳过该护栏。

### 📊 文案刷新

- 上游 star 数 233k+ → 250k+（站点、README、package.json description 同步，实测上游已达 252k+）。

## v1.6.1 (2026-07-06)

对齐上游 **v6.1.0 / v6.1.1** 中与我们架构相关的部分。Gemini CLI 移除是上游这两个版本里改动面最大的一项，但它牵涉我们自己的营销文案（"18 款工具"）和安装器逻辑，评估后判定为独立决策，本版本**不包含**，留待单独讨论。

### 🔧 bootstrap 精简（`using-superpowers/SKILL.md`）

翻译并合并上游"更精简的每会话 bootstrap"重写：用简洁描述替换原有的 dot 流程图、去重"指令优先级"与"技能优先级"重复内容、去掉"技能类型"（刚性/灵活）分类章节。保留了我们 fork 特有的中国特色技能路由与多工具平台适配指引（Copilot CLI / Hermes Agent / Qoder 等，上游对应文档已删但我们仍维护）。

### 🐛 Codex 插件清单修复

- `.codex-plugin/plugin.json` 补 `"hooks": {}`：Codex 在清单缺少 `hooks` 字段时会自动 fallback 扫描 `hooks/hooks.json`（我们仓库里其实是 Claude Code 的 SessionStart hook），导致 Codex 用户安装时被错误注册一个不属于它的 hook 并弹出信任提示。声明空的内联 `hooks: {}` 可以阻止这个 fallback。
- `category` 由 `"Coding"` 改为 `"Developer Tools"`，对齐上游修正。
- `references/codex-tools.md` 修正过期的子 agent 结果工具名：`wait` → `wait_agent`（`wait` 现在专指 code-mode 的 `exec/wait`，不是子 agent 结果工具），并补充"implementer/reviewer 完成后应主动 close_agent"的提示。

### 未跟进项（有意为之）

- Codex 官方 marketplace 打包基础设施（`scripts/package-codex-plugin.sh`、`.agents/plugins/marketplace.json`、`tests/codex/`）——我们的分发方式是 `npx superpowers-zh`，不走这条上游官方安装通道。
- `antigravity-tools.md` / `claude-code-tools.md` 的裁剪——我们本来就没有这两个参考文件，无需处理。
- `references/pi-tools.md` 的精简（去掉 read/write/edit/bash 等自证性映射行）——验证时发现上游自己这个 v6.1.1 版本的裁剪会让他们自己的 `tests/pi/test-pi-extension.mjs` 断言（要求文件里出现 write/edit/bash 字样）测试失败，是上游未捕获的回归。为避免把这个 bug 一起同步进来，本版本保留了原有更完整的 pi-tools.md 内容。

## v1.6.0 (2026-06-20)

本版本对齐上游 **v6.0.0** 的实质性 skill / 基础设施变更，并新增两款 harness 支持。

### 🆕 新增 harness 支持

- **Kimi Code**（#59，关 #37）—— 插件清单模型 `.kimi-plugin/plugin.json`：指向现有 `skills/`、`sessionStart` 会话开始自动加载 `using-superpowers`、`skillInstructions` 提供 Kimi 工具映射。安装：Kimi 插件管理器 `/plugins install https://github.com/jnMetaCode/superpowers-zh`。文档见 `docs/README.kimi.md`。
- **Pi (oh-my-pi)**（#60，关 #44）—— 扩展模型：`package.json` 的 `pi` 字段 + `.pi/extensions/superpowers.ts`（注册生命周期钩子，注入 `using-superpowers` bootstrap + Pi 工具映射）。文档见 `docs/README.pi.md`。

### 🔒 brainstorm 可视化伴侣安全模型（#58，同步上游 v6.0.0）

伴侣服务器重写为**每会话密钥**鉴权（`?key=` 或会话 cookie 门禁所有端点）+ 安全响应头（`X-Frame-Options: DENY`、CSP `frame-ancestors 'none'`、`Cross-Origin-Resource-Policy: same-origin` 等），修复旧版无鉴权时本地浏览器可读取屏幕/注入事件的缺口。Token 用 `crypto.randomBytes(32)`、`timingSafeEqual` 比较、token 文件 `0o600`。

### 🔧 其它 v6 同步

- **using-git-worktrees / finishing-a-development-branch**（#57）—— 移除已废弃的全局 worktree 目录 `~/.config/superpowers/worktrees/`，对齐 v6.0.0。
- **hooks/session-start**（#58）—— 移除 legacy `~/.config/superpowers/skills` 迁移警告，输出补 `| cat`。
- **opencode 测试**（#72）—— 修复 `setup.sh` 拷贝不存在的 `lib/` 导致的测试飘红。

> SDD（subagent-driven-development）的 v6 重写为性能/成本优化，需专门 eval 验证，故本版本暂未纳入（详见 #19）。

## v1.5.0 (2026-05-21)

### 🆕 Qoder 适配（第 18 款工具，#26、#34）

Qoder 是阿里推出的 AI IDE，社区有多个用户提需求要求支持。本版本完成端到端适配：

- `bin/superpowers-zh.js` — `TARGETS` 加 Qoder（`dir: .qoder/skills`，`detect: .qoder`），`TOOL_ALIASES` 加 `qoder`
- `generateQoderBootstrap()` — 生成 `.qoder/rules/superpowers-zh.md`（`trigger: always_on` + `alwaysApply: true`），让"先头脑风暴 / 先 TDD / 先验证"等核心规则每个会话自动加载，**不依赖模型对 description 的隐式匹配**
- `skills/using-superpowers/references/qoder-tools.md` — 新增工具映射 reference（Qoder 大部分工具与 Claude Code 同名，只有 `EnterPlanMode/ExitPlanMode` → `EnterSpecMode/ExitSpecMode` 一个差异；附 Quest MCP 工具清单）
- `docs/README.qoder.md` — 完整安装/使用/卸载/故障排查指南
- `scripts/audit.sh` — `TOOLS` 数组加 qoder，CI 自动跑 18 款工具的 install/idempotent/uninstall 回归

**安装方法：**

```bash
cd /your/qoder-project
npx superpowers-zh --tool qoder     # 显式
# 或在有 .qoder/ 的项目里：
npx superpowers-zh                  # 自动检测
```

装完重启 Qoder，输入 `/` 即可看到 20 个 skill。

### ⚠️ Qoder Rules schema 来源说明

Qoder Rules 的 frontmatter schema（`trigger: always_on` / `model_decision` / `manual`）**官方文档（docs.qoder.com/zh/user-guide/rules）目前未公开**。本次实现的 schema 来自 GitHub 上 4 份真实社区样本（`python-office`、`termiClaude`、`QoderTest`、`TelegramFileServer`）的交叉验证。

如果 Qoder 后续改了 schema，生成的 rule 文件可能需要打开 Qoder Settings → Rules 重新选择"始终生效"类型。

### 🔧 文案对齐

- README、CLAUDE.md、package.json description：17 款 → 18 款
- 3 个 plugin manifest（`.claude-plugin/{plugin,marketplace}.json`、`.cursor-plugin/plugin.json`）description 同步

### 设计取舍：为什么用 always_on bootstrap 而非裸 skill

社区有用户（@Yanyz-ok）建议"按 AI 编程工具拆分/重写 skill"。我们刻意**不走这条路**：

1. **skill 是工作方法论，不是工具实现** —— "先写测试再写代码"这个约束在 Claude Code、Qoder、Hermes 上落地工具不同，但方法论不变。重写会让 17 份 SKILL.md 维护负担 ×17 但本质增量 0。
2. **平台内置工具 vs skill 是嵌套关系，不是替代关系** —— Qoder/Quest 的 `search_codebase`、`update_memory` 解决"怎么做"，skill 解决"什么时候做"，模型不会混淆。
3. **上游 superpowers 明确禁止"无 eval 证据的工具专属重写"** —— fork 守同样规矩。

工具映射写在 `references/qoder-tools.md` + `docs/README.qoder.md` 里就够了，不需要每个 skill 内部复制一遍。详见 issue #26 完整讨论。

### Refs

- closes #26（建议新增 qoder 的支持）
- closes #34（建议支持 qoder，#26 重复）

---

## v1.4.0 (2026-05-12)

本版本核心目标：**修复全量质量审计发现的所有上游漂移 P0 缺陷**。改动全部是"主站有的同步过来"性质，不引入主站没有的新功能。

### 🔴 上游同步：v5.0.6 brainstorm server 拆分（PR #30）

上游 v5.0.6（commit 9e3ed21）把 brainstorm server 的内容目录拆成 `CONTENT_DIR` + `STATE_DIR` peer 结构，但我们的 server 脚本还停在旧 `SCREEN_DIR` 单目录版本，导致 visual brainstorming 教程指向新路径但 server 用旧结构卡死。

- `skills/brainstorming/scripts/server.cjs` — 81 行 cherry-pick 同步
- `skills/brainstorming/scripts/start-server.sh` — 36 行同步
- `skills/brainstorming/scripts/stop-server.sh` — 29 行同步

**修复后：所有 visual brainstorming 用户路径解析正常。**

### 🔴 上游同步：v5.1.0 Code Review 整合（PR #30）

上游 v5.1.0 PR #1299 把 reviewer persona + checklist + dispatch 模板整合到单一 `code-reviewer.md` 实现 self-contained，并把 SKILL.md 里的 `superpowers:code-reviewer` 命名子代理引用改成 `general-purpose` Task + 模板路径形式。我们的版本停留在 v5.0.x 拆分式。

- `skills/requesting-code-review/SKILL.md` 改 4 处：3 处 `superpowers:code-reviewer` 引用清零；占位符从 5 个精简到 4 个对齐上游；"执行计划" 集成段从 "每批（3 个任务）后审查" 改为 "每个任务完成后或在自然 checkpoint 审查"（对齐上游 v5.1.0 subagent 节奏调整）
- `skills/requesting-code-review/code-reviewer.md` 完整重写为 v5.1.0 self-contained 版（H header 6/6 对齐上游）

**修复后：所有走 review 流程的用户得到的指令指向 `general-purpose` Task 而非已废弃的命名子代理。**

### 🔴 上游同步：v5.1.0 worktree 安全修复（PR #28）

上游 v5.1.0 [#991](https://github.com/obra/superpowers/issues/991) 修复了两类 worktree 安全问题：subagent 嵌套创建 + cleanup 误删 harness-managed workspace。

- `skills/using-git-worktrees/SKILL.md` 全面重构：新增 Step 0 检测现有隔离（GIT_DIR/GIT_COMMON + submodule 守卫 + 同意流程）；Step 1 重组为 1a Native Tools + 1b Git Worktree Fallback + 沙盒回退；删除旧"示例工作流"段（含 `/Users/jesse` 硬编码）
- `skills/finishing-a-development-branch/SKILL.md` 全面重构：新增 Step 2 检测环境（三态表）；旧 Step 2-5 重编号为 3-6；Step 4 新增分离 HEAD 3 选项变体；Step 5 Option 1 重写（MAIN_ROOT cwd safety + merge→verify→cleanup→delete 严格排序）；Step 6 清理范围限定在 `.worktrees/` / `worktrees/` / `~/.config/superpowers/worktrees/`，外部 harness-managed workspace 一律不动

**修复后：subagent 不再嵌套创建 worktree；清理不会误删 harness-managed workspace。**

### 🔴 平台兼容性修复：Windows Cursor hook 回归（PR #30）

`hooks/hooks-cursor.json` 的 command 之前被本地改成直接调 unix shell `./hooks/session-start`，丢失上游的 polyglot wrapper `./hooks/run-hook.cmd session-start`，Windows + Cursor 组合用户 hook 完全不触发。

- 1 行恢复上游 polyglot wrapper

**修复后：Windows Cursor 用户 hook 正常触发。**

### 🆕 防回归基建：CI 自动漂移检测（PR #31）

新增 `scripts/audit.sh` + `.github/workflows/audit.yml`，每次 PR 自动跑 4 类共 90+ 项检查：

1. 静态校验（JSON parse / SKILL.md frontmatter / symlink / hook 可执行性）
2. Installer 功能（17 款工具装/重装/卸载全跑）
3. 上游对齐（hooks 4 文件 + brainstorm scripts 3 文件 + 14 翻译 skill 结构层级 + code-reviewer.md self-contained 结构）
4. 交叉引用（README → docs/ 链接 + skill 间引用 + 装完后 .claude/skills/using-superpowers/SKILL.md 路径解析）

WARN（不阻塞）vs FAIL（阻塞）分级：本次"4 个 P0 漂"事件如果当时有这个 audit 在 CI 跑，PR 阶段就会被拦下。

**未来意义：维护者下次手抖把 `hooks-cursor.json` 改坏 / 上游同步漏一项，CI 立刻拦下。**

### 🔧 工具链小修

- `scripts/sync-plugin-version.js` 加入 `gemini-extension.json`（之前漏掉，导致 gemini extension manifest 卡在 1.1.6 老版本）
- `package.json` 的 `version` 钩子 git add 列表同步更新

### 安装路径方针澄清

本版本明确：**有官方 plugin marketplace 的工具（Claude Code / Codex CLI / OpenCode / VS Code）首选 marketplace 路径**，npx `superpowers-zh` 主要服务没有 marketplace 的工具（Cursor / Trae / Kiro / Gemini CLI / Hermes / Aider / Antigravity / Windsurf / Qwen / Claw / OpenClaw / DeerFlow 共 13 款）。fork 不再尝试给 marketplace 工具加 npx 路径的"完整支持"——它们走主站路径即可。

### 不在本版本范围

- `executing-plans/SKILL.md` 我们扩写了 105 行中文示例（主动选择，保留——是 fork 的中文优化，非漂移）
- `using-superpowers/SKILL.md` 的"中国特色技能路由"段（fork 增量，保留）
- 各 reviewer-prompt.md 翻译差异（结构对齐，纯翻译漂移，无行为 bug）
- open issues #18/#21/#26/#20（fork 增量需求，按方针延后）

### Refs

- PR #28（worktree 安全修复）
- PR #30（brainstorm scripts + code-reviewer 整合 + hooks-cursor + SKILL.md 引用）
- PR #31（audit script + CI workflow）
- issue #19 跟踪上游 v5.0.6 / v5.1.0 同步 → 关键项目全部覆盖

---

## v1.3.0 (2026-05-10)

### 跟上游对齐 (v5.1.0)

- **同步上游 v5.1.0 的目录变更**：上游主动删除了 `commands/`（3 个 deprecated stub）和 `agents/code-reviewer.md`（已上升进 `requesting-code-review` skill）。中文 fork 跟随删除以与上游意图对齐。详见上游 [#1188](https://github.com/obra/superpowers/pull/1188) 与 PR #1299。
- **`bin/superpowers-zh.js`** 移除安装时复制 `agents/` 到 `.claude/agents/` 的逻辑，**保留** uninstall 时的清理逻辑（用于已装用户清理残留 `code-reviewer.md`，防止双 source of truth）。
- **`.github/workflows/ci.yml`** 删除 "Validate agents" 验证段（`agents/` 已删，验证空目录无意义）。

### 补齐上游遗漏的根级文件

- **`CLAUDE.md`** —— 上游 contributor 指南（含 anti-slop-PR 规则）的中文翻译，末尾追加中文 fork 自己的 PR 流程说明。
- **`AGENTS.md`** —— 软链接 → `CLAUDE.md`（mode 120000，跟上游一致）。Codex CLI 等工具从 `AGENTS.md` 自动加载等同读取 CLAUDE.md。
  - **Known limitation**：`npm pack` 默认不跟随 symlink，因此 npm publish 出来的 tarball 不包含 AGENTS.md。这不影响实际使用：AGENTS.md 是 Codex CLI 在用户自己项目目录读的文件，不是从 `superpowers-zh` 安装包读的；通过 `git clone` 拿到仓库的贡献者会正确解析 symlink。
- **`RELEASE-NOTES.md`** —— 上游 release notes 原样保留（英文版，1180 行）。
- **`RELEASE-NOTES.zh.md`** —— 本文件，中文 fork 自身 release 记录。
- **`.codex-plugin/plugin.json`** —— Codex CLI plugin manifest（中文版本地化：name/description/displayName 改为中文版，URL 指向 `jnMetaCode/superpowers-zh`）。
- **`.version-bump.json`** —— 上游版本管理配置文件。
- **`scripts/bump-version.sh`** —— 上游版本同步脚本（含 `--check` 漂移检测、`--audit` 仓库审计）。中文版 npm version 钩子继续用 `scripts/sync-plugin-version.js`，bump-version.sh 作为补充工具引入。
- **`assets/app-icon.png`** + **`assets/superpowers-small.svg`** —— Codex marketplace 需要的图标资产。
- **4 个新增上游测试**：`tests/claude-code/test-requesting-code-review.sh`、`tests/claude-code/test-worktree-native-preference.sh`、`tests/opencode/test-bootstrap-caching.{mjs,sh}`。

### 主动修复上游 v5.1.0 的疏忽

- **`.cursor-plugin/plugin.json`** 删除 dangling 的 `"agents": "./agents/"` 和 `"commands": "./commands/"` 两行。上游 v5.1.0 删了目录但忘了同步清理 manifest（git blame 显示这两行从 2026-02-13 加入后从未更新）。中文 fork 主动修掉（向上游开 issue 是后续动作）。

### 修中文版自己的老漂移（PR #23）

- **`.claude-plugin/marketplace.json`** 的 `plugins[0].version` 卡在 `1.1.8` 的老漂移修复（追上其他 4 个 manifest，1.3.0 release 时统一升到 1.3.0）。原因是中文版简化版 `sync-plugin-version.js` 之前只 match 顶层 `"version":` 字段，跳过嵌套位置；导致 Claude Code marketplace 用户看到的 plugin 版本一直停在 1.1.8，跟 npm 包真实版本不同步。
- **`scripts/sync-plugin-version.js`** 增强为支持嵌套字段路径（`plugins.0.version`）。`TARGETS` 改为对象数组 `{ path, field }`，对齐上游 `.version-bump.json` 格式。仍使用 regex 替换而非 JSON re-stringify，保留原文件格式（缩进、行内/多行数组等不被破坏）。

### 不引入

- 上游 `scripts/sync-to-codex-plugin.sh`（推 OpenAI Codex marketplace 用，硬编码 `prime-radiant-inc/openai-codex-plugins`，中文版用不上）
- 配套测试 `tests/codex-plugin-sync/test-sync-to-codex-plugin.sh`

### 不动（中文版叠加层全部保留）

`bin/` + npx 流程、`docs/` 中文工具文档、4 个 `chinese-*` skill、`mcp-builder`、`workflow-runner`、`README.md` 主推 npx 路径、`.codex/INSTALL.md`、`.opencode/INSTALL.md`、`.gemini/`、`scripts/sync-plugin-version.js` —— 这些是符合"保持上游主流程不变 + 中文版叠加新增"原则的中文 fork 沉淀，全部保留。

---

## v1.2.1 (2026-05-05)

### 修复

- **`--uninstall` 数据丢失边界 case** —— 加哨兵注释 + 保守 fallback，杜绝在某些路径上误删用户数据。

---

## v1.2.0 (2026-05-05)

### 新增

- **`--uninstall` 子命令** —— `npx superpowers-zh --uninstall` 一条命令清理已安装的 skills（#17）。
- **HOME 目录守护** —— uninstall 时强校验工作目录非用户 HOME，杜绝误删全局文件。
- **计数显示修复** —— 安装后输出实际安装的 skill 数量（之前显示固定值）。

---

## v1.1.9 (2026-04-28)

### 修复

- **Claude Code bootstrap 修复** —— npx 安装到 CC 目标时自动补上 `CLAUDE.md` bootstrap，根治 skill 不触发问题（#14）。

### 变更

- **Node 引擎要求** 提升到 `>=20`（Node 14/16/18 均已 EOL）。
- **README 重排**：相关项目表挪到显眼位置；姊妹项目区块独立成"相关项目生态"章节，重点推广 orchestrator。
- **QQ 群** 标识改为 QQ 2群。

---

## v1.1.8 (2026-04-19)

### 新增

- **Claw Code 支持**（第 17 款工具，Rust 版 AI CLI）—— auto-detect `.claw/` 或 `CLAW.md`，支持 `--tool claw/claw-code/clawcode`。
- **CNB（腾讯云原生构建）平台适配** —— `chinese-git-workflow` skill 新增 CNB 章节，含 `.cnb.yml` CI 示例（#6）。

---

## v1.1.0 – v1.1.7 早期开发（2026-03 ~ 2026-04）

中文 fork 在这一时期完成了主要的多工具适配与中文化基建：

- 第 1 款 → 第 16 款工具陆续上线：Claude Code、Cursor、Codex CLI、Gemini CLI、Trae、VS Code (Copilot)、Antigravity、Hermes Agent、Copilot CLI、Windsurf、Aider、OpenCode、Qwen Code（通义灵码）、Kiro、OpenClaw、DeerFlow 2.0
- 4 个中国原创 skill 沉淀：`chinese-code-review`、`chinese-commit-conventions`、`chinese-documentation`、`chinese-git-workflow`
- `mcp-builder`、`workflow-runner` 两个补充 skill
- npx 一条命令自动检测项目工具并安装
- 跨平台兼容性修复：Windows `cpSync` 问题、低版本 Node 兼容、Antigravity/Aider/Gemini CLI 自动生成 bootstrap

---

## v1.0.0 (2026-03-09)

- 中文 fork 初始版本，基于上游 `obra/superpowers` v5.0.0 翻译。
- 完整翻译 14 个上游 skill。
- 首批支持 Claude Code 一种工具。
