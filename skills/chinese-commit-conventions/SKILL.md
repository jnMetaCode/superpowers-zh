---
name: chinese-commit-conventions
description: 中文 commit 与 changelog 配置参考——Conventional Commits 中文适配、commitlint/husky/commitizen 中文模板、conventional-changelog 中文配置。仅在用户显式 /chinese-commit-conventions 时调用，不要根据上下文自动触发。
version: "1.0.0"
license: MIT
metadata:
  hermes:
    tags: [git, chinese]
---

# 中文 Git 提交规范

## 1. Conventional Commits 中文适配

基于 Conventional Commits 1.0.0 规范，针对中文团队的实际使用习惯进行适配。

### 类型（type）定义

| 类型       | 说明                         | 示例场景                   |
| ---------- | ---------------------------- | -------------------------- |
| `feat`     | 新功能                       | 添加用户注册模块           |
| `fix`      | 修复缺陷                     | 修复登录页白屏问题         |
| `docs`     | 文档变更                     | 更新 API 接口文档          |
| `style`    | 代码格式（不影响逻辑）       | 调整缩进、补充分号         |
| `refactor` | 重构（非新功能、非修复）     | 拆分过长的服务类           |
| `perf`     | 性能优化                     | 优化首页列表查询速度       |
| `test`     | 测试相关                     | 补充用户模块单元测试       |
| `chore`    | 构建/工具/依赖变更           | 升级 webpack 到 v5         |
| `ci`       | 持续集成配置                 | 修改 GitHub Actions 流程   |
| `revert`   | 回滚提交                     | 回滚 v2.1.0 的登录重构     |

### 原则

- type 保留英文关键字（工具链兼容性好）
- scope 和 description 使用中文
- body 使用中文完整描述

## 2. 中文 commit message 模板

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 完整示例

```
feat(用户模块): 添加手机号一键登录功能

- 接入运营商一键登录 SDK
- 支持移动、联通、电信三网
- 登录失败自动降级到短信验证码

Closes #128
```

```
fix(订单): 修复并发下单导致库存超卖的问题

在高并发场景下，原有的库存扣减逻辑存在竞态条件。
改用 Redis 分布式锁 + 数据库乐观锁双重保障。

影响范围：订单服务、库存服务
测试确认：已通过 500 并发压测验证

Closes #256
```

## 3. Subject 行规范

### 格式

```
<type>(<scope>): <description>
```

### 规则

- **type**: 必填，从上方类型表中选取
- **scope**: 选填，表示影响范围，使用中文模块名
  - 示例：`用户模块`、`订单`、`支付`、`基础组件`
- **description**: 必填，中文简述，不超过 50 个字符
  - 使用动宾短语：「添加 xxx」「修复 xxx」「优化 xxx」
  - 不加句号结尾
  - 不要写「修改了代码」这种无意义描述

### 好的示例

```
feat(权限): 添加基于 RBAC 的细粒度权限控制
fix(支付): 修复微信支付回调签名验证失败的问题
perf(列表页): 优化大数据量表格的虚拟滚动渲染
refactor(网关): 将单体网关拆分为独立微服务
```

### 反面示例

```
# 以下写法应避免
fix: 修了一个 bug
feat: 更新代码
chore: 改了点东西
```

## 4. Body 编写规范

Body 用于详细说明本次变更的动机、方案和影响。

### 编写要点

- 说明**为什么**要做这个改动（背景/原因）
- 说明**怎么做**的（技术方案摘要）
- 说明**影响范围**（哪些模块、接口受影响）
- 每行不超过 72 个字符（中文约 36 个汉字）
- 正文与标题之间空一行

### Body 模板

```
<改动背景和原因>

技术方案：
- <方案要点 1>
- <方案要点 2>

影响范围：<受影响的模块或服务>
```

## 5. Breaking Changes 标注

当提交包含不兼容变更时，必须在 footer 中标注。

### 格式一：footer 标注

```
feat(接口): 重构用户信息返回结构

将用户接口返回的扁平结构改为嵌套结构，前端需同步调整字段取值路径。

BREAKING CHANGE: /api/user/info 返回结构变更
- avatar 字段移入 profile 对象
- 移除已废弃的 nickname 字段，统一使用 displayName
```

### 格式二：type 后加感叹号

```
feat(接口)!: 重构用户信息返回结构
```

### 团队约定

- 涉及数据库表结构变更 -> 必须标注 BREAKING CHANGE
- 涉及公共 API 参数/返回值变更 -> 必须标注
- 涉及配置文件格式变更 -> 必须标注
- 标注时须写明迁移方法或升级步骤

## 6. Issue 关联

### GitHub 格式

```
Closes #128
Refs #129, #130
```

### Gitee 格式

```
Closes #I5ABC1
相关需求: https://gitee.com/org/repo/issues/I5ABC1
```

### Coding 格式

```
关联 Coding 缺陷 #12345
fixed=project-2024/issues/678
```

