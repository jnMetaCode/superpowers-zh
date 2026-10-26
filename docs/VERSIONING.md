# 版本号与安装内容核对

## 为什么 skill 里还是 `version: "1.0.0"`？

当前各 `skills/*/SKILL.md` 的 frontmatter 仍使用 `1.0.0`。这个字段没有随包发布自动更新，**不能用它判断安装的是哪个 superpowers-zh 发行版**，也不能据此判断正文没有更新。

例如 v1.8.0 已重写 `brainstorming`，新增 `builder-check-prompt.md` 并删除 `spec-document-reviewer-prompt.md`，但该 skill 的 frontmatter 版本仍为 `1.0.0`。对应变更见 [v1.8.0 更新日志](../RELEASE-NOTES.zh.md)。

目前发版脚本维护的是 `package.json` 和各工具的插件 / 扩展 manifest 版本。技能元数据的版本管理尚未与这些发行版号关联；在建立明确规则之前，不应把 `1.0.0` 当成安装版本。

## 怎么确认自己使用的版本？

| 安装方式 | 核对方法 | 范围 |
|---|---|---|
| Claude Code 插件市场 | `claude plugin list` | 查看已安装插件的版本；更新后重启会话 |
| 克隆仓库 | 在克隆目录运行 `node -p 'JSON.parse(require("fs").readFileSync("package.json", "utf8")).version'` | 读取这份克隆的发行版号；本地修改另用 `git status` 核查 |
| npx 复制安装 | 查看安装时终端输出的 `superpowers-zh v…`，并保留安装命令与输出 | 安装器目前没有在目标项目单独记录可查询的安装版本；无法仅凭 skill 的版本字段反查 |

`npx superpowers-zh --version` 显示的是**本次 npx 运行的安装器版本**，不是某个项目此前复制进去的技能版本。即使该命令显示新版本，项目内的旧文件也不会因此自动更新。

若需要明确安装某个发行版，可在项目目录执行：

```bash
npx superpowers-zh@1.8.0 --tool <工具别名>
```

全局安装则在原安装命令中保留 `--global`。插件市场安装的用户应沿用插件市场的更新方式，避免再复制一份重复技能。具体步骤见 [README 安装说明](../README.md#快速开始)及各工具指南。

## 反馈“版本不对”时提供什么？

- 工具名称和版本，以及安装方式（项目级 / 全局 / 插件市场）。
- 安装或更新时执行的完整命令、输出中的版本号。
- 实际加载的 skill 文件路径，以及哪些正文仍是旧内容；只提供 `version: "1.0.0"` 不足以判断。
- 如为插件安装，附插件列表的名称、版本和状态。不要附访问令牌或其他凭据。
