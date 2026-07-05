# 视觉伴侣指南

基于浏览器的视觉头脑风暴伴侣，用于展示原型、图表和选项。

## 何时使用

逐问题决定，而非按会话决定。判断标准：**用户看到它是否比读到它更容易理解？**

**使用浏览器** 当内容本身是视觉的：

- **UI 原型** — 线框图、布局、导航结构、组件设计
- **架构图** — 系统组件、数据流、关系图
- **并排视觉对比** — 对比两种布局、两种配色方案、两种设计方向
- **设计细节打磨** — 当问题涉及外观感受、间距、视觉层次
- **空间关系** — 状态机、流程图、实体关系图

**使用终端** 当内容是文字或表格的：

- **需求和范围问题** — "X 是什么意思？"、"哪些功能在范围内？"
- **概念性 A/B/C 选择** — 在用文字描述的方案之间做选择
- **权衡列表** — 优缺点、对比表
- **技术决策** — API 设计、数据建模、架构方案选择
- **澄清问题** — 任何回答是文字而非视觉偏好的问题

关于 UI 主题的问题不一定是视觉问题。"你想要什么样的向导？"是概念性的——使用终端。"这些向导布局中哪个感觉对？"是视觉性的——使用浏览器。

## 工作原理

服务器监视一个目录中的 HTML 文件，将最新的文件提供给浏览器。你写入 HTML 内容，用户在浏览器中看到它，并可以点击选择选项。选择结果被记录到一个 `.events` 文件中，你在下一轮会话中读取它。

**内容片段 vs 完整文档：** 如果你的 HTML 文件以 `<!DOCTYPE` 或 `<html` 开头，服务器会原样提供（仅注入辅助脚本）。否则，服务器会自动将你的内容包裹在框架模板中——添加头部、CSS 主题、选择指示器和所有交互基础设施。**默认写内容片段即可。** 只有当你需要完全控制页面时才写完整文档。

## 启动会话

```bash
# 启动服务器并持久化（原型保存到项目中）
scripts/start-server.sh --project-dir /path/to/project

# 返回：{"type":"server-started","port":52341,"url":"http://localhost:52341",
#           "screen_dir":"/path/to/project/.superpowers/brainstorm/12345-1706000000"}
```

保存响应中的 `screen_dir`。告诉用户打开该 URL。

**查找连接信息：** 服务器将其启动 JSON 写入 `$SCREEN_DIR/.server-info`。如果你在后台启动了服务器且没有捕获 stdout，读取该文件以获取 URL 和端口。使用 `--project-dir` 时，检查 `<project>/.superpowers/brainstorm/` 获取会话目录。

**注意：** 传入项目根目录作为 `--project-dir`，这样原型会持久化在 `.superpowers/brainstorm/` 中，不会因服务器重启而丢失。不传的话，文件会保存到 `/tmp` 并在清理时被删除。提醒用户将 `.superpowers/` 添加到 `.gitignore`（如果尚未添加）。

**按平台启动服务器：**

**Claude Code (macOS / Linux)：**
```bash
# 默认模式即可——脚本会自动将服务器放到后台
scripts/start-server.sh --project-dir /path/to/project
```

**Claude Code (Windows)：**
```bash
# Windows 会自动检测并使用前台模式，这会阻塞工具调用。
# 在 Bash 工具调用上设置 run_in_background: true，
# 让服务器在会话轮次之间存活。
scripts/start-server.sh --project-dir /path/to/project
```
通过 Bash 工具调用时，设置 `run_in_background: true`。然后在下一轮读取 `$SCREEN_DIR/.server-info` 获取 URL 和端口。

**Codex：**
```bash
# Codex 会回收后台进程。脚本会自动检测 CODEX_CI 并
# 切换到前台模式。正常运行即可——不需要额外标志。
scripts/start-server.sh --project-dir /path/to/project
```

**Copilot CLI：**
```bash
# 用后台 shell 会话启动，让服务器跨会话轮次常驻、并立即交回控制权：
# 有 bash 工具就设 async: true，用 powershell 工具就设 detach: true。
# 脚本是 .sh，请经 bash 运行（PowerShell 环境下走 Git Bash）。
# 结束后运行 scripts/stop-server.sh 收尾。
scripts/start-server.sh --project-dir /path/to/project --foreground
```