### 通用写法

```
# footer 中关联多个平台
Closes #128
Jira: PROJ-456
禅道: #789
```

## 7. Changelog 自动生成配置

### 安装 conventional-changelog

```bash
npm install -D conventional-changelog-cli conventional-changelog-conventionalcommits
```

### package.json 脚本

```json
{
  "scripts": {
    "changelog": "conventional-changelog -p conventionalcommits -i CHANGELOG.md -s",
    "changelog:all": "conventional-changelog -p conventionalcommits -i CHANGELOG.md -s -r 0",
    "release": "standard-version"
  }
}
```

### .versionrc.js 中文配置

```javascript
module.exports = {
  types: [
    { type: 'feat', section: '新功能' },
    { type: 'fix', section: '缺陷修复' },
    { type: 'perf', section: '性能优化' },
    { type: 'refactor', section: '代码重构' },
    { type: 'docs', section: '文档更新' },
    { type: 'test', section: '测试' },
    { type: 'chore', section: '构建/工具', hidden: true },
    { type: 'ci', section: '持续集成', hidden: true },
    { type: 'style', section: '代码格式', hidden: true }
  ],
  commitUrlFormat: '{{host}}/{{owner}}/{{repository}}/commit/{{hash}}',
  compareUrlFormat: '{{host}}/{{owner}}/{{repository}}/compare/{{previousTag}}...{{currentTag}}'
}
```

## 8. commitlint 中文配置

### 安装

```bash
npm install -D @commitlint/cli @commitlint/config-conventional
```

### commitlint.config.js

```javascript
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', [
      'feat', 'fix', 'docs', 'style', 'refactor',
      'perf', 'test', 'chore', 'ci', 'revert'
    ]],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],
    'subject-empty': [2, 'never'],
    'subject-max-length': [2, 'always', 100],
    // 允许中文字符，关闭 subject-case 限制
    'subject-case': [0],
    // 关闭 header-max-length 或放宽（中文占宽较大）
    'header-max-length': [2, 'always', 120],
    'body-max-line-length': [1, 'always', 200],
    'footer-max-line-length': [1, 'always', 200]
  },
  prompt: {
    messages: {
      type: '选择提交类型:',
      scope: '输入影响范围（可选）:',
      subject: '填写简短描述:',
      body: '填写详细描述（可选，使用 "|" 换行）:',
      breaking: '列出不兼容变更（可选）:',
      footer: '关联的 Issue（可选，例如 #123）:',
      confirmCommit: '确认提交以上信息？'
    }
  }
}
```

## 9. husky + lint-staged 集成

### 安装与初始化

```bash
npm install -D husky lint-staged
npx husky init
```

### 配置 commit-msg 钩子

```bash
# .husky/commit-msg
npx --no -- commitlint --edit "$1"
```

### 配置 pre-commit 钩子

```bash
# .husky/pre-commit
npx lint-staged
```

### lint-staged 配置（package.json）

```json
{
  "lint-staged": {
    "*.{js,ts,jsx,tsx,vue}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{css,scss,less}": [
      "stylelint --fix",
      "prettier --write"
    ],
    "*.md": [
      "prettier --write"
    ]
  }
}
```

### 交互式提交（可选）

```bash
npm install -D commitizen cz-conventional-changelog

# package.json 中添加
{
  "config": {
    "commitizen": {
      "path": "cz-conventional-changelog"
    }
  },
  "scripts": {
    "commit": "cz"
  }
}
```

运行 `npm run commit` 即可进入交互式提交引导。

## 10. 团队规范检查清单

### 提交前自查

- [ ] type 是否正确选择（feat/fix/docs/...）
- [ ] scope 是否准确描述了影响模块
- [ ] subject 是否为动宾短语且不超过 50 字符
- [ ] subject 末尾是否去掉了句号
- [ ] body 是否说明了变更原因和方案
- [ ] 不兼容变更是否标注了 BREAKING CHANGE
- [ ] 相关 Issue 是否已关联
- [ ] 一次提交是否只做了一件事（原子性）

### 团队落地步骤

1. **工具链配置**：按上述步骤配置 commitlint + husky，让规范可执行
2. **模板共享**：将 `.commitlintrc`、`.husky/` 等配置提交到仓库
3. **团队培训**：组织 15 分钟的规范说明会，演示工具使用
4. **Code Review**：Review 时关注 commit message 质量
5. **持续迭代**：每季度回顾规范执行情况，根据团队反馈调整

### 常见问题

**Q: 中英文混排时空格怎么处理？**
A: 中文与英文/数字之间加一个空格，如「添加 Redis 缓存」。

**Q: scope 用中文还是英文？**
A: 团队内统一即可。推荐中文（可读性好），但需在 commitlint 中关闭 scope-case 检查。

**Q: 多人协作时如何保证规范一致？**
A: 靠工具而非靠自觉。配置好 husky + commitlint，不符合规范的提交会被拦截。
