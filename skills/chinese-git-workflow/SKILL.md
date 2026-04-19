---
name: chinese-git-workflow
description: 适配国内 Git 平台和团队习惯的工作流规范——Gitee、Coding、极狐 GitLab、CNB 全覆盖
---

# 国内 Git 工作流规范

## 概述

国内团队用 Git 经常踩的坑：GitHub 访问不稳定、CI/CD 方案照搬国外水土不服、commit message 中英混杂没有规范。本技能提供一套**完整适配国内平台和团队习惯的 Git 工作流**。

**核心原则：** 工作流服务于团队效率，不是为了流程而流程。选适合团队规模的，别硬套大厂方案。

## 国内 Git 平台适配

### 平台对比

| 特性 | Gitee | Coding.net | 极狐 GitLab | CNB | GitHub |
|------|-------|------------|-------------|-----|--------|
| 国内访问 | 快 | 快 | 快 | 快 | 不稳定 |
| 免费私有仓库 | 有 | 有 | 有 | 有 | 有 |
| CI/CD | Gitee Go | Coding CI | 内置 GitLab CI | 内置（.cnb.yml） | GitHub Actions |
| 代码审查 | PR | MR | MR | MR | PR |
| 制品库 | 有限 | 完整 | 完整 | 完整 | Packages |
| 适合场景 | 开源/小团队 | 中大型团队 | 企业私有化 | 云原生 / Docker 流水线 | 国际项目 |

### Gitee 特有配置

```bash
# 设置 Gitee 远程仓库
git remote add origin https://gitee.com/<org>/<repo>.git

# Gitee 的 SSH 配置
# ~/.ssh/config
Host gitee.com
    HostName gitee.com
    User git
    IdentityFile ~/.ssh/gitee_rsa
    PreferredAuthentications publickey

# 同时推送到 Gitee 和 GitHub（镜像同步）
git remote set-url --add --push origin https://gitee.com/<org>/<repo>.git
git remote set-url --add --push origin https://github.com/<org>/<repo>.git
```

### Coding.net 特有配置

```bash
# Coding 的仓库地址格式
git remote add origin https://e.coding.net/<team>/<project>/<repo>.git

# Coding 支持的 SSH 地址
git remote add origin git@e.coding.net:<team>/<project>/<repo>.git
```

### 极狐 GitLab 特有配置

```bash
# 极狐 GitLab 私有化部署常见地址格式
git remote add origin https://jihulab.com/<group>/<repo>.git

# 或者企业内部部署
git remote add origin https://gitlab.yourcompany.com/<group>/<repo>.git
```

### CNB（Cloud Native Build）特有配置

```bash
# CNB 仓库地址（仅支持 HTTPS，不提供 SSH 协议）
git remote add origin https://cnb.cool/<org>/<repo>.git

# HTTPS 认证：用户名固定为 cnb，密码为个人访问令牌（Access Token）
# 在 CNB 平台 → 个人设置 → 访问令牌 中生成
git config credential.helper store
```

## 工作流选择

### 方案一：主干开发（Trunk-Based Development）

**适合：** 小团队（2-8 人）、迭代速度快、有完善的自动化测试。

```
main ──●──●──●──●──●──●──●──●──●──
        \   /  \   /       \   /
feat/x  ●─●   ●─●    fix/y ●─●
（短命分支，1-2 天内合回）
```

**规则：**
- 主干（main）始终保持可发布状态
- 功能分支生命周期不超过 2 天
- 每天至少合并一次到主干
- 用 Feature Flag 控制未完成功能的可见性

```bash
# 从 main 拉分支
git checkout -b feat/user-login main

# 开发完成后，rebase 到最新 main
git fetch origin
git rebase origin/main

# 提交 PR/MR，合并后删除分支
```

### 方案二：Git Flow（经典分支模型）

**适合：** 中大团队、版本发布节奏固定（如双周迭代）、需要维护多个版本。

```
main     ──●────────────────●────────────── 生产环境
            \              / \
release     ●──●──●──●──●    ●──●──●──●── 发布分支
            \              /
develop  ──●──●──●──●──●──●──●──●──●──●── 开发主线
             \   /  \       /
feat/x       ●─●    ●─────●               功能分支
                      \   /
                  fix/y ●─●                修复分支
```

**分支说明：**
- `main` — 生产环境代码，只接受 release 和 hotfix 的合并
- `develop` — 开发主线，功能分支从这里拉出，合回这里
- `release/*` — 发布分支，从 develop 拉出，只修 bug 不加功能
- `feat/*` — 功能分支
- `hotfix/*` — 紧急修复，从 main 拉出，同时合回 main 和 develop

### 方案三：国内团队常用简化流程

