# 原生插件渠道与发布验收

在源码仓库运行 `npm run test:offline` 可统一复跑本地回归。开发环境需 Node ≥22.6、npm、jq、pytest、Python 3、Git 和 tar；这是开发测试要求，包的运行时仍支持 Node 20。入口会在依赖缺失时退出；平台用例自身输出的 SKIP 仍是未验证，不代表通过。它不包含服务器网络、原生 CLI 会话、Windows 和需已提交快照的 Codex archive 测试；后者另由 CI 执行。

这些入口已在本地接入 manifest、版本同步和打包；它们与 `npx` 复制安装是不同渠道。本机尚未完成四个平台的真实登录会话验收，以下命令基于上游 v7.0.2 的安装说明适配仓库名，不代表安装已经实测成功。

```bash
# Hermes
hermes plugins install jnMetaCode/superpowers-zh --enable
# Devin
devin plugins install jnMetaCode/superpowers-zh
# Antigravity
agy plugin install https://github.com/jnMetaCode/superpowers-zh
# Muse：在本仓库根目录
muse plugins install ./
muse plugins approve superpowers-zh
```

注意：远端仓库安装只会取得已经提交并推送的版本，不包含当前未提交修改。验收当前候选版本时须使用各工具支持的本地路径安装，或在人工审核后提交并推送候选分支，再安装该分支。

每个平台都要在干净项目中新开会话，发送 `Let's make a react todo list`，保留从启动到首次实现动作的完整记录。通过标准是在写代码前自动加载 `using-superpowers` 并进入 brainstorming；只看到文件或手动调用技能不算通过。记录工具版本、模型、安装来源和候选提交。Hermes 还需确认子代理不重复进入控制者的设计流程；Muse 需在 Linux/dash 环境确认 hook 由 Bash 执行。

## Codex 专用发布工具

`scripts/package-codex-plugin.sh` 从**已提交的 Git ref**构建无外层目录的 ZIP 或 tar.gz，需要明确提供 prior package 的 `agents/openai.yaml` 元数据来源。测试中的元数据是 fixture，不能当成真实发布元数据。默认拒绝脏工作区；`--allow-dirty` 也仍然打包指定 ref，不包含未提交改动。

```bash
bash scripts/package-codex-plugin.sh --help
bash scripts/package-codex-plugin.sh --ref <已审核提交> --metadata-source <已有插件包或目录> --output /tmp/superpowers-zh.zip
```

`scripts/sync-to-codex-plugin.sh` 保留上游的临时预览、linked worktree 和目标元数据保护，目标仓库由调用者显式配置，不默认使用上游发布仓库。先 dry-run 并 review diff：

```bash
SUPERPOWERS_CODEX_TARGET_REPO=<owner/repo> bash scripts/sync-to-codex-plugin.sh --dry-run --local <目标仓库克隆>
```

默认目标目录为 `plugins/superpowers-zh`，可通过 `SUPERPOWERS_CODEX_DEST_REL` 调整为其他 `plugins/NAME`；绝对路径及跨目录路径会被拒绝。去掉 dry-run 会进入提交、推送和创建 PR 流程，须先取得人类对完整 diff 的批准。脚本本轮只做了隔离测试，没有执行真实发布。
