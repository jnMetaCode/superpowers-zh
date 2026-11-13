# CodeBuddy 使用指南

CodeBuddy IDE 与 CodeBuddy Code（CLI）需要分别验证。两者的官方技能文档都说明项目技能使用 `.codebuddy/skills/`，本安装器同时生成项目根 `CODEBUDDY.md` 引导。文件安装成功不等同于实际会话已加载或自动触发。

- [IDE 技能文档](https://www.codebuddy.cn/docs/ide/Features/Skills)
- [CLI 技能文档](https://www.codebuddy.cn/docs/cli/skills)

下文的用户级目录、全局记忆文件及优先级依据 CLI 文档；不据此承诺 IDE 的全局记忆、技能菜单或子代理行为相同。

## 一键安装（推荐）

在你的项目根目录运行：

```bash
npx superpowers-zh
```

自动检测到 `.codebuddy/` 或 `CODEBUDDY.md` 时会安装到 CodeBuddy。检测不到时显式指定：

```bash
npx superpowers-zh --tool codebuddy
```

安装内容：

- `.codebuddy/skills/` — 21 个 skill（每个含 `SKILL.md`）
- `CODEBUDDY.md` — bootstrap 引导（已存在则在哨兵注释间追加，不覆盖你的内容）

## CodeBuddy Code（CLI）全局安装

```bash
npx superpowers-zh --global --tool codebuddy
```

装到 `~/.codebuddy/skills/`，bootstrap 写 `~/.codebuddy/CODEBUDDY.md`，供 CLI 用户级加载。IDE 用户优先使用上面的项目级安装，并在实际 IDE 会话确认发现结果。

> 📌 v1.7.10 及更早写着「用户级路径尚未验证」且没有 `--global`。现已核实：[官方目录结构文档](https://www.codebuddy.cn/docs/cli/codebuddy-dir)确认全局与项目级同构。v1.7.11 起支持。

## Skill 加载优先级

| 位置 | 范围 |
|------|------|
| `.codebuddy/skills/` | 项目级，仅当前项目 |
| `~/.codebuddy/skills/` | 用户级，所有项目共享 |

同名时**项目级 > 用户级 > 插件级**（官方文档口径）。

记忆文件同理：全局在 `~/.codebuddy/CODEBUDDY.md`，项目级放项目根 `CODEBUDDY.md`（官方称项目根与 `.codebuddy/CODEBUDDY.md` 两处等价，我们用项目根）。

## 使用

1. 安装完成后**重启 CodeBuddy**。
2. 先确认当前会话能发现技能；CLI 可尝试 `/brainstorming`，IDE 按自身技能界面或调用方式验证。再用一个新的功能请求检查是否在编码前进入需求讨论；手动调用成功与自动触发成功应分别记录。
3. 当任务涉及需求分析、TDD、系统化调试、代码审查等场景时，对应 skill 会被引用。

## 卸载

```bash
npx superpowers-zh --uninstall
```

移除 `.codebuddy/skills/` 下的 skills，并按哨兵注释精确切除 `CODEBUDDY.md` 里的 superpowers-zh 段落（不误删你自己的内容）。

## 故障排查

- **skills 没生效**：确认已重启 CodeBuddy；确认 `CODEBUDDY.md` 里存在 `# Superpowers-ZH 中文增强版` 段落。
- **自动检测不到**：用 `npx superpowers-zh --tool codebuddy` 显式指定。

## 反馈

- 提交 Issue：https://github.com/jnMetaCode/superpowers-zh/issues
- 项目主页：https://github.com/jnMetaCode/superpowers-zh

## 报告异常时的最小材料

提供 IDE 或 CLI 的准确名称、版本、操作系统、安装命令、项目级或全局范围，以及一个实际输入和完整异常输出。若能手动调用却不能自动触发，也请说明；若报子代理类型或工具不存在，保留错误原文。

本仓的隔离安装检查验证了文件复制、重复安装、引导路径与安全卸载；尚不能代替具体 CodeBuddy 版本的干净会话验收。不要仅凭没有自动触发就重写技能提示词。

## IDE 的常驻引导需要单独核验

[IDE 官方规则文档](https://www.codebuddy.cn/docs/ide/User-guide/Rules)说明，项目规则放在 `.codebuddy/rules/<规则目录>/RULE.mdc`，规则类型可设为“总是”，修改后需新建会话才能生效。本安装器当前生成 `CODEBUDDY.md`，没有生成这类 IDE 规则文件；不能据此宣称 IDE 已加载常驻引导，也不能仅凭文档差异确认某次故障原因。

若 IDE 中行为异常，按顺序记录：

1. 在设置的 Skills 管理页确认当前项目能看到 `using-superpowers` 和 `brainstorming`。若看不到，核对打开的工作区根目录与安装路径。
2. 尝试通过 IDE 的技能调用方式手动运行 brainstorming。记录是否成功，以及完整错误；手动成功不代表自动触发成功。
3. 新建会话输入 `Let's make a react todo list`，记录编码前是否进入需求讨论。若手动成功而自动失败，检查规则面板中是否实际加载了框架引导。

请提供上述观察及 IDE 版本后，再决定是否补充 IDE 专用规则适配；不要未经会话验证就把 CLI 记忆文件与 IDE 规则视为等价，也不要覆盖已有项目规则。