**适合：** 大多数国内中小团队的实际情况。

```
main     ──●──────●──────●──── 生产环境（受保护）
            \    / \    /
dev      ──●──●─●──●──●─●──── 开发/测试环境
             \  /    \  /
feat/x       ●●      ●●       功能分支
```

**规则：**
- `main` 分支受保护，只能通过 PR/MR 合并
- `dev` 分支对应测试环境，自动部署
- 功能分支从 `dev` 拉出，合回 `dev`
- `dev` 测试通过后，合并到 `main` 进行发布

## 分支命名规范

### 国内团队常用命名

```bash
# 功能分支
feat/user-login              # 新功能
feat/JIRA-1234-order-refund  # 关联任务编号

# 修复分支
fix/payment-callback         # Bug 修复
fix/JIRA-5678-null-pointer   # 关联 Bug 编号

# 发布分支
release/v2.1.0               # 版本发布
release/2024-03-sprint       # 按迭代命名

# 紧急修复
hotfix/v2.0.1                # 线上紧急修复
hotfix/fix-login-crash       # 描述性命名

# 个人分支（部分团队使用）
dev/zhangsan/feat-login      # 个人开发分支
```

### 命名规则

1. 全部小写，用 `-` 连接单词（不用下划线或驼峰）
2. 前缀明确分支类型：`feat/`、`fix/`、`hotfix/`、`release/`
3. 关联任务管理平台的编号（如有）：`feat/TAPD-12345-description`
4. 长度适中，能看出分支目的即可

## 中文 Commit Message 规范

### 约定式提交（Conventional Commits）中文版

```
<类型>(<范围>): <简要描述>
                                    ← 空行
<正文（可选）>
                                    ← 空行
<脚注（可选）>
```

### 类型清单

| 类型 | 说明 | emoji（可选） |
|------|------|--------------|
| feat | 新增功能 | ✨ |
| fix | 修复 Bug | 🐛 |
| docs | 文档更新 | 📝 |
| style | 代码格式（不影响逻辑） | 💄 |
| refactor | 重构（不是新功能也不是修 Bug） | ♻️ |
| perf | 性能优化 | ⚡ |
| test | 测试相关 | ✅ |
| build | 构建系统或外部依赖 | 📦 |
| ci | CI/CD 配置 | 👷 |
| chore | 其他杂项 | 🔧 |
| revert | 回滚 | ⏪ |

### 好的 commit message

```
feat(购物车): 支持批量删除商品

- 新增全选/反选功能
- 删除操作增加二次确认弹窗
- 批量删除接口使用 POST /cart/batch-delete

关联需求：TAPD-12345
```

```
fix(支付): 修复微信支付在 iOS 16 上无法唤起的问题

原因：微信 SDK 8.0.33 版本在 iOS 16 上 Universal Links 校验逻辑变更，
导致 openURL 回调失败。

方案：升级 SDK 至 8.0.38，并更新 Associated Domains 配置。

Closes #567
```

### 不好的 commit message

```
# 太笼统
update code
fix bug
修改了一些东西

# 没有上下文
fix: 修复问题
feat: 新增功能

# 中英混杂无规范
fix：修复了一个bug，因为user login的时候会crash
```

## CI/CD 平台适配

### Gitee Go

```yaml
# .gitee/pipelines/pipeline.yml
name: 构建与测试
displayName: '构建与测试流水线'

triggers:
  push:
    branches:
      include:
        - main
        - dev

stages:
  - name: 测试
    jobs:
      - name: 单元测试
        steps:
          - step: npmbuild@1
            name: install_and_test
            displayName: '安装依赖并执行测试'
            inputs:
              nodeVersion: 20
              commands:
                - npm ci
                - npm test
```

### Coding CI

```groovy
// Jenkinsfile（Coding CI 支持 Jenkinsfile 语法）
pipeline {
    agent any

    stages {
        stage('安装依赖') {
            steps {
                sh 'npm ci'
            }
        }

        stage('单元测试') {
            steps {
                sh 'npm test'
            }
        }

        stage('构建') {
            steps {
                sh 'npm run build'
            }
        }

        stage('部署到测试环境') {
            when {
                branch 'dev'
            }
            steps {
                sh './scripts/deploy-staging.sh'
            }
        }

        stage('部署到生产环境') {
            when {
                branch 'main'
            }
            steps {
                sh './scripts/deploy-production.sh'
            }
        }
    }

    post {
        failure {
            // 企业微信/钉钉通知
            sh './scripts/notify-failure.sh'
        }
    }
}
```

### 极狐 GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - test
  - build
  - deploy

variables:
  NODE_IMAGE: node:20-alpine
  # 使用国内镜像加速
  NPM_REGISTRY: https://registry.npmmirror.com