**Gemini CLI：**
```bash
# 使用 --foreground 并在 shell 工具调用上设置 is_background: true，
# 让进程在轮次之间存活
scripts/start-server.sh --project-dir /path/to/project --foreground
```

**其他环境：** 服务器必须在会话轮次之间持续在后台运行。如果你的环境会回收分离的进程，使用 `--foreground` 并通过平台的后台执行机制启动命令。

如果浏览器无法访问该 URL（在远程/容器化环境中常见），绑定一个非回环主机：

```bash
scripts/start-server.sh \
  --project-dir /path/to/project \
  --host 0.0.0.0 \
  --url-host localhost
```

使用 `--url-host` 控制返回的 URL JSON 中显示的主机名。

## 工作循环

1. **检查服务器存活**，然后**将 HTML 写入** `screen_dir` 中的新文件：
   - 每次写入前，检查 `$SCREEN_DIR/.server-info` 是否存在。如果不存在（或 `.server-stopped` 存在），服务器已关闭——在继续之前用 `start-server.sh` 重启。服务器在 30 分钟无活动后会自动退出。
   - 使用语义化文件名：`platform.html`、`visual-style.html`、`layout.html`
   - **绝不复用文件名** — 每个屏幕用一个新文件
   - 使用 Write 工具 — **绝不使用 cat/heredoc**（会在终端产生噪音）
   - 服务器自动提供最新的文件

2. **告诉用户预期内容并结束你的回合：**
   - 每一步都提醒他们 URL（不仅仅是第一次）
   - 简要文字说明屏幕上的内容（例如"展示了 3 个首页布局选项"）
   - 请他们在终端中回复："看一下，告诉我你的想法。如果你愿意，可以点击选择一个选项。"

3. **在你的下一轮** — 用户在终端回复后：
   - 如果存在 `$SCREEN_DIR/.events`，读取它——其中包含用户的浏览器交互（点击、选择），格式为 JSON 行
   - 将终端文字和事件合并以获得完整信息
   - 终端消息是主要反馈；`.events` 提供结构化的交互数据

4. **迭代或推进** — 如果反馈要求修改当前屏幕，写入新文件（例如 `layout-v2.html`）。只有当前步骤验证通过后才进入下一个问题。

5. **回到终端时卸载** — 当下一步不需要浏览器时（例如澄清问题、权衡讨论），推送一个等待屏幕以清除过时内容：

   ```html
   <!-- 文件名：waiting.html（或 waiting-2.html 等）-->
   <div style="display:flex;align-items:center;justify-content:center;min-height:60vh">
     <p class="subtitle">在终端中继续...</p>
   </div>
   ```

   这样可以防止用户盯着一个已经解决的选择，而对话已经继续了。当下一个视觉问题出现时，照常推送新的内容文件。

6. 重复直到完成。

## 编写内容片段

只写放在页面内部的内容。服务器会自动用框架模板包裹它（头部、主题 CSS、选择指示器和所有交互基础设施）。

**最简示例：**

```html
<h2>哪种布局更好？</h2>
<p class="subtitle">考虑可读性和视觉层次</p>

<div class="options">
  <div class="option" data-choice="a" onclick="toggleSelect(this)">
    <div class="letter">A</div>
    <div class="content">
      <h3>单栏</h3>
      <p>简洁、专注的阅读体验</p>
    </div>
  </div>
  <div class="option" data-choice="b" onclick="toggleSelect(this)">
    <div class="letter">B</div>
    <div class="content">
      <h3>双栏</h3>
      <p>侧边栏导航加主内容区</p>
    </div>
  </div>
</div>
```

就这些。不需要 `<html>`，不需要 CSS，不需要 `<script>` 标签。服务器会提供这一切。

## 可用的 CSS 类

框架模板为你的内容提供以下 CSS 类：

### 选项（A/B/C 选择）

