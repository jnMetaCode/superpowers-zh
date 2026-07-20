# Superpowers 中文版 — Qoder / Qoder CN 安装指南

在 [Qoder](https://qoder.com)（阿里推出的 AI IDE）及其中文版 **Qoder CN** 中使用 superpowers-zh 的完整指南。

## 自动安装

```bash
cd /your/project
npx superpowers-zh
```

安装脚本会自动检测 `.qoder/` 或 `.qoder-cn/` 目录并：

1. 把 20 个 skills 复制到对应的 `skills/<name>/SKILL.md`
2. 生成一个**始终生效**的 bootstrap rule `rules/superpowers-zh.md`（`trigger: always_on`），让 Qoder 每个会话都加载核心规则与 skill 索引

如果项目目录里还没有对应目录，可以显式指定：

```bash
npx superpowers-zh --tool qoder         # Qoder
npx superpowers-zh --tool qoder-cn      # Qoder CN
```

| 变体 | Skills 路径 | Rules 路径 |
|------|------------|----------|
| Qoder | `.qoder/skills/` | `.qoder/rules/superpowers-zh.md` |
| Qoder CN | `.qoder-cn/skills/` | `.qoder-cn/rules/superpowers-zh.md` |

## 手动安装

```bash
git clone https://github.com/jnMetaCode/superpowers-zh.git
cp -r superpowers-zh/skills /your/project/.qoder/skills      # Qoder
cp -r superpowers-zh/skills /your/project/.qoder-cn/skills   # Qoder CN
```

或全局安装（对所有项目生效）：

```bash
cp -r superpowers-zh/skills ~/.qoder/skills      # Qoder
cp -r superpowers-zh/skills ~/.qoder-cn/skills   # Qoder CN
```

## Skill 加载优先级

| 位置 | 优先级 | 说明 |
|------|--------|------|
| `.qoder/skills/` 或 `.qoder-cn/skills/` | 最高 | 项目级，仅当前项目 |
| `~/.qoder/skills/` 或 `~/.qoder-cn/skills/` | 中 | 用户级，所有项目共享 |

> 同名 skill 项目级覆盖用户级。Qoder 与 Qoder CN 的 skills 互相独立，互不影响。

## 使用

1. 安装完成后**重启 Qoder / Qoder CN**
2. 在对话框输入 `/` 即可看到已加载的 skills 列表
3. bootstrap rule 会被识别为“始终生效”，每个会话自动加载核心规则
4. Qoder 还会根据 skill 的 `description` 自动判断何时调用；也可输入 `/<skill-name>` 手动触发

> Qoder Rules schema（`trigger: always_on` / `model_decision` / `manual`）来自社区实际样本，官方文档（docs.qoder.com/zh/user-guide/rules）目前只公开 UI 配置流程未公开 frontmatter schema。如果 Qoder 后续改了 schema，rule 文件可能需要打开 Qoder Settings → Rules 重新选择类型。

## 工具映射说明

skills 中引用的 Claude Code 工具名称（`Read` / `Write` / `Edit` / `Bash` / `Grep` / `Glob` / `WebFetch` / `WebSearch` 等）在 Qoder 中**同名对应**，无需额外映射。

少数差异：

| Claude Code | Qoder 等价 |
|-------------|-----------|
| `EnterPlanMode` / `ExitPlanMode` | `EnterSpecMode` / `ExitSpecMode` |
| `Task`（子 agent） | `Task`（支持 `explore-agent` / `plan-agent` / `qoder-guide` 等 agent 类型）|
| `TodoWrite` | `TodoWrite` |

> Skill 是工作方法论，不是工具实现 —— 即使工具名略有差异，模型也会自动选用最近似的 Qoder 工具完成。无需为 Qoder 重写 skill。

## 故障排查

### 装好了但 `/` 看不到 skills

1. 确认 `.qoder/skills/<skill-name>/SKILL.md` 文件存在
2. 确认 `SKILL.md` 文件的 frontmatter 完整（`name` + `description`，`description` 不超过 1024 字符）
3. **必须重启 Qoder** —— 新装的 skill 不会热加载

### skill 不被自动调用

Qoder 按 description 文本匹配用户意图来决定何时调用 skill。如果某个 skill 自动调用不可靠，可在对话中显式输入 `/<skill-name>` 手动触发。

中国原创的 4 个 `chinese-*` skill 本身就是**手动触发**设计（避免污染上游 skill 的自动调度），需要显式 `/chinese-code-review` / `/chinese-commit-conventions` 等。

## 卸载

```bash
cd /your/project
npx superpowers-zh --uninstall
```

会移除 `.qoder/skills/` 和 `.qoder-cn/skills/` 目录下所有 superpowers-zh 装的 skill 文件夹（保留你自己写的），同时删除对应的 bootstrap rule 文件。

## 获取帮助

- 提交 Issue：https://github.com/jnMetaCode/superpowers-zh/issues
- 项目主页：https://github.com/jnMetaCode/superpowers-zh
- Qoder 官方文档：https://docs.qoder.com/zh/extensions/skills
