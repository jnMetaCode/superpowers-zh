# superpowers-zh 官网

零依赖静态站生成器。一条命令产出**中/英双语**站点 + 每个 skill 的**详情（操作文档）页**，内容全部来自 `../skills/*/SKILL.md`，与源文件同步、不会漂移。

## 构建 / 预览

```bash
node site/build.mjs          # 生成 site/dist/（42 个页面）
npx serve site/dist          # 本地预览（或 python3 -m http.server）
```

产物结构：

```
dist/
  index.html              # 中文首页
  en/index.html           # 英文首页
  skills/<name>.html      # 中文 skill 详情（操作文档）× 20
  en/skills/<name>.html   # 英文 skill 详情 × 20
  styles.css  app.js      # 深/浅主题 + 交互（原生 JS，零依赖）
  assets/                 # 图标 + 公众号/抖音二维码
  _headers                # Cloudflare Pages 缓存策略
```

## 特性

- **中英双语**：服务端生成两套真实页面（非前端切换），SEO 友好、无闪烁。导航栏「中文 / EN」互切。
- **深 / 浅主题**：CSS 变量 + localStorage 记忆，内联脚本在首屏前生效，无白屏闪烁。导航栏 ◐ 按钮切换。
- **Skill 详情页**：内置零依赖 Markdown 渲染器（`md.mjs`），把每个 `SKILL.md` 渲染成完整操作文档，支持标题/代码块/表格/列表/引用。
- **安装命令生成器、Skill 搜索 / 分类筛选、一键复制** —— 全部原生 JS。

## 改内容改哪里

| 想改什么 | 改哪里 |
|---|---|
| Skill 正文 / 文档内容 | **源头** `skills/<name>/SKILL.md`（改完重新 `node site/build.mjs`） |
| Skill 中/英标题、英文简介、分组 | `site/build.mjs` 的 `SKILL_META` |
| 首页所有文案（中/英） | `site/build.mjs` 的 `T.zh` / `T.en` |
| 支持工具 / 安装命令 | `site/build.mjs` 的 `TOOLS`（与 `bin/superpowers-zh.js` 的 `TARGETS` 对齐） |
| 样式 / 主题 | `site/template/styles.css` |
| 交互逻辑 | `site/template/app.js` |
| Markdown 渲染规则 | `site/md.mjs` |

## 部署到 Cloudflare Pages

发布目录 `site/dist`，三选一：

### 方式 A — 连接仓库自动构建（推荐，无需密钥）

Cloudflare Dashboard → Pages → 连接 GitHub 仓库 `jnMetaCode/superpowers-zh`：

- **Build command**：`node site/build.mjs`
- **Build output directory**：`site/dist`

之后每次 push 自动重建发布。绑自定义域名（当前线上：`sp.aiolaola.com`）。

### 方式 B — 命令行一键发布

```bash
npx wrangler login                  # 浏览器登录（交互，仅首次）
npm run site:deploy                 # = 构建 + wrangler pages deploy site/dist
```

> 在本会话中可用 `!` 前缀直接登录：`!npx wrangler login`

### 方式 C — GitHub Actions 自动部署

仓库已含 `.github/workflows/deploy-site.yml`。在 **Settings → Secrets and variables → Actions** 配置：

- `CLOUDFLARE_API_TOKEN`（Pages 编辑权限）
- `CLOUDFLARE_ACCOUNT_ID`

之后 `site/` 或 `skills/` 变更 push 到 `main` 即自动部署。

---

> 国内访问优先用 Cloudflare Pages + 自定义域名；GitHub Pages 在国内访问较慢，不建议作为主站。