```html
<div class="options">
  <div class="option" data-choice="a" onclick="toggleSelect(this)">
    <div class="letter">A</div>
    <div class="content">
      <h3>标题</h3>
      <p>描述</p>
    </div>
  </div>
</div>
```

**多选：** 在容器上添加 `data-multiselect` 让用户选择多个选项。每次点击切换选中状态。指示栏显示数量。

```html
<div class="options" data-multiselect>
  <!-- 相同的选项标记——用户可以选择/取消选择多个 -->
</div>
```

### 卡片（视觉设计）

```html
<div class="cards">
  <div class="card" data-choice="design1" onclick="toggleSelect(this)">
    <div class="card-image"><!-- 原型内容 --></div>
    <div class="card-body">
      <h3>名称</h3>
      <p>描述</p>
    </div>
  </div>
</div>
```

### 原型容器

```html
<div class="mockup">
  <div class="mockup-header">预览：仪表盘布局</div>
  <div class="mockup-body"><!-- 你的原型 HTML --></div>
</div>
```

### 分屏视图（并排）

```html
<div class="split">
  <div class="mockup"><!-- 左侧 --></div>
  <div class="mockup"><!-- 右侧 --></div>
</div>
```

### 优缺点

```html
<div class="pros-cons">
  <div class="pros"><h4>优点</h4><ul><li>好处</li></ul></div>
  <div class="cons"><h4>缺点</h4><ul><li>不足</li></ul></div>
</div>
```

### 模拟元素（线框图构建块）

```html
<div class="mock-nav">Logo | 首页 | 关于 | 联系我们</div>
<div style="display: flex;">
  <div class="mock-sidebar">导航</div>
  <div class="mock-content">主内容区域</div>
</div>
<button class="mock-button">操作按钮</button>
<input class="mock-input" placeholder="输入框">
<div class="placeholder">占位区域</div>
```

### 排版和区块

- `h2` — 页面标题
- `h3` — 章节标题
- `.subtitle` — 标题下方的辅助文字
- `.section` — 带底部边距的内容块
- `.label` — 小号大写标签文字

## 浏览器事件格式

当用户在浏览器中点击选项时，交互记录会保存到 `$SCREEN_DIR/.events`（每行一个 JSON 对象）。推送新屏幕时文件会自动清空。

```jsonl
{"type":"click","choice":"a","text":"选项 A - 简单布局","timestamp":1706000101}
{"type":"click","choice":"c","text":"选项 C - 复杂网格","timestamp":1706000108}
{"type":"click","choice":"b","text":"选项 B - 混合方案","timestamp":1706000115}
```

完整的事件流展示了用户的探索路径——他们可能在确定之前点击了多个选项。最后一个 `choice` 事件通常是最终选择，但点击模式可以揭示犹豫或值得询问的偏好。

如果 `.events` 不存在，说明用户没有与浏览器交互——仅使用他们的终端文字。

## 设计技巧

- **保真度匹配问题** — 布局问题用线框图，细节打磨问题用精细设计
- **在每个页面上解释问题** — "哪种布局看起来更专业？"而不仅仅是"选一个"
- **推进前先迭代** — 如果反馈修改了当前屏幕，写入新版本
- 每个屏幕最多 **2-4 个选项**
- **必要时使用真实内容** — 对于摄影作品集，使用实际图片（Unsplash）。占位内容会掩盖设计问题。
- **保持原型简洁** — 专注于布局和结构，而非像素级精确的设计

## 文件命名

- 使用语义化名称：`platform.html`、`visual-style.html`、`layout.html`
- 绝不复用文件名——每个屏幕必须是新文件
- 迭代版本：添加版本后缀如 `layout-v2.html`、`layout-v3.html`
- 服务器按修改时间提供最新文件

## 清理

```bash
scripts/stop-server.sh $SCREEN_DIR
```

如果会话使用了 `--project-dir`，原型文件会持久化在 `.superpowers/brainstorm/` 中以供日后参考。只有 `/tmp` 会话会在停止时被删除。

## 参考

- 框架模板（CSS 参考）：`scripts/frame-template.html`
- 辅助脚本（客户端）：`scripts/helper.js`
