# Superpowers 中文版 — Aider 安装指南

在 [Aider](https://aider.chat) 中使用 superpowers-zh 的完整指南。

## ⚠️ 先看这一条：装完还需要一步才生效

**Aider 不会自动加载 `CONVENTIONS.md`。** [官方文档](https://aider.chat/docs/usage/conventions.html)明确要求显式加载 —— 原文推荐 `aider --read CONVENTIONS.md`，或在配置里写 `read:` 项。

所以装完之后，二选一：

```bash
# 每次启动时带上
aider --read CONVENTIONS.md
```

```yaml
# 或写进 .aider.conf.yml，一劳永逸
read: CONVENTIONS.md
```

**我们不替你改 `.aider.conf.yml`** —— 那是你的配置文件。安装器会在装完时把上面两条打印出来提醒你。

> 📌 v1.7.9 及更早版本的文档写着「Aider 会自动读取 CONVENTIONS.md，无需额外配置」—— **那是错的**，会让你以为装好了其实没生效。这是我们的错误，v1.7.10 起更正。

## 安装

```bash
cd /your/project
npx superpowers-zh --tool aider
```

会做两件事：

1. 把 21 个 skill 复制到 `.aider/skills/`
2. 生成（或追加）`CONVENTIONS.md`，里面是 skill 索引和触发规则，指向 `.aider/skills/<name>/SKILL.md`

### 关于自动检测

不带 `--tool` 时安装器会扫描项目里的工具标记。**Aider 不创建 `.aider/` 目录** —— 它在项目根留下的是 `.aider.` 前缀的产物，所以我们认这几个：

- `.aider.conf.yml`
- `.aider.chat.history.md`
- `.aider.tags.cache.v3/`

> 📌 v1.7.9 及更早只认 `.aider/` 这个目录，而 Aider 从不创建它 —— 也就是说**真实的 Aider 项目从来没被自动检测到过**，必须手动 `--tool aider`。同样在 v1.7.10 修正。

## 手动安装

```bash
git clone https://github.com/jnMetaCode/superpowers-zh.git
cp -r superpowers-zh/skills /your/project/.aider/skills
```

> 手动复制不会生成 `CONVENTIONS.md`，你需要自己写一份索引并按上面的方式加载它。建议优先用 `npx superpowers-zh --tool aider`。

## 只加载部分 skill

`CONVENTIONS.md` 是一份索引（约 4 KB），由 Aider 常驻上下文，正文按需读取。如果你只想常驻少数几个 skill 的全文，也可以直接点名：

```yaml
read:
  - .aider/skills/brainstorming/SKILL.md
  - .aider/skills/test-driven-development/SKILL.md
  - .aider/skills/systematic-debugging/SKILL.md
```

注意每个 SKILL.md 都会完整进入上下文，装 20 个的全文开销很大 —— 这正是我们默认走索引式 `CONVENTIONS.md` 的原因。

## 故障排查

### Skills 未生效

按顺序查：

1. **`CONVENTIONS.md` 被加载了吗？** 这是最常见的原因。Aider 启动后用 `/read` 看已加载的只读文件里有没有它。没有的话，回到本文开头那一步。
2. `.aider/skills/` 目录是否存在且包含 skill 子目录。
3. 如果用 `.aider.conf.yml` 的 `read:` 配置：确认 Aider 读的是你以为的那份配置。Aider 会依次找 home 目录、git 仓库根、当前目录下的 `.aider.conf.yml`。

### 装完没看到激活提示

说明你用的是旧版本。升级：

```bash
npx superpowers-zh@latest --tool aider
```

## 卸载

```bash
npx superpowers-zh --uninstall
```

会删除 `.aider/skills/` 下装过的 skill，并从 `CONVENTIONS.md` 中精确切除 superpowers-zh 段（保留你自己写的内容）。`.aider.conf.yml` 我们没动过，所以也不会去改 —— 如果你加过 `read: CONVENTIONS.md`，需要自己删。

## 获取帮助

- 提交 Issue：https://github.com/jnMetaCode/superpowers-zh/issues
- 项目主页：https://github.com/jnMetaCode/superpowers-zh
- Aider 文档：https://aider.chat/docs/
- Aider conventions 文档：https://aider.chat/docs/usage/conventions.html