单元测试:
  stage: test
  image: $NODE_IMAGE
  script:
    - npm config set registry $NPM_REGISTRY
    - npm ci
    - npm test
  coverage: '/Lines\s*:\s*(\d+\.?\d*)%/'

构建:
  stage: build
  image: $NODE_IMAGE
  script:
    - npm config set registry $NPM_REGISTRY
    - npm ci
    - npm run build
  artifacts:
    paths:
      - dist/

部署测试环境:
  stage: deploy
  script:
    - ./scripts/deploy-staging.sh
  only:
    - dev
  environment:
    name: staging

部署生产环境:
  stage: deploy
  script:
    - ./scripts/deploy-production.sh
  only:
    - main
  environment:
    name: production
  when: manual  # 生产环境手动触发
```

### CNB（Cloud Native Build）

```yaml
# .cnb.yml — branch-first 结构，直接指定 Docker 镜像跑流水线
main:
  push:
    - docker:
        image: node:20
      stages:
        - npm ci
        - npm test
        - npm run build
  pull_request:
    - docker:
        image: node:20
      stages:
        - npm run lint
        - npm test
```

**特点：**
- 每个流水线独立指定 Docker 镜像，天然云原生
- 支持 `push` / `pull_request` 触发
- 同一事件可并行多条流水线
- `stages` 也支持 `- name: xxx` + `script:` 的展开形式，复杂场景见官方文档

### GitHub Actions 国内替代方案对照

| GitHub Actions 功能 | Gitee Go | Coding CI | 极狐 GitLab CI | CNB |
|---------------------|----------|-----------|----------------|-----|
| 触发条件 | triggers | Jenkinsfile triggers | only/rules | push / pull_request |
| 缓存依赖 | cache step | stash/unstash | cache | 见官方文档 |
| 制品存储 | artifacts | 制品库 | artifacts | 见官方文档 |
| 环境变量 | env | environment | variables | env |
| 密钥管理 | 环境变量配置 | 凭据管理 | CI/CD Variables | Access Token |
| 手动触发 | 手动运行 | 手动触发 | when: manual | 页面手动运行 |

## PR/MR 描述模板

### 中文模板

在仓库中创建 PR/MR 模板文件：

**Gitee：** `.gitee/PULL_REQUEST_TEMPLATE.md`

**Coding / GitLab：** `.gitlab/merge_request_templates/default.md`

```markdown
## 变更说明

<!-- 简要描述这次改动做了什么，解决了什么问题 -->

## 变更类型

- [ ] 新功能（feat）
- [ ] Bug 修复（fix）
- [ ] 重构（refactor）
- [ ] 性能优化（perf）
- [ ] 文档更新（docs）
- [ ] 其他：

## 关联信息

- 需求/Bug 链接：
- 设计文档：

## 改动范围

<!-- 列出主要改动的模块和文件 -->

## 测试情况

- [ ] 单元测试通过
- [ ] 手动测试通过
- [ ] 相关模块回归测试通过

## 测试方法

<!-- 描述如何验证这次改动 -->

## 影响范围

<!-- 这次改动可能影响哪些功能？是否需要通知其他团队？ -->

## 部署注意事项

- [ ] 需要执行数据库迁移
- [ ] 需要更新配置文件
- [ ] 需要更新环境变量
- [ ] 无特殊注意事项

## 截图/录屏

<!-- 如果涉及 UI 变更，贴截图或录屏 -->
```

## 常用 Git 配置

### 国内环境优化

```bash
# 设置用户信息
git config --global user.name "张三"
git config --global user.email "zhangsan@company.com"

# commit message 编辑器设置为 VS Code
git config --global core.editor "code --wait"

# 解决中文文件名显示为转义字符的问题
git config --global core.quotepath false

# 设置默认分支名
git config --global init.defaultBranch main

# 代理设置（如果需要同时使用 GitHub）
git config --global http.https://github.com.proxy socks5://127.0.0.1:7890

# NPM 使用国内镜像
npm config set registry https://registry.npmmirror.com
```

### .gitignore 国内项目常见配置

```gitignore
# IDE
.idea/
.vscode/
*.swp

# 依赖
node_modules/
vendor/

# 构建产物
dist/
build/
*.exe

# 环境配置
.env
.env.local
.env.*.local

# 系统文件
.DS_Store
Thumbs.db
desktop.ini

# 国内平台特有
.coding/
```

## 检查清单

在推送代码前，确认：

- [ ] 分支命名符合团队规范
- [ ] commit message 格式正确，类型和范围准确
- [ ] 关联了对应的需求/Bug 编号
- [ ] PR/MR 描述填写完整
- [ ] CI 流水线通过
- [ ] 已请求相关同事 Review
