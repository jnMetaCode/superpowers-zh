# 版本号与安装内容核对

## skill 的版本号代表什么？

本仓库按整包发行，skill 的 frontmatter `version` 用于标记它所属的 **superpowers-zh 发行版**，不单独维护每个技能的语义版本。

本次修复先将 21 个技能与修复时的包版本 `1.8.0` 对齐，并接入发布时自动同步。之后每次发版，字段都跟随新的包版本，CI 会拒绝不一致的版本。**工作区字段对齐不表示旧版包被重发，也不会让用户已有安装自动更新。** 此修复在哪个发行版可用，以 [中文更新日志](../RELEASE-NOTES.zh.md) 为准；列在“未发布”中的内容尚不能通过已发布的包获取。

旧安装里的 `version: "1.0.0"` 是历史遗留：此前的脚本只维护插件 / 扩展 manifest，没有更新技能字段。例如已发布的 v1.8.0 重写了 brainstorming，但该字段仍为 `1.0.0`。因此不能仅凭旧字段认定正文没更新。

新版字段能说明文件标记的发行版，但手动修改、混合复制不同版本或未发布的工作区修改，都可能让它与实际内容不完全对应。需要核实准确内容时，还应检查安装来源、实际文件和 Git 状态。

## 怎么确认自己使用的版本？

| 安装方式 | 核对方法 | 范围 |
|---|---|---|
| Claude Code 插件市场 | `claude plugin list` | 查看已安装插件的版本；更新后重启会话 |
| 克隆仓库 | 在克隆目录运行 `node -p 'JSON.parse(require("fs").readFileSync("package.json", "utf8")).version'` | 读取这份克隆的发行版号；本地修改另用 `git status` 核查 |
| npx 复制安装 | 查看安装时终端输出的 `superpowers-zh v…`，并保留安装命令与输出 | 含本次修复的发行版可参考各 skill 的 frontmatter；旧安装的 1.0.0 无法反查发行版。安装器仍未记录独立的项目安装清单 |

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

## 维护者发版检查

`npm version <新版本>` 的钩子会同步插件 manifest 和所有 `skills/*/SKILL.md` 的版本，并将这些文件一起纳入版本提交。它动态发现技能，新加的技能也会纳入同步。`scripts/bump-version.sh` 的版本更新和检查也会调用同一同步器；该旧脚本仍需 jq。

```bash
node scripts/sync-plugin-version.js          # 对齐到当前 package.json
node scripts/sync-plugin-version.js --check  # 只检查；不一致时非零退出，绝不改文件
node scripts/sync-plugin-version.js --validate # 发版前只检查格式，允许待同步的版本差异
node --test tests/versioning/test-release-versions.mjs
```

同步只修改 frontmatter 的顶层版本字段，正文和示例中的版本字符串保持不变。技能必须有且只有一个可解析的顶层版本字段；发现格式错误时，在写入任何目标之前退出。
